import { z } from "zod";
import { ESTRATOS, ESTRATO_LABEL } from "@/core/estratos.ts";
import {
  SUCESSOES,
  SUCESSAO_LABEL,
  SISTEMAS,
  SISTEMA_LABEL,
} from "@/core/sucessao.ts";
import { GRUPOS, GRUPO_LABEL } from "@/core/grupos.ts";
import { BIOMAS, BIOMA_LABEL } from "@/core/biomas.ts";
import {
  CICLOS_DE_VIDA,
  CICLO_DE_VIDA_LABEL,
  FRUTIFICACOES,
  FRUTIFICACAO_LABEL,
  HABITOS,
  HABITO_LABEL,
} from "@/core/ciclo.ts";
import {
  REBROTAS,
  REBROTA_LABEL,
  GEMAS_DE_REBROTA,
  GEMA_DE_REBROTA_LABEL,
} from "@/core/poda.ts";

/**
 * Definição única dos campos editáveis pela wiki.
 *
 * Formulário, validação, diff e aplicação do patch leem todos daqui. Sem isso,
 * acrescentar um campo exigiria lembrar de quatro lugares — e o esquecido
 * viraria um campo que o usuário edita mas que a moderação não mostra.
 */

export type TipoDeCampo =
  "texto" | "numero" | "enum" | "multi_enum" | "lista_texto";

export interface DefinicaoDeCampo {
  chave: string;
  rotulo: string;
  tipo: TipoDeCampo;
  opcoes?: { valor: string; rotulo: string }[];
  unidade?: string;
  ajuda?: string;
  /** Campos sem os quais uma espécie nova não faz sentido. */
  obrigatorioEmNova?: boolean;
  grupo:
    "identificacao" | "classificacao" | "cultivo" | "porte" | "observacoes";
}

const opcoes = <T extends string>(
  valores: readonly T[],
  rotulos: Record<T, string>,
) => valores.map((valor) => ({ valor, rotulo: rotulos[valor] }));

