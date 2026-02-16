/**
 * Umbrella Migrator
 *
 * Converts single-repo SpecWeave projects to umbrella/multi-repo structure.
 * Creates a sibling umbrella directory and moves SpecWeave-managed files to it,
 * leaving the original project completely untouched.
 *
 * @module core/migration/umbrella-migrator
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import { isWorkingDirectoryClean, detectRepository } from '../../utils/git-utils.js';
import { persistUmbrellaConfig } from '../living-docs/umbrella-detector.js';
import type {
  MigrationCandidate,
  MigrationPlan,
  MigrationStep,
  MigrationResult,
  MigrationOptions,
  AddRepoResult,
} from './types.js';
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';

// ---------------------------------------------------------------------------
// Detection (T-002)
// ---------------------------------------------------------------------------

/**
 * Detects whether the current project is a single-repo SpecWeave project
 * eligible for umbrella migration.
 */
export async function detectSingleRepoProject(
  projectRoot: string,
  logger: Logger = consoleLogger,
): Promise<MigrationCandidate | null> {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    logger.debug('No .specweave/config.json found — not a SpecWeave project');
    return null;
  }

  let config: Record<string, any>;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    logger.warn('Could not parse .specweave/config.json');
    return null;
  }

  if (config.umbrella?.enabled) {
    logger.log('Project is already an umbrella — nothing to migrate');
    return null;
  }

  // Extract org name from config or git remote
  let orgName = config.repository?.organization || '';
  let repoName = config.project?.name || path.basename(projectRoot);

  if (!orgName) {
    const repo = await detectRepository('origin', projectRoot);
    if (repo) {
      orgName = repo.owner;
      if (!config.project?.name) {
        repoName = repo.repo;
      }
    }
  }

  return {
    projectRoot,
    configPath,
    orgName: orgName || path.basename(path.dirname(projectRoot)),
    repoName,
    hasClaudeMd: fs.existsSync(path.join(projectRoot, 'CLAUDE.md')),
    hasAgentsMd: fs.existsSync(path.join(projectRoot, 'AGENTS.md')),
    hasDocsSite: fs.existsSync(path.join(projectRoot, 'docs-site')),
  };
}

// ---------------------------------------------------------------------------
// Plan generation (T-003)
// ---------------------------------------------------------------------------

/**
 * Generates an ordered migration plan from a candidate.
 */
export function generateMigrationPlan(
  candidate: MigrationCandidate,
  options: MigrationOptions = {},
): MigrationPlan {
  const umbrellaName =
    options.umbrellaName || `${candidate.repoName}-umb`;
  const umbrellaPath =
    options.umbrellaPath ||
    path.join(path.dirname(candidate.projectRoot), umbrellaName);

  const steps: MigrationStep[] = [];

  // 1. Create umbrella directory
  steps.push({
    type: 'create-dir',
    destination: umbrellaPath,
    description: `Create umbrella directory: ${umbrellaName}/`,
  });

  // 2. Create repositories dir
  const reposDir = path.join(umbrellaPath, 'repositories', candidate.orgName);
  steps.push({
    type: 'create-dir',
    destination: reposDir,
    description: `Create repositories/${candidate.orgName}/`,
  });

  // 3. Move .specweave/
  steps.push({
    type: 'move',
    source: path.join(candidate.projectRoot, '.specweave'),
    destination: path.join(umbrellaPath, '.specweave'),
    description: 'Move .specweave/ to umbrella root',
  });

  // 4. Move CLAUDE.md (if exists)
  if (candidate.hasClaudeMd) {
    steps.push({
      type: 'move',
      source: path.join(candidate.projectRoot, 'CLAUDE.md'),
      destination: path.join(umbrellaPath, 'CLAUDE.md'),
      description: 'Move CLAUDE.md to umbrella root',
    });
  }

  // 5. Move AGENTS.md (if exists)
  if (candidate.hasAgentsMd) {
    steps.push({
      type: 'move',
      source: path.join(candidate.projectRoot, 'AGENTS.md'),
      destination: path.join(umbrellaPath, 'AGENTS.md'),
      description: 'Move AGENTS.md to umbrella root',
    });
  }

  // 6. Move docs-site/ (if exists)
  if (candidate.hasDocsSite) {
    steps.push({
      type: 'move',
      source: path.join(candidate.projectRoot, 'docs-site'),
      destination: path.join(umbrellaPath, 'docs-site'),
      description: 'Move docs-site/ to umbrella root',
    });
  }

  // 7. Update config.json with umbrella settings
  steps.push({
    type: 'update-config',
    destination: path.join(umbrellaPath, '.specweave', 'config.json'),
    description: `Set umbrella.enabled=true, register ${candidate.repoName} as first childRepo`,
  });

  return { candidate, steps, umbrellaPath, umbrellaName };
}

