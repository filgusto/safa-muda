import { beforeEach, describe, expect, it } from "vitest";
import { consumir, zerarLimites } from "./limite-de-taxa.ts";

const regra = { max: 3, janelaMs: 1000 };

describe("consumir", () => {
  beforeEach(zerarLimites);

  it("libera até o máximo e recusa o excedente", () => {
    expect(consumir("a", regra, 0)).toBe(true);
    expect(consumir("a", regra, 1)).toBe(true);
    expect(consumir("a", regra, 2)).toBe(true);
    expect(consumir("a", regra, 3)).toBe(false);
  });

  it("libera de novo quando a janela passa", () => {
    for (let t = 0; t < 3; t++) consumir("a", regra, t);
    expect(consumir("a", regra, 500)).toBe(false);
    expect(consumir("a", regra, 1001)).toBe(true);
  });

  it("conta cada chave separadamente", () => {
    for (let t = 0; t < 3; t++) consumir("a", regra, t);
    expect(consumir("b", regra, 3)).toBe(true);
  });

  it("não conta tentativas recusadas", () => {
    for (let t = 0; t < 3; t++) consumir("a", regra, t);
    for (let t = 3; t < 50; t++) consumir("a", regra, t);
    expect(consumir("a", regra, 1003)).toBe(true);
  });
});
