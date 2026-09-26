import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM: Record<string, string> = {
  hello: "Funkful <hello@funkful.co.za>",
  order: "Funkful Orders <orders@funkful.co.za>",
  support: "Funkful Support <support@funkful.co.za>",
  sales: "Funkful Sales <sales@funkful.co.za>",
};

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const fromKey = String(formData.get("from") || "hello");
  const to = String(formData.get("to") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!to || !subject || !message || !FROM[fromKey]) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const sent = await resend.emails.send({
    from: FROM[fromKey],
    to: [to],
    subject,
    text: message,
  });

  if (sent.error) {
    return NextResponse.json({ error: sent.error.message }, { status: 502 });
  }

  const admin = createAdminClient();
  const threadKey = `outbound:${sent.data?.id || crypto.randomUUID()}`;

  const { data: thread, error: threadError } = await admin.from("email_threads").insert({
    thread_key: threadKey,
    email_type: fromKey,
    subject,
    customer_email: to,
    status: "pending",
    last_message_at: new Date().toISOString(),
  }).select("id").single();

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  const { error: historyError } = await admin.from("email_thread_messages").insert({
    thread_id: thread.id,
    direction: "outbound",
    message_id: sent.data?.id || null,
    from_email: FROM[fromKey],
    from_name: "Funkful",
    to_emails: [to],
    subject,
    text_body: message,
    html_body: null,
    sent_at: new Date().toISOString(),
  });

  if (historyError) return NextResponse.json({ error: `Email sent but history could not be saved: ${historyError.message}` }, { status: 500 });

  return NextResponse.redirect(new URL(`/admin/inbox?thread=${thread.id}&sent=1`, request.url), { status: 303 });
}
