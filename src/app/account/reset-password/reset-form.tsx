"use client";

import { useActionState } from "react";
import { updatePassword, type ResetPasswordState } from "@/app/account/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/account-shared";
import { Field, FormMessage, inputClass, inputStyle, primaryButtonClass, primaryButtonStyle } from "@/components/account/ui";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(updatePassword, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black uppercase mb-2">Set a new password</h1>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Choose something at least {PASSWORD_MIN_LENGTH} characters long, with a letter and a number.
        </p>
      </div>

      <Field label="New password">
        <input name="password" type="password" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" style={inputStyle} className={inputClass} />
      </Field>
      <Field label="Confirm new password">
        <input name="confirmPassword" type="password" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" style={inputStyle} className={inputClass} />
      </Field>

      <FormMessage error={state?.error} />

      <button type="submit" disabled={pending} style={primaryButtonStyle} className={primaryButtonClass}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
