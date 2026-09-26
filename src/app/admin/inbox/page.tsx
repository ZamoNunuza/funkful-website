import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InboxRefresh from "./InboxRefresh";

const MAILBOXES = [
  { key: "all", label: "All mail", address: "" },
  { key: "hello", label: "Hello", address: "hello@funkful.co.za" },
  { key: "order", label: "Orders", address: "orders@funkful.co.za" },
  { key: "support", label: "Support", address: "support@funkful.co.za" },
  { key: "sales", label: "Sales", address: "sales@funkful.co.za" },
];

function extractEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.match(/<([^>]+)>/);
  return match?.[1]?.trim() || value.trim();
}

function extractName(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.match(/^(.+?)\s*<[^>]+>$/);
  return match?.[1]?.replace(/^["']|["']$/g, "").trim() || "";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type EmailRow = Record<string, unknown>;

function getString(row: EmailRow, key: string) {
  return typeof row[key] === "string" ? row[key] : "";
}

function getPreview(row: EmailRow) {
  return (
    getString(row, "text_body") ||
    getString(row, "text") ||
    getString(row, "body_text") ||
    getString(row, "body") ||
    getString(row, "html_body").replace(/<[^>]+>/g, " ") ||
    getString(row, "html") ||
    ""
  ).replace(/\s+/g, " ").trim().slice(0, 120);
}

function getSender(row: EmailRow) {
  return extractEmail(
    getString(row, "from") ||
      getString(row, "from_email") ||
      getString(row, "sender_email") ||
      getString(row, "sender")
  );
}

function getSenderName(row: EmailRow) {
  return getString(row, "from_name") || getString(row, "sender_name") || extractName(row.from) || getSender(row);
}

function getSubject(row: EmailRow) {
  return getString(row, "subject") || "(No subject)";
}

function getDate(row: EmailRow) {
  return getString(row, "received_at") || getString(row, "created_at") || getString(row, "createdAt") || getString(row, "timestamp") || null;
}

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ mailbox?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account/login?redirect=/admin/inbox");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/");

  const admin = createAdminClient();

  let query = admin
    .from("inbound_emails")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.mailbox && params.mailbox !== "all") {
    query = query.eq("email_type", params.mailbox);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load inbox: ${error.message}`);

  let emails = (data || []) as EmailRow[];

  if (params.q?.trim()) {
    const search = params.q.trim().toLowerCase();
    emails = emails.filter((email) =>
      [getSender(email), getSenderName(email), getSubject(email), getPreview(email)]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  const unreadCounts = {
    all: emails.filter((e) => e.status === "new").length,
    hello: emails.filter((e) => e.email_type === "hello" && e.status === "new").length,
    order: emails.filter((e) => e.email_type === "order" && e.status === "new").length,
    support: emails.filter((e) => e.email_type === "support" && e.status === "new").length,
    sales: emails.filter((e) => e.email_type === "sales" && e.status === "new").length,
  };

  return (
    <main className="min-h-screen bg-[#F7F4EF] text-[#111111]">
      <InboxRefresh />
      <header className="border-b border-black/10 bg-[#FAF8F4]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/admin/">
              <img src="/assets/funkful-logo.png" alt="Funkful" className="h-7 w-auto" />
            </Link>
            <div className="h-7 w-px bg-black/10" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">Funkful Admin</p>
              <h1 className="text-xl font-black uppercase tracking-tight">Inbox</h1>
            </div>
          </div>
          <p className="text-sm font-bold">{user.email}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-4">
          <Link href="/admin/inbox/compose" className="mb-5 flex w-full items-center justify-center rounded-2xl bg-[#111111] px-4 py-3 text-sm font-bold text-white">
            ✚ Compose
          </Link>

          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">Mailboxes</p>

          <nav className="space-y-1">
            {MAILBOXES.map((mailbox) => {
              const active = (params.mailbox || "all") === mailbox.key;
              return (
                <Link
                  key={mailbox.key}
                  href={mailbox.key === "all" ? "/admin/inbox" : `/admin/inbox?mailbox=${mailbox.key}`}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${active ? "bg-[#EBC6C2] font-bold" : "font-medium text-black/65 hover:bg-black/5"}`}
                >
                  <span>{mailbox.label}</span>
                  <span className={`min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold ${active ? "bg-[#111111] text-white" : "bg-black/5 text-black/50"}`}>
                    {unreadCounts[mailbox.key as keyof typeof unreadCounts]}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl bg-[#E8DDD0] p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">Funkful addresses</p>
            <div className="space-y-2 text-xs text-black/65">
              <p>hello@funkful.co.za</p>
              <p>orders@funkful.co.za</p>
              <p>support@funkful.co.za</p>
              <p>sales@funkful.co.za</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-black/10 bg-[#FAF8F4]">
          <div className="border-b border-black/10 p-4">
            <form className="flex flex-col gap-3 md:flex-row">
              <input name="q" defaultValue={params.q || ""} placeholder="Search sender, subject or message..." className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none" />
              {params.mailbox && <input type="hidden" name="mailbox" value={params.mailbox} />}
              <button className="rounded-2xl bg-[#111111] px-6 py-3 text-sm font-bold text-white">Search</button>
            </form>
          </div>

          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-black uppercase">
                {params.mailbox && params.mailbox !== "all"
                  ? MAILBOXES.find((m) => m.key === params.mailbox)?.label
                  : "All mail"}
              </h2>
              <p className="mt-0.5 text-xs text-black/45">{emails.length} message{emails.length === 1 ? "" : "s"}</p>
            </div>
            <span className="rounded-full bg-[#A8B5A0]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#34402F]">● Receiving active</span>
          </div>

          {emails.length === 0 ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBC6C2]/50 text-2xl">✉</div>
              <h3 className="text-lg font-black uppercase">No messages</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-black/50">New messages sent to your Funkful addresses will appear here automatically.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {emails.map((email) => {
                const isUnread = email.status === "new";
                const sender = getSender(email);
                const senderName = getSenderName(email);
                return (
                  <Link
                    key={String(email.id)}
                    href={`/admin/inbox/${email.id}`}
                    className={`group block border-l-4 px-5 py-4 transition ${isUnread ? "border-[#EBC6C2] bg-[#FFFDFC]" : "border-transparent hover:bg-[#E8DDD0]/35"}`}
                  >
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBC6C2] text-sm font-black uppercase">
                        {(senderName || sender || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#D8741F]" />}
                            <span className={`truncate text-sm ${isUnread ? "font-black" : "font-semibold"}`}>{senderName || sender}</span>
                          </div>
                          <time className="shrink-0 text-[11px] font-medium text-black/40">{formatDate(getDate(email))}</time>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{getSubject(email)}</h3>
                          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black/45">{getString(email, "email_type") || "unknown"}</span>
                          {Boolean(email.has_attachments) && <span className="shrink-0 text-xs text-black/40">📎</span>}
                        </div>
                        <p className="mt-1 truncate text-xs text-black/45">{getPreview(email) || "No message preview available."}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
