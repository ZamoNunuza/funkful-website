"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/account-shared";
import {
  markOrderDelivered,
  markOrderShipped,
  parseShipment,
  resendFulfilmentEmail,
  updateTrackingDetails,
  type FulfilmentResult,
} from "@/lib/order-fulfilment";
import { recoverUnsentNotifications, retryOrderNotification } from "@/lib/order-notifications";

export type FulfilmentState = { success?: string; warning?: string; error?: string } | null;

/**
 * One action for every button on the order page; a hidden `intent` field says
 * which one was pressed. Keeping a single action means the page shows only the
 * most recent message.
 */
export async function fulfilmentAction(_prev: FulfilmentState, formData: FormData): Promise<FulfilmentState> {
  // Server actions are public endpoints — re-check admin here, not just on the page.
  const user = await requireAdmin();
  const actor = user.email ?? "unknown";

  const orderId = String(formData.get("orderId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!isUuid(orderId)) return { error: "Invalid order." };

  let result: FulfilmentResult;
  switch (intent) {
    case "ship":
    case "tracking": {
      const parsed = parseShipment(formData);
      if ("error" in parsed) return { error: parsed.error };
      result = intent === "ship"
        ? await markOrderShipped(orderId, parsed.value, actor)
        : await updateTrackingDetails(orderId, parsed.value, actor);
      break;
    }
    case "deliver":
      result = await markOrderDelivered(orderId, actor);
      break;
    case "resend":
      result = await resendFulfilmentEmail(orderId);
      break;
    default:
      return { error: "Unknown action." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return result.ok ? { success: result.message, warning: result.warning } : { error: result.error };
}

export type NotificationState = { success?: string; error?: string } | null;

/** Retries one failed email job from the order page. */
export async function retryNotificationAction(_prev: NotificationState, formData: FormData): Promise<NotificationState> {
  // Server actions are public endpoints — re-check admin here, not just on the page.
  await requireAdmin();

  const notificationId = String(formData.get("notificationId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!isUuid(notificationId) || !isUuid(orderId)) return { error: "Invalid notification." };

  try {
    const result = await retryOrderNotification(notificationId);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return result.ok ? { success: "Email sent." } : { error: `Still failing: ${result.error ?? "unknown error"}` };
  } catch (error) {
    console.error("Retry notification failed:", error);
    return { error: "Could not retry this email. Check the server logs." };
  }
}

/** Sends every email that never went out (e.g. after verifying the sending domain). */
export async function recoverUnsentNotificationsAction(
  _prev: NotificationState,
  _formData: FormData,
): Promise<NotificationState> {
  await requireAdmin();

  try {
    const result = await recoverUnsentNotifications();
    revalidatePath("/admin/orders");
    if (result.considered === 0) return { success: "Nothing to recover — no unsent emails found." };
    if (result.failed > 0) {
      return {
        error: `Sent ${result.sent} of ${result.considered}. ${result.failed} still failing: ${result.firstError ?? "unknown error"}`,
      };
    }
    return { success: `Sent ${result.sent} email${result.sent === 1 ? "" : "s"}.` };
  } catch (error) {
    console.error("Recover unsent notifications failed:", error);
    return { error: "Could not recover unsent emails. Check the server logs." };
  }
}
