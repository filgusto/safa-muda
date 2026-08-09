import { describe, it, expect } from "vitest";
import {
  ocupacaoDoPlantio,
  ocupacaoPorEstratoNoMes,
  diagnosticar,
  lacunasDeSolo,
  mesesDeAmostra,
  colheitasPrevistas,
  type PlantioAnalisado,
} from "./analise.ts";

function plantio(over: Partial<PlantioAnalisado> = {}): PlantioAnalisado {
  return {
    id: "p1",
    nomeComum: "Alface",
    estrato: "medio",
    sucessao: "placenta_1",
    mesInicio: 0,
    mesFim: 2,
    totalDeMudas: 0,
    espacamentoEntreLinhasM: 0.25,
    espacamentoNaLinhaM: 0.2,
    ...over,
  };
}

describe("ocupação de um plantio", () => {
  it("reproduz a conta do cap. 10", () => {
    // Crotalária: 20×20 cm em monocultura, plantada a 20 cm × 1 m no consórcio.
    // Num canteiro de 100 m², a 0,2 × 1 m cabem 500 plantas.
    // O livro registra 20% de ocupação para esse caso.
    const ocupacao = ocupacaoDoPlantio(
      plantio({
        totalDeMudas: 500,
        espacamentoEntreLinhasM: 0.2,
        espacamentoNaLinhaM: 0.2,
      }),
      100,
    );
    expect(ocupacao).toBeCloseTo(0.2, 6);
  });

  it("dá 100% quando plantado na densidade da monocultura", () => {
    // 0,25 × 0,2 m = 0,05 m² por planta; 2000 plantas em 100 m².
    const ocupacao = ocupacaoDoPlantio(plantio({ totalDeMudas: 2000 }), 100);
    expect(ocupacao).toBeCloseTo(1, 6);
  });

  it("é null sem espaçamento no catálogo", () => {
    expect(
      ocupacaoDoPlantio(
        plantio({ totalDeMudas: 100, espacamentoNaLinhaM: null }),
        100,
      ),
    ).toBeNull();
  });

  it("é null para área inválida", () => {
    expect(ocupacaoDoPlantio(plantio({ totalDeMudas: 100 }), 0)).toBeNull();
  });

  it("é zero para plantio ainda sem lugar no mapa", () => {
    expect(ocupacaoDoPlantio(plantio({ totalDeMudas: 0 }), 100)).toBe(0);
  });
});

describe("ocupação por estrato num mês", () => {
  it("soma só os plantios ativos naquele mês", () => {
    const plantios = [
      plantio({ id: "a", mesInicio: 0, mesFim: 6, totalDeMudas: 1200 }),
      plantio({ id: "b", mesInicio: 10, mesFim: 20, totalDeMudas: 1200 }),
    ];

    const noMes3 = ocupacaoPorEstratoNoMes(plantios, 100, 3).find(
      (linha) => linha.estrato === "medio",
    )!;
    const noMes8 = ocupacaoPorEstratoNoMes(plantios, 100, 8).find(
      (linha) => linha.estrato === "medio",
    )!;

    expect(noMes3.ocupacao).toBeCloseTo(0.6, 6);
    expect(noMes8.veredito).toBe("vazio");
  });

  it("julga contra a referência do andar", () => {
    // Médio tem referência de 60%.
    const adequado = ocupacaoPorEstratoNoMes(
      [plantio({ totalDeMudas: 1200, mesFim: 12 })],
      100,
      1,
    ).find((linha) => linha.estrato === "medio")!;
    expect(adequado.ocupacao).toBeCloseTo(0.6, 6);
    expect(adequado.veredito).toBe("adequado");

    const sobre = ocupacaoPorEstratoNoMes(
      [plantio({ totalDeMudas: 2000, mesFim: 12 })],
      100,
      1,
    ).find((linha) => linha.estrato === "medio")!;
    expect(sobre.veredito).toBe("sobre");

    const sub = ocupacaoPorEstratoNoMes(
      [plantio({ totalDeMudas: 200, mesFim: 12 })],
      100,
      1,
    ).find((linha) => linha.estrato === "medio")!;
    expect(sub.veredito).toBe("sub");
  });

  it("não julga o que não consegue medir", () => {
    const linha = ocupacaoPorEstratoNoMes(
      [
        plantio({
          totalDeMudas: 500,
          mesFim: 12,
          espacamentoNaLinhaM: null,
          nomeComum: "Jatobá",
        }),
      ],
      100,
      1,
    ).find((item) => item.estrato === "medio")!;

    expect(linha.veredito).toBe("sem_medida");
    expect(linha.semMedida).toEqual(["Jatobá"]);
  });

  it("devolve todos os cinco andares", () => {
    expect(ocupacaoPorEstratoNoMes([], 100, 0)).toHaveLength(5);
  });
});

describe("lacunas de solo", () => {
  it("acha o vão entre dois plantios", () => {
    const lacunas = lacunasDeSolo(
      [
        plantio({ id: "a", mesInicio: 0, mesFim: 6 }),
        plantio({ id: "b", mesInicio: 10, mesFim: 24 }),
      ],
      24,
    );
    expect(lacunas).toEqual([{ de: 6, ate: 10 }]);
  });

  it("não acusa vão quando os plantios se emendam", () => {
    expect(
      lacunasDeSolo(
        [
          plantio({ id: "a", mesInicio: 0, mesFim: 12 }),
          plantio({ id: "b", mesInicio: 12, mesFim: 24 }),
        ],
        24,
      ),
    ).toEqual([]);
  });
});

