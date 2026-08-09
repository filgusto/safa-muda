import { describe, it, expect } from "vitest";
import {
  limites,
  centro,
  pontoDentroDoPoligono,
  perimetro,
  recortarRetaNoPoligono,
  gerarLinhasParalelas,
  contarMudas,
  posicoesDaRegra,
  densidadePorHectare,
  passoDaRegua,
} from "./croqui.ts";
import { area, comprimento, type PontoLocal } from "./geo.ts";

/** Quadrado de 100 × 100 m com canto na origem. */
const QUADRADO: PontoLocal[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

/** Polígono em L — côncavo, para testar recorte em mais de um trecho. */
const FORMA_L: PontoLocal[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 40 },
  { x: 40, y: 40 },
  { x: 40, y: 100 },
  { x: 0, y: 100 },
];

describe("limites e centro", () => {
  it("acha a caixa envolvente", () => {
    expect(limites(QUADRADO)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    });
  });

  it("devolve null sem pontos", () => {
    expect(limites([])).toBeNull();
  });

  it("acha o centro da caixa", () => {
    expect(centro(QUADRADO)).toEqual({ x: 50, y: 50 });
  });
});

describe("ponto dentro do polígono", () => {
  it("reconhece o interior", () => {
    expect(pontoDentroDoPoligono({ x: 50, y: 50 }, QUADRADO)).toBe(true);
  });

  it("reconhece o exterior", () => {
    expect(pontoDentroDoPoligono({ x: 150, y: 50 }, QUADRADO)).toBe(false);
    expect(pontoDentroDoPoligono({ x: -1, y: 50 }, QUADRADO)).toBe(false);
  });

  it("respeita a concavidade", () => {
    // (70, 70) está no vazio do L.
    expect(pontoDentroDoPoligono({ x: 70, y: 70 }, FORMA_L)).toBe(false);
    expect(pontoDentroDoPoligono({ x: 20, y: 70 }, FORMA_L)).toBe(true);
  });
});

describe("medidas do polígono", () => {
  it("calcula área e perímetro", () => {
    expect(area(QUADRADO)).toBe(10_000);
    expect(perimetro(QUADRADO)).toBe(400);
  });

  it("calcula a área do polígono côncavo", () => {
    // 100×40 + 40×60 = 4000 + 2400
    expect(area(FORMA_L)).toBe(6400);
  });
});

describe("recorte de reta no polígono", () => {
  it("devolve um trecho num polígono convexo", () => {
    const trechos = recortarRetaNoPoligono(
      { x: 0, y: 50 },
      { x: 1, y: 0 },
      QUADRADO,
    );
    expect(trechos).toHaveLength(1);
    expect(trechos[0]![0]!.x).toBeCloseTo(0, 6);
    expect(trechos[0]![1]!.x).toBeCloseTo(100, 6);
  });

  it("devolve dois trechos quando a reta atravessa a concavidade", () => {
    // Um L não produz dois trechos numa reta horizontal; usamos um polígono
    // em U, que sim.
    const forma_u: PontoLocal[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 70, y: 100 },
      { x: 70, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 100 },
      { x: 0, y: 100 },
    ];
    const trechos = recortarRetaNoPoligono(
      { x: 0, y: 60 },
      { x: 1, y: 0 },
      forma_u,
    );
    expect(trechos).toHaveLength(2);
  });

  it("não devolve nada fora do polígono", () => {
    expect(
      recortarRetaNoPoligono({ x: 0, y: 500 }, { x: 1, y: 0 }, QUADRADO),
    ).toEqual([]);
  });
});

