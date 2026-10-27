import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Page not found | Funkful",
  description: "We couldn't find that page. Explore Funkful Originals or Scoopful by Funkful instead.",
};

export default function NotFound() {
  return (
    <main className="min-h-[65vh] px-6 py-16 sm:py-24 flex items-center justify-center">
      <section className="w-full max-w-2xl text-center">
        <Image
          src="/assets/funkful-emblem.png"
          alt="Funkful emblem"
          width={88}
          height={88}
          className="mx-auto mb-8 object-contain"
          priority
        />
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8b5b2c]">404 · Wrong turn</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">Oops! This page went missing.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-neutral-700 sm:text-lg">
          That link may be outdated, or the page may have moved. Your next great find is still just a click away.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/originals" className="btn primary originals">Shop Funkful Originals</Link>
          <Link href="/scoopful" className="btn secondary">Explore Scoopful</Link>
        </div>
        <p className="mt-8 text-sm text-neutral-600">
          Need a hand? <Link href="/contact" className="underline underline-offset-4 font-semibold text-neutral-900">Contact us</Link> and we’ll help you find what you need.
        </p>
      </section>
    </main>
  );
}
