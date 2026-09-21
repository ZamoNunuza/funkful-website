"use client";

import { useActionState } from "react";
import { updateDetails, type FormState } from "@/app/account/account-actions";
import { Card, CardTitle, Field, FormMessage, inputClass, inputStyle, primaryButtonClass, primaryButtonStyle } from "@/components/account/ui";

interface DetailsFormProps {
  initial: { firstName: string; lastName: string; phone: string };
}

export default function DetailsForm({ initial }: DetailsFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateDetails, null);
  // Keep what the customer typed if validation fails (React resets the form after each action).
  const value = (name: keyof DetailsFormProps["initial"]) => state?.values?.[name] ?? initial[name];

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <CardTitle>Your details</CardTitle>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input name="firstName" required defaultValue={value("firstName")} autoComplete="given-name" style={inputStyle} className={inputClass} />
          </Field>
          <Field label="Last name">
            <input name="lastName" required defaultValue={value("lastName")} autoComplete="family-name" style={inputStyle} className={inputClass} />
          </Field>
        </div>

        <Field label="Phone (optional)" hint="Used by the courier for delivery updates.">
          <input name="phone" type="tel" defaultValue={value("phone")} placeholder="082 123 4567" autoComplete="tel" style={inputStyle} className={inputClass} />
        </Field>

        <FormMessage error={state?.error} success={state?.success} />

        <button type="submit" disabled={pending} style={primaryButtonStyle} className={`${primaryButtonClass} self-start`}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Card>
  );
}
