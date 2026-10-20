"use client";

import { useActionState } from "react";
import { FormMessage, smallOutlineButtonClass } from "@/components/account/ui";
import { retryNotificationAction, type NotificationState } from "./actions";

export default function RetryNotificationButton({
  notificationId,
  orderId,
}: {
  notificationId: string;
  orderId: string;
}) {
  const [state, formAction, pending] = useActionState<NotificationState, FormData>(retryNotificationAction, null);

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="notificationId" value={notificationId} />
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" disabled={pending} className={smallOutlineButtonClass}>
        {pending ? "Retrying…" : "Retry"}
      </button>
      {state && <FormMessage success={state.success} error={state.error} />}
    </form>
  );
}
