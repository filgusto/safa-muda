import { describe, it, expect } from "vitest";
import { TAGS_DE_FOTO, ordemDaTag } from "./fotos.ts";

describe("ordemDaTag", () => {
  it("segue o desenvolvimento da planta", () => {
    const ordenadas = [
      "misc",
      "fruta",
      "adulta",
      "raiz",
      "semente",
      "flor",
      "jovem",
    ].sort((a, b) => ordemDaTag(a) - ordemDaTag(b));
    expect(ordenadas).toEqual([
      "semente",
      "jovem",
      "adulta",
      "flor",
      "fruta",
      "raiz",
      "misc",
    ]);
  });

  it("joga tag desconhecida para o fim", () => {
    expect(ordemDaTag("invencionice")).toBeGreaterThan(
      ordemDaTag(TAGS_DE_FOTO[TAGS_DE_FOTO.length - 1]!),
    );
  });
});
