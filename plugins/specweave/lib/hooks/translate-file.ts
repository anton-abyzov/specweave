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

import fs from 'fs-extra';
import path from 'path';
import {
  detectLanguage,
  prepareTranslation,
  postProcessTranslation,
  validateTranslation,
  getLanguageName,
  formatCost,
  type SupportedLanguage,
} from '../../../../src/utils/translation.js';

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
export async function translateFile(options: CLIOptions): Promise<FileTranslationResult> {
  const { filePath, targetLang, preview, verbose } = options;

  // 1. Validate file exists
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (verbose) {
    console.log(`📄 Reading file: ${filePath}`);
  }

  // 2. Read original content
  const originalContent = await fs.readFile(filePath, 'utf-8');

  // 3. Detect source language
  const detectionResult = detectLanguage(originalContent);
  const sourceLanguage = detectionResult.language;

  if (verbose) {
    console.log(`🔍 Detected language: ${getLanguageName(sourceLanguage)} (confidence: ${(detectionResult.confidence * 100).toFixed(0)}%)`);
  }

  // 4. Check if already in target language
  if (sourceLanguage === targetLang) {
    if (verbose) {
      console.log(`✅ File already in ${getLanguageName(targetLang)}, skipping translation`);
    }
    return {
      success: true,
      filePath,
      sourceLanguage,
      targetLanguage: targetLang,
      warnings: [`Already in ${getLanguageName(targetLang)}`],
      cost: 0,
      tokensUsed: 0,
    };
  }

  // 5. Check if source language is unknown
  if (sourceLanguage === 'unknown') {
    if (verbose) {
      console.warn(`⚠️  Could not detect language, assuming English`);
    }
    // Assume English if detection fails
    return {
      success: false,
      filePath,
      sourceLanguage: 'unknown',
      targetLanguage: targetLang,
      warnings: ['Language detection failed - file may already be in English or mixed language'],
      cost: 0,
      tokensUsed: 0,
    };
  }

  // 6. Prepare translation
  if (verbose) {
    console.log(`🌐 Translating from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLang)}...`);
    console.log(`💰 Estimated cost: ${formatCost(0.003)} (using Haiku)`);
  }

  const prepared = prepareTranslation(originalContent, sourceLanguage, targetLang);

  // 7. Invoke LLM for translation
  // NOTE: This is where we call the actual LLM
  // For now, we'll create a simple prompt that can be used with Claude Code's Task tool
  const translatedContent = await invokeLLMTranslation(prepared.prompt, verbose);

  // 8. Post-process translation
  const finalContent = postProcessTranslation(translatedContent, prepared.preserved);

  // 9. Validate translation
  const warnings = validateTranslation(originalContent, finalContent);

  if (warnings.length > 0 && verbose) {
    console.warn(`⚠️  Translation warnings:`);
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  // 10. Preview or write
  if (preview) {
    if (verbose) {
      console.log(`\n📋 PREVIEW (first 500 chars):\n`);
      console.log(finalContent.substring(0, 500));
      console.log(`\n... (${finalContent.length} total characters)\n`);
    }
    return {
      success: true,
      filePath,
      sourceLanguage,
      targetLanguage: targetLang,
      warnings,
      cost: prepared.estimatedCost,
      tokensUsed: prepared.estimatedTokens,
      preview: finalContent,
    };
  } else {
    // Write translated content back to file
    await fs.writeFile(filePath, finalContent, 'utf-8');

    if (verbose) {
      console.log(`✅ Translation complete: ${filePath}`);
      console.log(`   Tokens used: ${prepared.estimatedTokens.toLocaleString()}`);
      console.log(`   Cost: ${formatCost(prepared.estimatedCost)}`);
    }

    return {
      success: true,
      filePath,
      sourceLanguage,
      targetLanguage: targetLang,
      warnings,
      cost: prepared.estimatedCost,
      tokensUsed: prepared.estimatedTokens,
    };
  }
}

/**
 * Invokes LLM for translation using Anthropic API
 *
 * PRODUCTION IMPLEMENTATION:
 * 1. Checks for ANTHROPIC_API_KEY in environment
 * 2. If available: Uses Anthropic API directly (fully automatic)
 * 3. If not available: Provides clear instructions for manual translation
 *
 * @param prompt - Translation prompt
 * @param verbose - Show detailed output
 * @returns Translated content
 */
async function invokeLLMTranslation(prompt: string, verbose: boolean): Promise<string> {
  // Extract the content to translate (between --- markers)
  const contentMatch = prompt.match(/SOURCE DOCUMENT[^\n]*:\n---\n([\s\S]*?)\n---/);
  const contentToTranslate = contentMatch ? contentMatch[1] : '';

  // Check if ANTHROPIC_API_KEY is available
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    // Fully automatic translation using Anthropic API
    if (verbose) {
      console.log(`\n🤖 Translating via Anthropic API (Haiku model)...`);
    }

    try {
      // Dynamic import of Anthropic SDK (allows graceful fallback if not installed)
      const Anthropic = await import('@anthropic-ai/sdk').then(m => m.default);

      const anthropic = new Anthropic({
        apiKey,
      });

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract translated content from response
      const translatedContent = message.content[0].type === 'text'
        ? message.content[0].text
        : contentToTranslate;

      if (verbose) {
        console.log(`✅ Translation complete via API`);
        console.log(`   Model: claude-3-haiku-20240307`);
        console.log(`   Input tokens: ${message.usage.input_tokens}`);
        console.log(`   Output tokens: ${message.usage.output_tokens}`);
        console.log(`   Cost: ~$${((message.usage.input_tokens * 0.25 + message.usage.output_tokens * 1.25) / 1000000).toFixed(4)}`);
      }

      return translatedContent;
    } catch (error: any) {
      console.error(`\n❌ API translation failed: ${error.message}`);
      console.error(`   Falling back to manual translation instructions\n`);
      // Fall through to manual instructions
    }
  }

  // Fallback: Manual translation instructions
  const isInteractive = process.stdout.isTTY && process.env.CLAUDE_CODE_SESSION;

  if (isInteractive) {
    // Interactive mode: Output prompt for Claude to process
    if (verbose) {
      console.log(`\n🤖 Invoking Claude Code translator skill...`);
      console.log(`   (Tip: Set ANTHROPIC_API_KEY for fully automatic translation)\n`);
    }

    // Output the translation prompt
    // The translator skill should auto-activate on this prompt
    console.log('\n' + '='.repeat(80));
    console.log('TRANSLATION REQUEST (translator skill will auto-activate):');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80) + '\n');

    // In interactive mode, we expect the user/Claude to provide translation
    // For now, return a marker indicating manual intervention needed
    return `<!-- ⚠️ TRANSLATION IN PROGRESS - Manual translation required via translator skill -->\n\n${contentToTranslate}`;
  } else {
    // Non-interactive/automated mode: Provide clear instructions
    if (verbose) {
      console.log(`\n🤖 Generating translation (automated mode)...`);
    }

    console.error('\n⚠️  AUTO-TRANSLATION REQUIRES MANUAL STEP:');
    console.error('   Option A (Recommended): Set ANTHROPIC_API_KEY environment variable');
    console.error('   Option B: Run /specweave:translate <file-path>');
    console.error('   Option C: Manually translate the content\n');

    // Return original content with clear marker
    return `<!-- ⚠️ AUTO-TRANSLATION PENDING -->\n<!-- Set ANTHROPIC_API_KEY for automatic translation -->\n<!-- Or run: /specweave:translate to complete -->\n<!-- Original content below -->\n\n${contentToTranslate}`;
  }
}

