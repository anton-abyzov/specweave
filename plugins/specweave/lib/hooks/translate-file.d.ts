/**
 * File Translation CLI Utility
 *
 * Translates a single file from detected source language to target language
 * using the translation utilities and LLM invocation.
 *
 * This script is called from:
 * - Post-increment-planning hook (auto-translate spec.md, plan.md, tasks.md)
 * - Post-task-completion hook (auto-translate living docs)
 * - Manual /specweave:translate command
 *
 * Usage:
 *   node translate-file.js <file-path> [--target-lang en] [--preview]
 *
 * @see src/utils/translation.ts
 * @see .specweave/increments/0006-llm-native-i18n/reports/DESIGN-POST-GENERATION-TRANSLATION.md
 */
import { type SupportedLanguage } from '../../../../src/utils/translation.js';
/**
 * CLI options
 */
interface CLIOptions {
    filePath: string;
    targetLang: SupportedLanguage;
    preview: boolean;
    verbose: boolean;
}
/**
 * Translation result
 */
interface FileTranslationResult {
    success: boolean;
    filePath: string;
    sourceLanguage: SupportedLanguage;
    targetLanguage: SupportedLanguage;
    warnings: string[];
    cost: number;
    tokensUsed: number;
    preview?: string;
}
/**
 * Main translation function
 *
 * @param options - CLI options
 * @returns Translation result
 */
export declare function translateFile(options: CLIOptions): Promise<FileTranslationResult>;
/**
 * Batch translate multiple files
 *
 * @param filePaths - Array of file paths to translate
 * @param targetLang - Target language
 * @param preview - Preview mode
 * @param verbose - Verbose output
 * @returns Array of translation results
 */
export declare function batchTranslateFiles(filePaths: string[], targetLang?: SupportedLanguage, preview?: boolean, verbose?: boolean): Promise<FileTranslationResult[]>;
export {};
//# sourceMappingURL=translate-file.d.ts.map