import { spawn } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { chromium } from '@playwright/test';
import gifenc from 'gifenc';
import { buildMediaRecord } from './lib/releaseMedia.mjs';
import { inspectReleaseSourceEvidence } from './lib/releaseSourceEvidence.mjs';
import { buildSocialPreviewFacts } from './lib/socialPreviewFacts.mjs';

const { applyPalette, GIFEncoder, quantize } = gifenc;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(projectRoot, 'scripts', 'release-media.config.json');
const packagePath = path.join(projectRoot, 'package.json');
const shareMetricsPath = path.join(projectRoot, 'src', 'data', 'share_metrics.json');
const publicManifestPath = path.join(projectRoot, 'src', 'data', 'public_dataset_manifest.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const shareMetrics = JSON.parse(await readFile(shareMetricsPath, 'utf8'));
const publicManifest = JSON.parse(await readFile(publicManifestPath, 'utf8'));
if (config.version !== packageJson.version) {
  throw new Error(
    `Release-media config ${config.version} does not match package ${packageJson.version}`,
  );
}
const versionLabel = `v${config.version}`;
const { catalogEntryLabel, observedThroughLabel } = buildSocialPreviewFacts(
  shareMetrics,
  publicManifest,
);
const sourceEvidence = inspectReleaseSourceEvidence(projectRoot, config.version);
const outputDir = path.join(projectRoot, 'assets', 'releases', versionLabel);
const tourFrameDir = path.join(outputDir, 'tour-frames');
const legacyScreenshotDir = path.join(projectRoot, 'assets', 'screenshots');
const host = '127.0.0.1';
const port = 4174;
const baseUrl = `http://${host}:${port}`;
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const remoteImageReadyTimeoutMs = 8_000;
const mediaDefinitions = [
  {
    id: 'profile-hero-desktop',
    fileName: 'home-desktop-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 1440, height: 900 },
  },
  {
    id: 'profile-hero-mobile',
    fileName: 'home-mobile-es-cyber.jpg',
    lang: 'es',
    theme: 'cyber',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'genres-mobile',
    fileName: 'genres-mobile-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'artist-atlas-desktop',
    fileName: 'artist-atlas-desktop-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 1440, height: 900 },
  },
  {
    id: 'guest-museum-desktop',
    fileName: 'guest-museum-desktop-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 1440, height: 900 },
  },
  {
    id: 'hebrew-mobile',
    fileName: 'share-he-mobile-daylight.jpg',
    lang: 'he',
    theme: 'daylight',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'profile-tour-static',
    fileName: 'product-tour-static-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 960, height: 600 },
  },
  {
    id: 'profile-tour',
    fileName: 'product-tour-animated-en-cyber.gif',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 960, height: 600 },
  },
  {
    id: 'social-preview',
    fileName: 'social-preview.png',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 1280, height: 640 },
  },
].map(definition => ({
  ...definition,
  path: `assets/releases/${versionLabel}/${definition.fileName}`,
}));

