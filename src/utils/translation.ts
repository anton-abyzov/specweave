/**
 * Translation Utilities
 *
 * LLM-native translation system for SpecWeave multilingual support.
 * Provides zero-cost language detection and cost-efficient translation
 * using Claude Haiku via current LLM session.
 *
 * Strategy:
 * - Language Detection: Simple heuristic (no API calls, <1ms)
 * - Translation: Claude Haiku via current session (~$0.0025 per file)
 * - Preservation: Markdown, code blocks, technical terms stay intact
 *
 * @see .specweave/increments/0006-llm-native-i18n/reports/DESIGN-POST-GENERATION-TRANSLATION.md
 */

/**
 * Supported languages for translation
 */
export type SupportedLanguage =
  | 'en'  // English
  | 'ru'  // Russian
  | 'es'  // Spanish
  | 'zh'  // Chinese
  | 'de'  // German
  | 'fr'  // French
  | 'ja'  // Japanese
  | 'ko'  // Korean
  | 'pt'  // Portuguese
  | 'ar'  // Arabic
  | 'he'  // Hebrew
  | 'unknown';

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
  nonAsciiRatio: number;
  detectionMethod: 'heuristic' | 'explicit';
}

/**
 * Preserved content structure for code blocks
 */
export interface PreservedContent {
  preserved: string;       // Text with placeholders
  blocks: string[];        // Extracted code blocks
  inlineCode: string[];    // Extracted inline code spans
  links: string[];         // Extracted links
}

/**
 * Translation result with metadata
 */
export interface TranslationResult {
  translated: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  estimatedTokens: number;
  estimatedCost: number;
  preservedBlocks: number;
}

/**
 * Language detection patterns (Unicode ranges for major scripts)
 */
const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  ru: /[а-яА-ЯёЁ]/,           // Cyrillic (Russian)
  zh: /[\u4e00-\u9fff]/,      // Chinese characters (CJK Unified Ideographs)
  ja: /[\u3040-\u309f\u30a0-\u30ff]/, // Hiragana + Katakana (Japanese)
  ko: /[\uac00-\ud7af]/,      // Hangul (Korean)
  ar: /[\u0600-\u06ff]/,      // Arabic
  he: /[\u0590-\u05ff]/,      // Hebrew
  // Latin-based languages need context (Spanish, German, French, Portuguese)
  // We'll use heuristics for these
};

/**
 * Spanish-specific words/patterns
 */
const SPANISH_INDICATORS = [
  'ción', 'sión', 'qué', 'cuál', 'español', 'también', 'año', 'señor'
];

/**
 * German-specific words/patterns
 */
const GERMAN_INDICATORS = [
  'ß', 'ä', 'ö', 'ü', 'dass', 'ich', 'und', 'der', 'die', 'das'
];

/**
 * French-specific words/patterns
 */
const FRENCH_INDICATORS = [
  'ç', 'où', 'être', 'français', 'avec', 'dans', 'pour', 'qui', 'que'
];

/**
 * Portuguese-specific words/patterns
 */
const PORTUGUESE_INDICATORS = [
  'ção', 'português', 'também', 'não', 'com', 'para', 'seu', 'sua', 'documentação'
];

/**
 * Detects the language of the given content using simple heuristics
 *
 * @param content - The text content to analyze
 * @returns Language detection result with confidence score
 *
 * @example
 * ```typescript
 * const result = detectLanguage('Это тестовый документ');
 * console.log(result.language); // 'ru'
 * console.log(result.confidence); // 0.95
 * ```
 */
