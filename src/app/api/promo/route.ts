import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { code, subtotalCents } = await req.json();
    const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (!normalized || !Number.isInteger(subtotalCents) || subtotalCents < 0) {
      return NextResponse.json({ error: "Enter a valid promo code." }, { status: 400 });
    }
    const supabase = createAdminClient();
    const { data: promo } = await supabase.from("promo_codes")
      .select("code,discount_type,discount_value,min_order_cents,max_uses,uses_count,starts_at,expires_at,is_active")
      .eq("code", normalized).maybeSingle();
    const now=Date.now();
    const valid=promo?.is_active && (!promo.starts_at || new Date(promo.starts_at).getTime()<=now)
      && (!promo.expires_at || new Date(promo.expires_at).getTime()>now)
      && subtotalCents>=promo.min_order_cents && (promo.max_uses==null || promo.uses_count<promo.max_uses);
    if (!valid) return NextResponse.json({error:"That promo code is invalid or expired."},{status:400});
    const discount=promo.discount_type==="percentage"
      ? Math.floor(subtotalCents*promo.discount_value/100) : Math.min(promo.discount_value,subtotalCents);
    return NextResponse.json({code:promo.code,discountCents:discount});
  } catch { return NextResponse.json({error:"Promo service is unavailable."},{status:500}); }
}
