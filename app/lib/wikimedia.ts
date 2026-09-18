/**
 * Importação de foto a partir de uma ficha de arquivo do Wikimedia Commons.
 *
 * O Commons só hospeda mídia sob licença livre, então embutir uma dessas
 * imagens é permitido — mas a atribuição que a licença exige (autor, licença)
 * precisa ser capturada, não digitada de memória. Por isso a busca de
 * metadados fala com a API pública do Commons em vez de confiar só na URL
 * colada, e o autor/licença voltam prontos para o crédito ser conferido antes
 * de salvar.
 */

const ORIGEM = "https://commons.wikimedia.org";

export class WikimediaError extends Error {}

/**
 * Extrai o título "File:..." de uma URL de ficha do Commons.
 *
 * Só aceita o link da ficha (commons.wikimedia.org/wiki/File:...), não o link
 * raw do arquivo (upload.wikimedia.org/...) — a ficha é o identificador
 * estável, o raw pode mudar de caminho quando o arquivo é reprocessado.
 */
export function extrairTituloDoArquivo(url: string): string | null {
  let analisada: URL;
  try {
    analisada = new URL(url);
  } catch {
    return null;
  }

  if (analisada.hostname !== "commons.wikimedia.org") return null;

  const partes = analisada.pathname.split("/").filter(Boolean);
  const indice = partes.indexOf("wiki");
  const titulo = indice !== -1 ? partes[indice + 1] : undefined;
  if (!titulo || !titulo.startsWith("File:")) return null;

  return decodeURIComponent(titulo);
}

export interface MetadadosWikimedia {
  titulo: string;
  /** URL da ficha, para guardar como proveniência. */
  paginaUrl: string;
  /** Miniatura para prévia no formulário — nunca o arquivo em resolução total. */
  thumbUrl: string;
  imageUrl: string;
  mimeType: string;
  largura: number | null;
  altura: number | null;
  autor: string | null;
  licencaNome: string | null;
  licencaUrl: string | null;
  descricao: string | null;
}

/** Remove marcação HTML simples dos campos de `extmetadata` (vêm como HTML). */
function textoSimples(html: string | undefined): string | null {
  if (!html) return null;
  const texto = html.replace(/<[^>]+>/g, "").trim();
  return texto.length > 0 ? texto : null;
}

/** Largura pedida para a miniatura — grande o bastante para prévia e para caber sem redução pesada depois. */
const LARGURA_DA_MINIATURA = 1600;

export async function buscarMetadadosWikimedia(
  titulo: string,
): Promise<MetadadosWikimedia> {
  const parametros = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    titles: titulo,
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: String(LARGURA_DA_MINIATURA),
    origin: "*",
  });

  const resposta = await fetch(`${ORIGEM}/w/api.php?${parametros}`, {
    headers: { "User-Agent": "SafaMuda/1.0 (https://safamuda.org.br)" },
  });
  if (!resposta.ok) {
    throw new WikimediaError(
      "Não foi possível consultar o Wikimedia Commons agora.",
    );
  }

  const corpo = await resposta.json();
  const paginas = corpo?.query?.pages;
  const pagina = paginas ? Object.values(paginas)[0] : null;
  const info = (pagina as { imageinfo?: unknown[] } | null)?.imageinfo?.[0] as
    Record<string, unknown> | undefined;

  if (
    !pagina ||
    (pagina as { missing?: unknown }).missing !== undefined ||
    !info
  ) {
    throw new WikimediaError(
      "Arquivo não encontrado no Wikimedia Commons. Confira o link da ficha.",
    );
  }

  const extmetadata = (info.extmetadata ?? {}) as Record<
    string,
    { value?: string } | undefined
  >;

  return {
    titulo,
    paginaUrl: `${ORIGEM}/wiki/${encodeURIComponent(titulo)}`,
    thumbUrl: (info.thumburl as string | undefined) ?? (info.url as string),
    imageUrl: info.url as string,
    mimeType: info.mime as string,
    largura: (info.thumbwidth as number | undefined) ?? null,
    altura: (info.thumbheight as number | undefined) ?? null,
    autor: textoSimples(extmetadata.Artist?.value),
    licencaNome: textoSimples(extmetadata.LicenseShortName?.value),
    licencaUrl: extmetadata.LicenseUrl?.value ?? null,
    descricao: textoSimples(extmetadata.ImageDescription?.value),
  };
}

export async function baixarImagemWikimedia(url: string): Promise<Buffer> {
  const resposta = await fetch(url, {
    headers: { "User-Agent": "SafaMuda/1.0 (https://safamuda.org.br)" },
  });
  if (!resposta.ok) {
    throw new WikimediaError("Não foi possível baixar a imagem do Commons.");
  }
  return Buffer.from(await resposta.arrayBuffer());
}

/** Texto de crédito sugerido a partir dos metadados — o usuário confere e pode ajustar. */
export function sugerirCredito(metadados: MetadadosWikimedia): string {
  const partes = [
    metadados.autor ?? "Autor não informado",
    "Wikimedia Commons",
    metadados.licencaNome ?? "licença não identificada",
  ];
  return partes.join(", ");
}
