import { describe, expect, it } from "vitest";
import { padraoDeBusca } from "./padrao-de-busca.ts";

describe("padraoDeBusca", () => {
  it("envolve o texto em curingas", () => {
    expect(padraoDeBusca("ipê")).toBe("%ipê%");
  });

  it("escapa curingas e a própria barra", () => {
    expect(padraoDeBusca("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
  });

  it("limita o tamanho", () => {
    expect(padraoDeBusca("a".repeat(500)).length).toBe(102);
  });
});
