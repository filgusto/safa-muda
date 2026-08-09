import { describe, it, expect } from "vitest";
import {
  mesRelativoParaData,
  dataParaMesRelativo,
  anosParaMeses,
  mesesParaAnos,
  zoomSugerido,
} from "./tempo.ts";

const inicio = new Date(2026, 0, 15); // 15/01/2026

describe("conversão de tempo do planejamento", () => {
  it("converte anos e meses nos dois sentidos", () => {
    expect(anosParaMeses(3)).toBe(36);
    expect(mesesParaAnos(18)).toBe(1.5);
  });

  it("posiciona um mês relativo numa data absoluta", () => {
    const data = mesRelativoParaData(inicio, 14);
    expect(data.getFullYear()).toBe(2027);
    expect(data.getMonth()).toBe(2); // março
  });

  it("faz ida e volta entre mês relativo e data", () => {
    for (const mes of [0, 1, 7, 24, 120]) {
      expect(
        dataParaMesRelativo(inicio, mesRelativoParaData(inicio, mes)),
      ).toBe(mes);
    }
  });

  it("não conta um mês que ainda não se completou", () => {
    // 10/02 é menos de um mês depois de 15/01.
    expect(dataParaMesRelativo(inicio, new Date(2026, 1, 10))).toBe(0);
    // 15/02 completa o mês.
    expect(dataParaMesRelativo(inicio, new Date(2026, 1, 15))).toBe(1);
  });

  it("aceita datas anteriores ao início do projeto", () => {
    expect(dataParaMesRelativo(inicio, new Date(2025, 11, 15))).toBe(-1);
  });
});

describe("zoom da timeline", () => {
  it("usa mês para horizontes curtos", () => {
    expect(zoomSugerido(12)).toBe("mes");
    expect(zoomSugerido(60)).toBe("mes");
  });

  it("agrega em trimestre e ano conforme o horizonte cresce", () => {
    expect(zoomSugerido(120)).toBe("trimestre");
    // Um sistema de 50 anos precisa agregar, ou vira 600 colunas.
    expect(zoomSugerido(600)).toBe("ano");
  });
});
