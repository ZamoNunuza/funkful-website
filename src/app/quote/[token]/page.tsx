import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/brands";
import QuoteCheckoutForm from "./quote-checkout-form";
import QuoteResumeButton from "./quote-resume-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Funkful quotation", robots: { index: false, follow: false } };
type Line = { description: string; quantity: number; unitPriceCents: number; details?: string };
const money = (cents: number) => `R${(cents / 100).toFixed(2)}`;
const quoteHasExpired = (expiresAt: string) => new Date(expiresAt).getTime() < Date.now();


export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const admin = createAdminClient();
  const { data: quote, error } = await admin.from("custom_quotes").select("quote_number,customer_name,customer_email,customer_phone,line_items,subtotal_cents,shipping_cents,total_cents,status,expires_at").eq("public_token", token).maybeSingle();
  if (error || !quote) notFound();
  const expired = quoteHasExpired(quote.expires_at);
  const lines = (Array.isArray(quote.line_items) ? quote.line_items : []) as Line[];
  const paidOrOrdered = ["paid", "accepted"].includes(quote.status);
  return <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: palette.cream, color: palette.black }}><div className="mx-auto max-w-3xl">
    <div className="mb-8 text-center"><p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: "#8a4a45" }}>Funkful · Custom order</p><h1 className="mt-3 text-3xl font-black uppercase sm:text-4xl">Your quotation</h1><p className="mt-2 text-sm text-neutral-600">Quote {quote.quote_number}</p></div>
    <section className="rounded-3xl border border-black/10 bg-white p-5 sm:p-8"><div className="flex flex-wrap justify-between gap-3 border-b pb-5"><div><p className="text-xs uppercase tracking-wide text-neutral-500">Prepared for</p><p className="mt-1 text-lg font-black">{quote.customer_name}</p></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-neutral-500">Valid until</p><p className="mt-1 font-bold">{new Date(quote.expires_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p></div></div>
      <div className="mt-5 space-y-4">{lines.map((item,index)=><div key={`${item.description}-${index}`} className="flex justify-between gap-4 border-b border-black/5 pb-4"><div><p className="font-bold">{item.description}</p>{item.details && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{item.details}</p>}<p className="mt-1 text-xs text-neutral-500">Qty {item.quantity} × {money(item.unitPriceCents)}</p></div><p className="shrink-0 font-bold">{money(item.quantity*item.unitPriceCents)}</p></div>)}</div>
      <div className="ml-auto mt-5 max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(quote.subtotal_cents)}</span></div><div className="flex justify-between"><span>Delivery</span><span>{quote.shipping_cents ? money(quote.shipping_cents) : "Free"}</span></div><div className="flex justify-between border-t border-black pt-3 text-lg font-black"><span>Total</span><span>{money(quote.total_cents)}</span></div></div>
      {quote.status === "paid" ? <div className="mt-7 rounded-xl bg-green-50 p-4 text-sm">This quotation has been paid. Your order confirmation will be sent by email.</div> : expired ? <div className="mt-7 rounded-xl bg-amber-50 p-4 text-sm">This quotation has expired. Please contact Funkful on WhatsApp to request an updated quote.</div> : paidOrOrdered ? <QuoteResumeButton token={token} /> : quote.status === "cancelled" ? <div className="mt-7 rounded-xl bg-neutral-100 p-4 text-sm">This quotation is no longer available. Please contact Funkful.</div> : <QuoteCheckoutForm token={token} customerEmail={quote.customer_email ?? ""} customerPhone={quote.customer_phone ?? ""} />}
      <p className="mt-7 text-center text-xs leading-5 text-neutral-500">Full payment is required before production begins. Production starts after payment and any required artwork approval. Questions? Contact Funkful on WhatsApp.</p>
    </section><p className="mt-6 text-center text-xs text-neutral-500">Funkful · <a className="underline" href="https://funkful.co.za">funkful.co.za</a></p>
  </div></main>;
}
