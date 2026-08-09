#!/usr/bin/env python3
"""
Extrai a "Tabela Guia de Estratos Agroflorestais" (Namastê Messerschmidt) do PDF
para TSV estruturado.

Ferramenta de uso único, mantida no repositório para que a extração seja
auditável: qualquer pessoa pode rodar de novo sobre o PDF original e comparar
com o TSV commitado.

    pip install pdfplumber
    python3 scripts/dataset/extrair-tabela.py \
        "_references/TABELA GUIA DE ESTRATOS AGROFLORESTAIS - NAMASTÊ MESSERSCHMIDT.pdf" \
        scripts/dataset/tabela-bruta.tsv

O PDF não tem estrutura de tabela recuperável — cada linha vem como texto
corrido. O parser resolve isso lendo da DIREITA para a esquerda, ancorado em
vocabulários fechados (grupo, sistema, sucessão, estrato), o que deixa à
esquerda apenas nome comum + nome científico + família.

Linhas que não casam com o esperado NÃO são adivinhadas: saem no relatório de
anomalias para correção manual explícita em `correcoes.json`.
"""

import sys
import re
import json

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber não instalado. Rode: pip install pdfplumber")


# ── Vocabulários fechados, do mais longo para o mais curto ───────────────────
# A ordem importa: "Matéria Orgânica" precisa ser testado antes de "Orgânica",
# e "Secundária Inicial" antes de "Secundária".

GRUPOS = [
    "Matéria Orgânica", "Fruta", "Hortaliça", "Madeira", "Medicinal",
    "Ornamental", "Panc", "Palmeira", "Grão", "Castanha", "Tempero",
    "Aromática", "Palmito", "Artesanato", "Tubérculo", "Casca", "Bebida",
    "Forrageira",
]

SISTEMAS = ["Abundância", "Acumulação", "Retomada"]

SUCESSOES = [
    "Secundária Inicial", "Secundária Média", "Secundária Tardia",
    "Placenta 1", "Placenta 2", "Pioneira", "Clímax",
]

ESTRATOS = ["Emergente", "Alto", "Médio", "Baixo"]

# Erros de digitação na fonte, normalizados na extração. Cada um foi conferido
# contra o contexto da linha — ver o relatório gerado.
NORMALIZACOES_FONTE = {
    "Placenda": "Placenta",
    "Plaventa": "Placenta",
    "Secundatia": "Secundária",
}

# Marcadores que fazem o nome científico crescer além do binômio.
MARCADORES_INFRA = {"subsp.", "var.", "spp.", "sp.", "×", "x", "f.", "cv."}

CABECALHOS = ("TABELA GUIA", "Nome Comum")


def normalizar_fonte(linha: str) -> tuple[str, list[str]]:
    """Aplica as correções de digitação, registrando o que foi mudado."""
    aplicadas = []
    for errado, certo in NORMALIZACOES_FONTE.items():
        if errado in linha:
            linha = linha.replace(errado, certo)
            aplicadas.append(f"{errado}->{certo}")
    return linha, aplicadas


def consumir_do_fim(tokens: list[str], vocabulario: list[str]) -> str | None:
    """Remove e devolve o termo do vocabulário que encerra a lista de tokens."""
    for termo in vocabulario:
        partes = termo.split()
        if len(tokens) >= len(partes) and tokens[-len(partes):] == partes:
            del tokens[-len(partes):]
            return termo
    return None


def separar_nomes(tokens: list[str]) -> tuple[str, str, str] | None:
    """
    Separa `nome comum | nome científico | família` do que sobrou à esquerda.

    A família é o último token. O nome científico é reconhecido caminhando da
    direita para a esquerda: acumula epítetos (minúsculos, marcadores ou
    cultivares entre aspas) até encontrar o gênero — o primeiro token
    capitalizado. O que restar antes disso é o nome comum.
    """
    if len(tokens) < 3:
        return None

    familia = tokens[-1]
    restante = tokens[:-1]

    # Agrupa cultivares entre aspas simples num único token, para que
    # 'Dwarf Cavendish' não seja confundido com gênero + epíteto.
    agrupados: list[str] = []
    buffer: list[str] = []
    for token in restante:
        if buffer:
            buffer.append(token)
            if token.endswith("'"):
                agrupados.append(" ".join(buffer))
                buffer = []
        elif token.startswith("'") and not token.endswith("'"):
            buffer = [token]
        else:
            agrupados.append(token)
    if buffer:
        agrupados.extend(buffer)

    epitetos: list[str] = []
    for indice in range(len(agrupados) - 1, -1, -1):
        token = agrupados[indice]
        eh_genero = token[:1].isupper() and not token.startswith("'")

        if eh_genero:
            # Gênero encontrado: precisa de ao menos um epíteto à direita e de
            # algum nome comum à esquerda.
            if not epitetos or indice == 0:
                return None
            cientifico = " ".join(agrupados[indice:])
            comum = " ".join(agrupados[:indice])
            return comum, cientifico, familia

        if token.lower() in MARCADORES_INFRA or token.islower() or token.startswith("'"):
            epitetos.insert(0, token)
            continue

        return None

    return None


