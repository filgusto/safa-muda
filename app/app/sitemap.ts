import type { MetadataRoute } from "next";
import { listarSlugs } from "@/lib/catalogo.ts";

// Reads NEXT_PUBLIC_SERVER_URL at request time — must not be pre-rendered at build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "";
  const agora = new Date();

  // O catálogo é público: cada ficha de espécie entra no mapa do site.
  const slugs = await listarSlugs().catch(() => []);

  return [
    {
      url: baseUrl,
      lastModified: agora,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/safdex`,
      lastModified: agora,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...slugs.map((slug) => ({
      url: `${baseUrl}/safdex/${slug}`,
      lastModified: agora,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/termos`,
      lastModified: agora,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: agora,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
