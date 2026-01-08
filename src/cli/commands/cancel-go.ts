/**
 * Cancel Go Command - Stop active go session
 */

import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import readline from 'readline';

export interface CancelGoOptions {
  force?: boolean;
}

interface GoSession {
  sessionId: string;
  iteration: number;
  maxIterations: number;
  createdAt: string;
}

async function askConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Continue? (y/n) ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export async function handleCancelGoCommand(
  projectPath: string,
  options: CancelGoOptions
): Promise<void> {
  const sessionFile = path.join(projectPath, '.specweave', 'state', 'go-session.json');

  // Check if session exists
  if (!fs.existsSync(sessionFile)) {
    console.log(chalk.yellow('No active go session found.'));
    console.log(chalk.gray('Nothing to cancel.'));
    return;
  }

  // Read session state
  const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) as GoSession;

  // Calculate runtime
  const createdTime = new Date(sessionData.createdAt);
  const now = new Date();
  const runtimeMs = now.getTime() - createdTime.getTime();
  const runtimeMinutes = Math.floor(runtimeMs / 60000);
  const runtimeSeconds = Math.floor((runtimeMs % 60000) / 1000);
  const runtime = `${runtimeMinutes}m ${runtimeSeconds}s`;

  // Confirmation (unless force)
  if (!options.force) {
    console.log(chalk.yellow(`Cancel go session: ${sessionData.sessionId}?`));
    console.log(
      `This will stop the loop after ${sessionData.iteration} iterations (max: ${sessionData.maxIterations}).`
    );
    console.log('');

    const confirmed = await askConfirmation();
    if (!confirmed) {
      console.log('Cancelled.');
      return;
    }
  }

  // Delete session file
  fs.unlinkSync(sessionFile);

  // Success message
  console.log(chalk.green(`✅ Go session cancelled: ${sessionData.sessionId}`));
  console.log(
    `   Iterations completed: ${sessionData.iteration} / ${sessionData.maxIterations}`
  );
  console.log(`   Runtime: ${runtime}`);
  console.log('');
  console.log('   Logs saved to:', chalk.gray('.specweave/logs/go-iterations.log'));
}
