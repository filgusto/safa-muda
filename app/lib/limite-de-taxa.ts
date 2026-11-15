import { lt, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { limiteDeTaxa, rateLimit } from "@/db/schema/index.ts";

/**
 * Limite de taxa por chave (usuário + ação, ou endereço de e-mail), guardado
 * no Postgres.
 *
 * Serve para segurar quem escreve em massa (propostas, uploads, importações
 * que chamam serviços de terceiros) e quem pede códigos por e-mail sem parar.
 * No banco, e não na memória, porque a memória zerava a cada deploy ou
 * reinício (justo quando alguém insiste) e valia por instância: com duas, o
 * teto real dobrava.
 *
 * Janela fixa: a contagem recomeça a cada `janelaMs`, alinhada ao relógio.
 * Na virada de uma janela para a outra cabem até 2 × `max` tentativas em
 * sequência — aceitável para estes tetos, e o preço de contar com um único
 * comando atômico (ver db/schema/limites.ts).
 */

export interface Regra {
  max: number;
  janelaMs: number;
}

/** Início da janela que contém `agora`. */
export function inicioDaJanela(agora: number, janelaMs: number): number {
  return agora - (agora % janelaMs);
}

/** Registra uma tentativa; devolve false se a chave estourou o limite. */
export async function consumir(
  chave: string,
  { max, janelaMs }: Regra,
  agora = Date.now(),
): Promise<boolean> {
  const janela = inicioDaJanela(agora, janelaMs);
  const [linha] = await db
    .insert(limiteDeTaxa)
    .values({ chave, janela, expiraEm: janela + janelaMs, total: 1 })
    .onConflictDoUpdate({
      target: [limiteDeTaxa.chave, limiteDeTaxa.janela],
      set: { total: sql`${limiteDeTaxa.total} + 1` },
    })
    .returning({ total: limiteDeTaxa.total });
  return (linha?.total ?? 1) <= max;
}

/** As janelas do Better Auth são de segundos; um dia é folga de sobra. */
const VIDA_DO_CONTADOR_DO_LOGIN_MS = 24 * 60 * 60_000;

/**
 * Apaga contadores vencidos — os daqui e os do Better Auth (tabela
 * `rate_limit`, que ele não limpa sozinho). Chamado pela varredura diária em
 * instrumentation.ts. Devolve quantas linhas saíram.
 */
export async function limparLimitesVencidos(
  agora = Date.now(),
): Promise<number> {
  const nossos = await db
    .delete(limiteDeTaxa)
    .where(lt(limiteDeTaxa.expiraEm, agora))
    .returning({ chave: limiteDeTaxa.chave });
  const doLogin = await db
    .delete(rateLimit)
    .where(lt(rateLimit.lastRequest, agora - VIDA_DO_CONTADOR_DO_LOGIN_MS))
    .returning({ id: rateLimit.id });
  return nossos.length + doLogin.length;
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
   * Códigos por e-mail (confirmação, recuperação, troca) pedidos para um
   * mesmo endereço — ver o hook em lib/auth.ts. Folga para reenviar algumas
   * vezes.
   */
  codigoPorEmail: { max: 6, janelaMs: 60 * 60_000 },
  /** Cada importação baixa e recomprime uma imagem do Commons. */
  importacao: { max: 10, janelaMs: 10 * 60_000 },
} satisfies Record<string, Regra>;
