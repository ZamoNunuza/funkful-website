import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const siteUrl = "https://funkful.co.za";
const weekly = ["/", "/originals", "/scoopful", "/shop"];
const monthly = [
  "/about",
  "/contact",
  "/faq",
  "/shipping",
  "/returns",
  "/terms-and-conditions",
  "/privacy-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    ...weekly.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : path === "/scoopful" || path === "/originals" ? 0.9 : 0.8,
    })),
    ...monthly.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "/about" ? 0.7 : 0.5,
    })),
  ];

  try {
    const supabase = createAdminClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true)
      .not("slug", "is", null);

    if (error || !products) return staticPages;

    const productPages: MetadataRoute.Sitemap = products
      .filter((product) => typeof product.slug === "string" && product.slug.length > 0)
      .map((product) => ({
        url: `${siteUrl}/products/${encodeURIComponent(product.slug)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...staticPages, ...productPages];
  } catch {
    // Keep the public sitemap available even if the product database is temporarily unavailable.
    return staticPages;
  }
}
