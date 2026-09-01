import { Resend } from "resend";
import { palette } from "@/lib/brands";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY is not set in environment variables.");
}

const resend = new Resend(apiKey);

const FROM_ADDRESS = process.env.NEWSLETTER_FROM_EMAIL || "Funkful <hello@funkful.co.za>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://funkful.co.za";

const BRAND_COPY: Record<string, { name: string; blurb: string; shopPath: string }> = {
  funkful: {
    name: "Funkful",
    blurb: "personalized gifts, custom mugs, tumblers, and apparel made yours",
    shopPath: "/shop",
  },
  scoopful: {
    name: "Scoopful by Funkful",
    blurb: "mystery scoop capsules with a lucky prize inside every one",
    shopPath: "/scoopful",
  },
  anime_box: {
    name: "Anime Mystery Box",
    blurb: "curated anime mystery boxes, coming soon",
    shopPath: "/anime-box",
  },
};

interface SendWelcomeDiscountEmailArgs {
  to: string;
  discountCode: string;
  expiresAt: string | null;
  brandInterest: string;
}

export async function sendWelcomeDiscountEmail({
  to,
  discountCode,
  expiresAt,
  brandInterest,
}: SendWelcomeDiscountEmailArgs) {
  const brand = BRAND_COPY[brandInterest] ?? BRAND_COPY.funkful;
  const shopUrl = `${SITE_URL}${brand.shopPath}?code=${encodeURIComponent(discountCode)}`;
  const expiryLine = expiresAt
    ? `Use it before ${new Date(expiresAt).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}.`
    : "";

  const html = `
  <div style="margin:0;padding:0;background:#f4f1ea;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:${palette.black};border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:40px 40px 24px;text-align:center;">
                <p style="margin:0 0 8px;color:${palette.gold};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Welcome to the family</p>
                <h1 style="margin:0;color:${palette.cream};font-size:26px;font-weight:900;text-transform:uppercase;">10% off is yours</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px;text-align:center;">
                <p style="margin:0;color:${palette.cream};font-size:14px;line-height:1.6;">
                  Thanks for joining ${brand.name} — ${brand.blurb}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px;text-align:center;">
                <div style="border:2px dashed ${palette.gold};border-radius:12px;padding:18px 24px;display:inline-block;">
                  <span style="color:${palette.gold};font-size:24px;font-weight:800;letter-spacing:3px;">${discountCode}</span>
                </div>
                ${expiryLine ? `<p style="margin:12px 0 0;color:#9c9a95;font-size:12px;">${expiryLine}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 44px;text-align:center;">
                <a href="${shopUrl}" style="background:${palette.gold};color:#3e2f0d;text-decoration:none;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;padding:16px 32px;border-radius:999px;display:inline-block;">
                  Shop now
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:rgba(255,255,255,0.04);text-align:center;">
                <p style="margin:0;color:#7d7b76;font-size:11px;">
                  You're receiving this because you signed up at Funkful. This code is single-use and applies at checkout.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Here's your ${brand.name} discount code`,
    html,
  });
}