function mediaDefinition(id) {
  const definition = mediaDefinitions.find(entry => entry.id === id);
  if (!definition) throw new Error(`Unknown media definition ${id}`);
  return definition;
}

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
  id,
  hash,
  viewport,
  storage,
  waitFor,
  waitForImage,
  scrollTo,
  scrollOffset = 0,
  colorScheme = 'dark',
  legacyFileName,
}) {
  const definition = mediaDefinition(id);
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
    if (scrollTo) {
      await page.locator(scrollTo).waitFor({ state: 'visible' });
      await page.evaluate(({ selector, offset }) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Could not find capture target ${selector}`);
        const top = element.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, Math.max(0, top));
      }, { selector: scrollTo, offset: scrollOffset });
      await page.waitForTimeout(150);
    }
    await page.screenshot({
      path: path.join(outputDir, definition.fileName),
      type: 'jpeg',
      quality: 88,
      fullPage: false,
    });
    if (legacyFileName) {
      await copyFile(
        path.join(outputDir, definition.fileName),
        path.join(legacyScreenshotDir, legacyFileName),
      );
    }
  } finally {
    await context.close();
  }
}

async function captureSocialPreview(browser) {
  const definition = mediaDefinition('social-preview');
  const context = await browser.newContext({
    viewport: definition.viewport,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();
    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            html, body {
              width: 1280px;
              height: 640px;
              margin: 0;
              overflow: hidden;
              background: #050b14;
              color: #effbff;
              font-family: Inter, "Segoe UI", Arial, sans-serif;
            }
            body {
              position: relative;
              padding: 54px 64px;
              background:
                radial-gradient(circle at 79% 42%, rgba(15, 215, 255, .18), transparent 29%),
                radial-gradient(circle at 93% 83%, rgba(255, 91, 123, .13), transparent 25%),
                linear-gradient(126deg, #050b14 0%, #071421 55%, #08101e 100%);
            }
            body::before {
              content: "";
              position: absolute;
              inset: 0;
              opacity: .21;
              background-image:
                linear-gradient(rgba(37, 211, 238, .16) 1px, transparent 1px),
                linear-gradient(90deg, rgba(37, 211, 238, .16) 1px, transparent 1px);
              background-size: 54px 54px;
              transform: perspective(620px) rotateX(58deg) translateY(255px) scale(1.35);
              transform-origin: center bottom;
            }
            .frame {
              position: absolute;
              inset: 22px;
              border: 1px solid rgba(56, 224, 255, .42);
              border-radius: 28px;
              box-shadow: inset 0 0 50px rgba(31, 210, 255, .06);
            }
            .brand {
              position: relative;
              z-index: 2;
              display: flex;
              align-items: center;
              gap: 16px;
              color: #82ecff;
              font: 800 18px/1 "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
              letter-spacing: .18em;
            }
            .mark {
              display: grid;
              place-items: center;
              width: 52px;
              height: 52px;
              border: 1px solid #29d9f1;
              border-radius: 17px;
              color: #071019;
              background: linear-gradient(145deg, #8af3ff, #21d4f0);
              box-shadow: 0 0 30px rgba(32, 216, 242, .30);
              font: 950 25px/1 "Segoe UI", sans-serif;
            }
            .version {
              margin-left: auto;
              padding: 11px 17px;
              border: 1px solid rgba(255, 190, 74, .55);
              border-radius: 999px;
              color: #ffd67a;
              background: rgba(255, 190, 74, .08);
              font: 800 13px/1 "Cascadia Mono", Consolas, monospace;
              letter-spacing: .12em;
            }
            main {
              position: relative;
              z-index: 2;
              width: 770px;
              margin-top: 70px;
            }
            .eyebrow {
              margin: 0 0 15px;
              color: #38e6ff;
              font: 800 14px/1 "Cascadia Mono", Consolas, monospace;
              letter-spacing: .22em;
              text-transform: uppercase;
            }
            h1 {
              max-width: 760px;
              margin: 0;
              font-size: 66px;
              line-height: .98;
              letter-spacing: -.045em;
            }
            h1 span { color: #45e8ff; }
            .subtitle {
              max-width: 700px;
              margin: 24px 0 0;
              color: #b8cad7;
              font-size: 21px;
              line-height: 1.45;
            }
            .chips {
              display: flex;
              gap: 12px;
              margin-top: 34px;
            }
            .chip {
              padding: 10px 14px;
              border: 1px solid rgba(108, 226, 244, .34);
              border-radius: 999px;
              color: #d9faff;
              background: rgba(9, 26, 39, .76);
              font: 750 12px/1 "Cascadia Mono", Consolas, monospace;
              letter-spacing: .08em;
            }
            .orbit {
              position: absolute;
              z-index: 1;
              right: 58px;
              top: 114px;
              width: 380px;
              height: 380px;
              border: 1px solid rgba(72, 225, 247, .28);
              border-radius: 50%;
              box-shadow: 0 0 90px rgba(35, 214, 240, .12);
            }
            .orbit::before, .orbit::after {
              content: "";
              position: absolute;
              border-radius: 50%;
              border: 1px solid rgba(255, 102, 137, .32);
              transform: rotate(-24deg);
            }
            .orbit::before { inset: 42px -24px; }
            .orbit::after {
              inset: 93px -54px;
              border-color: rgba(255, 204, 90, .27);
              transform: rotate(31deg);
            }
            .album {
              position: absolute;
              display: grid;
              place-items: center;
              border: 1px solid rgba(255,255,255,.2);
              border-radius: 24px;
              box-shadow: 0 18px 46px rgba(0, 0, 0, .42), 0 0 30px currentColor;
              color: rgba(60, 228, 255, .23);
              background:
                linear-gradient(145deg, rgba(255,255,255,.13), transparent),
                repeating-radial-gradient(circle, #0a1722 0 7px, #1a3442 8px 10px);
            }
            .album::after {
              content: "";
              width: 22%;
              height: 22%;
              border-radius: 50%;
              background: #ffcb58;
              box-shadow: 0 0 22px rgba(255, 203, 88, .72);
            }
            .album.one { width: 158px; height: 158px; left: 111px; top: 92px; transform: rotate(8deg); }
            .album.two { width: 112px; height: 112px; right: -22px; top: 40px; color: rgba(255, 80, 130, .25); transform: rotate(-9deg); }
            .album.three { width: 126px; height: 126px; right: 8px; bottom: 18px; color: rgba(88, 255, 187, .22); transform: rotate(13deg); }
            .privacy {
              position: absolute;
              z-index: 2;
              right: 64px;
              bottom: 46px;
              display: flex;
              align-items: center;
              gap: 9px;
              color: #71f4c7;
              font: 800 12px/1 "Cascadia Mono", Consolas, monospace;
              letter-spacing: .1em;
              text-transform: uppercase;
            }
            .privacy i {
              width: 9px;
              height: 9px;
              border-radius: 50%;
              background: #71f4c7;
              box-shadow: 0 0 18px #71f4c7;
            }
          </style>
        </head>
        <body>
          <div class="frame"></div>
          <header class="brand">
            <span class="mark">N</span>
            <span>NOVA MUSIC LAB</span>
            <span class="version">${versionLabel}</span>
          </header>
          <main>
            <p class="eyebrow">The Living Archive Finds Its Voice</p>
            <h1>Your music becomes a <span>living atlas.</span></h1>
            <p class="subtitle">Explore an honest historical snapshot through artist portraits, genre evidence and stories. Private imports stay in your browser.</p>
            <div class="chips">
              <span class="chip">${catalogEntryLabel} CATALOG ENTRIES</span>
              <span class="chip">DATA THROUGH ${observedThroughLabel}</span>
              <span class="chip">EN · ES · HE</span>
            </div>
          </main>
          <div class="orbit" aria-hidden="true">
            <span class="album one"></span>
            <span class="album two"></span>
            <span class="album three"></span>
          </div>
          <p class="privacy"><i></i> Files stay local by default</p>
        </body>
      </html>
    `);
    await page.evaluate(() => document.fonts.ready);
    const publicPath = path.join(projectRoot, 'public', 'social-preview-v2.png');
    await page.screenshot({
      path: publicPath,
      type: 'png',
      fullPage: false,
    });
    await copyFile(publicPath, path.join(outputDir, definition.fileName));
  } finally {
    await context.close();
  }
}

