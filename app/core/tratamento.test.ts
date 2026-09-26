import { describe, expect, it } from "vitest";
import {
  comoTratamento,
  flexionar,
  flexionarMarcas,
  rotuloDoPapel,
} from "./tratamento.ts";

describe("flexionarMarcas", () => {
  const texto = "Agricultor(a) ou produtor(a), curioso(a), técnico(a)";

  it("feminino", () => {
    expect(flexionarMarcas(texto, "feminino")).toBe(
      "Agricultora ou produtora, curiosa, técnica",
    );
  });
  it("neutro usa a terminação -e", () => {
    expect(flexionarMarcas(texto, "neutro")).toBe(
      "Agricultore ou produtore, curiose, técnice",
    );
    expect(flexionarMarcas("citado(a)", "neutro")).toBe("citade");
  });
  it("masculino e sem escolha ficam no masculino", () => {
    const masculino = "Agricultor ou produtor, curioso, técnico";
    expect(flexionarMarcas(texto, "masculino")).toBe(masculino);
    expect(flexionarMarcas(texto, null)).toBe(masculino);
    expect(flexionarMarcas(texto, undefined)).toBe(masculino);
  });
  it("palavras em -o trocam a vogal", () => {
    expect(flexionarMarcas("Agrofloresteiro(a)", "feminino")).toBe(
      "Agrofloresteira",
    );
  });
});

describe("rotuloDoPapel", () => {
  it("é masculino por padrão, e flexiona só com tratamento", () => {
    expect(rotuloDoPapel("user")).toBe("Colaborador");
    expect(rotuloDoPapel("admin", "feminino")).toBe("Administradora");
    expect(rotuloDoPapel("moderator", "neutro")).toBe("Moderadore");
    expect(rotuloDoPapel("desconhecido", null)).toBe("Colaborador");
  });
});

describe("flexionar e comoTratamento", () => {
  it("sem escolha usa a forma masculina", () => {
    const formas = { feminino: "a", masculino: "o", neutro: "e" };
    expect(flexionar(undefined, formas)).toBe("o");
    expect(flexionar("feminino", formas)).toBe("a");
  });
  it("descarta valores inválidos", () => {
    expect(comoTratamento("ela")).toBeNull();
    expect(comoTratamento("masculino")).toBe("masculino");
  });
});
