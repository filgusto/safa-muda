import { describe, it, expect } from "vitest";
import {
  FAIXAS_DE_COLHEITA,
  FAIXA_DE_COLHEITA_LABEL,
  lerFaixaDeColheita,
} from "./colheita.ts";

describe("lerFaixaDeColheita", () => {
  it("aceita os tetos do vocabulário", () => {
    expect(lerFaixaDeColheita("365")).toBe(365);
  });

  it("recusa valor fora do vocabulário", () => {
    expect(lerFaixaDeColheita("400")).toBeNull();
  });

  it("recusa o que não é número", () => {
    expect(lerFaixaDeColheita("um ano")).toBeNull();
    expect(lerFaixaDeColheita("")).toBeNull();
  });
});

describe("FAIXAS_DE_COLHEITA", () => {
  it("está em ordem crescente — a interface mostra os chips nessa ordem", () => {
    const ordenado = [...FAIXAS_DE_COLHEITA].sort((a, b) => a - b);
    expect([...FAIXAS_DE_COLHEITA]).toEqual(ordenado);
  });

  it("tem rótulo para cada teto", () => {
    for (const faixa of FAIXAS_DE_COLHEITA) {
      expect(FAIXA_DE_COLHEITA_LABEL[faixa]).toBeTruthy();
    }
  });
});
