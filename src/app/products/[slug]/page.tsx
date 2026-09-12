import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/lib/products";
import { brands, palette } from "@/lib/brands";
import AddToCart from "./add-to-cart";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.id === slug || p.id.replace(/[^a-z0-9-]/g, "-") === slug);
  if (!product) notFound();

  const brand = brands[product.brand];
  return (
    <main style={{ background: palette.cream, color: palette.black }} className="min-h-screen">
      <div className="max-w-[1180px] mx-auto px-8 pt-5 text-xs text-neutral-500">
        <Link href="/">Home</Link> / <Link href={brand.href}>{brand.name}</Link> / <span className="text-black">{product.name}</span>
      </div>
      <section className="max-w-[1180px] mx-auto px-8 py-12 grid md:grid-cols-2 gap-12 items-start">
        <div style={{ background: product.swatch }} className="aspect-square rounded-[28px] flex items-center justify-center p-12">
          <Image src={brand.logo} alt="" width={260} height={260} className="object-contain max-h-full" />
        </div>
        <div className="pt-2">
          {product.badge && <span style={{ background: palette.black, color: palette.cream }} className="inline-flex rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide mb-4">{product.badge}</span>}
          <p style={{ color: "#8a4a45" }} className="text-xs font-bold uppercase tracking-[0.14em] mb-2">{brand.name}</p>
          <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight mb-4">{product.name}</h1>
          <p className="text-sm text-neutral-600 leading-relaxed mb-7">{product.description}</p>
          <AddToCart product={product} />
          <div className="mt-8 border-t pt-6 text-xs text-neutral-600 leading-relaxed space-y-2">
            <p>✓ Secure checkout through Yoco</p>
            <p>✓ Free delivery on orders over R400</p>
            <p>✓ Your order is confirmed by our payment webhook before fulfilment</p>
          </div>
        </div>
      </section>
    </main>
  );
}
