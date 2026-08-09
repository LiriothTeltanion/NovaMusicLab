// The museum's quietest ink must still be readable.
//
// Every component was authored against a dark ground and reaches for Tailwind's
// grays directly - 224 uses of text-gray-500 and 23 of text-gray-600 across
// thirty files. Measured against the ground they actually sit on, those were
// 4.13:1 and 2.64:1, under the 4.5:1 WCAG AA floor for body text. That is the
// caption, hint and source-attribution layer of the whole app: the text a phone
// loses first in daylight.
//
// index.css remaps both, per theme, rather than rewriting thirty components.
// This locks the floor so a future palette edit cannot quietly drop below it
// again, and asserts the tiers stay in the order their names promise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8');
const CONTEXT = fs.readFileSync(path.join(ROOT, 'src', 'context', 'AppContext.tsx'), 'utf8');
const EXPEDITION_CSS = fs.readFileSync(
  path.join(ROOT, 'src', 'components', 'shell', 'ExpeditionConsole.css'),
  'utf8',
);

/** WCAG 2.1 AA, normal-size body text. */
const AA_BODY = 4.5;

const hexToRgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));

function relativeLuminance([red, green, blue]) {
  const channel = value => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** Composites `alpha` of `fg` over `bg`, the way color-mix with transparent does. */
const flatten = (fg, bg, alpha) => fg.map((channel, index) => channel * alpha + bg[index] * (1 - alpha));

function contrast(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function declaredThemes() {
  const start = CONTEXT.indexOf('export const THEMES');
  const end = CONTEXT.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('AppContext.tsx no longer exposes the theme registry.');

  const source = CONTEXT.slice(start, end);
  return Array.from(source.matchAll(/^\s{2}([a-z][a-z0-9]*):\s*\{([\s\S]*?)^\s{2}\},/gm), match => {
    const background = /\bbg:\s*'(#[0-9a-f]{6})'/i.exec(match[2])?.[1];
    const mode = /\bmode:\s*'(dark|light)'/.exec(match[2])?.[1];
    if (!background || !mode) throw new Error(`Theme ${match[1]} has no parseable bg or mode.`);
    return { name: match[1], background, mode };
  });
}

const THEMES = declaredThemes();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reads a declaration out of index.css so the test cannot drift from the
 * source. Anchored to the start of a line, because an unanchored `.text-gray-500`
 * also matches inside `[data-mode="light"] .text-gray-500` and would silently
 * assert the light rule while claiming to check the dark one.
 */
function declaredColor(selector, property) {
  const escapedSelector = escapeRegExp(selector);
  const escapedProperty = escapeRegExp(property);
  const block = new RegExp(
    `^${escapedSelector}\\s*\\{[^}]*?${escapedProperty}\\s*:\\s*([^;]+);`,
    'm',
  );
  const match = block.exec(CSS);
  if (!match) throw new Error(`index.css no longer declares ${property} for ${selector}.`);
  return match[1].trim();
}

describe('text contrast floor', () => {
  it('discovers every registered theme background', () => {
    const literalSelector = String.raw`[data-path="C:\Nova"]`;
    expect(new RegExp(`^${escapeRegExp(literalSelector)}$`).test(literalSelector)).toBe(true);
    expect(THEMES).toHaveLength(14);
    expect(THEMES.filter(theme => theme.mode === 'dark')).toHaveLength(7);
    expect(THEMES.filter(theme => theme.mode === 'light')).toHaveLength(7);
  });

  it('keeps every muted tier readable on every dark theme ground', () => {
    const fg = hexToRgb(declaredColor(':root', '--fg'));

    for (const theme of THEMES.filter(candidate => candidate.mode === 'dark')) {
      const bg = hexToRgb(theme.background);
      const tiers = [
        ['text-gray-300', hexToRgb('#d1d5db')],
        ['text-gray-400', hexToRgb('#9ca3af')],
        ['text-gray-500', flatten(fg, bg, 0.55)],
        ['text-gray-600', flatten(fg, bg, 0.55)],
      ];
      const ratios = tiers.map(([name, color]) => [name, contrast(color, bg)]);

      for (const [name, ratio] of ratios) {
        expect(ratio, `${name} on ${theme.name}`).toBeGreaterThanOrEqual(AA_BODY);
      }
      // Quieter names must not render louder than the tier above them.
      for (let index = 1; index < ratios.length; index += 1) {
        expect(ratios[index][1], `${theme.name}: ${ratios[index][0]} vs ${ratios[index - 1][0]}`)
          .toBeLessThanOrEqual(ratios[index - 1][1]);
      }
    }
  });

  it('keeps every muted tier readable on every light theme ground', () => {
    const colors = ['text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600'].map(name => {
      const declared = declaredColor(`[data-mode="light"] .${name}`, 'color');
      expect(declared, `${name} should be a literal hex in the light remap`).toMatch(/^#[0-9a-f]{6}$/i);
      return [name, hexToRgb(declared)];
    });

    for (const theme of THEMES.filter(candidate => candidate.mode === 'light')) {
      const bg = hexToRgb(theme.background);
      const ratios = colors.map(([name, color]) => [name, contrast(color, bg)]);
      for (const [name, ratio] of ratios) {
        expect(ratio, `${name} on ${theme.name}`).toBeGreaterThanOrEqual(AA_BODY);
      }
      for (let index = 1; index < ratios.length; index += 1) {
        expect(ratios[index][1], `${theme.name}: ${ratios[index][0]} vs ${ratios[index - 1][0]}`)
          .toBeLessThanOrEqual(ratios[index - 1][1]);
      }
    }
  });

  it('keeps the shared muted ink token readable across all themes', () => {
    const darkForeground = hexToRgb(declaredColor(':root', '--fg'));
    const lightForeground = hexToRgb(declaredColor('[data-mode="light"]', '--type-ink-muted'));

    for (const theme of THEMES) {
      const background = hexToRgb(theme.background);
      const foreground = theme.mode === 'dark'
        ? flatten(darkForeground, background, 0.67)
        : lightForeground;
      expect(contrast(foreground, background), `muted ink on ${theme.name}`)
        .toBeGreaterThanOrEqual(AA_BODY);
    }
  });

  it('keeps Expedition Console text at or above the shared AA floor', () => {
    const directMixes = Array.from(
      EXPEDITION_CSS.matchAll(/color:\s*color-mix\(in srgb,\s*var\(--fg\)\s*(\d+)%\s*,\s*transparent\)/g),
      match => Number(match[1]),
    );

    expect(directMixes.length).toBeGreaterThan(0);
    expect((EXPEDITION_CSS.match(/color:\s*var\(--type-ink-muted\)/g) ?? []).length)
      .toBeGreaterThanOrEqual(11);
    for (const percentage of directMixes) {
      expect(percentage, `Expedition Console uses ${percentage}% foreground ink`)
        .toBeGreaterThanOrEqual(67);
      for (const theme of THEMES) {
        const background = hexToRgb(theme.background);
        const baseForeground = hexToRgb(theme.mode === 'light' ? '#1e293b' : '#f3f4f6');
        const foreground = flatten(baseForeground, background, percentage / 100);
        expect(contrast(foreground, background), `${percentage}% console ink on ${theme.name}`)
          .toBeGreaterThanOrEqual(AA_BODY);
      }
    }
  });

  it('still points the two failing grays at the subtle ink token', () => {
    // If someone reverts the remap, the components go straight back to 4.13:1
    // and 2.64:1 with nothing on screen to show it.
    expect(declaredColor('.text-gray-500', 'color')).toBe('var(--type-ink-subtle)');
    expect(declaredColor('.text-gray-600', 'color')).toBe('var(--type-ink-subtle)');
    expect(CSS).toContain('--type-ink-subtle: color-mix(in srgb, var(--fg) 55%, transparent)');
  });
});
