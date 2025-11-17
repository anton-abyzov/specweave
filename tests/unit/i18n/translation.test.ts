import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Translation Utilities
 *
 * Tests the core translation functions including language detection,
 * code block preservation, translation preparation, and validation.
 *
 * @see src/utils/translation.ts
 */

import {
  detectLanguage,
  detectSpecificLanguage,
  preserveCodeBlocks,
  restoreCodeBlocks,
  estimateTokens,
  estimateTranslationCost,
  generateTranslationPrompt,
  prepareTranslation,
  postProcessTranslation,
  validateTranslation,
  getLanguageName,
  formatCost,
  type SupportedLanguage,
  type PreservedContent,
} from '../../../src/utils/translation.js';

describe('Language Detection', () => {
  describe('detectLanguage()', () => {
    it('should detect English content', () => {
      const content = 'This is a test document in English';
      const result = detectLanguage(content);

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.nonAsciiRatio).toBeLessThan(0.05);
    });

    it('should detect Russian content (Cyrillic)', () => {
      const content = 'Это тестовый документ на русском языке';
      const result = detectLanguage(content);

      expect(result.language).toBe('ru');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.nonAsciiRatio).toBeGreaterThan(0.1);
    });

    it('should detect Chinese content (CJK)', () => {
      const content = '这是一个测试文档';
      const result = detectLanguage(content);

      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Spanish content', () => {
      const content = 'Este es un documento de prueba en español con ción y también';
      const result = detectLanguage(content);

      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect German content', () => {
      const content = 'Das ist ein Testdokument auf Deutsch mit ä ö ü';
      const result = detectLanguage(content);

      expect(result.language).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle empty string', () => {
      const result = detectLanguage('');
      expect(result.language).toBe('en'); // Default to English
    });

    it('should handle mixed English and code', () => {
      const content = 'This is text\n```js\nconst x = 1;\n```\nMore text';
      const result = detectLanguage(content);

      expect(result.language).toBe('en');
    });
  });

  describe('detectSpecificLanguage()', () => {
    it('should return "ru" for Cyrillic script', () => {
      expect(detectSpecificLanguage('Привет мир')).toBe('ru');
    });

    it('should return "zh" for Chinese characters', () => {
      expect(detectSpecificLanguage('你好世界')).toBe('zh');
    });

    it('should return "ja" for Japanese Hiragana/Katakana', () => {
      expect(detectSpecificLanguage('こんにちは')).toBe('ja');
      expect(detectSpecificLanguage('カタカナ')).toBe('ja');
    });

    it('should return "ko" for Korean Hangul', () => {
      expect(detectSpecificLanguage('안녕하세요')).toBe('ko');
    });

    it('should return "ar" for Arabic script', () => {
      expect(detectSpecificLanguage('مرحبا بك')).toBe('ar');
    });

    it('should return "he" for Hebrew script', () => {
      expect(detectSpecificLanguage('שלום')).toBe('he');
    });

    it('should return "es" for Spanish indicators', () => {
      expect(detectSpecificLanguage('documentación en español')).toBe('es');
    });

    it('should return "de" for German indicators', () => {
      expect(detectSpecificLanguage('Das ist Deutsch')).toBe('de');
    });

    it('should return "fr" for French indicators', () => {
      expect(detectSpecificLanguage('Voilà le français')).toBe('fr');
    });

    it('should return "pt" for Portuguese indicators', () => {
      // Portuguese has overlap with Spanish, need strong indicator
      expect(detectSpecificLanguage('documentação em português também não')).toBe('pt');
    });

    it('should return "unknown" for pure English', () => {
      expect(detectSpecificLanguage('This is English text')).toBe('unknown');
    });

    it('should return "unknown" for unrecognized content', () => {
      expect(detectSpecificLanguage('12345')).toBe('unknown');
    });
  });
});

