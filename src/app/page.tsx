// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { brands, palette, navLinks } from "@/lib/brands";

export const metadata = {
  title: "Funkful — Made With Personality",
  description:
    "Custom mugs, tumblers and apparel, plus Scoopful mystery scoops. One cart, every brand.",
};

const trendingProducts = [
  { brand: "funkful", name: "Personalized Name Mug", price: "From R199", thumbLabel: "Custom Mug" },
  { brand: "scoopful", name: "Lucky Scoop — BestSeller", price: "From R159", thumbLabel: "Mystery Scoop" },
  { brand: "funkful", name: "Insulated Tumbler, 500ml", price: "From R289", thumbLabel: "Custom Tumbler" },
  { brand: "scoopful", name: "VIP Premium Scoop Box", price: "From R399", thumbLabel: "VIP Scoop" },
];

const experienceItems = [
  { label: "Thank you", title: "Hand-signed card", body: "Printed on soft beige matte board, signed for every single order." },
  { label: "Loyalty", title: "Next-order QR", body: "Scan for a discount that carries lifetime value back to your next scoop or gift." },
  { label: "Sticker", title: "Die-cut sub-brand sticker", body: "Bold, laptop-and-bottle-ready — wear whichever brand you scooped." },
  { label: "Review", title: "WhatsApp rating", body: "One QR scan lands you straight on our WhatsApp review system." },
];

