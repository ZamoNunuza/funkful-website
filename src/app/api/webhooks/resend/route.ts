import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const FUNKFUL_ADDRESSES = {
  "hello@funkful.co.za": "hello",
  "orders@funkful.co.za": "order",
  "support@funkful.co.za": "support",
  "sales@funkful.co.za": "sales",
} as const;

type FunkfulEmailType =
  (typeof FUNKFUL_ADDRESSES)[keyof typeof FUNKFUL_ADDRESSES];

function getEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);

  return (match?.[1] ?? value).trim().toLowerCase();
}

function getEmailName(value: string): string | null {
  const match = value.match(/^(.+?)\s*<[^>]+>$/);

  if (!match) {
    return null;
  }

  return match[1].trim().replace(/^["']|["']$/g, "") || null;
}

function getEmailType(to: string[]): FunkfulEmailType | "unknown" {
  for (const recipient of to) {
    const address = getEmailAddress(recipient);

    if (address in FUNKFUL_ADDRESSES) {
      return FUNKFUL_ADDRESSES[
        address as keyof typeof FUNKFUL_ADDRESSES
      ];
    }
  }

  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RESEND_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { error: "Webhook secret is not configured." },
        { status: 500 }
      );
    }

    /*
     * Verify the Resend webhook signature.
     *
     * IMPORTANT:
     * We use req.text() above rather than req.json()
     * because signature verification requires the
     * original request body.
     */
    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });

    if (event.type !== "email.received") {
      return NextResponse.json({ received: true });
    }

    const emailId = event.data.email_id;

    if (!emailId) {
      console.error("Resend email.received event has no email_id.");

      return NextResponse.json(
        { error: "Missing email_id." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    /*
     * Prevent duplicate processing if Resend retries
     * the webhook.
     */
    const { data: existingEmail, error: existingError } =
      await supabase
        .from("inbound_emails")
        .select("id")
        .eq("resend_email_id", emailId)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Failed checking for existing inbound email:",
        existingError
      );

      return NextResponse.json(
        { error: "Database lookup failed." },
        { status: 500 }
      );
    }

    if (existingEmail) {
      console.log("Inbound email already processed:", emailId);

      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    /*
     * The webhook only contains metadata.
     *
     * Retrieve the complete received email from Resend.
     */
    const { data: email, error: emailError } =
      await resend.emails.receiving.get(emailId);

    if (emailError || !email) {
      console.error(
        "Failed retrieving inbound email from Resend:",
        emailError
      );

      return NextResponse.json(
        { error: "Failed to retrieve inbound email." },
        { status: 500 }
      );
    }

    const recipients = Array.isArray(email.to)
      ? email.to
      : [email.to];

    const primaryRecipient =
      recipients[0] ?? "unknown@funkful.co.za";

    const toEmail = getEmailAddress(primaryRecipient);

    const fromEmail = getEmailAddress(email.from);
    const fromName = getEmailName(email.from);

    const emailType = getEmailType(recipients);

    /*
     * Store attachment metadata.
     *
     * The actual attachment files can be handled separately
     * through Resend's attachment API.
     */
    const attachments = Array.isArray(email.attachments)
      ? email.attachments
      : [];

    const { data: savedEmail, error: insertError } =
      await supabase
        .from("inbound_emails")
        .insert({
          resend_email_id: emailId,
          message_id: email.message_id ?? null,

          from_email: fromEmail,
          from_name: fromName,

          to_email: toEmail,

          subject: email.subject ?? null,

          text_body: email.text ?? null,
          html_body: email.html ?? null,

          email_type: emailType,

          status: "new",

          attachments,

          received_at:
            email.created_at ??
            event.created_at ??
            new Date().toISOString(),
        })
        .select()
        .single();

    if (insertError) {
      /*
       * If this was a race/retry and another webhook already
       * inserted the email, don't turn it into a permanent
       * Resend webhook failure.
       */
      if (insertError.code === "23505") {
        console.log(
          "Inbound email already exists:",
          emailId
        );

        return NextResponse.json({
          received: true,
          duplicate: true,
        });
      }

      console.error(
        "Failed saving inbound email:",
        insertError
      );

      return NextResponse.json(
        { error: "Failed saving inbound email." },
        { status: 500 }
      );
    }

    console.log("Inbound email saved:", {
      id: savedEmail.id,
      resendEmailId: emailId,
      from: fromEmail,
      to: toEmail,
      subject: email.subject,
      emailType,
    });

    return NextResponse.json({
      received: true,
      saved: true,
      id: savedEmail.id,
      emailId,
    });
  } catch (error) {
    console.error("Resend inbound webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}