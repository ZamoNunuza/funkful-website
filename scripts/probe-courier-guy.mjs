// Read-only smoke test for the unified The Courier Guy API. Books nothing.
//   npm run probe:courier
// Uses TCG_API_KEY (or TCG_SHIPLOGIC_API_KEY) and TCG_API_BASE_URL from .env.local.
// For the sandbox set TCG_API_BASE_URL=https://api.shiplogic.com with a sandbox key.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const base = (process.env.TCG_API_BASE_URL || process.env.TCG_SHIPLOGIC_BASE_URL || 'https://api.portal.thecourierguy.co.za').replace(/\/$/, '');
const token = process.env.TCG_API_KEY || process.env.TCG_SHIPLOGIC_API_KEY;
if (!token) { console.error('Set TCG_API_KEY (or TCG_SHIPLOGIC_API_KEY) in .env.local'); process.exit(1); }

async function call(label, path, body) {
  const res = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  console.log(`\n=== ${label} → HTTP ${res.status}`);
  console.log(json ? JSON.stringify(json, null, 2).slice(0, 2500) : text.slice(0, 500));
  return json;
}

// Fill these with a real collection address and parcel to match your account.
const collection = { type: 'business', company: 'Funkful', street_address: process.env.PROBE_STREET || '1 Main Road', local_area: process.env.PROBE_AREA || 'Randburg', city: process.env.PROBE_CITY || 'Johannesburg', zone: 'Gauteng', country: 'ZA', code: process.env.PROBE_CODE || '2194' };
const parcels = [{ parcel_description: 'Probe', submitted_length_cm: 30, submitted_width_cm: 20, submitted_height_cm: 10, submitted_weight_kg: 1 }];

const points = await call('GET /pickup-points (nearest 3)', '/pickup-points?lat=-26.0048046&lng=27.9412084&order_closest=true&limit=3');
const rows = Array.isArray(points) ? points : (points?.pickup_points ?? points?.data ?? []);
const id = rows[0]?.id ?? rows[0]?.code;

await call('POST /rates (door-to-door)', '/rates', { collection_address: collection, delivery_address: { type: 'residential', street_address: '10 Midas Avenue', local_area: 'Olympus AH', city: 'Pretoria', zone: 'Gauteng', country: 'ZA', code: '0081' }, parcels, declared_value: 500, opt_in_rates: [], opt_in_time_based_rates: [] });
if (id) await call(`POST /rates (pickup point ${id})`, '/rates', { collection_address: collection, delivery_pickup_point_id: id, parcels });
else console.log('\nNo pickup point id found in the first response, so the pickup-point rate call was skipped.');
