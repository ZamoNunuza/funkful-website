import Link from "next/link";
import { palette } from "@/lib/brands";
export default function CheckoutFailedPage() {
  return <main style={{background:palette.cream,color:palette.black}} className="min-h-screen flex items-center justify-center px-8">
    <div className="max-w-xl text-center">
      <div className="text-5xl mb-5">!</div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{color:"#8a4a45"}}>Payment not completed</p>
      <h1 className="text-4xl font-black uppercase mb-4">Let&apos;s try again</h1>
      <p className="text-sm text-neutral-600 leading-relaxed mb-8">Your payment was not completed. Your bag is still available so you can return to checkout and try another payment method.</p>
      <Link href="/cart" style={{background:palette.black,color:palette.cream}} className="inline-block px-7 py-4 rounded-full text-xs font-bold uppercase">Return to bag</Link>
    </div>
  </main>;
}