async function captureProductTour(browser) {
  const viewport = mediaDefinition('profile-tour-static').viewport;
  const context = await browser.newContext({
    viewport,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem('nml_lang', 'en');
      window.localStorage.setItem('nml_theme', 'cyber');
      window.localStorage.setItem('nml_tour_seen', 'true');
      window.localStorage.setItem('nml_experience_depth', 'explore');
    });
    const stops = [
      { hash: '#/', waitFor: '[data-testid="hero-first-viewport"]' },
      { hash: '#/artist-identity', waitFor: '#artist-atlas-title' },
      { hash: '#/top?view=genres', waitFor: '[data-top-tab="generos"][aria-pressed="true"]' },
    ];
    const frames = [];
    for (let step = 0; step < stops.length; step += 1) {
      const stop = stops[step];
      await page.goto(`${baseUrl}/${stop.hash}`, { waitUntil: 'domcontentloaded' });
      await page.locator(stop.waitFor).waitFor({ state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const frame = await page.screenshot({
        type: 'jpeg',
        quality: 82,
        fullPage: false,
      });
      frames.push(frame);
      await writeFile(
        path.join(tourFrameDir, `tour-step-${String(step + 1).padStart(2, '0')}.jpg`),
        frame,
      );
    }

    const contactSheet = await composeTourContactSheet(page, frames);
    await writeFile(
      path.join(outputDir, mediaDefinition('profile-tour-static').fileName),
      contactSheet,
    );

    const gif = await encodeTourGif(browser, frames);
    await writeFile(
      path.join(outputDir, mediaDefinition('profile-tour').fileName),
      gif,
    );
  } finally {
    await context.close();
  }
}

async function composeTourContactSheet(page, jpegFrames) {
  const frameDataUrls = jpegFrames.map(
    frame => `data:image/jpeg;base64,${frame.toString('base64')}`,
  );
  const encoded = await page.evaluate(async ({
    frameDataUrls: urls,
    releaseLabel,
    releaseStatus,
    capturedOn,
  }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable for the tour contact sheet');

    const images = await Promise.all(urls.map(source => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode a tour contact-sheet frame'));
      image.src = source;
    })));

    const background = ctx.createLinearGradient(0, 0, 960, 600);
    background.addColorStop(0, '#04131d');
    background.addColorStop(0.55, '#081426');
    background.addColorStop(1, '#120a24');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 960, 600);

    ctx.fillStyle = '#dffcff';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('NOVA MUSIC LAB · THREE-ROOM EXPEDITION', 22, 36);
    ctx.fillStyle = '#79d9e7';
    ctx.font = '500 12px ui-monospace, monospace';
    ctx.fillText('HOME → LIVING ARTIST ATLAS → GENRES', 22, 56);

    const panels = [
      { x: 20, y: 76, width: 570, height: 356, label: '01  HOME', color: '#22d3ee' },
      { x: 610, y: 76, width: 330, height: 206, label: '02  LIVING ARTIST ATLAS', color: '#a78bfa' },
      { x: 610, y: 302, width: 330, height: 206, label: '03  GENRES', color: '#34d399' },
    ];

    panels.forEach((panel, index) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(panel.x, panel.y, panel.width, panel.height, 12);
      ctx.clip();
      ctx.drawImage(images[index], panel.x, panel.y, panel.width, panel.height);
      const shade = ctx.createLinearGradient(0, panel.y + panel.height - 56, 0, panel.y + panel.height);
      shade.addColorStop(0, 'rgba(2, 8, 18, 0)');
      shade.addColorStop(1, 'rgba(2, 8, 18, 0.94)');
      ctx.fillStyle = shade;
      ctx.fillRect(panel.x, panel.y + panel.height - 60, panel.width, 60);
      ctx.restore();

      ctx.strokeStyle = panel.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(panel.x, panel.y, panel.width, panel.height, 12);
      ctx.stroke();
      ctx.fillStyle = panel.color;
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.fillText(panel.label, panel.x + 14, panel.y + panel.height - 16);
    });

    ctx.fillStyle = '#d5e9ef';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('An invitation becomes a face, then evidence.', 22, 478);
    ctx.fillStyle = '#8ea9b4';
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillText('Static reduced-motion overview · the animated artifact visits the same three rooms.', 22, 505);
    ctx.fillStyle = '#5ee7f2';
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.fillText(
      `${releaseLabel} · ${releaseStatus.replaceAll('-', ' ').toUpperCase()} · ${capturedOn}`,
      22,
      560,
    );

    return canvas.toDataURL('image/jpeg', 0.88);
  }, {
    frameDataUrls,
    releaseLabel: versionLabel,
    releaseStatus: config.status,
    capturedOn: config.captured_on,
  });

  return Buffer.from(encoded.split(',')[1], 'base64');
}

