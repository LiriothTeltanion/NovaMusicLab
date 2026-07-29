import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Page,
  type TestInfo,
} from '@playwright/test';

const WCAG_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
] as const;

async function expectNoAutomatedAccessibilityViolations(
  page: Page,
  testInfo: TestInfo,
) {
  const results = await new AxeBuilder({ page })
    .withTags([...WCAG_AA_TAGS])
    .analyze();

  if (results.violations.length > 0) {
    await testInfo.attach('axe-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
  }

  expect(
    results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target),
    })),
  ).toEqual([]);
}

async function expectNoHorizontalPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth + 1,
  );
}

test('a first-time visitor can reach the flagship landing experience', async ({
  page,
}, testInfo) => {
  await page.goto('/');

  const welcome = page.getByRole('dialog', {
    name: /welcome to the sound museum/i,
  });
  await expect(welcome).toBeVisible();
  await expect(welcome.getByRole('button', { name: /next/i })).toBeFocused();
  await welcome.getByRole('button', { name: /skip/i }).click();

  await expect(page.getByTestId('hero-first-viewport')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /enter the sound museum/i }),
  ).toBeVisible();

  await expectNoHorizontalPageOverflow(page);
  await expectNoAutomatedAccessibilityViolations(page, testInfo);
});

test('the hub map stays inside the title bar and the expedition console remains below it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
  });

  await page.goto('/#/dashboard');

  const mapDock = page.getByTestId('museum-map-dock');
  const expeditionConsole = page.getByTestId('expedition-console');
  await expect(mapDock).toBeVisible();
  await expect(expeditionConsole).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Control Room' })).toBeFocused();

  await page.evaluate(() => window.scrollTo(0, 1_200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

  const positions = await page.evaluate(() => {
    const headerRect = document.querySelector('[data-testid="museum-app-header"]')?.getBoundingClientRect();
    const dockRect = document.querySelector('[data-testid="museum-map-dock"]')?.getBoundingClientRect();
    const consoleRect = document.querySelector('[data-testid="expedition-console"]')?.getBoundingClientRect();
    if (!headerRect || !dockRect || !consoleRect) throw new Error('Museum shell is incomplete.');
    return {
      headerTop: headerRect.top,
      headerBottom: headerRect.bottom,
      dockTop: dockRect.top,
      dockBottom: dockRect.bottom,
      consoleTop: consoleRect.top,
      consoleBottom: consoleRect.bottom,
    };
  });

  expect(Math.abs(positions.headerTop)).toBeLessThanOrEqual(1);
  expect(positions.dockTop).toBeGreaterThanOrEqual(positions.headerTop - 1);
  expect(positions.dockBottom).toBeLessThanOrEqual(positions.headerBottom + 1);
  expect(Math.abs(positions.consoleTop - positions.headerBottom)).toBeLessThanOrEqual(4);
  expect(positions.consoleBottom).toBeGreaterThan(positions.consoleTop);
});

test('the compact shell stays usable without horizontal overflow at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    window.localStorage.setItem('nml_motion_mode', 'static');
  });

  await page.goto('/#/dashboard');

  const header = page.getByTestId('museum-app-header');
  const console = page.getByTestId('expedition-console');
  await expect(header.getByTestId('museum-map-dock')).toBeVisible();
  await expect(console.getByTestId('experience-switcher')).toBeVisible();
  await expect(console.getByTestId('room-progress')).toBeVisible();

  const roomMapTrigger = console.getByRole('button', {
    name: /open room map: dashboard/i,
  });
  await roomMapTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Room map' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(roomMapTrigger).toBeFocused();

  const searchTrigger = console.getByTestId('command-palette-trigger');
  await searchTrigger.click();
  await expect(
    page.getByRole('textbox', { name: /search rooms and tools/i }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(searchTrigger).toBeFocused();

  await expectNoHorizontalPageOverflow(page);
});

