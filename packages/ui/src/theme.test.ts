import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./theme.css', import.meta.url)), 'utf8');

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`Token --color-${name} is not a hex colour`);
  return match[1];
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(token(foreground)), luminance(token(background))].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const SURFACES = ['milk', 'bone', 'linen'];
const TEXT = ['charcoal', 'cocoa', 'stone', 'moss', 'ochre', 'madder', 'slate'];

describe('contrast', () => {
  it.each(TEXT.flatMap((text) => SURFACES.map((surface) => [text, surface])))(
    '%s on %s is readable as text (4.5:1)',
    (text, surface) => {
      expect(contrast(text as string, surface as string)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['rail-ink', 'rail-muted', 'nude'])('%s is readable on the rail (4.5:1)', (text) => {
    expect(contrast(text, 'rail')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, 'rail-raised')).toBeGreaterThanOrEqual(4.5);
  });

  it('the accent is visible as a graphic on every surface (3:1)', () => {
    for (const surface of SURFACES) expect(contrast('nude-deep', surface)).toBeGreaterThanOrEqual(3);
  });

  it('nude and sand are never text colours on light surfaces', () => {
    expect(contrast('nude', 'milk')).toBeLessThan(4.5);
    expect(contrast('sand', 'milk')).toBeLessThan(4.5);
  });
});
