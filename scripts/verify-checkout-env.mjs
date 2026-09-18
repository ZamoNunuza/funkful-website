import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const required = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'YOCO_SECRET_KEY',
  'YOCO_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'ORDER_EMAIL_FROM',
  'ORDER_NOTIFICATION_EMAIL',
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
if (site.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(site.hostname)) {
  console.error('NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.');
  process.exit(1);
}
if (!process.env.YOCO_SECRET_KEY.startsWith('sk_test_') && !process.env.YOCO_SECRET_KEY.startsWith('sk_live_')) {
  console.error('YOCO_SECRET_KEY must be a Yoco test or live secret key.');
  process.exit(1);
}
console.log('Checkout environment looks configured.');
