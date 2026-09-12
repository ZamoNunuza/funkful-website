import Link from "next/link"; import { palette } from "@/lib/brands";

export default function TermsPage(){
    return 
    <main style={{background:palette.cream,color:palette.black}} className="min-h-screen">
        <div className="max-w-[900px] mx-auto px-8 py-16">
            <Link href="/" className="text-xs underline">← Home</Link>
            <h1 className="text-4xl font-black uppercase mt-8 mb-6">Terms</h1>
            <div className="space-y-5 text-sm text-neutral-600 leading-relaxed">
                <p>Product descriptions, prices, availability, and promotional offers may change. An order is subject to successful payment and acceptance by Funkful.</p>
                <p>Personalised designs must be checked carefully before submission. We may contact you where an order requires clarification before production.</p>
                <p>Nothing on this page limits rights that cannot lawfully be excluded under applicable South African law.</p>
            </div>
        </div>
    </main>
}
