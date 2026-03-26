import { test, expect } from '@playwright/test';

test.describe('API Integration', () => {
  test('GET /api/send-vacation-mail antwortet mit 405', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/send-vacation-mail');
    expect(response.status()).toBe(405);
  });
});
