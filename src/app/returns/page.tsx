import Link from "next/link"; import { palette } from "@/lib/brands";

export default function ReturnsPage(){
    return (
        <main style={{background:palette.cream,color:palette.black}} className="min-h-screen">
            <div className="max-w-[900px] mx-auto px-8 py-16">
                <Link href="/" className="text-xs underline">← Home</Link>
                <h1 className="text-4xl font-black uppercase mt-8 mb-6">Returns & refunds</h1>
                <div className="space-y-5 text-sm text-neutral-600 leading-relaxed">
                    <p>If your order arrives <b>damaged, incorrect, defective, or materially different from what you ordered</b>, please contact us as soon as possible. Include your <b>order number</b> and, where applicable, clear photographs showing the issue so that we can assess and resolve it promptly.</p>
                    <p>Because personalised and made-to-order products are created specifically for you, they generally <b>cannot be returned or refunded due to a change of mind once production has started</b>. This does not affect any rights you may have under applicable <b>South African consumer law</b>, including where a product is defective, incorrect, or does not meet the required standard.</p>
                    <p>Where a refund is approved, it will generally be processed using the <b>original payment method</b>, where possible. Refund processing times may vary depending on the payment provider or financial institution.</p>
                </div>
            </div>
        </main>
    );
}
