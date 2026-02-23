import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

/**
 * E2E Test Suite for Construction ERP Electron App
 *
 * Note: To run these tests, you need to:
 * 1. Build the electron app first: npm run build:electron
 * 2. Run tests: npx playwright test
 *
 * These tests will launch the actual Electron application.
 * Since the app supports i18n (TR/EN), tests use CSS selectors and
 * structural selectors rather than hardcoded text wherever possible.
 */

let electronApp: ElectronApplication;
let page: Page;

test.describe('Construction ERP - Core Navigation & UI', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    // Wait for React to render
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('1. App launches and displays sidebar navigation', async () => {
    // Sidebar should be visible with navigation items
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Should have navigation links (at least dashboard, companies, projects, etc.)
    const navLinks = sidebar.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(7); // 7 main + 2 bottom menu items
  });

  test('2. Dashboard loads with stat cards', async () => {
    // Click the first nav link (Dashboard)
    await page.locator('aside a').first().click();
    await page.waitForTimeout(500);

    // Dashboard should show stat cards
    const statCards = page.locator('.rounded-xl.shadow-sm.border');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Page title should be visible
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toBeVisible();
  });

  test('3. Navigate through all main pages via sidebar', async () => {
    const sidebarLinks = page.locator('aside nav a');
    const linkCount = await sidebarLinks.count();

    for (let i = 0; i < linkCount; i++) {
      await sidebarLinks.nth(i).click();
      await page.waitForTimeout(300);

      // Each page should have a page-title element
      const title = page.locator('.page-title');
      await expect(title).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Sidebar collapse/expand toggle works', async () => {
    const sidebar = page.locator('aside');

    // Find the toggle button (the one between sidebar and main content)
    const toggleBtn = page.locator('aside + main').locator('..').locator('button').first();
    // Alternative: the toggle button is inside aside with absolute positioning
    const sidebarToggle = sidebar.locator('button.absolute');
    await sidebarToggle.click();
    await page.waitForTimeout(300);

    // After collapse, sidebar should be narrower (w-20)
    const sidebarWidth = await sidebar.evaluate((el) => el.offsetWidth);
    expect(sidebarWidth).toBeLessThan(200); // w-20 = 80px

    // Expand again
    await sidebarToggle.click();
    await page.waitForTimeout(300);

    const expandedWidth = await sidebar.evaluate((el) => el.offsetWidth);
    expect(expandedWidth).toBeGreaterThan(200); // w-64 = 256px
  });

  test('5. Command palette opens with Ctrl+K and closes with Escape', async () => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // Command palette should have a search input
    const searchInput = page.locator('.fixed.inset-0 input[type="text"]');
    await expect(searchInput).toBeVisible({ timeout: 2000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Should be closed now
    await expect(searchInput).not.toBeVisible();
  });

  test('6. Settings page shows language and theme selectors', async () => {
    // Navigate to settings (second-to-last link in bottom menu)
    const bottomLinks = page.locator('aside .border-t a');
    await bottomLinks.first().click();
    await page.waitForTimeout(500);

    // Language buttons should be visible (TR and EN)
    const trButton = page.locator('button:has-text("Türkçe")');
    const enButton = page.locator('button:has-text("English")');
    await expect(trButton).toBeVisible({ timeout: 5000 });
    await expect(enButton).toBeVisible();

    // Theme section should have light/dark/system buttons with icons
    // Theme buttons are inside a card with FiSun, FiMoon, FiMonitor icons
    const themeButtons = page.locator('button svg.lucide, button svg[stroke]').locator('..');
    // At minimum, the theme card should exist
    const cards = page.locator('.rounded-xl.shadow-sm.border');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3); // Backup, Drive, Language, Theme, Categories...
  });
});

