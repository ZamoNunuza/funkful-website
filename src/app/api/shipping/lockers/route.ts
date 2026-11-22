import { NextResponse } from "next/server";
import { searchLockers } from "@/lib/shipping/the-courier-guy";
export const runtime = "nodejs";
export const revalidate = 900;
export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.get("q") ?? "";
    if (search.trim().length < 2) return NextResponse.json({ lockers: [] });
    const lockers = await searchLockers(search);
    return NextResponse.json({ lockers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not find pickup points.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
