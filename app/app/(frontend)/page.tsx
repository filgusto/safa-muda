import { redirect } from "next/navigation";

/**
 * Só o catálogo está pronto para produção; o planejador de projetos ainda
 * não. Enquanto isso não muda, a raiz manda direto para o SAFdex em vez de
 * mostrar uma landing page para um produto que a pessoa ainda não pode usar.
 */
export default function Home() {
  redirect("/safdex");
}
