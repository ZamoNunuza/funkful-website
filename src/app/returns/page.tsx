import Link from "next/link"; import { palette } from "@/lib/brands";

export default function ReturnsPage(){
    return 
    <main style={{background:palette.cream,color:palette.black}} className="min-h-screen">
        <div className="max-w-[900px] mx-auto px-8 py-16">
            <Link href="/" className="text-xs underline">← Home</Link>
            <h1 className="text-4xl font-black uppercase mt-8 mb-6">Returns & refunds</h1>
            <div className="space-y-5 text-sm text-neutral-600 leading-relaxed">
                <p>Contact us as soon as possible if your order arrives damaged, incorrect, or materially different from what you ordered. Include your order number and clear photos where relevant.</p>
                <p>Because personalised items are made specifically for you, they generally cannot be returned for a change of mind once production has started, subject to your rights under applicable South African consumer law.</p>
                <p>Approved refunds are returned through the original payment method where possible.</p>
            </div>
        </div>
    </main>
}
