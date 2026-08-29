/**
 * O trajeto que um painel percorre ao abrir e ao fechar.
 *
 * Compartilhado pelo modal da ficha e pelo visor de fotos: os dois nascem de um
 * elemento que está na tela — o card na grade, a miniatura no carrossel — e
 * voltam para ele ao fechar, em vez de surgirem do nada.
 */

/**
 * Um pouco mais longo que as transições de hover do catálogo: aqui há um
 * percurso para o olho seguir, não só uma troca de cor. A saída é bem mais
 * curta — quem fecha já decidiu, e a volta não precisa ser contemplada — e
 * acelera em vez de desacelerar: a entrada pousa, a saída parte. A curva
 * exatamente espelhada da entrada foi testada e não serve, fica parada quase
 * até o fim e some num estalo.
 */
export const DURACAO_MS = 380;
export const DURACAO_SAIDA_MS = 200;
export const CURVA = "cubic-bezier(0.32, 0.72, 0, 1)";
export const CURVA_SAIDA = "cubic-bezier(0.4, 0, 1, 1)";

export function semAnimacao(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface Percurso {
  naOrigem: { transform: string };
  noLugar: { transform: string };
}

/**
 * As duas pontas do trajeto, em `transform`: o elemento de origem e o lugar
 * final do painel. O `translate(-50%, -50%)` da centralização vem do CSS;
 * repeti-lo aqui impede que a animação jogue o painel para o canto.
 *
 * Devolve `null` quando não há de onde partir: sem elemento de origem, ou com
 * ele fora da tela — crescer de um ponto que ninguém vê seria um solavanco.
 */
export function medirPercurso(
  painel: HTMLElement,
  origem: HTMLElement | null,
): Percurso | null {
  // Uma animação em curso deforma o retângulo medido, e o React reanexa a ref
  // mais de uma vez. Cancelar primeiro garante medir o destino real.
  painel.getAnimations().forEach((animacao) => animacao.cancel());

  if (!origem) return null;

  const partida = origem.getBoundingClientRect();
  const naTela =
    partida.bottom > 0 &&
    partida.top < window.innerHeight &&
    partida.right > 0 &&
    partida.left < window.innerWidth;
  if (!naTela) return null;

  const final = painel.getBoundingClientRect();
  if (final.width === 0 || final.height === 0) return null;

  // Escala única, pela largura: esticar os dois eixos deformaria o conteúdo no
  // meio do caminho.
  const escala = partida.width / final.width;
  const dx = partida.left + partida.width / 2 - (final.left + final.width / 2);
  const dy = partida.top + partida.height / 2 - (final.top + final.height / 2);

  return {
    naOrigem: {
      transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${escala})`,
    },
    noLugar: { transform: "translate(-50%, -50%) scale(1)" },
  };
}
