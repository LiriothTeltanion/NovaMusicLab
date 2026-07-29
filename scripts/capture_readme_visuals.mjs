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
import { buildMediaRecord } from './lib/releaseMedia.mjs';
import { inspectReleaseSourceEvidence } from './lib/releaseSourceEvidence.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(projectRoot, 'scripts', 'release-media.config.json');
const packagePath = path.join(projectRoot, 'package.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
if (config.version !== packageJson.version) {
  throw new Error(
    `Release-media config ${config.version} does not match package ${packageJson.version}`,
  );
}

const versionLabel = `v${config.version}`;
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
    fileName: 'home-mobile-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'genres-desktop',
    fileName: 'genres-desktop-en-cyber.jpg',
    lang: 'en',
    theme: 'cyber',
    viewport: { width: 1440, height: 900 },
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
            <p class="eyebrow">Guest Museum · Living Genre Atlas</p>
            <h1>Your music becomes a <span>living museum.</span></h1>
            <p class="subtitle">Import your listening history, explore artist stories and compare two musical worlds — directly in your browser.</p>
            <div class="chips">
              <span class="chip">6,413 ARTISTS</span>
              <span class="chip">2,257 GENRE TERMS</span>
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
      window.localStorage.removeItem('nml_tour_seen');
    });
    await page.goto(`${baseUrl}/#/`, { waitUntil: 'domcontentloaded' });
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);

    const frames = [];
    for (let step = 0; step < 5; step += 1) {
      await page.waitForTimeout(80);
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
      if (step === 0) {
        await writeFile(
          path.join(outputDir, mediaDefinition('profile-tour-static').fileName),
          frame,
        );
      }
      if (step < 4) {
        await dialog.locator('button').last().click();
        await dialog.waitFor({ state: 'visible' });
      }
    }

    const gif = await encodeTourGif(browser, frames);
    await writeFile(
      path.join(outputDir, mediaDefinition('profile-tour').fileName),
      gif,
    );
  } finally {
    await context.close();
  }
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
    const encoded = await page.evaluate(async ({ frameDataUrls: urls }) => {
      const width = 560;
      const height = 350;
      const delayCentiseconds = 220;
      const palette = [];
      const eightLevelChannel = [0, 12, 28, 52, 88, 136, 196, 255];
      const fourLevelChannel = [0, 32, 112, 255];
      const closestLevel = (value, levels) => {
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < levels.length; index += 1) {
          const distance = Math.abs(levels[index] - value);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        }
        return bestIndex;
      };
      const eightLevelLookup = Array.from(
        { length: 256 },
        (_, value) => closestLevel(value, eightLevelChannel),
      );
      const fourLevelLookup = Array.from(
        { length: 256 },
        (_, value) => closestLevel(value, fourLevelChannel),
      );

      for (let index = 0; index < 256; index += 1) {
        const red = (index >> 5) & 0x07;
        const green = (index >> 2) & 0x07;
        const blue = index & 0x03;
        palette.push(
          eightLevelChannel[red],
          eightLevelChannel[green],
          fourLevelChannel[blue],
        );
      }

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

      const indexedFrames = images.map(image => {
        context2d.clearRect(0, 0, width, height);
        context2d.drawImage(image, 0, 0, width, height);
        const rgba = context2d.getImageData(0, 0, width, height).data;
        const indexed = new Uint8Array(width * height);
        for (let pixel = 0, offset = 0; pixel < indexed.length; pixel += 1, offset += 4) {
          indexed[pixel] = (eightLevelLookup[rgba[offset]] << 5)
            | (eightLevelLookup[rgba[offset + 1]] << 2)
            | fourLevelLookup[rgba[offset + 2]];
        }
        return indexed;
      });

      const output = [];
      const writeAscii = value => {
        for (let index = 0; index < value.length; index += 1) {
          output.push(value.charCodeAt(index));
        }
      };
      const writeUint16 = value => output.push(value & 0xff, (value >> 8) & 0xff);
      const writeCodeStream = indices => {
        const clearCode = 256;
        const endCode = 257;
        let currentByte = 0;
        let bitOffset = 0;
        const compressed = [];
        const emit = code => {
          currentByte |= code << bitOffset;
          bitOffset += 9;
          while (bitOffset >= 8) {
            compressed.push(currentByte & 0xff);
            currentByte >>= 8;
            bitOffset -= 8;
          }
        };

        // Literal runs with frequent clear codes trade a modest amount of
        // compression for a tiny, dependency-free encoder. Keeping each run
        // below 254 symbols means the GIF decoder never has to grow beyond
        // the 9-bit code width, avoiding encoder/decoder dictionary drift.
        for (let offset = 0; offset < indices.length; offset += 200) {
          emit(clearCode);
          const end = Math.min(offset + 200, indices.length);
          for (let index = offset; index < end; index += 1) {
            emit(indices[index]);
          }
        }
        emit(endCode);
        if (bitOffset > 0) compressed.push(currentByte & 0xff);

        for (let offset = 0; offset < compressed.length; offset += 255) {
          const block = compressed.slice(offset, offset + 255);
          output.push(block.length, ...block);
        }
        output.push(0);
      };

      writeAscii('GIF89a');
      writeUint16(width);
      writeUint16(height);
      output.push(0xf7, 0, 0, ...palette);
      output.push(
        0x21, 0xff, 0x0b,
        0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
        0x03, 0x01, 0x00, 0x00, 0x00,
      );

      for (const frame of indexedFrames) {
        output.push(
          0x21, 0xf9, 0x04, 0x04,
          delayCentiseconds & 0xff,
          (delayCentiseconds >> 8) & 0xff,
          0x00, 0x00,
        );
        output.push(0x2c, 0, 0, 0, 0);
        writeUint16(width);
        writeUint16(height);
        output.push(0x00, 0x08);
        writeCodeStream(frame);
      }
      output.push(0x3b);

      const chunks = [];
      for (let offset = 0; offset < output.length; offset += 16_384) {
        chunks.push(String.fromCharCode(...output.slice(offset, offset + 16_384)));
      }
      return btoa(chunks.join(''));
    }, { frameDataUrls });

    const gif = Buffer.from(encoded, 'base64');
    await verifyAnimatedGif(browser, gif);
    return gif;
  } finally {
    await context.close();
  }
}

async function verifyAnimatedGif(browser, gif) {
  const context = await browser.newContext({
    viewport: { width: 560, height: 350 },
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  });

  try {
    const page = await context.newPage();
    await page.setContent(
      `<img id="tour" width="560" height="350" alt="" src="data:image/gif;base64,${gif.toString('base64')}">`,
    );
    await page.locator('#tour').waitFor({ state: 'visible' });
    const dimensions = await page.locator('#tour').evaluate(image => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
    if (dimensions.width !== 560 || dimensions.height !== 350) {
      throw new Error(`Generated product-tour GIF did not decode at 560x350`);
    }

    await page.waitForTimeout(150);
    const firstFrame = await page.screenshot();
    await page.waitForTimeout(2_350);
    const secondFrame = await page.screenshot();
    if (firstFrame.equals(secondFrame)) {
      throw new Error('Generated product-tour GIF did not advance to its second frame');
    }
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
      frames: 5,
      frame_delay_ms: 2200,
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
        nml_lang: 'en',
        nml_theme: 'cyber',
        nml_tour_seen: 'true',
      },
      waitFor: '[data-testid="hero-first-viewport"]',
      waitForImage: '.nova-hero__portrait img',
    });
    await capture(browser, {
      id: 'genres-desktop',
      hash: '#/top?view=genres',
      viewport: { width: 1440, height: 900 },
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
