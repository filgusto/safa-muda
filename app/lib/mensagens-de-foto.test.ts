import { describe, expect, it } from "vitest";
import {
  MENSAGENS_DE_FOTO,
  sortearMensagemDeFoto,
} from "./mensagens-de-foto.ts";

describe("mensagens de foto", () => {
  it("são 15, sem repetição", () => {
    expect(MENSAGENS_DE_FOTO).toHaveLength(15);
    expect(new Set(MENSAGENS_DE_FOTO).size).toBe(15);
  });

  it("não tratam a pessoa por gênero", () => {
    const generizadas =
      /\b(bem-vind[oa]s?|obrigad[oa]s?|lind[oa]\s+você|jardineir[oa]s?)\b/i;
    for (const mensagem of MENSAGENS_DE_FOTO) {
      expect(mensagem).not.toMatch(generizadas);
    }
  });

  it("sorteia dentro da lista, inclusive nos extremos", () => {
    expect(sortearMensagemDeFoto(() => 0)).toBe(MENSAGENS_DE_FOTO[0]);
    expect(sortearMensagemDeFoto(() => 0.999999)).toBe(
      MENSAGENS_DE_FOTO[MENSAGENS_DE_FOTO.length - 1],
    );
  });
});
