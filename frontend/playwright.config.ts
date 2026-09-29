import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 60_000,
  use: { baseURL: 'http://localhost:15173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --port 15173', url: 'http://localhost:15173', env: { EMS_GATEWAY_URL: 'http://localhost:18080' }, reuseExistingServer: false },
});
