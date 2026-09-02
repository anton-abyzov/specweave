/**
 * Summary banner displayed after init completes
 *
 * Simplified (v1.0.415): Removed external tool fields (tracker, sync permissions,
 * greenfield/brownfield, repo count). Init no longer configures external tools.
 */

import chalk from 'chalk';
import type { UmbrellaDiscoveryResult } from './types.js';

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
    lspEnabled: boolean;
    gitHooksInstalled: boolean;
    coverage?: { unit: number; integration: number; e2e: number };
  };
  umbrellaDiscovery?: UmbrellaDiscoveryResult;
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

  // Project structure. A project with no repositories under repositories/ is a
  // plain single repo — calling it a "Workspace (0 repositories)" told users
  // they had umbrella structure they never asked for.
  {
    const repoCount = options.umbrellaDiscovery?.totalRepoCount ?? 0;
    lines.push(
      chalk.cyan('  Structure: ') +
        (repoCount === 0
          ? 'Single repo'
          : `Workspace (${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'})`)
    );
    if (options.umbrellaDiscovery) {
      const displayRepos = options.umbrellaDiscovery.repos.slice(0, 10);
      for (const repo of displayRepos) {
        lines.push(chalk.gray(`    - ${repo.org}/${repo.name}`));
      }
      if (repoCount > 10) {
        lines.push(chalk.gray(`    ... and ${repoCount - 10} more`));
      }
    }
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
  if (options.defaults.testing === 'TDD' && options.defaults.coverage) {
    const ct = options.defaults.coverage;
    testLabel = `TDD mode (coverage: ${ct.unit}% unit, ${ct.integration}% integration, ${ct.e2e}% e2e)`;
  } else if (options.defaults.testing === 'TDD') {
    testLabel = 'TDD mode (testing)';
  } else {
    testLabel = `${options.defaults.testing} (testing)`;
  }
  lines.push(`    • ${testLabel}`);

  if (options.defaults.lspEnabled) {
    lines.push('    • LSP code intelligence');
  }

  if (options.defaults.gitHooksInstalled) {
    lines.push('    • Git pre-commit hooks');
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
