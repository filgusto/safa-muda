import { describe, it, expect } from "vitest";
import { extrairTituloDoArquivo } from "./wikimedia.ts";

describe("extrairTituloDoArquivo", () => {
  it("extrai o título de um link de ficha do Commons", () => {
    expect(
      extrairTituloDoArquivo(
        "https://commons.wikimedia.org/wiki/File:AnanasComosusOnPlant.jpg",
      ),
    ).toBe("File:AnanasComosusOnPlant.jpg");
  });

  it("decodifica caracteres escapados no título", () => {
    expect(
      extrairTituloDoArquivo(
        "https://commons.wikimedia.org/wiki/File:Bananeira_%28M._acuminata%29.jpg",
      ),
    ).toBe("File:Bananeira_(M._acuminata).jpg");
  });

  it("ignora query string e fragmento", () => {
    expect(
      extrairTituloDoArquivo(
        "https://commons.wikimedia.org/wiki/File:Foo.jpg?uselang=pt#detalhes",
      ),
    ).toBe("File:Foo.jpg");
  });

  it("rejeita o link raw do arquivo (upload.wikimedia.org)", () => {
    expect(
      extrairTituloDoArquivo(
        "https://upload.wikimedia.org/wikipedia/commons/7/75/AnanasComosusOnPlant.jpg",
      ),
    ).toBeNull();
  });

  it("rejeita host diferente do Commons", () => {
    expect(
      extrairTituloDoArquivo("https://en.wikipedia.org/wiki/File:Foo.jpg"),
    ).toBeNull();
  });

  it("rejeita link de página que não é de arquivo", () => {
    expect(
      extrairTituloDoArquivo(
        "https://commons.wikimedia.org/wiki/Category:Ananas",
      ),
    ).toBeNull();
  });

  it("rejeita texto que não é URL", () => {
    expect(extrairTituloDoArquivo("não é um link")).toBeNull();
  });
});
