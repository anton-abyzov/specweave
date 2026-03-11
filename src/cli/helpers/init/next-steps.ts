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
    marketplaceReady: string;
  }> = {
    en: {
      slashCommandsHint: '↑ Required for slash commands like /sw:increment',
      pluginsReady: 'All plugins ready',
      marketplaceReady: 'Marketplace registered (install plugins via /plugin)',
    },
    ru: {
      slashCommandsHint: '↑ Необходимо для слеш-команд типа /sw:increment',
      pluginsReady: 'Все плагины готовы',
      marketplaceReady: 'Маркетплейс зарегистрирован (установите плагины через /plugin)',
    },
    es: {
      slashCommandsHint: '↑ Requerido para comandos como /sw:increment',
      pluginsReady: 'Todos los plugins listos',
      marketplaceReady: 'Marketplace registrado (instalar plugins via /plugin)',
    },
    zh: {
      slashCommandsHint: '↑ 需要用于斜杠命令如 /sw:increment',
      pluginsReady: '所有插件就绪',
      marketplaceReady: '市场已注册 (通过 /plugin 安装插件)',
    },
    de: {
      slashCommandsHint: '↑ Erforderlich für Slash-Befehle wie /sw:increment',
      pluginsReady: 'Alle Plugins bereit',
      marketplaceReady: 'Marketplace registriert (Plugins über /plugin installieren)',
    },
    fr: {
      slashCommandsHint: '↑ Requis pour les commandes slash comme /sw:increment',
      pluginsReady: 'Tous les plugins prêts',
      marketplaceReady: 'Marketplace enregistré (installer les plugins via /plugin)',
    },
    ja: {
      slashCommandsHint: '↑ /sw:increment などのスラッシュコマンドに必要',
      pluginsReady: 'すべてのプラグイン準備完了',
      marketplaceReady: 'マーケットプレイス登録済み (/plugin でプラグインをインストール)',
    },
    ko: {
      slashCommandsHint: '↑ /sw:increment 같은 슬래시 명령에 필요',
      pluginsReady: '모든 플러그인 준비 완료',
      marketplaceReady: '마켓플레이스 등록됨 (/plugin으로 플러그인 설치)',
    },
    pt: {
      slashCommandsHint: '↑ Necessário para comandos slash como /sw:increment',
      pluginsReady: 'Todos os plugins prontos',
      marketplaceReady: 'Marketplace registrado (instalar plugins via /plugin)',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Options for showNextSteps
 */
export interface ShowNextStepsOptions {
  /** Whether plugins were auto-installed (Claude only) */
  pluginAutoInstalled?: boolean;
  /** Whether only marketplace was registered (plugins need manual install) */
  marketplaceOnly?: boolean;
}

/**
 * Show next steps after initialization
 *
 * @param projectName - Project name
 * @param adapterName - Adapter name (claude, cursor, generic)
 * @param language - Language for i18n
 * @param usedDotNotation - Whether user used "." for current directory
 * @param options - Additional options for plugin/marketplace status
 */
export function showNextSteps(
  projectName: string,
  adapterName: string,
  language: SupportedLanguage,
  usedDotNotation: boolean = false,
  options: boolean | ShowNextStepsOptions = false
): void {
  // Support legacy boolean parameter or new options object
  const opts: ShowNextStepsOptions = typeof options === 'boolean'
    ? { pluginAutoInstalled: options }
    : options;
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
    // Three states:
    // 1. pluginAutoInstalled=true, marketplaceOnly=false → All plugins ready
    // 2. pluginAutoInstalled=true, marketplaceOnly=true → Marketplace registered only
    // 3. pluginAutoInstalled=false → Manual install needed
    if (opts.marketplaceOnly) {
      // Marketplace registered but plugins need manual install
      console.log(`   ${stepNumber}. ${chalk.green('✔')} ${chalk.white(strings.marketplaceReady)}`);
      console.log('');
      stepNumber++;
    } else if (!opts.pluginAutoInstalled) {
      // Full failure - show manual install warning
      console.log(`   ${stepNumber}. ${chalk.yellow.bold('⚠️  ' + locale.t('cli', 'init.nextSteps.claude.step2'))}`);
      console.log(`      ${chalk.cyan.bold(locale.t('cli', 'init.nextSteps.claude.installCore'))}`);
      console.log(`      ${chalk.gray(strings.slashCommandsHint)}`);
      console.log('');
      stepNumber++;
    } else {
      // Full success - all plugins installed
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
