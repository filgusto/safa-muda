import { describe, it, expect } from "vitest";
import {
  lonLatParaPixelDoMundo,
  pixelDoMundoParaLonLat,
  metrosPorPixel,
  zoomParaResolucao,
  faixaDeTiles,
  totalDeTiles,
  transformacaoDoFundo,
  urlDoTile,
  TAMANHO_DO_TILE,
} from "./mercator.ts";
import { localParaWgs84, type Georreferencia } from "./geo.ts";

describe("projeção Web Mercator", () => {
  it("põe a origem geográfica no centro do mundo", () => {
    const pixel = lonLatParaPixelDoMundo(0, 0, 0);
    expect(pixel.x).toBeCloseTo(TAMANHO_DO_TILE / 2, 6);
    expect(pixel.y).toBeCloseTo(TAMANHO_DO_TILE / 2, 6);
  });

  it("faz ida e volta preservando a coordenada", () => {
    for (const [lon, lat] of [
      [-46.6333, -23.5505],
      [0, 0],
      [140.5, 60.2],
    ]) {
      const pixel = lonLatParaPixelDoMundo(lon!, lat!, 18);
      const volta = pixelDoMundoParaLonLat(pixel, 18);
      expect(volta.lon).toBeCloseTo(lon!, 9);
      expect(volta.lat).toBeCloseTo(lat!, 9);
    }
  });

  it("cresce para leste e para o sul", () => {
    const oeste = lonLatParaPixelDoMundo(-50, -20, 10);
    const leste = lonLatParaPixelDoMundo(-40, -20, 10);
    const norte = lonLatParaPixelDoMundo(-45, -10, 10);
    const sul = lonLatParaPixelDoMundo(-45, -30, 10);

    expect(leste.x).toBeGreaterThan(oeste.x);
    expect(sul.y).toBeGreaterThan(norte.y);
  });

  it("limita a latitude ao domínio da projeção", () => {
    // Além de ±85,05° o Mercator diverge; o valor precisa continuar finito.
    expect(Number.isFinite(lonLatParaPixelDoMundo(0, 89.9, 5).y)).toBe(true);
  });
});

describe("resolução", () => {
  it("dobra a cada nível de zoom", () => {
    expect(metrosPorPixel(0, 10)).toBeCloseTo(metrosPorPixel(0, 11) * 2, 9);
  });

  it("encolhe com o cosseno da latitude", () => {
    // É essa correção que impede o fundo de sair fora de escala.
    const equador = metrosPorPixel(0, 18);
    const saoPaulo = metrosPorPixel(-23.55, 18);
    expect(saoPaulo).toBeLessThan(equador);
    expect(saoPaulo).toBeCloseTo(
      equador * Math.cos((23.55 * Math.PI) / 180),
      9,
    );
  });

  it("escolhe zoom com detalhe suficiente para a escala pedida", () => {
    const lat = -23.55;
    const zoom = zoomParaResolucao(lat, 0.5);
    // Arredonda para cima: o tile tem resolução igual ou melhor que a pedida.
    expect(metrosPorPixel(lat, zoom)).toBeLessThanOrEqual(0.5);
  });

  it("respeita o teto do provedor", () => {
    expect(zoomParaResolucao(-23.55, 0.0001, 19)).toBe(19);
  });
});

describe("faixa de tiles", () => {
  it("cobre o retângulo pedido com margem", () => {
    const faixa = faixaDeTiles({ x: 300, y: 300 }, { x: 800, y: 800 }, 10, 1);
    // 300..800 px cai nos tiles 1..3; com margem, 0..4.
    expect(faixa.xInicial).toBe(0);
    expect(faixa.xFinal).toBe(4);
    expect(totalDeTiles(faixa)).toBe(25);
  });

  it("aceita os cantos em qualquer ordem", () => {
    const a = faixaDeTiles({ x: 800, y: 800 }, { x: 300, y: 300 }, 10, 0);
    const b = faixaDeTiles({ x: 300, y: 300 }, { x: 800, y: 800 }, 10, 0);
    expect(a).toEqual(b);
  });

  it("não sai da grade do zoom", () => {
    const faixa = faixaDeTiles({ x: -500, y: -500 }, { x: 100, y: 100 }, 1, 2);
    expect(faixa.xInicial).toBe(0);
    expect(faixa.yInicial).toBe(0);
    expect(faixa.xFinal).toBeLessThanOrEqual(1);
  });
});