test('a guest can name, import, restore and compare a local museum without an account', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    window.localStorage.setItem('nml_motion_mode', 'static');
  });

  await page.goto('/#/upload');

  await page.getByRole('textbox', { name: 'Museum name' }).fill('Danny Muse');
  await page.locator('input[type="file"][accept*=".csv"]').first().setInputFiles({
    name: 'danny-lastfm.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'Bring Me The Horizon,Sempiternal,Shadow Moses,01 Jan 2026 10:00',
      'Sleep Token,Take Me Back to Eden,The Summoning,02 Jan 2026 11:00',
      'The Midnight,Endless Summer,Sunset,03 Jan 2026 12:00',
    ].join('\n')),
  });

  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.getByTestId('persistence-notice')).toHaveAttribute(
    'data-notice-tone',
    'success',
  );
  await expect(page.getByTestId('persistence-notice')).toContainText(
    'Archive saved locally in this browser.',
  );

  await page.reload();
  await expect(page.getByText(/last analysis was restored automatically/i)).toBeVisible();

  await page.goto('/#/compare-museums');
  await expect(
    page.getByRole('heading', { name: 'Parallel Museums' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: "Danny Muse's museum", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: "Kevin's public flagship",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator('[data-comparison-scope="complete"]'),
  ).toContainText('Complete catalog coverage');
});

test('the Guest Museum entry remains clear and accessible in Spanish', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'es');
    window.localStorage.setItem('nml_tour_seen', 'true');
    window.localStorage.setItem('nml_motion_mode', 'static');
  });

  await page.goto('/#/upload');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText(/Entrada de visitante · sin cuenta/i)).toBeVisible();
  await page.getByRole('textbox', { name: 'Nombre del museo' }).fill('Amigo');
  await expect(page.getByText('Guardado solo en este dispositivo')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Examinar archivos localmente/i }),
  ).toBeVisible();

  await expectNoHorizontalPageOverflow(page);
  await expectNoAutomatedAccessibilityViolations(page, testInfo);
});

test('a hero constellation portrait opens the matching Living Artist Atlas territory', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    window.localStorage.setItem('nml_motion_mode', 'static');
  });

  await page.goto('/#/');

  const portrait = page
    .getByTestId('hero-artist-constellation')
    .getByRole('button')
    .first();
  const actionLabel = await portrait.getAttribute('aria-label');
  const artistName = actionLabel?.match(/^Open (.+) artist profile$/)?.[1];
  expect(artistName).toBeTruthy();

  await portrait.click();

  await expect(page).toHaveURL(/#\/artist-identity\?artist=/);
  await expect(
    page.locator('.artist-atlas__hero').getByRole('heading', {
      name: artistName!,
      exact: true,
    }),
  ).toBeVisible();
});

test('a direct Atlas link keeps its hash while experience depth changes', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
    if (window.localStorage.getItem('nml_experience_depth') === null) {
      window.localStorage.setItem('nml_experience_depth', 'guided');
    }
  });

  await page.goto('/#/artist-identity');

  const switcher = page.getByTestId('experience-switcher');
  await expect(switcher).toBeVisible();
  await expect(
    switcher.getByRole('button', { name: 'Deep Dive' }),
  ).toBeVisible();
  await expect(
    switcher.getByRole('button', { name: 'Guided' }),
  ).toHaveAttribute('aria-pressed', 'true');

  const initialHash = await page.evaluate(() => window.location.hash);
  expect(initialHash).toBe('#/artist-identity');

  const deepDive = switcher.getByRole('button', { name: 'Deep Dive' });
  await deepDive.click();

  await expect(deepDive).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.location.hash)).toBe(initialHash);
  expect(
    await page.evaluate(() => window.localStorage.getItem('nml_experience_depth')),
  ).toBe('deep-dive');

  await page.reload();

  await expect(
    page
      .getByTestId('experience-switcher')
      .getByRole('button', { name: 'Deep Dive' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.location.hash)).toBe(initialHash);

  await expectNoHorizontalPageOverflow(page);
  await expectNoAutomatedAccessibilityViolations(page, testInfo);
});

test('the share room works in Hebrew RTL and a light theme', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'he');
    window.localStorage.setItem('nml_theme', 'daylight');
    window.localStorage.setItem('nml_tour_seen', 'true');
  });

  await page.goto('/#/share-feedback');

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await expect(
    page.getByRole('heading', { name: 'הזמנה למוזיאון' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /WhatsApp/ }).first(),
  ).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/);

  await expectNoHorizontalPageOverflow(page);
  await expectNoAutomatedAccessibilityViolations(page, testInfo);
});

test('the Audio Lab is explicit about its local-only foundation', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nml_lang', 'en');
    window.localStorage.setItem('nml_tour_seen', 'true');
  });

  await page.goto('/#/audio-lab');

  await expect(
    page.getByRole('heading', { name: 'Inspect a local audio file' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No audio has been analyzed' }),
  ).toBeVisible();
  await expect(page.getByText('Not run')).toHaveCount(4);

  await expectNoHorizontalPageOverflow(page);
  await expectNoAutomatedAccessibilityViolations(page, testInfo);
});