export default function HomePage() {
  const funkful = brands.funkful;
  const scoopful = brands.scoopful;
  const animeBox = brands["anime-box"];

  return (
    <main style={{ background: palette.cream, color: palette.black }} className="font-sans">
      {/* Announcement bar */}
      <div style={{ background: palette.gold }} className="text-center py-2.5 px-4 text-sm">
        ✂️ <b>Free die-cut sticker</b> + loyalty QR card on every order — no matter which brand you scoop from
      </div>

      {/* Header */}
      <header style={{ background: palette.cream, borderBottom: "1px solid rgba(17,17,17,0.08)" }} className="sticky top-0 z-50 bg-[--brand-bg,inherit]">
        <div className="max-w-[1180px] mx-auto px-8 flex items-center justify-between py-4">
          <Link href="/">
            <Image src={funkful.logo} alt="Funkful" width={110} height={26} className="w-auto" />
          </Link>
          <nav className="hidden md:flex gap-9">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: link.soon ? "#7d6da3" : palette.black }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <span>Search</span>
            <span>Account</span>
            <span>
              Bag{" "}
              <span className="cart-dot"> 2 </span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <div className="flex gap-2.5 flex-wrap mb-6">
              <span
                style={{ borderColor: "rgba(17,17,17,0.35)" }}
                className="sticker border-2 border-dashed rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                South Africa 🇿🇦
              </span>
              <span
                style={{ background: palette.blush}}
                className="sticker blush border-2 border-dashed rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                Every scoop is different
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase leading-[1.02] mb-5">
              Made with <span style={{ color: palette.blush }}>personality</span>
            </h1>
            <p className="text-lg leading-relaxed max-w-md mb-8 text-neutral-700">
              Custom mugs, tumblers and apparel — plus mystery scoops that turn an ordinary order into
              a shared, viral unboxing moment. One cart. Two kinds of joy.
            </p>
            <div className="flex gap-3.5 flex-wrap">
              <Link href={funkful.href} className="btn primary">
                Design your gift
              </Link>
              <Link href={scoopful.href} className="btn secondary">
                Get a scoop
              </Link>
            </div>
          </div>

          <div className="hero-visual relative flex items-center justify-center">
            <div className="relative w-full max-w-[380px] aspect-square">
              <div style={{ background: palette.beige }} className="box-card absolute rounded-[22px] w-[78%] h-[78%] top-0 left-0 -rotate-6 shadow-xl p-5">
                <span className="tag font-extrabold uppercase" style={{ color: "#5b4a2f" }}>
                  Funkful Originals
                  <br />
                  Packed with love
                </span>
              </div>
              <div style={{ background: palette.blush }} className="absolute rounded-[22px] w-[70%] h-[70%] bottom-0 right-0 rotate-8 shadow-xl p-5 flex flex-col justify-end">
                <Image src={scoopful.logo} alt="" width={1000} height={1000} className="mb-2 object-contain" />
                <span className="font-extrabold text-center text-xs uppercase" style={{ color: "#5b2f2b" }}>
                  Your scoop awaits
                </span>
              </div>
            </div>
            <span
              style={{ background: palette.gold, color: "#3e2f0d" }}
              className="sticker gold absolute top-[6%] right-[2%] border-2 border-dashed rounded-full px-4 py-2 text-xs font-bold uppercase">
              VIP scoop inside
            </span>
            <span
              style={{ background: palette.sage, color: "#1c2617" }}
              className="sticker sage absolute bottom-[10%] left-[-4%] rotate-[9deg] border-2 border-dashed rounded-full px-4 py-2 text-xs font-bold uppercase">
              Hand-signed card
            </span>
          </div>
        </div>
      </section>

      {/* Brand split */}
      <section id="custom" style={{ background: palette.black, color: palette.cream }} className="py-20 md:py-24">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-xl mb-12">
            <span style={{ color: palette.gold }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
              One roof, two worlds
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase leading-tight">Pick your kind of happy</h2>
            <p className="mt-3.5 text-neutral-300">
              Funkful and Scoopful live in the same cart and the same box system — but they&apos;re built for two
              very different moods.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-7">
            {[funkful, scoopful].map((brand) => (
              <Link
                key={brand.slug}
                href={brand.href}
                style={{ background: brand.accent, color: brand.accentInk }}
                className="rounded-[26px] p-10 min-h-\[400px\] flex flex-col justify-between relative overflow-hidden"
              >
                <Image
                  src={brand.logo}
                  alt=""
                  width={96}
                  height={96}
                  className="absolute right-7 bottom-7 object-contain opacity-90"
                />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide opacity-70">{brand.eyebrow}</span>
                  <h3 className="text-3xl font-black uppercase my-3 leading-tight">{brand.name}</h3>
                  <p className="text-sm leading-relaxed max-w-xs opacity-85">{brand.description}</p>
                </div>
                <span className="font-bold text-xs uppercase tracking-wide mt-7">
                  {brand.slug === "funkful" ? "Shop personalized gifts →" : "Shop mystery scoops →"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Unboxing experience */}
      <section style={{ background: palette.beige }} className="py-20 md:py-24">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-xl mb-12">
            <span style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
              The 5-star unboxing system
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase leading-tight">Unboxing is the product</h2>
            <p className="mt-3.5 text-neutral-700">
              Every order — Funkful or Scoopful — leaves headquarters carrying the same four rituals.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {experienceItems.map((item) => (
              <div key={item.title} style={{ background: palette.cream }} className="rounded-2xl p-6">
                <span className="border-2 border-dashed rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide inline-block mb-4">
                  {item.label}
                </span>
                <h4 className="font-extrabold text-base uppercase mb-2">{item.title}</h4>
                <p className="text-sm text-neutral-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending / unified cart */}
      <section className="py-20 md:py-24">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <div>
              <span style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
                Across the ecosystem
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold uppercase leading-tight">Trending right now</h2>
            </div>
            <span
              style={{ background: palette.sage, color: "#1c2617" }}
              className="text-xs font-bold uppercase tracking-wide px-4.5 py-2.5 rounded-full"
            >
              🛍️ Mix brands, one checkout
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingProducts.map((product) => {
              const brand = brands[product.brand as "funkful" | "scoopful"];
              return (
                <div
                  key={product.name}
                  style={{ borderColor: "rgba(17,17,17,0.08)" }}
                  className="bg-white border rounded-2xl overflow-hidden"
                >
                  <div
                    style={{ background: brand.accent, color: brand.accentInk }}
                    className="aspect-square flex items-center justify-center font-extrabold text-xs uppercase text-center p-4"
                  >
                    {product.thumbLabel}
                  </div>
                  <div className="p-4">
                    <span style={{ color: "#8a4a45" }} className="text-[10.5px] font-bold uppercase tracking-wide block mb-1.5">
                      {brand.name === funkful.name ? "Funkful" : "Scoopful"}
                    </span>
                    <h5 className="text-sm font-semibold mb-1">{product.name}</h5>
                    <span className="text-sm text-neutral-600">{product.price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Anime Box teaser */}
      <section id="anime" style={{ background: palette.lavender }} className="py-16">
        <div className="max-w-[1180px] mx-auto px-8 flex items-center justify-between gap-10 flex-wrap">
          <div className="max-w-xl">
            <span style={{ color: "#4a3b7a" }} className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5">
              {animeBox.eyebrow} — coming soon
            </span>
            <h2 style={{ color: "#241a45" }} className="text-2xl md:text-4xl font-black uppercase leading-tight mb-3">
              Something for the anime fans is brewing
            </h2>
            <p style={{ color: "#3d3166" }} className="text-sm leading-relaxed max-w-md">
              {animeBox.description}
            </p>
            <form className="flex gap-2.5 mt-6 flex-wrap">
              <input
                type="email"
                placeholder="your@email.com"
                style={{ borderColor: "#241a45", color: "#241a45" }}
                className="border-2 bg-transparent rounded-full px-5 py-3 text-sm min-w-55"
              />
              <button
                type="submit"
                style={{ background: "#241a45", color: palette.lavender }}
                className="font-extrabold text-xs uppercase tracking-wide rounded-full px-6 py-3.5"
              >
                Notify me
              </button>
            </form>
          </div>
          <div
            style={{ background: "#241a45", color: palette.lavender }}
            className="w-\[190px\] h-\[190px\] rounded-full flex items-center justify-center text-center font-extrabold text-sm uppercase leading-relaxed p-5 shrink-0 relative"
          >
            <span style={{ borderColor: "rgba(207,197,232,0.5)" }} className="absolute inset-3.5 border-2 border-dashed rounded-full" />
            Anime Box
            <br />
            by Funkful
            <br />— soon —
          </div>
        </div>
      </section>

      {/* Founder story */}
      <section id="about" className="py-20 md:py-24">
        <div className="max-w-[1180px] mx-auto px-8 grid md:grid-cols-[0.8fr_1.2fr] gap-14 items-center">
          <div
            style={{ background: palette.sage, color: "#22301c" }}
            className="rounded-3xl aspect-4/5 flex items-center justify-center font-extrabold uppercase text-sm text-center p-5"
          >
            Founder
            <br />
            Photo
          </div>
          <div>
            <blockquote className="text-2xl md:text-3xl font-bold leading-snug mb-5">
              &ldquo;What if shopping felt like opening a beautifully wrapped present every single time?&rdquo;
            </blockquote>
            <p className="text-sm text-neutral-600">— From the Scoopful origin story, Funkful (Pty) Ltd</p>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section style={{ background: palette.black, color: palette.cream }} className="py-20 text-center">
        <div className="max-w-[1180px] mx-auto px-8">
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-3.5">Get 10% off your first order</h2>
          <p className="text-neutral-300 mb-8">
            One list, every brand — personalized gifts, mystery scoops, and first dibs on Anime Box.
          </p>
          <form className="flex justify-center gap-2.5 flex-wrap">
            <input
              type="email"
              placeholder="your@email.com"
              style={{ borderColor: palette.cream, color: palette.cream }}
              className="border-2 bg-transparent rounded-full px-5.5 py-3.5 text-sm min-w-\[260px\]"
            />
            <button
              type="submit"
              style={{ background: palette.gold, color: "#3e2f0d" }}
              className="font-extrabold text-xs uppercase tracking-wide rounded-full px-7 py-4"
            >
              Join the family
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: palette.beige }} className="py-16 pt-16 pb-8">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 mb-12">
            <div>
              <Image src={funkful.logo} alt="Funkful" width={140} height={34} className="h-8.5 w-auto mb-3" />
              <p className="text-sm text-neutral-600 leading-relaxed max-w-xs">
                Creative gifts, surprises & custom products. Made with personality. South Africa 🇿🇦
              </p>
            </div>
            <div>
              <h5 className="text-xs font-extrabold uppercase tracking-wide mb-4">Funkful</h5>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">Custom Mugs</a>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">Custom Tumblers</a>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">Custom Apparel</a>
            </div>
            <div>
              <h5 className="text-xs font-extrabold uppercase tracking-wide mb-4">Scoopful</h5>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">Mystery Scoops</a>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">Lucky Scoops</a>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">VIP Boxes</a>
            </div>
            <div>
              <h5 className="text-xs font-extrabold uppercase tracking-wide mb-4">Company</h5>
              <a href="#about" className="block text-sm text-neutral-700 mb-2.5">About</a>
              <a href="#anime" className="block text-sm text-neutral-700 mb-2.5">Anime Box — Coming Soon</a>
              <a href="#" className="block text-sm text-neutral-700 mb-2.5">WhatsApp Us</a>
            </div>
          </div>
          <div
            style={{ borderColor: "rgba(17,17,17,0.12)" }}
            className="border-t pt-5 flex justify-between text-xs text-neutral-600 flex-wrap gap-2.5"
          >
            <span>© 2026 Funkful (Pty) Ltd. All rights reserved.</span>
            <span>funkful.co.za</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
