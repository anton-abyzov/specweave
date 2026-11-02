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
  }> = {
    en: {
      pluginsReady: 'All plugins ready',
      marketplaceReady: 'Marketplace registered (install plugins via /plugin)',
      pluginWarning: 'Plugins not installed — run: specweave refresh-plugins --force',
      syncSetup: 'Connect GitHub Issues, JIRA, or ADO',
      firstIncrement: 'Start your first feature',
    },
    ru: {
      pluginsReady: 'Все плагины готовы',
      marketplaceReady: 'Маркетплейс зарегистрирован (установите плагины через /plugin)',
      pluginWarning: 'Плагины не установлены — выполните: specweave refresh-plugins --force',
      syncSetup: 'Подключить GitHub Issues, JIRA или ADO',
      firstIncrement: 'Начать первую фичу',
    },
    es: {
      pluginsReady: 'Todos los plugins listos',
      marketplaceReady: 'Marketplace registrado (instalar plugins via /plugin)',
      pluginWarning: 'Plugins no instalados — ejecuta: specweave refresh-plugins --force',
      syncSetup: 'Conectar GitHub Issues, JIRA o ADO',
      firstIncrement: 'Iniciar tu primera funcionalidad',
    },
    zh: {
      pluginsReady: '所有插件就绪',
      marketplaceReady: '市场已注册 (通过 /plugin 安装插件)',
      pluginWarning: '插件未安装 — 运行: specweave refresh-plugins --force',
      syncSetup: '连接 GitHub Issues、JIRA 或 ADO',
      firstIncrement: '开始你的第一个功能',
    },
    de: {
      pluginsReady: 'Alle Plugins bereit',
      marketplaceReady: 'Marketplace registriert (Plugins über /plugin installieren)',
      pluginWarning: 'Plugins nicht installiert — ausführen: specweave refresh-plugins --force',
      syncSetup: 'GitHub Issues, JIRA oder ADO verbinden',
      firstIncrement: 'Erstes Feature starten',
    },
    fr: {
      pluginsReady: 'Tous les plugins prêts',
      marketplaceReady: 'Marketplace enregistré (installer les plugins via /plugin)',
      pluginWarning: 'Plugins non installés — exécuter: specweave refresh-plugins --force',
      syncSetup: 'Connecter GitHub Issues, JIRA ou ADO',
      firstIncrement: 'Démarrer votre première fonctionnalité',
    },
    ja: {
      pluginsReady: 'すべてのプラグイン準備完了',
      marketplaceReady: 'マーケットプレイス登録済み (/plugin でプラグインをインストール)',
      pluginWarning: 'プラグイン未インストール — 実行: specweave refresh-plugins --force',
      syncSetup: 'GitHub Issues、JIRA、ADO を接続',
      firstIncrement: '最初の機能を開始',
    },
    ko: {
      pluginsReady: '모든 플러그인 준비 완료',
      marketplaceReady: '마켓플레이스 등록됨 (/plugin으로 플러그인 설치)',
      pluginWarning: '플러그인 미설치 — 실행: specweave refresh-plugins --force',
      syncSetup: 'GitHub Issues, JIRA 또는 ADO 연결',
      firstIncrement: '첫 번째 기능 시작',
    },
    pt: {
      pluginsReady: 'Todos os plugins prontos',
      marketplaceReady: 'Marketplace registrado (instalar plugins via /plugin)',
      pluginWarning: 'Plugins não instalados — execute: specweave refresh-plugins --force',
      syncSetup: 'Conectar GitHub Issues, JIRA ou ADO',
      firstIncrement: 'Iniciar sua primeira funcionalidade',
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
 * Displays plugin or skill status (not numbered), then the loop as numbered
 * steps: create-increment, task done --run, verify + complete. Tracker setup
 * and `specweave get` follow on one unnumbered "Later" line.
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
  const step = (cmd: string, hint: string): void => {
    console.log(`   ${stepNumber}. ${chalk.white(cmd.padEnd(46))} ${chalk.gray(hint)}`);
    stepNumber++;
  };

  // Only show "cd" step if we created a subdirectory
  if (!usedDotNotation) {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cd', { projectName }))}`);
    console.log('');
    stepNumber++;
  }

  // Status lines (plugins, skills) are not steps: they take no number, so the
  // loop always starts the numbered list.
  if (adapterName === 'claude') {
    if (opts.marketplaceOnly) {
      console.log(`   ${chalk.green('✔')} ${chalk.white(strings.marketplaceReady)}`);
    } else if (!opts.pluginAutoInstalled) {
      console.log(`   ${chalk.yellow.bold('⚠️  ' + strings.pluginWarning)}`);
    } else {
      console.log(`   ${chalk.green('✔')} ${chalk.white(strings.pluginsReady)}`);
    }
    console.log('');
  } else if (isSkillBasedAdapter(adapterName)) {
    console.log(`   ${chalk.green('✔')} ${chalk.white(`Skills installed for ${getAdapterDisplayName(adapterName)}`)}`);
    console.log('');
  } else if (adapterName === 'generic') {
    console.log(`   ${chalk.green('✔')} ${chalk.white('Skills installed in .agents/skills/')}`);
    console.log('');
  }

  // The loop, and nothing before it: plan, do each task, close.
  step('specweave create-increment "Add login form"', `${strings.firstIncrement} (fill spec.md: Problem, ACs, Tasks)`);
  step('specweave task done T-01 --run "<its Test>"', 'After each task\'s commit: run its Test, record the result');
  step('specweave verify, then specweave complete', 'Close the increment when every task is done');
  console.log('');
  console.log(`   ${chalk.gray('Or ask your AI tool: "Create an increment for <your feature>", and it runs these.')}`);
  console.log(`   ${chalk.gray(`Later: specweave sync setup (${strings.syncSetup}) · specweave get owner/repo (add a repository)`)}`);

  // AutoVerify tip: only when init runs inside Claude Code Desktop
  if (adapterName === 'claude' && process.env.CLAUDE_CODE_ENTRYPOINT === 'claude-desktop') {
    console.log('');
    console.log(`   ${chalk.cyan('Tip:')} ${chalk.white('AutoVerify is on by default in Claude Code Desktop — changes are verified automatically')}`);
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
