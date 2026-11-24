
import sharp from "sharp";

const MAX_PREVIEW_WIDTH = 1600;
const MAX_PREVIEW_HEIGHT = 1600;
const THUMBNAIL_SIZE = 360;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function watermarkSvg(
  width: number,
  height: number,
  text: string,
  thumbnail = false,
) {
  const safe = escapeXml(text);

  const patternWidth = thumbnail ? 230 : 460;
  const patternHeight = thumbnail ? 140 : 280;
  const fontSize = thumbnail ? 14 : 22;
  const textY = thumbnail ? 52 : 105;

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
          >${safe}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark)" />
    </svg>
  `);
}

export async function createWatermarkedPreview(
  input: Buffer,
  watermarkText = "FUNKFUL • PREVIEW",
) {
  const image = sharp(input, { failOn: "none" });
  const metadata = await image.metadata();

  const width = Math.min(
    metadata.width ?? MAX_PREVIEW_WIDTH,
    MAX_PREVIEW_WIDTH,
  );

  const height = Math.min(
    metadata.height ?? MAX_PREVIEW_HEIGHT,
    MAX_PREVIEW_HEIGHT,
  );

  const resized = await image
    .rotate()
    .resize({
      width: MAX_PREVIEW_WIDTH,
      height: MAX_PREVIEW_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resized).metadata();
  const finalWidth = resizedMeta.width ?? width;
  const finalHeight = resizedMeta.height ?? height;

  return sharp(resized)
    .composite([
      {
        input: watermarkSvg(finalWidth, finalHeight, watermarkText),
        blend: "over",
      },
    ])
    .webp({ quality: 82 })
    .toBuffer();
}

export async function createWatermarkedThumbnail(
  input: Buffer,
  watermarkText = "FUNKFUL • PREVIEW",
) {
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
        input: watermarkSvg(width, height, watermarkText, true),
        blend: "over",
      },
    ])
    .webp({ quality: 78 })
    .toBuffer();
}
