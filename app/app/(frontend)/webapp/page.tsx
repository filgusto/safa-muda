import type { Metadata } from "next";
import { Painel } from "@/components/webapp/Painel.tsx";

export const metadata: Metadata = {
  title: "Webapp · Safa Muda",
  description: "Área de trabalho do Safa Muda — em construção.",
};

/**
 * Aplicação de página única. Cada bloco é um `Painel`, na mesma linguagem
 * visual do header.
 */
export default function WebappPage() {
  return (
    <div className="container mx-auto max-w-7xl px-3 py-3">
      <Painel titulo="Timeline" />
    </div>
  );
}
