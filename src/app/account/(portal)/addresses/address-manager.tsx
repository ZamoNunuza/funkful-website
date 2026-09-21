"use client";

import { useActionState, useState, type CSSProperties } from "react";
import { deleteAddress, saveAddress, setDefaultAddress, type FormState } from "@/app/account/account-actions";
import { ADDRESS_LABELS, SA_PROVINCES, type AddressRow } from "@/lib/account-shared";
import { palette } from "@/lib/brands";
import {
  Card,
  EmptyState,
  Field,
  FormMessage,
  inputClass,
  inputStyle,
  outlineButtonClass,
  primaryButtonClass,
  primaryButtonStyle,
} from "@/components/account/ui";

export default function AddressManager({ addresses, maxAddresses }: { addresses: AddressRow[]; maxAddresses: number }) {
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);
  const atLimit = addresses.length >= maxAddresses;

  return (
    <div className="space-y-6">
      {editing ? (
        <AddressForm
          key={editing === "new" ? "new" : editing.id}
          address={editing === "new" ? null : editing}
          isFirst={addresses.length === 0}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setEditing("new")}
            disabled={atLimit}
            style={primaryButtonStyle}
            className={primaryButtonClass}
          >
            Add new address
          </button>
          {atLimit && <p className="text-xs text-neutral-500">You&apos;ve reached the limit of {maxAddresses} saved addresses.</p>}
        </div>
      )}

      {addresses.length === 0 && !editing ? (
        <EmptyState title="No saved addresses">
          Add one now and checkout will be a couple of taps faster.
        </EmptyState>
      ) : (
        <ul className="grid md:grid-cols-2 gap-5">
          {addresses.map((a) => (
            <li key={a.id}>
              <Card compact className="h-full flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    style={{ background: palette.beige, color: "#4a4438" }}
                    className="rounded-full px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
                  >
                    {a.label}
                  </span>
                  {a.is_default && (
                    <span
                      style={{ background: palette.sage, color: "#1c2617" }}
                      className="rounded-full px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
                    >
                      Default
                    </span>
                  )}
                </div>

                <address className="not-italic text-sm leading-relaxed text-neutral-700 flex-1">
                  <span className="font-bold text-black block">
                    {a.first_name} {a.last_name}
                  </span>
                  <span className="block">{a.street_address}</span>
                  {a.complex_unit && <span className="block">{a.complex_unit}</span>}
                  {a.suburb && <span className="block">{a.suburb}</span>}
                  <span className="block">{[a.city, a.province, a.postal_code].filter(Boolean).join(", ")}</span>
                  <span className="block mt-2">{a.phone}</span>
                </address>

                <div
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t text-xs font-bold uppercase tracking-wide"
                  style={{ borderColor: "rgba(17,17,17,0.08)" }}
                >
                  <button type="button" onClick={() => setEditing(a)} className="ghost underline">
                    Edit
                  </button>
                  {!a.is_default && (
                    <form action={setDefaultAddress}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="ghost underline">
                        Make default
                      </button>
                    </form>
                  )}
                  <form
                    action={deleteAddress}
                    onSubmit={(event) => {
                      if (!window.confirm("Delete this address?")) event.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="ghost underline" style={{ color: "#8a2f2b", "--ghost-hover": "#8a2f2b" } as CSSProperties}>
                      Delete
                    </button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddressForm({ address, isFirst, onDone }: { address: AddressRow | null; isFirst: boolean; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (previous, formData) => {
    const result = await saveAddress(previous, formData);
    if (result?.success) onDone();
    return result;
  }, null);

  const lockedDefault = Boolean(address?.is_default) || isFirst;
  // Keep what the customer typed if validation fails (React resets the form after each action).
  const v = (name: string, saved: string | null | undefined) => state?.values?.[name] ?? saved ?? "";

  return (
    <div ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "nearest" })}>
      <form action={action} className="bg-white border rounded-[22px] p-6 sm:p-7 flex flex-col gap-4" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
        <h3 className="text-sm font-extrabold uppercase">{address ? "Edit address" : "New address"}</h3>
        {address && <input type="hidden" name="id" value={address.id} />}

        <Field label="Label">
          <select name="label" defaultValue={v("label", address?.label ?? "Home")} style={inputStyle} className={inputClass}>
            {ADDRESS_LABELS.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input name="firstName" required autoFocus defaultValue={v("firstName", address?.first_name)} autoComplete="given-name" style={inputStyle} className={inputClass} />
          </Field>
          <Field label="Last name">
            <input name="lastName" required defaultValue={v("lastName", address?.last_name)} autoComplete="family-name" style={inputStyle} className={inputClass} />
          </Field>
        </div>

        <Field label="Phone" hint="So the courier can reach you on delivery day.">
          <input name="phone" type="tel" required defaultValue={v("phone", address?.phone)} placeholder="082 123 4567" autoComplete="tel" style={inputStyle} className={inputClass} />
        </Field>

        <Field label="Street address">
          <input name="streetAddress" required defaultValue={v("streetAddress", address?.street_address)} placeholder="12 Vilakazi Street" autoComplete="address-line1" style={inputStyle} className={inputClass} />
        </Field>

        <Field label="Apartment, complex or building (optional)">
          <input name="complexUnit" defaultValue={v("complexUnit", address?.complex_unit)} placeholder="Unit 4, Sunset Complex" autoComplete="address-line2" style={inputStyle} className={inputClass} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Suburb (optional)">
            <input name="suburb" defaultValue={v("suburb", address?.suburb)} placeholder="Orlando West" style={inputStyle} className={inputClass} />
          </Field>
          <Field label="City">
            <input name="city" required defaultValue={v("city", address?.city)} placeholder="Johannesburg" autoComplete="address-level2" style={inputStyle} className={inputClass} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Province">
            <select name="province" required defaultValue={v("province", address?.province)} autoComplete="address-level1" style={inputStyle} className={inputClass}>
              <option value="" disabled>
                Select province
              </option>
              {SA_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Postal code">
            <input name="postalCode" required inputMode="numeric" maxLength={4} defaultValue={v("postalCode", address?.postal_code)} placeholder="2001" autoComplete="postal-code" style={inputStyle} className={inputClass} />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="makeDefault" defaultChecked={lockedDefault} disabled={lockedDefault} className="h-4 w-4" />
          <span>{lockedDefault ? "This is your default address" : "Use as my default address"}</span>
        </label>

        <FormMessage error={state?.error} />

        <div className="flex flex-wrap gap-3 mt-1">
          <button type="submit" disabled={pending} style={primaryButtonStyle} className={primaryButtonClass}>
            {pending ? "Saving…" : "Save address"}
          </button>
          <button type="button" onClick={onDone} className={`ghost ${outlineButtonClass}`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
