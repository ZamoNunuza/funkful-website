"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/account-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADJUST_REASONS,
  STOCK_OUT_REASONS,
  UNITS,
  toBaseQuantity,
  type Unit,
} from "@/lib/inventory/inventory-shared";

export type ActionState = { ok?: string; error?: string } | null;

const NEXT_PATH = "/admin/inventory";
const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optStr = (fd: FormData, key: string) => str(fd, key) || null;
const refresh = () => revalidatePath(NEXT_PATH, "layout");

/** Postgres exceptions we raise ourselves are safe to show; anything else is logged and hidden. */
function friendly(error: { message: string } | null, fallback: string): string {
  if (!error) return fallback;
  const known = [
    "Only ", "Quantity must", "Add at least", "Add a note", "Invalid reason", "Adjustment cannot",
    "This stock count", "Counted quantity", "Price cannot", "Material not found",
  ];
  if (known.some((k) => error.message.startsWith(k))) return error.message;
  if (error.message.includes("duplicate key")) return "That value already exists.";
  console.error("Inventory action failed:", error);
  return fallback;
}

async function materialUnit(id: string): Promise<Unit | null> {
  const { data } = await createAdminClient().from("inv_materials").select("unit").eq("id", id).maybeSingle();
  return (data?.unit as Unit) ?? null;
}

/** Reads quantity + chosen input unit (m/cm etc.) and converts to the material's own unit. */
async function readQuantity(fd: FormData, materialId: string, field = "quantity") {
  const unit = await materialUnit(materialId);
  if (!unit) return { error: "Choose a material." } as const;
  const raw = Number(str(fd, field));
  const qty = toBaseQuantity(raw, str(fd, `${field}_unit`), unit);
  if (qty === null || qty <= 0) return { error: "Enter a quantity greater than zero." } as const;
  return { qty, unit } as const;
}

// ---------------------------------------------------------------- materials

export async function saveMaterialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  const unit = str(fd, "unit") as Unit;
  if (!UNITS.some((u) => u.value === unit)) return { error: "Choose a unit." };
  if (!isUuid(str(fd, "category_id"))) return { error: "Choose a category." };
  if (!isUuid(str(fd, "brand_id"))) return { error: "Choose a brand (use Other / Unbranded if unknown)." };

  const number = (key: string) => {
    const v = str(fd, key);
    return v === "" ? null : Number(v);
  };
  const width = number("width_mm");
  const rollLength = number("roll_length");
  const reorder = number("reorder_level") ?? 0;
  if ([width, rollLength, reorder].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
    return { error: "Width, roll size and reorder level must be positive numbers." };
  }

  const row = {
    category_id: str(fd, "category_id"),
    material_type_id: isUuid(str(fd, "material_type_id")) ? str(fd, "material_type_id") : null,
    brand_id: str(fd, "brand_id"),
    range_name: optStr(fd, "range_name"),
    colour: optStr(fd, "colour"),
    finish: optStr(fd, "finish"),
    width_mm: width ? Math.round(width) : null,
    roll_length: rollLength || null,
    size_label: optStr(fd, "size_label"),
    unit,
    reorder_level: reorder,
    preferred_supplier_id: isUuid(str(fd, "preferred_supplier_id")) ? str(fd, "preferred_supplier_id") : null,
    external_barcode: optStr(fd, "external_barcode"),
    notes: optStr(fd, "notes"),
  };

  const admin = createAdminClient();
  if (id) {
    if (!isUuid(id)) return { error: "Invalid material." };
    // Changing the unit of a material that already has history would corrupt every balance.
    const { data: existing } = await admin.from("inv_materials").select("unit").eq("id", id).maybeSingle();
    if (existing && existing.unit !== unit) {
      const { count } = await admin.from("inv_movements").select("id", { count: "exact", head: true }).eq("material_id", id);
      if (count) return { error: "The unit can't be changed once a material has stock history." };
    }
    const { error } = await admin.from("inv_materials").update(row).eq("id", id);
    if (error) return { error: friendly(error, "Could not save this material.") };
    refresh();
    return { ok: "Material saved." };
  }

  const { data, error } = await admin.from("inv_materials").insert(row).select("id").single();
  if (error || !data) return { error: friendly(error, "Could not create this material.") };
  refresh();
  redirect(`${NEXT_PATH}/materials/${data.id}?created=1`);
}

