// src/app/scoopful/page.tsx
import Image from "next/image";
import Link from "next/link";
import { brands, palette, navLinks } from "@/lib/brands";

const scoops = [
  { name: "Lucky Scoop — Classic", desc: "Our original mystery scoop. Beauty, lifestyle & surprise items, hand-packed.", price: "R249", badge: "Bestseller", swatch: palette.blush },
  { name: "VIP Premium Scoop", desc: "Rare, high-tier finds only. Our most-hyped scoop, limited weekly stock.", price: "R399", badge: "VIP", swatch: palette.gold },
  { name: "Lucky Scoop — Beauty Edition", desc: "Skincare & makeup minis and full sizes, scooped at random.", price: "R279", badge: "New", swatch: palette.beige },
  { name: "Double Scoop Bundle", desc: "Two scoops, one box — built for sharing (or not).", price: "R429", was: "R498", badge: "Bundle", swatch: palette.lavender },
  { name: "Lucky Scoop — Lifestyle", desc: "Desk finds, accessories and small surprises for everyday joy.", price: "R249", badge: "Restocked", swatch: palette.sage },
  { name: "Scoopful Gift Set, x3", desc: "Three scoops pre-wrapped for gifting, with a hand-signed card.", price: "R649", badge: "Gift Ready", swatch: palette.blush },
];

const filters = ["All Scoops", "Lucky Scoops", "VIP Scoops", "Bundles", "Beauty Edition"];

const howItWorks = [
  { n: "01", title: "Pick your scoop", body: "Choose Lucky, VIP, or a themed edition. Every tier sets the value range, not the exact contents." },
  { n: "02", title: "We hand-pack the mystery", body: "Curated same day, sealed, and never repeated the same way twice." },
  { n: "03", title: "You scoop, you share", body: "Unbox on camera or just for you — either way, tag us for a shot at a restock feature." },
];