async function encodeTourGif(browser, jpegFrames) {
  const context = await browser.newContext({
    viewport: { width: 560, height: 350 },
    serviceWorkers: 'block',
  });

  try {
    const page = await context.newPage();
    const frameDataUrls = jpegFrames.map(
      frame => `data:image/jpeg;base64,${frame.toString('base64')}`,
    );
    const rgbaFrames = await page.evaluate(async ({ frameDataUrls: urls }) => {
      const width = 560;
      const height = 350;
      const loadImage = source => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not decode a product-tour frame'));
        image.src = source;
      });
      const images = await Promise.all(urls.map(loadImage));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context2d = canvas.getContext('2d', { willReadFrequently: true });
      if (!context2d) throw new Error('Canvas 2D is unavailable');

      return images.map(image => {
        context2d.clearRect(0, 0, width, height);
        context2d.drawImage(image, 0, 0, width, height);
        return Array.from(context2d.getImageData(0, 0, width, height).data);
      });
    }, { frameDataUrls });

    const width = 560;
    const height = 350;
    const gifEncoder = GIFEncoder();
    for (const frame of rgbaFrames) {
      const rgba = Uint8Array.from(frame);
      const palette = quantize(rgba, 256, { format: 'rgb565' });
      const indexed = applyPalette(rgba, palette, 'rgb565');
      gifEncoder.writeFrame(indexed, width, height, {
        palette,
        delay: 1_800,
        repeat: 0,
        dispose: 1,
      });
    }
    gifEncoder.finish();

    const gif = Buffer.from(gifEncoder.bytes());
    await verifyAnimatedGif(browser, gif, frameDataUrls);
    return gif;
  } finally {
    await context.close();
  }
}

