import { test, expect } from '@playwright/test';

// Beispiel: Dashboard-Seite Integrationstest

test.describe('Dashboard Integration', () => {
  test('Dashboard lädt und zeigt Überschrift', async ({ page }) => {
    // Login durchführen
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'nikoschefner@gmail.com');
    await page.fill('input[type="password"]', '!Frankfurt1988');
    await page.click('button[type="submit"]');
    // Warte auf Weiterleitung oder Fehler
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      // Überschrift prüfen
      await expect(page.getByTestId('dashboard-title')).toHaveText(/dashboard/i);
    } catch (e) {
      // Prüfe auf Fehlermeldung
      const errorText = await page.locator('.text-red-600').textContent();
      console.log('Login-Fehler:', errorText);
      // Logge den Seiteninhalt für Debugging
      const content = await page.content();
      console.log('Seiteninhalt nach Login:', content);
      throw e;
    }
  });
});
