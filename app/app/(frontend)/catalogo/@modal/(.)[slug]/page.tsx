import { notFound } from "next/navigation";
import { buscarEspeciePorSlug, listarFotosDaEspecie } from "@/lib/catalogo.ts";
import { listarRevisoesDaEspecie } from "@/lib/wiki.ts";
import { DetalheEspecie } from "@/components/catalogo/DetalheEspecie.tsx";
import { ModalDaEspecie } from "@/components/catalogo/ModalDaEspecie.tsx";

export default async function EspecieModal({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const especie = await buscarEspeciePorSlug((await params).slug);
  if (!especie) notFound();

  const [revisoes, fotos] = await Promise.all([
    listarRevisoesDaEspecie(especie.id),
    listarFotosDaEspecie(especie.id),
  ]);

  return (
    <ModalDaEspecie
      titulo={especie.nomeComum}
      destino={`/catalogo/${especie.slug}`}
    >
      <DetalheEspecie especie={especie} revisoes={revisoes} fotos={fotos} />
    </ModalDaEspecie>
  );
}
