import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import QuoteManager from "./quote-manager";
import { palette } from "@/lib/brands";

export const metadata = { title: "Quotations | Funkful admin", robots: { index: false, follow: false } };
export default async function AdminQuotesPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("custom_quotes").select("id,quote_number,customer_name,customer_email,customer_phone,total_cents,status,expires_at,created_at,public_token,order_id").order("created_at", { ascending: false }).limit(100);
  
  return <main className="min-h-screen px-5 py-10 sm:px-8" style={{ background: palette.cream, color: palette.black }}><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-bold">← Admin dashboard</Link>
    <div className="mt-5 mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Funkful admin · Sales</p>
        <h1 className="mt-2 text-3xl font-black uppercase">Custom quotations</h1>
        <p className="mt-2 text-sm text-neutral-600">Create a custom quote, then send its secure checkout link to the customer on WhatsApp.</p>
    </div>
    {error ? <div className="rounded-2xl border border-red-300 bg-white p-5 text-sm">Quotation table is not available yet. Apply <code>supabase/migrations/202610190001_custom_quotes.sql</code> in the Supabase SQL editor, then refresh.</div> : <><QuoteManager />
      <h2 className="mb-3 mt-10 text-xl font-black">Recent quotations</h2>
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
            <thead className="bg-black/5">
                <tr>{["Quote","Customer","Total","Status","Valid until","Link"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr>
            </thead>
            <tbody>{(data ?? []).map((q) => <tr key={q.id} className="border-t border-black/10">
                <td className="px-4 py-3 font-bold">{q.quote_number}</td>
                <td className="px-4 py-3">{q.customer_name}<div className="text-xs text-neutral-500">{q.customer_email || q.customer_phone || "No contact saved"}</div></td>
                <td className="px-4 py-3">R{(q.total_cents/100).toFixed(2)}</td><td className="px-4 py-3 capitalize">{q.status}</td>
                <td className="px-4 py-3">{new Date(q.expires_at).toLocaleDateString("en-ZA")}</td>
                <td className="px-4 py-3"><a className="font-bold underline" href={`/quote/${q.public_token}`} target="_blank" rel="noreferrer">Open link</a></td></tr>)}
            </tbody>
        </table>{!data?.length && <p className="p-5 text-sm text-neutral-500">No quotations yet. Create your first one above.</p>}</div>
        </>}
  </div></main>;
}