describe("meses de amostra", () => {
  it("amostra só onde a composição muda", () => {
    const marcos = mesesDeAmostra(
      [
        plantio({ id: "a", mesInicio: 0, mesFim: 6 }),
        plantio({ id: "b", mesInicio: 6, mesFim: 60 }),
      ],
      240,
    );
    expect(marcos).toEqual([0, 6, 60]);
  });

  it("não passa do horizonte", () => {
    const marcos = mesesDeAmostra(
      [plantio({ mesInicio: 0, mesFim: 240 })],
      240,
    );
    expect(marcos.every((mes) => mes < 240)).toBe(true);
  });
});

describe("diagnósticos", () => {
  it("não diagnostica projeto vazio", () => {
    expect(
      diagnosticar({ plantios: [], horizonteMeses: 24, areaM2: 100 }),
    ).toEqual([]);
  });

  it("acusa solo descoberto", () => {
    const lista = diagnosticar({
      plantios: [plantio({ mesInicio: 0, mesFim: 6 })],
      horizonteMeses: 24,
      areaM2: 100,
    });
    expect(lista.some((item) => item.chave.startsWith("solo-"))).toBe(true);
  });

  it("acusa primeiro ano sem placenta nem pioneira", () => {
    const lista = diagnosticar({
      plantios: [
        plantio({ sucessao: "climax", mesInicio: 0, mesFim: 240 }),
        plantio({
          id: "b",
          sucessao: "secundaria_tardia",
          mesInicio: 0,
          mesFim: 240,
        }),
      ],
      horizonteMeses: 240,
      areaM2: 100,
    });
    expect(lista.some((item) => item.chave === "sem-placenta")).toBe(true);
  });

  it("não acusa quando há placenta no começo", () => {
    const lista = diagnosticar({
      plantios: [
        plantio({ sucessao: "placenta_1", mesInicio: 0, mesFim: 240 }),
        plantio({ id: "b", sucessao: "climax", mesInicio: 0, mesFim: 240 }),
      ],
      horizonteMeses: 240,
      areaM2: 100,
    });
    expect(lista.some((item) => item.chave === "sem-placenta")).toBe(false);
  });

  it("aponta sistema sem espécie de ciclo longo", () => {
    const lista = diagnosticar({
      plantios: [
        plantio({ id: "a", sucessao: "placenta_1", mesFim: 240 }),
        plantio({ id: "b", sucessao: "placenta_2", mesFim: 240 }),
        plantio({ id: "c", sucessao: "pioneira", mesFim: 240 }),
      ],
      horizonteMeses: 240,
      areaM2: 100,
    });
    expect(lista.some((item) => item.chave === "sem-climax")).toBe(true);
  });

  it("aponta andar sobrecarregado", () => {
    const lista = diagnosticar({
      plantios: [plantio({ totalDeMudas: 3000, mesInicio: 0, mesFim: 240 })],
      horizonteMeses: 240,
      areaM2: 100,
    });
    expect(lista.some((item) => item.chave === "sobre-medio")).toBe(true);
  });

  it("avisa quando falta espaçamento para medir", () => {
    const lista = diagnosticar({
      plantios: [
        plantio({
          nomeComum: "Jatobá",
          totalDeMudas: 40,
          mesFim: 240,
          espacamentoEntreLinhasM: null,
        }),
      ],
      horizonteMeses: 240,
      areaM2: 100,
    });

    const aviso = lista.find((item) => item.chave === "sem-espacamento");
    expect(aviso).toBeDefined();
    expect(aviso!.detalhe).toContain("Jatobá");
  });
});

describe("colheitas previstas", () => {
  const comCiclo = (
    over: Partial<PlantioAnalisado> = {},
    min = 40,
    max = 60,
  ) => ({
    ...plantio(over),
    diasParaColherMin: min,
    diasParaColherMax: max,
  });

  it("projeta a janela a partir do ciclo do catálogo", () => {
    const previstas = colheitasPrevistas([
      comCiclo({ mesInicio: 3, mesFim: 12 }),
    ]);
    // 40 dias ≈ 2 meses; 60 dias = 2 meses.
    expect(previstas[0]).toMatchObject({ mesDe: 5, mesAte: 5 });
  });

  it("ignora espécie sem ciclo informado", () => {
    expect(
      colheitasPrevistas([
        { ...plantio(), diasParaColherMin: null, diasParaColherMax: null },
      ]),
    ).toEqual([]);
  });

  it("descarta previsão posterior à saída da planta", () => {
    // Barra de 1 mês para uma espécie de 60 dias: a previsão contradiz o desenho.
    expect(colheitasPrevistas([comCiclo({ mesInicio: 0, mesFim: 1 })])).toEqual(
      [],
    );
  });

  it("ordena da mais próxima para a mais distante", () => {
    const previstas = colheitasPrevistas([
      comCiclo({ id: "a", mesInicio: 20, mesFim: 40 }),
      comCiclo({ id: "b", mesInicio: 2, mesFim: 40 }),
    ]);
    expect(previstas.map((item) => item.plantioId)).toEqual(["b", "a"]);
  });
});
