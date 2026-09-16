import { Resend } from "resend";
import { palette } from "@/lib/brands";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY is not set in environment variables.");
}

const resend = new Resend(apiKey);

const FROM_ADDRESS =
  process.env.AUTH_EMAIL_FROM ||
  process.env.NEWSLETTER_FROM_EMAIL ||
  "Funkful <hello@funkful.co.za>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://funkful.co.za";

interface SendWelcomeConfirmedEmailArgs {
  to: string;
  firstName?: string;
}

// Sent once, right after a customer's signup confirmation link is
// successfully redeemed in /auth/callback. This is a separate email from
// the "confirm your email" one — that one is sent by the Supabase Auth
// "Send Email" hook (see supabase/functions/send-email) before the account
// is verified; this one lands after, welcoming them in.
export async function sendWelcomeConfirmedEmail({
  to,
  firstName,
}: SendWelcomeConfirmedEmailArgs) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";
  const shopUrl = `${SITE_URL.replace(/\/$/, "")}/shop`;

  const html = `
  <div style="margin:0;padding:0;background:#f4f1ea;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:${palette.black};border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:40px 40px 24px;text-align:center;">
                <p style="margin:0 0 8px;color:${palette.gold};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">You're in</p>
                <h1 style="margin:0;color:${palette.cream};font-size:26px;font-weight:900;text-transform:uppercase;">Email confirmed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px;text-align:center;">
                <p style="margin:0;color:${palette.cream};font-size:14px;line-height:1.6;">
                  ${greeting} your Funkful account is verified and ready. Personalized gifts, Scoopful capsules — all yours to explore.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 44px;text-align:center;">
                <a href="${shopUrl}" style="background:${palette.gold};color:#3e2f0d;text-decoration:none;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;padding:16px 32px;border-radius:999px;display:inline-block;">
                  Start shopping
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:rgba(255,255,255,0.04);text-align:center;">
                <p style="margin:0;color:#7d7b76;font-size:11px;">
                  You're receiving this because you confirmed a Funkful account. Didn't do this? Contact us and we'll help sort it out.
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
    subject: "You're confirmed — welcome to Funkful",
    html,
  });
}
