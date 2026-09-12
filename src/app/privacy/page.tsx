import Link from "next/link"; import { palette } from "@/lib/brands";

export default function PrivacyPage(){
    return 
    <main style={{background:palette.cream,color:palette.black}} className="min-h-screen">
        <div className="max-w-[900px] mx-auto px-8 py-16">
            <Link href="/" className="text-xs underline">← Home</Link>
            <h1 className="text-4xl font-black uppercase mt-8 mb-6">Privacy</h1>
            <div className="space-y-5 text-sm text-neutral-600 leading-relaxed">
                <p>We collect information needed to create accounts, process orders, deliver purchases, provide support, and send marketing when you choose to receive it.</p>
                <p>Payment card information is handled by our payment provider and is not stored by Funkful as card data.</p>
                <p>You can contact us to ask about your personal information, subject to applicable privacy law. Marketing emails include an unsubscribe mechanism.</p>
            </div>
        </div>
    </main>
}
