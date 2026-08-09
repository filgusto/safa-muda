import { describe, it, expect } from "vitest";
import {
  mesParaPixel,
  pixelParaMes,
  encaixarNaEscala,
  normalizarIntervalo,
  duracaoSugeridaMeses,
  distribuirEmSublinhas,
  alturaEmSublinhas,
  coberturaPorEstrato,
  lacunasDeCobertura,
  DURACAO_MINIMA_MESES,
  type PlantioNaLinha,
} from "./planejamento.ts";

describe("escala da timeline", () => {
  it("converte mês e pixel nos dois sentidos", () => {
    for (const zoom of ["mes", "trimestre", "ano"] as const) {
      expect(pixelParaMes(mesParaPixel(37, zoom), zoom)).toBeCloseTo(37, 6);
    }
  });

  it("encaixa o mês no passo da escala", () => {
    expect(encaixarNaEscala(7.4, "mes")).toBe(7);
    expect(encaixarNaEscala(7.4, "trimestre")).toBe(6);
    expect(encaixarNaEscala(7.4, "ano")).toBe(12);
  });
});

describe("normalização do intervalo", () => {
  const horizonte = 240;

  it("garante duração mínima", () => {
    expect(
      normalizarIntervalo({ mesInicio: 10, mesFim: 10 }, horizonte),
    ).toEqual({ mesInicio: 10, mesFim: 10 + DURACAO_MINIMA_MESES });
  });

  it("preserva a duração ao empurrar para dentro do início", () => {
    // Arrastar para antes do mês 0 não deve encolher a barra.
    expect(
      normalizarIntervalo({ mesInicio: -8, mesFim: 4 }, horizonte),
    ).toEqual({
      mesInicio: 0,
      mesFim: 12,
    });
  });

  it("preserva a duração ao empurrar para dentro do fim", () => {
    expect(
      normalizarIntervalo({ mesInicio: 236, mesFim: 260 }, horizonte),
    ).toEqual({ mesInicio: 216, mesFim: 240 });
  });

  it("corta o que não cabe no horizonte", () => {
    const resultado = normalizarIntervalo(
      { mesInicio: -50, mesFim: 500 },
      horizonte,
    );
    expect(resultado.mesInicio).toBe(0);
    expect(resultado.mesFim).toBe(horizonte);
  });

  it("arredonda para meses inteiros", () => {
    expect(
      normalizarIntervalo({ mesInicio: 3.7, mesFim: 9.2 }, horizonte),
    ).toEqual({ mesInicio: 4, mesFim: 9 });
  });
});

describe("duração sugerida", () => {
  it("usa o ciclo da espécie quando existe", () => {
    // Alface: 60 dias -> 2 meses.
    expect(
      duracaoSugeridaMeses({ diasParaColherMax: 60, estrato: "medio" }),
    ).toBe(2);
  });

  it("nunca sugere menos que a duração mínima", () => {
    expect(
      duracaoSugeridaMeses({ diasParaColherMax: 5, estrato: "baixo" }),
    ).toBe(DURACAO_MINIMA_MESES);
  });

  it("cai no padrão do estrato quando não há ciclo", () => {
    const emergente = duracaoSugeridaMeses({
      diasParaColherMax: null,
      estrato: "emergente",
    });
    const baixo = duracaoSugeridaMeses({
      diasParaColherMax: null,
      estrato: "baixo",
    });
    expect(emergente).toBeGreaterThan(baixo);
  });
});

describe("empilhamento em sublinhas", () => {
  const p = (
    id: string,
    mesInicio: number,
    mesFim: number,
  ): PlantioNaLinha => ({
    id,
    estrato: "alto",
    mesInicio,
    mesFim,
  });

  it("mantém plantios sequenciais na mesma sublinha", () => {
    const mapa = distribuirEmSublinhas([p("a", 0, 10), p("b", 10, 20)]);
    expect(mapa.get("a")).toBe(0);
    expect(mapa.get("b")).toBe(0);
  });

  it("separa plantios que se sobrepõem", () => {
    const mapa = distribuirEmSublinhas([p("a", 0, 10), p("b", 5, 15)]);
    expect(mapa.get("a")).toBe(0);
    expect(mapa.get("b")).toBe(1);
  });

  it("reaproveita a sublinha assim que ela vaga", () => {
    const mapa = distribuirEmSublinhas([
      p("a", 0, 10),
      p("b", 5, 15),
      p("c", 10, 20),
    ]);
    expect(mapa.get("c")).toBe(0);
  });

  it("informa a altura necessária da faixa", () => {
    expect(alturaEmSublinhas([])).toBe(1);
    expect(alturaEmSublinhas([p("a", 0, 10), p("b", 5, 15)])).toBe(2);
  });
});

describe("cobertura por estrato", () => {
  it("mede presença no tempo, por andar", () => {
    const cobertura = coberturaPorEstrato(
      [{ id: "a", estrato: "alto", mesInicio: 0, mesFim: 6 }],
      12,
    );
    const alto = cobertura.find((linha) => linha.estrato === "alto")!;

    expect(alto.mesesOcupados).toBe(6);
    expect(alto.cobertura).toBeCloseTo(0.5, 6);
    expect(alto.ocupacaoIdeal).toBeCloseTo(0.4, 6);
  });

  it("não conta duas vezes plantios sobrepostos no mesmo andar", () => {
    const cobertura = coberturaPorEstrato(
      [
        { id: "a", estrato: "baixo", mesInicio: 0, mesFim: 6 },
        { id: "b", estrato: "baixo", mesInicio: 3, mesFim: 9 },
      ],
      12,
    );
    expect(
      cobertura.find((linha) => linha.estrato === "baixo")!.mesesOcupados,
    ).toBe(9);
  });

  it("devolve todos os estratos, mesmo os vazios", () => {
    const cobertura = coberturaPorEstrato([], 12);
    expect(cobertura).toHaveLength(5);
    expect(cobertura.every((linha) => linha.mesesOcupados === 0)).toBe(true);
  });
});

describe("lacunas de cobertura do solo", () => {
  it("aponta o intervalo sem nenhuma planta", () => {
    const lacunas = lacunasDeCobertura(
      [
        { id: "a", estrato: "alto", mesInicio: 0, mesFim: 6 },
        { id: "b", estrato: "baixo", mesInicio: 10, mesFim: 24 },
      ],
      24,
    );
    expect(lacunas).toEqual([{ de: 6, ate: 10 }]);
  });

  it("não aponta lacuna quando estratos diferentes se revezam", () => {
    const lacunas = lacunasDeCobertura(
      [
        { id: "a", estrato: "alto", mesInicio: 0, mesFim: 12 },
        { id: "b", estrato: "baixo", mesInicio: 12, mesFim: 24 },
      ],
      24,
    );
    expect(lacunas).toEqual([]);
  });

  it("aponta lacuna que vai até o fim do horizonte", () => {
    const lacunas = lacunasDeCobertura(
      [{ id: "a", estrato: "alto", mesInicio: 0, mesFim: 6 }],
      24,
    );
    expect(lacunas).toEqual([{ de: 6, ate: 24 }]);
  });

  it("considera um projeto vazio inteiramente descoberto", () => {
    expect(lacunasDeCobertura([], 12)).toEqual([{ de: 0, ate: 12 }]);
  });
});