// ---------------------------------------------------------------------------
// Backup (T-004)
// ---------------------------------------------------------------------------

/**
 * Creates a backup of .specweave/ before migration.
 */
export async function createBackup(
  projectRoot: string,
  logger: Logger = consoleLogger,
): Promise<string> {
  const specweavePath = path.join(projectRoot, '.specweave');
  const backupDir = path.join(
    specweavePath,
    'backups',
    `pre-migration-${Date.now()}`,
  );

  await fs.promises.mkdir(backupDir, { recursive: true });

  // Recursively copy .specweave/ contents (excluding backups/ to avoid recursion)
  await copyDirRecursive(specweavePath, backupDir, ['backups']);
  logger.log(`   Backup created: ${backupDir}`);

  // Initialize migration log
  const logsDir = path.join(specweavePath, 'logs');
  await fs.promises.mkdir(logsDir, { recursive: true });
  const logFile = path.join(logsDir, 'migration.log');
  const entry = `[${new Date().toISOString()}] Migration backup created at ${backupDir}\n`;
  await fs.promises.appendFile(logFile, entry);

  return backupDir;
}

/**
 * Recursively copy directory contents, skipping listed directories.
 */
async function copyDirRecursive(
  src: string,
  dest: string,
  skipDirs: string[] = [],
): Promise<void> {
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await fs.promises.mkdir(destPath, { recursive: true });
      await copyDirRecursive(srcPath, destPath, skipDirs);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Uncommitted changes guard (T-006)
// ---------------------------------------------------------------------------

/**
 * Checks for uncommitted changes and throws if dirty.
 */
export async function guardUncommittedChanges(
  projectRoot: string,
): Promise<void> {
  const clean = await isWorkingDirectoryClean(projectRoot);
  if (!clean) {
    throw new Error(
      'Uncommitted changes detected. Please commit or stash your changes before migrating.\n' +
        '  git add -A && git commit -m "pre-migration snapshot"\n' +
        '  — or —\n' +
        '  git stash',
    );
  }
}

// ---------------------------------------------------------------------------
// Execution (T-005)
// ---------------------------------------------------------------------------

/**
 * Executes a migration plan, moving files to the umbrella directory.
 */
export async function executeMigration(
  plan: MigrationPlan,
  logger: Logger = consoleLogger,
): Promise<MigrationResult> {
  const errors: string[] = [];
  let completed = 0;

  // Create backup first
  let backupPath: string | undefined;
  try {
    backupPath = await createBackup(plan.candidate.projectRoot, logger);
  } catch (err) {
    const msg = `Backup failed: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(msg);
    return {
      success: false,
      stepsCompleted: 0,
      stepsTotal: plan.steps.length,
      errors: [msg],
    };
  }

  // Log start
  await appendMigrationLog(
    plan.candidate.projectRoot,
    `Migration started: ${plan.umbrellaName} at ${plan.umbrellaPath}`,
  );

  for (const step of plan.steps) {
    try {
      await executeStep(step, plan, logger);
      completed++;
      await appendMigrationLog(
        plan.candidate.projectRoot,
        `  Step ${completed}/${plan.steps.length}: ${step.description} — OK`,
      );
    } catch (err) {
      const msg = `Step "${step.description}" failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      logger.error(msg);
      await appendMigrationLog(plan.candidate.projectRoot, `  FAILED: ${msg}`);
      break; // Stop on first failure
    }
  }

  const success = errors.length === 0;
  await appendMigrationLog(
    plan.candidate.projectRoot,
    `Migration ${success ? 'completed successfully' : 'failed'}`,
  );

  return {
    success,
    stepsCompleted: completed,
    stepsTotal: plan.steps.length,
    backupPath,
    errors,
    umbrellaPath: success ? plan.umbrellaPath : undefined,
  };
}

