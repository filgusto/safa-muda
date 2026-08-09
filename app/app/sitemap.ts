import type { MetadataRoute } from "next";

// Reads NEXT_PUBLIC_SERVER_URL at request time — must not be pre-rendered at build.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
