import { NextResponse } from "next/server";
import { processPendingOrderNotifications } from "@/lib/order-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processPendingOrderNotifications(20);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Order notification queue failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification queue failed." },
      { status: 500 },
    );
  }
}
