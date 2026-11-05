import {describe, expect, it} from 'vitest';
import {createMatcher} from '@docusaurus/utils';
import {englishOnlySitemapPatterns, isEnglishOnlyPath} from '../englishOnlyPaths';

describe('English-only sections', () => {
  it('keeps translated landing pages and marks untranslated sections', () => {
    for (const path of ['/', '/code/', '/code/download/', '/pricing/', '/product/', '/integrations/', '/tutorials/']) {
      expect(isEnglishOnlyPath(path)).toBe(false);
    }
    for (const path of ['/docs/overview/introduction/', '/blog/', '/search/', '/privacy/', '/jev/', '/tutorials/join-a-mac/']) {
      expect(isEnglishOnlyPath(path)).toBe(true);
    }
  });

  it('drops untranslated copies from a translated sitemap only', () => {
    const ignored = createMatcher(englishOnlySitemapPatterns('ru'));
    expect(ignored('/ru/docs/overview/introduction/')).toBe(true);
    expect(ignored('/ru/tutorials/join-a-mac/')).toBe(true);
    expect(ignored('/ru/blog')).toBe(true);
    expect(ignored('/ru/tutorials/')).toBe(false);
    expect(ignored('/ru/code/')).toBe(false);
    expect(ignored('/docs/overview/introduction/')).toBe(false);
  });
});
