import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type ForwardableInboundEmail = {
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

const MAILBOX_FROM: Record<string, string> = {
  hello: "Funkful <hello@funkful.co.za>",
  order: "Funkful Orders <orders@funkful.co.za>",
  support: "Funkful Support <support@funkful.co.za>",
  sales: "Funkful Sales <sales@funkful.co.za>",
  unknown: "Funkful <hello@funkful.co.za>",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mailboxFrom(emailType: string | null): string {
  return MAILBOX_FROM[emailType ?? "unknown"] ?? MAILBOX_FROM.unknown;
}

function safeSubject(subject: string | null): string {
  const value = subject?.trim() || "(No subject)";
  return value.startsWith("[Funkful]") ? value : `[Funkful] ${value}`;
}

async function getInboundAttachmentPaths(resendEmailId: string) {
  try {
    const result = await resend.emails.receiving.attachments.list({
      emailId: resendEmailId,
    });

    const raw = result.data as unknown;
    const items = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data?: unknown }).data)
        ? (raw as { data: unknown[] }).data
        : [];

    return items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];

      const attachment = item as Record<string, unknown>;
      const path = typeof attachment.download_url === "string"
        ? attachment.download_url
        : null;
      const filename = typeof attachment.filename === "string"
        ? attachment.filename
        : "attachment";
      const contentType = typeof attachment.content_type === "string"
        ? attachment.content_type
        : undefined;
      const contentId = typeof attachment.content_id === "string"
        ? attachment.content_id
        : undefined;

      if (!path) return [];

      return [{ path, filename, content_type: contentType, content_id: contentId }];
    });
  } catch (error) {
    console.error("Failed to retrieve inbound attachments for Gmail forwarding:", error);
    return [];
  }
}

export async function forwardInboundEmailToGmail(email: ForwardableInboundEmail) {
  const destination = process.env.FUNKFUL_FORWARD_EMAIL?.trim();

  if (!destination) {
    return {
      forwarded: false,
      skipped: true,
      error: null,
      destination: null,
    };
  }

  if (!email.from_email) {
    return {
      forwarded: false,
      skipped: false,
      error: "The inbound email does not contain a sender address.",
      destination,
    };
  }

  const from = mailboxFrom(email.email_type);
  const subject = safeSubject(email.subject);
  const senderLabel = email.from_name
    ? `${email.from_name} <${email.from_email}>`
    : email.from_email;

  const metadataHtml = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#f7f4ef;color:#111">
      <div style="background:#111;color:#fff;border-radius:14px;padding:14px 18px;margin-bottom:18px">
        <strong style="font-size:16px">Funkful Inbox</strong>
        <div style="font-size:12px;opacity:.75;margin-top:4px">New customer email forwarded from Resend</div>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;margin-bottom:18px">
        <tr><td style="padding:10px 14px;font-size:12px;color:#666">From</td><td style="padding:10px 14px;font-size:13px"><strong>${escapeHtml(senderLabel)}</strong></td></tr>
        <tr><td style="padding:10px 14px;font-size:12px;color:#666">To</td><td style="padding:10px 14px;font-size:13px">${escapeHtml(email.to_email ?? "")}</td></tr>
        <tr><td style="padding:10px 14px;font-size:12px;color:#666">Mailbox</td><td style="padding:10px 14px;font-size:13px">${escapeHtml(email.email_type ?? "unknown")}</td></tr>
        <tr><td style="padding:10px 14px;font-size:12px;color:#666">Received</td><td style="padding:10px 14px;font-size:13px">${escapeHtml(email.received_at ?? "")}</td></tr>
      </table>
      <div style="background:#fff;border-radius:14px;padding:20px">
        ${email.html_body || `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(email.text_body ?? "")}</pre>`}
      </div>
    </div>
  `;

  const attachments = email.resend_email_id
    ? await getInboundAttachmentPaths(email.resend_email_id)
    : [];

  const sendResult = await resend.emails.send(
    {
      from,
      to: [destination],
      subject,
      html: metadataHtml,
      text: [
        "FUNKFUL INBOX",
        "",
        `From: ${senderLabel}`,
        `To: ${email.to_email ?? ""}`,
        `Mailbox: ${email.email_type ?? "unknown"}`,
        `Received: ${email.received_at ?? ""}`,
        "",
        email.text_body ?? "",
      ].join("\n"),
      replyTo: email.from_email,
      headers: email.message_id
        ? {
            "X-Funkful-Original-Message-ID": email.message_id,
          }
        : undefined,
      attachments: attachments.map((attachment) => ({
        path: attachment.path,
        filename: attachment.filename,
        contentType: attachment.content_type,
        contentId: attachment.content_id,
      })),
    },
    {
      idempotencyKey: `funkful-gmail-forward/${email.id}`,
    }
  );

  if (sendResult.error) {
    return {
      forwarded: false,
      skipped: false,
      error: sendResult.error.message || "Resend failed to forward the email.",
      destination,
    };
  }

  return {
    forwarded: true,
    skipped: false,
    error: null,
    destination,
    resendForwardId: sendResult.data?.id ?? null,
  };
}
