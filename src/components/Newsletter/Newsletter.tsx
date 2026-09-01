"use client";

import { useState, FormEvent } from "react";
import {palette} from "@/lib/brands";

type BrandInterest = "funkful" | "scoopful" | "anime_box";

const BRAND_OPTIONS: { value: BrandInterest; label: string }[] = [
  { value: "funkful", label: "Funkful — personalized gifts" },
  { value: "scoopful", label: "Scoopful — mystery scoops" },
  { value: "anime_box", label: "Anime Mystery Box" },
];

interface SubscribeResult {
  message: string;
  discount_code: string | null;
  discount_expires_at: string | null;
  discount_used?: boolean;
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [brandInterest, setBrandInterest] = useState<BrandInterest>("funkful");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter_section", brand_interest: brandInterest }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong.");
        return;
      }
      
      setResult(data);
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Network error — please try again.");
    }
  };

  const closeModal = () => {
    setStatus("idle");
    setResult(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!result?.discount_code) return;
    try {
        await navigator.clipboard.writeText(result.discount_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch {

    }
  };

  return (
    <section style={{ background: palette.black, color: palette.cream }} className="py-20 text-center relative">
      <div className="max-w-[1180px] mx-auto px-8">
        <h2 className="text-3xl md:text-4xl font-black uppercase mb-3.5">Get 10% off your first order</h2>
        <p className="text-neutral-300 mb-8">
          One list, every brand — personalized gifts, mystery scoops, and first dibs on Anime Box.
        </p>

        <form onSubmit={handleSubmit} className="flex justify-center gap-2.5 flex-wrap">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
            style={{ borderColor: palette.cream, color: palette.cream }}
            className="border-2 bg-transparent rounded-8 px-5.5 py-3.5 text-sm min-w-[260px] disabled:opacity-50"
          />

          <select value={brandInterest} onChange={(e) => setBrandInterest(e.target.value as BrandInterest)}
            aria-label="Which brand are you most interested in?" 
            className="rounded-8 border-2 px-5 py-3.5 text-sm disabled:opacity-50" 
            style={{ borderColor: palette.cream, color: palette.cream, background: palette.black }} disabled={status === "loading"}
        >
            {BRAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} style={{color: "#000"}}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={status === "loading"}
            style={{ background: palette.gold, color: "#3e2f0d" }}
            className="font-extrabold text-xs uppercase tracking-wide rounded-full px-7 py-4 disabled:opacity-60"
          >
            {status === "loading" ? "Joining..." : "Join the family"}
          </button>
        </form>

        {status === "error" && errorMessage && (
          <p className="mt-4 text-sm" style={{ color: status === "error" ? "#ff8080" : palette.gold }}>
            {errorMessage}
          </p>
        )}
      </div>

      {status === "success" && result && (
        <div role="dialog" aria-modal="true" aria-labelledby="newsletter-modal-title" className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)" }} onClick={closeModal} >
          <div onClick={(e) => e.stopPropagation()} style={{ background: palette.black, border: `1px solid ${palette.gold}` }}
            className="w-full max-w-[420px] rounded-2xl p-9 text-center relative">
            <button onClick={closeModal} aria-label="Close"
              style={{ color: palette.cream }} className="absolute top-4 right-4 text-lg opacity-70 hover:opacity-100">
              ✕
            </button>

            <p style={{ color: palette.gold }} className="text-xs font-extrabold uppercase tracking-widest mb-2">
              {result.discount_used ? "Welcome back" : "You're in"}
            </p>
            <h3 id="newsletter-modal-title" style={{ color: palette.cream }}className="text-xl font-black uppercase mb-4">
              {result.message}
            </h3>

            {result.discount_code && (
              <>
                <div style={{ borderColor: palette.gold, color: palette.gold }}
                  className="border-2 border-dashed rounded-xl py-4 px-6 mb-3 text-xl font-extrabold tracking-widest">
                  {result.discount_code}
                </div>

                {result.discount_expires_at && (
                  <p className="text-xs text-neutral-400 mb-5">
                    Valid until{" "}
                    {new Date(result.discount_expires_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}

                <div className="flex gap-2.5 justify-center flex-wrap">
                  <button onClick={handleCopy} style={{ borderColor: palette.cream, color: palette.cream }}
                    className="border-2 bg-transparent rounded-full px-6 py-3 text-xs font-extrabold uppercase tracking-wide">
                    {copied ? "Copied!" : "Copy code"}
                  </button>
                  <a href="/shop" style={{ background: palette.gold, color: "#3e2f0d" }}
                    className="rounded-full px-6 py-3 text-xs font-extrabold uppercase tracking-wide">
                    Shop now
                  </a>
                </div>
              </>
            )}

            <p className="text-xs text-neutral-500 mt-5">We also sent this code to your inbox.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default Newsletter;