async function executeStep(
  step: MigrationStep,
  plan: MigrationPlan,
  logger: Logger,
): Promise<void> {
  switch (step.type) {
    case 'create-dir':
      await fs.promises.mkdir(step.destination, { recursive: true });
      logger.log(`   Created: ${path.relative(path.dirname(plan.umbrellaPath), step.destination)}`);
      break;

    case 'move':
      if (!step.source) throw new Error('Move step requires source');
      // Use rename for same-filesystem moves, fall back to copy+delete
      try {
        await fs.promises.rename(step.source, step.destination);
      } catch {
        // Cross-device move: copy then delete
        const stat = await fs.promises.stat(step.source);
        if (stat.isDirectory()) {
          await fs.promises.mkdir(step.destination, { recursive: true });
          await copyDirRecursive(step.source, step.destination);
          await fs.promises.rm(step.source, { recursive: true });
        } else {
          await fs.promises.copyFile(step.source, step.destination);
          await fs.promises.unlink(step.source);
        }
      }
      logger.log(`   Moved: ${path.basename(step.source!)} -> umbrella`);
      break;

    case 'copy':
      if (!step.source) throw new Error('Copy step requires source');
      await fs.promises.copyFile(step.source, step.destination);
      logger.log(`   Copied: ${path.basename(step.source)}`);
      break;

    case 'update-config': {
      // Update config.json with umbrella settings
      const configPath = step.destination;
      let config: Record<string, any> = {};
      if (fs.existsSync(configPath)) {
        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
          // Start fresh
        }
      }

      const repoName = plan.candidate.repoName;
      const childRepo = {
        id: repoName,
        path: path.relative(plan.umbrellaPath, plan.candidate.projectRoot),
        name: repoName,
        prefix: repoName.substring(0, 3).toUpperCase(),
      };

      config.umbrella = {
        enabled: true,
        childRepos: [childRepo],
      };
      // Ensure directory exists (config.json was moved as part of .specweave/)
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
      }
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      logger.log(`   Config updated: umbrella.enabled=true, childRepo=${repoName}`);
      break;
    }

    case 'create-file':
      await fs.promises.writeFile(step.destination, '', 'utf-8');
      logger.log(`   Created: ${path.basename(step.destination)}`);
      break;
  }
}

// ---------------------------------------------------------------------------
// Rollback (T-007)
// ---------------------------------------------------------------------------

/**
 * Rolls back a migration using the backup.
 */
