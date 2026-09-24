import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await params;

    // Authenticate the admin/staff user first.
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: attachment, error } = await admin
      .from("inbound_email_attachments")
      .select(
        `
        id,
        resend_attachment_id,
        filename,
        content_type,
        inbound_email_id,
        inbound_emails (
          resend_email_id
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const inboundEmail = Array.isArray(attachment.inbound_emails)
      ? attachment.inbound_emails[0]
      : attachment.inbound_emails;

    if (!inboundEmail?.resend_email_id) {
      return NextResponse.json(
        { error: "Inbound email reference missing" },
        { status: 500 }
      );
    }

    const { data, error: resendError } =
      await resend.emails.receiving.attachments.get({
        emailId: inboundEmail.resend_email_id,
        id: attachment.resend_attachment_id,
      });

    if (resendError || !data?.download_url) {
      console.error("Failed to retrieve Resend attachment:", resendError);

      return NextResponse.json(
        { error: "Failed to retrieve attachment" },
        { status: 502 }
      );
    }

    return NextResponse.redirect(data.download_url);
  } catch (error) {
    console.error("Attachment route error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}