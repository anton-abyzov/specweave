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
    allPluginsInstalled: string;
    pluginsInstalledAuto: string;
    noManualInstall: string;
    fullCapabilities: string;
  }> = {
    en: {
      slashCommandsHint: '↑ Required for slash commands like /specweave:increment',
      allPluginsInstalled: 'All plugins are already installed!',
      pluginsInstalledAuto: '✔ All 19+ SpecWeave plugins installed automatically',
      noManualInstall: '✔ No need to install additional plugins manually',
      fullCapabilities: '✔ Full capabilities available immediately',
    },
    ru: {
      slashCommandsHint: '↑ Необходимо для слеш-команд типа /specweave:increment',
      allPluginsInstalled: 'Все плагины уже установлены!',
      pluginsInstalledAuto: '✔ Все 19+ плагинов SpecWeave установлены автоматически',
      noManualInstall: '✔ Не нужно устанавливать плагины вручную',
      fullCapabilities: '✔ Полный функционал доступен сразу',
    },
    es: {
      slashCommandsHint: '↑ Requerido para comandos como /specweave:increment',
      allPluginsInstalled: '¡Todos los plugins ya están instalados!',
      pluginsInstalledAuto: '✔ Todos los 19+ plugins de SpecWeave instalados automáticamente',
      noManualInstall: '✔ No es necesario instalar plugins adicionales manualmente',
      fullCapabilities: '✔ Capacidades completas disponibles inmediatamente',
    },
    zh: {
      slashCommandsHint: '↑ 需要用于斜杠命令如 /specweave:increment',
      allPluginsInstalled: '所有插件已安装！',
      pluginsInstalledAuto: '✔ 19+个SpecWeave插件已自动安装',
      noManualInstall: '✔ 无需手动安装其他插件',
      fullCapabilities: '✔ 完整功能立即可用',
    },
    de: {
      slashCommandsHint: '↑ Erforderlich für Slash-Befehle wie /specweave:increment',
      allPluginsInstalled: 'Alle Plugins sind bereits installiert!',
      pluginsInstalledAuto: '✔ Alle 19+ SpecWeave-Plugins automatisch installiert',
      noManualInstall: '✔ Keine manuelle Plugin-Installation erforderlich',
      fullCapabilities: '✔ Volle Funktionalität sofort verfügbar',
    },
    fr: {
      slashCommandsHint: '↑ Requis pour les commandes slash comme /specweave:increment',
      allPluginsInstalled: 'Tous les plugins sont déjà installés !',
      pluginsInstalledAuto: '✔ Plus de 19 plugins SpecWeave installés automatiquement',
      noManualInstall: '✔ Pas besoin d\'installer des plugins supplémentaires manuellement',
      fullCapabilities: '✔ Toutes les fonctionnalités disponibles immédiatement',
    },
    ja: {
      slashCommandsHint: '↑ /specweave:increment などのスラッシュコマンドに必要',
      allPluginsInstalled: 'すべてのプラグインがインストール済みです！',
      pluginsInstalledAuto: '✔ 19以上のSpecWeaveプラグインが自動インストール済み',
      noManualInstall: '✔ 追加のプラグインを手動でインストールする必要なし',
      fullCapabilities: '✔ すべての機能がすぐに利用可能',
    },
    ko: {
      slashCommandsHint: '↑ /specweave:increment 같은 슬래시 명령에 필요',
      allPluginsInstalled: '모든 플러그인이 이미 설치되었습니다!',
      pluginsInstalledAuto: '✔ 19개 이상의 SpecWeave 플러그인 자동 설치됨',
      noManualInstall: '✔ 추가 플러그인을 수동으로 설치할 필요 없음',
      fullCapabilities: '✔ 전체 기능 즉시 사용 가능',
    },
    pt: {
      slashCommandsHint: '↑ Necessário para comandos slash como /specweave:increment',
      allPluginsInstalled: 'Todos os plugins já estão instalados!',
      pluginsInstalledAuto: '✔ Mais de 19 plugins SpecWeave instalados automaticamente',
      noManualInstall: '✔ Não é necessário instalar plugins adicionais manualmente',
      fullCapabilities: '✔ Funcionalidades completas disponíveis imediatamente',
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
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step1'))}`);
    console.log('');
    stepNumber++;

    // Only show manual install if auto-install failed
    if (!pluginAutoInstalled) {
      console.log(`   ${stepNumber}. ${chalk.yellow.bold('⚠️  ' + locale.t('cli', 'init.nextSteps.claude.step2'))}`);
      console.log(`      ${chalk.cyan.bold(locale.t('cli', 'init.nextSteps.claude.installCore'))}`);
      console.log(`      ${chalk.gray(strings.slashCommandsHint)}`);
      console.log('');
      stepNumber++;
    }

    console.log(`   ${stepNumber}. ${chalk.white(strings.allPluginsInstalled)}`);
    console.log(`      ${chalk.gray(strings.pluginsInstalledAuto)}`);
    console.log(`      ${chalk.gray(strings.noManualInstall)}`);
    console.log(`      ${chalk.gray(strings.fullCapabilities)}`);
    console.log('');
    stepNumber++;

    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step4'))}`);
    console.log(`      ${chalk.cyan(locale.t('cli', 'init.nextSteps.claude.example'))}`);
    console.log(`      ${chalk.gray(locale.t('cli', 'init.nextSteps.claude.autoActivate'))}`);
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
