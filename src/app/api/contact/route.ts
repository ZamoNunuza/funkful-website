import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name=typeof body.name==="string"?body.name.trim():"";
    const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
    const message=typeof body.message==="string"?body.message.trim():"";
    if(!name || !/^\S+@\S+\.\S+$/.test(email) || !message) return NextResponse.json({error:"Please complete all fields."},{status:400});
    const admin=createAdminClient();
    let userId:null|string=null;
    try { const c=await createClient(); const {data}=await c.auth.getUser(); userId=data.user?.id??null; } catch {}
    const {error}=await admin.from("contact_messages").insert({name,email,message,user_id:userId});
    if(error) return NextResponse.json({error:"Could not send your message."},{status:500});
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({error:"Could not send your message."},{status:500}); }
}
