/**
 * Limite de taxa por chave (usuário + ação), em memória, por janela deslizante.
 *
 * Serve para segurar quem escreve em massa (propostas, uploads, importações
 * que chamam serviços de terceiros). Vale por instância do servidor e zera no
 * reinício — suficiente para uma instância só; com mais de uma, o teto real
 * passa a ser `max` × instâncias e o estado deveria ir para o banco.
 */

const janelas = new Map<string, number[]>();
const LIMITE_DE_CHAVES = 10_000;

export interface Regra {
  max: number;
  janelaMs: number;
}

/** Registra uma tentativa; devolve false se a chave estourou o limite. */
export function consumir(
  chave: string,
  { max, janelaMs }: Regra,
  agora = Date.now(),
): boolean {
  const desde = agora - janelaMs;
  const recentes = (janelas.get(chave) ?? []).filter((t) => t > desde);

  if (recentes.length >= max) {
    janelas.set(chave, recentes);
    return false;
  }

  recentes.push(agora);
  janelas.set(chave, recentes);

  // Sem isto, o mapa cresceria com cada usuário que já passou por aqui.
  if (janelas.size > LIMITE_DE_CHAVES) {
    for (const [k, v] of janelas) {
      if (v.every((t) => t <= desde)) janelas.delete(k);
    }
  }
  return true;
}

/** Só para os testes. */
export function zerarLimites(): void {
  janelas.clear();
}

export const MENSAGEM_DE_LIMITE =
  "Muitas ações seguidas. Espere alguns minutos e tente de novo.";

export const REGRAS = {
  /** Cada upload cria um registro e uma URL assinada. */
  upload: { max: 30, janelaMs: 10 * 60_000 },
  /** Propostas entram na fila de moderação. */
  proposta: { max: 30, janelaMs: 60 * 60_000 },
  /** Conferir o formulário antes de enviar; consulta GBIF e iNaturalist. */
  validacao: { max: 120, janelaMs: 60 * 60_000 },
  /**
   * Códigos por e-mail (confirmação, recuperação) pedidos para um mesmo
   * endereço — ver o hook em lib/auth.ts. Folga para reenviar algumas vezes.
   */
  codigoPorEmail: { max: 6, janelaMs: 60 * 60_000 },
  /** Cada importação baixa e recomprime uma imagem do Commons. */
  importacao: { max: 10, janelaMs: 10 * 60_000 },
} satisfies Record<string, Regra>;
