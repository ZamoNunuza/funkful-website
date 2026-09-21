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
