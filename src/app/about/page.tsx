import Link from "next/link";
import { brands, palette } from "@/lib/brands";

export const metadata = {
  title: "About Us | Funkful",
  description:
    "Learn more about Funkful — personalized gifts, made-to-order products, custom designs and Scoopful by Funkful.",
};

export default function AboutPage() {
  return (
    <main
      style={{
        background: palette?.cream ?? "#fff",
        color: palette?.black ?? "#111",
      }}
    >
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:px-8 lg:px-12">
        <div className="max-w-4xl">
          <p
            className="mb-4 text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: palette?.orange ?? "#D8741F" }}
          >
            About Funkful
          </p>

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Made With Personality.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70 sm:text-xl">
            Personalized gifts, made-to-order products, custom designs and
            plenty of fun — all created to add a little more personality to
            everyday moments.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="border-y border-black/10 bg-black/[0.025]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black sm:text-4xl">
                More than just a gift.
              </h2>

              <div className="mt-6 space-y-5 text-base leading-8 text-black/70">
                <p>
                  At Funkful, we believe the best gifts are the ones that feel
                  like they were made just for you.
                </p>

                <p>
                  Many of our products are made to order. That means your
                  product is prepared specifically for your order rather than
                  simply being picked from a shelf.
                </p>

                <p>
                  From personalized names and messages to creative designs and
                  special requests, we focus on the little details that turn an
                  ordinary product into something personal.
                </p>
              </div>
            </div>

            <div
              className="rounded-3xl p-8 shadow-sm sm:p-10"
              style={{
                background: palette?.orange ?? "#D8741F",
                color: "#fff",
              }}
            >
              <p className="text-sm font-bold uppercase tracking-[0.18em] opacity-80">
                The Funkful idea
              </p>

              <p className="mt-5 text-3xl font-black leading-tight">
                Your idea.
                <br />
                Your personality.
                <br />
                Your Funkful.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="max-w-2xl">
          <p
            className="text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: palette?.orange ?? "#D8741F" }}
          >
            What we do
          </p>

          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            A little bit of everything.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <FeatureCard
            icon="🎁"
            title="Personalized Gifts"
            description="Add names, messages, designs and personal touches to make a gift truly your own."
          />

          <FeatureCard
            icon="✨"
            title="Made-to-Order Products"
            description="Our made-to-order range is prepared after you place your order, allowing us to offer unique and personalized options."
          />

          <FeatureCard
            icon="🎨"
            title="Custom Creativity"
            description="Have an idea in mind? We love turning creative ideas, themes and special requests into physical products."
          />

          <FeatureCard
            icon="🍿"
            title="Mystery Scoops"
            description="Scoopful by Funkful brings a playful mystery experience where every scoop comes with a little surprise."
          />
        </div>
      </section>

      {/* Scoopful */}
      <section className="border-y border-black/10">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p
                className="text-sm font-bold uppercase tracking-[0.2em]"
                style={{ color: palette?.orange ?? "#D8741F" }}
              >
                Meet Scoopful
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                A little mystery goes a long way.
              </h2>
            </div>

            <div className="space-y-5 text-base leading-8 text-black/70">
              <p>
                <strong className="text-black">
                  Scoopful by Funkful
                </strong>{" "}
                is our playful mystery side.
              </p>

              <p>
                Instead of choosing exactly what you will receive, you get to
                enjoy the excitement of discovering what is inside your scoop.
              </p>

              <p>
                It is fun, unexpected and perfect for anyone who enjoys a
                little mystery.
              </p>

              <Link
                href="/scoopful"
                className="inline-flex rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{
                  background: palette?.orange ?? "#D8741F",
                }}
              >
                Explore Scoopful
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="max-w-2xl">
          <p
            className="text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: palette?.orange ?? "#D8741F" }}
          >
            Why Funkful?
          </p>

          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Shopping should feel personal.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <ValueCard
            title="Personal"
            text="Products that can reflect you, your people and your moments."
          />

          <ValueCard
            title="Creative"
            text="Designs and ideas that are not afraid to be different."
          />

          <ValueCard
            title="Fun"
            text="Because shopping for a gift — or treating yourself — should actually be enjoyable."
          />
        </div>
      </section>

      {/* Made for your moments */}
      <section
        className="mx-6 mb-16 rounded-3xl sm:mx-8 lg:mx-auto lg:max-w-6xl"
        style={{
          background: palette?.orange ?? "#D8741F",
          color: "#fff",
        }}
      >
        <div className="px-6 py-14 text-center sm:px-12 sm:py-16">
          <h2 className="text-3xl font-black sm:text-4xl">
            Made for your moments.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/85">
            Whether you are shopping for a birthday, celebration, special
            occasion, or simply looking for something that makes you smile,
            Funkful is here to help you find something memorable.
          </p>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/75">
            Some products are ready to ship, while others are created
            specifically for you. Either way, every order deserves the same
            attention to detail.
          </p>

          <div className="mt-8">
            <Link
              href="/products"
              className="inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
            >
              Shop Funkful
            </Link>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
        <p className="text-2xl font-black sm:text-3xl">
          Personalized gifts. Mystery scoops. And everything in between.
        </p>

        <p
          className="mt-4 text-xl font-black"
          style={{ color: palette?.orange ?? "#D8741F" }}
        >
          That&apos;s Funkful.
        </p>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
      <div className="text-3xl" aria-hidden="true">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-black">{title}</h3>

      <p className="mt-3 leading-7 text-black/65">{description}</p>
    </article>
  );
}

function ValueCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-3xl border border-black/10 p-7">
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-black/65">{text}</p>
    </article>
  );
}