describe('Code Block Preservation', () => {
  describe('preserveCodeBlocks()', () => {
    it('should preserve fenced code blocks', () => {
      const content = 'Text\n```js\nconst x = 1;\n```\nMore text';
      const result = preserveCodeBlocks(content);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]).toContain('const x = 1;');
      expect(result.preserved).toContain('__CODE_BLOCK_0__');
      expect(result.preserved).not.toContain('const x = 1;');
    });

    it('should preserve multiple code blocks', () => {
      const content = 'Text\n```js\ncode1\n```\nText\n```py\ncode2\n```';
      const result = preserveCodeBlocks(content);

      expect(result.blocks).toHaveLength(2);
      expect(result.preserved).toContain('__CODE_BLOCK_0__');
      expect(result.preserved).toContain('__CODE_BLOCK_1__');
    });

    it('should preserve inline code spans', () => {
      const content = 'Use `const` keyword here';
      const result = preserveCodeBlocks(content);

      expect(result.inlineCode).toHaveLength(1);
      expect(result.inlineCode[0]).toBe('`const`');
      expect(result.preserved).toContain('__INLINE_CODE_0__');
    });

    it('should preserve markdown links', () => {
      const content = 'See [documentation](https://example.com) for details';
      const result = preserveCodeBlocks(content);

      expect(result.links).toHaveLength(1);
      expect(result.links[0]).toBe('[documentation](https://example.com)');
      expect(result.preserved).toContain('__LINK_0__');
    });

    it('should preserve all three types simultaneously', () => {
      const content = `
Text with [link](url) and \`code\`
\`\`\`js
function test() {}
\`\`\`
More text
      `.trim();

      const result = preserveCodeBlocks(content);

      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
      expect(result.inlineCode.length).toBeGreaterThanOrEqual(1);
      expect(result.links.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle content with no code blocks', () => {
      const content = 'Just plain text';
      const result = preserveCodeBlocks(content);

      expect(result.blocks).toHaveLength(0);
      expect(result.inlineCode).toHaveLength(0);
      expect(result.links).toHaveLength(0);
      expect(result.preserved).toBe(content);
    });

    it('should handle nested markdown (code in links)', () => {
      const content = 'See [`function`](url) for API';
      const result = preserveCodeBlocks(content);

      // Should preserve inline code first, then links
      expect(result.inlineCode.length + result.links.length).toBeGreaterThan(0);
    });
  });

  describe('restoreCodeBlocks()', () => {
    it('should restore fenced code blocks', () => {
      const translated = 'Текст\n__CODE_BLOCK_0__\nБольше текста';
      const preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'> = {
        blocks: ['```js\nconst x = 1;\n```'],
        inlineCode: [],
        links: [],
      };

      const restored = restoreCodeBlocks(translated, preserved);

      expect(restored).toContain('```js\nconst x = 1;\n```');
      expect(restored).not.toContain('__CODE_BLOCK_0__');
    });

    it('should restore inline code', () => {
      const translated = 'Используйте __INLINE_CODE_0__ здесь';
      const preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'> = {
        blocks: [],
        inlineCode: ['`const`'],
        links: [],
      };

      const restored = restoreCodeBlocks(translated, preserved);

      expect(restored).toContain('`const`');
      expect(restored).not.toContain('__INLINE_CODE_0__');
    });

    it('should restore links', () => {
      const translated = 'Смотрите __LINK_0__ для деталей';
      const preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'> = {
        blocks: [],
        inlineCode: [],
        links: ['[документация](https://example.com)'],
      };

      const restored = restoreCodeBlocks(translated, preserved);

      expect(restored).toContain('[документация](https://example.com)');
      expect(restored).not.toContain('__LINK_0__');
    });

    it('should restore multiple blocks in correct order', () => {
      const translated = '__CODE_BLOCK_0__ and __CODE_BLOCK_1__';
      const preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'> = {
        blocks: ['```js\ncode1\n```', '```py\ncode2\n```'],
        inlineCode: [],
        links: [],
      };

      const restored = restoreCodeBlocks(translated, preserved);

      expect(restored).toContain('code1');
      expect(restored).toContain('code2');
      expect(restored.indexOf('code1')).toBeLessThan(restored.indexOf('code2'));
    });

    it('should handle restoration with no placeholders', () => {
      const translated = 'Simple text';
      const preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'> = {
        blocks: [],
        inlineCode: [],
        links: [],
      };

      const restored = restoreCodeBlocks(translated, preserved);

      expect(restored).toBe('Simple text');
    });
  });

  describe('Round-trip preservation', () => {
    it('should preserve and restore complex markdown correctly', () => {
      const original = `
# Heading

Text with [link](url) and \`code\`.

\`\`\`typescript
function test() {
  return "value";
}
\`\`\`

More text with \`inline\` code.
      `.trim();

      const preserved = preserveCodeBlocks(original);
      const restored = restoreCodeBlocks(preserved.preserved, preserved);

      // Restored should match original (placeholders replaced)
      expect(restored).toContain('function test()');
      expect(restored).toContain('[link](url)');
      expect(restored).toContain('`code`');
      expect(restored).toContain('`inline`');
    });
  });
});

