import { describe, it, expect } from "vitest";
import {
  estadoRealizado,
  dataDeImplantacao,
  desvioDaImplantacao,
  totaisDeColheita,
  agruparPorMes,
  EVENTO_COM_QUANTIDADE,
  TIPOS_DE_EVENTO,
  EVENTO_LABEL,
  type EventoDoDiario,
} from "./diario.ts";

const evento = (
  tipo: EventoDoDiario["tipo"],
  ano: number,
  mes: number,
  dia: number,
  quantidade: number | null = null,
  unidade: string | null = null,
): EventoDoDiario => ({
  tipo,
  ocorridoEm: new Date(ano, mes - 1, dia),
  quantidade,
  unidade,
});

describe("estado realizado", () => {
  it("é planejado enquanto nada foi plantado", () => {
    expect(estadoRealizado([])).toBe("planejado");
    expect(estadoRealizado([evento("observacao", 2026, 3, 1)])).toBe(
      "planejado",
    );
  });

  it("vira plantado ao registrar plantio ou semeadura", () => {
    expect(estadoRealizado([evento("plantio", 2026, 3, 14, 28)])).toBe(
      "plantado",
    );
    expect(estadoRealizado([evento("semeadura", 2026, 3, 14, 100)])).toBe(
      "plantado",
    );
  });

  it("encerra quando a mortalidade alcança o que foi plantado", () => {
    const eventos = [
      evento("plantio", 2026, 3, 14, 28),
      evento("mortalidade", 2026, 8, 2, 10),
      evento("mortalidade", 2027, 1, 5, 18),
    ];
    expect(estadoRealizado(eventos)).toBe("encerrado");
  });

  it("segue plantado com mortalidade parcial", () => {
    const eventos = [
      evento("plantio", 2026, 3, 14, 28),
      evento("mortalidade", 2026, 8, 2, 10),
    ];
    expect(estadoRealizado(eventos)).toBe("plantado");
  });

  it("não encerra sem quantidade registrada", () => {
    // Plantio sem número não permite concluir que a mortalidade zerou tudo.
    const eventos = [
      evento("plantio", 2026, 3, 14, null),
      evento("mortalidade", 2026, 8, 2, 5),
    ];
    expect(estadoRealizado(eventos)).toBe("plantado");
  });
});

describe("data de implantação", () => {
  it("pega o primeiro plantio, não o último", () => {
    const eventos = [
      evento("plantio", 2026, 5, 20, 10),
      evento("plantio", 2026, 3, 14, 18),
    ];
    expect(dataDeImplantacao(eventos)).toEqual(new Date(2026, 2, 14));
  });

  it("devolve null sem implantação", () => {
    expect(dataDeImplantacao([evento("poda", 2026, 6, 1)])).toBeNull();
  });
});

describe("desvio da implantação", () => {
  const inicioDoProjeto = new Date(2026, 0, 15);

  it("mede atraso em meses", () => {
    // Planejado para o mês 2; plantado em 15/05/2026, que é o mês 4.
    const desvio = desvioDaImplantacao({
      inicioDoProjeto,
      mesPlanejado: 2,
      eventos: [evento("plantio", 2026, 5, 15, 20)],
    });
    expect(desvio).toBe(2);
  });

  it("mede adiantamento como negativo", () => {
    const desvio = desvioDaImplantacao({
      inicioDoProjeto,
      mesPlanejado: 6,
      eventos: [evento("plantio", 2026, 3, 15, 20)],
    });
    expect(desvio).toBe(-4);
  });

  it("é zero quando saiu no mês previsto", () => {
    const desvio = desvioDaImplantacao({
      inicioDoProjeto,
      mesPlanejado: 2,
      eventos: [evento("plantio", 2026, 3, 15, 20)],
    });
    expect(desvio).toBe(0);
  });

  it("devolve null enquanto não plantou", () => {
    expect(
      desvioDaImplantacao({
        inicioDoProjeto,
        mesPlanejado: 2,
        eventos: [evento("observacao", 2026, 4, 1)],
      }),
    ).toBeNull();
  });
});

describe("totais de colheita", () => {
  it("soma por unidade", () => {
    const totais = totaisDeColheita([
      evento("colheita", 2026, 9, 1, 12, "kg"),
      evento("colheita", 2026, 10, 3, 8.5, "kg"),
      evento("colheita", 2026, 10, 3, 3, "maços"),
    ]);

    expect(totais).toHaveLength(2);
    expect(totais[0]).toEqual({ unidade: "kg", total: 20.5, registros: 2 });
    expect(totais[1]).toEqual({ unidade: "maços", total: 3, registros: 1 });
  });

  it("não mistura unidades diferentes", () => {
    // Somar kg com maços daria um número sem significado.
    const totais = totaisDeColheita([
      evento("colheita", 2026, 9, 1, 10, "kg"),
      evento("colheita", 2026, 9, 1, 10, "maços"),
    ]);
    expect(totais.every((linha) => linha.total === 10)).toBe(true);
  });

  it("ignora eventos que não são colheita", () => {
    expect(totaisDeColheita([evento("poda", 2026, 9, 1, 5, "kg")])).toEqual([]);
  });

  it("agrupa colheita sem unidade num rótulo próprio", () => {
    const totais = totaisDeColheita([evento("colheita", 2026, 9, 1, 7, null)]);
    expect(totais[0]!.unidade).toBe("sem unidade");
  });
});

describe("agrupamento por mês", () => {
  it("agrupa e ordena do mais recente para o mais antigo", () => {
    const grupos = agruparPorMes([
      evento("poda", 2026, 3, 5),
      evento("colheita", 2026, 9, 2),
      evento("poda", 2026, 3, 20),
    ]);

    expect(grupos.map((grupo) => grupo.chave)).toEqual(["2026-09", "2026-03"]);
    expect(grupos[1]!.eventos).toHaveLength(2);
  });
});

describe("metadados dos tipos", () => {
  it("todo tipo tem rótulo", () => {
    for (const tipo of TIPOS_DE_EVENTO) {
      expect(EVENTO_LABEL[tipo], tipo).toBeTruthy();
    }
  });

  it("colheita e plantio pedem quantidade; poda não", () => {
    expect(EVENTO_COM_QUANTIDADE.has("colheita")).toBe(true);
    expect(EVENTO_COM_QUANTIDADE.has("plantio")).toBe(true);
    expect(EVENTO_COM_QUANTIDADE.has("poda")).toBe(false);
  });
});
