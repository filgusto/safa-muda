import { test, expect, type Page } from "@playwright/test";
import { cadastrar as cadastrarComCodigo } from "./ajuda.ts";

/**
 * O caminho completo: cadastro → projeto → plantio → diário.
 *
 * É o fluxo que só quebra com tudo junto — sessão, permissão, revalidação de
 * rota e derivação de planejado × realizado.
 */

test("projetos exigem login", async ({ page }) => {
  await page.goto("/projetos");
  await expect(page).toHaveURL(/\/entrar\?destino=\/projetos/);
});

test("cadastra, cria projeto e registra no diário", async ({ page }) => {
  await cadastrarComCodigo(page, "Agrofloresteiro E2E");

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

  // As três vistas do mesmo desenho — escopado a <nav>, porque a barra de
  // opções da própria timeline (Tempo relativo/absoluto) também tem um botão
  // cujo nome contém "Tempo".
  const abas = page.getByRole("navigation").getByRole("button");
  await expect(abas.filter({ hasText: "Tempo" })).toBeVisible();
  await expect(abas.filter({ hasText: "Espaço" })).toBeVisible();
  await expect(abas.filter({ hasText: "Diário" })).toBeVisible();
  await expect(abas.filter({ hasText: "Análise" })).toBeVisible();

  // ── Timeline ───────────────────────────────────────────────────────────
  // A gaveta do catálogo começa fechada.
  await page.getByRole("button", { name: "Plantas" }).click();
  // O catálogo acoplado carrega da API, não do servidor.
  await expect(page.getByPlaceholder("Buscar espécie…")).toBeVisible();
  await page.getByPlaceholder("Buscar espécie…").fill("Banana Nanica");
  await expect(page.getByText("Musa acuminata 'Dwarf Cavendish'")).toBeVisible({
    timeout: 10_000,
  });

  // ── Análise ────────────────────────────────────────────────────────────
  await abas.filter({ hasText: "Análise" }).click();
  await expect(page.getByText(/Nada a analisar ainda/)).toBeVisible();

  // ── Diário ─────────────────────────────────────────────────────────────
  await abas.filter({ hasText: "Diário" }).click();
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
  await cadastrarComCodigo(page, "Agrofloresteiro E2E");
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
  await cadastrarComCodigo(outraPagina, "Outra Pessoa E2E");

  const resposta = await outraPagina.goto(url);
  expect(resposta?.status()).toBe(404);

  await outroContexto.close();
});
