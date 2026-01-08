/**
 * Go Command - Ralph Wiggum pattern for autonomous iteration
 *
 * Pure loop execution:
 * - Same prompt every iteration
 * - Claude sees previous work (files, tests, git history)
 * - Loop until completion promise OR max iterations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export interface GoOptions {
  maxIterations?: number;
  completionPromise?: string;
  build?: boolean;
  tests?: boolean;
  e2e?: boolean;
  lint?: boolean;
  types?: boolean;
  dryRun?: boolean;
}

export async function handleGoCommand(
  projectPath: string,
  prompt: string,
  options: GoOptions
): Promise<void> {
  // Build arguments for setup-go.sh
  const args: string[] = [];

  // Add prompt (quoted)
  args.push(`"${prompt.replace(/"/g, '\\"')}"`);

  // Add options
  if (options.maxIterations) {
    args.push('--max-iterations', options.maxIterations.toString());
  }

  if (options.completionPromise) {
    args.push('--completion-promise', `"${options.completionPromise.replace(/"/g, '\\"')}"`);
  }

  if (options.build) args.push('--build');
  if (options.tests) args.push('--tests');
  if (options.e2e) args.push('--e2e');
  if (options.lint) args.push('--lint');
  if (options.types) args.push('--types');
  if (options.dryRun) args.push('--dry-run');

  // Find setup-go.sh script
  // __dirname is in dist/src/cli/commands, script is in plugins/specweave/scripts
  const scriptPath = path.join(__dirname, '../../../../plugins/specweave/scripts/setup-go.sh');

  // Execute setup script
  const command = `bash "${scriptPath}" ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PROJECT_ROOT: projectPath },
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    // Script exited with non-zero code
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);

    throw new Error(`Go session failed to start: ${error.message}`);
  }
}