export const CAMPOS: DefinicaoDeCampo[] = [
  {
    chave: "nomeComum",
    rotulo: "Nome comum",
    tipo: "texto",
    grupo: "identificacao",
    obrigatorioEmNova: true,
  },
  {
    chave: "nomeCientifico",
    rotulo: "Nome científico",
    tipo: "texto",
    grupo: "identificacao",
    obrigatorioEmNova: true,
    ajuda: "Gênero em maiúscula, epíteto em minúscula. Ex.: Persea americana",
  },
  {
    chave: "familia",
    rotulo: "Família",
    tipo: "texto",
    grupo: "identificacao",
  },
  {
    chave: "sinonimos",
    rotulo: "Outros nomes",
    tipo: "lista_texto",
    grupo: "identificacao",
    ajuda: "Um por linha. A busca também encontra por eles.",
  },
  {
    chave: "gbifId",
    rotulo: "Link no GBIF",
    tipo: "texto",
    grupo: "identificacao",
    ajuda:
      "Cole a URL da espécie em gbif.org/species/… (ou só o número do ID). Conferimos se o link existe antes de aceitar a sugestão.",
  },
  {
    chave: "inaturalistId",
    rotulo: "Link no iNaturalist",
    tipo: "texto",
    grupo: "identificacao",
    ajuda:
      "Cole a URL do táxon em inaturalist.org/taxa/… (ou só o número do ID). Conferimos se o link existe antes de aceitar a sugestão.",
  },

  {
    chave: "estrato",
    rotulo: "Estrato",
    tipo: "enum",
    opcoes: opcoes(ESTRATOS, ESTRATO_LABEL),
    grupo: "classificacao",
  },
  {
    chave: "sucessao",
    rotulo: "Sucessão",
    tipo: "enum",
    opcoes: opcoes(SUCESSOES, SUCESSAO_LABEL),
    grupo: "classificacao",
  },
  {
    chave: "sistema",
    rotulo: "Sistema",
    tipo: "enum",
    opcoes: opcoes(SISTEMAS, SISTEMA_LABEL),
    grupo: "classificacao",
  },
  {
    chave: "grupos",
    rotulo: "Grupos",
    tipo: "multi_enum",
    opcoes: opcoes(GRUPOS, GRUPO_LABEL),
    grupo: "classificacao",
  },
  {
    chave: "biomas",
    rotulo: "Biomas",
    tipo: "multi_enum",
    opcoes: opcoes(BIOMAS, BIOMA_LABEL),
    grupo: "classificacao",
  },

  {
    chave: "diasParaColherMin",
    rotulo: "Dias para colher (mín.)",
    tipo: "numero",
    unidade: "dias",
    grupo: "cultivo",
  },
  {
    chave: "diasParaColherMax",
    rotulo: "Dias para colher (máx.)",
    tipo: "numero",
    unidade: "dias",
    grupo: "cultivo",
  },
  {
    chave: "espacamentoEntreLinhasMinM",
    rotulo: "Entre linhas (mín.)",
    tipo: "numero",
    unidade: "m",
    grupo: "cultivo",
  },
  {
    chave: "espacamentoEntreLinhasMaxM",
    rotulo: "Entre linhas (máx.)",
    tipo: "numero",
    unidade: "m",
    grupo: "cultivo",
  },
  {
    chave: "espacamentoNaLinhaMinM",
    rotulo: "Na linha (mín.)",
    tipo: "numero",
    unidade: "m",
    grupo: "cultivo",
  },
  {
    chave: "espacamentoNaLinhaMaxM",
    rotulo: "Na linha (máx.)",
    tipo: "numero",
    unidade: "m",
    grupo: "cultivo",
  },

  {
    chave: "alturaMaduraM",
    rotulo: "Altura madura",
    tipo: "numero",
    unidade: "m",
    grupo: "porte",
  },
  {
    chave: "cicloDeVida",
    rotulo: "Ciclo de vida",
    tipo: "multi_enum",
    opcoes: opcoes(CICLOS_DE_VIDA, CICLO_DE_VIDA_LABEL),
    grupo: "porte",
    ajuda:
      "O ciclo biológico, não o de cultivo. Marque mais de um se variar com o clima.",
  },
  {
    chave: "frutificacao",
    rotulo: "Frutificação",
    tipo: "enum",
    opcoes: opcoes(FRUTIFICACOES, FRUTIFICACAO_LABEL),
    grupo: "porte",
    ajuda:
      "Monocárpica: frutifica uma vez e aquela planta (ou haste, como na bananeira) morre.",
  },
  {
    chave: "habito",
    rotulo: "Hábito",
    tipo: "multi_enum",
    opcoes: opcoes(HABITOS, HABITO_LABEL),
    grupo: "porte",
    ajuda: "Forma de vida, como na Flora e Funga do Brasil.",
  },
  {
    chave: "longevidadeMinAnos",
    rotulo: "Longevidade (mín.)",
    tipo: "numero",
    unidade: "anos",
    grupo: "porte",
    ajuda:
      "Quanto vive, até a velhice, a planta que chega à fase adulta. Em touceiras (bananeira), a da touceira.",
  },
  {
    chave: "longevidadeMaxAnos",
    rotulo: "Longevidade (máx.)",
    tipo: "numero",
    unidade: "anos",
    grupo: "porte",
    ajuda: 'Deixe vazio se a fonte só diz "mais de N anos".',
  },
  {
    chave: "produtivaAPartirDeMeses",
    rotulo: "Produz a partir de",
    tipo: "numero",
    unidade: "meses",
    grupo: "porte",
  },

  {
    chave: "rebrota",
    rotulo: "Rebrota após corte",
    tipo: "enum",
    opcoes: opcoes(REBROTAS, REBROTA_LABEL),
    grupo: "porte",
    ajuda: "Se a planta volta depois de um corte drástico do tronco.",
  },
  {
    chave: "gemasDeRebrota",
    rotulo: "Rebrota de onde",
    tipo: "multi_enum",
    opcoes: opcoes(GEMAS_DE_REBROTA, GEMA_DE_REBROTA_LABEL),
    grupo: "porte",
    ajuda:
      "Onde ficam as gemas que rebrotam. Decide até onde a poda pode ir e de onde para baixo o corte elimina.",
  },

  {
    chave: "notas",
    rotulo: "Observações",
    tipo: "lista_texto",
    grupo: "observacoes",
    ajuda: "Uma por linha. Contexto regional, ressalvas, variedades.",
  },
];

export const CAMPOS_POR_CHAVE = new Map(
  CAMPOS.map((campo) => [campo.chave, campo]),
);

/**
 * Grupos que ainda não existem na lista, sugeridos pelo nome.
 *
 * `grupos` é um enum do banco: um grupo novo pede código (valor, rótulo) e
 * migration, então não há como a aprovação gravá-lo. A proposta o carrega à
 * parte para a equipe decidir se o cria; aprovar aplica o resto e ignora esta
 * chave (ver aplicar-proposta.ts).
 */
export const CHAVE_GRUPOS_PROPOSTOS = "gruposPropostos";

