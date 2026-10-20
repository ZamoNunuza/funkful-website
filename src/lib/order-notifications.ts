// src/lib/order-notifications.ts
//
// Server-only notification queue for orders.
// Notifications are durable DB jobs: a status change creates a job, this module
// claims it, sends it through the configured provider, and records the result.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderConfirmation,
  sendOrderDelivered,
  sendOrderNotification,
  sendOrderShipped,
  sendPaymentFailedEmail,
  type OrderEmailItem,
  type OrderEmailOrder,
} from "@/lib/order-email";

export type NotificationType = "admin_email" | "customer_email" | "whatsapp";
export type OrderNotificationEvent =
  | "payment_confirmed"
  | "payment_failed"
  | "shipped"
  | "delivered";

type NotificationRow = {
  id: string;
  order_id: string;
  notification_type: NotificationType;
  event_type: OrderNotificationEvent;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
};

type AdminClient = ReturnType<typeof createAdminClient>;

async function loadJob(admin: AdminClient, id: string) {
  const { data, error } = await admin
    .from("order_notifications")
    .select("id,order_id,notification_type,event_type,status,attempts")
    .eq("id", id)
    .maybeSingle();
  return { job: data as NotificationRow | null, error };
}

async function loadOrderAndItems(admin: AdminClient, orderId: string) {
  const [orderResult, itemsResult] = await Promise.all([
    admin.from("orders").select("*").eq("id", orderId).maybeSingle(),
    admin
      .from("order_items")
      .select("product_name,variant,quantity,unit_price_cents")
      .eq("order_id", orderId),
  ]);

  if (orderResult.error) throw orderResult.error;
  if (!orderResult.data) throw new Error("Order not found.");

  return {
    order: orderResult.data as OrderEmailOrder,
    items: (itemsResult.data ?? []) as OrderEmailItem[],
  };
}

