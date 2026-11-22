import { NextResponse } from "next/server";
import { searchLockers, type PickupPointType } from "@/lib/shipping/the-courier-guy";
export const runtime = "nodejs";
export const revalidate = 900;

const TYPES: PickupPointType[] = ["locker", "counter", "point"];

// Searches The Courier Guy pickup points (lockers, kiosks/counters and pickup points).
// Optional ?type=locker|counter|point narrows the list; omit it to search all three.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const search = params.get("q") ?? "";
    const type = TYPES.find((value) => value === params.get("type"));
    if (search.trim().length < 2) return NextResponse.json({ lockers: [] });
    const lockers = await searchLockers(search, type);
    return NextResponse.json({ lockers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not find pickup points.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
