import { expect, type Page } from "@playwright/test";

/**
 * Cadastro de ponta a ponta, com a confirmação de e-mail de verdade.
 *
 * O login só abre para e-mail confirmado, e o código chega por SMTP. Os testes
 * apontam o SMTP do app para um Mailpit (na CI, um serviço; em dev, o do
 * docker compose) e leem o código pela API HTTP dele. `E2E_MAILPIT_URL` diz
 * onde ela está.
 */
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

async function codigoDoEmail(email: string): Promise<string> {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const resposta = await fetch(`${MAILPIT}/api/v1/messages`);
    if (resposta.ok) {
      const { messages } = (await resposta.json()) as {
        messages: { Subject: string; To: { Address: string }[] }[];
      };
      const achada = messages.find((m) =>
        m.To.some((destino) => destino.Address === email),
      );
      const codigo = achada?.Subject.match(/^(\d{6})/)?.[1];
      if (codigo) return codigo;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`O código de ${email} não chegou ao Mailpit (${MAILPIT}).`);
}

/** Conta nova a cada execução, para os testes não dependerem de estado prévio. */
export async function cadastrar(page: Page, nome: string): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@safamuda.test`;

  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senhaDeTeste123");
  await page.getByLabel(/Confirm/).fill("senhaDeTeste123");
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page
    .getByLabel("Código de confirmação")
    .fill(await codigoDoEmail(email));
  await page.getByRole("button", { name: /Confirmar/ }).click();

  await expect(page).toHaveURL("/", { timeout: 15_000 });
  return email;
}
