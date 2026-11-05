import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPECTED_COUNT = Number(process.env.EXPECTED_PREVIEW_COUNT || 97);
const APPLY = process.argv.includes("--apply");
const ORIGINALS_BUCKET = "product-originals";
const PREVIEWS_BUCKET = "product-previews";
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;

if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}
if (!Number.isInteger(EXPECTED_COUNT) || EXPECTED_COUNT < 1) {
  throw new Error("EXPECTED_PREVIEW_COUNT must be a positive integer.");
}

const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function escapeXml(value = "FUNKFUL • PREVIEW") {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function watermarkSvg(width, height, text = "FUNKFUL • PREVIEW") {
  const safe = escapeXml(text);

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="watermark"
          width="460"
          height="280"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-28)">
          <text
            x="0"
            y="105"
            fill="#ffffff"
            fill-opacity="0.16"
            stroke="#111111"
            stroke-opacity="0.10"
            stroke-width="1"
            stroke-linejoin="round"
            paint-order="stroke"
            font-family="Arial, Helvetica, sans-serif"
            font-size="22"
            font-weight="600"
            letter-spacing="3"
          >${safe}</text>
        </pattern>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill="url(#watermark)"
      />
    </svg>
  `);
}

async function createWatermarkedPreview(input) {
  const resized = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const metadata = await sharp(resized).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Could not read processed image dimensions.");
  return sharp(resized)
    .composite([{ input: watermarkSvg(metadata.width, metadata.height), blend: "over" }])
    .webp({ quality: 82 })
    .toBuffer();
}

const { data: rows, error } = await supabase
  .from("product_images")
  .select("id,product_id,original_path,preview_path,protection_status")
  .not("original_path", "is", null)
  .not("preview_path", "is", null)
  .order("product_id", { ascending: true })
  .order("id", { ascending: true });

if (error) throw new Error(`Could not load product image records: ${error.message}`);
if (!rows || rows.length !== EXPECTED_COUNT) {
  throw new Error(`Safety stop: expected ${EXPECTED_COUNT} image records, found ${rows?.length ?? 0}. Nothing was changed. Set EXPECTED_PREVIEW_COUNT only after checking the count.`);
}
const invalid = rows.filter((row) => row.protection_status !== "protected" || !row.original_path || !row.preview_path);
if (invalid.length) throw new Error(`Safety stop: ${invalid.length} records are not protected or lack a source/destination path. Nothing was changed.`);
const duplicatePaths = rows.length - new Set(rows.map((row) => row.preview_path)).size;
if (duplicatePaths) throw new Error(`Safety stop: found ${duplicatePaths} duplicate preview paths. Nothing was changed.`);

console.log(`Found ${rows.length} protected product images.`);
console.log(`Mode: ${APPLY ? "APPLY — overwrite preview objects only" : "DRY RUN — no files will be changed"}`);
console.log(`Original bucket: ${ORIGINALS_BUCKET} (read-only)`);
console.log(`Preview bucket: ${PREVIEWS_BUCKET} (destination)`);
console.log("Database rows, original objects, image URLs and paths will not be modified.");
if (!APPLY) {
  console.log("Dry run complete. Review the count, then rerun with --apply to regenerate.");
  process.exit(0);
}

let completed = 0;
const failures = [];
const concurrency = 3;
let nextIndex = 0;
async function worker() {
  while (true) {
    const index = nextIndex++;
    if (index >= rows.length) return;
    const row = rows[index];
    try {
      const { data: originalBlob, error: downloadError } = await supabase.storage
        .from(ORIGINALS_BUCKET)
        .download(row.original_path);
      if (downloadError || !originalBlob) throw new Error(`Original download failed: ${downloadError?.message ?? "empty response"}`);

      const source = Buffer.from(await originalBlob.arrayBuffer());
      if (!source.length) throw new Error("Original image is empty.");
      const preview = await createWatermarkedPreview(source);
      const { error: uploadError } = await supabase.storage
        .from(PREVIEWS_BUCKET)
        .upload(row.preview_path, preview, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError) throw new Error(`Preview upload failed: ${uploadError.message}`);
      completed++;
      console.log(`[${completed}/${rows.length}] Updated preview for image ${row.id}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      failures.push({ id: row.id, original_path: row.original_path, preview_path: row.preview_path, message });
      console.error(`FAILED image ${row.id}: ${message}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(`\nFinished: ${completed}/${rows.length} previews updated; ${failures.length} failures.`);
if (failures.length) {
  console.error("Failed records:", JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("All preview objects were regenerated. Original objects and database records were left unchanged.");
}
