import { defineConfig, devices } from '@playwright/test';
import { baseURL } from './e2e/support/env';

const isCi = Boolean(process.env.CI);

/**
 * End-to-end journeys against a running stack: the web app, the API, Keycloak and PostgreSQL
 * from the API repository's Compose files. Nothing is started here.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  // One journey at a time. They share one demo customer, and the API allows that customer only
  // a few dispute submissions per minute.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  // A journey waits for the simulated scheme outcome, which takes 20 to 30 seconds.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [[isCi ? 'github' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
