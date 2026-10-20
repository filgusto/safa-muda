import { NextResponse } from "next/server";
import { chavesDoCaptcha } from "@/lib/captcha.ts";

// A chave vem do ambiente em runtime; em build ela ainda não existe.
export const dynamic = "force-dynamic";

/**
 * Chave pública do CAPTCHA, para o formulário de cadastro saber se precisa
 * mostrar o desafio. Vem por rota — e não por prop ou NEXT_PUBLIC_* — porque
 * o cadastro também abre pelo menu, dentro de páginas geradas em build.
 */
export async function GET() {
  return NextResponse.json(
    { siteKey: chavesDoCaptcha()?.siteKey ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
