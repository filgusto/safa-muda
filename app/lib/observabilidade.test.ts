import { describe, expect, it } from "vitest";
import { mascararEmail } from "./observabilidade.ts";

describe("mascararEmail", () => {
  it("mantém os dois primeiros caracteres e o domínio", () => {
    expect(mascararEmail("joana@exemplo.org")).toBe("jo***@exemplo.org");
  });

  it("lida com usuário curto", () => {
    expect(mascararEmail("jo@exemplo.org")).toBe("jo*@exemplo.org");
    expect(mascararEmail("j@exemplo.org")).toBe("j*@exemplo.org");
  });

  it("devolve um marcador para entrada sem @", () => {
    expect(mascararEmail("nao-e-email")).toBe("***");
  });
});
