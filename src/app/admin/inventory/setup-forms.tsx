"use client";

import { useActionState } from "react";
import { UNITS } from "@/lib/inventory/inventory-shared";
import { saveSupplierAction, setupAction, toggleMaterialAction, type ActionState } from "./actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { btnGhost, inputCls, labelCls } from "./ui";

/** Add form for a brand, category or material type (intent: brand_add | category_add | type_add). */
export function AddSetupItem({
  intent,
  placeholder,
  categories,
  withUnit = false,
}: {
  intent: "brand_add" | "category_add" | "type_add";
  placeholder: string;
  categories?: { id: string; name: string }[];
  withUnit?: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(setupAction, null);
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="intent" value={intent} />
      {categories ? (
        <select name="category_id" required aria-label="Category" className={`${inputCls} mt-0 w-auto`} defaultValue="">
          <option value="">Category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}
      <input name="name" required placeholder={placeholder} aria-label={placeholder} className={`${inputCls} mt-0 w-auto flex-1`} />
      {withUnit ? (
        <select name="default_unit" aria-label="Default unit" className={`${inputCls} mt-0 w-auto`} defaultValue="m">
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      ) : null}
      <SubmitButton>Add</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** One row: rename in place, and activate / deactivate. */
export function SetupRow({
  kind,
  id,
  name,
  isActive,
  note,
}: {
  kind: "brand" | "category" | "type";
  id: string;
  name: string;
  isActive: boolean;
  note?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(setupAction, null);
  const [toggleState, toggleAction] = useActionState<ActionState, FormData>(setupAction, null);
  return (
    <li className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={action} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="intent" value={`${kind}_rename`} />
          <input type="hidden" name="id" value={id} />
          <input name="name" defaultValue={name} aria-label={`Rename ${name}`} className={`${inputCls} mt-0 min-w-0 flex-1 ${isActive ? "" : "opacity-50"}`} />
          <SubmitButton className={btnGhost}>Rename</SubmitButton>
        </form>
        <form action={toggleAction}>
          <input type="hidden" name="intent" value={`${kind}_toggle`} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={String(!isActive)} />
          <SubmitButton className={btnGhost}>{isActive ? "Deactivate" : "Reactivate"}</SubmitButton>
        </form>
      </div>
      {note ? <p className="mt-1 text-xs text-neutral-600">{note}</p> : null}
      <FormMessage state={state?.error ? state : toggleState?.error ? toggleState : null} />
    </li>
  );
}

export function ToggleMaterial({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(toggleMaterialAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!active)} />
      <SubmitButton className={btnGhost}>{active ? "Deactivate material" : "Reactivate material"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function SupplierForm({
  supplier,
}: {
  supplier?: { id: string; name: string; contact_name: string | null; email: string | null; phone: string | null; website: string | null; notes: string | null; is_active: boolean };
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveSupplierAction, null);
  return (
    <form action={action} className="space-y-3">
      {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Supplier name
          <input name="name" required defaultValue={supplier?.name ?? ""} className={inputCls} />
        </label>
        <label className={labelCls}>
          Contact person
          <input name="contact_name" defaultValue={supplier?.contact_name ?? ""} className={inputCls} />
        </label>
        <label className={labelCls}>
          Email
          <input name="email" type="email" defaultValue={supplier?.email ?? ""} className={inputCls} />
        </label>
        <label className={labelCls}>
          Phone / WhatsApp
          <input name="phone" inputMode="tel" defaultValue={supplier?.phone ?? ""} className={inputCls} />
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          Website
          <input name="website" defaultValue={supplier?.website ?? ""} className={inputCls} placeholder="https://" />
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          Notes
          <input name="notes" defaultValue={supplier?.notes ?? ""} className={inputCls} />
        </label>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton>{supplier ? "Save supplier" : "Add supplier"}</SubmitButton>
        {supplier ? (
          <button
            type="submit"
            name="active"
            value={String(!supplier.is_active)}
            className={btnGhost}
          >
            {supplier.is_active ? "Deactivate" : "Reactivate"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