export function detectLanguage(content: string): LanguageDetectionResult {
  // Calculate non-ASCII ratio
  const nonAsciiChars = content.match(/[^\x00-\x7F]/g) || [];
  const totalChars = content.length;
  const nonAsciiRatio = totalChars > 0 ? nonAsciiChars.length / totalChars : 0;

  // If <5% non-ASCII, likely English
  if (nonAsciiRatio < 0.05) {
    return {
      language: 'en',
      confidence: 0.95,
      nonAsciiRatio,
      detectionMethod: 'heuristic'
    };
  }

  // Try to detect specific language
  const detected = detectSpecificLanguage(content);

  if (detected !== 'unknown') {
    return {
      language: detected,
      confidence: 0.90,
      nonAsciiRatio,
      detectionMethod: 'heuristic'
    };
  }

  // Fallback: unknown language
  return {
    language: 'unknown',
    confidence: 0.5,
    nonAsciiRatio,
    detectionMethod: 'heuristic'
  };
}

/**
 * Detects specific language from content
 *
 * @param content - The text content to analyze
 * @returns Detected language code or 'unknown'
 *
 * @example
 * ```typescript
 * detectSpecificLanguage('Это текст'); // 'ru'
 * detectSpecificLanguage('这是文本'); // 'zh'
 * ```
 */
export function detectSpecificLanguage(content: string): SupportedLanguage {
  // Test against Unicode ranges first (most reliable)
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(content)) {
      return lang as SupportedLanguage;
    }
  }

  // For Latin-based languages, use indicator words
  const lowerContent = content.toLowerCase();

  // Spanish
  if (SPANISH_INDICATORS.some(indicator => lowerContent.includes(indicator))) {
    return 'es';
  }

  // Portuguese (check before French due to overlap in 'ção' and 'em')
  if (PORTUGUESE_INDICATORS.some(indicator => lowerContent.includes(indicator))) {
    return 'pt';
  }

  // German
  if (GERMAN_INDICATORS.some(indicator => lowerContent.includes(indicator))) {
    return 'de';
  }

  // French
  if (FRENCH_INDICATORS.some(indicator => lowerContent.includes(indicator))) {
    return 'fr';
  }

  return 'unknown';
}

/**
 * Preserves code blocks, inline code, and links before translation
 *
 * @param content - Markdown content to preserve
 * @returns Preserved content with placeholders
 *
 * @example
 * ```typescript
 * const content = 'Text\n```js\ncode\n```\nMore text';
 * const preserved = preserveCodeBlocks(content);
 * // preserved.blocks = ['```js\ncode\n```']
 * // preserved.preserved = 'Text\n__CODE_BLOCK_0__\nMore text'
 * ```
 */
