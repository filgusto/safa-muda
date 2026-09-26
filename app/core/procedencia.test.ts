import { describe, expect, it } from "vitest";
import { desfazerRevisao, revisoesVigentes } from "./procedencia.ts";

const rev = (id: string, patch: Record<string, unknown>) => ({ id, patch });

describe("revisoesVigentes", () => {
  it("mantém todas quando cada uma mexe em campos diferentes", () => {
    const revisoes = [
      rev("a", { estrato: "alto" }),
      rev("b", { sucessao: "climax" }),
    ];
    expect(revisoesVigentes(revisoes).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("descarta a que teve todos os campos sobrescritos depois", () => {
    const revisoes = [
      rev("a", { estrato: "alto" }),
      rev("b", { estrato: "medio" }),
    ];
    expect(revisoesVigentes(revisoes).map((r) => r.id)).toEqual(["b"]);
  });

  it("mantém a que ainda fornece ao menos um campo", () => {
    const revisoes = [
      rev("a", { estrato: "alto", sistema: "abundancia" }),
      rev("b", { estrato: "medio" }),
    ];
    expect(revisoesVigentes(revisoes).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("ignora revisão sem campos", () => {
    expect(revisoesVigentes([rev("a", {})])).toEqual([]);
  });

  it("preserva a ordem de entrada", () => {
    const revisoes = [
      rev("a", { x: 1 }),
      rev("b", { y: 1 }),
      rev("c", { z: 1 }),
    ];
    expect(revisoesVigentes(revisoes).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("desfazerRevisao", () => {
  const antes = (valores: Record<string, unknown>, fontes = {}) => ({
    valores,
    fontes,
  });
  const revisao = (
    id: string,
    patch: Record<string, unknown>,
    anterior: ReturnType<typeof antes> | null,
  ) => ({ id, patch, antes: anterior });

  it("restaura valor e fonte de um campo que ninguém tocou depois", () => {
    const resultado = desfazerRevisao(
      [
        revisao(
          "a",
          { estrato: "alto" },
          antes({ estrato: "medio" }, { estrato: "embrapa" }),
        ),
      ],
      "a",
    );
    expect(resultado).toEqual({
      ok: true,
      restaurar: {
        valores: { estrato: "medio" },
        fontes: { estrato: "embrapa" },
      },
      reancorar: [],
    });
  });

  it("marca a fonte como ausente quando o campo não tinha fonte", () => {
    const resultado = desfazerRevisao(
      [revisao("a", { estrato: "alto" }, antes({ estrato: null }))],
      "a",
    );
    expect(resultado.ok && resultado.restaurar.fontes).toEqual({
      estrato: null,
    });
  });

  it("não mexe no campo que uma revisão posterior alterou, e a reancora", () => {
    const resultado = desfazerRevisao(
      [
        revisao(
          "a",
          { estrato: "alto", sistema: "x" },
          antes({ estrato: "b", sistema: "y" }),
        ),
        revisao("b", { estrato: "medio" }, antes({ estrato: "alto" })),
      ],
      "a",
    );
    expect(resultado).toEqual({
      ok: true,
      restaurar: { valores: { sistema: "y" }, fontes: { sistema: null } },
      reancorar: [
        {
          id: "b",
          antes: { valores: { estrato: "b" }, fontes: { estrato: null } },
        },
      ],
    });
  });

  it("recusa quando o valor anterior não foi registrado", () => {
    expect(
      desfazerRevisao([revisao("a", { estrato: "alto" }, null)], "a").ok,
    ).toBe(false);
    expect(
      desfazerRevisao([revisao("a", { estrato: "alto" }, antes({}))], "a").ok,
    ).toBe(false);
  });

  it("recusa id desconhecido", () => {
    expect(desfazerRevisao([], "x").ok).toBe(false);
  });
});