def processar(caminho_pdf: str):
    linhas_ok = []
    anomalias = []
    normalizacoes = []

    with pdfplumber.open(caminho_pdf) as pdf:
        for numero_pagina, pagina in enumerate(pdf.pages, start=1):
            texto = pagina.extract_text() or ""
            for bruta in texto.split("\n"):
                bruta = bruta.strip()
                if not bruta or bruta.startswith(CABECALHOS):
                    continue

                linha, aplicadas = normalizar_fonte(bruta)
                if aplicadas:
                    normalizacoes.append(
                        {"pagina": numero_pagina, "linha": bruta, "correcoes": aplicadas}
                    )

                tokens = linha.split()

                grupo = consumir_do_fim(tokens, GRUPOS)
                sistema = consumir_do_fim(tokens, SISTEMAS)
                sucessao = consumir_do_fim(tokens, SUCESSOES)
                estrato = consumir_do_fim(tokens, ESTRATOS)
                nomes = separar_nomes(tokens) if tokens else None

                faltando = [
                    rotulo
                    for rotulo, valor in [
                        ("grupo", grupo), ("sistema", sistema),
                        ("sucessao", sucessao), ("estrato", estrato),
                        ("nomes", nomes),
                    ]
                    if valor is None
                ]

                if faltando:
                    anomalias.append(
                        {
                            "pagina": numero_pagina,
                            "linha": bruta,
                            "faltando": faltando,
                            "parcial": {
                                "estrato": estrato, "sucessao": sucessao,
                                "sistema": sistema, "grupo": grupo,
                                "sobrou": " ".join(tokens),
                            },
                        }
                    )
                    continue

                comum, cientifico, familia = nomes
                linhas_ok.append(
                    {
                        "nome_comum": comum,
                        "nome_cientifico": cientifico,
                        "familia": familia,
                        "estrato": estrato,
                        "sucessao": sucessao,
                        "sistema": sistema,
                        "grupo": grupo,
                        "pagina": numero_pagina,
                    }
                )

    return linhas_ok, anomalias, normalizacoes


def main():
    if len(sys.argv) != 3:
        sys.exit(f"uso: {sys.argv[0]} <pdf> <saida.tsv>")

    caminho_pdf, caminho_saida = sys.argv[1], sys.argv[2]
    linhas, anomalias, normalizacoes = processar(caminho_pdf)

    colunas = [
        "nome_comum", "nome_cientifico", "familia",
        "estrato", "sucessao", "sistema", "grupo", "pagina",
    ]
    with open(caminho_saida, "w", encoding="utf-8") as saida:
        saida.write("\t".join(colunas) + "\n")
        for linha in linhas:
            saida.write("\t".join(str(linha[coluna]) for coluna in colunas) + "\n")

    relatorio = {
        "total_extraido": len(linhas),
        "normalizacoes_de_digitacao": normalizacoes,
        "anomalias": anomalias,
    }
    caminho_relatorio = caminho_saida.rsplit(".", 1)[0] + "-relatorio.json"
    with open(caminho_relatorio, "w", encoding="utf-8") as saida:
        json.dump(relatorio, saida, ensure_ascii=False, indent=2)

    print(f"Extraídas {len(linhas)} espécies -> {caminho_saida}")
    print(f"Normalizações de digitação: {len(normalizacoes)}")
    print(f"Anomalias para correção manual: {len(anomalias)} -> {caminho_relatorio}")
    for anomalia in anomalias:
        print(f"  p.{anomalia['pagina']}: {anomalia['linha']}")
        print(f"    faltando: {', '.join(anomalia['faltando'])}")


if __name__ == "__main__":
    main()
