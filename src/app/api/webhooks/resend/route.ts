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

function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);

  return (match?.[1] ?? value).trim().toLowerCase();
}

function extractName(value: string): string | null {
  const match = value.match(/^(.+?)\s*<[^>]+>$/);

  if (!match) return null;

  return match[1]
    .trim()
    .replace(/^["']|["']$/g, "") || null;
}

function getEmailType(
  recipients: string[]
): FunkfulEmailType | "unknown" {
  for (const recipient of recipients) {
    const address = extractEmail(recipient);

    if (address in FUNKFUL_ADDRESSES) {
      return FUNKFUL_ADDRESSES[
        address as keyof typeof FUNKFUL_ADDRESSES
      ];
    }
  }

  return "unknown";
}

function getHeader(
  headers: Record<string, string> | undefined,
  name: string
): string | null {
  if (!headers) return null;

  const key = Object.keys(headers).find(
    (key) => key.toLowerCase() === name.toLowerCase()
  );

  return key ? headers[key] : null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();

    const webhookSecret =
      process.env.RESEND_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "RESEND_WEBHOOK_SECRET is not configured."
      );

      return NextResponse.json(
        { error: "Webhook secret is not configured." },
        { status: 500 }
      );
    }

    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp:
          req.headers.get("svix-timestamp") ?? "",
        signature:
          req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });

    if (event.type !== "email.received") {
      return NextResponse.json({
        received: true,
      });
    }

    const emailId = event.data.email_id;

    if (!emailId) {
      return NextResponse.json(
        { error: "Missing email_id." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Prevent duplicate processing.
    const { data: existing } = await supabase
      .from("inbound_emails")
      .select("id")
      .eq("resend_email_id", emailId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    // Retrieve the complete inbound email.
    const { data: email, error: emailError } =
      await resend.emails.receiving.get(emailId);

    if (emailError || !email) {
      console.error(
        "Failed retrieving inbound email:",
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

    const cc = Array.isArray(email.cc)
      ? email.cc
      : [];

    const bcc = Array.isArray(email.bcc)
      ? email.bcc
      : [];

    const primaryRecipient =
      recipients[0] ?? "unknown@funkful.co.za";

    const toEmail =
      extractEmail(primaryRecipient);

    const fromEmail =
      extractEmail(email.from);

    const fromName =
      extractName(email.from);

    const emailType =
      getEmailType(recipients);

    const attachments =
      Array.isArray(email.attachments)
        ? email.attachments
        : [];

    /*
     * Use Message-ID as the primary thread key
     * for the first message.
     */
    const messageId =
      email.message_id ?? null;

    const replyTo =
      Array.isArray(email.reply_to)
        ? email.reply_to[0] ?? null
        : email.reply_to ?? null;

    /*
     * Resend's retrieved email may expose headers.
     * These allow us to associate replies with
     * existing conversations.
     */
    const headers =
      email.headers as Record<string, string> | undefined;

    const inReplyTo =
      getHeader(headers, "In-Reply-To");

    const referencesHeader =
      getHeader(headers, "References");

    /*
     * If this is a reply, use the referenced
     * message as the thread key.
     *
     * Otherwise use the current Message-ID.
     */
    const threadKey =
      inReplyTo ||
      (referencesHeader
        ? referencesHeader.split(/\s+/)[0]
        : null) ||
      messageId ||
      emailId;

    /*
     * Find an existing thread.
     */
    let threadId: string | null = null;

    const { data: existingThread } =
      await supabase
        .from("email_threads")
        .select("id")
        .eq("thread_key", threadKey)
        .maybeSingle();

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      /*
       * Create a new thread.
       */
      const { data: newThread, error: threadError } =
        await supabase
          .from("email_threads")
          .insert({
            thread_key: threadKey,
            email_type: emailType,
            subject: email.subject ?? null,
            customer_email: fromEmail,
            status: "open",
            last_message_at:
              email.created_at ??
              new Date().toISOString(),
          })
          .select("id")
          .single();

      if (threadError) {
        console.error(
          "Failed creating email thread:",
          threadError
        );

        return NextResponse.json(
          { error: "Failed creating email thread." },
          { status: 500 }
        );
      }

      threadId = newThread.id;
    }

    /*
     * Store the inbound email.
     */
    const { data: savedEmail, error: insertError } =
      await supabase
        .from("inbound_emails")
        .insert({
          resend_email_id: emailId,
          message_id: messageId,
          from_email: fromEmail,
          from_name: fromName,
          to_email: toEmail,
          cc_emails: cc,
          bcc_emails: bcc,
          reply_to: replyTo,
          in_reply_to: inReplyTo,
          references_header: referencesHeader,
          thread_id: threadId,
          subject:
            email.subject ?? null,
          text_body:
            email.text ?? null,
          html_body:
            email.html ?? null,
          email_type: emailType,
          status: "new",
          has_attachments:
            attachments.length > 0,
          attachments,

          received_at:
            email.created_at ??
            event.created_at ??
            new Date().toISOString(),
        })
        .select("id")
        .single();

    if (insertError) {
      if (insertError.code === "23505") {
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

    /*
     * Store attachment metadata.
     */
    if (attachments.length > 0) {
      const attachmentRows =
        attachments.map((attachment) => ({
          inbound_email_id:
            savedEmail.id,

          resend_attachment_id:
            attachment.id,

          filename:
            attachment.filename,

          content_type:
            attachment.content_type ??
            null,

          content_disposition:
            attachment.content_disposition ??
            null,

          content_id:
            attachment.content_id ??
            null,
        }));

      const { error: attachmentError } =
        await supabase
          .from("inbound_email_attachments")
          .insert(attachmentRows);

      if (attachmentError) {
        console.error(
          "Failed saving attachment metadata:",
          attachmentError
        );
      }
    }

    /*
     * Update the thread timestamp.
     */
    await supabase
      .from("email_threads")
      .update({
        last_message_at:
          email.created_at ??
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", threadId);

    console.log(
      "Funkful inbound email processed:",
      {
        emailId,
        threadId,
        fromEmail,
        toEmail,
        emailType,
        hasAttachments:
          attachments.length > 0,
      }
    );

    return NextResponse.json({
      received: true,
      saved: true,
      emailId,
      threadId,
    });
  } catch (error) {
    console.error(
      "Resend inbound webhook error:",
      error
    );

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 400 }
    );
  }
}