"use client";

import { useActionState, useState } from "react";
import { ADJUST_REASONS, REASON_LABEL, STOCK_OUT_REASONS } from "@/lib/inventory/inventory-shared";
import { adjustStockAction, stockOutAction, type ActionState } from "./actions";
import { FormMessage, QtyInput, SubmitButton } from "./form-bits";
import { MaterialPicker, type PickerMaterial } from "./material-picker";
import { inputCls, labelCls } from "./ui";

type Order = { id: string; order_number: string; first_name: string | null; last_name: string | null };

/**
 * Stock out (materials used for orders, wastage, test cuts) and manual adjustments share one form.
 * Pass `fixedMaterialId` on a material's own page to skip the picker.
 */
export default function MovementForm({
  mode,
  materials,
  orders = [],
  fixedMaterialId,
}: {
  mode: "out" | "adjust";
  materials: PickerMaterial[];
  orders?: Order[];
  fixedMaterialId?: string;
}) {
  const [materialId, setMaterialId] = useState(fixedMaterialId ?? "");
  const [reason, setReason] = useState<string>(mode === "out" ? "order_usage" : "manual_correction");
  const [formKey, setFormKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await (mode === "out" ? stockOutAction : adjustStockAction)(prev, fd);
    if (result?.ok) {
      if (!fixedMaterialId) setMaterialId("");
      setFormKey((k) => k + 1); // clears the quantity and note boxes
    }
    return result;
  }, null);

  const material = materials.find((m) => m.id === materialId) ?? null;
  const reasons = mode === "out" ? STOCK_OUT_REASONS : ADJUST_REASONS;

  return (
    <form action={action} key={formKey} className="space-y-4">
      {fixedMaterialId ? (
        <input type="hidden" name="material_id" value={fixedMaterialId} />
      ) : (
        <MaterialPicker materials={materials} selectedId={materialId} onSelect={(m) => setMaterialId(m?.id ?? "")} />
      )}

      {mode === "adjust" ? (
        <fieldset className="flex gap-3">
          <legend className="sr-only">Direction</legend>
          {[
            ["remove", "Remove stock"],
            ["add", "Add found stock"],
          ].map(([value, text], i) => (
            <label key={value} className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-black/15 bg-white px-3 text-sm font-bold">
              <input type="radio" name="direction" value={value} defaultChecked={i === 0} />
              {text}
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={labelCls}>Quantity</span>
          <QtyInput unit={material?.unit ?? null} />
        </div>
        <label className={labelCls}>
          Reason
          <select name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === "out" && reason === "order_usage" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Funkful order (optional)
            <select name="order_id" className={inputCls} defaultValue="">
              <option value="">— Not linked to an order —</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} · {[o.first_name, o.last_name].filter(Boolean).join(" ") || "Customer"}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Or a reference (quote, WhatsApp order…)
            <input name="order_ref" className={inputCls} placeholder="e.g. Quote Q-1042" />
          </label>
        </div>
      ) : null}

      <label className={labelCls}>
        Note {reason === "other" ? "(required)" : "(optional)"}
        <input name="note" className={inputCls} required={reason === "other"} />
      </label>

      <FormMessage state={state} />
      <SubmitButton>{mode === "out" ? "Record stock out" : "Record adjustment"}</SubmitButton>
    </form>
  );
}
