"use client";

import { useActionState, useState } from "react";
import { changePassword, type FormState } from "@/app/account/account-actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/account-shared";
import { Card, CardTitle, Field, FormMessage, inputClass, inputStyle, primaryButtonClass, primaryButtonStyle } from "@/components/account/ui";

export default function PasswordForm() {
  const [show, setShow] = useState(false);
  // React clears the (uncontrolled) fields after every submit, which is what we
  // want for passwords whether it worked or not.
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, null);

  const type = show ? "text" : "password";

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <CardTitle>Change password</CardTitle>

        <Field label="Current password">
          <input name="currentPassword" type={type} required autoComplete="current-password" style={inputStyle} className={inputClass} />
        </Field>

        <Field label="New password" hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}>
          <input name="newPassword" type={type} required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" style={inputStyle} className={inputClass} />
        </Field>

        <Field label="Confirm new password">
          <input name="confirmPassword" type={type} required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" style={inputStyle} className={inputClass} />
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="h-4 w-4" />
          <span>Show passwords</span>
        </label>

        <FormMessage error={state?.error} success={state?.success} />

        <button type="submit" disabled={pending} style={primaryButtonStyle} className={`${primaryButtonClass} self-start`}>
          {pending ? "Updating…" : "Update password"}
        </button>

        <p className="text-xs text-neutral-500 leading-relaxed">
          Forgotten your current password? Sign out and use &ldquo;Forgot password?&rdquo; on the sign-in page.
        </p>
      </form>
    </Card>
  );
}