export async function rollbackMigration(
  projectRoot: string,
  logger: Logger = consoleLogger,
): Promise<MigrationResult> {
  const backupsDir = path.join(projectRoot, '.specweave', 'backups');

  // Find the latest pre-migration backup
  let latestBackup: string | null = null;
  try {
    const entries = await fs.promises.readdir(backupsDir);
    const migrationBackups = entries
      .filter((e) => e.startsWith('pre-migration-'))
      .sort()
      .reverse();

    if (migrationBackups.length > 0) {
      latestBackup = path.join(backupsDir, migrationBackups[0]);
    }
  } catch {
    // No backups directory
  }

  if (!latestBackup) {
    return {
      success: false,
      stepsCompleted: 0,
      stepsTotal: 1,
      errors: ['No migration backup found. Cannot rollback.'],
    };
  }

  // Validate backup has config.json
  const backupConfigPath = path.join(latestBackup, 'config.json');
  if (!fs.existsSync(backupConfigPath)) {
    return {
      success: false,
      stepsCompleted: 0,
      stepsTotal: 1,
      errors: ['Backup is invalid: missing config.json'],
    };
  }

  logger.log(`Rolling back from backup: ${latestBackup}`);

  try {
    // Restore .specweave/ contents from backup
    const specweavePath = path.join(projectRoot, '.specweave');

    // Remove current contents except backups/
    const currentEntries = await fs.promises.readdir(specweavePath);
    for (const entry of currentEntries) {
      if (entry === 'backups') continue;
      const entryPath = path.join(specweavePath, entry);
      await fs.promises.rm(entryPath, { recursive: true });
    }

    // Copy backup contents back
    await copyDirRecursive(latestBackup, specweavePath, ['backups']);

    await appendMigrationLog(projectRoot, `Rollback completed from ${latestBackup}`);

    logger.log('   Rollback completed successfully');

    return {
      success: true,
      stepsCompleted: 1,
      stepsTotal: 1,
      backupPath: latestBackup,
      errors: [],
    };
  } catch (err) {
    const msg = `Rollback failed: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(msg);
    return {
      success: false,
      stepsCompleted: 0,
      stepsTotal: 1,
      errors: [msg],
    };
  }
}

// ---------------------------------------------------------------------------
// Add Repo (T-010)
// ---------------------------------------------------------------------------

/**
 * Adds a new repository to an existing umbrella workspace.
 */
export async function addRepoToUmbrella(
  umbrellaPath: string,
  repoName: string,
  orgName: string,
  options: {
    description?: string;
    visibility?: 'public' | 'private';
    prefix?: string;
  } = {},
  logger: Logger = consoleLogger,
): Promise<AddRepoResult> {
  const repoDir = path.join(umbrellaPath, 'repositories', orgName, repoName);

  // Check if gh CLI is available
  const ghAvailable = await isGhCliAvailable();

  if (ghAvailable) {
    // Create via gh CLI
    const fullName = `${orgName}/${repoName}`;
    const args = ['repo', 'create', fullName, '--clone'];
    if (options.description) args.push('--description', options.description);
    if (options.visibility === 'public') {
      args.push('--public');
    } else {
      args.push('--private');
    }

    logger.log(`   Creating GitHub repo: ${fullName}`);

    // Ensure parent directory exists
    const parentDir = path.join(umbrellaPath, 'repositories', orgName);
    await fs.promises.mkdir(parentDir, { recursive: true });

    const result = await execFileNoThrow('gh', args, { cwd: parentDir });
    if (result.exitCode !== 0) {
      // Fall back to local directory
      logger.warn(`   gh repo create failed: ${result.stderr}`);
      logger.log('   Falling back to local directory creation');
      await fs.promises.mkdir(repoDir, { recursive: true });
    }
  } else {
    logger.log('   gh CLI not available — creating local directory only');
    logger.log('   To create GitHub repos, install gh: https://cli.github.com/');
    await fs.promises.mkdir(repoDir, { recursive: true });
  }

  // Register in config using persistUmbrellaConfig for dedup-safe merge
  const prefix = options.prefix || repoName.substring(0, 3).toUpperCase();
  await persistUmbrellaConfig(umbrellaPath, {
    enabled: true,
    childRepos: [{
      id: repoName,
      path: `repositories/${orgName}/${repoName}`,
      name: repoName,
    }],
  });

  // Also persist the prefix (persistUmbrellaConfig doesn't handle it)
  const configPath = path.join(umbrellaPath, '.specweave', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const repo = config.umbrella?.childRepos?.find((r: any) => r.id === repoName);
      if (repo) {
        repo.prefix = prefix;
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      }
    } catch {
      // Non-fatal
    }
  }

  logger.log(`   Registered ${repoName} in umbrella config (prefix: ${prefix})`);

  return {
    success: true,
    repoName,
    repoPath: repoDir,
    usedGhCli: ghAvailable,
  };
}

/**
 * Checks if gh CLI is available and authenticated.
 */
async function isGhCliAvailable(): Promise<boolean> {
  const whichResult = await execFileNoThrow('which', ['gh']);
  if (whichResult.exitCode !== 0) return false;

  const authResult = await execFileNoThrow('gh', ['auth', 'status']);
  return authResult.exitCode === 0;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function appendMigrationLog(
  projectRoot: string,
  message: string,
): Promise<void> {
  const logFile = path.join(projectRoot, '.specweave', 'logs', 'migration.log');
  try {
    const logsDir = path.dirname(logFile);
    if (!fs.existsSync(logsDir)) {
      await fs.promises.mkdir(logsDir, { recursive: true });
    }
    await fs.promises.appendFile(
      logFile,
      `[${new Date().toISOString()}] ${message}\n`,
    );
  } catch {
    // Logging failure is non-fatal
  }
}