describe('Token and Cost Estimation', () => {
  describe('estimateTokens()', () => {
    it('should estimate tokens for English text', () => {
      const text = 'This is a test';
      const tokens = estimateTokens(text, 'en');

      // ~4 chars per token for English
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThanOrEqual(Math.ceil(text.length / 3));
    });

    it('should estimate tokens for Russian text', () => {
      const text = 'Это тест';
      const tokens = estimateTokens(text, 'ru');

      // ~3 chars per token for non-English
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeGreaterThanOrEqual(Math.ceil(text.length / 4));
    });

    it('should handle empty text', () => {
      expect(estimateTokens('', 'en')).toBe(0);
    });

    it('should handle large text', () => {
      const largeText = 'word '.repeat(1000);
      const tokens = estimateTokens(largeText, 'en');

      expect(tokens).toBeGreaterThan(1000);
    });
  });

  describe('estimateTranslationCost()', () => {
    it('should estimate cost for typical translation', () => {
      const inputTokens = 2000;
      const outputTokens = 2000;
      const cost = estimateTranslationCost(inputTokens, outputTokens);

      // Haiku: $0.25 per 1M input, $1.25 per 1M output
      // 2K tokens = 0.002M
      // Input: 0.002 * 0.25 = $0.0005
      // Output: 0.002 * 1.25 = $0.0025
      // Total: $0.0030
      expect(cost).toBeCloseTo(0.003, 4);
    });

    it('should default output tokens to input tokens', () => {
      const tokens = 1000;
      const costWithOutput = estimateTranslationCost(tokens, tokens);
      const costWithoutOutput = estimateTranslationCost(tokens);

      expect(costWithOutput).toBe(costWithoutOutput);
    });

    it('should handle zero tokens', () => {
      expect(estimateTranslationCost(0, 0)).toBe(0);
    });

    it('should scale linearly', () => {
      const cost1k = estimateTranslationCost(1000);
      const cost2k = estimateTranslationCost(2000);

      expect(cost2k).toBeCloseTo(cost1k * 2, 5);
    });
  });
});

describe('Translation Prompt Generation', () => {
  describe('generateTranslationPrompt()', () => {
    it('should generate prompt for Russian to English', () => {
      const content = 'Тестовый документ';
      const prompt = generateTranslationPrompt(content, 'ru', 'en');

      expect(prompt).toContain('Russian document to English');
      expect(prompt).toContain('PRESERVATION RULES');
      expect(prompt).toContain('Markdown Formatting');
      expect(prompt).toContain('Code Blocks');
      expect(prompt).toContain('Technical Terms');
      expect(prompt).toContain('Framework Terms');
      expect(prompt).toContain(content);
    });

    it('should generate prompt for Spanish to English', () => {
      const content = 'Documento de prueba';
      const prompt = generateTranslationPrompt(content, 'es', 'en');

      expect(prompt).toContain('Spanish document to English');
      expect(prompt).toContain('PRESERVATION RULES');
    });

    it('should generate prompt for Chinese to English', () => {
      const content = '测试文档';
      const prompt = generateTranslationPrompt(content, 'zh', 'en');

      expect(prompt).toContain('Chinese document to English');
    });

    it('should mention all preservation rules', () => {
      const prompt = generateTranslationPrompt('test', 'ru', 'en');

      const preservationRules = [
        'Markdown Formatting',
        'YAML Frontmatter',
        'Code Blocks',
        'Inline Code',
        'Technical Terms',
        'Framework Terms',
        'Document Structure',
        'Links',
        'Formatting',
        'Placeholders',
        'IDs and References',
      ];

      preservationRules.forEach(rule => {
        expect(prompt).toContain(rule);
      });
    });

    it('should include translation style guidelines', () => {
      const prompt = generateTranslationPrompt('test', 'ru', 'en');

      expect(prompt).toContain('TRANSLATION STYLE');
      expect(prompt).toContain('Professional technical');
      expect(prompt).toContain('Clear, concise, unambiguous');
    });

    it('should properly format source and target sections', () => {
      const content = 'Тестовый документ';
      const prompt = generateTranslationPrompt(content, 'ru', 'en');

      expect(prompt).toMatch(/SOURCE DOCUMENT.*:\s*---\s*Тестовый документ\s*---/s);
      expect(prompt).toContain('TRANSLATED ENGLISH VERSION');
    });
  });
});

