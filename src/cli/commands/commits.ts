import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Display the last 2 git commits
 *
 * Shows commit hash (short), author, and message for quick context.
 */
export async function commitsCommand(): Promise<void> {
  try {
    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    } catch {
      console.error(chalk.red('Error: Not a git repository'));
      process.exit(1);
    }

    // Get last 2 commits
    const output = execSync('git log -2 --format="%h %an: %s"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!output) {
      console.log(chalk.yellow('No commits found in this repository'));
      return;
    }

    console.log(chalk.bold('\nLast 2 commits:\n'));
    const lines = output.split('\n');
    lines.forEach((line, index) => {
      const [hash, ...rest] = line.split(' ');
      const message = rest.join(' ');
      console.log(chalk.dim(`${index + 1}.`) + ' ' + chalk.cyan(hash) + ' ' + message);
    });
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}
