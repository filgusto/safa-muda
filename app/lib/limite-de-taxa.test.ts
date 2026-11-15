// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { inicioDaJanela } from "./limite-de-taxa.ts";

describe("inicioDaJanela", () => {
  it("alinha o instante ao começo da janela", () => {
    expect(inicioDaJanela(0, 1000)).toBe(0);
    expect(inicioDaJanela(999, 1000)).toBe(0);
    expect(inicioDaJanela(1000, 1000)).toBe(1000);
    expect(inicioDaJanela(2500, 1000)).toBe(2000);
  });
});

/**
 * A contagem de verdade mora no Postgres. Roda onde há banco (contêiner de
 * desenvolvimento, job de migrations da CI); sem DATABASE_URL, fica de fora.
 */
describe.skipIf(!process.env.DATABASE_URL)("consumir (Postgres)", () => {
  const prefixo = `teste:${randomUUID()}:`;
  const regra = { max: 3, janelaMs: 1000 };
  // Instante fixo, longe de "agora", para não esbarrar em dado real.
  const T = 1_000_000_000_000;

  afterAll(async () => {
    const { db } = await import("@/db/index.ts");
    const { limiteDeTaxa } = await import("@/db/schema/index.ts");
    const { like } = await import("drizzle-orm");
    await db
      .delete(limiteDeTaxa)
      .where(like(limiteDeTaxa.chave, `${prefixo}%`));
  });

  it("libera até o máximo e recusa o excedente", async () => {
    const { consumir } = await import("./limite-de-taxa.ts");
    const chave = `${prefixo}a`;
    expect(await consumir(chave, regra, T)).toBe(true);
    expect(await consumir(chave, regra, T + 1)).toBe(true);
    expect(await consumir(chave, regra, T + 2)).toBe(true);
    expect(await consumir(chave, regra, T + 3)).toBe(false);
  });

  it("libera de novo na janela seguinte", async () => {
    const { consumir } = await import("./limite-de-taxa.ts");
    const chave = `${prefixo}b`;
    for (let t = 0; t < 3; t++) await consumir(chave, regra, T + t);
    expect(await consumir(chave, regra, T + 500)).toBe(false);
    expect(await consumir(chave, regra, T + 1000)).toBe(true);
  });

  it("conta cada chave separadamente", async () => {
    const { consumir } = await import("./limite-de-taxa.ts");
    for (let t = 0; t < 3; t++) await consumir(`${prefixo}c`, regra, T + t);
    expect(await consumir(`${prefixo}d`, regra, T + 3)).toBe(true);
  });

  it("não deixa passar além do máximo com pedidos simultâneos", async () => {
    const { consumir } = await import("./limite-de-taxa.ts");
    const chave = `${prefixo}e`;
    const resultados = await Promise.all(
      Array.from({ length: 20 }, () => consumir(chave, regra, T)),
    );
    expect(resultados.filter(Boolean)).toHaveLength(regra.max);
  });

  it("a varredura apaga só janelas vencidas", async () => {
    const { consumir, limparLimitesVencidos } =
      await import("./limite-de-taxa.ts");
    const chave = `${prefixo}f`;
    await consumir(chave, regra, T);
    await limparLimitesVencidos(T + 500); // janela ainda aberta
    expect(await consumir(chave, regra, T + 600)).toBe(true);
    expect(await consumir(chave, regra, T + 700)).toBe(true);
    expect(await consumir(chave, regra, T + 800)).toBe(false);
    await limparLimitesVencidos(T + 1001); // janela [T, T+1000) venceu
    // Se a linha não tivesse saído, isto seguiria recusado na mesma janela.
    expect(await consumir(chave, regra, T + 900)).toBe(true);
  });
});
