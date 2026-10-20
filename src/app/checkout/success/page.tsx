import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/brands";
import PaymentStatus from "./payment-status";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

// Landing on this URL proves nothing: anyone can open it, and the browser may
// never reach it even after a successful payment. The page therefore reports
// what the database says (set only by the verified Yoco webhook) and never
// claims success on its own.
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const orderId = order && UUID.test(order) ? order : "";
  let orderNumber = "";
  let paid = false;

  if (orderId) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from("orders").select("order_number,payment_status").eq("id", orderId).maybeSingle();
      orderNumber = data?.order_number ?? "";
      paid = data?.payment_status === "paid";
    } catch {}
  }

  return <main style={{background:palette.cream,color:palette.black}} className="min-h-screen flex items-center justify-center px-8">
    <PaymentStatus orderId={orderId} initialOrderNumber={orderNumber} initiallyPaid={paid} />
  </main>;
}