describe("alinhamento do fundo com o plano local", () => {
  const georref: Georreferencia = {
    anchorLat: -23.5505,
    anchorLon: -46.6333,
    rotationDeg: 0,
  };
  const zoom = 18;

  /** Aplica a matriz a um pixel do mundo. */
  function aplicar(
    t: ReturnType<typeof transformacaoDoFundo>,
    p: { x: number; y: number },
  ) {
    return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f };
  }

  function montar(pixelsPorMetro: number, rotacaoGraus = 0) {
    return transformacaoDoFundo({
      ancoraNoMundo: lonLatParaPixelDoMundo(
        georref.anchorLon,
        georref.anchorLat,
        zoom,
      ),
      ancoraNaTela: { x: 400, y: 300 },
      metrosPorPixelDoMundo: metrosPorPixel(georref.anchorLat, zoom),
      pixelsPorMetro,
      rotacaoGraus,
    });
  }

  it("mantém a âncora exatamente onde foi pedido", () => {
    const t = montar(10);
    const ancora = lonLatParaPixelDoMundo(
      georref.anchorLon,
      georref.anchorLat,
      zoom,
    );
    const tela = aplicar(t, ancora);

    expect(tela.x).toBeCloseTo(400, 6);
    expect(tela.y).toBeCloseTo(300, 6);
  });

  it("põe um ponto local no mesmo pixel que o croqui poria", () => {
    const pixelsPorMetro = 10;
    const t = montar(pixelsPorMetro);

    // Um ponto 30 m a leste e 20 m ao norte da âncora.
    const local = { x: 30, y: 20 };
    const wgs = localParaWgs84(local, georref);
    const noMundo = lonLatParaPixelDoMundo(wgs.lon, wgs.lat, zoom);
    const pelaMatriz = aplicar(t, noMundo);

    // O croqui poria esse ponto em (400 + 30·10, 300 − 20·10).
    expect(pelaMatriz.x).toBeCloseTo(400 + 300, 1);
    expect(pelaMatriz.y).toBeCloseTo(300 - 200, 1);
  });

  it("acompanha a rotação do plano local", () => {
    const rotacionado: Georreferencia = { ...georref, rotationDeg: 30 };
    const pixelsPorMetro = 10;
    const t = montar(pixelsPorMetro, 30);

    const local = { x: 50, y: 0 };
    const wgs = localParaWgs84(local, rotacionado);
    const noMundo = lonLatParaPixelDoMundo(wgs.lon, wgs.lat, zoom);
    const pelaMatriz = aplicar(t, noMundo);

    // Mesmo com o terreno girado, 50 m a leste no plano local continuam
    // saindo 500 px à direita na tela.
    expect(pelaMatriz.x).toBeCloseTo(400 + 500, 0);
    expect(pelaMatriz.y).toBeCloseTo(300, 0);
  });

  it("mantém a precisão usando uma origem local", () => {
    // Sem origem, as coordenadas do mundo em zoom 19 passam de 10⁸ px. O
    // navegador perde precisão de layout nessa escala e joga os tiles a
    // milhões de pixels do lugar — foi exatamente o que aconteceu na prática.
    const zoomAlto = 19;
    const ancoraNoMundo = lonLatParaPixelDoMundo(
      georref.anchorLon,
      georref.anchorLat,
      zoomAlto,
    );
    const origemDoMundo = {
      x: Math.floor(ancoraNoMundo.x / 256) * 256,
      y: Math.floor(ancoraNoMundo.y / 256) * 256,
    };

    const t = transformacaoDoFundo({
      ancoraNoMundo,
      ancoraNaTela: { x: 400, y: 300 },
      metrosPorPixelDoMundo: metrosPorPixel(georref.anchorLat, zoomAlto),
      pixelsPorMetro: 10,
      rotacaoGraus: 0,
      origemDoMundo,
    });

    // A translação fica na casa das centenas, não das centenas de milhões.
    expect(Math.abs(t.e)).toBeLessThan(10_000);
    expect(Math.abs(t.f)).toBeLessThan(10_000);

    // E continua exata: a âncora, agora relativa à origem, cai no lugar certo.
    const relativa = {
      x: ancoraNoMundo.x - origemDoMundo.x,
      y: ancoraNoMundo.y - origemDoMundo.y,
    };
    expect(aplicar(t, relativa).x).toBeCloseTo(400, 6);
    expect(aplicar(t, relativa).y).toBeCloseTo(300, 6);
  });

  it("escala junto com o zoom do croqui", () => {
    const perto = montar(20);
    const longe = montar(10);
    expect(perto.a).toBeCloseTo(longe.a * 2, 9);
  });
});

describe("url do tile", () => {
  it("substitui z, x e y", () => {
    expect(urlDoTile("https://exemplo/{z}/{x}/{y}.png", 18, 195, 289)).toBe(
      "https://exemplo/18/195/289.png",
    );
  });

  it("aceita provedor com a ordem trocada", () => {
    // A Esri usa {z}/{y}/{x}.
    expect(urlDoTile("https://exemplo/{z}/{y}/{x}", 18, 195, 289)).toBe(
      "https://exemplo/18/289/195",
    );
  });
});