export async function toggleMaterialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!isUuid(id)) return { error: "Invalid material." };
  const { error } = await createAdminClient()
    .from("inv_materials")
    .update({ is_active: str(fd, "active") === "true" })
    .eq("id", id);
  if (error) return { error: friendly(error, "Could not update this material.") };
  refresh();
  return { ok: "Updated." };
}

// ----------------------------------------------------------------- stock in

export async function stockInAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const materialIds = fd.getAll("material_id").map(String);
  const quantities = fd.getAll("quantity").map(String);
  const qtyUnits = fd.getAll("quantity_unit").map(String);
  const costs = fd.getAll("unit_cost").map(String);
  const labels = fd.getAll("lot_label").map(String);

  const lines: Record<string, unknown>[] = [];
  for (let i = 0; i < materialIds.length; i++) {
    if (!materialIds[i] && !quantities[i]) continue; // blank spare row
    if (!isUuid(materialIds[i])) return { error: `Line ${i + 1}: choose a material.` };
    const unit = await materialUnit(materialIds[i]);
    if (!unit) return { error: `Line ${i + 1}: material not found.` };
    const qty = toBaseQuantity(Number(quantities[i]), qtyUnits[i], unit);
    if (qty === null || qty <= 0) return { error: `Line ${i + 1}: enter a quantity greater than zero.` };
    const cost = Number(costs[i] || 0);
    if (!Number.isFinite(cost) || cost < 0) return { error: `Line ${i + 1}: price must be zero or more.` };
    lines.push({
      material_id: materialIds[i],
      quantity: qty,
      unit_cost_cents: Math.round(cost * 100 * 10000) / 10000, // price per unit in rand → cents
      lot_label: labels[i] || null,
    });
  }
  if (!lines.length) return { error: "Add at least one material to receive." };

  const supplierId = str(fd, "supplier_id");
  const { error } = await createAdminClient().rpc("inv_receive_stock", {
    p_supplier_id: isUuid(supplierId) ? supplierId : null,
    p_invoice: str(fd, "invoice_number"),
    p_date: str(fd, "purchase_date") || null,
    p_notes: str(fd, "notes"),
    p_actor: user.email ?? "unknown",
    p_lines: lines,
  });
  if (error) return { error: friendly(error, "Could not receive this stock.") };
  refresh();
  return { ok: `Received ${lines.length} line${lines.length === 1 ? "" : "s"} into stock.` };
}

// ---------------------------------------------------------------- stock out

export async function stockOutAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const materialId = str(fd, "material_id");
  if (!isUuid(materialId)) return { error: "Choose a material." };
  const reason = str(fd, "reason");
  if (!(STOCK_OUT_REASONS as readonly string[]).includes(reason)) return { error: "Choose a reason." };
  const q = await readQuantity(fd, materialId);
  if ("error" in q) return { error: q.error };

  const orderId = str(fd, "order_id");
  const { error } = await createAdminClient().rpc("inv_use_stock", {
    p_material: materialId,
    p_qty: q.qty,
    p_reason: reason,
    p_order_id: isUuid(orderId) ? orderId : null,
    p_order_ref: str(fd, "order_ref"),
    p_note: str(fd, "note"),
    p_actor: user.email ?? "unknown",
  });
  if (error) return { error: friendly(error, "Could not record this stock out.") };
  refresh();
  return { ok: "Stock out recorded." };
}

export async function adjustStockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const materialId = str(fd, "material_id");
  if (!isUuid(materialId)) return { error: "Choose a material." };
  const reason = str(fd, "reason");
  if (!(ADJUST_REASONS as readonly string[]).includes(reason)) return { error: "Choose a reason." };
  const q = await readQuantity(fd, materialId);
  if ("error" in q) return { error: q.error };
  const sign = str(fd, "direction") === "add" ? 1 : -1;

  const { error } = await createAdminClient().rpc("inv_adjust_stock", {
    p_material: materialId,
    p_delta: sign * q.qty,
    p_reason: reason,
    p_note: str(fd, "note"),
    p_actor: user.email ?? "unknown",
  });
  if (error) return { error: friendly(error, "Could not record this adjustment.") };
  refresh();
  return { ok: "Adjustment recorded." };
}

// --------------------------------------------------------------- stocktaking

export async function startStocktakeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const category = str(fd, "category_id");
  const { data, error } = await createAdminClient().rpc("inv_start_stocktake", {
    p_name: str(fd, "name"),
    p_category: isUuid(category) ? category : null,
    p_actor: user.email ?? "unknown",
  });
  if (error || !data) return { error: friendly(error, "Could not start the stock count.") };
  refresh();
  redirect(`${NEXT_PATH}/stocktaking/${data}`);
}