async function claimJob(admin: AdminClient, id: string): Promise<NotificationRow | null> {
  const { data, error } = await admin
    .from("order_notifications")
    .update({
      status: "sending",
      attempts: (await loadJob(admin, id)).job?.attempts ?? 0,
      last_attempt_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id)
    .in("status", ["pending", "failed"])
    .select("id,order_id,notification_type,event_type,status,attempts")
    .maybeSingle();

  if (error) {
    console.error("Order notifications: could not claim job:", error);
    return null;
  }

  if (!data) return null;

  // Increment attempts in a second guarded write so retries remain visible.
  const nextAttempts = Number(data.attempts ?? 0) + 1;
  const { data: incremented, error: incrementError } = await admin
    .from("order_notifications")
    .update({ attempts: nextAttempts })
    .eq("id", id)
    .eq("status", "sending")
    .select("id,order_id,notification_type,event_type,status,attempts")
    .maybeSingle();

  if (incrementError || !incremented) {
    console.error("Order notifications: could not increment attempts:", incrementError);
    return null;
  }

  return incremented as NotificationRow;
}

async function markSent(admin: AdminClient, id: string, provider: string, providerMessageId: string | null) {
  const { error } = await admin
    .from("order_notifications")
    .update({
      status: "sent",
      provider,
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id)
    .eq("status", "sending");

  if (error) console.error("Order notifications: could not mark sent:", error);
}

async function markFailed(admin: AdminClient, id: string, message: string) {
  const { error } = await admin
    .from("order_notifications")
    .update({
      status: "failed",
      error_message: message.slice(0, 2000),
    })
    .eq("id", id)
    .eq("status", "sending");

  if (error) console.error("Order notifications: could not mark failed:", error);
}

function providerFor(type: NotificationType) {
  if (type === "whatsapp") return "whatsapp";
  return "resend";
}

async function sendJob(job: NotificationRow, order: OrderEmailOrder, items: OrderEmailItem[]) {
  if (job.notification_type === "whatsapp") {
    throw new Error("WhatsApp notifications are not configured yet. Add a WhatsApp provider before enabling this channel.");
  }

  // A fresh key per attempt: Resend remembers keys, so reusing one could make a
  // retry look like a duplicate of a request that was rejected earlier.
  const options = { idempotencyKey: `notification/${job.id}/attempt-${job.attempts}` };

  if (job.notification_type === "admin_email") {
    if (job.event_type !== "payment_confirmed") {
      // The current admin email templates are intentionally limited to the
      // paid-order notification. Other lifecycle emails are customer-facing.
      return { skipped: true };
    }
    return sendOrderNotification(order, items, options);
  }

  switch (job.event_type) {
    case "payment_confirmed":
      return sendOrderConfirmation(order, items, options);
    case "payment_failed":
      return sendPaymentFailedEmail(order, options);
    case "shipped":
      return sendOrderShipped(order, items, options);
    case "delivered":
      return sendOrderDelivered(order, items, options);
    default:
      throw new Error(`Unsupported order notification event: ${job.event_type}`);
  }
}

export type ProcessResult = { ok: boolean; skipped?: boolean; alreadyProcessed?: boolean; error?: string };

/**
 * Errors that retrying cannot fix: a missing config value or an unverified
 * sending domain. The cron skips these; an admin can still retry by hand once
 * the cause is fixed. "Legacy" jobs were created before this queue sent real
 * emails, so they must never be sent automatically (they'd email old customers).
 */
const NO_AUTO_RETRY_PATTERN =
  /domain is not verified|not configured|RESEND_API_KEY is not set|API key is invalid|^Legacy notification job/i;

export function isNoAutoRetryError(message?: string | null) {
  return Boolean(message && NO_AUTO_RETRY_PATTERN.test(message));
}

export async function processOrderNotification(id: string): Promise<ProcessResult> {
  const admin = createAdminClient();
  const job = await claimJob(admin, id);
  if (!job) {
    return { ok: false, alreadyProcessed: true, error: "Notification is already being processed or is no longer pending." };
  }

  try {
    const { order, items } = await loadOrderAndItems(admin, job.order_id);
    const result = await sendJob(job, order, items);

    if ("skipped" in result && result.skipped) {
      const message = job.notification_type === "admin_email"
        ? "Admin order notification email is not configured."
        : "Notification was skipped by the provider.";
      await markFailed(admin, id, message);
      return { ok: false, skipped: true, error: message };
    }

    if ("error" in result && result.error) {
      throw new Error(result.error.message || "The notification provider rejected the message.");
    }

    const providerMessageId = "data" in result && result.data?.id ? result.data.id : null;
    await markSent(admin, id, providerFor(job.notification_type), providerMessageId);

    if (job.notification_type === "customer_email" && job.event_type === "payment_confirmed") {
      await admin
        .from("orders")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", job.order_id);
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification failed.";
    await markFailed(admin, id, message);
    return { ok: false, error: message };
  }
}

export async function enqueueOrderNotification(
  orderId: string,
  eventType: OrderNotificationEvent,
  notificationType: NotificationType = "customer_email",
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_notifications")
    .upsert(
      {
        order_id: orderId,
        event_type: eventType,
        notification_type: notificationType,
        status: "pending",
        attempts: 0,
        error_message: null,
      },
      { onConflict: "order_id,event_type,notification_type", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (data?.id) return data.id;

  // The payment trigger may have created the same durable job already.
  // Return that existing job so the webhook can process it immediately.
  const { data: existing, error: existingError } = await admin
    .from("order_notifications")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_type", eventType)
    .eq("notification_type", notificationType)
    .maybeSingle();

  if (existingError) throw existingError;
  return existing?.id ?? null;
}

export async function enqueueAndProcessOrderNotification(
  orderId: string,
  eventType: OrderNotificationEvent,
  notificationType: NotificationType = "customer_email",
): Promise<ProcessResult> {
  const id = await enqueueOrderNotification(orderId, eventType, notificationType);
  if (!id) return { ok: false, error: "Could not create or locate the notification job." };
  return processOrderNotification(id);
}

export async function processPendingOrderNotifications(limit = 20) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // A job stuck in "sending" means a send was interrupted (e.g. the function
  // timed out). We can't know whether the email left, so surface it as failed
  // for an admin to check in Resend rather than risk a silent duplicate.
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin
    .from("order_notifications")
    .update({
      status: "failed",
      error_message: "Interrupted while sending. Check the Resend logs before retrying, in case it was delivered.",
    })
    .eq("status", "sending")
    .lt("last_attempt_at", staleCutoff);

  // Over-fetch, then drop jobs that retrying can't fix (see isNoAutoRetryError)
  // so they can't crowd real work out of the batch.
  const { data, error } = await admin
    .from("order_notifications")
    .select("id,error_message")
    .in("status", ["pending", "failed"])
    .neq("notification_type", "whatsapp")
    .lt("attempts", 5)
    .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
    .order("created_at", { ascending: true })
    .limit(limit * 5);

  if (error) throw error;

  const due = (data ?? []).filter((row) => !isNoAutoRetryError(row.error_message)).slice(0, limit);

  let sent = 0;
  let failed = 0;
  for (const row of due) {
    const result = await processOrderNotification(row.id);
    if (result.ok) sent++;
    else if (!result.alreadyProcessed) failed++;
  }

  return { considered: due.length, sent, failed };
}

/** Admin: retry one failed notification. Keeps the attempt count so history stays honest. */
export async function retryOrderNotification(id: string): Promise<ProcessResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_notifications")
    .update({ status: "pending", error_message: null, last_attempt_at: null })
    .eq("id", id)
    .eq("status", "failed")
    .neq("notification_type", "whatsapp")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, error: "Only failed email notifications can be retried." };
  return processOrderNotification(id);
}

/**
 * Admin: deliberately send an email again, even if it was sent before
 * (e.g. the customer lost it). Creates the job if it doesn't exist yet.
 */
export async function resendOrderNotification(
  orderId: string,
  eventType: OrderNotificationEvent,
  notificationType: NotificationType = "customer_email",
): Promise<ProcessResult> {
  const id = await enqueueOrderNotification(orderId, eventType, notificationType);
  if (!id) return { ok: false, error: "Could not create or locate the notification job." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("order_notifications")
    .update({ status: "pending", error_message: null, last_attempt_at: null })
    .eq("id", id)
    .in("status", ["pending", "sent", "failed"]);
  if (error) throw error;

  return processOrderNotification(id);
}

/**
 * Admin: recover emails that never went out (for example everything that failed
 * while the sending domain was unverified). Skips WhatsApp, legacy jobs and
 * payment-failed notices, which would be confusing to send days later.
 */
export async function recoverUnsentNotifications(limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_notifications")
    .select("id,error_message")
    .in("status", ["pending", "failed"])
    .in("event_type", ["payment_confirmed", "shipped", "delivered"])
    .neq("notification_type", "whatsapp")
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  if (error) throw error;

  const rows = (data ?? [])
    .filter((row) => !/^Legacy notification job/i.test(row.error_message ?? ""))
    .slice(0, limit);

  let sent = 0;
  let failed = 0;
  let firstError: string | null = null;
  for (const row of rows) {
    // Failed jobs need flipping back to pending before they can be claimed.
    await admin
      .from("order_notifications")
      .update({ status: "pending", error_message: null, last_attempt_at: null })
      .eq("id", row.id)
      .eq("status", "failed");
    const result = await processOrderNotification(row.id);
    if (result.ok) sent++;
    else if (!result.alreadyProcessed) {
      failed++;
      firstError ??= result.error ?? null;
    }
  }

  return { considered: rows.length, sent, failed, firstError };
}

export async function retryFailedOrderNotifications(orderId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_notifications")
    .update({ status: "pending", attempts: 0, error_message: null, last_attempt_at: null })
    .eq("order_id", orderId)
    .eq("status", "failed")
    .select("id");

  if (error) throw error;

  const results = [];
  for (const row of data ?? []) results.push(await processOrderNotification(row.id));
  return results;
}
