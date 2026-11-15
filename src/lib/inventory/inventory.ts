// src/lib/inventory.ts
//
// Server-only data access for the craft-supplies inventory. Always called from
// admin pages/actions (which call requireAdmin first) using the service-role
// client; the inv_* tables have RLS enabled with no policies.

import { createAdminClient } from "@/lib/supabase/admin";
import { stockStatus, type StockStatus, type Unit } from "@/lib/inventory/inventory-shared";

export interface Material {
  id: string;
  code: string;
  external_barcode: string | null;
  category_id: string;
  material_type_id: string | null;
  brand_id: string;
  range_name: string | null;
  colour: string | null;
  finish: string | null;
  width_mm: number | null;
  roll_length: number | null;
  size_label: string | null;
  unit: Unit;
  reorder_level: number;
  preferred_supplier_id: string | null;
  last_cost_cents: number;
  quantity_on_hand: number;
  notes: string | null;
  is_active: boolean;
  image_key: string | null;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string; slug: string } | null;
  type: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

export interface Lot {
  id: string;
  material_id: string;
  lot_label: string | null;
  received_qty: number;
  remaining_qty: number;
  unit_cost_cents: number;
  received_at: string;
  supplier_id: string | null;
}

export interface Movement {
  id: string;
  material_id: string;
  lot_id: string | null;
  reason: string;
  quantity_change: number;
  balance_after: number;
  unit_cost_cents: number;
  order_id: string | null;
  order_ref: string | null;
  purchase_id: string | null;
  note: string | null;
  actor: string | null;
  created_at: string;
}

const MATERIAL_SELECT =
  "*, brand:inv_brands(id,name), category:inv_categories(id,name,slug), type:inv_material_types(id,name), supplier:inv_suppliers(id,name)";

function fail(error: { message: string } | null, what: string): never {
  console.error(`Inventory: ${what} failed:`, error);
  throw new Error(`Could not load ${what}.`);
}

const num = (v: unknown) => Number(v ?? 0);

function normaliseMaterial(row: Record<string, unknown>): Material {
  const m = row as unknown as Material;
  return {
    ...m,
    roll_length: m.roll_length == null ? null : num(m.roll_length),
    reorder_level: num(m.reorder_level),
    last_cost_cents: num(m.last_cost_cents),
    quantity_on_hand: num(m.quantity_on_hand),
  };
}

export async function listMaterials(opts: { includeInactive?: boolean } = {}): Promise<Material[]> {
  const admin = createAdminClient();
  let query = admin.from("inv_materials").select(MATERIAL_SELECT).order("created_at", { ascending: true }).limit(2000);
  if (!opts.includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) fail(error, "materials");
  return (data ?? []).map(normaliseMaterial);
}

export async function getMaterial(id: string): Promise<Material | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("inv_materials").select(MATERIAL_SELECT).eq("id", id).maybeSingle();
  if (error) fail(error, "material");
  return data ? normaliseMaterial(data) : null;
}

/** Finds a material by our own code (FK-00001) or a manufacturer barcode. */
export async function findMaterialByCode(code: string): Promise<Material | null> {
  const admin = createAdminClient();
  const clean = code.trim();
  if (!clean || clean.length > 120) return null;
  // Exact matches only (no wildcards), our own code first, then the manufacturer barcode.
  const own = await admin.from("inv_materials").select(MATERIAL_SELECT).eq("code", clean.toUpperCase()).maybeSingle();
  if (own.error) fail(own.error, "material lookup");
  if (own.data) return normaliseMaterial(own.data);
  const ext = await admin.from("inv_materials").select(MATERIAL_SELECT).eq("external_barcode", clean).maybeSingle();
  if (ext.error) fail(ext.error, "material lookup");
  return ext.data ? normaliseMaterial(ext.data) : null;
}

