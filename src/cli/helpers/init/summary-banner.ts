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
  };
}

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

  // Tracker info
  if (options.tracker) {
    lines.push(chalk.cyan('  Tracker:   ') + options.tracker.name);
  }

  // Repo count
  const repoLabel = options.repoCount === 1 ? 'single repo' : 'multi-repo';
  lines.push(chalk.cyan('  Repos:     ') + `${options.repoCount} (${repoLabel})`);

  lines.push('');

  // Enabled defaults
  lines.push(chalk.cyan('  Enabled by default:'));

  const testLabel = options.defaults.testing === 'TDD' ? 'TDD mode (testing)' : `${options.defaults.testing} (testing)`;
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
