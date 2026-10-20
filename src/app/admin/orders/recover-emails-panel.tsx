"use client";

import { useActionState, type FormEvent } from "react";
import { FormMessage, smallOutlineButtonClass } from "@/components/account/ui";
import { recoverUnsentNotificationsAction, type NotificationState } from "./actions";

export default function RecoverEmailsPanel() {
  const [state, formAction, pending] = useActionState<NotificationState, FormData>(
    recoverUnsentNotificationsAction,
    null,
  );

  const confirm = (event: FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Send every unsent order email now? Only do this once the sending domain is verified in Resend.")) {
      event.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={confirm} className="mb-6 space-y-2">
      <button type="submit" disabled={pending} className={smallOutlineButtonClass}>
        {pending ? "Sending…" : "Send unsent emails"}
      </button>
      <p className="text-xs text-neutral-500">
        Sends order emails that failed or never went out. Old pre-queue jobs are skipped.
      </p>
      {state && <FormMessage success={state.success} error={state.error} />}
    </form>
  );
}
