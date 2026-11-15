import { statfs } from "node:fs/promises";

/**
 * Espaço livre em disco, para o /api/health?deep=1.
 *
 * Mede o sistema de arquivos da raiz do contêiner — no Docker padrão, o mesmo
 * disco de /var/lib/docker, onde ficam os volumes do Postgres e do Garage. Se
 * os volumes estiverem em outro disco, esta medida não os enxerga: monitore
 * aquele disco por fora.
 *
 * Disco cheio derruba tudo de uma vez (o Postgres para de gravar, o Garage
 * recusa envios, o backup falha), por isso o alarme dispara com folga.
 */

/** Abaixo disto, o health profundo responde 503. Ajustável por ambiente. */
export const LIVRE_MINIMO_PADRAO_PCT = 10;

export interface EstadoDoDisco {
  livrePct: number;
  livreGb: number;
  ok: boolean;
}

export function avaliarDisco(
  blocosLivres: number,
  blocosTotais: number,
  tamanhoDoBloco: number,
  minimoPct: number,
): EstadoDoDisco {
  const livrePct = blocosTotais > 0 ? (blocosLivres / blocosTotais) * 100 : 0;
  return {
    livrePct: Math.round(livrePct * 10) / 10,
    livreGb: Math.round(((blocosLivres * tamanhoDoBloco) / 1e9) * 10) / 10,
    ok: livrePct >= minimoPct,
  };
}

export function minimoConfigurado(
  valor: string | undefined = process.env.DISCO_LIVRE_MINIMO_PCT,
): number {
  const numero = Number(valor);
  return valor && Number.isFinite(numero) && numero >= 0 && numero <= 100
    ? numero
    : LIVRE_MINIMO_PADRAO_PCT;
}

export async function verificarDisco(caminho = "/"): Promise<EstadoDoDisco> {
  // `bavail`, não `bfree`: o que um processo sem privilégio consegue usar.
  const { bavail, blocks, bsize } = await statfs(caminho);
  return avaliarDisco(bavail, blocks, bsize, minimoConfigurado());
}
