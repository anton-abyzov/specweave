import chalk from 'chalk';
// Startup duplicate check (runs before any command)
export async function checkForDuplicates() {
  try {
    // Skip check for init command (no .specweave yet)
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === 'init' || args[0] === '--help' || args[0] === '-h' || args[0] === '--version' || args[0] === '-V') {
      return;
    }

    // Check if .specweave exists
    const { default: fs } = await import('fs-extra');
    const { default: path } = await import('path');
    const specweavePath = path.join(process.cwd(), '.specweave');

    if (!fs.existsSync(specweavePath)) {
      return; // No .specweave directory, skip check
    }

    // Detect duplicates
    const { detectAllDuplicates } = await import('../dist/src/core/increment/duplicate-detector.js');
    const report = await detectAllDuplicates(process.cwd());

    if (report.duplicateCount > 0) {
      console.log(chalk.yellow('\n⚠️  Duplicate increment(s) detected:\n'));

      for (const duplicate of report.duplicates) {
        console.log(chalk.dim(`  ${duplicate.incrementNumber}:`));
        for (const location of duplicate.locations) {
          const indicator = location === duplicate.recommendedWinner ? chalk.green('→') : chalk.red('✗');
          console.log(`    ${indicator} ${location.name} [${location.status}]`);
        }
      }

      console.log(chalk.dim('\n  Run sw:fix-duplicates to resolve\n'));
    }
  } catch (error) {
    // Silently ignore errors (don't block CLI startup)
    if (process.env.DEBUG) {
      console.error(chalk.dim(`[DEBUG] Duplicate check failed: ${error}`));
    }
  }
}