async function verifyAnimatedGif(browser, gif, referenceFrameDataUrls) {
  const context = await browser.newContext({
    viewport: { width: 560, height: 350 },
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  });

  try {
    const page = await context.newPage();
    const referenceImages = referenceFrameDataUrls
      .map((source, index) => `<img class="reference" data-index="${index}" alt="" src="${source}">`)
      .join('');
    await page.setContent(
      `<style>html,body{margin:0;width:560px;height:350px;overflow:hidden;background:#050b14}.reference{display:none}</style>
       <img id="tour" width="560" height="350" alt="" src="data:image/gif;base64,${gif.toString('base64')}">
       ${referenceImages}`,
    );
    await page.locator('#tour').waitFor({ state: 'visible' });
    await page.locator('#tour').evaluate(image => image.decode());
    await page.locator('.reference').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const dimensions = await page.locator('#tour').evaluate(image => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
    if (dimensions.width !== 560 || dimensions.height !== 350) {
      throw new Error(`Generated product-tour GIF did not decode at 560x350`);
    }

    const paintedFrameDataUrls = [];
    await page.waitForTimeout(120);
    for (let frameIndex = 0; frameIndex < referenceFrameDataUrls.length; frameIndex += 1) {
      // A screenshot forces Chromium to paint the current animated-image
      // frame. Drawing the <img> directly to canvas can return its stale first
      // decoded frame in headless mode even while the compositor has advanced.
      const paintedFrame = await page.screenshot({ type: 'png' });
      paintedFrameDataUrls.push(`data:image/png;base64,${paintedFrame.toString('base64')}`);
      if (frameIndex < referenceFrameDataUrls.length - 1) {
        // Capture the timeline first, before pixel comparison time can move the
        // animation into its next loop.
        await page.waitForTimeout(2_000);
      }
    }

    const comparisons = [];
    for (let frameIndex = 0; frameIndex < referenceFrameDataUrls.length; frameIndex += 1) {
      const paintedFrameDataUrl = paintedFrameDataUrls[frameIndex];
      const comparisonsToReferences = await page.evaluate(async actualSource => {
        const references = [...document.querySelectorAll('.reference')];
        if (references.length === 0) {
          throw new Error('Missing GIF comparison images');
        }
        const actualImage = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('Could not decode painted GIF frame'));
          image.src = actualSource;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 560;
        canvas.height = 350;
        const context2d = canvas.getContext('2d', { willReadFrequently: true });
        if (!context2d) throw new Error('Canvas 2D is unavailable during GIF verification');

        context2d.drawImage(actualImage, 0, 0, 560, 350);
        const actual = context2d.getImageData(0, 0, 560, 350).data;
        return references.map(reference => {
          if (!(reference instanceof HTMLImageElement)) {
            throw new Error('Invalid GIF reference image');
          }
          context2d.clearRect(0, 0, 560, 350);
          context2d.drawImage(reference, 0, 0, 560, 350);
          const expected = context2d.getImageData(0, 0, 560, 350).data;

          let absoluteError = 0;
          let severePixels = 0;
          for (let offset = 0; offset < actual.length; offset += 4) {
            const red = Math.abs(actual[offset] - expected[offset]);
            const green = Math.abs(actual[offset + 1] - expected[offset + 1]);
            const blue = Math.abs(actual[offset + 2] - expected[offset + 2]);
            absoluteError += red + green + blue;
            if (Math.max(red, green, blue) > 96) severePixels += 1;
          }

          const pixels = 560 * 350;
          return {
            meanAbsoluteError: absoluteError / (pixels * 3),
            severePixelRatio: severePixels / pixels,
          };
        });
      }, paintedFrameDataUrl);
      const comparison = comparisonsToReferences[frameIndex];
      const bestReferenceIndex = comparisonsToReferences.reduce(
        (best, candidate, index, list) => (
          candidate.meanAbsoluteError < list[best].meanAbsoluteError ? index : best
        ),
        0,
      );
      comparisons.push(comparison);

      if (comparison.meanAbsoluteError > 28 || comparison.severePixelRatio > 0.06) {
        throw new Error(
          `Generated GIF frame ${frameIndex + 1} drifted from its source `
          + `(mean error ${comparison.meanAbsoluteError.toFixed(2)}, `
          + `${(comparison.severePixelRatio * 100).toFixed(2)}% severe pixels; `
          + `best match was source frame ${bestReferenceIndex + 1})`,
        );
      }
    }

    process.stdout.write(
      `Verified GIF fidelity: ${comparisons.map((comparison, index) => (
        `frame ${index + 1} mean ${comparison.meanAbsoluteError.toFixed(2)} / severe `
        + `${(comparison.severePixelRatio * 100).toFixed(2)}%`
      )).join('; ')}.\n`,
    );
  } finally {
    await context.close();
  }
}

