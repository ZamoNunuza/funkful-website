// src/lib/inventory-qr.ts
//
// QR labels encode a URL (https://funkful.co.za/admin/inventory/m/FK-00012) so that scanning with the
// iPhone/iPad built-in camera opens the material, and the in-app scanner reads the same code.

import QRCode from "qrcode";
import { headers } from "next/headers";

export async function labelUrl(code: string): Promise<string> {
  let origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!origin) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    origin = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  }
  return `${origin}/admin/inventory/m/${encodeURIComponent(code)}`;
}

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
