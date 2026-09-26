import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino-seguro.ts";

describe("destinoSeguro", () => {
  it("aceita caminhos internos, com query e âncora", () => {
    expect(destinoSeguro("/safdex")).toBe("/safdex");
    expect(destinoSeguro("/projetos/abc?aba=1#topo")).toBe(
      "/projetos/abc?aba=1#topo",
    );
    expect(destinoSeguro("/")).toBe("/");
  });

  it("cai na home sem destino", () => {
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro("")).toBe("/");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/ok\\..\\evil",
  ])("recusa %j", (entrada) => {
    expect(destinoSeguro(entrada)).toBe("/");
  });
});
