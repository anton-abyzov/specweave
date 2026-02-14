/**
 * Summary banner displayed after init completes
 *
 * Shows what was configured and auto-provisioned,
 * with customization instructions.
 *
 * Part of 0200-init-two-phase-redesign
 */

import chalk from 'chalk';

export interface SummaryBannerOptions {
  projectName: string;
  provider?: {
    name: string;
    owner?: string;
    repo?: string;
    organization?: string;
  };
  tracker?: {
    name: string;
  };
  repoCount: number;
  isGreenfield: boolean;
  hasPendingClones: boolean;
  adapter: string;
  language: string;
  defaults: {
    testing: string;
    qualityGates: string;
    lspEnabled: boolean;
    gitHooksInstalled: boolean;
    translationEnabled: boolean;
    coverageTargets?: { unit: number; integration: number; e2e: number };
  };
  externalPluginInstalled?: boolean;
  syncPermissions?: {
    canCreate: boolean;
    canUpdate: boolean;
    canUpdateStatus: boolean;
  };
}

const adapterDisplayNames: Record<string, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
  gemini: 'Gemini CLI',
  codex: 'Codex',
  generic: 'Generic',
};

/**
 * Format the summary banner as a string (pure function).
 * No side effects — caller decides how to output.
 */
export function formatSummaryBanner(options: SummaryBannerOptions): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.green(`\n✅ SpecWeave initialized for ${options.projectName}!`));
  lines.push('');

  // Provider info
  if (options.provider) {
    const providerDetail = options.provider.organization
      ? `(${options.provider.organization})`
      : options.provider.owner && options.provider.repo
        ? `(${options.provider.owner}/${options.provider.repo})`
        : '';
    lines.push(chalk.cyan('  Provider:  ') + `${options.provider.name} ${providerDetail}`.trim());
  }

  // Tracker info (with plugin health indicator)
  if (options.tracker) {
    let trackerLine = options.tracker.name;
    if (options.externalPluginInstalled === false) {
      trackerLine += chalk.yellow(' (\u26A0 plugin pending)');
    }
    lines.push(chalk.cyan('  Tracker:   ') + trackerLine);
  }

  // Sync permissions
  if (options.syncPermissions) {
    const perms: string[] = [];
    if (options.syncPermissions.canCreate) perms.push('create');
    if (options.syncPermissions.canUpdate) perms.push('update');
    if (options.syncPermissions.canUpdateStatus) perms.push('status');
    if (perms.length > 0) {
      lines.push(chalk.cyan('  Sync:      ') + perms.join(' + '));
    }
  }

  // Adapter info
  const adapterLabel = adapterDisplayNames[options.adapter] || options.adapter;
  lines.push(chalk.cyan('  Adapter:   ') + adapterLabel);

  // Config path
  lines.push(chalk.cyan('  Config:    ') + '.specweave/config.json');

  // Repo count
  const repoLabel = options.repoCount === 1 ? 'single repo' : 'multi-repo';
  lines.push(chalk.cyan('  Repos:     ') + `${options.repoCount} (${repoLabel})`);

  lines.push('');

  // Enabled defaults
  lines.push(chalk.cyan('  Enabled by default:'));

  // Testing line with optional coverage targets
  let testLabel: string;
  if (options.defaults.testing === 'TDD' && options.defaults.coverageTargets) {
    const ct = options.defaults.coverageTargets;
    testLabel = `TDD mode (coverage: ${ct.unit}% unit, ${ct.integration}% integration, ${ct.e2e}% e2e)`;
  } else if (options.defaults.testing === 'TDD') {
    testLabel = 'TDD mode (testing)';
  } else {
    testLabel = `${options.defaults.testing} (testing)`;
  }
  lines.push(`    • ${testLabel}`);

  const gateLabel = options.defaults.qualityGates.charAt(0).toUpperCase() + options.defaults.qualityGates.slice(1);
  lines.push(`    • ${gateLabel} quality gates`);

  if (options.defaults.lspEnabled) {
    lines.push('    • LSP code intelligence');
  }

  if (options.defaults.gitHooksInstalled) {
    lines.push('    • Git pre-commit hooks');
  }

  if (options.defaults.translationEnabled) {
    lines.push(`    • Auto-translation (${options.language})`);
  }

  lines.push('');

  // Customize instruction
  lines.push(chalk.gray('  Customize anytime: specweave config <section>'));

  // Quick reference
  lines.push('');
  lines.push(chalk.cyan('  Quick reference:'));
  lines.push(`    specweave help              Full command reference`);
  lines.push(`    specweave doctor            Verify project health`);

  // Brownfield / living docs hint
  if (!options.isGreenfield && !options.hasPendingClones) {
    lines.push(chalk.yellow('  💡 Existing code detected → run /sw:living-docs to generate documentation'));
  } else if (options.hasPendingClones) {
    lines.push(chalk.yellow('  ⏳ Repos cloning in background → run /sw:living-docs after completion'));
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Display the summary banner to console.
 */
export function displaySummaryBanner(options: SummaryBannerOptions): void {
  console.log(formatSummaryBanner(options));
}
