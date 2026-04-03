import { defineConfig, devices } from '@playwright/test';

/**
 * AWAY – Playwright GUI Test Configuration
 * ─────────────────────────────────────────
 * WICHTIG: Diese Tests sind NUR für die lokale Ausführung!
 * Sie werden NICHT committed, gepusht oder in CI ausgeführt.
 *
 * Ausführung:  npx playwright test
 * Report:      npx playwright show-report playwright-report
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Reporter – JSON + HTML */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  /* Fully parallel */
  fullyParallel: true,
  retries: 1,
  workers: 2,

  /* Shared settings for every test */
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start dev server before running tests */
  webServer: {
    command: 'npm run dev -- -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
