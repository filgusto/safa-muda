import { describe, it, expect } from "vitest";
import { TAGS_DE_FOTO, escolherFotoPrincipal, ordemDaTag } from "./fotos.ts";

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

describe("escolherFotoPrincipal", () => {
  it("sem fotos, não há principal", () => {
    expect(escolherFotoPrincipal([])).toBeNull();
  });

  it("sem marcação, segue a ordem de reconhecimento", () => {
    const fotos = [
      { id: "a", tag: "semente", principal: false },
      { id: "b", tag: "fruta", principal: false },
      { id: "c", tag: "adulta", principal: false },
    ];
    expect(escolherFotoPrincipal(fotos)?.id).toBe("c");
  });

  it("a marcada como principal vence a ordem de reconhecimento", () => {
    const fotos = [
      { id: "a", tag: "adulta", principal: false },
      { id: "b", tag: "semente", principal: true },
    ];
    expect(escolherFotoPrincipal(fotos)?.id).toBe("b");
  });

  it("empate mantém a ordem recebida", () => {
    const fotos = [
      { id: "a", tag: "adulta", principal: false },
      { id: "b", tag: "adulta", principal: false },
    ];
    expect(escolherFotoPrincipal(fotos)?.id).toBe("a");
  });
});
