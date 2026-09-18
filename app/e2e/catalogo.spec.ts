import { test, expect } from "@playwright/test";

/**
 * Catálogo público — a porta de entrada do projeto.
 *
 * Nenhum destes testes autentica: é justamente isso que se está verificando.
 */

test("lista as espécies sem exigir login", async ({ page }) => {
  await page.goto("/safdex");

  await expect(
    page.getByRole("heading", { name: "SAFdex", level: 1 }),
  ).toBeVisible();

  // O dataset semeado tem 442 espécies; o teste não fixa o número para não
  // quebrar quando a wiki aprovar uma espécie nova.
  await expect(page.getByText(/\d+ espécies/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Abacate/ })).toBeVisible();
});

test("filtra por estrato com os chips", async ({ page }) => {
  await page.goto("/safdex");

  // Os botões trazem contadores no rótulo ("Estrato 2"), então o alvo estável
  // é a gaveta que cada um comanda, não o texto.
  await page.locator('[aria-controls="filtros-do-catalogo"]').click();
  await page
    .locator('[aria-controls="filtros-do-catalogo-opcoes"]')
    .filter({ hasText: "Estrato" })
    .click();

  await page
    .getByRole("group", { name: "Filtrar por estrato" })
    .getByRole("button", { name: "Emergente" })
    .click();

  await expect(page).toHaveURL(/estrato=emergente/);
  await expect(page.getByText(/de \d+ espécies/)).toBeVisible();
});

test("acumula valores na mesma dimensão e limpa tudo", async ({ page }) => {
  // Dentro de uma dimensão vale OU: dois estratos trazem a soma dos dois.
  await page.goto("/safdex?estrato=emergente");

  const contagem = page.getByText(/de \d+ espécies/);
  const somenteEmergente = await contagem.textContent();

  await page
    .locator('[aria-controls="filtros-do-catalogo-opcoes"]')
    .filter({ hasText: "Estrato" })
    .click();
  await page
    .getByRole("group", { name: "Filtrar por estrato" })
    .getByRole("button", { name: "Alto", exact: true })
    .click();

  // Timeout folgado: no App Router a URL só troca quando o servidor devolve a
  // lista nova, e o `next dev` do Docker leva seu tempo com as 442 espécies.
  await expect(page).toHaveURL(/estrato=emergente&estrato=alto/, {
    timeout: 15_000,
  });
  await expect(contagem).not.toHaveText(somenteEmergente ?? "");

  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(page).toHaveURL(/\/safdex$/);
});

test("o botão de pesquisa vira campo e filtra enquanto se digita", async ({
  page,
}) => {
  await page.goto("/safdex");

  await page.getByRole("button", { name: "Pesquisar" }).click();

  const campo = page.getByRole("textbox", { name: "Buscar espécie" });
  await expect(campo).toBeFocused();

  await campo.pressSequentially("abacax");

  await expect(page).toHaveURL(/busca=abacax/, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: /Abacaxi/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Abacate/ })).toHaveCount(0);
});

test("encontra pelo sinônimo", async ({ page }) => {
  // "Genipapo" é sinônimo do registro salvo como "Jenipapo" — ver a resolução
  // de duplicatas em scripts/dataset/correcoes.json.
  await page.goto("/safdex?busca=Genipapo");
  await expect(page.getByRole("link", { name: /Jenipapo/ })).toBeVisible();
});

test("a ficha mostra a proveniência e as lacunas honestas", async ({
  page,
}) => {
  await page.goto("/safdex/abacate");

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
  const resposta = await page.goto("/safdex/nao-existe-mesmo");
  expect(resposta?.status()).toBe(404);
});

test("o card abre a ficha em modal sobre o catálogo", async ({ page }) => {
  await page.goto("/safdex?busca=abacate");

  await page
    .getByRole("link", { name: /Abacate/ })
    .first()
    .click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(
    modal.getByRole("heading", { name: "Abacate", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/safdex\/abacate/);

  // A listagem continua montada por trás — é o ponto do modal. O papel de
  // heading some porque o Radix marca o resto da página como aria-hidden
  // enquanto o diálogo está aberto, então o alvo aqui é o elemento.
  await expect(page.locator("h1", { hasText: "SAFdex" })).toBeVisible();

  await modal.getByRole("button", { name: "Fechar" }).click();
  await expect(modal).toBeHidden();
  await expect(page).toHaveURL(/\/safdex\?busca=abacate/);
});
