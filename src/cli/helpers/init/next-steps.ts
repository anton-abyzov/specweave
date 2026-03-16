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

/**
 * Map adapter names to user-friendly display names for skills-aware messaging.
 */
const SKILL_ADAPTER_DISPLAY_NAMES: Record<string, string> = {
  opencode: 'OpenCode',
  cursor: 'Cursor',
  cline: 'Cline',
  windsurf: 'Windsurf',
  zed: 'Zed',
  continue: 'Continue',
  copilot: 'GitHub Copilot',
  gemini: 'Gemini CLI',
  jetbrains: 'JetBrains AI',
  amazonq: 'Amazon Q',
  aider: 'Aider',
  tabnine: 'Tabnine',
  kimi: 'Kimi CLI',
  trae: 'Trae',
  codex: 'Codex',
};

function isSkillBasedAdapter(adapterName: string): boolean {
  return Object.prototype.hasOwnProperty.call(SKILL_ADAPTER_DISPLAY_NAMES, adapterName);
}

function getAdapterDisplayName(adapterName: string): string {
  return SKILL_ADAPTER_DISPLAY_NAMES[adapterName] || adapterName;
}

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
  } else if (isSkillBasedAdapter(adapterName)) {
    // Skills-aware messaging for non-Claude tools that support skills
    const displayName = getAdapterDisplayName(adapterName);
    console.log(`   ${chalk.green('✔')} ${chalk.white(`Skills installed for ${displayName}!`)}`);
    console.log('');
    console.log(`   ${chalk.white('Your AI tool can now discover SpecWeave workflows automatically.')}`);
    console.log('');
    console.log(`   ${chalk.cyan('Quick start:')}`);
    console.log(`     1. Open your project in ${chalk.white(displayName)}`);
    console.log(`     2. Ask: ${chalk.gray('"Create an increment for [your feature]"')}`);
    console.log(`     3. The AI will use specweave CLI commands`);
    console.log('');
    console.log(`   ${chalk.cyan('Available CLI commands:')}`);
    console.log(`     ${chalk.white('specweave create-increment')}  ${chalk.gray('Create a new feature increment')}`);
    console.log(`     ${chalk.white('specweave status')}            ${chalk.gray('Check current progress')}`);
    console.log(`     ${chalk.white('specweave validate')}          ${chalk.gray('Run quality checks')}`);
    console.log(`     ${chalk.white('specweave complete')}          ${chalk.gray('Close an increment')}`);
    console.log('');
    stepNumber++;
  } else if (adapterName === 'generic') {
    // Generic adapter: mention skills in .agents/skills/ plus existing AGENTS.md messaging
    console.log(`   ${chalk.green('✔')} ${chalk.white('Skills installed in .agents/skills/')}`);
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

  // Warn about repos found in non-standard layout (repositories/{name} instead of {org}/{name})
  if (context.misplacedRepos && context.misplacedRepos.length > 0) {
    const example = context.misplacedRepos[0];
    console.log(chalk.yellow.bold('   ⚠  Non-standard repository layout detected'));
    console.log(chalk.gray('   The following repos were found directly under repositories/'));
    console.log(chalk.gray('   (expected: repositories/{org}/{repo}/, got: repositories/{repo}/):'));
    for (const repoName of context.misplacedRepos) {
      console.log(chalk.gray(`     repositories/${repoName}/`));
    }
    console.log('');
    console.log(chalk.cyan('   To fix, move repos into an org subfolder and re-init:'));
    console.log(chalk.white(`     mkdir -p repositories/my-org`));
    console.log(chalk.white(`     mv repositories/${example} repositories/my-org/${example}`));
    console.log(chalk.white(`     specweave init .`));
    console.log('');
  }
}