export function preserveCodeBlocks(content: string): PreservedContent {
  const blocks: string[] = [];
  const inlineCode: string[] = [];
  const links: string[] = [];

  // 1. Preserve fenced code blocks (```...```)
  let preserved = content.replace(/```[\s\S]*?```/g, (match) => {
    blocks.push(match);
    return `__CODE_BLOCK_${blocks.length - 1}__`;
  });

  // 2. Preserve inline code (`...`)
  preserved = preserved.replace(/`[^`]+`/g, (match) => {
    inlineCode.push(match);
    return `__INLINE_CODE_${inlineCode.length - 1}__`;
  });

  // 3. Preserve markdown links ([text](url))
  preserved = preserved.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    links.push(match);
    return `__LINK_${links.length - 1}__`;
  });

  return {
    preserved,
    blocks,
    inlineCode,
    links
  };
}

/**
 * Restores preserved code blocks, inline code, and links after translation
 *
 * @param translated - Translated text with placeholders
 * @param preserved - Preserved content structure
 * @returns Restored text with original code blocks and links
 *
 * @example
 * ```typescript
 * const translated = 'Текст\n__CODE_BLOCK_0__\nБольше текста';
 * const preserved = { blocks: ['```js\ncode\n```'], inlineCode: [], links: [] };
 * const restored = restoreCodeBlocks(translated, preserved);
 * // Result: 'Текст\n```js\ncode\n```\nБольше текста'
 * ```
 */
export function restoreCodeBlocks(
  translated: string,
  preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'>
): string {
  let restored = translated;

  // Restore in reverse order of preservation (links → inline code → blocks)

  // 1. Restore links
  preserved.links.forEach((link, i) => {
    restored = restored.replace(`__LINK_${i}__`, link);
  });

  // 2. Restore inline code
  preserved.inlineCode.forEach((code, i) => {
    restored = restored.replace(`__INLINE_CODE_${i}__`, code);
  });

  // 3. Restore code blocks
  preserved.blocks.forEach((block, i) => {
    restored = restored.replace(`__CODE_BLOCK_${i}__`, block);
  });

  return restored;
}

/**
 * Estimates the number of tokens in a text
 * Rule of thumb: ~4 characters per token for English, ~2-3 for other languages
 *
 * @param text - Text to estimate
 * @param language - Language code for estimation
 * @returns Estimated token count
 */
export function estimateTokens(text: string, language: SupportedLanguage = 'en'): number {
  const charsPerToken = language === 'en' ? 4 : 3;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Estimates translation cost using Claude Haiku pricing
 * Haiku pricing (as of 2025): $0.25 per 1M input tokens, $1.25 per 1M output tokens
 *
 * @param inputTokens - Input token count
 * @param outputTokens - Output token count (defaults to input for balanced estimate)
 * @returns Estimated cost in USD
 */
export function estimateTranslationCost(
  inputTokens: number,
  outputTokens?: number
): number {
  const HAIKU_INPUT_COST_PER_1M = 0.25;
  const HAIKU_OUTPUT_COST_PER_1M = 1.25;

  const actualOutputTokens = outputTokens || inputTokens; // Assume similar length

  const inputCost = (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M;
  const outputCost = (actualOutputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
}

/**
 * Generates translation prompt for LLM
 *
 * @param content - Content to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code (default: 'en')
 * @returns Translation prompt for LLM
 */
export function generateTranslationPrompt(
  content: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage = 'en'
): string {
  const languageNames: Record<SupportedLanguage, string> = {
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    zh: 'Chinese',
    de: 'German',
    fr: 'French',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ar: 'Arabic',
    he: 'Hebrew',
    unknown: 'Unknown'
  };

  const sourceName = languageNames[sourceLanguage] || sourceLanguage;
  const targetName = languageNames[targetLanguage] || targetLanguage;

  return `You are a technical translator specializing in software documentation.

Translate the following ${sourceName} document to ${targetName}.

PRESERVATION RULES (CRITICAL):
1. **Markdown Formatting**: Preserve ALL markdown syntax exactly (headers, lists, links, code blocks, tables)
2. **YAML Frontmatter**: Keep structure intact, translate values only
3. **Code Blocks**: NEVER translate code (keep as-is, including comments if in English)
4. **Inline Code**: NEVER translate \`code spans\` (keep as-is)
5. **Technical Terms**: Keep in English (Git, Docker, Kubernetes, TypeScript, React, etc.)
6. **Framework Terms**: Keep in English (Increment, Living Docs, SpecWeave, ADR, RFC, HLD, PRD)
7. **Document Structure**: Maintain exact heading hierarchy and nesting
8. **Links**: Preserve link structure, translate link text only if needed
9. **Formatting**: Preserve bold (**text**), italic (*text*), code spans (\`code\`)
10. **Placeholders**: Do NOT translate placeholders like __CODE_BLOCK_0__, __INLINE_CODE_1__, __LINK_2__
11. **IDs and References**: Keep task IDs (T-001), test IDs (TC-001), user story IDs (US-001) unchanged

TRANSLATION STYLE:
- Professional technical ${targetName}
- Clear, concise, unambiguous language
- Industry-standard terminology
- Consistent term usage throughout
- Natural phrasing (not word-for-word literal)

SOURCE DOCUMENT (${sourceName}):
---
${content}
---

TRANSLATED ${targetName.toUpperCase()} VERSION (preserve all formatting):`;
}

/**
 * Translates content to English using LLM (Claude Haiku)
 * This function generates the prompt but delegates actual LLM invocation
 * to the caller (via Task tool, skill, or direct API)
 *
 * @param content - Content to translate
 * @param sourceLanguage - Source language code
 * @returns Translation prompt and metadata (caller must invoke LLM)
 *
 * @example
 * ```typescript
 * const content = 'Это тестовый документ';
 * const result = prepareTranslation(content, 'ru');
 * // Caller then invokes LLM with result.prompt
 * ```
 */
