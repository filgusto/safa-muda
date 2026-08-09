import { describe, it, expect } from "vitest";
import {
  ESTRATOS,
  LUZ_TRANSMITIDA,
  OCUPACAO_IDEAL,
  luzQueChegaAo,
  type Estrato,
} from "./estratos.ts";

describe("estratos", () => {
  /**
   * A relação central de "Agroflorestando o Mundo": a ocupação ideal de cada
   * andar é o complemento da luz que ele deixa passar. É isso que permite somar
   * 170%–277% de área plantada num mesmo canteiro (cap. 10, tabelas 2–6).
   */
  it("ocupação ideal é o complemento da luz transmitida", () => {
    for (const estrato of ESTRATOS) {
      const luz = LUZ_TRANSMITIDA[estrato];
      const ocupacao = OCUPACAO_IDEAL[estrato];

      if (luz === null) {
        expect(ocupacao).toBeNull();
        continue;
      }
      expect(ocupacao).toBeCloseTo(1 - luz, 10);
    }
  });

  it("reproduz os valores publicados por Götsch", () => {
    expect(LUZ_TRANSMITIDA.emergente).toBe(0.8);
    expect(LUZ_TRANSMITIDA.alto).toBe(0.6);
    expect(LUZ_TRANSMITIDA.medio).toBe(0.4);
    expect(LUZ_TRANSMITIDA.baixo).toBe(0.2);
  });

  it("não inventa número para o estrato rasteiro", () => {
    // A fonte cita o rasteiro mas não estima sua transmissão de luz.
    // Ver docs/PLANO.md §7.4 — nunca preencher campo por estimativa própria.
    expect(LUZ_TRANSMITIDA.rasteiro).toBeNull();
    expect(OCUPACAO_IDEAL.rasteiro).toBeNull();
  });
});

describe("luz que chega a cada andar", () => {
  it("dá luz plena ao emergente", () => {
    expect(luzQueChegaAo("emergente")).toBe(1);
  });

  it("atenua conforme os estratos acima", () => {
    expect(luzQueChegaAo("alto")).toBeCloseTo(0.8, 10);
    expect(luzQueChegaAo("medio")).toBeCloseTo(0.8 * 0.6, 10);
    expect(luzQueChegaAo("baixo")).toBeCloseTo(0.8 * 0.6 * 0.4, 10);
  });

  it("decresce monotonicamente de cima para baixo", () => {
    const ordem: Estrato[] = ["emergente", "alto", "medio", "baixo"];
    const luzes = ordem.map(luzQueChegaAo);

    for (let i = 1; i < luzes.length; i++) {
      expect(luzes[i]!).toBeLessThan(luzes[i - 1]!);
    }
  });
});
