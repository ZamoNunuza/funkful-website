import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendWelcomeDiscountEmail } from "@/lib/newsletter-email";

// Server-side client using the service role key — never expose this key to the client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_BRANDS = ["funkful", "scoopful", "anime_box"] as const;
type BrandInterest = (typeof VALID_BRANDS)[number];

// Excludes 0/O and 1/I so codes are easy to read back over the phone or a screenshot
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const DISCOUNT_VALID_DAYS = 30;
const MAX_INSERT_ATTEMPTS = 5;

function generateDiscountCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `FUNK-${code}`;
}

function isUniqueViolation(error: { code?: string }) {
  return error?.code === "23505";
}

function violatesColumn(error: { message?: string }, column: string) {
  return !!error?.message?.toLowerCase().includes(column.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body.source === "string" ? body.source : "newsletter_section";
    const brandInterest: BrandInterest = VALID_BRANDS.includes(body.brand_interest)
      ? body.brand_interest
      : "funkful";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + DISCOUNT_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
        const discountCode = generateDiscountCode();

        const { data, error } = await supabaseAdmin
            .from("newsletter_subscribers")
            .insert({ 
                email,
                brand_interest: brandInterest,
                source,
                discount_code: discountCode,
                discount_expires_at: expiresAt,
            })
            .select("id, discount_code, discount_expires_at")
            .single();

        if (!error && data) {
            // Newsletter codes are also real promo codes. Checkout validates
            // promo_codes, while newsletter_subscribers stores the subscriber
            // and the code/expiry shown to the customer.
            const { error: promoError } = await supabaseAdmin
                .from("promo_codes")
                .insert({
                    code: data.discount_code,
                    description: "Newsletter welcome discount — 10% off first order",
                    discount_type: "percentage",
                    discount_value: 10,
                    min_order_cents: 0,
                    max_uses: 1,
                    uses_count: 0,
                    starts_at: new Date().toISOString(),
                    expires_at: data.discount_expires_at,
                    is_active: true,
                });

            if (promoError) {
                console.error("Newsletter promo code creation failed:", promoError);

                // Do not leave a subscriber with a code that checkout cannot
                // validate. Best-effort cleanup keeps the two tables aligned.
                await supabaseAdmin
                    .from("newsletter_subscribers")
                    .delete()
                    .eq("id", data.id ?? "");

                return NextResponse.json(
                    { error: "Could not create your discount code. Please try again." },
                    { status: 500 }
                );
            }

            // Send the welcome email right away. A delivery hiccup shouldn't fail
            // the signup itself — the code is already saved and the modal shows it.
            try {
                await sendWelcomeDiscountEmail({
                    to: email,
                    discountCode: data.discount_code,
                    expiresAt: data.discount_expires_at,
                    brandInterest
                });
            } catch (emailError) {
                console.error("Newsletter welcome email failed to send:", emailError);
            }

            return NextResponse.json(
                { 
                    message: "You're in! Check your inbox for your code.",
                    discount_code: data.discount_code,
                    discount_expires_at: data.discount_expires_at,
                    discount_used: false,
                }, 
                { status: 201 }
            );
        }

        if (error && isUniqueViolation(error)){
            if (violatesColumn(error, "email")) {
                const { data: existing } = await supabaseAdmin
                    .from("newsletter_subscribers")
                    .select("discount_code, discount_expires_at, discount_used")
                    .eq("email", email)
                    .single();

                return NextResponse.json({
                    message: existing?.discount_used
                        ? "You're already on the list - your welcome code has been used."
                        : "You're already on the list! Here's your code again.",
                    discount_code: existing?.discount_code ?? null,
                    discount_expires_at: existing?.discount_expires_at ?? null,
                    discount_used: existing?.discount_used ?? false,
                }, { status: 200 });
            }

            if (violatesColumn(error, "discount_code")) {
                lastError = error;
                continue;
            }
        }

        console.error("Supabase insert error:", error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });


    }

    console.error("Newsletter route: exhausted discount code attempts:", lastError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    } catch (err) {
    console.error("Newsletter route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}


   
