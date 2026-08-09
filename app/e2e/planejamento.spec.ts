import { test, expect, type Page } from "@playwright/test";

/**
 * O caminho completo: cadastro → projeto → plantio → diário.
 *
 * É o fluxo que só quebra com tudo junto — sessão, permissão, revalidação de
 * rota e derivação de planejado × realizado.
 */

/** Conta nova a cada execução, para os testes não dependerem de estado prévio. */
async function cadastrar(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@safamuda.test`;

  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Agrofloresteiro E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senhaDeTeste123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL("/", { timeout: 15_000 });
  return email;
}

test("projetos exigem login", async ({ page }) => {
  await page.goto("/projetos");
  await expect(page).toHaveURL(/\/entrar\?destino=\/projetos/);
});

test("moderação é restrita", async ({ page }) => {
  await page.goto("/moderacao");
  await expect(page).toHaveURL(/\/entrar/);
});

test("cadastra, cria projeto e registra no diário", async ({ page }) => {
  await cadastrar(page);

  // ── Projeto ────────────────────────────────────────────────────────────
  await page.goto("/projetos/novo");
  await page.getByLabel("Nome do projeto").fill("Consórcio E2E");
  await page.getByLabel("Horizonte (anos)").fill("10");
  await page.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page).toHaveURL(/\/projetos\/[0-9a-f-]{36}/, {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: "Consórcio E2E" }),
  ).toBeVisible();

  // As três vistas do mesmo desenho.
  await expect(page.getByRole("button", { name: /Tempo/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Espaço/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Diário/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Análise/ })).toBeVisible();

  // ── Timeline ───────────────────────────────────────────────────────────
  // O catálogo acoplado carrega da API, não do servidor.
  await expect(page.getByPlaceholder("Buscar espécie…")).toBeVisible();
  await page.getByPlaceholder("Buscar espécie…").fill("Banana Nanica");
  await expect(page.getByText("Musa acuminata 'Dwarf Cavendish'")).toBeVisible({
    timeout: 10_000,
  });

  // ── Análise ────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: /Análise/ }).click();
  await expect(page.getByText(/Nada a analisar ainda/)).toBeVisible();

  // ── Diário ─────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: /Diário/ }).click();
  await expect(page.getByText(/Nada registrado ainda/)).toBeVisible();

  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByLabel("Manejo").selectOption("rocada");
  await page.getByLabel("Observações").fill("Roçada geral da área.");
  await page.getByRole("button", { name: "Registrar" }).last().click();

  // A lista é aninhada (mês > registros), então o item mais interno é o último.
  const registro = page
    .getByRole("listitem")
    .filter({ hasText: "Roçada geral da área." })
    .last();

  await expect(registro).toBeVisible({ timeout: 15_000 });
  // O selo do tipo de manejo, dentro do próprio registro.
  await expect(registro.getByText("Roçada", { exact: true })).toBeVisible();
  // E o contador do cabeçalho acompanha.
  await expect(page.getByText(/1 registro\(s\)/)).toBeVisible();
});

test("projeto de outra pessoa não é acessível", async ({ page, browser }) => {
  // Primeiro usuário cria o projeto.
  await cadastrar(page);
  await page.goto("/projetos/novo");
  await page.getByLabel("Nome do projeto").fill("Projeto privado");
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page).toHaveURL(/\/projetos\/[0-9a-f-]{36}/, {
    timeout: 15_000,
  });

  const url = page.url();

  // Segundo usuário, sessão limpa, tenta abrir pela URL.
  const outroContexto = await browser.newContext();
  const outraPagina = await outroContexto.newPage();
  await cadastrar(outraPagina);

  const resposta = await outraPagina.goto(url);
  expect(resposta?.status()).toBe(404);

  await outroContexto.close();
});
