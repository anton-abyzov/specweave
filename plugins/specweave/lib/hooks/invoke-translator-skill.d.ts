/**
 * Translator Skill Invocation Utility
 *
 * Provides programmatic invocation of the translator skill for automated translation.
 * Used by hooks and CLI scripts to translate content without manual intervention.
 *
 * @see plugins/specweave/skills/translator/SKILL.md
 * @see plugins/specweave/commands/translate.md
 */
import { type SupportedLanguage } from '../../../../src/utils/translation.js';
/**
 * Translation result
 */
export interface TranslationResult {
    success: boolean;
    sourceLanguage: SupportedLanguage;
    targetLanguage: SupportedLanguage;
    originalContent: string;
    translatedContent?: string;
    error?: string;
}
/**
 * Invokes translator skill to translate content
 *
 * This function integrates with the translator skill by:
 * 1. Preparing translation prompt
 * 2. Writing prompt to a temp file
 * 3. Outputting instructions for Claude to process
 * 4. Returning the translated content
 *
 * In an automated context (hooks), this provides clear instructions.
 * In an interactive context, the translator skill can auto-activate.
 *
 * @param content - Content to translate
 * @param sourceLang - Source language
 * @param targetLang - Target language
 * @returns Translation result
 */
export declare function invokeTranslatorSkill(content: string, sourceLang: SupportedLanguage, targetLang?: SupportedLanguage): Promise<TranslationResult>;
/**
 * Translate a file using translator skill
 *
 * @param filePath - Path to file to translate
 * @param targetLang - Target language
 * @returns Translation result
 */
export declare function translateFile(filePath: string, targetLang?: SupportedLanguage): Promise<TranslationResult & {
    filePath: string;
}>;
/**
 * Batch translate multiple files
 *
 * @param filePaths - Array of file paths
 * @param targetLang - Target language
 * @returns Array of translation results
 */
export declare function batchTranslateFiles(filePaths: string[], targetLang?: SupportedLanguage): Promise<Array<TranslationResult & {
    filePath: string;
}>>;
//# sourceMappingURL=invoke-translator-skill.d.ts.map