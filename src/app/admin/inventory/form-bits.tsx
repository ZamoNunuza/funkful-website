"use client";

import { useFormStatus } from "react-dom";
import { INPUT_UNITS, type Unit } from "@/lib/inventory/inventory-shared";
import { btnPrimary, inputCls } from "./ui";
import type { ActionState } from "./actions";

export function SubmitButton({ children, className = btnPrimary }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-bold text-green-900">
        {state.ok}
      </p>
    );
  return null;
}

/** Number box plus a unit picker when the material's unit has smaller units (m → cm, kg → g). */
export function QtyInput({
  unit,
  name = "quantity",
  placeholder,
  required = true,
  defaultValue,
}: {
  unit: Unit | null;
  name?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: number;
}) {
  const options = unit ? INPUT_UNITS[unit] : [];
  return (
    <div className="flex gap-2">
      <input
        name={name}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder ?? (unit ? `Quantity (${options[0]?.label ?? ""})` : "Quantity")}
        className={inputCls}
      />
      {options.length > 1 ? (
        <select name={`${name}_unit`} aria-label="Unit" className={`${inputCls} w-24 shrink-0`} defaultValue={options[0].value}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input type="hidden" name={`${name}_unit`} value={options[0]?.value ?? ""} />
          {unit ? <span className="mt-1 flex min-h-11 w-16 shrink-0 items-center text-sm font-bold">{options[0]?.label}</span> : null}
        </>
      )}
    </div>
  );
}