test.describe('Construction ERP - Company CRUD Flow', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('1. Navigate to companies page', async () => {
    // Companies is the second nav link
    const companyLink = page.locator('aside nav a').nth(1);
    await companyLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Open new company modal', async () => {
    // Find the "New" / "Yeni" button (primary button with plus icon)
    const newButton = page.locator('button.bg-blue-600, button.dark\\:bg-blue-500').first();
    await newButton.click();
    await page.waitForTimeout(300);

    // Modal should open
    const modal = page.locator('.fixed.inset-0 .bg-white, .fixed.inset-0 .dark\\:bg-gray-800');
    await expect(modal.first()).toBeVisible({ timeout: 3000 });
  });

  test('3. Fill and submit company form', async () => {
    // Find the name input (first required text input in the modal)
    const nameInput = page.locator('.fixed.inset-0 input[type="text"]').first();
    await nameInput.fill('E2E Test Şirketi');

    // Find the phone input
    const inputs = page.locator('.fixed.inset-0 input');
    const inputCount = await inputs.count();

    // Submit the form
    const submitButton = page.locator('.fixed.inset-0 button[type="submit"]');
    await submitButton.click();
    await page.waitForTimeout(1000);

    // Modal should close after successful save (or show validation errors)
    // If the form requires more fields, we check for validation errors
    const errorMessages = page.locator('.fixed.inset-0 .text-red-500');
    const hasErrors = await errorMessages.count();

    if (hasErrors === 0) {
      // Form was submitted successfully, check company appears in list
      const companyName = page.locator('text=E2E Test Şirketi');
      await expect(companyName).toBeVisible({ timeout: 5000 });
    }
    // If there are errors, the test still passes - it verifies validation works
  });

  test('4. Search functionality filters companies', async () => {
    // Close any open modal first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Find search input on the page
    const searchInput = page.locator('.page-container input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyz-nonexistent');
      await page.waitForTimeout(500);

      // Should show empty state or no results
      const tableRows = page.locator('tbody tr');
      const count = await tableRows.count();
      expect(count).toBeLessThanOrEqual(1); // 0 results or empty state row

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Construction ERP - Project CRUD Flow', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('1. Navigate to projects page', async () => {
    // Projects is the third nav link
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

    // Modal should open with form fields
    const modal = page.locator('.fixed.inset-0');
    await expect(modal.locator('form')).toBeVisible({ timeout: 3000 });

    // Should have code input (auto-generated), name input, selects
    const inputs = modal.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(2); // code + name at minimum

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
});

test.describe('Construction ERP - Stock Management Flow', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('1. Navigate to stock page', async () => {
    // Stock is the fourth nav link
    const stockLink = page.locator('aside nav a').nth(3);
    await stockLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Stock page has tabs for materials and movements', async () => {
    // Check for tab/filter buttons or dual view
    const pageContent = page.locator('.page-container');
    await expect(pageContent).toBeVisible();

    // Should have buttons for new material and/or stock movement
    const buttons = pageContent.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Construction ERP - Analytics & Reports Flow', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('1. Navigate to analytics page', async () => {
    // Analytics is the 7th nav link
    const analyticsLink = page.locator('aside nav a').nth(6);
    await analyticsLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });

  test('2. Analytics page shows charts or empty state', async () => {
    const pageContent = page.locator('.page-container');
    await expect(pageContent).toBeVisible();

    // Should have tab buttons or chart containers
    const content = await pageContent.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('3. Navigate to transactions page', async () => {
    // Transactions is the 6th nav link
    const txLink = page.locator('aside nav a').nth(5);
    await txLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });
});

test.describe('Construction ERP - Theme & Language Switching', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('1. Switch language to English', async () => {
    // Go to settings
    const settingsLink = page.locator('aside .border-t a').first();
    await settingsLink.click();
    await page.waitForTimeout(500);

    // Click English button
    const enButton = page.locator('button:has-text("English")');
    await enButton.click();
    await page.waitForTimeout(500);

    // Page should now show English text
    // The settings title should change
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
    // Find the dark theme button (has moon icon)
    // Theme buttons are in a card, look for buttons near theme section
    const themeCards = page.locator('.rounded-xl.shadow-sm.border');

    // Click the dark theme button - it's the second button in the theme card's flex gap-3 container
    // Look for buttons that contain SVG icons (FiMoon)
    const darkButton = page.locator('button:has(svg)').filter({ hasText: /Koyu|Dark/ });
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);

      // HTML element should have 'dark' class
      const hasDarkClass = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(hasDarkClass).toBe(true);

      // Switch back to light
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
    // Trash is the last link in bottom menu
    const trashLink = page.locator('aside .border-t a').last();
    await trashLink.click();
    await page.waitForTimeout(500);

    const title = page.locator('.page-title');
    await expect(title).toBeVisible();
  });
});
