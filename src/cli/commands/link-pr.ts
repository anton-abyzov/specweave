/**
 * CLI Command: link-pr
 *
 * Links a pull request to external tickets (JIRA remote links, ADO hyperlinks)
 *
 * Usage:
 *   specweave link-pr --increment <id> --pr-url <url> --pr-number <num> [--branch <name>]
 *
 * @module cli/commands/link-pr
 */

import chalk from 'chalk';
import { linkPrToExternalTickets } from '../../sync/pr-linker.js';

export async function runLinkPr(options: {
  increment: string;
  prUrl: string;
  prNumber: string;
  branch?: string;
}): Promise<void> {
  const projectRoot = process.cwd();

  if (!options.increment || !options.prUrl || !options.prNumber) {
    console.error(chalk.red('Missing required options: --increment, --pr-url, --pr-number'));
    process.exit(1);
  }

  console.log(chalk.cyan(`\n🔗 Linking PR #${options.prNumber} to external tickets...`));

  const result = await linkPrToExternalTickets({
    projectRoot,
    incrementId: options.increment,
    prUrl: options.prUrl,
    prNumber: parseInt(options.prNumber, 10),
    branch: options.branch || '',
  });

  // Report results
  if (result.linked.length > 0) {
    console.log(chalk.green(`\n✅ Linked to ${result.linked.length} ticket(s):`));
    for (const link of result.linked) {
      console.log(chalk.green(`   • ${link.provider.toUpperCase()}: ${link.key}`));
    }
  }

  if (result.errors.length > 0) {
    console.log(chalk.yellow(`\n⚠️  ${result.errors.length} linking error(s):`));
    for (const err of result.errors) {
      console.log(chalk.yellow(`   • ${err.provider.toUpperCase()} ${err.key}: ${err.error}`));
    }
  }

  if (result.linked.length === 0 && result.errors.length === 0) {
    console.log(chalk.gray('\n   No external tickets found in metadata — nothing to link'));
  }

  console.log('');
}
