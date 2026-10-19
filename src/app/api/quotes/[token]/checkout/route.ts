import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
function orderNumber() { return `FUNK-${new Date().getFullYear()}-${randomUUID().slice(0,6).toUpperCase()}`; }
type Line = { description: string; quantity: number; unitPriceCents: number; details?: string };
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: "Invalid quotation link." }, { status: 404 });
  const secretKey = process.env.YOCO_SECRET_KEY; const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secretKey || !siteUrl) return NextResponse.json({ error: "Secure checkout is not configured." }, { status: 500 });
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  const email = clean(body.email).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const firstName=clean(body.firstName), lastName=clean(body.lastName), phone=clean(body.phone), address=clean(body.address), city=clean(body.city), province=clean(body.province), postalCode=clean(body.postalCode);
  if (![firstName,lastName,phone,address,city,province,postalCode].every(Boolean)) return NextResponse.json({ error: "Complete all contact and delivery fields." }, { status: 400 });
  const supabase = createAdminClient();
  const { data: quote, error: quoteError } = await supabase.from("custom_quotes").select("*").eq("public_token",token).maybeSingle();
  if (quoteError || !quote) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
  if (new Date(quote.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "This quotation has expired. Please contact Funkful for an updated quote." }, { status: 410 });
  if (!["sent","draft"].includes(quote.status)) return NextResponse.json({ error: "This quotation has already been accepted or is no longer available." }, { status: 409 });
  const items = (Array.isArray(quote.line_items) ? quote.line_items : []) as Line[];
  if (!items.length || items.some(i => !i.description || !Number.isInteger(i.quantity) || i.quantity < 1 || !Number.isInteger(i.unitPriceCents) || i.unitPriceCents < 0)) return NextResponse.json({ error: "Quotation items are invalid. Please contact Funkful." }, { status: 400 });
  const subtotal = items.reduce((sum,item)=>sum+item.quantity*item.unitPriceCents,0);
  const shipping = Number(quote.shipping_cents);
  const total = subtotal + shipping;
  if (subtotal !== quote.subtotal_cents || total !== quote.total_cents || total < 200) return NextResponse.json({ error: "Quotation total could not be validated. Please contact Funkful." }, { status: 409 });
  // Claim the quote before creating an order so two simultaneous requests
  // cannot create two payable orders for the same quotation.
  const { data: claimed, error: claimError } = await supabase.from("custom_quotes")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), customer_email: email, customer_phone: phone, updated_at: new Date().toISOString() })
    .eq("id", quote.id).in("status", ["sent", "draft"]).select("id").maybeSingle();
  if (claimError || !claimed) return NextResponse.json({ error: "This quotation has already been used or is being checked out. Refresh the page or contact Funkful." }, { status: 409 });

  const reopenQuote = async () => { await supabase.from("custom_quotes").update({ status: "sent", order_id: null, updated_at: new Date().toISOString() }).eq("id", quote.id).eq("status", "accepted"); };
  const orderId = randomUUID();
  const { error: orderError } = await supabase.from("orders").insert({ id:orderId, user_id:null, order_number:orderNumber(), email, first_name:firstName, last_name:lastName, phone, shipping_address:address, shipping_city:city, shipping_province:province, shipping_postal_code:postalCode, shipping_country:"South Africa", subtotal_cents:subtotal, discount_cents:0, shipping_cents:shipping, total_cents:total, status:"pending", payment_status:"pending", notes:`Custom quotation ${quote.quote_number} · quote ID ${quote.id}` });
  if (orderError) { await reopenQuote(); console.error("Quote checkout order insert failed",orderError); return NextResponse.json({error:"Could not create your order. Please try again."},{status:500}); }
  const { error: linkOrderError } = await supabase.from("custom_quotes").update({ order_id: orderId }).eq("id", quote.id).eq("status", "accepted");
  if (linkOrderError) { await supabase.from("orders").delete().eq("id",orderId); await reopenQuote(); console.error("Could not link custom quote to order",linkOrderError); return NextResponse.json({error:"Could not link your order to the quotation. Please try again."},{status:500}); }
  const { error: itemError } = await supabase.from("order_items").insert(items.map(item=>({order_id:orderId,product_id:null,product_name:item.description,brand:"funkful",variant:item.details||null,personalization_text:item.details||null,unit_price_cents:item.unitPriceCents,quantity:item.quantity})));
  if (itemError) { await supabase.from("orders").delete().eq("id",orderId); await reopenQuote(); console.error("Quote checkout item insert failed",itemError); return NextResponse.json({error:"Could not save your custom order."},{status:500}); }
  const yocoRes = await fetch("https://payments.yoco.com/api/checkouts",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${secretKey}`},body:JSON.stringify({amount:total,currency:"ZAR",lineItems:items.map(item=>({displayName:item.description,quantity:item.quantity,pricingDetails:{price:item.unitPriceCents}})),successUrl:`${siteUrl}/checkout/success?order=${orderId}`,cancelUrl:`${siteUrl}/quote/${token}`,failureUrl:`${siteUrl}/checkout/failed?order=${orderId}`,metadata:{orderId,email,quoteId:quote.id,quoteNumber:quote.quote_number}})});
  if(!yocoRes.ok){await supabase.from("orders").delete().eq("id",orderId);await reopenQuote();console.error("Yoco quote checkout failed",await yocoRes.text());return NextResponse.json({error:"Could not start payment. Please try again or contact Funkful."},{status:502});}
  const yoco = await yocoRes.json() as {id:string;redirectUrl:string};
  const {error:saveCheckoutError}=await supabase.from("orders").update({yoco_checkout_id:yoco.id}).eq("id",orderId);
  if(saveCheckoutError){console.error("Could not save Yoco checkout id",saveCheckoutError);return NextResponse.json({error:"Payment session started but could not be linked. Please contact Funkful before retrying."},{status:500});}
  return NextResponse.json({redirectUrl:yoco.redirectUrl,orderId});
}
