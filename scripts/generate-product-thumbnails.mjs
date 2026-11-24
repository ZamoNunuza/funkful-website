
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const APPLY = process.argv.includes("--apply");

const ORIGINALS_BUCKET = "product-originals";
const PREVIEWS_BUCKET = "product-previews";

const THUMBNAIL_SIZE = 360;
const CONCURRENCY = 3;

if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
}

const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function getThumbnailPath(previewPath) {
  if (!/\.webp$/i.test(previewPath)) {
    throw new Error(`Preview path is not WebP: ${previewPath}`);
  }

  return previewPath.replace(/\.webp$/i, "-thumb.webp");
}

function escapeXml(value = "FUNKFUL • PREVIEW") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function watermarkSvg(width, height) {
  const patternWidth = 230;
  const patternHeight = 140;
  const fontSize = 14;
  const textY = 52;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          id="watermark"
          width="${patternWidth}"
          height="${patternHeight}"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-28)"
        >
          <text
            x="0"
            y="${textY}"
            fill="#ffffff"
            fill-opacity="0.16"
            stroke="#111111"
            stroke-opacity="0.10"
            stroke-width="1"
            stroke-linejoin="round"
            paint-order="stroke"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${fontSize}"
            font-weight="600"
            letter-spacing="3"
          >${escapeXml()}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark)" />
    </svg>
  `);
}

async function createWatermarkedThumbnail(input) {
  const resized = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const metadata = await sharp(resized).metadata();

  const width = metadata.width ?? THUMBNAIL_SIZE;
  const height = metadata.height ?? THUMBNAIL_SIZE;

  return sharp(resized)
    .composite([
      {
        input: watermarkSvg(width, height),
        blend: "over",
      },
    ])
    .webp({ quality: 78 })
    .toBuffer();
}

// Load all protected product image records.
const { data: rows, error } = await supabase
  .from("product_images")
  .select("id,product_id,original_path,preview_path,protection_status")
  .eq("protection_status", "protected")
  .order("product_id", { ascending: true })
  .order("id", { ascending: true });

if (error) {
  throw new Error(`Could not load product images: ${error.message}`);
}

if (!rows?.length) {
  throw new Error("No protected product images were found.");
}

// Stop before making changes if any record is incomplete.
const invalid = rows.filter(
  (row) =>
    !row.original_path ||
    !row.preview_path ||
    !/\.webp$/i.test(row.preview_path),
);

if (invalid.length) {
  throw new Error(
    `Safety stop: ${invalid.length} protected records have missing or invalid paths. Nothing was changed.`,
  );
}

const thumbnailPaths = rows.map((row) =>
  getThumbnailPath(row.preview_path),
);

const duplicatePaths =
  thumbnailPaths.length - new Set(thumbnailPaths).size;

if (duplicatePaths) {
  throw new Error(
    `Safety stop: found ${duplicatePaths} duplicate thumbnail paths. Nothing was changed.`,
  );
}

console.log(`Found ${rows.length} protected product images.`);
console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log(`Original bucket: ${ORIGINALS_BUCKET} (read-only)`);
console.log(`Preview bucket: ${PREVIEWS_BUCKET} (thumbnail destination)`);
console.log("Database records will not be modified.");
console.log("Full-size preview objects will not be modified.");

if (!APPLY) {
  console.log("\nDry run complete. No files were changed.");
  console.log("Review the count before running with --apply.");
  process.exit(0);
}

let completed = 0;
let nextIndex = 0;

const failures = [];

async function worker() {
  while (true) {
    const index = nextIndex++;

    if (index >= rows.length) return;

    const row = rows[index];
    const thumbnailPath = getThumbnailPath(row.preview_path);

    try {
      const { data: originalBlob, error: downloadError } =
        await supabase.storage
          .from(ORIGINALS_BUCKET)
          .download(row.original_path);

      if (downloadError || !originalBlob) {
        throw new Error(
          `Original download failed: ${
            downloadError?.message ?? "Empty response"
          }`,
        );
      }

      const source = Buffer.from(await originalBlob.arrayBuffer());

      if (!source.length) {
        throw new Error("Original image is empty.");
      }

      const thumbnail = await createWatermarkedThumbnail(source);

      const { error: uploadError } = await supabase.storage
        .from(PREVIEWS_BUCKET)
        .upload(thumbnailPath, thumbnail, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Thumbnail upload failed: ${uploadError.message}`);
      }

      completed++;

      console.log(
        `[${completed}/${rows.length}] Generated thumbnail for image ${row.id} (${Math.round(thumbnail.length / 1024)} KB)`,
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : String(cause);

      failures.push({
        id: row.id,
        original_path: row.original_path,
        thumbnail_path: thumbnailPath,
        message,
      });

      console.error(`FAILED image ${row.id}: ${message}`);
    }
  }
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, () => worker()),
);

console.log(
  `\nFinished: ${completed}/${rows.length} thumbnails generated; ${failures.length} failures.`,
);

if (failures.length) {
  console.error("Failed records:", JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    "All thumbnails generated. Original images and database records were left unchanged.",
  );
}
