import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireInboxUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "staff"].includes(profile.role)) return null;
  return user;
}

function getIds(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
  } catch {
    return value ? [value] : [];
  }
}

export async function POST(request: Request) {
  const user = await requireInboxUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const action = String(formData.get("action") || "trash");
  const ids = getIds(formData.get("ids"));

  if (ids.length === 0) {
    return NextResponse.json({ error: "No email IDs supplied." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (action === "trash" || action === "restore") {
    const deletedAt = action === "trash" ? new Date().toISOString() : null;
    const { error } = await admin
      .from("inbound_emails")
      .update({ deleted_at: deletedAt, updated_at: new Date().toISOString() })
      .in("id", ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.redirect(new URL("/admin/inbox", request.url), { status: 303 });
  }

  if (action !== "permanent") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const { data: emails, error: lookupError } = await admin
    .from("inbound_emails")
    .select("id, thread_id")
    .in("id", ids);

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });

  const threadIds = Array.from(new Set((emails ?? [])
    .map((email) => email.thread_id)
    .filter((threadId): threadId is string => typeof threadId === "string" && threadId.length > 0)));

  const { error: attachmentError } = await admin
    .from("inbound_email_attachments")
    .delete()
    .in("inbound_email_id", ids);

  if (attachmentError) return NextResponse.json({ error: attachmentError.message }, { status: 500 });

  const { error: messageError } = await admin
    .from("email_thread_messages")
    .delete()
    .in("inbound_email_id", ids);

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 });

  const { error: emailError } = await admin
    .from("inbound_emails")
    .delete()
    .in("id", ids);

  if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 });

  for (const threadId of threadIds) {
    const { count, error: countError } = await admin
      .from("email_thread_messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", threadId);

    if (!countError && count === 0) {
      await admin.from("email_threads").delete().eq("id", threadId);
    }
  }

  return NextResponse.redirect(new URL("/admin/inbox?folder=trash", request.url), { status: 303 });
}
