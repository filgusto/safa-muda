import { describe, expect, it } from "vitest";
import {
  avaliarDisco,
  LIVRE_MINIMO_PADRAO_PCT,
  minimoConfigurado,
} from "./disco.ts";

describe("avaliarDisco", () => {
  it("passa com folga e reprova abaixo do mínimo", () => {
    // 100 GB com blocos de 4 KiB.
    const total = 100e9 / 4096;
    expect(avaliarDisco(total * 0.5, total, 4096, 10)).toEqual({
      livrePct: 50,
      livreGb: 50,
      ok: true,
    });
    expect(avaliarDisco(total * 0.05, total, 4096, 10).ok).toBe(false);
  });

  it("disco sem blocos conta como cheio", () => {
    expect(avaliarDisco(0, 0, 4096, 10).ok).toBe(false);
  });
});

describe("minimoConfigurado", () => {
  it("usa o valor do ambiente quando é uma porcentagem válida", () => {
    expect(minimoConfigurado("15")).toBe(15);
  });

  it("cai no padrão com valor ausente ou inválido", () => {
    for (const valor of [undefined, "", "abc", "-1", "150"]) {
      expect(minimoConfigurado(valor)).toBe(LIVRE_MINIMO_PADRAO_PCT);
    }
  });
});
