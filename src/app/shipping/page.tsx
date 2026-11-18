import Link from "next/link"; import { palette } from "@/lib/brands";

export default function ShippingPage(){
    return (
        <main style={{background:palette.cream,color:palette.black}} className="min-h-screen">
            <div className="max-w-[900px] mx-auto px-8 py-16">
                <Link href="/" className="text-xs underline">← Home</Link>
                <h1 className="text-4xl font-black uppercase mt-8 mb-6">Shipping</h1>
                <div className="space-y-5 text-sm text-neutral-600 leading-relaxed">
                    <p>We currently ship within South Africa. Orders of R500 or more qualify for free standard delivery after discounts. Orders below R500 are charged the live Bob Go standard delivery quote shown at checkout. Delivery availability and pricing are confirmed using your delivery address and the packaged items in your order.</p>
                    <p>Ready-made products are prepared for dispatch after payment confirmation. Personalised products may require additional production time; we will communicate any material delay.</p>
                    <p>Tracking details will be sent when your order is handed to the courier.</p>
                </div>
            </div>
        </main>
    ); 
    
}
