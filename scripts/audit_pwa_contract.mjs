import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'public');
const manifestPath = resolve(publicDir, 'manifest.webmanifest');
const serviceWorkerPath = resolve(publicDir, 'sw.js');

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');

expect(manifest.name === 'Nova Music Lab', 'Manifest name must remain Nova Music Lab.');
expect(manifest.id === './', 'Manifest id must stay relative for GitHub Pages.');
expect(manifest.start_url === './', 'Manifest start_url must stay relative for GitHub Pages.');
expect(manifest.scope === './', 'Manifest scope must stay relative for GitHub Pages.');
expect(manifest.display === 'standalone', 'Manifest display must be standalone.');
expect(
  !manifest.display_override?.includes('window-controls-overlay'),
  'Unsupported window-controls-overlay must not be advertised.',
);
expect(
  manifest.background_color === manifest.theme_color,
  'Manifest background and theme colors must match to avoid launch flashes.',
);

for (const icon of manifest.icons ?? []) {
  const relativePath = String(icon.src ?? '').replace(/^\.\//, '');
  expect(relativePath.length > 0, 'Every manifest icon must define a source.');
  if (relativePath) {
    expect(existsSync(resolve(publicDir, relativePath)), `Manifest icon is missing: ${icon.src}`);
  }
}

expect(
  serviceWorker.includes("const CACHE_PREFIX = 'nova-music-lab-';"),
  'Service-worker caches must use the Nova Music Lab namespace.',
);
expect(
  serviceWorker.includes('key.startsWith(CACHE_PREFIX) && key !== CACHE'),
  'Cache cleanup must only remove older Nova Music Lab caches.',
);
expect(
  serviceWorker.includes('cache.add(SHELL_URL)'),
  'The application shell must be precached during installation.',
);
expect(
  serviceWorker.includes('caches.match(SHELL_URL)'),
  'Offline navigation must fall back to the scoped application shell.',
);
expect(
  !serviceWorker.includes('.filter((key) => key !== CACHE)'),
  'The service worker must never delete caches belonging to other Pages apps.',
);

if (failures.length > 0) {
  console.error('PWA contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PWA contract audit passed: ${manifest.icons.length} icons and isolated offline shell verified.`);
}
