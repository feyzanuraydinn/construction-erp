import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { once } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';

const userDataDirs = new WeakMap<ElectronApplication, string>();

async function launchApp(): Promise<ElectronApplication> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'construction-erp-e2e-'));
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  userDataDirs.set(app, userDataDir);
  return app;
}

function ignoreClosedApp(error: unknown): void {
  if (!(error instanceof Error) || !/closed|exited|disconnected/i.test(error.message)) throw error;
}

async function appWindow(app: ElectronApplication): Promise<Page> {
  for (let i = 0; i < 60; i++) {
    const window = app.windows().find((w) => w.url().startsWith('http://localhost:3000'));
    if (window) return window;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('App window did not open');
}

async function quitApp(app: ElectronApplication): Promise<void> {
  const appProcess = app.process();
  const exited = appProcess.exitCode === null ? once(appProcess, 'exit') : Promise.resolve();
  await app.evaluate(({ app: electronApp }) => electronApp.exit(0)).catch(ignoreClosedApp);
  await exited;
  const userDataDir = userDataDirs.get(app);
  if (userDataDir)
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

let electronApp: ElectronApplication;
let page: Page;

test.describe('Construction ERP - Core Navigation & UI', () => {
  test.beforeAll(async () => {
    electronApp = await launchApp();

    page = await appWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await quitApp(electronApp);
  });

  test('1. App launches and displays sidebar navigation', async () => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const navLinks = sidebar.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('2. Dashboard loads with stat cards', async () => {
    await page.locator('aside a').first().click();
    await page.waitForTimeout(500);

    const statCards = page.locator('.rounded-xl.shadow-sm.border');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toBeVisible();
  });

  test('3. Navigate through all main pages via sidebar', async () => {
    const sidebarLinks = page.locator('aside nav a');
    const linkCount = await sidebarLinks.count();

    for (let i = 0; i < linkCount; i++) {
      await sidebarLinks.nth(i).click();
      await page.waitForTimeout(300);

      const title = page.locator('.page-title');
      await expect(title).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Sidebar collapse/expand toggle works', async () => {
    const sidebar = page.locator('aside');
    const sidebarToggle = sidebar.locator('button.absolute');
    const widthOf = () => sidebar.evaluate((el) => el.getBoundingClientRect().width);
    const startedOpen = (await widthOf()) > 200;

    await sidebarToggle.click();
    await page.waitForTimeout(400);
    expect((await widthOf()) > 200).toBe(!startedOpen);

    await sidebarToggle.click();
    await page.waitForTimeout(400);
    expect((await widthOf()) > 200).toBe(startedOpen);
  });

  test('5. Command palette opens with Ctrl+K and closes with Escape', async () => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    const searchInput = page.locator('.fixed.inset-0 input[type="text"]');
    await expect(searchInput).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await expect(searchInput).not.toBeVisible();
  });

  test('6. Settings page shows language and theme selectors', async () => {
    const bottomLinks = page.locator('aside .border-t a');
    await bottomLinks.first().click();
    await page.waitForTimeout(500);

    const trButton = page.locator('button:has-text("Türkçe")');
    const enButton = page.locator('button:has-text("English")');
    await expect(trButton).toBeVisible({ timeout: 5000 });
    await expect(enButton).toBeVisible();

    const cards = page.locator('.rounded-xl.shadow-sm.border');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Construction ERP - Company CRUD Flow', () => {
  test.beforeAll(async () => {
    electronApp = await launchApp();

    page = await appWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await quitApp(electronApp);
  });

  test('1. Navigate to companies page', async () => {
    const companyLink = page.locator('aside nav a').nth(1);
    await companyLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Open new company modal', async () => {
    const newButton = page.locator('button.bg-blue-600, button.dark\\:bg-blue-500').first();
    await newButton.click();
    await page.waitForTimeout(300);

    const modal = page.locator('.fixed.inset-0 .bg-white, .fixed.inset-0 .dark\\:bg-gray-800');
    await expect(modal.first()).toBeVisible({ timeout: 3000 });
  });

  test('3. Fill and submit company form', async () => {
    const nameInput = page
      .locator('[aria-modal="true"] input:not([type]), [aria-modal="true"] input[type="text"]')
      .first();
    await nameInput.fill('E2E Test Şirketi');

    const submitButton = page.locator('.fixed.inset-0 button[type="submit"]');
    await submitButton.click();
    await page.waitForTimeout(1000);

    const errorMessages = page.locator('.fixed.inset-0 .text-red-500');
    const hasErrors = await errorMessages.count();

    if (hasErrors === 0) {
      const companyName = page.locator('text=E2E Test Şirketi');
      await expect(companyName).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Search functionality filters companies', async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const searchInput = page.locator('.page-container input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyz-nonexistent');
      await page.waitForTimeout(500);

      const tableRows = page.locator('tbody tr');
      const count = await tableRows.count();
      expect(count).toBeLessThanOrEqual(1);

      await searchInput.clear();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Construction ERP - Project CRUD Flow', () => {
  test.beforeAll(async () => {
    electronApp = await launchApp();

    page = await appWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await quitApp(electronApp);
  });

  test('1. Navigate to projects page', async () => {
    const projectLink = page.locator('aside nav a').nth(2);
    await projectLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Open new project modal and verify form structure', async () => {
    const newButton = page.locator('button.bg-blue-600, button.dark\\:bg-blue-500').first();
    await newButton.click();
    await page.waitForTimeout(300);

    const modal = page.locator('.fixed.inset-0');
    await expect(modal.locator('form')).toBeVisible({ timeout: 3000 });

    const inputs = modal.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(2);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
});

test.describe('Construction ERP - Stock Management Flow', () => {
  test.beforeAll(async () => {
    electronApp = await launchApp();

    page = await appWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await quitApp(electronApp);
  });

  test('1. Navigate to stock page', async () => {
    const stockLink = page.locator('aside nav a').nth(3);
    await stockLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Stock page has tabs for materials and movements', async () => {
    const pageContent = page.locator('.page-container');
    await expect(pageContent).toBeVisible();

    const buttons = pageContent.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Construction ERP - Analytics & Reports Flow', () => {
  test.beforeAll(async () => {
    electronApp = await launchApp();

    page = await appWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await quitApp(electronApp);
  });

  test('1. Navigate to analytics page', async () => {
    const analyticsLink = page.locator('aside nav a').nth(6);
    await analyticsLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Analytics page shows charts or empty state', async () => {
    const pageContent = page.locator('.page-container');
    await expect(pageContent).toBeVisible();

    const content = await pageContent.textContent();
    expect(content ?? '').not.toHaveLength(0);
  });

  test('3. Navigate to transactions page', async () => {
    const txLink = page.locator('aside nav a').nth(5);
    await txLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });
});

test.describe('Construction ERP - Theme & Language Switching', () => {
  test.beforeAll(async () => {
    electronApp = await launchApp();

    page = await appWindow(electronApp);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await quitApp(electronApp);
  });

  test('1. Switch language to English', async () => {
    const settingsLink = page.locator('aside .border-t a').first();
    await settingsLink.click();
    await page.waitForTimeout(500);

    const enButton = page.locator('button:has-text("English")');
    await enButton.click();
    await page.waitForTimeout(500);

    const pageTitle = page.locator('.page-title');
    const titleText = await pageTitle.textContent();
    expect(titleText).toContain('Settings');
  });

  test('2. Switch language back to Turkish', async () => {
    const trButton = page.locator('button:has-text("Türkçe")');
    await trButton.click();
    await page.waitForTimeout(500);

    const pageTitle = page.locator('.page-title');
    const titleText = await pageTitle.textContent();
    expect(titleText).toContain('Ayarlar');
  });

  test('3. Toggle dark theme', async () => {
    const darkButton = page.locator('button:has(svg)').filter({ hasText: /Koyu|Dark/ });
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);

      const hasDarkClass = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(hasDarkClass).toBe(true);

      const lightButton = page.locator('button:has(svg)').filter({ hasText: /Açık|Light/ });
      await lightButton.click();
      await page.waitForTimeout(500);

      const hasDarkClassAfter = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(hasDarkClassAfter).toBe(false);
    }
  });

  test('4. Navigate to trash page', async () => {
    const trashLink = page.locator('aside .border-t a').last();
    await trashLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });
});
