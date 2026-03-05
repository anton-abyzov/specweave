import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const tokensPath = path.resolve(__dirname, '../tokens.css');
const tokensCSS = fs.readFileSync(tokensPath, 'utf-8');

function getUniqueProperties(css: string): string[] {
  const matches = css.match(/--[a-zA-Z][a-zA-Z0-9-]*(?=\s*:)/g);
  return [...new Set(matches || [])];
}

describe('tokens.css', () => {
  it('contains at least 350 unique CSS custom properties', () => {
    const props = getUniqueProperties(tokensCSS);
    expect(props.length).toBeGreaterThanOrEqual(350);
  });

  it('contains required token category sections', () => {
    const requiredSections = [
      'COLOR PALETTE',
      'TYPOGRAPHY',
      'SPACING',
      'SHADOWS',
      'MOTION TOKENS',
      'GRID TOKENS',
      'GRADIENTS',
      'Z-INDEX SCALE',
    ];
    for (const section of requiredSections) {
      expect(tokensCSS).toContain(section);
    }
  });

  it('includes fluid display typography tokens with clamp()', () => {
    expect(tokensCSS).toContain('--sw-font-size-display-1: clamp(');
    expect(tokensCSS).toContain('--sw-font-size-display-2: clamp(');
    expect(tokensCSS).toContain('--sw-font-size-h1: clamp(');
    expect(tokensCSS).toContain('--sw-font-size-h2: clamp(');
    expect(tokensCSS).toContain('--sw-font-size-h3: clamp(');
    expect(tokensCSS).toContain('--sw-font-size-h4: clamp(');
  });

  it('includes letter-spacing scale', () => {
    const spacings = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
    for (const s of spacings) {
      expect(tokensCSS).toContain(`--sw-letter-spacing-${s}:`);
    }
  });

  it('includes extended spacing tokens', () => {
    const extended = ['32', '40', '48', '64', '80', '96'];
    for (const s of extended) {
      expect(tokensCSS).toContain(`--sw-space-${s}:`);
    }
  });

  it('includes glass morphism shadow tokens', () => {
    expect(tokensCSS).toContain('--sw-shadow-glass-sm:');
    expect(tokensCSS).toContain('--sw-shadow-glass-md:');
    expect(tokensCSS).toContain('--sw-shadow-glass-lg:');
  });

  it('includes elevation shadow tokens', () => {
    for (let i = 1; i <= 5; i++) {
      expect(tokensCSS).toContain(`--sw-shadow-elevation-${i}:`);
    }
  });

  it('includes gradient definitions', () => {
    const grads = ['primary', 'hero', 'cta', 'dark', 'accent', 'text'];
    for (const g of grads) {
      expect(tokensCSS).toContain(`--sw-gradient-${g}:`);
    }
  });

  it('includes motion tokens', () => {
    expect(tokensCSS).toContain('--sw-duration-fast:');
    expect(tokensCSS).toContain('--sw-duration-base:');
    expect(tokensCSS).toContain('--sw-duration-slow:');
    expect(tokensCSS).toContain('--sw-easing-ease:');
    expect(tokensCSS).toContain('--sw-easing-ease-in:');
    expect(tokensCSS).toContain('--sw-easing-ease-out:');
    expect(tokensCSS).toContain('--sw-easing-spring:');
    expect(tokensCSS).toContain('--sw-stagger-base:');
    expect(tokensCSS).toContain('--sw-stagger-step:');
  });

  it('includes surface glass tokens', () => {
    expect(tokensCSS).toContain('--sw-surface-glass-bg:');
    expect(tokensCSS).toContain('--sw-surface-glass-border:');
    expect(tokensCSS).toContain('--sw-surface-glass-blur:');
  });

  it('includes z-index scale', () => {
    expect(tokensCSS).toContain('--sw-z-base:');
    expect(tokensCSS).toContain('--sw-z-dropdown:');
    expect(tokensCSS).toContain('--sw-z-sticky:');
    expect(tokensCSS).toContain('--sw-z-modal:');
    expect(tokensCSS).toContain('--sw-z-overlay:');
    expect(tokensCSS).toContain('--sw-z-max:');
  });

  it('includes grid tokens', () => {
    expect(tokensCSS).toContain('--sw-grid-columns:');
    expect(tokensCSS).toContain('--sw-grid-gutter:');
    expect(tokensCSS).toContain('--sw-grid-max-width:');
    expect(tokensCSS).toContain('--sw-grid-margin:');
  });

  it('includes secondary accent (emerald) tokens', () => {
    expect(tokensCSS).toContain('--sw-color-accent-50:');
    expect(tokensCSS).toContain('--sw-color-accent-500:');
    expect(tokensCSS).toContain('--sw-color-accent-900:');
  });

  it('includes text-on-dark and focus ring tokens', () => {
    expect(tokensCSS).toContain('--sw-text-on-dark:');
    expect(tokensCSS).toContain('--sw-border-focus-ring:');
  });

  it('has dark mode overrides block', () => {
    expect(tokensCSS).toContain("[data-theme='dark']");
  });

  it('all --ifm-* tokens reference --sw-* or are static values', () => {
    const ifmLines = tokensCSS.match(/--ifm-[^:]+:\s*[^;]+;/g) || [];
    for (const line of ifmLines) {
      const value = line.split(':')[1].trim().replace(';', '');
      const isSwRef = value.includes('var(--sw-');
      const isStatic = !value.includes('var(--ifm-');
      expect(isSwRef || isStatic).toBe(true);
    }
  });
});