export default function ScoopfulPage() {
  const scoopful = brands.scoopful;
  const funkful = brands.funkful;

  return (
    <>
      {/* Header — same shell as the homepage, "Scoopful" marked active */}
      <header style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }} className="sticky top-0 z-50 bg-[--brand-bg,inherit]">
        <div className="max-w-1180px mx-auto px-8 flex items-center justify-between py-4">
          <Link href="/">
            <Image src={funkful.logo} alt="Funkful" width={110} height={26} className="w-auto" />
          </Link>
          <nav className="hidden md:flex gap-9">
            {navLinks.map((link) => {
              const isActive = link.href === scoopful.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold uppercase tracking-wide pb-1 border-b-2"
                  style={{
                    color: link.soon ? "#7d6da3" : isActive ? "var(--brand-ink)" : palette.black,
                    borderColor: isActive ? "var(--brand-ink)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <span>Search</span>
            <span>Account</span>
            <Link href="/cart">
              Bag{" "}
              <span
                style={{ background: palette.black, color: palette.cream }}
                className="inline-flex items-center justify-center w-[18px] h-[18px] pt-2 rounded-full text-[10px] ml-1"
              >
                2
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-\[1180px\] mx-auto px-8 pt-4 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <span className="text-black font-medium">Scoopful</span>
      </div>

      {/* Hero */}
      <section style={{ background: "var(--brand-accent)" }} className="mt-4 py-11 md:py-14">
        <div className="max-w-\[1180px\] mx-auto px-8 grid md:grid-cols-[220px_1fr] gap-10 items-center">
          <Image src={scoopful.logo} alt={scoopful.name} width={220} height={220} className="w-full" />
          <div>
            <span
              style={{ background: palette.black, color: palette.cream }}
              className="inline-flex items-center gap-2 border rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide mb-4"
            >
              {scoopful.eyebrow}
            </span>
            <h1 style={{ color: "var(--brand-ink)" }} className="text-4xl md:text-5xl font-black uppercase leading-tight mb-3">
              {scoopful.tagline}
            </h1>
            <p style={{ color: "#5b3d38" }} className="text-sm leading-relaxed max-w-lg mb-6">
              What if shopping felt like opening a beautifully wrapped present every single time? Every
              scoop is a curated mystery filled with high-value items — no two are ever identical.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href="#catalog" style={{ background: palette.black, color: palette.cream }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full">
                Shop all scoops
              </a>
              <a href="#how" style={{ borderColor: "var(--brand-ink)", color: "var(--brand-ink)" }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full border-2">
                How scooping works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }} className="sticky top-[57px] z-40 bg-[color:var(--tw-bg,inherit)] py-4">
        <div className="max-w-[1180px] mx-auto px-8 flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-2.5 flex-wrap">
            {filters.map((f, i) => (
              <span
                key={f}
                style={i === 0 ? { background: palette.black, color: palette.cream, borderColor: palette.black } : { borderColor: "rgba(17,17,17,0.18)" }}
                className="text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full border"
              >
                {f}
              </span>
            ))}
          </div>
          <span className="text-sm font-semibold text-neutral-600">Sort: Trending ▾</span>
        </div>
      </div>

      {/* Product grid */}
      <section id="catalog" className="py-14">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scoops.map((scoop) => (
              <div key={scoop.name} style={{ borderColor: "rgba(17,17,17,0.08)" }} className="bg-[--cream] border rounded-[20px] overflow-hidden">
                <div style={{ background: scoop.swatch }} className="relative aspect-square flex items-center justify-center p-5">
                  <span
                    style={{ background: palette.cream }}
                    className="absolute top-3.5 left-3.5 border-2 border-dashed rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                  >
                    {scoop.badge}
                  </span>
                  <Image src={scoopful.logo} alt="" width={64} height={64} className="object-contain opacity-90" />
                </div>
                <div className="p-5">
                  <h4 className="text-sm font-bold mb-1.5">{scoop.name}</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed mb-3">{scoop.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">
                      {scoop.was && <span className="font-normal text-neutral-400 line-through mr-1.5 text-xs">{scoop.was}</span>}
                      {scoop.price}
                    </span>
                    <button
                      style={{ background: palette.black, color: palette.cream }}
                      className="text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full"
                    >
                      Add to bag
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: palette.black, color: palette.cream }} className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <span style={{ color: palette.gold }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
            Scoop. Surprise. Smile.
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-10 max-w-xl">How scooping works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div key={step.n} style={{ borderColor: "rgba(250,248,244,0.16)" }} className="border rounded-2xl p-6">
                <div style={{ color: palette.blush }} className="font-black text-sm mb-3.5">{step.n}</div>
                <h4 className="text-base font-extrabold uppercase mb-2">{step.title}</h4>
                <p className="text-sm text-neutral-300 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-sell back to Funkful */}
      <section className="py-16">
        <div className="max-w-[1180px] mx-auto px-8">
          <div style={{ background: palette.beige }} className="rounded-3xl p-11 flex items-center justify-between gap-8 flex-wrap">
            <div>
              <span
                style={{ background: palette.sage, color: "#1c2617" }}
                className="inline-block text-[11.5px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full mb-3.5"
              >
                🛍️ One cart, every brand
              </span>
              <h3 className="text-xl font-extrabold uppercase mb-2 max-w-sm">Pair your scoop with a custom Funkful gift</h3>
              <p className="text-sm text-neutral-600 max-w-md leading-relaxed">
                Add a personalized mug or tumbler to the same order — it all ships and checks out together.
              </p>
            </div>
            <Link href="/#custom" style={{ background: palette.black, color: palette.cream }} className="font-bold text-xs uppercase tracking-wide px-6.5 py-4 rounded-full">
              Shop Funkful Originals
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: palette.beige }} className="pt-12 pb-7">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
            <Image src={funkful.logo} alt="Funkful" width={120} height={28} className="h-7 w-auto" />
            <div className="flex gap-7 text-sm font-semibold">
              <Link href="/#custom">Funkful</Link>
              <span style={{ color: "var(--brand-ink)" }}>Scoopful</span>
              <Link href="/#anime">Anime Box</Link>
              <Link href="/#about">About</Link>
            </div>
          </div>
          <div style={{ borderColor: "rgba(17,17,17,0.1)" }} className="border-t pt-5 flex justify-between text-xs text-neutral-600 flex-wrap gap-2.5">
            <span>© 2026 Funkful (Pty) Ltd. All rights reserved.</span>
            <span>funkful.co.za</span>
          </div>
        </div>
      </footer>
    </>
  );
}
