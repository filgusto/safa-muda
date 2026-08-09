/**
 * O plano métrico local — decisão central do mapa (docs/PLANO.md §3.2).
 *
 * Toda geometria de desenho é armazenada em METROS, num plano cartesiano com
 * origem na âncora da área. O georreferenciamento é um atributo opcional, não
 * um formato alternativo de armazenamento.
 *
 * Com isso:
 *   - espaçamento, comprimento e densidade são aritmética simples;
 *   - croqui e SIG renderizam a MESMA geometria, sem conversão nem
 *     sincronização;
 *   - georreferenciar depois (ou nunca) não migra dado nenhum.
 *
 * Módulo puro: sem React, sem banco, sem I/O.
 */

/** Ponto no plano local, em metros a partir da âncora. X = leste, Y = norte. */
export interface PontoLocal {
  x: number;
  y: number;
}

export interface Georreferencia {
  /** Latitude da origem do plano local, em graus. */
  anchorLat: number;
  /** Longitude da origem do plano local, em graus. */
  anchorLon: number;
  /** Rotação do plano local em relação ao norte verdadeiro, em graus horários. */
  rotationDeg: number;
}

export interface CoordenadaWgs84 {
  lat: number;
  lon: number;
}

const RAIO_TERRA_M = 6_378_137;
const GRAUS_PARA_RAD = Math.PI / 180;

/**
 * Projeção local → WGS84 por plano tangente equiretangular na âncora.
 *
 * Na escala de um lote (poucos km) o erro é centimétrico, muito abaixo da
 * precisão de qualquer desenho agroflorestal. Se algum dia o projeto precisar
 * de áreas de dezenas de km, troque por UTM via proj4 — a interface não muda.
 */
export function localParaWgs84(
  ponto: PontoLocal,
  georref: Georreferencia,
): CoordenadaWgs84 {
  const { x, y } = rotacionar(ponto, georref.rotationDeg);

  const dLat = y / RAIO_TERRA_M / GRAUS_PARA_RAD;
  const dLon =
    x /
    (RAIO_TERRA_M * Math.cos(georref.anchorLat * GRAUS_PARA_RAD)) /
    GRAUS_PARA_RAD;

  return {
    lat: georref.anchorLat + dLat,
    lon: georref.anchorLon + dLon,
  };
}

/** Inversa de localParaWgs84. Usada ao desenhar sobre o mapa no modo SIG. */
export function wgs84ParaLocal(
  coord: CoordenadaWgs84,
  georref: Georreferencia,
): PontoLocal {
  const dLat = (coord.lat - georref.anchorLat) * GRAUS_PARA_RAD;
  const dLon = (coord.lon - georref.anchorLon) * GRAUS_PARA_RAD;

  const y = dLat * RAIO_TERRA_M;
  const x = dLon * RAIO_TERRA_M * Math.cos(georref.anchorLat * GRAUS_PARA_RAD);

  return rotacionar({ x, y }, -georref.rotationDeg);
}

function rotacionar(ponto: PontoLocal, graus: number): PontoLocal {
  if (graus === 0) return ponto;
  const rad = graus * GRAUS_PARA_RAD;
  const cos = Math.cos(rad);
  const sen = Math.sin(rad);
  return {
    x: ponto.x * cos - ponto.y * sen,
    y: ponto.x * sen + ponto.y * cos,
  };
}

/** Distância euclidiana em metros — o plano local torna isto exato. */
export function distancia(a: PontoLocal, b: PontoLocal): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Comprimento total de uma polilinha, em metros. */
export function comprimento(caminho: readonly PontoLocal[]): number {
  let total = 0;
  for (let i = 1; i < caminho.length; i++) {
    total += distancia(caminho[i - 1]!, caminho[i]!);
  }
  return total;
}

/** Área de um polígono pela fórmula do shoelace, em m². */
export function area(poligono: readonly PontoLocal[]): number {
  if (poligono.length < 3) return 0;
  let soma = 0;
  for (let i = 0; i < poligono.length; i++) {
    const atual = poligono[i]!;
    const proximo = poligono[(i + 1) % poligono.length]!;
    soma += atual.x * proximo.y - proximo.x * atual.y;
  }
  return Math.abs(soma) / 2;
}

/** Ponto a `metros` do início da polilinha. Null se o caminho for mais curto. */
export function pontoAoLongo(
  caminho: readonly PontoLocal[],
  metros: number,
): PontoLocal | null {
  if (caminho.length === 0 || metros < 0) return null;
  if (metros === 0) return caminho[0]!;

  let percorrido = 0;
  for (let i = 1; i < caminho.length; i++) {
    const a = caminho[i - 1]!;
    const b = caminho[i]!;
    const trecho = distancia(a, b);

    if (percorrido + trecho >= metros) {
      const fracao = trecho === 0 ? 0 : (metros - percorrido) / trecho;
      return {
        x: a.x + (b.x - a.x) * fracao,
        y: a.y + (b.y - a.y) * fracao,
      };
    }
    percorrido += trecho;
  }
  return null;
}

/**
 * Gera as posições dos indivíduos de um plantio ao longo de um segmento de
 * linha — a materialização da "regra de posicionamento" (docs/PLANO.md §3.3).
 *
 * Não persiste nada: o desenho guarda a regra, e as posições são derivadas sob
 * demanda. É o que permite uma leira de 200 m com 800 mudas sem 800 linhas no
 * banco.
 */
export function posicoesAoLongoDaLinha(params: {
  caminho: readonly PontoLocal[];
  deMetros: number;
  ateMetros: number;
  espacamentoMetros: number;
}): PontoLocal[] {
  const { caminho, deMetros, ateMetros, espacamentoMetros } = params;

  if (espacamentoMetros <= 0 || ateMetros <= deMetros) return [];

  const posicoes: PontoLocal[] = [];
  for (let d = deMetros; d <= ateMetros; d += espacamentoMetros) {
    const ponto = pontoAoLongo(caminho, d);
    if (ponto) posicoes.push(ponto);
  }
  return posicoes;
}
