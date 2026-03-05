import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const animationsPath = path.resolve(__dirname, '../animations.css');
const animationsCSS = fs.readFileSync(animationsPath, 'utf-8');

const customPath = path.resolve(__dirname, '../custom.css');
const customCSS = fs.readFileSync(customPath, 'utf-8');

describe('animations.css', () => {
  it('defines all required keyframes', () => {
    const keyframes = [
      'sw-fade-up',
      'sw-fade-in',
      'sw-word-reveal',
      'sw-marquee',
      'sw-count-pulse',
      'sw-glow-pulse',
    ];
    for (const name of keyframes) {
      expect(animationsCSS).toContain(`@keyframes ${name}`);
    }
  });

  it('defines utility classes for animations', () => {
    expect(animationsCSS).toContain('.sw-animate-fade-up');
    expect(animationsCSS).toContain('.sw-animate-fade-in');
    expect(animationsCSS).toContain('.sw-animate-word');
    expect(animationsCSS).toContain('.sw-animate-marquee');
  });

  it('includes prefers-reduced-motion guard', () => {
    expect(animationsCSS).toContain('prefers-reduced-motion: reduce');
    expect(animationsCSS).toContain('animation: none');
  });
});

describe('custom.css import order', () => {
  it('imports tokens.css first', () => {
    const lines = customCSS.split('\n').filter((l) => l.trim().length > 0);
    const firstImportIndex = lines.findIndex((l) => l.includes("@import"));
    expect(lines[firstImportIndex]).toContain("tokens.css");
  });

  it('imports animations.css second', () => {
    const importLines = customCSS
      .split('\n')
      .filter((l) => l.includes('@import'));
    expect(importLines.length).toBeGreaterThanOrEqual(2);
    expect(importLines[0]).toContain('tokens.css');
    expect(importLines[1]).toContain('animations.css');
  });
});
