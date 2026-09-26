import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type EmailRow = {
  id?: string;
  thread_id?: string;
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
  status?: unknown;
};

type Attachment = {
  id: string;
  filename: string | null;
  content_type: string | null;
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
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getSender(row: EmailRow): string {
  return extractEmail(
    row.from ??
      row.from_email ??
      row.sender_email ??
      row.sender ??
      ""
  );
}

function getSenderName(row: EmailRow): string {
  return (
    getString(row.from_name) ||
    getString(row.sender_name) ||
    extractName(row.from) ||
    getSender(row)
  );
}

function getText(row: EmailRow): string {
  return (
    getString(row.text_body) ||
    getString(row.text) ||
    getString(row.body_text) ||
    getString(row.body)
  );
}

function getHtml(row: EmailRow): string {
  return (
    getString(row.html_body) ||
    getString(row.html)
  );
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

export default async function AdminInboxMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/account/login?redirect=/admin/inbox/${id}`);
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

  const { data: email, error } = await admin
    .from("inbound_emails")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !email) {
    notFound();
  }

  const { data: attachments } = await admin
    .from("inbound_email_attachments")
    .select("*")
    .eq("inbound_email_id", id)
    .order("created_at", { ascending: true });

  const row = email as EmailRow;

  const sender = getSender(row);
  const senderName = getSenderName(row);
  const text = getText(row);
  const html = getHtml(row);
  const date = getDate(row);
  if (row.status === "new") {
  await admin
    .from("inbound_emails")
    .update({
      status: "read",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  }

  return (
    <main className="min-h-screen bg-[#F7F4EF] text-[#111111]">
      <header className="border-b border-black/10 bg-[#FAF8F4]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/admin/inbox">
              <img
                src="/assets/funkful-logo.png"
                alt="Funkful"
                className="h-7 w-auto"
              />
            </Link>

            <div className="h-7 w-px bg-black/10" />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
                Funkful Admin
              </p>

              <h1 className="text-xl font-black uppercase">
                Message
              </h1>
            </div>
          </div>

          <Link
            href="/admin/inbox"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold transition hover:bg-black/5"
          >
            ← Back to inbox
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <section className="overflow-hidden rounded-3xl border border-black/10 bg-[#FAF8F4]">
          <div className="border-b border-black/10 px-6 py-6 md:px-8">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#EBC6C2] px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                {getString(row.email_type) || "unknown"}
              </span>

              {row.has_attachments === true && (
                <span className="rounded-full bg-[#D8BE85]/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                  📎 Attachments
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              {getString(row.subject) || "(No subject)"}
            </h2>

            <div className="mt-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBC6C2] font-black uppercase">
                {(senderName || sender || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {senderName || sender}
                </p>

                <p className="break-all text-xs text-black/45">
                  {sender}
                </p>

                <p className="mt-1 text-xs text-black/40">
                  {formatDate(date)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white px-6 py-8 md:px-10">
            {html ? (
              <iframe
                title="Email content"
                srcDoc={html}
                sandbox=""
                className="min-h-[500px] w-full border-0"
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-black/80">
                {text || "This email has no readable body."}
              </pre>
            )}
          </div>

          {attachments && attachments.length > 0 && (
            <div className="border-t border-black/10 bg-[#FAF8F4] px-6 py-6 md:px-8">
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.14em]">
                Attachments
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                {attachments.map(
                  (attachment: Attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/admin/inbox/attachments/${attachment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 transition hover:border-black/25 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8DDD0]">
                        📎
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {attachment.filename || "Attachment"}
                        </p>

                        <p className="mt-0.5 text-xs text-black/40">
                          {attachment.content_type || "File"}
                        </p>
                      </div>

                      <span className="text-xs font-bold">
                        Open →
                      </span>
                    </a>
                  )
                )}
              </div>
            </div>
          )}

          <div className="border-t border-black/10 bg-[#F7F4EF] px-6 py-6 md:px-8">
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.14em]">
              Reply
            </h3>

            <form
              action="/api/admin/inbox/reply"
              method="POST"
              className="space-y-4"
            >
              <input
                type="hidden"
                name="emailId"
                value={row.id ?? id}
              />

              <textarea
                name="message"
                required
                rows={7}
                placeholder="Write your reply..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm leading-6 outline-none placeholder:text-black/30 focus:border-black/30"
              />

              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <p className="text-xs text-black/40">
                  Replying to {sender}
                </p>

                <button
                  type="submit"
                  className="rounded-2xl bg-[#111111] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Send reply
                </button>
              </div>
            </form>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action="/api/admin/inbox/status" method="POST">
              <input type="hidden" name="threadId" value={row.thread_id} />
              <input type="hidden" name="status" value="open" />

              <button
                type="submit"
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold"
              >
                Open
              </button>
            </form>

            <form action="/api/admin/inbox/status" method="POST">
              <input type="hidden" name="threadId" value={row.thread_id} />
              <input type="hidden" name="status" value="pending" />

              <button
                type="submit"
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold"
              >
                Pending
              </button>
            </form>

            <form action="/api/admin/inbox/status" method="POST">
              <input type="hidden" name="threadId" value={row.thread_id} />
              <input type="hidden" name="status" value="closed" />

              <button
                type="submit"
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold"
              >
                Close
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}