import { describe, it, expect } from "vitest";
import {
  localParaWgs84,
  wgs84ParaLocal,
  distancia,
  comprimento,
  area,
  pontoAoLongo,
  posicoesAoLongoDaLinha,
  type Georreferencia,
} from "./geo.ts";

const georref: Georreferencia = {
  anchorLat: -23.5,
  anchorLon: -46.6,
  rotationDeg: 0,
};

describe("plano métrico local", () => {
  it("calcula distância exata em metros", () => {
    expect(distancia({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("soma o comprimento de uma polilinha", () => {
    const caminho = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(comprimento(caminho)).toBe(20);
  });

  it("calcula a área de um polígono", () => {
    const quadrado = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(area(quadrado)).toBe(100);
  });

  it("retorna área zero para geometria degenerada", () => {
    expect(
      area([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(0);
  });
});

describe("georreferenciamento", () => {
  it("faz ida e volta preservando a posição", () => {
    const original = { x: 150, y: -80 };
    const voltou = wgs84ParaLocal(localParaWgs84(original, georref), georref);

    expect(voltou.x).toBeCloseTo(original.x, 6);
    expect(voltou.y).toBeCloseTo(original.y, 6);
  });

  it("faz ida e volta com o plano rotacionado", () => {
    const rotacionado: Georreferencia = { ...georref, rotationDeg: 37 };
    const original = { x: 42, y: 17 };
    const voltou = wgs84ParaLocal(
      localParaWgs84(original, rotacionado),
      rotacionado,
    );

    expect(voltou.x).toBeCloseTo(original.x, 6);
    expect(voltou.y).toBeCloseTo(original.y, 6);
  });

  it("mantém a âncora na origem do plano local", () => {
    const naAncora = localParaWgs84({ x: 0, y: 0 }, georref);
    expect(naAncora.lat).toBeCloseTo(georref.anchorLat, 9);
    expect(naAncora.lon).toBeCloseTo(georref.anchorLon, 9);
  });

  it("projeta 100 m ao norte com erro centimétrico", () => {
    const cemMetrosAoNorte = localParaWgs84({ x: 0, y: 100 }, georref);
    const voltou = wgs84ParaLocal(cemMetrosAoNorte, georref);
    expect(voltou.y).toBeCloseTo(100, 2);
  });
});

describe("posicionamento de plantio", () => {
  const leira = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("encontra um ponto a uma distância dada", () => {
    expect(pontoAoLongo(leira, 25)).toEqual({ x: 25, y: 0 });
  });

  it("retorna null além do fim do caminho", () => {
    expect(pontoAoLongo(leira, 150)).toBeNull();
  });

  it("gera as mudas de uma leira com espaçamento regular", () => {
    const posicoes = posicoesAoLongoDaLinha({
      caminho: leira,
      deMetros: 0,
      ateMetros: 10,
      espacamentoMetros: 2,
    });

    // 0, 2, 4, 6, 8, 10 — os extremos entram.
    expect(posicoes).toHaveLength(6);
    expect(posicoes[0]).toEqual({ x: 0, y: 0 });
    expect(posicoes.at(-1)).toEqual({ x: 10, y: 0 });
  });

  it("respeita o trecho pedido dentro da linha", () => {
    const posicoes = posicoesAoLongoDaLinha({
      caminho: leira,
      deMetros: 12,
      ateMetros: 60,
      espacamentoMetros: 0.5,
    });

    expect(posicoes[0]).toEqual({ x: 12, y: 0 });
    expect(posicoes.at(-1)).toEqual({ x: 60, y: 0 });
    expect(posicoes).toHaveLength(97);
  });

  it("não gera posições com espaçamento inválido", () => {
    expect(
      posicoesAoLongoDaLinha({
        caminho: leira,
        deMetros: 0,
        ateMetros: 10,
        espacamentoMetros: 0,
      }),
    ).toEqual([]);
  });
});
