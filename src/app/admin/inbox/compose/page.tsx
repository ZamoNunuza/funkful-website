import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ComposePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/account/login?redirect=/admin/inbox/compose");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  return (
    <main className="min-h-screen bg-[#F7F4EF]">
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">Funkful Admin</p>
            <h1 className="text-3xl font-black uppercase">Compose email</h1>
          </div>
          <Link href="/admin/inbox" className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold">Cancel</Link>
        </div>

        <form action="/api/admin/inbox/compose" method="POST" className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-6">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide">From</label>
              <select name="from" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm">
                <option value="hello">hello@funkful.co.za</option>
                <option value="order">orders@funkful.co.za</option>
                <option value="support">support@funkful.co.za</option>
                <option value="sales">sales@funkful.co.za</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide">To</label>
              <input name="to" type="email" required className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm" placeholder="customer@example.com" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide">Subject</label>
              <input name="subject" required className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm" placeholder="Subject" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide">Message</label>
              <textarea name="message" required rows={12} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm leading-7" placeholder="Write your email..." />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="rounded-2xl bg-[#111111] px-7 py-3 text-sm font-bold text-white">Send email →</button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
