import { describe, expect, it } from "vitest";
import { problemasDoAmbiente } from "./ambiente.ts";

const segredo = "x".repeat(40);
const completo = {
  DATABASE_URL: "postgresql://u:p@db/x",
  AUTH_SECRET: segredo,
  NEXT_PUBLIC_SERVER_URL: "https://safamuda.org.br",
  S3_ENDPOINT: "http://garage:3900",
  S3_PUBLIC_ENDPOINT: "https://s3.safamuda.org.br",
  S3_ACCESS_KEY: "app",
  S3_SECRET_KEY: "segredo",
  SMTP_HOST: "smtp.exemplo.org",
  CONTATO_EMAIL: "contato@safamuda.org.br",
};

describe("problemasDoAmbiente", () => {
  it("aceita um deploy completo", () => {
    expect(problemasDoAmbiente(completo)).toEqual([]);
  });

  it("numa instância http local só exige o essencial", () => {
    expect(
      problemasDoAmbiente({
        DATABASE_URL: "postgresql://x",
        AUTH_SECRET: segredo,
        NEXT_PUBLIC_SERVER_URL: "http://localhost:3000",
      }),
    ).toEqual([]);
  });

  it("recusa segredo curto", () => {
    expect(
      problemasDoAmbiente({ ...completo, AUTH_SECRET: "curto" }).join(),
    ).toMatch(/AUTH_SECRET/);
  });

  it("aponta cada variável de deploy que falta", () => {
    const { SMTP_HOST, CONTATO_EMAIL, ...resto } = completo;
    void SMTP_HOST;
    void CONTATO_EMAIL;
    const problemas = problemasDoAmbiente(resto).join();
    expect(problemas).toMatch(/SMTP_HOST/);
    expect(problemas).toMatch(/CONTATO_EMAIL/);
  });

  it("recusa S3 público em http e valores de exemplo", () => {
    expect(
      problemasDoAmbiente({
        ...completo,
        S3_PUBLIC_ENDPOINT: "http://s3.safamuda.org.br",
      }).join(),
    ).toMatch(/https/);
    expect(
      problemasDoAmbiente({ ...completo, SMTP_HOST: "CHANGE_ME_smtp" }).join(),
    ).toMatch(/CHANGE_ME/);
  });

  it("exige a URL pública", () => {
    expect(
      problemasDoAmbiente({ DATABASE_URL: "x", AUTH_SECRET: segredo }).join(),
    ).toMatch(/NEXT_PUBLIC_SERVER_URL/);
  });

  it("exige as duas chaves do CAPTCHA, ou nenhuma", () => {
    expect(
      problemasDoAmbiente({ ...completo, TURNSTILE_SITE_KEY: "0x4AAA" }),
    ).toEqual([
      "TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY precisam ser definidas juntas.",
    ]);
    expect(
      problemasDoAmbiente({
        ...completo,
        TURNSTILE_SITE_KEY: "0x4AAA",
        TURNSTILE_SECRET_KEY: "0x4BBB",
      }),
    ).toEqual([]);
  });
});
