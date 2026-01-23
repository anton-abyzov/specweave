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
export type SupportedLanguage = 'en' | 'ru' | 'es' | 'zh' | 'de' | 'fr' | 'ja' | 'ko' | 'pt' | 'ar' | 'he' | 'unknown';
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
    preserved: string;
    blocks: string[];
    inlineCode: string[];
    links: string[];
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
export declare function detectLanguage(content: string): LanguageDetectionResult;
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
export declare function detectSpecificLanguage(content: string): SupportedLanguage;
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
export declare function preserveCodeBlocks(content: string): PreservedContent;
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
export declare function restoreCodeBlocks(translated: string, preserved: Pick<PreservedContent, 'blocks' | 'inlineCode' | 'links'>): string;
/**
 * Estimates the number of tokens in a text
 * Rule of thumb: ~4 characters per token for English, ~2-3 for other languages
 *
 * @param text - Text to estimate
 * @param language - Language code for estimation
 * @returns Estimated token count
 */
export declare function estimateTokens(text: string, language?: SupportedLanguage): number;
/**
 * Estimates translation cost using Claude Haiku pricing
 * Haiku pricing (as of 2025): $0.25 per 1M input tokens, $1.25 per 1M output tokens
 *
 * @param inputTokens - Input token count
 * @param outputTokens - Output token count (defaults to input for balanced estimate)
 * @returns Estimated cost in USD
 */
export declare function estimateTranslationCost(inputTokens: number, outputTokens?: number): number;
/**
 * Generates translation prompt for LLM
 *
 * @param content - Content to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code (default: 'en')
 * @returns Translation prompt for LLM
 */
export declare function generateTranslationPrompt(content: string, sourceLanguage: SupportedLanguage, targetLanguage?: SupportedLanguage): string;
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
export declare function prepareTranslation(content: string, sourceLanguage: SupportedLanguage, targetLanguage?: SupportedLanguage): {
    prompt: string;
    preserved: PreservedContent;
    estimatedTokens: number;
    estimatedCost: number;
};
/**
 * Post-processes translated content
 * Restores code blocks, validates markdown, cleans up extra whitespace
 *
 * @param translated - Translated text from LLM
 * @param preserved - Preserved content structure
 * @returns Cleaned and restored translated content
 */
export declare function postProcessTranslation(translated: string, preserved: PreservedContent): string;
/**
 * Validates that translated content preserves markdown structure
 * Returns warnings if structure doesn't match
 *
 * @param original - Original content
 * @param translated - Translated content
 * @returns Array of validation warnings (empty if valid)
 */
export declare function validateTranslation(original: string, translated: string): string[];
/**
 * Gets human-readable language name
 *
 * @param code - Language code
 * @returns Human-readable name
 */
export declare function getLanguageName(code: SupportedLanguage): string;
/**
 * Formats cost for display
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.0025" or "<$0.001")
 */
export declare function formatCost(cost: number): string;
//# sourceMappingURL=translation.d.ts.map