import { describe, it, expect } from "vitest";
import {
  formatarLongevidade,
  inconsistenciasDoCiclo,
  type CamposDoCiclo,
} from "./ciclo.ts";

describe("formatarLongevidade", () => {
  it("faixa completa, como a fonte costuma dar", () => {
    // "embaúba (secundária I, vive 10 a 20 anos)" — Götsch.
    expect(formatarLongevidade(10, 20)).toBe("10 a 20 anos");
  });

  it("só o mínimo vira limite aberto, sem inventar teto", () => {
    // "dandá ... vive mais de 80 anos" — Götsch.
    expect(formatarLongevidade(80, null)).toBe("mais de 80 anos");
  });

  it("só o máximo vira 'até'", () => {
    expect(formatarLongevidade(null, 5)).toBe("até 5 anos");
  });

  it("mínimo igual ao máximo vira valor único", () => {
    expect(formatarLongevidade(15, 15)).toBe("15 anos");
  });

  it("singular e decimal em pt-BR", () => {
    expect(formatarLongevidade(1, 1)).toBe("1 ano");
    expect(formatarLongevidade(1.5, 2)).toBe("1,5 a 2 anos");
  });

  it("sem nenhum dos dois é não informado", () => {
    expect(formatarLongevidade(null, null)).toBeNull();
  });
});

describe("inconsistenciasDoCiclo", () => {
  const campos = (parcial: Partial<CamposDoCiclo>): CamposDoCiclo => ({
    cicloDeVida: [],
    longevidadeMinAnos: null,
    longevidadeMaxAnos: null,
    ...parcial,
  });

  it("nada informado não gera aviso", () => {
    expect(inconsistenciasDoCiclo(campos({}))).toEqual([]);
  });

  it("aponta mínimo maior que máximo", () => {
    expect(
      inconsistenciasDoCiclo(
        campos({ longevidadeMinAnos: 20, longevidadeMaxAnos: 10 }),
      ),
    ).toEqual(["Longevidade mínima maior que a máxima."]);
  });

  it("aponta anual que vive anos", () => {
    expect(
      inconsistenciasDoCiclo(
        campos({ cicloDeVida: ["anual"], longevidadeMinAnos: 3 }),
      ),
    ).toEqual(["Anual com longevidade acima de 1 ano."]);
  });

  it("aponta bienal que vive mais de dois anos", () => {
    expect(
      inconsistenciasDoCiclo(
        campos({ cicloDeVida: ["bienal"], longevidadeMinAnos: 5 }),
      ),
    ).toEqual(["Bienal com longevidade acima de 2 anos."]);
  });

  it("bienal de dois anos é coerente", () => {
    expect(
      inconsistenciasDoCiclo(
        campos({ cicloDeVida: ["bienal"], longevidadeMinAnos: 2 }),
      ),
    ).toEqual([]);
  });

  it("anual e perene juntos não se contradizem: depende do clima", () => {
    expect(
      inconsistenciasDoCiclo(
        campos({ cicloDeVida: ["anual", "perene"], longevidadeMinAnos: 5 }),
      ),
    ).toEqual([]);
  });
});
