/**
 * Summary banner displayed after init completes
 *
 * Simplified (v1.0.415): Removed external tool fields (tracker, sync permissions,
 * greenfield/brownfield, repo count). Init no longer configures external tools.
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
 */
export function formatSummaryBanner(options: SummaryBannerOptions): string {
  const lines: string[] = [];

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

  // Adapter info
  const adapterLabel = adapterDisplayNames[options.adapter] || options.adapter;
  lines.push(chalk.cyan('  Adapter:   ') + adapterLabel);

  // Config path
  lines.push(chalk.cyan('  Config:    ') + '.specweave/config.json');

  lines.push('');

  // Enabled defaults
  lines.push(chalk.cyan('  Enabled by default:'));

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

  // Quick reference
  lines.push(chalk.cyan('  Quick reference:'));
  lines.push(`    specweave help              Full command reference`);
  lines.push(`    specweave doctor            Verify project health`);
  lines.push(`    specweave config <section>  Customize settings`);

  lines.push('');

  return lines.join('\n');
}

/**
 * Display the summary banner to console.
 */
export function displaySummaryBanner(options: SummaryBannerOptions): void {
  console.log(formatSummaryBanner(options));
}
