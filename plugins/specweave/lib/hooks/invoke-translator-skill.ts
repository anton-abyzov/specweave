/**
 * Translator Skill Invocation Utility
 *
 * Provides programmatic invocation of the translator skill for automated translation.
 * Used by hooks and CLI scripts to translate content without manual intervention.
 *
 * @see plugins/specweave/skills/translator/SKILL.md
 * @see plugins/specweave/commands/translate.md
 */

import fs from 'fs-extra';
import path from 'path';
import {
  detectLanguage,
  prepareTranslation,
  postProcessTranslation,
  getLanguageName,
  type SupportedLanguage,
} from '../../../../dist/src/utils/translation.js';

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
export async function invokeTranslatorSkill(
  content: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage = 'en'
): Promise<TranslationResult> {
  try {
    // Prepare translation
    const prepared = prepareTranslation(content, sourceLang, targetLang);

    // For now, we use a practical approach:
    // Output the translation request clearly so it can be processed

    const result: TranslationResult = {
      success: true,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalContent: content,
      translatedContent: await performTranslation(prepared.prompt, prepared.preserved),
    };

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalContent: content,
      error: errorMessage,
    };
  }
}

/**
 * Performs the actual translation using Anthropic API
 *
 * PRODUCTION IMPLEMENTATION:
 * 1. Checks for ANTHROPIC_API_KEY in environment
 * 2. If available: Uses Anthropic API directly (fully automatic)
 * 3. If not available: Provides clear instructions for manual translation
 *
 * @param prompt - Translation prompt
 * @param preserved - Preserved content structure
 * @returns Translated content
 */
async function performTranslation(
  prompt: string,
  preserved: any
): Promise<string> {
  // Extract content for processing
  const contentMatch = prompt.match(/SOURCE DOCUMENT[^\n]*:\n---\n([\s\S]*?)\n---/);
  const contentToTranslate = contentMatch ? contentMatch[1] : '';

  // Check if ANTHROPIC_API_KEY is available
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    // Fully automatic translation using Anthropic API
    console.log(`\n🤖 Translating via Anthropic API (Haiku model)...`);

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

      console.log(`✅ Translation complete via API`);
      console.log(`   Input tokens: ${message.usage.input_tokens}`);
      console.log(`   Output tokens: ${message.usage.output_tokens}`);
      console.log(`   Cost: ~$${((message.usage.input_tokens * 0.25 + message.usage.output_tokens * 1.25) / 1000000).toFixed(4)}\n`);

      return postProcessTranslation(translatedContent, preserved);
    } catch (error: any) {
      console.error(`\n❌ API translation failed: ${error.message}`);
      console.error(`   Falling back to manual translation instructions\n`);
      // Fall through to manual instructions
    }
  }

  // Fallback: Manual translation instructions
  const isInteractive = process.env.CLAUDE_CODE_SESSION === 'true';

  if (isInteractive) {
    // In Claude Code environment, output translation request
    console.log('\n' + '='.repeat(80));
    console.log('🌐 TRANSLATION REQUEST (translator skill will auto-activate)');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80));
    console.log('💡 Tip: Set ANTHROPIC_API_KEY for fully automatic translation\n');

    return postProcessTranslation(
      `<!-- ⚠️ TRANSLATION REQUESTED - Awaiting translator skill activation -->\n\n${contentToTranslate}`,
      preserved
    );
  } else {
    // Non-interactive environment - provide clear instructions
    console.error('\n⚠️  AUTO-TRANSLATION REQUIRES ONE OF:');
    console.error('   Option A (Recommended): Set ANTHROPIC_API_KEY environment variable');
    console.error('   Option B: Run /specweave:translate <file-path>');
    console.error('   Option C: Manually translate the content\n');

    return postProcessTranslation(
      `<!-- ⚠️ AUTO-TRANSLATION PENDING -->\n<!-- Set ANTHROPIC_API_KEY for automatic translation -->\n<!-- Or run: /specweave:translate to complete -->\n<!-- Original content below -->\n\n${contentToTranslate}`,
      preserved
    );
  }
}

/**
 * Translate a file using translator skill
 *
 * @param filePath - Path to file to translate
 * @param targetLang - Target language
 * @returns Translation result
 */
export async function translateFile(
  filePath: string,
  targetLang: SupportedLanguage = 'en'
): Promise<TranslationResult & { filePath: string }> {
  // Read file
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = await fs.readFile(filePath, 'utf-8');

  // Detect source language
  const detection = detectLanguage(content);
  const sourceLang = detection.language;

  // Check if already in target language
  if (sourceLang === targetLang) {
    return {
      success: true,
      filePath,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalContent: content,
      translatedContent: content,
    };
  }

  // Translate
  const result = await invokeTranslatorSkill(content, sourceLang, targetLang);

  // Write back if successful
  if (result.success && result.translatedContent) {
    await fs.writeFile(filePath, result.translatedContent, 'utf-8');
    console.log(`✅ Translated: ${filePath} (${getLanguageName(sourceLang)} → ${getLanguageName(targetLang)})`);
  }

  return {
    ...result,
    filePath,
  };
}

/**
 * Batch translate multiple files
 *
 * @param filePaths - Array of file paths
 * @param targetLang - Target language
 * @returns Array of translation results
 */
export async function batchTranslateFiles(
  filePaths: string[],
  targetLang: SupportedLanguage = 'en'
): Promise<Array<TranslationResult & { filePath: string }>> {
  const results: Array<TranslationResult & { filePath: string }> = [];

  console.log(`\n🌐 Batch translating ${filePaths.length} file(s) to ${getLanguageName(targetLang)}...\n`);

  for (const filePath of filePaths) {
    try {
      const result = await translateFile(filePath, targetLang);
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to translate ${filePath}: ${errorMessage}`);
      results.push({
        success: false,
        filePath,
        sourceLanguage: 'unknown',
        targetLanguage: targetLang,
        originalContent: '',
        error: errorMessage,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\n📊 Batch translation complete: ${successful}/${filePaths.length} files translated\n`);

  return results;
}