/**
 * Proveniência dos campos que o servidor completou sozinho numa proposta de
 * espécie nova, a partir de bases públicas (GBIF, iNaturalist, Flora e Funga
 * do Brasil, USDA PLANTS): { habito: "flora-e-funga-do-brasil", … }, com as
 * chaves no formato de `fontes` (snake_case).
 *
 * Não é campo de espécie e não faz parte de `camposDaEspecieSchema` — só o
 * servidor escreve, então ninguém declara uma fonte que não é a sua. Ao aprovar,
 * esses campos ficam com a fonte de origem em vez de `comunidade` (ver
 * aplicar-proposta.ts).
 */
export const CHAVE_FONTES_AUTOMATICAS = "fontesAutomaticas";

/**
 * As chaves de `fontes` seguem os nomes das COLUNAS (snake_case), herdados do
 * dataset original, enquanto os campos do schema são camelCase.
 * `nomeCientifico` → `nome_cientifico`, `espacamentoNaLinhaMinM` →
 * `espacamento_na_linha_min_m`.
 */
export function chaveDeFonte(chave: string): string {
  return chave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

/** Rótulo de uma chave de proposta, inclusive as que não são campo. */
export function rotuloDaChave(chave: string): string {
  if (chave === CHAVE_GRUPOS_PROPOSTOS) return "Grupos novos";
  return CAMPOS_POR_CHAVE.get(chave)?.rotulo ?? chave;
}

export const ROTULO_DO_GRUPO: Record<DefinicaoDeCampo["grupo"], string> = {
  identificacao: "Identificação",
  classificacao: "Classificação agroflorestal",
  cultivo: "Ciclo e espaçamento",
  porte: "Ciclo de vida e porte",
  observacoes: "Observações",
};

// ── Validação ────────────────────────────────────────────────────────────────

const textoOpcional = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .transform((valor) => (valor === "" ? null : valor));

const numeroOpcional = z.number().positive().nullable();

const listaDeTexto = z.array(z.string().trim().min(1).max(2000)).max(50);

/**
 * Campo de ID de táxon externo (GBIF, iNaturalist): aceita a URL colada ou só
 * o número, e confirma ao vivo que o ID existe antes de aceitar — colar um
 * link errado ou com o ID trocado não deve passar batido até a moderação.
 *
 * É `transform` assíncrono, e não `refine`: precisa poder trocar a URL pelo
 * ID numérico que de fato é gravado, não só validar o formato.
 */
function idDeTaxonExterno({
  padraoDaUrl,
  confirmarQueExiste,
  mensagemDeFormato,
  mensagemNaoEncontrado,
  mensagemFalhaDeRede,
}: {
  padraoDaUrl: RegExp;
  confirmarQueExiste: (id: number) => Promise<boolean>;
  mensagemDeFormato: string;
  mensagemNaoEncontrado: string;
  mensagemFalhaDeRede: string;
}) {
  return z
    .union([z.string(), z.number()])
    .nullable()
    .transform(async (valor, ctx) => {
      if (valor === null) return null;
      if (typeof valor === "number") return valor;

      const texto = valor.trim();
      if (texto === "") return null;

      let id: number;
      if (/^\d+$/.test(texto)) {
        id = Number(texto);
      } else {
        const combinacao = texto.match(padraoDaUrl);
        if (!combinacao) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: mensagemDeFormato,
          });
          return z.NEVER;
        }
        id = Number(combinacao[1]);
      }

      let existe: boolean;
      try {
        existe = await confirmarQueExiste(id);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: mensagemFalhaDeRede,
        });
        return z.NEVER;
      }
      if (!existe) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: mensagemNaoEncontrado,
        });
        return z.NEVER;
      }
      return id;
    });
}

async function idGbifExiste(id: number): Promise<boolean> {
  const resposta = await fetch(`https://api.gbif.org/v1/species/${id}`);
  return resposta.ok;
}

async function idINaturalistExiste(id: number): Promise<boolean> {
  const resposta = await fetch(`https://api.inaturalist.org/v1/taxa/${id}`);
  if (!resposta.ok) return false;
  const dados = (await resposta.json()) as { results?: unknown[] };
  return Array.isArray(dados.results) && dados.results.length > 0;
}

const gbifIdSchema = idDeTaxonExterno({
  padraoDaUrl: /gbif\.org\/species\/(\d+)/i,
  confirmarQueExiste: idGbifExiste,
  mensagemDeFormato:
    "Cole o link da espécie no GBIF (gbif.org/species/…) ou só o número do ID.",
  mensagemNaoEncontrado: "Não encontramos esse ID no GBIF — confira o link.",
  mensagemFalhaDeRede:
    "Não foi possível confirmar esse ID no GBIF agora. Tente de novo em instantes.",
});

