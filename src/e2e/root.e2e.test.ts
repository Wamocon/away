import { test, expect } from '@playwright/test';

test.describe('Root-Seite', () => {
  test('Startseite lädt', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page).toHaveTitle(/away/i);
  });
});
