/**
 * Next steps display after init completion
 *
 * Simplified (v1.0.415): Shows guided follow-up commands instead of
 * adapter-specific verbose instructions.
 */

import chalk from 'chalk';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import type { NextStepsContext } from './types.js';

function getNextStepsStrings(language: SupportedLanguage) {
  const strings: Record<SupportedLanguage, {
    pluginsReady: string;
    marketplaceReady: string;
    pluginWarning: string;
    syncSetup: string;
    firstIncrement: string;
    multiRepo: string;
  }> = {
    en: {
      pluginsReady: 'All plugins ready',
      marketplaceReady: 'Marketplace registered (install plugins via /plugin)',
      pluginWarning: 'Plugins not installed — run: claude mcp add sw@specweave',
      syncSetup: 'Connect GitHub Issues, JIRA, or ADO',
      firstIncrement: 'Start your first feature',
      multiRepo: 'Set up multi-repository workspace',
    },
    ru: {
      pluginsReady: 'Все плагины готовы',
      marketplaceReady: 'Маркетплейс зарегистрирован (установите плагины через /plugin)',
      pluginWarning: 'Плагины не установлены — выполните: claude mcp add sw@specweave',
      syncSetup: 'Подключить GitHub Issues, JIRA или ADO',
      firstIncrement: 'Начать первую фичу',
      multiRepo: 'Настроить мульти-репозиторий',
    },
    es: {
      pluginsReady: 'Todos los plugins listos',
      marketplaceReady: 'Marketplace registrado (instalar plugins via /plugin)',
      pluginWarning: 'Plugins no instalados — ejecuta: claude mcp add sw@specweave',
      syncSetup: 'Conectar GitHub Issues, JIRA o ADO',
      firstIncrement: 'Iniciar tu primera funcionalidad',
      multiRepo: 'Configurar workspace multi-repositorio',
    },
    zh: {
      pluginsReady: '所有插件就绪',
      marketplaceReady: '市场已注册 (通过 /plugin 安装插件)',
      pluginWarning: '插件未安装 — 运行: claude mcp add sw@specweave',
      syncSetup: '连接 GitHub Issues、JIRA 或 ADO',
      firstIncrement: '开始你的第一个功能',
      multiRepo: '设置多仓库工作区',
    },
    de: {
      pluginsReady: 'Alle Plugins bereit',
      marketplaceReady: 'Marketplace registriert (Plugins über /plugin installieren)',
      pluginWarning: 'Plugins nicht installiert — ausführen: claude mcp add sw@specweave',
      syncSetup: 'GitHub Issues, JIRA oder ADO verbinden',
      firstIncrement: 'Erstes Feature starten',
      multiRepo: 'Multi-Repository-Workspace einrichten',
    },
    fr: {
      pluginsReady: 'Tous les plugins prêts',
      marketplaceReady: 'Marketplace enregistré (installer les plugins via /plugin)',
      pluginWarning: 'Plugins non installés — exécuter: claude mcp add sw@specweave',
      syncSetup: 'Connecter GitHub Issues, JIRA ou ADO',
      firstIncrement: 'Démarrer votre première fonctionnalité',
      multiRepo: 'Configurer un workspace multi-dépôt',
    },
    ja: {
      pluginsReady: 'すべてのプラグイン準備完了',
      marketplaceReady: 'マーケットプレイス登録済み (/plugin でプラグインをインストール)',
      pluginWarning: 'プラグイン未インストール — 実行: claude mcp add sw@specweave',
      syncSetup: 'GitHub Issues、JIRA、ADO を接続',
      firstIncrement: '最初の機能を開始',
      multiRepo: 'マルチリポジトリワークスペースを設定',
    },
    ko: {
      pluginsReady: '모든 플러그인 준비 완료',
      marketplaceReady: '마켓플레이스 등록됨 (/plugin으로 플러그인 설치)',
      pluginWarning: '플러그인 미설치 — 실행: claude mcp add sw@specweave',
      syncSetup: 'GitHub Issues, JIRA 또는 ADO 연결',
      firstIncrement: '첫 번째 기능 시작',
      multiRepo: '멀티 리포지토리 워크스페이스 설정',
    },
    pt: {
      pluginsReady: 'Todos os plugins prontos',
      marketplaceReady: 'Marketplace registrado (instalar plugins via /plugin)',
      pluginWarning: 'Plugins não instalados — execute: claude mcp add sw@specweave',
      syncSetup: 'Conectar GitHub Issues, JIRA ou ADO',
      firstIncrement: 'Iniciar sua primeira funcionalidade',
      multiRepo: 'Configurar workspace multi-repositório',
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

export type { NextStepsContext };

/**
 * Show next steps after initialization.
 *
 * Displays plugin status (Claude only) followed by contextual guided follow-up commands.
 * migrate-to-umbrella is hidden when already in an umbrella structure.
 */
export function showNextSteps(
  projectName: string,
  adapterName: string,
  language: SupportedLanguage,
  usedDotNotation: boolean = false,
  options: boolean | ShowNextStepsOptions = false,
  context: NextStepsContext = {}
): void {
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

  // Plugin status (Claude only)
  if (adapterName === 'claude') {
    if (opts.marketplaceOnly) {
      console.log(`   ${stepNumber}. ${chalk.green('✔')} ${chalk.white(strings.marketplaceReady)}`);
    } else if (!opts.pluginAutoInstalled) {
      console.log(`   ${stepNumber}. ${chalk.yellow.bold('⚠️  ' + strings.pluginWarning)}`);
    } else {
      console.log(`   ${stepNumber}. ${chalk.green('✔')} ${chalk.white(strings.pluginsReady)}`);
    }
    console.log('');
    stepNumber++;
  }

  // Guided follow-up commands
  console.log(`   ${stepNumber}. ${chalk.white('specweave sync-setup')}          ${chalk.gray(strings.syncSetup)}`);
  console.log(`   ${stepNumber + 1}. ${chalk.white('specweave increment "feature"')}  ${chalk.gray(strings.firstIncrement)}`);

  // Only show migrate-to-umbrella for single-repo projects
  if (!context.isUmbrella) {
    console.log(`   ${stepNumber + 2}. ${chalk.white('specweave migrate-to-umbrella')} ${chalk.gray(strings.multiRepo)}`);
  }

  console.log('');
  console.log(chalk.green.bold(locale.t('cli', 'init.nextSteps.footer')));
  console.log('');
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.docsLink')));
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.githubLink')));
  console.log('');
}
