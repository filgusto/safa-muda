import {
  acharMunicipio,
  formatarLocal,
  formatarRegiao,
  parsearLocal,
  parsearRegiao,
  type Estado,
} from "@/lib/regiao.ts";

/**
 * Localidades do IBGE (API de Localidades, aberta e sem chave).
 *
 * A consulta sai do servidor, e não do navegador: o CSP do site só libera
 * `connect-src 'self'` (next.config.mjs), e assim o resultado também é
 * cacheado — estados e municípios quase não mudam.
 */

const BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";
const TRINTA_DIAS = 60 * 60 * 24 * 30;

async function buscar<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    next: { revalidate: TRINTA_DIAS },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}.`);
  return resposta.json() as Promise<T>;
}

export async function listarEstados(): Promise<Estado[]> {
  const dados = await buscar<Array<{ sigla: string; nome: string }>>(
    "/estados?orderBy=nome",
  );
  return dados.map(({ sigla, nome }) => ({ sigla, nome }));
}

/** Nomes dos municípios de uma UF, em ordem alfabética. */
export async function listarMunicipios(uf: string): Promise<string[]> {
  const dados = await buscar<Array<{ nome: string }>>(
    `/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`,
  );
  return dados.map((municipio) => municipio.nome);
}

export type ResultadoDaRegiao =
  { ok: true; valor: string } | { ok: false; erro: string };

/**
 * Confere "Cidade, UF" contra o IBGE e devolve o texto canônico (acentos e
 * caixa do jeito do IBGE). Se o IBGE estiver fora do ar, recusa — melhor pedir
 * para tentar de novo do que guardar um valor que ninguém conferiu.
 */
export async function validarRegiao(texto: string): Promise<ResultadoDaRegiao> {
  const regiao = parsearRegiao(texto);
  if (!regiao) return { ok: false, erro: "Escolha o estado e a cidade." };

  try {
    const estados = await listarEstados();
    if (!estados.some((estado) => estado.sigla === regiao.uf)) {
      return { ok: false, erro: "Estado inválido." };
    }

    const cidade = acharMunicipio(
      await listarMunicipios(regiao.uf),
      regiao.cidade,
    );
    return cidade
      ? { ok: true, valor: formatarRegiao(cidade, regiao.uf) }
      : { ok: false, erro: "Cidade não encontrada nesse estado." };
  } catch (erro) {
    console.error("Falha ao consultar o IBGE:", erro);
    return {
      ok: false,
      erro: "Não foi possível consultar o IBGE agora. Tente de novo em instantes.",
    };
  }
}

/**
 * Confere o local de uma observação ("Cidade, UF" ou só "UF") e devolve o texto
 * canônico. Texto vazio é "sem local": o campo é opcional, porque a fonte pode
 * não dizer onde a observação foi feita. O que vier preenchido precisa existir
 * no IBGE — dado solto atrapalharia a análise que motiva o campo.
 */
export async function validarLocal(
  texto: string | null | undefined,
): Promise<{ ok: true; valor: string | null } | { ok: false; erro: string }> {
  if (!texto?.trim()) return { ok: true, valor: null };

  const local = parsearLocal(texto);
  if (!local) return { ok: false, erro: "Local inválido: escolha na lista." };
  if (local.cidade) return validarRegiao(texto);

  try {
    const estados = await listarEstados();
    return estados.some((estado) => estado.sigla === local.uf)
      ? { ok: true, valor: formatarLocal(local.uf, "") }
      : { ok: false, erro: "Estado inválido." };
  } catch (erro) {
    console.error("Falha ao consultar o IBGE:", erro);
    return {
      ok: false,
      erro: "Não foi possível consultar o IBGE agora. Tente de novo em instantes.",
    };
  }
}
