import { defineConfig } from '@playwright/test';

const externalUrl = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: externalUrl || 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalUrl
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: false,
        env: { DATABASE_PATH: ':memory:', OPENAI_API_KEY: '', PORT: '4311' },
        timeout: 60_000,
      },
});
