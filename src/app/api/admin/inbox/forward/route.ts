import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forwardInboundEmailToGmail } from "@/lib/inbox-forwarding";

type EmailRow = {
  id: string;
  resend_email_id: string | null;
  email_type: string | null;
  from_email: string | null;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  message_id: string | null;
  received_at: string | null;
};

async function requireInboxUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile && ["admin", "staff"].includes(profile.role) ? user : null;
}

export async function POST(request: Request) {
  const user = await requireInboxUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const emailId = String(formData.get("emailId") || "");
  if (!emailId) return NextResponse.json({ error: "Email ID is required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: email, error } = await admin
    .from("inbound_emails")
    .select("id, resend_email_id, email_type, from_email, from_name, to_email, subject, text_body, html_body, message_id, received_at")
    .eq("id", emailId)
    .maybeSingle();

  if (error || !email) return NextResponse.json({ error: "Email not found." }, { status: 404 });

  const result = await forwardInboundEmailToGmail(email as EmailRow);

  await admin
    .from("inbound_emails")
    .update({
      forwarded_to: result.destination,
      forwarded_at: result.forwarded ? new Date().toISOString() : null,
      forwarding_error: result.error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emailId);

  if (!result.forwarded) {
    return NextResponse.json(
      { error: result.error || "Gmail forwarding is not configured." },
      { status: result.skipped ? 400 : 502 }
    );
  }

  return NextResponse.redirect(new URL(`/admin/inbox/${emailId}?forwarded=1`, request.url), { status: 303 });
}
