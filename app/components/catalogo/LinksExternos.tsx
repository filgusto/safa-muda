import Image from "next/image";
import { Dica } from "@/components/ui/tooltip.tsx";

const CLASSE_DO_BOTAO =
  "shrink-0 rounded-md p-1.5 opacity-80 transition-opacity duration-240 hover:bg-bg-surface2 hover:opacity-100";

/**
 * Botões-ícone para a ficha no GBIF e no iNaturalist, ao lado dos outros
 * botões da moldura (editar, fechar). Os logos em `public/marcas/` vêm
 * direto dos sites, só com o fundo branco removido — mantém a identidade de
 * cada site em vez de um ícone genérico de link externo.
 */
export function LinksExternos({
  gbifId,
  inaturalistId,
}: {
  gbifId: number | null;
  inaturalistId: number | null;
}) {
  if (!gbifId && !inaturalistId) return null;

  return (
    <>
      {gbifId && (
        <Dica texto="Ver no GBIF">
          <a
            href={`https://www.gbif.org/species/${gbifId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver no GBIF"
            className={CLASSE_DO_BOTAO}
          >
            <Image src="/marcas/gbif.png" alt="" width={16} height={16} />
          </a>
        </Dica>
      )}
      {inaturalistId && (
        <Dica texto="Ver no iNaturalist">
          <a
            href={`https://www.inaturalist.org/taxa/${inaturalistId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver no iNaturalist"
            className={CLASSE_DO_BOTAO}
          >
            <Image
              src="/marcas/inaturalist.png"
              alt=""
              width={16}
              height={14}
            />
          </a>
        </Dica>
      )}
    </>
  );
}
