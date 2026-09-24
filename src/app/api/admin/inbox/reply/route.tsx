import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailType = "hello" | "order" | "support" | "sales" | "unknown";

type EmailRow = {
  from?: unknown;
  from_email?: unknown;
  sender_email?: unknown;
  email_type?: unknown;
  message_id?: unknown;
  resend_message_id?: unknown;
  references_header?: unknown;
  references?: unknown;
  subject?: unknown;
};

const MAILBOX_FROM: Record<EmailType, string> = {
  hello: "Funkful <hello@funkful.co.za>",
  order: "Funkful Orders <orders@funkful.co.za>",
  support: "Funkful Support <support@funkful.co.za>",
  sales: "Funkful Sales <sales@funkful.co.za>",
  unknown: "Funkful <hello@funkful.co.za>",
};

function extractEmail(value: unknown): string {
  if (typeof value !== "string") return "";

  const match = value.match(/<([^>]+)>/);
  return match?.[1]?.trim() || value.trim();
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getEmailType(value: unknown): EmailType {
  if (
    value === "hello" ||
    value === "order" ||
    value === "support" ||
    value === "sales"
  ) {
    return value;
  }

  return "unknown";
}

export async function POST(request: Request) {
  try {
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

    const formData = await request.formData();

    const emailId = String(formData.get("emailId") || "");
    const message = String(formData.get("message") || "").trim();

    if (!emailId || !message) {
      return NextResponse.json(
        { error: "Email and message are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: email, error } = await admin
      .from("inbound_emails")
      .select("*")
      .eq("id", emailId)
      .maybeSingle();

    if (error || !email) {
      console.error("Failed finding original email:", error);

      return NextResponse.json(
        { error: "Original email not found." },
        { status: 404 }
      );
    }

    const row = email as EmailRow;

    const recipient = extractEmail(
      row.from ??
        row.from_email ??
        row.sender_email ??
        ""
    );

    if (!recipient) {
      return NextResponse.json(
        { error: "Original sender address is missing." },
        { status: 400 }
      );
    }

    const emailType = getEmailType(row.email_type);

    const from = MAILBOX_FROM[emailType];

    const originalMessageId = toStringValue(
      row.message_id ?? row.resend_message_id
    );

    const references = toStringValue(
      row.references_header ??
        row.references ??
        originalMessageId
    );

    const headers: Record<string, string> = {};

    if (originalMessageId) {
      headers["In-Reply-To"] = originalMessageId;
    }

    if (references) {
      headers["References"] = references;
    }

    const subject = toStringValue(row.subject) || "(No subject)";

    const replySubject = subject
      .toLowerCase()
      .startsWith("re:")
      ? subject
      : `Re: ${subject}`;

    const { data: sent, error: sendError } =
      await resend.emails.send({
        from,
        to: [recipient],
        subject: replySubject,
        text: message,
        replyTo: from,
        headers,
      });

    if (sendError) {
      console.error("Resend reply failed:", sendError);

      return NextResponse.json(
        {
          error:
            sendError.message || "Failed to send reply.",
        },
        { status: 502 }
      );
    }

    console.log("Inbox reply sent:", {
      emailId,
      recipient,
      emailType,
      resendEmailId: sent?.id ?? null,
    });

    return NextResponse.redirect(
      new URL(
        `/admin/inbox/${emailId}?sent=1`,
        request.url
      ),
      { status: 303 }
    );
  } catch (error) {
    console.error("Inbox reply error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}