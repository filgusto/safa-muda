"use client";

import { useMemo } from "react";
import {
  lonLatParaPixelDoMundo,
  metrosPorPixel,
  zoomParaResolucao,
  faixaDeTiles,
  totalDeTiles,
  transformacaoDoFundo,
  paraCssMatrix,
  urlDoTile,
  TAMANHO_DO_TILE,
} from "@/core/mercator.ts";
import { localParaWgs84, type Georreferencia } from "@/core/geo.ts";
import type { ProvedorDeMapa } from "@/lib/tiles.ts";

/**
 * Mapa de fundo atrás do croqui.
 *
 * Não é um segundo renderizador: o croqui continua desenhando o plano métrico
 * local, e isto apenas coloca tiles alinhados atrás dele. É o que mantém a
 * promessa do ADR 0001 — croqui e SIG renderizam a MESMA geometria, sem
 * conversão nem sincronização.
 *
 * Os tiles são posicionados em coordenadas de Mercator dentro de um contêiner
 * que recebe uma única transformação afim. O navegador faz o resto; nada é
 * recalculado por tile a cada quadro.
 */
export function FundoDeMapa({
  georref,
  provedor,
  vista,
  largura,
  altura,
}: {
  georref: Georreferencia;
  provedor: ProvedorDeMapa;
  /** Recorte visível do plano local, em metros. */
  vista: { x: number; y: number; largura: number; altura: number };
  /** Tamanho do elemento na tela, em pixels. */
  largura: number;
  altura: number;
}) {
  const camada = useMemo(() => {
    if (largura <= 0 || altura <= 0) return null;

    // O croqui usa preserveAspectRatio="xMidYMid meet": a escala é a menor das
    // duas, e sobra margem no eixo mais folgado.
    const pixelsPorMetro = Math.min(
      largura / vista.largura,
      altura / vista.altura,
    );
    const margemX = (largura - vista.largura * pixelsPorMetro) / 2;
    const margemY = (altura - vista.altura * pixelsPorMetro) / 2;

    const metrosPorPixelDaTela = 1 / pixelsPorMetro;
    const zoom = zoomParaResolucao(
      georref.anchorLat,
      metrosPorPixelDaTela,
      provedor.zoomMaximo,
    );

    const metrosPorPixelDoMundo = metrosPorPixel(georref.anchorLat, zoom);
    const ancoraNoMundo = lonLatParaPixelDoMundo(
      georref.anchorLon,
      georref.anchorLat,
      zoom,
    );

    // Onde o (0,0) do plano local cai na tela.
    const ancoraNaTela = {
      x: margemX - vista.x * pixelsPorMetro,
      y: margemY + (vista.y + vista.altura) * pixelsPorMetro,
    };

    // Os quatro cantos do recorte, levados ao mundo, dão a faixa de tiles.
    const cantos = [
      { x: vista.x, y: vista.y },
      { x: vista.x + vista.largura, y: vista.y },
      { x: vista.x, y: vista.y + vista.altura },
      { x: vista.x + vista.largura, y: vista.y + vista.altura },
    ].map((canto) => {
      const wgs = localParaWgs84(canto, georref);
      return lonLatParaPixelDoMundo(wgs.lon, wgs.lat, zoom);
    });

    const faixa = faixaDeTiles(
      {
        x: Math.min(...cantos.map((c) => c.x)),
        y: Math.min(...cantos.map((c) => c.y)),
      },
      {
        x: Math.max(...cantos.map((c) => c.x)),
        y: Math.max(...cantos.map((c) => c.y)),
      },
      zoom,
      1,
    );

    // Guarda contra pedir centenas de imagens de uma vez — acontece se a
    // vista for afastada demais para o zoom escolhido.
    if (totalDeTiles(faixa) > 220) return null;

    // Origem local do espaço de tiles: mantém as coordenadas pequenas.
    const origemDoMundo = {
      x: faixa.xInicial * TAMANHO_DO_TILE,
      y: faixa.yInicial * TAMANHO_DO_TILE,
    };

    const transformacao = transformacaoDoFundo({
      ancoraNoMundo,
      ancoraNaTela,
      metrosPorPixelDoMundo,
      pixelsPorMetro,
      rotacaoGraus: georref.rotationDeg,
      origemDoMundo,
    });

    const tiles: { chave: string; url: string; x: number; y: number }[] = [];
    for (let x = faixa.xInicial; x <= faixa.xFinal; x++) {
      for (let y = faixa.yInicial; y <= faixa.yFinal; y++) {
        tiles.push({
          chave: `${zoom}/${x}/${y}`,
          url: urlDoTile(provedor.url, zoom, x, y),
          x: x * TAMANHO_DO_TILE - origemDoMundo.x,
          y: y * TAMANHO_DO_TILE - origemDoMundo.y,
        });
      }
    }

    return { tiles, transformacao };
  }, [georref, provedor, vista, largura, altura]);

  if (!camada) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: paraCssMatrix(camada.transformacao) }}
      >
        {camada.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.chave}
            src={tile.url}
            alt=""
            width={TAMANHO_DO_TILE}
            height={TAMANHO_DO_TILE}
            // Sem `loading="lazy"`: os tiles ficam em coordenadas de Mercator
            // (centenas de milhares de pixels) e só entram na viewport pela
            // transformação do contêiner. O carregamento preguiçoso olha a
            // posição de layout e conclui que estão fora da tela — nenhum
            // chega a ser buscado. A faixa já é limitada em `faixaDeTiles`.
            draggable={false}
            className="absolute max-w-none"
            style={{ left: tile.x, top: tile.y }}
          />
        ))}
      </div>
    </div>
  );
}
