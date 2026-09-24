import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // IMPORTANT:
    // Resend webhook verification requires the raw request body.
    const payload = await req.text();

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RESEND_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { error: "Webhook secret is not configured." },
        { status: 500 }
      );
    }

    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });

    console.log("Resend webhook received:", event.type);

    if (event.type === "email.received") {
      console.log("Inbound email received:", {
        emailId: event.data.email_id,
        from: event.data.from,
        to: event.data.to,
        subject: event.data.subject,
        messageId: event.data.message_id,
      });

      // Database storage will be added in the next step.
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Resend webhook verification failed:", error);

    return NextResponse.json(
      { error: "Invalid webhook." },
      { status: 400 }
    );
  }
}