"use client";
import { useEffect, useRef, useState } from "react";

// Shown when a quotation was accepted but payment was not completed (closed tab,
// back button, timeout). The server returns the SAME Yoco checkout for the
// existing order, so resuming can never create a second charge.
export default function QuoteResumeButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) { submitting.current = false; setBusy(false); }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function resume() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/quotes/${token}/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(35000), body: "{}" });
      const data = await response.json();
      if (!response.ok) {
        // The server asks for a refresh when it released a stale session; reloading
        // then shows the acceptance form again. Any other 409 (for example "already
        // paid") is shown as-is.
        if (response.status === 409 && /refresh/i.test(String(data.error))) { window.location.reload(); return; }
        throw new Error(data.error || "Could not resume payment.");
      }
      window.location.assign(data.redirectUrl);
    } catch (err) {
      const timedOut = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      setError(timedOut ? "That took longer than expected. You have not been charged. Please try again." : err instanceof Error ? err.message : "Could not resume payment.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 rounded-xl bg-amber-50 p-4 text-sm">
      <p>Your quotation has been accepted but payment hasn&apos;t been completed yet. If you already paid, please don&apos;t pay again. Your confirmation will arrive by email.</p>
      <button type="button" onClick={resume} disabled={busy} className="mt-4 w-full rounded-full bg-black px-6 py-3 text-sm font-black uppercase text-white disabled:opacity-50">{busy ? "Opening secure payment…" : "Continue to payment"}</button>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
    </div>
  );
}
