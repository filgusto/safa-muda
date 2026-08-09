/**
 * Web Mercator: o mínimo para pôr um mapa de fundo atrás do croqui.
 *
 * O croqui continua desenhando o plano métrico local — o mapa é só um fundo
 * (docs/adr/0001-plano-metrico-local.md). Nada aqui altera a geometria; tudo
 * serve para descobrir QUAIS tiles buscar e ONDE colocá-los.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

export const TAMANHO_DO_TILE = 256;

/** Limite de latitude do Web Mercator, onde a projeção diverge. */
const LATITUDE_MAXIMA = 85.05112878;

export interface PixelDoMundo {
  x: number;
  y: number;
}

/**
 * Longitude/latitude para pixel do mundo, num dado nível de zoom.
 * Origem no canto noroeste; x cresce para leste, y para o sul.
 */
export function lonLatParaPixelDoMundo(
  lon: number,
  lat: number,
  zoom: number,
): PixelDoMundo {
  const escala = TAMANHO_DO_TILE * 2 ** zoom;
  const latLimitada = Math.max(
    -LATITUDE_MAXIMA,
    Math.min(LATITUDE_MAXIMA, lat),
  );
  const seno = Math.sin((latLimitada * Math.PI) / 180);

  return {
    x: escala * (lon / 360 + 0.5),
    y: escala * (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)),
  };
}

export function pixelDoMundoParaLonLat(
  pixel: PixelDoMundo,
  zoom: number,
): { lon: number; lat: number } {
  const escala = TAMANHO_DO_TILE * 2 ** zoom;
  const lon = (pixel.x / escala - 0.5) * 360;
  const n = Math.PI * (1 - (2 * pixel.y) / escala);

  return { lon, lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI };
}

/**
 * Metros por pixel do Mercator numa dada latitude e zoom.
 *
 * O Mercator estica com a latitude, então a mesma imagem de tile cobre menos
 * metros perto dos polos. Sem esta correção o fundo sairia com escala errada —
 * e num croqui, escala errada é pior que fundo nenhum.
 */
export function metrosPorPixel(lat: number, zoom: number): number {
  const CIRCUNFERENCIA_NO_EQUADOR = 156543.03392804097; // m/px em z0
  return (
    (CIRCUNFERENCIA_NO_EQUADOR * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
  );
}

/**
 * Zoom cujo tile chega mais perto da resolução pedida.
 *
 * Arredonda para cima (mais detalhe) porque um tile ampliado borra, enquanto
 * um reduzido só desperdiça banda.
 */
export function zoomParaResolucao(
  lat: number,
  metrosPorPixelDesejado: number,
  zoomMaximo = 19,
): number {
  if (metrosPorPixelDesejado <= 0) return zoomMaximo;

  const bruto = Math.log2(metrosPorPixel(lat, 0) / metrosPorPixelDesejado);
  return Math.max(0, Math.min(zoomMaximo, Math.ceil(bruto)));
}

export interface FaixaDeTiles {
  zoom: number;
  xInicial: number;
  yInicial: number;
  xFinal: number;
  yFinal: number;
}

/**
 * Tiles que cobrem um retângulo de pixels do mundo.
 *
 * `margem` acrescenta tiles em volta, para que uma rotação do plano local não
 * deixe cantos vazios.
 */
export function faixaDeTiles(
  canto1: PixelDoMundo,
  canto2: PixelDoMundo,
  zoom: number,
  margem = 1,
): FaixaDeTiles {
  const maximo = 2 ** zoom - 1;
  const limitar = (valor: number) => Math.max(0, Math.min(maximo, valor));

  return {
    zoom,
    xInicial: limitar(
      Math.floor(Math.min(canto1.x, canto2.x) / TAMANHO_DO_TILE) - margem,
    ),
    yInicial: limitar(
      Math.floor(Math.min(canto1.y, canto2.y) / TAMANHO_DO_TILE) - margem,
    ),
    xFinal: limitar(
      Math.floor(Math.max(canto1.x, canto2.x) / TAMANHO_DO_TILE) + margem,
    ),
    yFinal: limitar(
      Math.floor(Math.max(canto1.y, canto2.y) / TAMANHO_DO_TILE) + margem,
    ),
  };
}

export function totalDeTiles(faixa: FaixaDeTiles): number {
  return (
    (faixa.xFinal - faixa.xInicial + 1) * (faixa.yFinal - faixa.yInicial + 1)
  );
}

/** Coeficientes de `matrix(a,b,c,d,e,f)` do CSS. */
export interface TransformacaoAfim {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Transformação que leva pixels do mundo (Mercator) à tela do croqui.
 *
 * É o coração do alinhamento. Junta três coisas numa matriz só:
 *   1. a escala entre metros do Mercator e pixels na tela;
 *   2. a rotação do plano local em relação ao norte verdadeiro;
 *   3. a translação que faz a âncora cair no lugar certo.
 *
 * Com ela, os tiles são posicionados em coordenadas de Mercator e o navegador
 * faz o resto — sem recalcular a posição de cada um a cada quadro.
 */
export function transformacaoDoFundo(params: {
  /** Pixel do mundo correspondente à âncora da área. */
  ancoraNoMundo: PixelDoMundo;
  /** Onde a âncora (0,0 do plano local) cai na tela, em pixels. */
  ancoraNaTela: { x: number; y: number };
  /** Metros por pixel do Mercator na latitude da âncora. */
  metrosPorPixelDoMundo: number;
  /** Pixels de tela por metro do plano local. */
  pixelsPorMetro: number;
  /** Rotação do plano local em relação ao norte, em graus. */
  rotacaoGraus: number;
  /**
   * Origem local do espaço de tiles, em pixels do mundo.
   *
   * Existe por precisão numérica, não por conveniência. Em zoom 19 as
   * coordenadas do mundo passam de 10⁸ px; posicionar tiles nesses valores faz
   * o navegador perder precisão de layout e jogá-los a milhões de pixels do
   * lugar certo. Subtraindo uma origem próxima, tudo fica na casa dos milhares.
   * É o mesmo motivo pelo qual bibliotecas de mapa nunca usam espaço absoluto.
   */
  origemDoMundo?: PixelDoMundo;
}): TransformacaoAfim {
  const origem = params.origemDoMundo ?? { x: 0, y: 0 };
  const ancora = {
    x: params.ancoraNoMundo.x - origem.x,
    y: params.ancoraNoMundo.y - origem.y,
  };
  const escala = params.metrosPorPixelDoMundo * params.pixelsPorMetro;
  const rad = (params.rotacaoGraus * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sen = Math.sin(rad);

  // Deduzido em duas etapas: pixel do mundo → deslocamento leste/norte, e
  // leste/norte → plano local (rotação inversa da usada em localParaWgs84).
  const a = escala * cos;
  const b = escala * sen;
  const c = -escala * sen;
  const d = escala * cos;

  return {
    a,
    b,
    c,
    d,
    e: params.ancoraNaTela.x - a * ancora.x - c * ancora.y,
    f: params.ancoraNaTela.y - b * ancora.x - d * ancora.y,
  };
}

export function paraCssMatrix(t: TransformacaoAfim): string {
  return `matrix(${t.a}, ${t.b}, ${t.c}, ${t.d}, ${t.e}, ${t.f})`;
}

/** Substitui {z}/{x}/{y} no molde de URL do provedor. */
export function urlDoTile(
  molde: string,
  z: number,
  x: number,
  y: number,
): string {
  return molde
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
