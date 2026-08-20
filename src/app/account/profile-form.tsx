"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/account/actions";
import { palette } from "@/lib/brands";

interface ProfileFormProps {
  initial: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
}

type ProfileState = { error?: string; success?: boolean } | null;

export function ProfileForm({ initial }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, null);

  return (
    <form
      action={action}
      style={{ background: "white", borderColor: "rgba(17,17,17,0.08)" }}
      className="border rounded-[22px] p-7 flex flex-col gap-4"
    >
      <h3 className="text-sm font-extrabold uppercase mb-1">Profile & shipping details</h3>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input name="firstName" defaultValue={initial.firstName} style={inputStyle} className="w-full" />
        </Field>
        <Field label="Last name">
          <input name="lastName" defaultValue={initial.lastName} style={inputStyle} className="w-full" />
        </Field>
      </div>
      <Field label="Phone">
        <input name="phone" defaultValue={initial.phone} placeholder="082 123 4567" style={inputStyle} className="w-full" />
      </Field>
      <Field label="Address">
        <input name="address" defaultValue={initial.address} placeholder="12 Vilakazi Street" style={inputStyle} className="w-full" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <input name="city" defaultValue={initial.city} placeholder="Johannesburg" style={inputStyle} className="w-full" />
        </Field>
        <Field label="Postal code">
          <input name="postalCode" defaultValue={initial.postalCode} placeholder="2001" style={inputStyle} className="w-full" />
        </Field>
      </div>

      {state?.error && (
        <p className="text-xs" style={{ color: "#8a2f2b" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs" style={{ color: "#4a6b3c" }}>
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{ background: palette.black, color: palette.cream }}
        className="font-extrabold text-xs uppercase tracking-wide py-3.5 rounded-full disabled:opacity-60 mt-1"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

const inputStyle = { borderColor: "rgba(17,17,17,0.2)", background: palette.cream } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ color: "#6a6458" }} className="text-[11.5px] font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="[&>input]:border [&>input]:rounded-xl [&>input]:px-3.5 [&>input]:py-3 [&>input]:text-sm">{children}</span>
    </label>
  );
}