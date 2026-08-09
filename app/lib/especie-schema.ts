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
    chave: "longevidadeAnos",
    rotulo: "Longevidade",
    tipo: "numero",
    unidade: "anos",
    grupo: "porte",
  },
  {
    chave: "produtivaAPartirDeMeses",
    rotulo: "Produz a partir de",
    tipo: "numero",
    unidade: "meses",
    grupo: "porte",
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

export const ROTULO_DO_GRUPO: Record<DefinicaoDeCampo["grupo"], string> = {
  identificacao: "Identificação",
  classificacao: "Classificação agroflorestal",
  cultivo: "Ciclo e espaçamento",
  porte: "Porte e longevidade",
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

/** Campos de espécie que a wiki aceita. Usado no cliente e no servidor. */
export const camposDaEspecieSchema = z.object({
  nomeComum: z.string().trim().min(2).max(120).optional(),
  nomeCientifico: z.string().trim().min(3).max(200).optional(),
  familia: textoOpcional.optional(),
  sinonimos: listaDeTexto.optional(),

  estrato: z.enum(ESTRATOS).nullable().optional(),
  sucessao: z.enum(SUCESSOES).nullable().optional(),
  sistema: z.enum(SISTEMAS).nullable().optional(),
  grupos: z.array(z.enum(GRUPOS)).max(GRUPOS.length).optional(),
  biomas: z.array(z.enum(BIOMAS)).max(BIOMAS.length).optional(),

  diasParaColherMin: numeroOpcional.optional(),
  diasParaColherMax: numeroOpcional.optional(),
  espacamentoEntreLinhasMinM: numeroOpcional.optional(),
  espacamentoEntreLinhasMaxM: numeroOpcional.optional(),
  espacamentoNaLinhaMinM: numeroOpcional.optional(),
  espacamentoNaLinhaMaxM: numeroOpcional.optional(),

  alturaMaduraM: numeroOpcional.optional(),
  longevidadeAnos: numeroOpcional.optional(),
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
