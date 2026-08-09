/**
 * Provedores de mapa de fundo.
 *
 * Nenhum exige chave de API para a aplicação subir — requisito de um projeto
 * open-source que qualquer pessoa deve conseguir rodar (docs/PLANO.md §4).
 *
 * O provedor de satélite é opcional e vem por variável de ambiente: imagens
 * aéreas têm termos de uso que variam por provedor, e escolher um por padrão
 * imporia essa decisão a quem hospeda. Sem a variável, o modo satélite fica
 * indisponível e a interface explica o porquê.
 */

export interface ProvedorDeMapa {
  id: string;
  rotulo: string;
  url: string;
  atribuicao: string;
  zoomMaximo: number;
}

export const OPEN_STREET_MAP: ProvedorDeMapa = {
  id: "osm",
  rotulo: "Mapa",
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  atribuicao: "© colaboradores do OpenStreetMap",
  zoomMaximo: 19,
};

export function provedoresDisponiveis(): ProvedorDeMapa[] {
  const provedores = [OPEN_STREET_MAP];

  const urlDoSatelite = process.env.NEXT_PUBLIC_SATELLITE_TILE_URL;
  if (urlDoSatelite) {
    provedores.push({
      id: "satelite",
      rotulo: "Satélite",
      url: urlDoSatelite,
      atribuicao:
        process.env.NEXT_PUBLIC_SATELLITE_ATTRIBUTION ??
        "Imagem de satélite do provedor configurado",
      zoomMaximo: Number(process.env.NEXT_PUBLIC_SATELLITE_MAX_ZOOM ?? 19),
    });
  }

  return provedores;
}

export const SATELITE_CONFIGURADO = Boolean(
  process.env.NEXT_PUBLIC_SATELLITE_TILE_URL,
);
