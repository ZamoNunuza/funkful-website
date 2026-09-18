import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config({ path: '.env.local' });

const key = process.env.RESEND_API_KEY;
if (!key) throw new Error('RESEND_API_KEY is required');
const resend = new Resend(key);

const base = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#171717"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:24px;overflow:hidden"><tr><td style="background:#171717;padding:28px 32px;text-align:center"><img src="{{{SITE_LOGO_URL}}}" width="110" alt="Funkful" style="display:inline-block;max-width:110px;height:auto"></td></tr><tr><td style="padding:32px">{{{BODY_HTML}}}</td></tr><tr><td style="padding:20px 32px;background:#faf8f4;text-align:center;color:#777;font-size:11px;line-height:1.6">Funkful · Personalized gifts, mystery scoops, and everything in between.<br><a href="{{{SITE_URL}}}" style="color:#171717">funkful.co.za</a></td></tr></table></td></tr></table></body></html>`;

const templates = [
  ['funkful-order-confirmation', 'Order confirmation', 'Order {{ORDER_NUMBER}} confirmed 🎉'],
  ['funkful-order-notification', 'New paid order', 'New paid order · {{ORDER_NUMBER}}'],
  ['funkful-payment-failed', 'Payment failed', 'Payment not completed · {{ORDER_NUMBER}}'],
];

for (const [name, subjectName, subject] of templates) {
  const { data, error } = await resend.templates.create({
    name,
    subject,
    html: base,
    variables: [
      { key: 'ORDER_NUMBER', type: 'string', fallbackValue: 'FUNK-0000-TEST' },
      { key: 'SITE_URL', type: 'string', fallbackValue: 'https://funkful.co.za' },
      { key: 'SITE_LOGO_URL', type: 'string', fallbackValue: 'https://funkful.co.za/assets/funkful-logo.png' },
      { key: 'BODY_HTML', type: 'string', fallbackValue: `<h1>${subjectName}</h1><p>Funkful transactional email.</p>` },
    ],
  });
  if (error) throw error;
  const templateId = data?.id;
  if (!templateId) throw new Error(`No template id returned for ${name}`);
  await resend.templates.publish(templateId);
  console.log(`${name}=${templateId}`);
}
