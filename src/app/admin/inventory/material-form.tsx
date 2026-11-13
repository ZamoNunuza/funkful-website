"use client";

import { useActionState, useState } from "react";
import { UNITS, type Unit } from "@/lib/inventory/inventory-shared";
import type { Material } from "@/lib/inventory/inventory";
import { saveMaterialAction, type ActionState } from "./actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { inputCls, labelCls } from "./ui";

type Named = { id: string; name: string; is_active: boolean };

export default function MaterialForm({
  material,
  brands,
  categories,
  types,
  suppliers,
  unitLocked = false,
}: {
  material?: Material;
  brands: (Named & { is_default?: boolean })[];
  categories: (Named & { default_unit: Unit })[];
  types: (Named & { category_id: string })[];
  suppliers: Named[];
  unitLocked?: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveMaterialAction, null);
  const [categoryId, setCategoryId] = useState(material?.category_id ?? "");
  const [unit, setUnit] = useState<Unit>(material?.unit ?? "m");

  const defaultBrand = brands.find((b) => b.is_default);
  const visible = <T extends Named>(list: T[], keepId?: string | null) => list.filter((x) => x.is_active || x.id === keepId);

  return (
    <form action={action} className="space-y-5">
      {material ? <input type="hidden" name="id" value={material.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Category
          <select
            name="category_id"
            required
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              const cat = categories.find((c) => c.id === e.target.value);
              if (cat && !material && !unitLocked) setUnit(cat.default_unit);
            }}
            className={inputCls}
          >
            <option value="">Choose…</option>
            {visible(categories, material?.category_id).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Material type
          <select name="material_type_id" className={inputCls} defaultValue={material?.material_type_id ?? ""} key={categoryId}>
            <option value="">— None —</option>
            {visible(types.filter((t) => t.category_id === categoryId), material?.material_type_id).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Brand
          <select name="brand_id" required className={inputCls} defaultValue={material?.brand_id ?? defaultBrand?.id ?? ""}>
            {visible(brands, material?.brand_id).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Product / range name
          <input name="range_name" defaultValue={material?.range_name ?? ""} className={inputCls} placeholder="e.g. EasyWeed, Glitter" />
        </label>
        <label className={labelCls}>
          Colour
          <input name="colour" defaultValue={material?.colour ?? ""} className={inputCls} placeholder="e.g. Black" />
        </label>
        <label className={labelCls}>
          Finish
          <input name="finish" defaultValue={material?.finish ?? ""} className={inputCls} placeholder="e.g. Gloss, Matte" />
        </label>
        <label className={labelCls}>
          Width (mm)
          <input name="width_mm" type="number" inputMode="numeric" min="1" defaultValue={material?.width_mm ?? ""} className={inputCls} placeholder="e.g. 500" />
        </label>
        <label className={labelCls}>
          Sheet size (if sold in sheets)
          <input name="size_label" defaultValue={material?.size_label ?? ""} className={inputCls} placeholder="e.g. A4, 30 × 30 cm" />
        </label>
        <label className={labelCls}>
          Track stock in
          <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)} disabled={unitLocked} className={inputCls}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
          {unitLocked ? <input type="hidden" name="unit" value={unit} /> : null}
        </label>
        <label className={labelCls}>
          Standard roll / pack size ({UNITS.find((u) => u.value === unit)?.short})
          <input name="roll_length" type="number" inputMode="decimal" step="any" min="0" defaultValue={material?.roll_length ?? ""} className={inputCls} placeholder="e.g. 25" />
        </label>
        <label className={labelCls}>
          Reorder when stock falls to
          <input name="reorder_level" type="number" inputMode="decimal" step="any" min="0" defaultValue={material?.reorder_level ?? 0} className={inputCls} />
        </label>
        <label className={labelCls}>
          Usual supplier
          <select name="preferred_supplier_id" className={inputCls} defaultValue={material?.preferred_supplier_id ?? ""}>
            <option value="">— None —</option>
            {visible(suppliers, material?.preferred_supplier_id).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          Manufacturer barcode (optional)
          <input name="external_barcode" defaultValue={material?.external_barcode ?? ""} className={inputCls} placeholder="Scan or type the barcode printed on the roll" />
          <span className="mt-1 block text-xs font-normal text-neutral-600">Funkful also prints its own QR label for every material, so this is only needed if you want to scan the manufacturer’s code.</span>
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          Notes
          <textarea name="notes" rows={2} defaultValue={material?.notes ?? ""} className={inputCls} />
        </label>
      </div>

      <FormMessage state={state} />
      <SubmitButton>{material ? "Save changes" : "Create material"}</SubmitButton>
    </form>
  );
}
