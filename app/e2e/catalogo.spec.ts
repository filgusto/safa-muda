import { test, expect } from "@playwright/test";

/**
 * Catálogo público — a porta de entrada do projeto.
 *
 * Nenhum destes testes autentica: é justamente isso que se está verificando.
 */

test("lista as espécies sem exigir login", async ({ page }) => {
  await page.goto("/catalogo");

  await expect(
    page.getByRole("heading", { name: "Espécies agroflorestais" }),
  ).toBeVisible();

  // O dataset semeado tem 442 espécies; o teste não fixa o número para não
  // quebrar quando a wiki aprovar uma espécie nova.
  await expect(page.getByText(/\d+ espécies/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Abacate/ })).toBeVisible();
});

test("filtra por estrato", async ({ page }) => {
  await page.goto("/catalogo");

  await page.getByLabel("Estrato").selectOption("emergente");
  await expect(page).toHaveURL(/estrato=emergente/);
  await expect(page.getByText(/de \d+ espécies/)).toBeVisible();
});

test("encontra pelo sinônimo", async ({ page }) => {
  // "Genipapo" é sinônimo do registro salvo como "Jenipapo" — ver a resolução
  // de duplicatas em scripts/dataset/correcoes.json.
  await page.goto("/catalogo?busca=Genipapo");
  await expect(page.getByRole("link", { name: /Jenipapo/ })).toBeVisible();
});

test("a ficha mostra a proveniência e as lacunas honestas", async ({
  page,
}) => {
  await page.goto("/catalogo/abacate");

  await expect(page.getByRole("heading", { name: "Abacate" })).toBeVisible();
  await expect(
    page.getByText("Persea americana", { exact: true }),
  ).toBeVisible();

  // O nome científico foi corrigido de "Laurus persea" na fase 1.
  await expect(page.getByText("correção editorial").first()).toBeVisible();
  await expect(
    page.getByText(/Tabela Guia de Estratos Agroflorestais/),
  ).toBeVisible();
});

test("espécie inexistente devolve 404", async ({ page }) => {
  const resposta = await page.goto("/catalogo/nao-existe-mesmo");
  expect(resposta?.status()).toBe(404);
});