export async function getLookups() {
  const admin = createAdminClient();
  const [brands, categories, types, suppliers] = await Promise.all([
    admin.from("inv_brands").select("*").order("sort_order").order("name"),
    admin.from("inv_categories").select("*").order("sort_order").order("name"),
    admin.from("inv_material_types").select("*").order("sort_order").order("name"),
    admin.from("inv_suppliers").select("*").order("name"),
  ]);
  if (brands.error) fail(brands.error, "brands");
  if (categories.error) fail(categories.error, "categories");
  if (types.error) fail(types.error, "material types");
  if (suppliers.error) fail(suppliers.error, "suppliers");
  return {
    brands: brands.data ?? [],
    categories: categories.data ?? [],
    types: types.data ?? [],
    suppliers: suppliers.data ?? [],
  } as {
    brands: { id: string; name: string; is_active: boolean; is_default: boolean }[];
    categories: { id: string; name: string; slug: string; default_unit: Unit; is_active: boolean }[];
    types: { id: string; category_id: string; name: string; is_active: boolean }[];
    suppliers: {
      id: string; name: string; contact_name: string | null; email: string | null; phone: string | null;
      website: string | null; notes: string | null; is_active: boolean;
    }[];
  };
}

export async function getOpenLots(materialId?: string): Promise<Lot[]> {
  const admin = createAdminClient();
  let query = admin
    .from("inv_stock_lots")
    .select("id,material_id,lot_label,received_qty,remaining_qty,unit_cost_cents,received_at,supplier_id")
    .gt("remaining_qty", 0)
    .order("received_at", { ascending: true })
    .limit(5000);
  if (materialId) query = query.eq("material_id", materialId);
  const { data, error } = await query;
  if (error) fail(error, "stock lots");
  return (data ?? []).map((l) => ({
    ...l,
    received_qty: num(l.received_qty),
    remaining_qty: num(l.remaining_qty),
    unit_cost_cents: num(l.unit_cost_cents),
  }));
}

export async function listMovements(opts: {
  materialId?: string;
  reason?: string;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<Movement[]> {
  const admin = createAdminClient();
  let query = admin
    .from("inv_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.materialId) query = query.eq("material_id", opts.materialId);
  if (opts.reason) query = query.eq("reason", opts.reason);
  if (opts.from) query = query.gte("created_at", opts.from);
  if (opts.to) query = query.lt("created_at", opts.to);
  const { data, error } = await query;
  if (error) fail(error, "stock history");
  return (data ?? []).map((m) => ({
    ...m,
    quantity_change: num(m.quantity_change),
    balance_after: num(m.balance_after),
    unit_cost_cents: num(m.unit_cost_cents),
  }));
}

/** Total value of everything currently on the shelf, in cents. */
export function stockValueCents(lots: Lot[]): number {
  return lots.reduce((sum, l) => sum + l.remaining_qty * l.unit_cost_cents, 0);
}

export function lotsByMaterial(lots: Lot[]): Map<string, Lot[]> {
  const map = new Map<string, Lot[]>();
  for (const lot of lots) {
    const list = map.get(lot.material_id) ?? [];
    list.push(lot);
    map.set(lot.material_id, list);
  }
  return map;
}

export function statusOf(m: Material): StockStatus {
  return stockStatus(m.quantity_on_hand, m.reorder_level);
}

export async function getDashboard() {
  const [materials, lots, movements] = await Promise.all([listMaterials(), getOpenLots(), listMovements({ limit: 8 })]);
  const totals = new Map<Unit, { qty: number; count: number }>();
  for (const m of materials) {
    const t = totals.get(m.unit) ?? { qty: 0, count: 0 };
    t.qty += m.quantity_on_hand;
    t.count += 1;
    totals.set(m.unit, t);
  }
  const attention = materials
    .filter((m) => statusOf(m) !== "ok")
    .sort((a, b) => Number(statusOf(b) === "out") - Number(statusOf(a) === "out") || a.quantity_on_hand - b.quantity_on_hand);
  return {
    materials,
    totals: [...totals.entries()].map(([unit, t]) => ({ unit, ...t })),
    valueCents: stockValueCents(lots),
    attention,
    movements,
    materialsById: new Map(materials.map((m) => [m.id, m])),
  };
}

export async function getRecentOrders(limit = 40) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, order_number, first_name, last_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail(error, "orders");
  return data ?? [];
}

export async function getRecentPurchases(limit = 10) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inv_purchases")
    .select("id, invoice_number, purchase_date, created_at, supplier:inv_suppliers(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail(error, "purchases");
  return (data ?? []) as unknown as {
    id: string; invoice_number: string | null; purchase_date: string; created_at: string; supplier: { name: string } | null;
  }[];
}