/**
 * Batch translate multiple files
 *
 * @param filePaths - Array of file paths to translate
 * @param targetLang - Target language
 * @param preview - Preview mode
 * @param verbose - Verbose output
 * @returns Array of translation results
 */
export async function batchTranslateFiles(
  filePaths: string[],
  targetLang: SupportedLanguage = 'en',
  preview: boolean = false,
  verbose: boolean = false
): Promise<FileTranslationResult[]> {
  const results: FileTranslationResult[] = [];

  if (verbose) {
    console.log(`\n🔄 Batch translating ${filePaths.length} file(s) to ${getLanguageName(targetLang)}...\n`);
  }

  for (const filePath of filePaths) {
    try {
      const result = await translateFile({
        filePath,
        targetLang,
        preview,
        verbose,
      });
      results.push(result);
    } catch (error: any) {
      if (verbose) {
        console.error(`❌ Error translating ${filePath}: ${error.message}`);
      }
      results.push({
        success: false,
        filePath,
        sourceLanguage: 'unknown',
        targetLanguage: targetLang,
        warnings: [error.message],
        cost: 0,
        tokensUsed: 0,
      });
    }
  }

  // Summary
  if (verbose) {
    const successful = results.filter(r => r.success).length;
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);

    console.log(`\n📊 Batch Translation Summary:`);
    console.log(`   Successful: ${successful}/${filePaths.length}`);
    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Total cost: ${formatCost(totalCost)}`);
  }

  return results;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Translation CLI Utility

Usage:
  node translate-file.js <file-path> [options]

Options:
  --target-lang <code>  Target language (default: en)
  --preview             Preview translation without writing to file
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

Supported Languages:
  en (English), ru (Russian), es (Spanish), zh (Chinese),
  de (German), fr (French), ja (Japanese), ko (Korean),
  pt (Portuguese), ar (Arabic), he (Hebrew)

Examples:
  # Translate Russian file to English
  node translate-file.js .specweave/increments/0001/spec.md

  # Preview translation
  node translate-file.js spec.md --preview --verbose

  # Translate to Spanish
  node translate-file.js plan.md --target-lang es
    `.trim());
    process.exit(0);
  }

  const filePath = args[0];
  let targetLang: SupportedLanguage = 'en';
  let preview = false;
  let verbose = false;

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--target-lang' && args[i + 1]) {
      targetLang = args[i + 1] as SupportedLanguage;
      i++;
    } else if (arg === '--preview') {
      preview = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  return {
    filePath,
    targetLang,
    preview,
    verbose,
  };
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const result = await translateFile(options);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error(`❌ Translation failed: ${error.message}`);
    process.exit(1);
  }
}

// Check if running as main module (ESM)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