describe('Translation Preparation', () => {
  describe('prepareTranslation()', () => {
    it('should prepare translation with all components', () => {
      const content = 'Текст\n```js\ncode\n```\nБольше текста';
      const result = prepareTranslation(content, 'ru', 'en');

      expect(result.prompt).toBeDefined();
      expect(result.preserved).toBeDefined();
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it('should preserve code blocks in preparation', () => {
      const content = 'Text ```js\nconst x = 1;\n``` more';
      const result = prepareTranslation(content, 'ru', 'en');

      expect(result.preserved.blocks.length).toBeGreaterThan(0);
      expect(result.prompt).not.toContain('const x = 1;');
      expect(result.prompt).toContain('__CODE_BLOCK_');
    });

    it('should estimate reasonable cost', () => {
      const content = 'Simple test document';
      const result = prepareTranslation(content, 'ru', 'en');

      // Should be very cheap for small documents
      expect(result.estimatedCost).toBeLessThan(0.01);
    });

    it('should scale cost with content size', () => {
      const small = prepareTranslation('Test', 'ru', 'en');
      const large = prepareTranslation('Test '.repeat(1000), 'ru', 'en');

      // Should scale significantly (at least 10x) with 1000x content
      expect(large.estimatedCost).toBeGreaterThan(small.estimatedCost * 10);
    });
  });
});

describe('Post-Processing', () => {
  describe('postProcessTranslation()', () => {
    it('should restore code blocks', () => {
      const translated = 'Text\n__CODE_BLOCK_0__\nMore';
      const preserved: PreservedContent = {
        preserved: '',
        blocks: ['```js\ncode\n```'],
        inlineCode: [],
        links: [],
      };

      const result = postProcessTranslation(translated, preserved);

      expect(result).toContain('```js\ncode\n```');
      expect(result).not.toContain('__CODE_BLOCK_0__');
    });

    it('should clean up extra whitespace', () => {
      const translated = 'Line1\n\n\n\n\nLine2';
      const preserved: PreservedContent = {
        preserved: '',
        blocks: [],
        inlineCode: [],
        links: [],
      };

      const result = postProcessTranslation(translated, preserved);

      // Should reduce 5 newlines to max 3
      expect(result).not.toMatch(/\n{4,}/);
    });

    it('should remove trailing spaces', () => {
      const translated = 'Line1   \nLine2  ';
      const preserved: PreservedContent = {
        preserved: '',
        blocks: [],
        inlineCode: [],
        links: [],
      };

      const result = postProcessTranslation(translated, preserved);

      expect(result).not.toMatch(/[ \t]+$/m);
    });

    it('should ensure file ends with single newline', () => {
      const translated = 'Content';
      const preserved: PreservedContent = {
        preserved: '',
        blocks: [],
        inlineCode: [],
        links: [],
      };

      const result = postProcessTranslation(translated, preserved);

      expect(result).toMatch(/\n$/);
      expect(result).not.toMatch(/\n\n$/);
    });
  });
});

describe('Translation Validation', () => {
  describe('validateTranslation()', () => {
    it('should return no warnings for matching structure', () => {
      const original = '# Heading\n\n```js\ncode\n```\n\n[Link](url)';
      const translated = '# Заголовок\n\n```js\ncode\n```\n\n[Ссылка](url)';

      const warnings = validateTranslation(original, translated);

      expect(warnings).toHaveLength(0);
    });

    it('should warn about heading count mismatch', () => {
      const original = '# H1\n## H2';
      const translated = '# H1'; // Missing H2

      const warnings = validateTranslation(original, translated);

      expect(warnings.some(w => w.includes('Heading count'))).toBe(true);
    });

    it('should warn about code block count mismatch', () => {
      const original = '```js\ncode1\n```\n```py\ncode2\n```';
      const translated = '```js\ncode1\n```'; // Missing second block

      const warnings = validateTranslation(original, translated);

      expect(warnings.some(w => w.includes('Code block count'))).toBe(true);
    });

    it('should warn about link count mismatch', () => {
      const original = '[Link1](url1)\n[Link2](url2)';
      const translated = '[Ссылка1](url1)'; // Missing second link

      const warnings = validateTranslation(original, translated);

      expect(warnings.some(w => w.includes('Link count'))).toBe(true);
    });

    it('should warn about missing YAML frontmatter', () => {
      const original = '---\ntitle: Test\n---\n\nContent';
      const translated = 'Content'; // Missing YAML

      const warnings = validateTranslation(original, translated);

      expect(warnings.some(w => w.includes('YAML frontmatter missing'))).toBe(true);
    });

    it('should handle documents without YAML', () => {
      const original = 'Simple document';
      const translated = 'Простой документ';

      const warnings = validateTranslation(original, translated);

      expect(warnings).toHaveLength(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('getLanguageName()', () => {
    it('should return correct names for all supported languages', () => {
      expect(getLanguageName('en')).toBe('English');
      expect(getLanguageName('ru')).toBe('Russian');
      expect(getLanguageName('es')).toBe('Spanish');
      expect(getLanguageName('zh')).toBe('Chinese');
      expect(getLanguageName('de')).toBe('German');
      expect(getLanguageName('fr')).toBe('French');
      expect(getLanguageName('ja')).toBe('Japanese');
      expect(getLanguageName('ko')).toBe('Korean');
      expect(getLanguageName('pt')).toBe('Portuguese');
      expect(getLanguageName('ar')).toBe('Arabic');
      expect(getLanguageName('he')).toBe('Hebrew');
    });

    it('should return code for unknown language', () => {
      expect(getLanguageName('unknown')).toBe('Unknown');
    });
  });

  describe('formatCost()', () => {
    it('should format costs less than $0.001', () => {
      expect(formatCost(0.0001)).toBe('<$0.001');
      expect(formatCost(0.0009)).toBe('<$0.001');
    });

    it('should format costs greater than $0.001', () => {
      expect(formatCost(0.0025)).toBe('$0.0025');
      expect(formatCost(0.01)).toBe('$0.0100');
      expect(formatCost(1.5)).toBe('$1.5000');
    });

    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('<$0.001');
    });

    it('should format large costs', () => {
      expect(formatCost(100.5)).toBe('$100.5000');
    });
  });
});

describe('Integration: Full Translation Flow', () => {
  it('should handle complete translation workflow', () => {
    // 1. Original content with code, links, and formatting
    const original = `
# Спецификация

Это тестовый документ с [ссылкой](https://example.com) и \`кодом\`.

\`\`\`typescript
function test() {
  return "value";
}
\`\`\`

## Требования

- Требование 1
- Требование 2
    `.trim();

    // 2. Detect language
    const detection = detectLanguage(original);
    expect(detection.language).toBe('ru');

    // 3. Prepare translation
    const prepared = prepareTranslation(original, 'ru', 'en');

    expect(prepared.prompt).toBeDefined();
    expect(prepared.preserved.blocks).toHaveLength(1);
    expect(prepared.preserved.links).toHaveLength(1);
    expect(prepared.preserved.inlineCode).toHaveLength(1);

    // 4. Simulate translation (in real usage, LLM would do this)
    const mockTranslated = prepared.preserved.preserved
      .replace('Спецификация', 'Specification')
      .replace('Это тестовый документ', 'This is a test document')
      .replace('Требования', 'Requirements')
      .replace('Требование', 'Requirement');

    // 5. Post-process
    const final = postProcessTranslation(mockTranslated, prepared.preserved);

    // 6. Validate
    const warnings = validateTranslation(original, final);
    expect(warnings).toHaveLength(0);

    // 7. Verify structure preserved
    expect(final).toContain('function test()');
    expect(final).toContain('https://example.com'); // Link URL preserved
    expect(final).toMatch(/\[.+\]\(https:\/\/example\.com\)/); // Link structure preserved
    expect(final).toContain('`кодом`'); // Inline code preserved
    expect(final).toMatch(/^# /m); // Heading structure
  });
});
