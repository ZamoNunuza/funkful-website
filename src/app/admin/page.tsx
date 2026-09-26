import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/brands";

export const metadata = { title: "Admin | Funkful", robots: { index: false, follow: false } };

export default async function AdminDashboardPage() {
  const user = await requireAdmin("/admin");
  const admin = createAdminClient();

  const [ordersResult, unreadResult, threadsResult] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }),
    admin.from("inbound_emails").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("email_threads").select("id", { count: "exact", head: true }).neq("status", "closed"),
  ]);

  const orderCount = ordersResult.count ?? 0;
  const unreadCount = unreadResult.count ?? 0;
  const openThreads = threadsResult.count ?? 0;

  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a4a45]">Funkful admin</span>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-neutral-600">Orders and customer communications in one place.</p>
          </div>
          <p className="text-sm font-bold">{user.email}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link href="/admin/orders" className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-7 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">Store</p>
                <h2 className="mt-2 text-2xl font-black uppercase">Orders</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">View orders, payment status, fulfilment, tracking and order history.</p>
              </div>
              <span className="rounded-2xl bg-[#E8DDD0] px-4 py-3 text-2xl font-black">{orderCount}</span>
            </div>
            <span className="mt-8 inline-block text-sm font-black">Open orders →</span>
          </Link>

          <Link href="/admin/inbox" className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-7 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">Communication</p>
                <h2 className="mt-2 text-2xl font-black uppercase">Inbox</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">Manage Hello, Orders, Support and Sales email conversations.</p>
              </div>
              <span className="rounded-2xl bg-[#EBC6C2] px-4 py-3 text-2xl font-black">{unreadCount}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm font-black">
              <span>Open threads {openThreads}</span>
              <span>Inbox →</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
