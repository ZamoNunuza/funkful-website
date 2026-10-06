// src/app/page.tsx

import Image from "next/image";
import Link from "next/link";
import { brands, palette } from "@/lib/brands";
import Newsletter from "@/components/Newsletter/Newsletter";

export const metadata = {
  title: "Funkful — Made With Personality",
  description:
    "Personalized gifts, made-to-order products and mystery scoops from Funkful and Scoopful by Funkful.",
};

const shopDestinations = [
  {
    eyebrow: "Funkful Originals",
    title: "Make it yours.",
    description:
      "Personalized mugs, apparel and custom-made gifts designed around your personality.",
    href: "/products",
    accent: palette.beige,
    label: "Shop Funkful Originals →",
  },
  {
    eyebrow: "Scoopful by Funkful",
    title: "Expect the unexpected.",
    description:
      "Mystery scoops, surprise finds and a whole lot of unboxing fun.",
    href: brands.scoopful.href,
    accent: palette.lavender,
    label: "Explore Scoopful →",
  },
];

const reasons = [
  {
    number: "01",
    title: "Made with personality",
    body: "Funkful is about turning everyday products into something that feels uniquely yours.",
  },
  {
    number: "02",
    title: "Made to order",
    body: "Many of our products are created specifically for you, from the design to the final finish.",
  },
  {
    number: "03",
    title: "Personalisation matters",
    body: "Names, designs, fandoms and little details are what turn a product into your product.",
  },
  {
    number: "04",
    title: "Packed with care",
    body: "Every order is prepared with the same attention to detail we put into the product itself.",
  },
];

