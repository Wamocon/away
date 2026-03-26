import { test, expect } from '@playwright/test';

test.describe('Login Integration', () => {
  test('Login-Seite lädt', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('form')).toBeVisible();
  });
});
