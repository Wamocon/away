import { test, expect } from '@playwright/test';

test.describe('VacationRequestForm Integration', () => {
  test('Formular ist auf Dashboard sichtbar', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await expect(page.locator('form')).toBeVisible();
  });
});