async function writeReleaseManifests() {
  const media = [];
  for (const definition of mediaDefinitions) {
    media.push(await buildMediaRecord(projectRoot, definition));
  }

  const profileManifest = {
    schema: 'nova-music-profile-release-v1',
    release: {
      status: config.status,
      version: config.version,
      commit: config.commit,
      captured_on: config.captured_on,
      deployed_on: config.deployed_on,
    },
    repository: config.repository,
    default_branch: config.default_branch,
    live_url: config.live_url,
    media,
  };
  const detailedManifest = {
    schema: 'nova-music-release-media-v1',
    release: {
      status: config.status,
      version: config.version,
      source_commit: sourceEvidence.sourceCommit,
      source_head_commit: sourceEvidence.sourceHeadCommit,
      source_state: sourceEvidence.sourceState,
      source_fingerprint_algorithm: sourceEvidence.sourceFingerprintAlgorithm,
      source_fingerprint: sourceEvidence.sourceFingerprint,
      source_file_count: sourceEvidence.sourceFileCount,
      captured_on: config.captured_on,
      deployed_on: config.deployed_on,
    },
    repository: {
      slug: config.repository,
      default_branch: config.default_branch,
      live_url: config.live_url,
    },
    required_media_ids: mediaDefinitions.map(entry => entry.id),
    fallbacks: [
      {
        media_id: 'profile-tour',
        fallback_media_id: 'profile-tour-static',
      },
    ],
    animation: {
      media_id: 'profile-tour',
      frames: 3,
      frame_delay_ms: 1800,
      reduced_motion_fallback_media_id: 'profile-tour-static',
    },
    legacy_aliases: [
      {
        media_id: 'profile-hero-desktop',
        path: 'assets/screenshots/nova-home-desktop.jpg',
      },
      {
        media_id: 'artist-atlas-desktop',
        path: 'assets/screenshots/living-artist-atlas-desktop.jpg',
      },
      {
        media_id: 'guest-museum-desktop',
        path: 'assets/screenshots/guest-museum-desktop.jpg',
      },
      {
        media_id: 'hebrew-mobile',
        path: 'assets/screenshots/share-hebrew-light-mobile.jpg',
      },
      {
        media_id: 'social-preview',
        path: 'public/social-preview-v2.png',
      },
    ],
    media,
  };

  await writeFile(
    path.join(outputDir, 'release-media.json'),
    `${JSON.stringify(detailedManifest, null, 2)}\n`,
  );
  await writeFile(
    path.join(projectRoot, 'public', 'release-profile-manifest.json'),
    `${JSON.stringify(profileManifest, null, 2)}\n`,
  );
}

