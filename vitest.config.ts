import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: [
      'node_modules/**',
      'src/e2e/**',
      'src/lib/__tests__/supabaseClient.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**/*.ts',
      ],
      exclude: [
        'src/lib/supabase/client.ts',
        'src/lib/supabase/server.ts',
        'src/lib/supabaseClient.ts',
        'src/lib/__tests__/**',
      ],
    },
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
