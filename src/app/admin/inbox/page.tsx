import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAILBOXES = [
  { key: "all", label: "All mail", address: "" },
  { key: "hello", label: "Hello", address: "hello@funkful.co.za" },
  { key: "order", label: "Orders", address: "orders@funkful.co.za" },
  { key: "support", label: "Support", address: "support@funkful.co.za" },
  { key: "sales", label: "Sales", address: "sales@funkful.co.za" },
] as const;

type MailboxKey = (typeof MAILBOXES)[number]["key"];

type SearchParams = {
  mailbox?: string;
  q?: string;
};

type EmailRow = {
  id: string;
  from?: unknown;
  from_email?: unknown;
  sender_email?: unknown;
  sender?: unknown;
  from_name?: unknown;
  sender_name?: unknown;
  email_type?: unknown;
  text_body?: unknown;
  text?: unknown;
  body_text?: unknown;
  body?: unknown;
  html_body?: unknown;
  html?: unknown;
  received_at?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
  timestamp?: unknown;
  subject?: unknown;
  has_attachments?: unknown;
};

function extractEmail(value: unknown): string {
  if (typeof value !== "string") return "";

  const match = value.match(/<([^>]+)>/);
  return match?.[1]?.trim() || value.trim();
}

function extractName(value: unknown): string {
  if (typeof value !== "string") return "";

  const match = value.match(/^(.+?)\s*<[^>]+>$/);

  return (
    match?.[1]
      ?.replace(/^["']|["']$/g, "")
      .trim() || ""
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getPreview(row: EmailRow): string {
  const raw =
    getString(row.text_body) ||
    getString(row.text) ||
    getString(row.body_text) ||
    getString(row.body) ||
    getString(row.html_body) ||
    getString(row.html) ||
    "";

  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function getSender(row: EmailRow): string {
  const raw =
    row.from ??
    row.from_email ??
    row.sender_email ??
    row.sender ??
    "";

  return extractEmail(raw);
}

function getSenderName(row: EmailRow): string {
  return (
    getString(row.from_name) ||
    getString(row.sender_name) ||
    extractName(row.from) ||
    getSender(row)
  );
}

function getSubject(row: EmailRow): string {
  return getString(row.subject) || "(No subject)";
}

function getDate(row: EmailRow): string | null {
  return (
    getString(row.received_at) ||
    getString(row.created_at) ||
    getString(row.createdAt) ||
    getString(row.timestamp) ||
    null
  );
}

function getType(row: EmailRow): MailboxKey {
  const value = getString(row.email_type);

  if (
    value === "hello" ||
    value === "order" ||
    value === "support" ||
    value === "sales"
  ) {
    return value;
  }

  return "all";
}

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  /*
   * Protect the page with the user's normal Supabase session.
   * The service-role client is only used after authorization.
   */
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/admin/inbox");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "staff"].includes(profile.role)) {
    redirect("/");
  }

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

  if (error) {
    throw new Error(`Failed to load inbox: ${error.message}`);
  }

  const emails = (data ?? []) as EmailRow[];

  let filteredEmails = emails;

  if (params.q?.trim()) {
    const search = params.q.trim().toLowerCase();

    filteredEmails = emails.filter((email) => {
      const haystack = [
        getSender(email),
        getSenderName(email),
        getSubject(email),
        getPreview(email),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  const counts = {
    all: filteredEmails.length,
    hello: filteredEmails.filter(
      (e) => getType(e) === "hello"
    ).length,
    order: filteredEmails.filter(
      (e) => getType(e) === "order"
    ).length,
    support: filteredEmails.filter(
      (e) => getType(e) === "support"
    ).length,
    sales: filteredEmails.filter(
      (e) => getType(e) === "sales"
    ).length,
  };

  return (
    <main className="min-h-screen bg-[#F7F4EF] text-[#111111]">
      {/* Top bar */}
      <header className="border-b border-black/10 bg-[#FAF8F4]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="shrink-0">
              <img
                src="/assets/funkful-logo.png"
                alt="Funkful"
                className="h-7 w-auto"
              />
            </Link>

            <div className="h-7 w-px bg-black/10" />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
                Funkful Admin
              </p>

              <h1 className="text-xl font-black uppercase tracking-tight">
                Inbox
              </h1>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-black/45">
              Signed in as
            </p>

            <p className="text-sm font-bold">
              {user.email}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[230px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-3xl border border-black/10 bg-[#FAF8F4] p-4">
          <div className="mb-5">
            <Link
              href="/admin/inbox"
              className="flex w-full items-center justify-center rounded-2xl bg-[#111111] px-4 py-3 text-sm font-bold text-[#FAF8F4] transition hover:opacity-90"
            >
              ✉️ Inbox
            </Link>
          </div>

          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
            Mailboxes
          </p>

          <nav className="space-y-1">
            {MAILBOXES.map((mailbox) => {
              const active =
                (params.mailbox || "all") === mailbox.key;

              return (
                <Link
                  key={mailbox.key}
                  href={
                    mailbox.key === "all"
                      ? "/admin/inbox"
                      : `/admin/inbox?mailbox=${mailbox.key}`
                  }
                  className={[
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-[#EBC6C2] font-bold"
                      : "font-medium text-black/65 hover:bg-black/5",
                  ].join(" ")}
                >
                  <span>{mailbox.label}</span>

                  <span
                    className={[
                      "min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold",
                      active
                        ? "bg-[#111111] text-white"
                        : "bg-black/5 text-black/50",
                    ].join(" ")}
                  >
                    {counts[mailbox.key]}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl bg-[#E8DDD0] p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em]">
              Funkful addresses
            </p>

            <div className="space-y-2 text-xs text-black/65">
              <p>hello@funkful.co.za</p>
              <p>orders@funkful.co.za</p>
              <p>support@funkful.co.za</p>
              <p>sales@funkful.co.za</p>
            </div>
          </div>
        </aside>

        {/* Inbox */}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-black/10 bg-[#FAF8F4]">
          {/* Toolbar */}
          <div className="border-b border-black/10 p-4">
            <form className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                  ⌕
                </span>

                <input
                  name="q"
                  defaultValue={params.q || ""}
                  placeholder="Search sender, subject or message..."
                  className="w-full rounded-2xl border border-black/10 bg-white px-11 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
                />

                {params.mailbox && (
                  <input
                    type="hidden"
                    name="mailbox"
                    value={params.mailbox}
                  />
                )}
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-[#111111] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Search
              </button>
            </form>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-black uppercase">
                {params.mailbox &&
                params.mailbox !== "all"
                  ? MAILBOXES.find(
                      (m) => m.key === params.mailbox
                    )?.label
                  : "All mail"}
              </h2>

              <p className="mt-0.5 text-xs text-black/45">
                {filteredEmails.length} message
                {filteredEmails.length === 1 ? "" : "s"}
              </p>
            </div>

            <span className="rounded-full bg-[#A8B5A0]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#34402F]">
              ● Receiving active
            </span>
          </div>

          {/* Messages */}
          {filteredEmails.length === 0 ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBC6C2]/50 text-2xl">
                ✉
              </div>

              <h3 className="text-lg font-black uppercase">
                No messages
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-relaxed text-black/50">
                New messages sent to your Funkful addresses
                will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filteredEmails.map((email) => {
                const id = email.id;
                const sender = getSender(email);
                const senderName = getSenderName(email);
                const subject = getSubject(email);
                const preview = getPreview(email);
                const type = getType(email);
                const date = getDate(email);

                return (
                  <Link
                    key={id}
                    href={`/admin/inbox/${id}`}
                    className="group block px-5 py-4 transition hover:bg-[#E8DDD0]/35"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBC6C2] text-sm font-black uppercase">
                        {(senderName ||
                          sender ||
                          "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-bold">
                              {senderName || sender}
                            </span>

                            {senderName && sender && (
                              <span className="hidden truncate text-xs text-black/35 md:inline">
                                &lt;{sender}&gt;
                              </span>
                            )}
                          </div>

                          <time className="shrink-0 text-[11px] font-medium text-black/40">
                            {formatDate(date)}
                          </time>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {subject}
                          </h3>

                          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black/45">
                            {type}
                          </span>

                          {email.has_attachments === true && (
                            <span className="shrink-0 text-xs text-black/40">
                              📎
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs text-black/45">
                          {preview ||
                            "No message preview available."}
                        </p>
                      </div>

                      <div className="hidden items-center text-black/20 transition group-hover:text-black/60 md:flex">
                        →
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