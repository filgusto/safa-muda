import { describe, it, expect } from "vitest";
import {
  comoEliminar,
  inconsistenciasDaPoda,
  podaDrasticaTolerada,
  type CamposDaPoda,
} from "./poda.ts";

const campos = (parcial: Partial<CamposDaPoda>): CamposDaPoda => ({
  rebrota: null,
  gemasDeRebrota: [],
  ...parcial,
});

describe("podaDrasticaTolerada", () => {
  it("sem dado não há orientação", () => {
    expect(podaDrasticaTolerada(campos({}))).toBeNull();
  });

  it("gemas no tronco aguentam decote (como a gliricídia)", () => {
    expect(
      podaDrasticaTolerada(
        campos({ rebrota: "rebrota", gemasDeRebrota: ["tronco", "colo"] }),
      ),
    ).toBe("decote");
  });

  it("gemas só na base aguentam talhadia (como o eucalipto)", () => {
    expect(podaDrasticaTolerada(campos({ gemasDeRebrota: ["colo"] }))).toBe(
      "talhadia",
    );
    expect(
      podaDrasticaTolerada(campos({ gemasDeRebrota: ["subterraneo"] })),
    ).toBe("talhadia");
  });

  it("quem não rebrota não aguenta poda drástica (como o pinus)", () => {
    expect(podaDrasticaTolerada(campos({ rebrota: "nao_rebrota" }))).toBe(
      "nenhuma",
    );
  });

  it("rebrota sem saber de onde não diz até onde cortar", () => {
    expect(podaDrasticaTolerada(campos({ rebrota: "rebrota" }))).toBeNull();
  });
});

describe("comoEliminar", () => {
  it("sem dado não há orientação", () => {
    expect(comoEliminar(campos({}))).toBeNull();
  });

  it("quem não rebrota morre com o corte do tronco, e a raiz fica", () => {
    expect(comoEliminar(campos({ rebrota: "nao_rebrota" }))).toBe(
      "corte_do_tronco",
    );
  });

  it("só gemas no tronco: cortar rente ao solo elimina", () => {
    expect(comoEliminar(campos({ gemasDeRebrota: ["tronco"] }))).toBe(
      "corte_do_tronco",
    );
  });

  it("gemas no colo exigem cortar abaixo dele", () => {
    expect(comoEliminar(campos({ gemasDeRebrota: ["tronco", "colo"] }))).toBe(
      "abaixo_do_colo",
    );
  });

  it("a gema mais baixa decide: raiz ou órgão enterrado exige arrancar", () => {
    expect(comoEliminar(campos({ gemasDeRebrota: ["tronco", "raiz"] }))).toBe(
      "arrancar",
    );
    expect(comoEliminar(campos({ gemasDeRebrota: ["subterraneo"] }))).toBe(
      "arrancar",
    );
  });
});

describe("contradição", () => {
  const contraditorio = campos({
    rebrota: "nao_rebrota",
    gemasDeRebrota: ["colo"],
  });

  it("não escolhe um lado no lugar da fonte", () => {
    expect(podaDrasticaTolerada(contraditorio)).toBeNull();
    expect(comoEliminar(contraditorio)).toBeNull();
  });

  it("vira aviso", () => {
    expect(inconsistenciasDaPoda(contraditorio)).toHaveLength(1);
    expect(inconsistenciasDaPoda(campos({ rebrota: "rebrota" }))).toEqual([]);
  });
});
