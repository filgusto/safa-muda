import { describe, expect, it } from "vitest";
import { ehTipoPermitido, gerarChave } from "./storage.ts";

describe("gerarChave", () => {
  it("deriva a extensão do tipo, nunca do nome enviado", () => {
    expect(gerarChave("image/jpeg")).toMatch(
      /^\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/,
    );
    expect(gerarChave("image/png")).toMatch(/\.png$/);
    expect(gerarChave("image/webp")).toMatch(/\.webp$/);
    expect(gerarChave("image/avif")).toMatch(/\.avif$/);
  });

  it("recusa tipos fora da lista", () => {
    expect(() => gerarChave("image/svg+xml")).toThrow();
    expect(() => gerarChave("text/html")).toThrow();
  });

  it("gera chaves diferentes a cada chamada", () => {
    expect(gerarChave("image/jpeg")).not.toBe(gerarChave("image/jpeg"));
  });
});

describe("ehTipoPermitido", () => {
  it("aceita só imagens raster conhecidas", () => {
    expect(ehTipoPermitido("image/jpeg")).toBe(true);
    expect(ehTipoPermitido("image/svg+xml")).toBe(false);
  });
});
