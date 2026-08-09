#!/usr/bin/env python3
"""
Monta o dataset final do catálogo a partir da extração bruta, das correções
manuais e do enriquecimento bibliográfico.

    python3 scripts/dataset/montar-dataset.py

Entradas (todas commitadas, para que o resultado seja auditável):
    scripts/dataset/tabela-bruta.tsv              extração do PDF
    scripts/dataset/correcoes.json                correções manuais
    scripts/dataset/enriquecimento-neto-cap10.json  ciclo e espaçamento

Saída:
    app/db/seed/especies.json                     dataset do seed

Cada espécie carrega `fontes`, um mapa campo -> origem do valor. É isso que
permite corrigir a tabela original sem perder o rastro e mostrar na interface
de onde veio cada número.
"""

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DIR = RAIZ / "scripts" / "dataset"
SAIDA = RAIZ / "app" / "db" / "seed" / "especies.json"

FONTE_TABELA = "messerschmidt"
FONTE_CORRECAO = "correcao-editorial"

# ── Vocabulário da fonte -> identificadores do schema ────────────────────────

ESTRATO = {
    "Emergente": "emergente", "Alto": "alto", "Médio": "medio",
    "Baixo": "baixo", "Rasteiro": "rasteiro",
}
SUCESSAO = {
    "Placenta 1": "placenta_1", "Placenta 2": "placenta_2",
    "Pioneira": "pioneira", "Secundária Inicial": "secundaria_inicial",
    "Secundária Média": "secundaria_media",
    "Secundária Tardia": "secundaria_tardia", "Clímax": "climax",
}
SISTEMA = {
    "Retomada": "retomada", "Acumulação": "acumulacao",
    "Abundância": "abundancia",
}
GRUPO = {
    "Fruta": "fruta", "Matéria Orgânica": "materia_organica",
    "Hortaliça": "hortalica", "Madeira": "madeira", "Medicinal": "medicinal",
    "Ornamental": "ornamental", "Panc": "panc", "Palmeira": "palmeira",
    "Grão": "grao", "Castanha": "castanha", "Tempero": "tempero",
    "Aromática": "aromatica", "Palmito": "palmito",
    "Artesanato": "artesanato", "Tubérculo": "tuberculo", "Casca": "casca",
    "Bebida": "bebida", "Forrageira": "forrageira",
}


def gerar_slug(texto: str) -> str:
    """Slug ASCII estável, usado como identificador público da espécie."""
    sem_acento = "".join(
        caractere
        for caractere in unicodedata.normalize("NFD", texto)
        if unicodedata.category(caractere) != "Mn"
    )
    return re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()).strip("-")


def mapear(valor, tabela, rotulo, contexto):
    if valor is None or valor == "":
        return None
    if valor not in tabela:
        sys.exit(f"Valor de {rotulo} não reconhecido em '{contexto}': {valor!r}")
    return tabela[valor]


