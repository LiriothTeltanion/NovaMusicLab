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

test('the museum map stays below the header while room utilities scroll away', async ({
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
      consoleBottom: consoleRect.bottom,
    };
  });

  expect(Math.abs(positions.headerTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(positions.dockTop - positions.headerBottom)).toBeLessThanOrEqual(4);
  expect(positions.consoleBottom).toBeLessThan(positions.dockBottom);
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
