/**
 * Translation configuration prompts
 *
 * CRITICAL: User MUST be asked before enabling translation
 * Translation can ~2x token usage (significant cost impact)
 *
 * @module cli/helpers/init/translation-config
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Translation scope - what gets auto-translated
 */
export interface TranslationScope {
  /** Auto-translate spec.md, plan.md, tasks.md after creation */
  incrementSpecs: boolean;
  /** Auto-translate living docs on update */
  livingDocs: boolean;
  /** Auto-translate GitHub/JIRA/ADO issues on sync */
  externalSync: boolean;
}

/**
 * Result of translation configuration prompts
 */
export interface TranslationConfigResult {
  language: SupportedLanguage;
  translationEnabled: boolean;
  translationScope: TranslationScope;
  keepEnglishOriginals: boolean;
}

/**
 * Get human-readable language name
 */
function getLanguageName(code: SupportedLanguage): string {
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
  };
  return names[code] || code;
}

/**
 * Prompt user for language and translation configuration
 *
 * CRITICAL: Shows cost warning before enabling translation
 * User must explicitly opt-in to translation (default: disabled)
 *
 * @returns Translation configuration result
 */
export async function promptTranslationConfig(): Promise<TranslationConfigResult> {
  console.log('');
  console.log(chalk.cyan.bold('🌐 Language & Translation Configuration'));
  console.log(chalk.gray('   Configure your documentation language'));
  console.log('');

  // STEP 1: Language Selection
  const language = await select<SupportedLanguage>({
    message: 'What is your preferred language for documentation?',
    choices: [
      { name: '🇬🇧 English (default, no translation overhead)', value: 'en' as SupportedLanguage },
      { name: '🇷🇺 Русский (Russian)', value: 'ru' as SupportedLanguage },
      { name: '🇪🇸 Español (Spanish)', value: 'es' as SupportedLanguage },
      { name: '🇨🇳 中文 (Chinese)', value: 'zh' as SupportedLanguage },
      { name: '🇩🇪 Deutsch (German)', value: 'de' as SupportedLanguage },
      { name: '🇫🇷 Français (French)', value: 'fr' as SupportedLanguage },
      { name: '🇯🇵 日本語 (Japanese)', value: 'ja' as SupportedLanguage },
      { name: '🇰🇷 한국어 (Korean)', value: 'ko' as SupportedLanguage },
      { name: '🇧🇷 Português (Portuguese)', value: 'pt' as SupportedLanguage },
    ],
    default: 'en'
  });

  // If English selected, no translation needed
  if (language === 'en') {
    console.log('');
    console.log(chalk.green('   ✔ Language: English (no translation overhead)'));
    console.log('');
    return {
      language: 'en',
      translationEnabled: false,
      translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
      keepEnglishOriginals: false,
    };
  }

  // STEP 2: Cost Warning (CRITICAL!)
  console.log('');
  console.log(chalk.yellow.bold('⚠️  TRANSLATION COST NOTICE'));
  console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.white('   Enabling translation will approximately DOUBLE token usage:'));
  console.log('');
  console.log(chalk.gray('   • Each spec.md translation: ~$0.003-0.005'));
  console.log(chalk.gray('   • Living docs update:       ~$0.002-0.004'));
  console.log(chalk.gray('   • GitHub/JIRA issue sync:   ~$0.001-0.002'));
  console.log('');
  console.log(chalk.gray('   Estimated monthly increase: $0.50-$2.00 (depends on activity)'));
  console.log(chalk.gray('   Translation uses Claude Haiku (cheapest model).'));
  console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // STEP 3: Enable Translation?
  const enableTranslation = await confirm({
    message: `Enable automatic translation to ${getLanguageName(language)}?`,
    default: false, // Default to NO (opt-in, not opt-out)
  });

  if (!enableTranslation) {
    console.log('');
    console.log(chalk.green(`   ✔ Language: ${getLanguageName(language)}`));
    console.log(chalk.gray('   ✔ Translation: Disabled (use /specweave:translate manually)'));
    console.log('');
    return {
      language,
      translationEnabled: false,
      translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
      keepEnglishOriginals: false,
    };
  }

  // STEP 4: Translation Scope
  const scope = await select<'all' | 'living-docs' | 'external' | 'custom'>({
    message: 'What should be auto-translated?',
    choices: [
      {
        name: 'Everything (specs + living docs + external tools)',
        value: 'all' as const,
      },
      {
        name: 'Living docs only (internal documentation)',
        value: 'living-docs' as const,
      },
      {
        name: 'External sync only (GitHub/JIRA/ADO issues)',
        value: 'external' as const,
      },
      {
        name: 'Let me choose individually',
        value: 'custom' as const,
      }
    ],
    default: 'living-docs'
  });

  let translationScope: TranslationScope = { livingDocs: false, externalSync: false, incrementSpecs: false };

  if (scope === 'all') {
    translationScope = { livingDocs: true, externalSync: true, incrementSpecs: true };
  } else if (scope === 'living-docs') {
    translationScope = { livingDocs: true, externalSync: false, incrementSpecs: true };
  } else if (scope === 'external') {
    translationScope = { livingDocs: false, externalSync: true, incrementSpecs: false };
  } else {
    // Custom selection
    translationScope.incrementSpecs = await confirm({
      message: 'Translate spec.md, plan.md, tasks.md after creation?',
      default: true,
    });
    translationScope.livingDocs = await confirm({
      message: 'Translate living docs on update?',
      default: true,
    });
    translationScope.externalSync = await confirm({
      message: 'Translate GitHub/JIRA/ADO issues on sync?',
      default: false,
    });
  }

  // STEP 5: Keep English Originals?
  const keepOriginals = await confirm({
    message: 'Keep English originals as .en.md files? (safer, uses more storage)',
    default: false,
  });

  // Summary
  console.log('');
  console.log(chalk.green(`   ✔ Language: ${getLanguageName(language)}`));
  console.log(chalk.green('   ✔ Translation: Enabled (auto)'));
  if (translationScope.incrementSpecs) console.log(chalk.green('   ✔ Scope: Increment specs'));
  if (translationScope.livingDocs) console.log(chalk.green('   ✔ Scope: Living docs'));
  if (translationScope.externalSync) console.log(chalk.green('   ✔ Scope: External tools'));
  if (keepOriginals) console.log(chalk.green('   ✔ English originals: Preserved'));
  console.log('');

  return {
    language,
    translationEnabled: true,
    translationScope,
    keepEnglishOriginals: keepOriginals,
  };
}

/**
 * Update config.json with translation configuration
 *
 * @param targetDir - Project directory
 * @param config - Translation configuration result
 */
export function updateConfigWithTranslation(
  targetDir: string,
  config: TranslationConfigResult
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('⚠️  config.json not found, cannot update translation configuration'));
    return;
  }

  const existingConfig = fs.readJsonSync(configPath);

  // Update language at root level
  existingConfig.language = config.language;

  // Update translation configuration
  existingConfig.translation = {
    enabled: config.translationEnabled,
    languages: config.translationEnabled ? ['en', config.language] : ['en'],
    primary: config.language,
    method: config.translationEnabled ? 'auto' : 'manual',
    preserveFrameworkTerms: true,
    scope: config.translationScope,
    keepEnglishOriginals: config.keepEnglishOriginals,
  };

  fs.writeJsonSync(configPath, existingConfig, { spaces: 2 });
}

/**
 * Get translation configuration for CI/non-interactive mode
 *
 * @param language - Language code from CLI options
 * @returns Default translation configuration (disabled)
 */
export function getDefaultTranslationConfig(language: SupportedLanguage = 'en'): TranslationConfigResult {
  return {
    language,
    translationEnabled: false,
    translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
    keepEnglishOriginals: false,
  };
}
