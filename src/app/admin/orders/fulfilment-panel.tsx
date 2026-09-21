"use client";

import { useActionState, type FormEvent } from "react";
import {
  Field,
  FormMessage,
  inputClass,
  inputStyle,
  primaryButtonClass,
  primaryButtonStyle,
  smallOutlineButtonClass,
} from "@/components/account/ui";
import { fulfilmentAction, type FulfilmentState } from "./actions";

interface Props {
  orderId: string;
  orderNumber: string;
  /** From orderStage(): 1 = paid & preparing, 2 = shipped, 3 = delivered, otherwise not fulfillable. */
  stage: number | null;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

function confirmBefore(message: string) {
  return (event: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(message)) event.preventDefault();
  };
}

export default function FulfilmentPanel({ orderId, orderNumber, stage, courier, trackingNumber, trackingUrl }: Props) {
  const [state, formAction, pending] = useActionState<FulfilmentState, FormData>(fulfilmentAction, null);

  const trackingFields = (
    <div className="space-y-4">
      <Field label="Courier" hint="Pick one or type your own.">
        <input
          name="courier"
          list="courier-options"
          required
          maxLength={60}
          defaultValue={courier ?? ""}
          style={inputStyle}
          className={inputClass}
          autoComplete="off"
        />
        <datalist id="courier-options">
          <option value="The Courier Guy" />
          <option value="GoDash" />
        </datalist>
      </Field>
      <Field label="Tracking number (optional)">
        <input
          name="trackingNumber"
          maxLength={80}
          defaultValue={trackingNumber ?? ""}
          style={inputStyle}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
      <Field label="Tracking link (optional)" hint="Paste the full https:// link from the courier. Shown to the customer as “Track your parcel”.">
        <input
          name="trackingUrl"
          type="url"
          maxLength={500}
          defaultValue={trackingUrl ?? ""}
          style={inputStyle}
          className={inputClass}
          autoComplete="off"
        />
      </Field>
    </div>
  );

  return (
    <div className="space-y-5">
      <FormMessage success={state?.success} error={state?.error} />
      {state?.warning && <FormMessage error={state.warning} />}

      {stage === 1 && (
        <form
          action={formAction}
          onSubmit={confirmBefore(`Mark ${orderNumber} as shipped and email the customer?`)}
          className="space-y-5"
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="intent" value="ship" />
          {trackingFields}
          <button type="submit" disabled={pending} style={primaryButtonStyle} className={primaryButtonClass}>
            {pending ? "Saving…" : "Mark as shipped"}
          </button>
        </form>
      )}

      {stage === 2 && (
        <>
          <form
            action={formAction}
            onSubmit={confirmBefore(`Mark ${orderNumber} as delivered and email the customer?`)}
          >
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="intent" value="deliver" />
            <button type="submit" disabled={pending} style={primaryButtonStyle} className={primaryButtonClass}>
              {pending ? "Saving…" : "Mark as delivered"}
            </button>
          </form>

          <details className="border-t pt-4" style={{ borderColor: "rgba(17,17,17,0.08)" }}>
            <summary className="text-xs font-extrabold uppercase cursor-pointer">Edit tracking details</summary>
            <form action={formAction} className="space-y-5 mt-4">
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="intent" value="tracking" />
              {trackingFields}
              <p className="text-xs text-neutral-500">Saves the fix only — the customer is not emailed again.</p>
              <button type="submit" disabled={pending} className={smallOutlineButtonClass}>
                {pending ? "Saving…" : "Save tracking details"}
              </button>
            </form>
          </details>
        </>
      )}

      {(stage === 2 || stage === 3) && (
        <form
          action={formAction}
          onSubmit={confirmBefore(`Send the ${stage === 2 ? "shipping" : "delivery"} email for ${orderNumber} to the customer again?`)}
          className="border-t pt-4"
          style={{ borderColor: "rgba(17,17,17,0.08)" }}
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="intent" value="resend" />
          <button type="submit" disabled={pending} className={smallOutlineButtonClass}>
            {pending ? "Sending…" : "Resend email"}
          </button>
        </form>
      )}

      {stage === 3 && <p className="text-sm text-neutral-600">This order is complete — nothing more to do.</p>}

      {stage !== 1 && stage !== 2 && stage !== 3 && (
        <p className="text-sm text-neutral-600">
          This order can&apos;t be fulfilled — it&apos;s unpaid, cancelled, failed or refunded.
        </p>
      )}
    </div>
  );
}
