import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromeDevExecutablePath =
  '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev';
const hasLocalChromeDev = existsSync(chromeDevExecutablePath);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 3 : undefined,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4322',
    launchOptions: hasLocalChromeDev ? { executablePath: chromeDevExecutablePath } : undefined,
    // Use the runner's preinstalled Google Chrome -> no browser download.
    // If a local dev lacks Chrome, comment this line out and rely on the
    // bundled Chromium (`playwright install chromium`).
    channel: hasLocalChromeDev ? undefined : 'chrome',
  },
  webServer: {
    command: 'pnpm build && pnpm preview:a11y',
    url: 'http://127.0.0.1:4322',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      RESEND_API_KEY: 'test_dummy',
      PUBLIC_FORM_ENDPOINT: 'https://worker.example.com',
      PUBLIC_TURNSTILE_SITEKEY: '1x00000000000000000000AA',
    },
  },
});