export function prepareTranslation(
  content: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage = 'en'
): {
  prompt: string;
  preserved: PreservedContent;
  estimatedTokens: number;
  estimatedCost: number;
} {
  // 1. Preserve code blocks and links
  const preserved = preserveCodeBlocks(content);

  // 2. Generate translation prompt
  const prompt = generateTranslationPrompt(preserved.preserved, sourceLanguage, targetLanguage);

  // 3. Estimate cost
  const inputTokens = estimateTokens(prompt, sourceLanguage);
  const outputTokens = estimateTokens(preserved.preserved, targetLanguage);
  const estimatedCost = estimateTranslationCost(inputTokens, outputTokens);

  return {
    prompt,
    preserved,
    estimatedTokens: inputTokens + outputTokens,
    estimatedCost
  };
}

/**
 * Post-processes translated content
 * Restores code blocks, validates markdown, cleans up extra whitespace
 *
 * @param translated - Translated text from LLM
 * @param preserved - Preserved content structure
 * @returns Cleaned and restored translated content
 */
export function postProcessTranslation(
  translated: string,
  preserved: PreservedContent
): string {
  // 1. Restore preserved blocks
  let restored = restoreCodeBlocks(translated, preserved);

  // 2. Clean up extra whitespace (LLM sometimes adds extra newlines)
  restored = restored
    .replace(/\n{4,}/g, '\n\n\n')  // Max 3 consecutive newlines
    .replace(/[ \t]+$/gm, '');     // Remove trailing spaces

  // 3. Ensure file ends with single newline
  restored = restored.trim() + '\n';

  return restored;
}

/**
 * Validates that translated content preserves markdown structure
 * Returns warnings if structure doesn't match
 *
 * @param original - Original content
 * @param translated - Translated content
 * @returns Array of validation warnings (empty if valid)
 */
export function validateTranslation(
  original: string,
  translated: string
): string[] {
  const warnings: string[] = [];

  // 1. Check heading count matches
  const originalHeadings = (original.match(/^#{1,6}\s/gm) || []).length;
  const translatedHeadings = (translated.match(/^#{1,6}\s/gm) || []).length;

  if (originalHeadings !== translatedHeadings) {
    warnings.push(
      `Heading count mismatch: original has ${originalHeadings}, translated has ${translatedHeadings}`
    );
  }

  // 2. Check code block count matches
  const originalCodeBlocks = (original.match(/```/g) || []).length;
  const translatedCodeBlocks = (translated.match(/```/g) || []).length;

  if (originalCodeBlocks !== translatedCodeBlocks) {
    warnings.push(
      `Code block count mismatch: original has ${originalCodeBlocks}, translated has ${translatedCodeBlocks}`
    );
  }

  // 3. Check link count matches
  const originalLinks = (original.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
  const translatedLinks = (translated.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;

  if (originalLinks !== translatedLinks) {
    warnings.push(
      `Link count mismatch: original has ${originalLinks}, translated has ${translatedLinks}`
    );
  }

  // 4. Check YAML frontmatter present in both (if exists in original)
  const hasOriginalYAML = /^---\n[\s\S]*?\n---/m.test(original);
  const hasTranslatedYAML = /^---\n[\s\S]*?\n---/m.test(translated);

  if (hasOriginalYAML && !hasTranslatedYAML) {
    warnings.push('YAML frontmatter missing in translation');
  }

  return warnings;
}

/**
 * Gets human-readable language name
 *
 * @param code - Language code
 * @returns Human-readable name
 */
export function getLanguageName(code: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    zh: 'Chinese',
    de: 'German',
    fr: 'French',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ar: 'Arabic',
    he: 'Hebrew',
    unknown: 'Unknown'
  };

  return names[code] || code;
}

/**
 * Formats cost for display
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.0025" or "<$0.001")
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) {
    return '<$0.001';
  }
  return `$${cost.toFixed(4)}`;
}
