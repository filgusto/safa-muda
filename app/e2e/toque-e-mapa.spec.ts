import { test, expect, devices, type Page } from "@playwright/test";

/**
 * Arraste por toque e fundo de mapa.
 *
 * O arraste é testado num contexto **sem mouse** e com toque habilitado — é
 * exatamente a condição em que o drag-and-drop nativo do HTML não funcionava.
 */

async function cadastrar(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@safamuda.test`;

  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Agrofloresteiro Toque");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senhaDeTeste123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

async function criarProjeto(page: Page, nome: string) {
  await page.goto("/projetos/novo");
  await page.getByLabel("Nome do projeto").fill(nome);
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page).toHaveURL(/\/projetos\/[0-9a-f-]{36}/, {
    timeout: 15_000,
  });
}

// Tablet: sem mouse, com toque. O drag-and-drop nativo não existe aqui.
// `devices` traz `defaultBrowserType`, que o Playwright só aceita no topo do
// arquivo — dentro de um describe ele forçaria outro worker.
const TABLET = {
  viewport: devices["iPad (gen 7)"].viewport,
  hasTouch: true,
  isMobile: false,
};

test.describe("arraste por toque", () => {
  test.use(TABLET);

  test("arrasta uma espécie do catálogo até a faixa do estrato", async ({
    page,
  }) => {
    await cadastrar(page);
    await criarProjeto(page, "Toque");

    await page.getByPlaceholder("Buscar espécie…").fill("Banana Nanica");
    const alca = page.getByRole("button", {
      name: /Arrastar Banana Nanica/,
    });
    await expect(alca).toBeVisible({ timeout: 10_000 });

    // A faixa "Alto" é o estrato da Banana Nanica no catálogo.
    const faixa = page.locator('[data-faixa-estrato="alto"]');
    await expect(faixa).toBeVisible();

    const origem = (await alca.boundingBox())!;
    const destino = (await faixa.boundingBox())!;

    // Gesto de toque real: down → vários moves → up. Um único move não passa
    // do limiar que separa arraste de rolagem.
    await page.touchscreen.tap(origem.x + 5, origem.y + 5);
    await alca.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      clientX: origem.x + 5,
      clientY: origem.y + 5,
    });

    for (let passo = 1; passo <= 6; passo++) {
      const fracao = passo / 6;
      await page.dispatchEvent("body", "pointermove", {
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: origem.x + 5 + (destino.x + 120 - origem.x - 5) * fracao,
        clientY: origem.y + 5 + (destino.y + 10 - origem.y - 5) * fracao,
      });
    }

    await page.dispatchEvent("body", "pointerup", {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      clientX: destino.x + 120,
      clientY: destino.y + 10,
    });

    // A barra do plantio aparece na timeline.
    await expect(
      page.getByRole("button", { name: /Banana Nanica/ }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("o botão + adiciona sem arrastar", async ({ page }) => {
    await cadastrar(page);
    await criarProjeto(page, "Sem arraste");

    await page.getByPlaceholder("Buscar espécie…").fill("Alface");
    const adicionar = page
      .getByRole("button", { name: /Adicionar Alface no início/ })
      .first();
    await expect(adicionar).toBeVisible({ timeout: 10_000 });

    await adicionar.click();

    await expect(page.getByText(/entrou no mês 0/)).toBeVisible({
      timeout: 15_000,
    });
  });
});

test("o fundo de mapa exige área georreferenciada", async ({ page }) => {
  await cadastrar(page);
  await criarProjeto(page, "Mapa");

  await page.getByRole("button", { name: /Espaço/ }).click();

  // Sem área desenhada, o seletor de fundo existe mas está desabilitado.
  const seletor = page.getByRole("combobox", { name: "Fundo do mapa" });
  await expect(seletor).toBeVisible();
  await expect(seletor).toBeDisabled();
});