const inaturalistIdSchema = idDeTaxonExterno({
  padraoDaUrl: /inaturalist\.org\/taxa\/(\d+)/i,
  confirmarQueExiste: idINaturalistExiste,
  mensagemDeFormato:
    "Cole o link do táxon no iNaturalist (inaturalist.org/taxa/…) ou só o número do ID.",
  mensagemNaoEncontrado:
    "Não encontramos esse ID no iNaturalist — confira o link.",
  mensagemFalhaDeRede:
    "Não foi possível confirmar esse ID no iNaturalist agora. Tente de novo em instantes.",
});

/** Campos de espécie que a wiki aceita. Usado no cliente e no servidor. */
export const camposDaEspecieSchema = z.object({
  nomeComum: z.string().trim().min(2).max(120).optional(),
  nomeCientifico: z.string().trim().min(3).max(200).optional(),
  familia: textoOpcional.optional(),
  sinonimos: listaDeTexto.optional(),
  gbifId: gbifIdSchema.optional(),
  inaturalistId: inaturalistIdSchema.optional(),

  estrato: z.enum(ESTRATOS).nullable().optional(),
  sucessao: z.enum(SUCESSOES).nullable().optional(),
  sistema: z.enum(SISTEMAS).nullable().optional(),
  grupos: z.array(z.enum(GRUPOS)).max(GRUPOS.length).optional(),
  [CHAVE_GRUPOS_PROPOSTOS]: z
    .array(z.string().trim().min(2).max(40))
    .max(5)
    .optional(),
  biomas: z.array(z.enum(BIOMAS)).max(BIOMAS.length).optional(),

  diasParaColherMin: numeroOpcional.optional(),
  diasParaColherMax: numeroOpcional.optional(),
  espacamentoEntreLinhasMinM: numeroOpcional.optional(),
  espacamentoEntreLinhasMaxM: numeroOpcional.optional(),
  espacamentoNaLinhaMinM: numeroOpcional.optional(),
  espacamentoNaLinhaMaxM: numeroOpcional.optional(),

  alturaMaduraM: numeroOpcional.optional(),
  cicloDeVida: z
    .array(z.enum(CICLOS_DE_VIDA))
    .max(CICLOS_DE_VIDA.length)
    .optional(),
  frutificacao: z.enum(FRUTIFICACOES).nullable().optional(),
  habito: z.array(z.enum(HABITOS)).max(HABITOS.length).optional(),
  longevidadeMinAnos: numeroOpcional.optional(),
  longevidadeMaxAnos: numeroOpcional.optional(),
  rebrota: z.enum(REBROTAS).nullable().optional(),
  gemasDeRebrota: z
    .array(z.enum(GEMAS_DE_REBROTA))
    .max(GEMAS_DE_REBROTA.length)
    .optional(),
  produtivaAPartirDeMeses: numeroOpcional.optional(),

  notas: listaDeTexto.optional(),
});

export type CamposDaEspecie = z.infer<typeof camposDaEspecieSchema>;

/**
 * A fonte é obrigatória e tem tamanho mínimo de propósito: "fonte: internet"
 * não é fonte. A moderação precisa conseguir conferir.
 */
const fonteSchema = z
  .string()
  .trim()
  .min(10, "Descreva a fonte com pelo menos 10 caracteres.")
  .max(500);

export const propostaDeEdicaoSchema = z.object({
  slug: z.string().min(1),
  patch: camposDaEspecieSchema,
  fonte: fonteSchema,
  justificativa: z.string().trim().max(2000).optional(),
});

export const propostaDeNovaEspecieSchema = z.object({
  campos: camposDaEspecieSchema.required({
    nomeComum: true,
    nomeCientifico: true,
  }),
  fonte: fonteSchema,
  justificativa: z.string().trim().max(2000).optional(),
});

/**
 * Compara o proposto com o atual e devolve só o que de fato muda.
 *
 * Enviar campos inalterados no patch faria a moderação revisar ruído e marcaria
 * como "comunidade" a proveniência de valores que ninguém tocou.
 */
export function calcularPatch(
  atual: Record<string, unknown>,
  proposto: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  for (const [chave, valorProposto] of Object.entries(proposto)) {
    if (valorProposto === undefined) continue;
    if (!iguais(atual[chave], valorProposto)) {
      patch[chave] = valorProposto;
    }
  }
  return patch;
}

function iguais(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }
  // null e undefined são o mesmo "sem valor" para efeito de comparação.
  if (a == null && b == null) return true;
  return a === b;
}