export async function saveCountAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const stocktakeId = str(fd, "stocktake_id");
  const materialId = str(fd, "material_id");
  if (!isUuid(stocktakeId) || !isUuid(materialId)) return { error: "Invalid count." };
  if (str(fd, "counted") === "") return { error: "Enter the counted quantity." };
  // A count of zero is valid (the roll is finished), so this doesn't use readQuantity.
  const unit = await materialUnit(materialId);
  if (!unit) return { error: "Material not found." };
  const counted = toBaseQuantity(Number(str(fd, "counted")), str(fd, "counted_unit"), unit);
  if (counted === null || counted < 0) return { error: "Enter a valid quantity." };

  const { error } = await createAdminClient().rpc("inv_save_count", {
    p_stocktake: stocktakeId,
    p_material: materialId,
    p_counted: counted,
  });
  if (error) return { error: friendly(error, "Could not save this count.") };
  revalidatePath(`${NEXT_PATH}/stocktaking/${stocktakeId}`);
  return { ok: "Counted." };
}

export async function completeStocktakeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = str(fd, "stocktake_id");
  if (!isUuid(id)) return { error: "Invalid stock count." };
  const { data, error } = await createAdminClient().rpc("inv_complete_stocktake", {
    p_stocktake: id,
    p_actor: user.email ?? "unknown",
  });
  if (error) return { error: friendly(error, "Could not complete the stock count.") };
  refresh();
  return { ok: `Stock count completed. ${data ?? 0} correction${data === 1 ? "" : "s"} applied.` };
}

export async function cancelStocktakeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "stocktake_id");
  if (!isUuid(id)) return { error: "Invalid stock count." };
  const { error } = await createAdminClient()
    .from("inv_stocktakes")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "open");
  if (error) return { error: friendly(error, "Could not cancel the stock count.") };
  refresh();
  redirect(`${NEXT_PATH}/stocktaking`);
}

// ------------------------------------------------------- setup + suppliers

/** One action for the Brands / Categories / Types forms; a hidden `intent` says which. */
export async function setupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const admin = createAdminClient();
  const intent = str(fd, "intent");
  const id = str(fd, "id");
  const name = str(fd, "name");
  const active = str(fd, "active") === "true";

  const table =
    intent.startsWith("brand") ? "inv_brands" : intent.startsWith("category") ? "inv_categories" : "inv_material_types";
  if (!["brand", "category", "type"].some((p) => intent.startsWith(p))) return { error: "Unknown action." };

  if (intent.endsWith("_add")) {
    if (!name) return { error: "Enter a name." };
    const row: Record<string, unknown> = { name };
    if (table === "inv_categories") {
      const unit = str(fd, "default_unit");
      row.default_unit = UNITS.some((u) => u.value === unit) ? unit : "unit";
      row.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `category-${Date.now()}`;
    }
    if (table === "inv_material_types") {
      if (!isUuid(str(fd, "category_id"))) return { error: "Choose a category." };
      row.category_id = str(fd, "category_id");
    }
    const { error } = await admin.from(table).insert(row);
    if (error) return { error: friendly(error, "Could not add this.") };
  } else if (intent.endsWith("_rename")) {
    if (!isUuid(id) || !name) return { error: "Enter a name." };
    const { error } = await admin.from(table).update({ name }).eq("id", id);
    if (error) return { error: friendly(error, "Could not rename this.") };
  } else if (intent.endsWith("_toggle")) {
    if (!isUuid(id)) return { error: "Invalid item." };
    const { error } = await admin.from(table).update({ is_active: active }).eq("id", id);
    if (error) return { error: friendly(error, "Could not update this.") };
  } else {
    return { error: "Unknown action." };
  }
  refresh();
  return { ok: "Saved." };
}

export async function saveSupplierAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Enter the supplier name." };
  const row = {
    name,
    contact_name: optStr(fd, "contact_name"),
    email: optStr(fd, "email"),
    phone: optStr(fd, "phone"),
    website: optStr(fd, "website"),
    notes: optStr(fd, "notes"),
    ...(str(fd, "active") ? { is_active: str(fd, "active") === "true" } : {}),
  };
  const admin = createAdminClient();
  const { error } = id
    ? isUuid(id)
      ? await admin.from("inv_suppliers").update(row).eq("id", id)
      : { error: { message: "Invalid supplier." } }
    : await admin.from("inv_suppliers").insert(row);
  if (error) return { error: friendly(error, "Could not save this supplier.") };
  refresh();
  return { ok: "Supplier saved." };
}
