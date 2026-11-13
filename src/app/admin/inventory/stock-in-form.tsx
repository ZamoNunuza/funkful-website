"use client";

import { useActionState, useState } from "react";
import { todayISO } from "@/lib/inventory/inventory-shared";
import { stockInAction, type ActionState } from "./actions";
import { FormMessage, QtyInput, SubmitButton } from "./form-bits";
import { MaterialPicker, type PickerMaterial } from "./material-picker";
import { btnGhost, inputCls, labelCls } from "./ui";

interface Line {
  key: number;
  materialId: string;
  cost: string;
}

let nextKey = 1;
const blankLine = (): Line => ({ key: nextKey++, materialId: "", cost: "" });

export default function StockInForm({
  materials,
  suppliers,
}: {
  materials: PickerMaterial[];
  suppliers: { id: string; name: string }[];
}) {
  const [lines, setLines] = useState<Line[]>(() => [blankLine()]);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await stockInAction(prev, fd);
    if (result?.ok) setLines([blankLine()]);
    return result;
  }, null);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((old) => old.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelCls}>
          Supplier
          <select name="supplier_id" className={inputCls} defaultValue="">
            <option value="">— Not recorded —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Invoice / delivery note
          <input name="invoice_number" className={inputCls} placeholder="e.g. INV-10442" />
        </label>
        <label className={labelCls}>
          Date received
          <input name="purchase_date" type="date" defaultValue={todayISO()} className={inputCls} />
        </label>
      </div>

      <div className="space-y-4">
        {lines.map((line, index) => {
          const material = materials.find((m) => m.id === line.materialId) ?? null;
          return (
            <div key={line.key} className="space-y-3 rounded-2xl bg-[#FAF8F4] p-4">
              <MaterialPicker
                materials={materials}
                selectedId={line.materialId}
                label={`Line ${index + 1}`}
                onSelect={(m) =>
                  update(line.key, { materialId: m?.id ?? "", cost: m && m.lastCostCents ? String(m.lastCostCents / 100) : line.cost })
                }
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <span className={labelCls}>Quantity received</span>
                  <QtyInput unit={material?.unit ?? null} />
                </div>
                <label className={labelCls}>
                  Price per {material ? material.unit === "unit" ? "item" : material.unit : "unit"} (R)
                  <input
                    name="unit_cost"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={line.cost}
                    onChange={(e) => update(line.key, { cost: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. 65.00"
                  />
                </label>
                <label className={labelCls}>
                  Roll / batch label (optional)
                  <input name="lot_label" className={inputCls} placeholder="Batch no. or note" />
                </label>
              </div>
              <div className="flex justify-end">
                {lines.length > 1 ? (
                  <button type="button" onClick={() => setLines((old) => old.filter((l) => l.key !== line.key))} className="min-h-11 px-2 text-sm font-bold text-red-700">
                    Remove line
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setLines((old) => [...old, blankLine()])} className={btnGhost}>
          + Add another material
        </button>
      </div>

      <label className={labelCls}>
        Notes (optional)
        <input name="notes" className={inputCls} />
      </label>

      <FormMessage state={state} />
      <SubmitButton>Receive into stock</SubmitButton>
    </form>
  );
}
