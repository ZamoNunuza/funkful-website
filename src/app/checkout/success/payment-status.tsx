"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { palette } from "@/lib/brands";

type Phase = "paid" | "confirming" | "slow" | "unknown";

const POLL_EVERY_MS = 3000;
const MAX_POLLS = 40; // about two minutes

export default function PaymentStatus({
  orderId,
  initialOrderNumber,
  initiallyPaid,
}: {
  orderId: string;
  initialOrderNumber: string;
  initiallyPaid: boolean;
}) {
  const { clear } = useCart();
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phase, setPhase] = useState<Phase>(!orderId ? "unknown" : initiallyPaid ? "paid" : "confirming");
  const cleared = useRef(false);

  // The bag is only emptied once payment is CONFIRMED, never because this page
  // was opened. Emptying it also removes the easy way to pay for it twice.
  useEffect(() => {
    if (phase === "paid" && !cleared.current) {
      cleared.current = true;
      clear();
    }
  }, [phase, clear]);

  useEffect(() => {
    if (!orderId || phase !== "confirming") return;
    let cancelled = false;
    let polls = 0;

    const timer = setInterval(async () => {
      polls += 1;
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data.orderNumber) setOrderNumber(data.orderNumber);
          if (data.paymentStatus === "paid") {
            clearInterval(timer);
            setPhase("paid");
            return;
          }
        }
      } catch {
        // Network blip: keep polling. Payment confirmation does not depend on this page.
      }
      if (polls >= MAX_POLLS && !cancelled) {
        clearInterval(timer);
        setPhase("slow");
      }
    }, POLL_EVERY_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, phase]);

  const copy = {
    paid: {
      icon: "✓",
      eyebrow: "Thank you for shopping Funkful",
      title: "Payment confirmed",
      body: "Your payment has been confirmed and your order is being prepared. A confirmation email is on its way.",
    },
    confirming: {
      icon: "…",
      eyebrow: "One moment",
      title: "Confirming your payment",
      body: "We're waiting for Yoco to confirm your payment. This usually takes a few seconds. Please don't pay again or close this page.",
    },
    slow: {
      icon: "…",
      eyebrow: "Still confirming",
      title: "Payment not confirmed yet",
      body: "We haven't had confirmation from Yoco yet. If you completed payment, your order will be confirmed automatically and we'll email you. Please don't pay again. If you didn't finish paying, you can return to your bag.",
    },
    unknown: {
      icon: "?",
      eyebrow: "Order not found",
      title: "We couldn't find that order",
      body: "If you've just paid, you'll receive an email once your payment is confirmed. Please don't pay again.",
    },
  }[phase];

  return (
    <div className="max-w-xl text-center">
      <div className="text-5xl mb-5">{copy.icon}</div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: "#8a4a45" }}>{copy.eyebrow}</p>
      <h1 className="text-4xl font-black uppercase mb-4">{copy.title}</h1>
      <p className="text-sm text-neutral-600 leading-relaxed mb-3">{copy.body}</p>
      {orderNumber && <p className="font-bold text-sm mb-8">Order {orderNumber}</p>}
      <div className="flex justify-center gap-3 flex-wrap">
        {phase === "paid" ? (
          <>
            <Link href="/originals" style={{ background: palette.black, color: palette.cream }} className="px-6 py-3 rounded-full text-xs font-bold uppercase">Continue shopping</Link>
            <Link href="/account" className="px-6 py-3 rounded-full border text-xs font-bold uppercase">View account</Link>
          </>
        ) : (
          <Link href="/account/orders" className="px-6 py-3 rounded-full border text-xs font-bold uppercase">View my orders</Link>
        )}
        {(phase === "slow" || phase === "unknown") && (
          <Link href="/cart" style={{ background: palette.black, color: palette.cream }} className="px-6 py-3 rounded-full text-xs font-bold uppercase">Return to bag</Link>
        )}
      </div>
    </div>
  );
}
