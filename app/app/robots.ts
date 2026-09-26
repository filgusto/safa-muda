import type { MetadataRoute } from "next";

// Reads NEXT_PUBLIC_SERVER_URL at request time — must not be pre-rendered at build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "";
  return {
    rules: [
      {
        userAgent: "*",
        // Áreas privadas, de conta e a API fora dos índices de busca
        disallow: [
          "/admin",
          "/api/",
          "/conta",
          "/projetos",
          "/webapp",
          "/entrar",
          "/cadastro",
        ],
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
