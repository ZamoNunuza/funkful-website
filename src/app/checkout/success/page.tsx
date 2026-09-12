import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/brands";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  let orderNumber = "";
  let status = "pending";
  if (order) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from("orders").select("order_number,status").eq("id", order).maybeSingle();
      orderNumber = data?.order_number ?? "";
      status = data?.status ?? "pending";
    } catch {}
  }
  return <main style={{background:palette.cream,color:palette.black}} className="min-h-screen flex items-center justify-center px-8">
    <div className="max-w-xl text-center">
      <div className="text-5xl mb-5">✓</div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{color:"#8a4a45"}}>Thank you for shopping Funkful</p>
      <h1 className="text-4xl font-black uppercase mb-4">Order received</h1>
      <p className="text-sm text-neutral-600 leading-relaxed mb-3">Your payment was sent to Yoco successfully. We are waiting for the payment confirmation webhook before we mark the order as paid and begin fulfilment.</p>
      {orderNumber && <p className="font-bold text-sm mb-8">Order {orderNumber} · {status}</p>}
      <div className="flex justify-center gap-3 flex-wrap">
        <Link href="/originals" style={{background:palette.black,color:palette.cream}} className="px-6 py-3 rounded-full text-xs font-bold uppercase">Continue shopping</Link>
        <Link href="/account" className="px-6 py-3 rounded-full border text-xs font-bold uppercase">View account</Link>
      </div>
    </div>
  </main>;
}
