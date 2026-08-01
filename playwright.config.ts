import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

function resolveWorkerCount(): number {
  const constrainedMax = process.env.CI || process.platform === 'win32' ? 1 : 2;
  const rawOverride = process.env.PLAYWRIGHT_WORKERS;
  if (rawOverride === undefined) return constrainedMax;

  const normalized = rawOverride.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new Error('PLAYWRIGHT_WORKERS must be a positive integer.');
  }
  const requested = Number(normalized);
  if (!Number.isSafeInteger(requested) || requested > constrainedMax) {
    throw new Error(
      `PLAYWRIGHT_WORKERS=${normalized} exceeds this environment's safe maximum of ${constrainedMax}.`,
    );
  }
  return requested;
}

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // CI and Windows stay deterministic with one worker; other local hosts may
  // use at most two. A validated override can tighten, never loosen, that cap.
  workers: resolveWorkerCount(),
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [['list']],
  use: {
    baseURL,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
