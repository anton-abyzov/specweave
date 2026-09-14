import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import config from '../../docusaurus.config';

describe('docusaurus.config.ts (AC-US7-03)', () => {
  const configContent = readFileSync(
    join(process.cwd(), 'docusaurus.config.ts'),
    'utf-8',
  );

  it('keeps structured data while leaving analytics injection to the production edge', () => {
    const tags = config.headTags ?? [];
    const scripts = tags.filter(tag => tag.tagName === 'script');
    expect(scripts.filter(tag => /cloudflareinsights\.com/.test(String(tag.attributes?.src ?? '')))).toHaveLength(0);
    const structuredData = scripts.filter(tag => tag.attributes?.type === 'application/ld+json');
    expect(structuredData.length).toBeGreaterThan(0);
    expect(structuredData.map(tag => JSON.parse(tag.innerHTML ?? '{}')['@type'])).toContain('Organization');
  });

  it('protects rendered documentation examples from Cloudflare email rewriting', () => {
    const factory = config.plugins?.find(plugin => typeof plugin === 'function' && plugin.name === 'preserveDocumentationExamples');
    expect(typeof factory).toBe('function');
    const plugin = (factory as () => { injectHtmlTags: () => { preBodyTags: string[]; postBodyTags: string[] } })();
    expect(plugin.injectHtmlTags()).toEqual({
      preBodyTags: ['<!--email_off-->'],
      postBodyTags: ['<!--/email_off-->'],
    });
  });

  it('sets onBrokenLinks to throw', () => {
    // Verify the config has onBrokenLinks set to 'throw' (not 'warn' or 'log')
    expect(configContent).toMatch(/onBrokenLinks:\s*['"]throw['"]/);
  });

  it('does not use warn for onBrokenLinks', () => {
    expect(configContent).not.toMatch(/onBrokenLinks:\s*['"]warn['"]/);
  });
});
