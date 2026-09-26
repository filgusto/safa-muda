import { describe, expect, it } from "vitest";
import {
  cartaoPublico,
  cartaoTemConteudo,
  type DadosDoPerfilPublico,
} from "./cartao-publico.ts";

function perfil(
  extra: Partial<DadosDoPerfilPublico> = {},
): DadosDoPerfilPublico {
  return {
    name: "Maria da Silva",
    role: "user",
    tratamento: null,
    image: "/media/foto.jpg",
    creditoNome: "completo",
    creditoNomeOutro: null,
    regiao: "Piracicaba, SP",
    perfilDeUso: "agricultor",
    perfilDeUsoOutro: null,
    experiencia: "de_3_a_10_anos",
    bio: "Agricultora sintrópica.",
    linkInstagram: "https://www.instagram.com/maria",
    linkSite: "https://maria.example",
    linkLattes: null,
    publicoFoto: false,
    publicoRegiao: false,
    publicoPerfilDeUso: false,
    publicoExperiencia: false,
    publicoBio: false,
    publicoInstagram: false,
    publicoSite: false,
    publicoLattes: false,
    ...extra,
  };
}

describe("cartaoPublico", () => {
  it("o tratamento escolhido flexiona o papel e o perfil de uso", () => {
    const cartao = cartaoPublico(
      perfil({
        tratamento: "feminino",
        perfilDeUso: "agricultor",
        publicoPerfilDeUso: true,
      }),
    )!;
    expect(cartao.papel).toBe("Colaboradora");
    expect(cartao.perfilDeUso).toBe("Agricultora ou produtora");
  });

  it("por padrão mostra só o nome: tudo começa privado", () => {
    const cartao = cartaoPublico(perfil())!;
    expect(cartao).toEqual({
      nome: "Maria da Silva",
      papel: "Colaborador",
      foto: null,
      regiao: null,
      perfilDeUso: null,
      experiencia: null,
      bio: null,
      links: [],
    });
    expect(cartaoTemConteudo(cartao)).toBe(false);
  });

  it("mostra cada campo só se a chave dele estiver ligada", () => {
    const cartao = cartaoPublico(
      perfil({
        publicoFoto: true,
        publicoRegiao: true,
        publicoPerfilDeUso: true,
        publicoExperiencia: true,
        publicoBio: true,
      }),
    )!;
    expect(cartao.foto).toBe("/media/foto.jpg");
    expect(cartao.regiao).toBe("Piracicaba, SP");
    expect(cartao.perfilDeUso).toBe("Agricultor ou produtor");
    expect(cartao.experiencia).toBe("De 3 a 10 anos");
    expect(cartao.bio).toBe("Agricultora sintrópica.");
    expect(cartaoTemConteudo(cartao)).toBe(true);
  });

  it("um link só sai se foi cadastrado E tornado público", () => {
    const cartao = cartaoPublico(
      perfil({
        publicoInstagram: true,
        publicoSite: false,
        publicoLattes: true,
      }),
    )!;
    expect(cartao.links.map((l) => l.tipo)).toEqual(["instagram"]);
  });

  it("usa o nome do jeito que a pessoa pediu para ser citada", () => {
    expect(cartaoPublico(perfil({ creditoNome: "primeiro_nome" }))!.nome).toBe(
      "Maria",
    );
    expect(
      cartaoPublico(
        perfil({ creditoNome: "outro", creditoNomeOutro: "Dona Maria" }),
      )!.nome,
    ).toBe("Dona Maria");
  });

  it("quem escolheu 'sem identificação' não tem card, nem com tudo público", () => {
    expect(
      cartaoPublico(
        perfil({
          creditoNome: "anonimo",
          publicoFoto: true,
          publicoRegiao: true,
          publicoBio: true,
          publicoInstagram: true,
        }),
      ),
    ).toBeNull();
  });
});
