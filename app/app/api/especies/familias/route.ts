import { NextResponse } from "next/server";
import { listarFamilias } from "@/lib/catalogo.ts";

/**
 * Famílias do catálogo, com contagem — alimenta os chips de filtro da gaveta
 * de plantas, que é client-side e por isso não tem como chamar o banco.
 *
 * Leitura pública, como o resto do catálogo.
 */
export async function GET() {
  return NextResponse.json(await listarFamilias());
}