describe("geração de linhas paralelas", () => {
  it("cobre o polígono com o espaçamento pedido", () => {
    const linhas = gerarLinhasParalelas({
      poligono: QUADRADO,
      direcaoGraus: 0,
      espacamentoM: 10,
    });
    // 100 m de alcance / 10 m ≈ 11 linhas.
    expect(linhas.length).toBeGreaterThanOrEqual(10);
    expect(linhas.length).toBeLessThanOrEqual(11);

    for (const linha of linhas) {
      expect(comprimento(linha)).toBeCloseTo(100, 6);
    }
  });

  it("respeita a bordadura nas duas dimensões", () => {
    const linhas = gerarLinhasParalelas({
      poligono: QUADRADO,
      direcaoGraus: 0,
      espacamentoM: 10,
      bordaduraM: 5,
    });

    for (const linha of linhas) {
      // Encolhida 5 m de cada ponta.
      expect(comprimento(linha)).toBeCloseTo(90, 6);
      for (const ponto of linha) {
        expect(ponto.y).toBeGreaterThanOrEqual(5 - 1e-6);
        expect(ponto.y).toBeLessThanOrEqual(95 + 1e-6);
      }
    }
  });

  it("gera linhas na diagonal quando pedido", () => {
    const linhas = gerarLinhasParalelas({
      poligono: QUADRADO,
      direcaoGraus: 45,
      espacamentoM: 20,
    });
    expect(linhas.length).toBeGreaterThan(0);
    // A diagonal do quadrado é o trecho mais longo possível.
    const maior = Math.max(...linhas.map(comprimento));
    expect(maior).toBeLessThanOrEqual(Math.hypot(100, 100) + 1e-6);
  });

  it("quebra a linha em trechos ao atravessar um vazio", () => {
    const forma_u: PontoLocal[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 70, y: 100 },
      { x: 70, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 100 },
      { x: 0, y: 100 },
    ];
    const linhas = gerarLinhasParalelas({
      poligono: forma_u,
      direcaoGraus: 0,
      espacamentoM: 10,
    });
    // Acima de y=30 cada reta vira dois trechos.
    const curtas = linhas.filter((linha) => comprimento(linha) < 50);
    expect(curtas.length).toBeGreaterThan(0);
  });

  it("não gera nada com espaçamento inválido ou polígono degenerado", () => {
    expect(
      gerarLinhasParalelas({
        poligono: QUADRADO,
        direcaoGraus: 0,
        espacamentoM: 0,
      }),
    ).toEqual([]);
    expect(
      gerarLinhasParalelas({
        poligono: [{ x: 0, y: 0 }],
        direcaoGraus: 0,
        espacamentoM: 5,
      }),
    ).toEqual([]);
  });

  it("não gera linha quando a bordadura engole a área", () => {
    expect(
      gerarLinhasParalelas({
        poligono: QUADRADO,
        direcaoGraus: 0,
        espacamentoM: 10,
        bordaduraM: 60,
      }),
    ).toEqual([]);
  });
});

describe("mudas ao longo da linha", () => {
  const leira: PontoLocal[] = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ];

  it("conta sem gerar as posições", () => {
    // 0 a 100 m a cada 0,5 m: 201 mudas, contando as duas pontas.
    expect(
      contarMudas({
        tipo: "linha",
        rowId: "x",
        deMetros: 0,
        ateMetros: 100,
        espacamentoM: 0.5,
      }),
    ).toBe(201);
  });

  it("a contagem bate com as posições geradas", () => {
    const regra = {
      tipo: "linha" as const,
      rowId: "x",
      deMetros: 12,
      ateMetros: 60,
      espacamentoM: 0.5,
    };
    expect(posicoesDaRegra(regra, leira)).toHaveLength(contarMudas(regra));
  });

  it("não passa do fim da linha real", () => {
    const posicoes = posicoesDaRegra(
      {
        tipo: "linha",
        rowId: "x",
        deMetros: 0,
        ateMetros: 500,
        espacamentoM: 50,
      },
      leira,
    );
    expect(posicoes.at(-1)!.x).toBeLessThanOrEqual(200);
  });

  it("devolve zero com espaçamento inválido", () => {
    expect(
      contarMudas({
        tipo: "linha",
        rowId: "x",
        deMetros: 0,
        ateMetros: 100,
        espacamentoM: 0,
      }),
    ).toBe(0);
  });
});

describe("densidade e régua", () => {
  it("converte para mudas por hectare", () => {
    expect(densidadePorHectare(500, 10_000)).toBe(500);
    expect(densidadePorHectare(500, 5_000)).toBe(1000);
  });

  it("não divide por área zero", () => {
    expect(densidadePorHectare(500, 0)).toBeNull();
  });

  it("escolhe passos redondos na série 1-2-5", () => {
    expect(passoDaRegua(80)).toBe(10);
    expect(passoDaRegua(800)).toBe(100);
    expect(passoDaRegua(8)).toBe(1);
    expect(passoDaRegua(35)).toBe(5);
  });
});
