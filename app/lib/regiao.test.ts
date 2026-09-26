import { describe, expect, it } from "vitest";
import {
  acharMunicipio,
  formatarLocal,
  parsearLocal,
  parsearRegiao,
  semAcento,
} from "./regiao.ts";

describe("parsearRegiao", () => {
  it("separa cidade e UF", () => {
    expect(parsearRegiao("Piracicaba, SP")).toEqual({
      cidade: "Piracicaba",
      uf: "SP",
    });
    expect(parsearRegiao("São Luís do Paraitinga,sp")).toEqual({
      cidade: "São Luís do Paraitinga",
      uf: "SP",
    });
  });

  it("recusa o que não tem o formato", () => {
    expect(parsearRegiao("Piracicaba")).toBeNull();
    expect(parsearRegiao("Piracicaba, São Paulo")).toBeNull();
    expect(parsearRegiao(null)).toBeNull();
  });
});

describe("acharMunicipio", () => {
  const lista = ["Piracicaba", "São Paulo", "Santa Bárbara d'Oeste"];

  it("ignora acento e caixa e devolve o nome do IBGE", () => {
    expect(acharMunicipio(lista, "sao paulo")).toBe("São Paulo");
    expect(acharMunicipio(lista, "SANTA BARBARA D'OESTE")).toBe(
      "Santa Bárbara d'Oeste",
    );
  });

  it("não inventa cidade", () => {
    expect(acharMunicipio(lista, "Atlântida")).toBeNull();
  });
});

describe("semAcento", () => {
  it("normaliza para comparar", () => {
    expect(semAcento("  Água Boa ")).toBe("agua boa");
  });
});

describe("parsearLocal", () => {
  it("aceita cidade e UF", () => {
    expect(parsearLocal("Piracicaba, SP")).toEqual({
      cidade: "Piracicaba",
      uf: "SP",
    });
  });

  it("aceita só a UF", () => {
    expect(parsearLocal("pr")).toEqual({ cidade: null, uf: "PR" });
  });

  it("recusa o que não é local", () => {
    expect(parsearLocal("Paraná")).toBeNull();
    expect(parsearLocal("")).toBeNull();
    expect(parsearLocal(undefined)).toBeNull();
  });
});

describe("formatarLocal", () => {
  it("cobre os três estados do seletor", () => {
    expect(formatarLocal("", "")).toBe("");
    expect(formatarLocal("SP", "")).toBe("SP");
    expect(formatarLocal("SP", "Piracicaba")).toBe("Piracicaba, SP");
  });

  it("volta ao que parsearLocal leu", () => {
    for (const texto of ["SP", "Piracicaba, SP"]) {
      const local = parsearLocal(texto)!;
      expect(formatarLocal(local.uf, local.cidade ?? "")).toBe(texto);
    }
  });
});
