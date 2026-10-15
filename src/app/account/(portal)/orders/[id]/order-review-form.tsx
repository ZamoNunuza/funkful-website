"use client";

import { useState } from "react";

type OrderReviewFormProps = { orderId: string; orderNumber: string };

export default function OrderReviewForm({ orderId, orderNumber }: OrderReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "We couldn't submit your review. Please try again.");
      setStatus("success");
      setMessage("Thank you! Your feedback has been received.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't submit your review. Please try again.");
    }
  }

  if (status === "success") {
    return <p role="status" className="text-sm font-semibold text-green-800">{message}</p>;
  }

  return (
    <form onSubmit={submitReview} className="space-y-4">
      <p className="text-sm text-neutral-600">How was your overall Funkful experience with order <strong className="text-black">{orderNumber}</strong>?</p>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Your rating</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Rating out of five">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} out of 5 stars`}
              onClick={() => setRating(value)}
              className={`rounded-lg px-2 py-1 text-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${value <= rating ? "text-amber-500" : "text-neutral-300"}`}
            >★</button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`review-${orderId}`} className="mb-2 block text-sm font-bold">Tell us about your experience (optional)</label>
        <textarea
          id={`review-${orderId}`}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What did you enjoy? Is there anything we could improve?"
          className="w-full rounded-xl border border-black/15 bg-white p-3 text-sm outline-none focus:border-black"
        />
        <p className="mt-1 text-right text-xs text-neutral-500">{feedback.length}/2000</p>
      </div>
      {status === "error" && <p role="alert" className="text-sm text-red-700">{message}</p>}
      <button type="submit" disabled={status === "saving"} className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {status === "saving" ? "Submitting…" : "Submit feedback"}
      </button>
      <p className="text-xs leading-relaxed text-neutral-500">This is private feedback for Funkful and will not be published as a public product review.</p>
    </form>
  );
}
