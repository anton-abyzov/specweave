/**
 * specweave uninstall -- Remove SpecWeave from a project
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { uninstallGitHooks, areGitHooksInstalled } from '../helpers/init/git-hooks-installer.js';
import { stripSwSections } from '../helpers/init/instruction-file-merger.js';

export interface UninstallOptions {
  global?: boolean;
  keepData?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

interface Manifest {
  specweaveDir: boolean;
  claudeMd: 'delete' | 'strip' | 'skip';
  agentsMd: 'delete' | 'strip' | 'skip';
  gitHook: boolean;
  lockfile: boolean;
  skillCount: number;
  skillNames: string[];
}

function buildManifest(projectPath: string): Manifest {
  const manifest: Manifest = {
    specweaveDir: false,
    claudeMd: 'skip',
    agentsMd: 'skip',
    gitHook: false,
    lockfile: false,
    skillCount: 0,
    skillNames: [],
  };

  // Check .specweave/
  manifest.specweaveDir = fs.existsSync(path.join(projectPath, '.specweave'));

  // Check CLAUDE.md
  const claudePath = path.join(projectPath, 'CLAUDE.md');
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, 'utf-8');
    const stripped = stripSwSections(content);
    manifest.claudeMd = stripped === null ? 'delete' : 'strip';
  }

  // Check AGENTS.md
  const agentsPath = path.join(projectPath, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const content = fs.readFileSync(agentsPath, 'utf-8');
    const stripped = stripSwSections(content);
    manifest.agentsMd = stripped === null ? 'delete' : 'strip';
  }

  // Check git hook
  manifest.gitHook = areGitHooksInstalled(projectPath);

  // Check lockfile
  const lockPath = path.join(projectPath, 'vskill.lock');
  if (fs.existsSync(lockPath)) {
    manifest.lockfile = true;
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      manifest.skillNames = Object.keys(lock.skills || {});
      manifest.skillCount = manifest.skillNames.length;
    } catch {
      // Invalid lockfile, still mark for deletion
    }
  }

  return manifest;
}

function printManifest(manifest: Manifest) {
  console.log(chalk.yellow('\nThis will remove SpecWeave from the current project:\n'));

  if (manifest.specweaveDir) {
    console.log(`  ${chalk.bold('.specweave/')}           Framework data`);
  }

  if (manifest.claudeMd === 'delete') {
    console.log(`  ${chalk.bold('CLAUDE.md')}             Delete (100% SW-managed)`);
  } else if (manifest.claudeMd === 'strip') {
    console.log(`  ${chalk.bold('CLAUDE.md')}             Strip SW sections (preserve user content)`);
  }

  if (manifest.agentsMd === 'delete') {
    console.log(`  ${chalk.bold('AGENTS.md')}             Delete (100% SW-managed)`);
  } else if (manifest.agentsMd === 'strip') {
    console.log(`  ${chalk.bold('AGENTS.md')}             Strip SW sections (preserve user content)`);
  }

  if (manifest.gitHook) {
    console.log(`  ${chalk.bold('.git/hooks/pre-commit')} SpecWeave hook`);
  }

  if (manifest.skillCount > 0) {
    console.log(`  ${chalk.bold(`Skills (${manifest.skillCount})`)}            ${manifest.skillNames.join(', ')}`);
  }

  if (manifest.lockfile) {
    console.log(`  ${chalk.bold('vskill.lock')}           Lockfile`);
  }

  console.log('');
}

export async function uninstallCommand(
  projectPath: string,
  opts: UninstallOptions,
): Promise<void> {
  // Check .specweave/ exists
  if (!fs.existsSync(path.join(projectPath, '.specweave'))) {
    console.error(chalk.red('Not a SpecWeave project (no .specweave/ directory found).'));
    process.exit(1);
  }

  // Build removal manifest
  const manifest = buildManifest(projectPath);

  // Print manifest
  printManifest(manifest);

  // Dry-run stops here
  if (opts.dryRun) {
    console.log(chalk.dim('Dry run — nothing was removed.'));
    return;
  }

  // Confirmation (skip with --force)
  if (!opts.force) {
    const { createInterface } = await import('node:readline');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const yes = await new Promise<boolean>((resolve) => {
      rl.question('Continue? (y/N): ', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y');
      });
    });
    if (!yes) {
      console.log(chalk.dim('Cancelled.'));
      return;
    }
  }

  // Step 1: Remove or archive .specweave/
  const specweavePath = path.join(projectPath, '.specweave');
  if (opts.keepData) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const backupPath = path.join(projectPath, `.specweave-backup-${timestamp}`);
    fs.renameSync(specweavePath, backupPath);
    console.log(chalk.green(`   Archived .specweave/ → ${path.basename(backupPath)}`));
  } else {
    fs.rmSync(specweavePath, { recursive: true, force: true });
    console.log(chalk.green('   Removed .specweave/'));
  }

  // Step 2: Clean CLAUDE.md
  const claudePath = path.join(projectPath, 'CLAUDE.md');
  if (manifest.claudeMd === 'delete') {
    fs.unlinkSync(claudePath);
    console.log(chalk.green('   Deleted CLAUDE.md (100% SW-managed)'));
  } else if (manifest.claudeMd === 'strip') {
    const content = fs.readFileSync(claudePath, 'utf-8');
    const stripped = stripSwSections(content);
    if (stripped) {
      fs.writeFileSync(claudePath, stripped + '\n', 'utf-8');
      console.log(chalk.green('   Cleaned CLAUDE.md (preserved user content)'));
    }
  }

  // Step 3: Clean AGENTS.md
  const agentsPath = path.join(projectPath, 'AGENTS.md');
  if (manifest.agentsMd === 'delete') {
    fs.unlinkSync(agentsPath);
    console.log(chalk.green('   Deleted AGENTS.md (100% SW-managed)'));
  } else if (manifest.agentsMd === 'strip') {
    const content = fs.readFileSync(agentsPath, 'utf-8');
    const stripped = stripSwSections(content);
    if (stripped) {
      fs.writeFileSync(agentsPath, stripped + '\n', 'utf-8');
      console.log(chalk.green('   Cleaned AGENTS.md (preserved user content)'));
    }
  }

  // Step 4: Remove git hook
  if (manifest.gitHook) {
    uninstallGitHooks(projectPath);
  }

  // Step 5: Delete vskill.lock
  const lockPath = path.join(projectPath, 'vskill.lock');
  if (manifest.lockfile) {
    fs.unlinkSync(lockPath);
    console.log(chalk.green('   Deleted vskill.lock'));
  }

  // Summary
  console.log(chalk.green('\nSpecWeave has been uninstalled.'));
  console.log(chalk.dim('To reinstall: specweave init\n'));
}
