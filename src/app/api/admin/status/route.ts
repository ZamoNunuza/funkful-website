import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdmin("/api/admin/status");

    return NextResponse.json({ isAdmin: true });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}