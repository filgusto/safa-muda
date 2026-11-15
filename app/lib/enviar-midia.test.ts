import { describe, expect, it } from "vitest";
import {
  MENSAGEM_DE_ARMAZENAMENTO_CHEIO,
  mensagemDeFalhaNoEnvio,
} from "./enviar-midia.ts";

describe("mensagemDeFalhaNoEnvio", () => {
  it("reconhece a cota do bucket estourada", () => {
    // Resposta real do Garage v2.3 com a cota atingida.
    const corpo =
      '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Forbidden: Bucket size quota is reached, maximum total size of objects for this bucket: 10000.</Message></Error>';
    expect(mensagemDeFalhaNoEnvio(403, corpo)).toBe(
      MENSAGEM_DE_ARMAZENAMENTO_CHEIO,
    );
  });

  it("qualquer outra recusa continua genérica", () => {
    expect(
      mensagemDeFalhaNoEnvio(
        403,
        "<Error><Code>AccessDenied</Code><Message>Policy expired</Message></Error>",
      ),
    ).toBe("Falha ao enviar a imagem.");
    expect(mensagemDeFalhaNoEnvio(500, "")).toBe("Falha ao enviar a imagem.");
  });
});
