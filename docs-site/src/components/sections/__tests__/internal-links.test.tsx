import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import HeroSection from '../HeroSection';
import CTASection from '../CTASection';
import VerifiedSkillsSection from '../VerifiedSkillsSection';

const DOCS_ROOT = path.resolve(__dirname, '../../../../docs');

/**
 * Resolves a /docs/... URL to a file on disk.
 * Docusaurus maps:
 *   /docs/foo        → docs/foo.md OR docs/foo/index.md
 *   /docs/foo/bar    → docs/foo/bar.md OR docs/foo/bar/index.md
 */
function docPathExists(urlPath: string): boolean {
  const relative = urlPath.replace(/^\/docs\/?/, '');
  if (!relative) return false;

  const candidates = [
    path.join(DOCS_ROOT, `${relative}.md`),
    path.join(DOCS_ROOT, `${relative}.mdx`),
    path.join(DOCS_ROOT, relative, 'index.md'),
    path.join(DOCS_ROOT, relative, 'index.mdx'),
  ];

  return candidates.some((p) => fs.existsSync(p));
}

function extractInternalDocLinks(container: HTMLElement): string[] {
  const anchors = container.querySelectorAll('a[href^="/docs/"]');
  return Array.from(anchors).map((a) => a.getAttribute('href')!);
}

describe('Internal doc links resolve to existing pages', () => {
  it('HeroSection "Get Started" links to an existing doc', () => {
    const { container } = render(<HeroSection />);
    const links = extractInternalDocLinks(container);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(docPathExists(href), `Broken link: ${href}`).toBe(true);
    }
  });

  it('CTASection links resolve to existing docs', () => {
    const { container } = render(<CTASection />);
    const links = extractInternalDocLinks(container);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(docPathExists(href), `Broken link: ${href}`).toBe(true);
    }
  });

  it('VerifiedSkillsSection has no broken internal doc links', () => {
    const { container } = render(<VerifiedSkillsSection />);
    const links = extractInternalDocLinks(container);
    for (const href of links) {
      expect(docPathExists(href), `Broken link: ${href}`).toBe(true);
    }
  });
});
