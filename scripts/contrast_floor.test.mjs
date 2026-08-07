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

/**
 * Reads a declaration out of index.css so the test cannot drift from the
 * source. Anchored to the start of a line, because an unanchored `.text-gray-500`
 * also matches inside `[data-mode="light"] .text-gray-500` and would silently
 * assert the light rule while claiming to check the dark one.
 */
function declaredColor(selector, property) {
  const escaped = selector.replace(/[.[\]"=-]/g, '\\$&');
  const block = new RegExp(`^${escaped}\\s*\\{[^}]*?${property}\\s*:\\s*([^;]+);`, 'm');
  const match = block.exec(CSS);
  if (!match) throw new Error(`index.css no longer declares ${property} for ${selector}.`);
  return match[1].trim();
}

describe('text contrast floor', () => {
  it('keeps every muted tier readable on the dark ground', () => {
    // --fg and --bg as :root declares them; the grays are remapped to
    // --type-ink-subtle, which is --fg mixed down to 55%.
    const fg = hexToRgb('#f3f4f6');
    const bg = hexToRgb('#050816');

    const tiers = [
      ['text-gray-300', hexToRgb('#d1d5db')],
      ['text-gray-400', hexToRgb('#9ca3af')],
      ['text-gray-500', flatten(fg, bg, 0.55)],
      ['text-gray-600', flatten(fg, bg, 0.55)],
    ];

    const ratios = tiers.map(([name, color]) => [name, contrast(color, bg)]);
    for (const [name, ratio] of ratios) {
      expect(ratio, `${name} on the dark ground`).toBeGreaterThanOrEqual(AA_BODY);
    }
    // Quieter names must not render louder than the tier above them.
    for (let index = 1; index < ratios.length; index += 1) {
      expect(ratios[index][1], `${ratios[index][0]} vs ${ratios[index - 1][0]}`)
        .toBeLessThanOrEqual(ratios[index - 1][1]);
    }
  });

  it('keeps every muted tier readable on the light ground', () => {
    const bg = hexToRgb('#f7f8fb');
    const tiers = ['text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600'].map(name => {
      const declared = declaredColor(`[data-mode="light"] .${name}`, 'color');
      expect(declared, `${name} should be a literal hex in the light remap`).toMatch(/^#[0-9a-f]{6}$/i);
      return [name, contrast(hexToRgb(declared), bg)];
    });

    for (const [name, ratio] of tiers) {
      expect(ratio, `${name} on the light ground`).toBeGreaterThanOrEqual(AA_BODY);
    }
    for (let index = 1; index < tiers.length; index += 1) {
      expect(tiers[index][1], `${tiers[index][0]} vs ${tiers[index - 1][0]}`)
        .toBeLessThanOrEqual(tiers[index - 1][1]);
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
