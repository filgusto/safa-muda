import { notFound } from "next/navigation";
import {
  buscarEspeciePorSlug,
  escolherFotoPrincipal,
  listarFotosDaEspecie,
} from "@/lib/catalogo.ts";
import { listarRevisoesDaEspecie } from "@/lib/wiki.ts";
import {
  DetalheEspecie,
  IdentidadeDaEspecie,
} from "@/components/catalogo/DetalheEspecie.tsx";
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
  const fotoPrincipal = escolherFotoPrincipal(fotos);

  return (
    <ModalDaEspecie
      titulo={especie.nomeComum}
      destino={`/safdex/${especie.slug}`}
      slug={especie.slug}
      cabecalho={<IdentidadeDaEspecie especie={especie} />}
      fotoDeFundo={fotoPrincipal}
    >
      <DetalheEspecie
        especie={especie}
        revisoes={revisoes}
        fotos={fotos}
        comCabecalho={false}
      />
    </ModalDaEspecie>
  );
}