def carregar_json(nome):
    with open(DIR / nome, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def main():
    correcoes = carregar_json("correcoes.json")
    enriquecimento = carregar_json("enriquecimento-neto-cap10.json")

    with open(DIR / "tabela-bruta.tsv", encoding="utf-8") as arquivo:
        brutas = list(csv.DictReader(arquivo, delimiter="\t"))

    registros: dict[str, dict] = {}
    contadores = {
        "extraidas": len(brutas), "corrigidas": 0, "reconstruidas": 0,
        "duplicatas_removidas": 0, "enriquecidas": 0,
    }

    # ── 1. Linhas extraídas automaticamente ──────────────────────────────────
    for bruta in brutas:
        nome = bruta["nome_comum"]
        registros[nome] = {
            "nome_comum": nome,
            "nome_cientifico": bruta["nome_cientifico"],
            "familia": bruta["familia"],
            "estrato": bruta["estrato"] or None,
            "sucessao": bruta["sucessao"] or None,
            "sistema": bruta["sistema"] or None,
            "grupos": [bruta["grupo"]],
            "sinonimos": [],
            "notas": [],
            "fontes": {
                campo: FONTE_TABELA
                for campo in ("nome_cientifico", "familia", "estrato",
                              "sucessao", "sistema", "grupos")
            },
        }

    # ── 2. Linhas que o parser recusou, reconstruídas manualmente ────────────
    for nome, entrada in correcoes["linhas_manuais"].items():
        campos = entrada["campos"]
        # A linha inteira foi remontada à mão, mas a maior parte dos valores
        # veio da fonte: só `campos_corrigidos` não veio. A proveniência precisa
        # refletir isso, senão a interface atribui ao editor um dado que é do
        # Messerschmidt.
        corrigidos = set(entrada["campos_corrigidos"])
        registros[nome] = {
            "nome_comum": nome,
            "nome_cientifico": campos["nome_cientifico"],
            "familia": campos["familia"],
            "estrato": campos["estrato"],
            "sucessao": campos["sucessao"],
            "sistema": campos["sistema"],
            "grupos": [campos["grupo"]],
            "sinonimos": [],
            "notas": [entrada["motivo"]],
            "fontes": {
                campo: FONTE_CORRECAO if campo in corrigidos else FONTE_TABELA
                for campo in ("nome_cientifico", "familia", "estrato",
                              "sucessao", "sistema", "grupos")
            },
        }
        contadores["reconstruidas"] += 1

    # ── 3. Correções pontuais em linhas bem extraídas ────────────────────────
    for nome, entrada in correcoes["correcoes"].items():
        if nome not in registros:
            sys.exit(f"Correção para espécie inexistente: {nome!r}")
        registro = registros[nome]
        for campo, valor in entrada["campos"].items():
            registro[campo] = valor
            registro["fontes"][campo] = FONTE_CORRECAO
        registro["notas"].append(entrada["motivo"])
        contadores["corrigidas"] += 1

    # ── 4. Duplicatas ────────────────────────────────────────────────────────
    for duplicata in correcoes["duplicatas"]:
        manter, remover = duplicata["manter"], duplicata["remover"]
        if remover in registros:
            del registros[remover]
            contadores["duplicatas_removidas"] += 1
        if manter in registros:
            registros[manter]["notas"].append(duplicata["motivo"])
            for campo, valor in duplicata.get("campos_do_mantido", {}).items():
                registros[manter][campo] = valor
                registros[manter]["fontes"][campo] = FONTE_CORRECAO

    # ── 5. Sinônimos ─────────────────────────────────────────────────────────
    for nome, lista in correcoes["sinonimos"].items():
        if nome in registros:
            registros[nome]["sinonimos"] = lista

    # ── 6. Enriquecimento bibliográfico ──────────────────────────────────────
    fonte_enriquecimento = enriquecimento["fonte"]
    for nome, dados in enriquecimento["especies"].items():
        if nome not in registros:
            sys.exit(f"Enriquecimento para espécie inexistente: {nome!r}")
        registro = registros[nome]

        for campo, valor in dados.items():
            if campo in ("tabelas", "nota"):
                continue
            registro[campo] = valor
            registro["fontes"][campo] = fonte_enriquecimento

        tabelas = ", ".join(str(numero) for numero in dados["tabelas"])
        registro["notas"].append(
            f"Ciclo e espaçamento das tabelas {tabelas} do cap. 10 de "
            f"Agroflorestando o Mundo."
        )
        if "nota" in dados:
            registro["notas"].append(dados["nota"])
        contadores["enriquecidas"] += 1

    # ── 7. Normalização final para o schema ──────────────────────────────────
    saida = []
    slugs_usados: dict[str, str] = {}

    for nome in sorted(registros, key=lambda chave: gerar_slug(chave)):
        registro = registros[nome]
        slug = gerar_slug(nome)

        if slug in slugs_usados:
            sys.exit(f"Slug duplicado {slug!r}: {slugs_usados[slug]!r} e {nome!r}")
        slugs_usados[slug] = nome

        saida.append(
            {
                "slug": slug,
                "nomeComum": registro["nome_comum"],
                "nomeCientifico": registro["nome_cientifico"],
                "familia": registro["familia"],
                "estrato": mapear(registro["estrato"], ESTRATO, "estrato", nome),
                "sucessao": mapear(registro["sucessao"], SUCESSAO, "sucessão", nome),
                "sistema": mapear(registro["sistema"], SISTEMA, "sistema", nome),
                "grupos": [
                    mapear(grupo, GRUPO, "grupo", nome) for grupo in registro["grupos"]
                ],
                "sinonimos": registro["sinonimos"],
                "diasParaColherMin": registro.get("dias_para_colher_min"),
                "diasParaColherMax": registro.get("dias_para_colher_max"),
                "espacamentoEntreLinhasMinM": registro.get("espacamento_entre_linhas_min_m"),
                "espacamentoEntreLinhasMaxM": registro.get("espacamento_entre_linhas_max_m"),
                "espacamentoNaLinhaMinM": registro.get("espacamento_na_linha_min_m"),
                "espacamentoNaLinhaMaxM": registro.get("espacamento_na_linha_max_m"),
                "notas": registro["notas"],
                "fontes": registro["fontes"],
            }
        )

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, ensure_ascii=False, indent=2)
        arquivo.write("\n")

    faltando = {
        campo: sum(1 for especie in saida if especie[campo] is None)
        for campo in ("estrato", "sucessao", "sistema")
    }

    print(f"Dataset montado: {len(saida)} espécies -> {SAIDA.relative_to(RAIZ)}")
    print(f"  extraídas automaticamente : {contadores['extraidas']}")
    print(f"  reconstruídas à mão       : {contadores['reconstruidas']}")
    print(f"  corrigidas                : {contadores['corrigidas']}")
    print(f"  duplicatas removidas      : {contadores['duplicatas_removidas']}")
    print(f"  enriquecidas (cap. 10)    : {contadores['enriquecidas']}")
    print("  campos sem valor na fonte :")
    for campo, quantidade in faltando.items():
        print(f"      {campo:10} {quantidade}")


if __name__ == "__main__":
    main()
