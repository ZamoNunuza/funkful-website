"use client";

import { useActionState, useState, type FormEvent } from "react";
import {
  Field,
  FormMessage,
  inputClass,
  inputStyle,
  smallOutlineButtonClass,
} from "@/components/account/ui";
import { refundOrderAction, type RefundState } from "./refund-actions";

export default function RefundPanel({ orderId, totalCents }: { orderId: string; totalCents: number }) {
  const [state, formAction, pending] = useActionState<RefundState, FormData>(refundOrderAction, null);
  // One token per page view: a double click re-sends the same Idempotency-Key.
  const [attempt] = useState(() => crypto.randomUUID());

  function confirmFirst(event: FormEvent<HTMLFormElement>) {
    const amount = new FormData(event.currentTarget).get("amountRands");
    if (!window.confirm(`Refund R${amount} to the customer's card? This can't be undone.`)) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={confirmFirst} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="attempt" value={attempt} />
      <Field label="Amount (R)" hint="Defaults to the full order total. Enter less for a partial refund.">
        <input
          name="amountRands"
          inputMode="decimal"
          required
          defaultValue={(totalCents / 100).toFixed(2)}
          style={inputStyle}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      <Field label="Reason">
        <input name="reason" required maxLength={200} style={inputStyle} className={inputClass} autoComplete="off" />
      </Field>
      <p className="text-xs text-neutral-500">
        Stock is not changed by this button. Release or restock it yourself if the order has not reached production.
      </p>
      <button type="submit" disabled={pending} className={smallOutlineButtonClass}>
        {pending ? "Requesting…" : "Refund via Yoco"}
      </button>
      <FormMessage error={state?.error} success={state?.success} />
    </form>
  );
}
