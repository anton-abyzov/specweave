/**
 * Go Status Command - Check go session status
 */

import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

export interface GoStatusOptions {
  verbose?: boolean;
  json?: boolean;
}

interface GoSession {
  sessionId: string;
  prompt: string;
  maxIterations: number;
  completionPromise: string;
  iteration: number;
  conditions: {
    build: boolean;
    tests: boolean;
    e2e: boolean;
    lint: boolean;
    types: boolean;
  };
  createdAt: string;
  status: string;
  completedAt?: string;
}

export async function handleGoStatusCommand(
  projectPath: string,
  options: GoStatusOptions
): Promise<void> {
  const sessionFile = path.join(projectPath, '.specweave', 'state', 'go-session.json');

  // Check if session exists
  if (!fs.existsSync(sessionFile)) {
    console.log(chalk.yellow('No active go session found.'));
    console.log(chalk.gray('Run /sw:go "PROMPT" to start a session.'));
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

  // JSON output
  if (options.json) {
    const output = {
      sessionId: sessionData.sessionId,
      status: sessionData.status,
      iteration: sessionData.iteration,
      maxIterations: sessionData.maxIterations,
      completionPromise: sessionData.completionPromise || null,
      conditions: sessionData.conditions,
      createdAt: sessionData.createdAt,
      completedAt: sessionData.completedAt || null,
      runtime,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Pretty output
  console.log('━'.repeat(70));
  console.log(chalk.bold('  Go Session Status'));
  console.log('━'.repeat(70));
  console.log('');

  console.log(`Session ID: ${chalk.cyan(sessionData.sessionId)}`);

  // Status with color
  let statusColor = chalk.yellow;
  if (sessionData.status === 'completed') statusColor = chalk.green;
  else if (sessionData.status === 'max_iterations_reached') statusColor = chalk.red;
  console.log(`Status: ${statusColor(sessionData.status)}`);
  console.log('');

  console.log(
    `Iteration: ${chalk.bold(sessionData.iteration.toString())} / ${sessionData.maxIterations}`
  );
  console.log(`Runtime: ${runtime}`);
  console.log('');

  if (sessionData.completionPromise) {
    console.log(`Completion Promise: ${chalk.green(`"${sessionData.completionPromise}"`)}`);
  }

  // Quality gates
  const gates: string[] = [];
  if (sessionData.conditions.build) gates.push('Build');
  if (sessionData.conditions.tests) gates.push('Tests');
  if (sessionData.conditions.e2e) gates.push('E2E');
  if (sessionData.conditions.lint) gates.push('Lint');
  if (sessionData.conditions.types) gates.push('Types');

  if (gates.length > 0) {
    console.log(`Quality Gates: ${chalk.cyan(gates.join(', '))}`);
  }

  console.log('');

  // Verbose output
  if (options.verbose) {
    console.log('━'.repeat(70));
    console.log(chalk.bold('  Details'));
    console.log('━'.repeat(70));
    console.log('');
    console.log('Prompt:');
    console.log(`  ${sessionData.prompt}`);
    console.log('');
    console.log(`Created: ${sessionData.createdAt}`);
    if (sessionData.completedAt) {
      console.log(`Completed: ${sessionData.completedAt}`);
    }
    console.log('');
    console.log('Log file:');
    console.log(`  ${path.join(projectPath, '.specweave', 'logs', 'go-iterations.log')}`);
    console.log('');
  }

  console.log('━'.repeat(70));
}
