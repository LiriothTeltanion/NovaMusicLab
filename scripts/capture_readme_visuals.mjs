import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { chromium } from '@playwright/test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'assets', 'screenshots');
const host = '127.0.0.1';
const port = 4174;
const baseUrl = `http://${host}:${port}`;
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const remoteImageReadyTimeoutMs = 8_000;

async function waitForPreview() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

async function waitForReadyImage(page, selector) {
  try {
    await page.waitForFunction(
      imageSelector => {
        const image = document.querySelector(imageSelector);
        return image instanceof HTMLImageElement
          && image.complete
          && image.naturalWidth > 0
          && Number.parseFloat(getComputedStyle(image).opacity) >= 0.99;
      },
      selector,
      { timeout: remoteImageReadyTimeoutMs },
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'TimeoutError') throw error;
    process.stderr.write(
      `Timed out waiting for ${selector}; capturing its deterministic fallback instead.\n`,
    );
  }
}

async function capture(browser, {
  fileName,
  hash,
  viewport,
  storage,
  waitFor,
  waitForImage,
  colorScheme = 'dark',
}) {
  const context = await browser.newContext({
    viewport,
    colorScheme,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();
    await page.addInitScript(values => {
      for (const [key, value] of Object.entries(values)) {
        window.localStorage.setItem(key, value);
      }
    }, storage);
    await page.goto(`${baseUrl}/${hash}`, { waitUntil: 'domcontentloaded' });
    await page.locator(waitFor).waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    if (waitForImage) {
      await waitForReadyImage(page, waitForImage);
      // Give Chromium one compositor frame after React removes the placeholder;
      // otherwise reduced-motion captures can still record the previous paint.
      await page.waitForTimeout(150);
    } else {
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(outputDir, fileName),
      type: 'jpeg',
      quality: 88,
      fullPage: false,
    });
  } finally {
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });

const preview = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', host, '--port', String(port), '--strictPort'],
  {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let previewError = '';
preview.stderr.on('data', chunk => {
  previewError += chunk.toString();
});

try {
  await waitForPreview();
  const browser = await chromium.launch();
  try {
    await capture(browser, {
      fileName: 'nova-home-desktop.jpg',
      hash: '#/',
      viewport: { width: 1440, height: 900 },
      storage: {
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
      },
      waitFor: '[data-testid="hero-first-viewport"]',
      waitForImage: '.nova-hero__portrait img',
    });
    await capture(browser, {
      fileName: 'living-artist-atlas-desktop.jpg',
      hash: '#/artist-identity',
      viewport: { width: 1440, height: 900 },
      storage: {
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
        nml_experience_depth: 'guided',
      },
      waitFor: '#artist-atlas-title',
    });
    await capture(browser, {
      fileName: 'share-hebrew-light-mobile.jpg',
      hash: '#/share-feedback',
      viewport: { width: 390, height: 844 },
      storage: {
        nml_lang: 'he',
        nml_theme: 'daylight',
        nml_tour_seen: 'true',
      },
      waitFor: '#share-feedback-title',
      colorScheme: 'light',
    });
  } finally {
    await browser.close();
  }
} catch (error) {
  if (previewError) process.stderr.write(previewError);
  throw error;
} finally {
  preview.kill();
}

console.log(`Captured README visuals in ${outputDir}`);