await mkdir(outputDir, { recursive: true });
await mkdir(tourFrameDir, { recursive: true });
await mkdir(legacyScreenshotDir, { recursive: true });

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
      id: 'profile-hero-desktop',
      hash: '#/',
      viewport: { width: 1440, height: 900 },
      storage: {
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
      },
      waitFor: '[data-testid="hero-first-viewport"]',
      waitForImage: '.nova-hero__portrait img',
      legacyFileName: 'nova-home-desktop.jpg',
    });
    await capture(browser, {
      id: 'profile-hero-mobile',
      hash: '#/',
      viewport: { width: 390, height: 844 },
      storage: {
        nml_lang: 'es',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
      },
      waitFor: '[data-testid="hero-first-viewport"]',
      waitForImage: '.nova-hero__portrait img',
    });
    await capture(browser, {
      id: 'genres-mobile',
      hash: '#/top?view=genres',
      viewport: { width: 390, height: 844 },
      storage: {
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
        nml_experience_depth: 'explore',
      },
      waitFor: '[data-top-tab="generos"][aria-pressed="true"]',
    });
    await capture(browser, {
      id: 'artist-atlas-desktop',
      hash: '#/artist-identity',
      viewport: { width: 1440, height: 900 },
      storage: {
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
        nml_experience_depth: 'guided',
      },
      waitFor: '#artist-atlas-title',
      waitForImage: '.artist-atlas__stage-image',
      scrollTo: '.artist-atlas__hero',
      scrollOffset: 170,
      legacyFileName: 'living-artist-atlas-desktop.jpg',
    });
    await capture(browser, {
      id: 'guest-museum-desktop',
      hash: '#/upload',
      viewport: { width: 1440, height: 900 },
      storage: {
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
        nml_experience_depth: 'explore',
        'nova-music-lab:local-visitor-profile': JSON.stringify({
          schemaVersion: 1,
          displayName: 'Nova Visitor',
          updatedAt: '2026-07-29T00:00:00.000Z',
        }),
      },
      waitFor: '[data-testid="upload-primary-action"]',
      legacyFileName: 'guest-museum-desktop.jpg',
    });
    await capture(browser, {
      id: 'hebrew-mobile',
      hash: '#/share-feedback',
      viewport: { width: 390, height: 844 },
      storage: {
        nml_lang: 'he',
        nml_theme: 'daylight',
        nml_tour_seen: 'true',
      },
      waitFor: '#share-feedback-title',
      colorScheme: 'light',
      legacyFileName: 'share-hebrew-light-mobile.jpg',
    });
    await captureProductTour(browser);
    await captureSocialPreview(browser);
    await writeReleaseManifests();
  } finally {
    await browser.close();
  }
} catch (error) {
  if (previewError) process.stderr.write(previewError);
  throw error;
} finally {
  preview.kill();
}

console.log(`Captured ${mediaDefinitions.length} release visuals in ${outputDir}`);
