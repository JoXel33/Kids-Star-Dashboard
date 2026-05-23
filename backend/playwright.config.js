import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'node --experimental-sqlite src/server.js',
    url: 'http://localhost:3000',
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DB_PATH: './data/dashboard.e2e.sqlite',
      SERVER_SECRET: 'e2e-secret',
      PORT: '3000',
    },
  },
});
