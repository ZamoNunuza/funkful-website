import sharp from "sharp";

const MAX_PREVIEW_WIDTH = 1600;
const MAX_PREVIEW_HEIGHT = 1600;

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function watermarkSvg(width: number, height: number, text: string) {
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

export async function createWatermarkedPreview(input: Buffer, watermarkText = "FUNKFUL • PREVIEW") {
  const image = sharp(input, { failOn: "none" });
  const metadata = await image.metadata();
  const width = Math.min(metadata.width ?? MAX_PREVIEW_WIDTH, MAX_PREVIEW_WIDTH);
  const height = Math.min(metadata.height ?? MAX_PREVIEW_HEIGHT, MAX_PREVIEW_HEIGHT);

  const resized = await image
    .rotate()
    .resize({ width: MAX_PREVIEW_WIDTH, height: MAX_PREVIEW_HEIGHT, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resized).metadata();
  const finalWidth = resizedMeta.width ?? width;
  const finalHeight = resizedMeta.height ?? height;

  return sharp(resized)
    .composite([{ input: watermarkSvg(finalWidth, finalHeight, watermarkText), blend: "over" }])
    .webp({ quality: 82 })
    .toBuffer();
}
