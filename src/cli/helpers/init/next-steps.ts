/**
 * Next steps display after init completion
 */

import chalk from 'chalk';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Inline translations for hardcoded strings not in locale files
 */
function getNextStepsStrings(language: SupportedLanguage) {
  const strings: Record<SupportedLanguage, {
    slashCommandsHint: string;
    pluginsReady: string;
  }> = {
    en: {
      slashCommandsHint: '↑ Required for slash commands like /specweave:increment',
      pluginsReady: 'All plugins ready',
    },
    ru: {
      slashCommandsHint: '↑ Необходимо для слеш-команд типа /specweave:increment',
      pluginsReady: 'Все плагины готовы',
    },
    es: {
      slashCommandsHint: '↑ Requerido para comandos como /specweave:increment',
      pluginsReady: 'Todos los plugins listos',
    },
    zh: {
      slashCommandsHint: '↑ 需要用于斜杠命令如 /specweave:increment',
      pluginsReady: '所有插件就绪',
    },
    de: {
      slashCommandsHint: '↑ Erforderlich für Slash-Befehle wie /specweave:increment',
      pluginsReady: 'Alle Plugins bereit',
    },
    fr: {
      slashCommandsHint: '↑ Requis pour les commandes slash comme /specweave:increment',
      pluginsReady: 'Tous les plugins prêts',
    },
    ja: {
      slashCommandsHint: '↑ /specweave:increment などのスラッシュコマンドに必要',
      pluginsReady: 'すべてのプラグイン準備完了',
    },
    ko: {
      slashCommandsHint: '↑ /specweave:increment 같은 슬래시 명령에 필요',
      pluginsReady: '모든 플러그인 준비 완료',
    },
    pt: {
      slashCommandsHint: '↑ Necessário para comandos slash como /specweave:increment',
      pluginsReady: 'Todos os plugins prontos',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Show next steps after initialization
 *
 * @param projectName - Project name
 * @param adapterName - Adapter name (claude, cursor, generic)
 * @param language - Language for i18n
 * @param usedDotNotation - Whether user used "." for current directory
 * @param pluginAutoInstalled - Whether plugins were auto-installed (Claude only)
 */
export function showNextSteps(
  projectName: string,
  adapterName: string,
  language: SupportedLanguage,
  usedDotNotation: boolean = false,
  pluginAutoInstalled: boolean = false
): void {
  const locale = getLocaleManager(language);
  const strings = getNextStepsStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(locale.t('cli', 'init.nextSteps.header')));
  console.log('');

  let stepNumber = 1;

  // Only show "cd" step if we created a subdirectory
  if (!usedDotNotation) {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cd', { projectName }))}`);
    console.log('');
    stepNumber++;
  }

  // Adapter-specific instructions
  if (adapterName === 'claude') {
    // Only show manual install warning if auto-install failed
    if (!pluginAutoInstalled) {
      console.log(`   ${stepNumber}. ${chalk.yellow.bold('⚠️  ' + locale.t('cli', 'init.nextSteps.claude.step2'))}`);
      console.log(`      ${chalk.cyan.bold(locale.t('cli', 'init.nextSteps.claude.installCore'))}`);
      console.log(`      ${chalk.gray(strings.slashCommandsHint)}`);
      console.log('');
      stepNumber++;
    } else {
      // Consolidated single-line plugin status
      console.log(`   ${stepNumber}. ${chalk.green('✔')} ${chalk.white(strings.pluginsReady)}`);
      console.log('');
      stepNumber++;
    }

    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step4'))}`);
    console.log(`      ${chalk.cyan(locale.t('cli', 'init.nextSteps.claude.example'))}`);
  } else if (adapterName === 'cursor') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.cursor.guide')}`);
    console.log('');
    console.log(`   ${stepNumber + 2}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step3'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.cursor.shortcuts')}`);
  } else if (adapterName === 'generic') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.generic.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.generic.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.generic.compatibility')}`);
  }

  console.log('');
  console.log(chalk.green.bold(locale.t('cli', 'init.nextSteps.footer')));
  console.log('');
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.docsLink')));
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.githubLink')));
  console.log('');
}
