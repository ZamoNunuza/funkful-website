import type { MetadataRoute } from "next";

const siteUrl = "https://funkful.co.za";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/account/",
        "/checkout/",
        "/cart/",
        "/quote/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