export default function HomePage() {
  const funkful = brands.funkful;
  const scoopful = brands.scoopful;

  return (
    <main
      style={{
        background: palette.cream,
        color: palette.black,
      }}
      className="font-sans"
    >
      {/* Announcement bar */}
      <div
        style={{
          background: palette.gold,
          color: "#3e2f0d",
        }}
        className="text-center py-2.5 px-4 text-xs sm:text-sm font-medium"
      >
        ✨ Personalized gifts, custom products & mystery scoops — made with
        personality.
      </div>

      {/* Hero */}
      <section className="max-w-[1180px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-12 md:gap-16 items-center">
          <div>
            <div className="flex gap-2.5 flex-wrap mb-6">
              <span
                style={{
                  borderColor: "rgba(17,17,17,0.3)",
                }}
                className="border-2 border-dashed rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider"
              >
                South Africa 🇿🇦
              </span>

              <span
                style={{
                  background: palette.blush,
                }}
                className="border-2 border-dashed border-black/10 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider"
              >
                Made with personality
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase leading-[0.98] tracking-tight mb-6">
              Make it
              <br />
              <span style={{ color: palette.orange || "#D8741F" }}>
                personal.
              </span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed max-w-xl mb-8 text-neutral-700">
              Personalized gifts, custom products and a little bit of
              mystery — all made to bring more personality into the everyday.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Link href="/products" className="btn primary">
                Shop Funkful Originals
              </Link>

              <Link href={scoopful.href} className="btn secondary">
                Explore Scoopful
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-xs font-bold uppercase tracking-wide text-neutral-500">
              <span>✓ Personalized</span>
              <span>✓ Made to order</span>
              <span>✓ Packed with care</span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative min-h-[380px] md:min-h-[460px] flex items-center justify-center">
            <div
              style={{
                background: palette.black,
              }}
              className="absolute w-[75%] aspect-square rounded-[32px] rotate-[-6deg] shadow-xl"
            />

            <div
              style={{
                background: palette.beige,
              }}
              className="absolute w-[68%] aspect-square rounded-[30px] rotate-[6deg] shadow-2xl flex items-center justify-center p-8"
            >
              <div className="text-center">
                <Image
                  src={funkful.logo}
                  alt="Funkful"
                  width={260}
                  height={260}
                  className="w-[190px] sm:w-[230px] h-auto object-contain mx-auto"
                />

                <p
                  style={{
                    color: palette.black,
                  }}
                  className="mt-5 text-xs font-bold uppercase tracking-[0.18em]"
                >
                  Made With Personality
                </p>
              </div>
            </div>

            <span
              style={{
                background: palette.gold,
                color: "#3e2f0d",
              }}
              className="absolute top-[5%] right-[1%] sm:right-[4%] rotate-[7deg] border-2 border-dashed border-black/30 rounded-full px-4 py-2 text-[11px] font-black uppercase"
            >
              Personalize it ✨
            </span>

            <span
              style={{
                background: palette.sage,
                color: "#1c2617",
              }}
              className="absolute bottom-[5%] left-[0%] sm:left-[2%] rotate-[-8deg] border-2 border-dashed border-black/20 rounded-full px-4 py-2 text-[11px] font-black uppercase"
            >
              Made for you
            </span>
          </div>
        </div>
      </section>

      {/* Shop destinations */}
      <section
        style={{
          background: palette.black,
          color: palette.cream,
        }}
        className="py-20 md:py-24"
      >
        <div className="max-w-[1180px] mx-auto px-6 md:px-8">
          <div className="max-w-2xl mb-12">
            <span
              style={{
                color: palette.gold,
              }}
              className="text-xs font-bold uppercase tracking-[0.14em] block mb-2.5"
            >
              Choose your kind of fun
            </span>

            <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight">
              Shop Funkful
            </h2>

            <p className="mt-4 text-neutral-300 max-w-xl leading-relaxed">
              Two ways to find something you&apos;ll love. Shop personalized
              and made-to-order products through Funkful Originals, or head
              over to Scoopful for a little mystery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {shopDestinations.map((destination) => (
              <Link
                key={destination.title}
                href={destination.href}
                style={{
                  background: destination.accent,
                  color: "#171717",
                }}
                className="group rounded-[28px] p-8 md:p-10 min-h-[310px] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                    {destination.eyebrow}
                  </span>

                  <h3 className="text-3xl md:text-4xl font-black uppercase mt-4 leading-tight">
                    {destination.title}
                  </h3>

                  <p className="text-sm md:text-base leading-relaxed mt-4 max-w-[420px] opacity-75">
                    {destination.description}
                  </p>
                </div>

                <span className="text-xs font-black uppercase tracking-wide mt-8">
                  {destination.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Funkful Originals */}
      <section className="py-20 md:py-24">
        <div className="max-w-[1180px] mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-[0.85fr_1.15fr] gap-12 md:gap-16 items-center">
            <div
              style={{
                background: palette.beige,
              }}
              className="rounded-[30px] min-h-[380px] flex items-center justify-center p-10 relative overflow-hidden"
            >
              <div
                style={{
                  borderColor: "rgba(17,17,17,0.15)",
                }}
                className="absolute inset-6 border-2 border-dashed rounded-[24px]"
              />

              <div className="relative text-center">
                <Image
                  src={funkful.logo}
                  alt="Funkful Originals"
                  width={280}
                  height={280}
                  className="w-[190px] sm:w-[230px] h-auto object-contain mx-auto"
                />

                <p className="font-black uppercase text-sm mt-5">
                  Funkful Originals
                </p>
              </div>
            </div>

            <div>
              <span
                style={{
                  color: "#8a4a45",
                }}
                className="text-xs font-bold uppercase tracking-[0.14em] block mb-3"
              >
                Funkful Originals
              </span>

              <h2 className="text-3xl md:text-5xl font-black uppercase leading-[1.02] mb-5">
                Everyday things.
                <br />
                <span style={{ color: "#D8741F" }}>Your way.</span>
              </h2>

              <p className="text-neutral-600 leading-relaxed max-w-xl mb-6">
                Funkful Originals is our personalized and made-to-order
                collection. Browse the catalogue, use the available filters
                to find what you&apos;re looking for, then choose a product
                and make it yours.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex gap-3 items-start">
                  <span className="font-black">01</span>
                  <p className="text-sm text-neutral-600">
                    Browse Funkful Originals.
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="font-black">02</span>
                  <p className="text-sm text-neutral-600">
                    Use the catalogue filters to find your product.
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="font-black">03</span>
                  <p className="text-sm text-neutral-600">
                    Personalize it and let us create it for you.
                  </p>
                </div>
              </div>

              <Link href="/products" className="btn primary">
                Browse Funkful Originals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Scoopful */}
      <section
        style={{
          background: palette.blush,
        }}
        className="py-20 md:py-24"
      >
        <div className="max-w-[1180px] mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              <span
                style={{
                  color: "#8a4a45",
                }}
                className="text-xs font-bold uppercase tracking-[0.14em] block mb-3"
              >
                Scoopful by Funkful
              </span>

              <h2 className="text-3xl md:text-5xl font-black uppercase leading-[1.02] mb-5">
                You never know
                <br />
                <span style={{ color: "#6d3430" }}>
                  what you&apos;ll get.
                </span>
              </h2>

              <p className="text-neutral-700 leading-relaxed max-w-xl mb-7">
                Scoopful brings the surprise back to shopping. Mystery
                scoops, unexpected finds and an unboxing experience designed
                to make opening your order part of the fun.
              </p>

              <Link
                href={scoopful.href}
                className="inline-flex items-center justify-center rounded-full bg-black text-white px-6 py-3.5 text-xs font-black uppercase tracking-wide transition-transform duration-200 hover:-translate-y-0.5"
              >
                Explore Scoopful
              </Link>
            </div>

            <div className="relative flex items-center justify-center min-h-[320px]">
              <div
                style={{
                  background: palette.black,
                }}
                className="absolute w-[270px] h-[270px] rounded-[32px] rotate-[-7deg] shadow-xl"
              />

              <div
                style={{
                  background: palette.cream,
                }}
                className="relative w-[245px] h-[245px] rounded-[30px] rotate-[5deg] flex items-center justify-center p-8 shadow-2xl"
              >
                <Image
                  src={scoopful.logo}
                  alt="Scoopful by Funkful"
                  width={220}
                  height={220}
                  className="w-[170px] h-auto object-contain"
                />
              </div>

              <span
                style={{
                  background: palette.gold,
                  color: "#3e2f0d",
                }}
                className="absolute bottom-[3%] right-[3%] rotate-[8deg] border-2 border-dashed border-black/20 rounded-full px-4 py-2 text-[10px] font-black uppercase"
              >
                Mystery inside 🎁
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Funkful */}
      <section
        style={{
          background: palette.beige,
        }}
        className="py-20 md:py-24"
      >
        <div className="max-w-[1180px] mx-auto px-6 md:px-8">
          <div className="max-w-2xl mb-12">
            <span
              style={{
                color: "#8a4a45",
              }}
              className="text-xs font-bold uppercase tracking-[0.14em] block mb-3"
            >
              Why Funkful?
            </span>

            <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight">
              It&apos;s the little details.
            </h2>

            <p className="mt-4 text-neutral-700 max-w-xl leading-relaxed">
              We believe the best gifts aren&apos;t just things. They&apos;re
              the little details that make someone say, &ldquo;This was made
              for me.&rdquo;
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reasons.map((reason) => (
              <div
                key={reason.number}
                style={{
                  background: palette.cream,
                }}
                className="rounded-2xl p-6"
              >
                <span
                  style={{
                    color: "#8a4a45",
                  }}
                  className="text-xs font-black"
                >
                  {reason.number}
                </span>

                <h3 className="font-black uppercase text-base mt-5 mb-2">
                  {reason.title}
                </h3>

                <p className="text-sm text-neutral-600 leading-relaxed">
                  {reason.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: palette.black,
          color: palette.cream,
        }}
        className="py-20 md:py-24"
      >
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <span
            style={{
              color: palette.gold,
            }}
            className="text-xs font-bold uppercase tracking-[0.14em] block mb-3"
          >
            Ready when you are
          </span>

          <h2 className="text-4xl md:text-6xl font-black uppercase leading-[1.02]">
            Find something
            <br />
            <span style={{ color: palette.blush }}>
              that feels like you.
            </span>
          </h2>

          <p className="text-neutral-300 max-w-xl mx-auto mt-5 mb-8 leading-relaxed">
            Browse Funkful Originals for personalized products, or head over
            to Scoopful for something completely unexpected.
          </p>

          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/products" className="btn shopMain">
              Shop Funkful Originals
            </Link>

            <Link href={scoopful.href} className="btn shopMain">
              Shop Scoopful
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <Newsletter />
    </main>
  );
}