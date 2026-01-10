/**
 * Smart Save Command - Auto-sync, commit, and push with intelligent message generation
 *
 * Features:
 * - Auto-generated commit messages from git changes
 * - Smart sync (pre-flight check, auto-pull/rebase, auto-stash)
 * - Multi-repo/umbrella support
 * - Interactive and automatic modes
 * - Conflict resolution guidance
 *
 * @module cli/commands/save
 */

import { execFileNoThrow } from '../../utils/execFileNoThrow.js';
import { ConfigManager } from '../../core/config/config-manager.js';
import { getCurrentBranch, detectRepository, isWorkingDirectoryClean } from '../../utils/git-utils.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { scanForChildRepos } from '../../core/living-docs/umbrella-detector.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Save command options
 */
export interface SaveOptions {
  /** Custom commit message */
  message?: string;

  /** Interactive mode - ask before each step */
  interactive?: boolean;

  /** Dry run - preview without executing */
  dryRun?: boolean;

  /** Sync strategy */
  sync?: 'rebase' | 'merge' | 'none';

  /** Skip auto-stash */
  noStash?: boolean;

  /** Only save specific repos (comma-separated) */
  repos?: string;

  /** Skip repos without remotes */
  skipNoRemote?: boolean;

  /** Include all repos (even outside umbrella config) */
  all?: boolean;

  /** Commit but don't push */
  noPush?: boolean;

  /** Force push (requires confirmation) */
  force?: boolean;

  /** Create new branch instead of force pushing */
  branch?: string;

  /** Logger instance */
  logger?: Logger;

  /** Project root path */
  projectRoot?: string;
}

/**
 * Repository information
 */
interface RepoInfo {
  id: string;
  name: string;
  path: string;
  absolutePath: string;
  githubUrl?: string;
  hasRemote: boolean;
  branch: string;
  isDirty: boolean;
  status: string;
}

/**
 * Sync state
 */
interface SyncState {
  state: 'up-to-date' | 'ahead' | 'behind' | 'diverged' | 'no-tracking';
  local: string;
  remote: string;
  base: string;
  aheadBy: number;
  behindBy: number;
}

/**
 * File change information
 */
interface FileChange {
  path: string;
  status: 'new' | 'modified' | 'deleted' | 'renamed';
  category: string;
}

/**
 * Execute save command
 */
export async function executeSave(options: SaveOptions = {}): Promise<void> {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = options.projectRoot ?? process.cwd();
  const interactive = options.interactive ?? false;
  const dryRun = options.dryRun ?? false;
  const syncStrategy = options.sync ?? 'rebase';
  const noStash = options.noStash ?? false;
  const noPush = options.noPush ?? false;
  const force = options.force ?? false;

  try {
    // Step 1: Detect repositories
    logger.log('📡 Scanning for repositories...\n');
    const repos = await detectRepositories(projectRoot, options, logger);

    if (repos.length === 0) {
      logger.log('❌ No repositories found');
      return;
    }

    logger.log(`Mode: ${repos.length === 1 ? 'Single repository' : `Umbrella (${repos.length} child repos)`}\n`);

    if (dryRun) {
      logger.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Step 2: Pre-flight check
    logger.log('🔍 Pre-flight check...\n');
    const syncStates = new Map<string, SyncState>();

    for (const repo of repos) {
      if (!repo.hasRemote) {
        logger.log(`${repo.name}: ⚠️  No remote configured`);
        continue;
      }

      const syncState = await checkSyncState(repo, logger);
      syncStates.set(repo.id, syncState);

      const stateEmoji = {
        'up-to-date': '✓',
        'ahead': '↑',
        'behind': '↓',
        'diverged': '⚠️',
        'no-tracking': '?'
      }[syncState.state];

      logger.log(`${repo.name}: ${stateEmoji} ${syncState.state.toUpperCase()}`);

      if (syncState.state === 'behind') {
        logger.log(`   Will pull ${syncState.behindBy} commit(s) before push`);
      } else if (syncState.state === 'diverged') {
        logger.log(`   Ahead: ${syncState.aheadBy}, Behind: ${syncState.behindBy}`);
      }
    }

    logger.log('');

    // Step 3: Smart sync (auto-pull/rebase if needed)
    if (syncStrategy !== 'none') {
      const needsSync = Array.from(syncStates.values()).some(
        s => s.state === 'behind' || s.state === 'diverged'
      );

      if (needsSync) {
        logger.log('🔄 Syncing repositories...\n');

        for (const repo of repos) {
          const syncState = syncStates.get(repo.id);
          if (!syncState || (syncState.state !== 'behind' && syncState.state !== 'diverged')) {
            continue;
          }

          await syncRepository(repo, syncState, syncStrategy, noStash, dryRun, logger);
        }

        logger.log('');
      }
    }

    // Step 4: Generate/confirm commit messages
    const messages = new Map<string, string>();

    if (options.message) {
      // Use provided message for all repos
      repos.forEach(repo => messages.set(repo.id, options.message!));
    } else {
      // Auto-generate messages
      logger.log('📊 Analyzing changes...\n');

      for (const repo of repos) {
        const changes = await analyzeChanges(repo, logger);

        if (changes.length === 0) {
          logger.log(`${repo.name}: ⏭️  No changes`);
          continue;
        }

        const message = await generateCommitMessage(repo, changes, logger);
        messages.set(repo.id, message);

        logger.log(`${repo.name}:`);
        logger.log(`   🤖 Auto: ${message}`);
      }

      logger.log('');

      if (interactive && !dryRun) {
        logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        logger.log('? Use per-repo messages or same for all?');
        logger.log('  [1] Per-repo (auto-generated)');
        logger.log('  [2] Same message (enter custom)');
        logger.log('  [3] Edit each\n');

        // For now, just use auto-generated
        // TODO: Add actual prompting when interactive mode is used
        logger.log('Using per-repo auto-generated messages\n');
      }
    }

    // Step 5: Commit & Push
    logger.log('💾 Saving changes...\n');

    const results = {
      saved: 0,
      skipped: 0,
      failed: 0,
      synced: 0,
      totalCommits: 0
    };

    for (const repo of repos) {
      const message = messages.get(repo.id);

      if (!message) {
        logger.log(`${repo.name}: ⏭️  Skipped (no changes)`);
        results.skipped++;
        continue;
      }

      try {
        await commitAndPush(repo, message, noPush, force, dryRun, logger);
        results.saved++;

        const syncState = syncStates.get(repo.id);
        if (syncState && (syncState.state === 'behind' || syncState.state === 'diverged')) {
          results.synced++;
        }
      } catch (error: any) {
        logger.error(`${repo.name}: ❌ Failed - ${error.message}`);
        results.failed++;
      }
    }

    // Summary
    logger.log('');
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    logger.log('✅ SUMMARY\n');

    if (results.synced > 0) {
      logger.log(`  Synced:    ${results.synced} repo(s)`);
    }
    logger.log(`  Saved:     ${results.saved}/${repos.length} repo(s)`);
    if (results.skipped > 0) {
      logger.log(`  Skipped:   ${results.skipped} (no changes)`);
    }
    if (results.failed > 0) {
      logger.log(`  Failed:    ${results.failed}`);
    }

    logger.log('');

    // Show commit messages
    if (results.saved > 0) {
      logger.log('  Commits:');
      for (const repo of repos) {
        const message = messages.get(repo.id);
        if (message) {
          logger.log(`    ${repo.name}: ${message}`);
        }
      }
    }

  } catch (error: any) {
    logger.error(`❌ Save failed: ${error.message}`);
    throw error;
  }
}

/**
 * Detect all repositories (single or umbrella)
 *
 * Detection order:
 * 1. Umbrella config (explicit childRepos in config.json)
 * 2. Git-scan fallback (auto-discover nested .git directories like repositories/)
 * 3. Single repo mode (current directory only)
 */
async function detectRepositories(
  projectRoot: string,
  options: SaveOptions,
  logger: Logger
): Promise<RepoInfo[]> {
  const configManager = new ConfigManager(projectRoot, logger);
  const config = await configManager.read();

  const repos: RepoInfo[] = [];

  // Strategy 1: Check if umbrella mode is explicitly configured
  if (config.umbrella?.enabled && config.umbrella?.childRepos?.length) {
    logger.log(`Umbrella mode: ${config.umbrella.childRepos.length} child repos (from config)`);

    for (const childRepo of config.umbrella.childRepos) {
      const repoPath = path.resolve(projectRoot, childRepo.path);
      // Use id as fallback for name if name property doesn't exist
      const repoName = (childRepo as any).name || childRepo.id;
      const githubUrl = (childRepo as any).githubUrl;
      const repoInfo = await getRepoInfo(childRepo.id, repoName, repoPath, githubUrl, logger);

      if (repoInfo) {
        repos.push(repoInfo);
      }
    }
  } else {
    // Strategy 2: Auto-detect nested git repositories (repositories/ folder, etc.)
    const scanResult = await scanForChildRepos(projectRoot, 3);

    if (scanResult.isUmbrella && scanResult.config?.childRepos?.length) {
      logger.log(`Auto-detected ${scanResult.config.childRepos.length} nested repositories`);

      for (const childRepo of scanResult.config.childRepos) {
        const repoPath = path.resolve(projectRoot, childRepo.path);
        const repoInfo = await getRepoInfo(childRepo.id, childRepo.name, repoPath, undefined, logger);

        if (repoInfo) {
          repos.push(repoInfo);
        }
      }
    }

    // Strategy 3: Also include parent project if it has git (single repo or umbrella parent)
    const parentRepoInfo = await getRepoInfo('main', path.basename(projectRoot), projectRoot, undefined, logger);

    if (parentRepoInfo) {
      // If we found child repos, parent is "umbrella-parent", otherwise it's "single repo"
      if (repos.length > 0) {
        parentRepoInfo.id = 'umbrella-parent';
        parentRepoInfo.name = `${path.basename(projectRoot)} (parent)`;
      }
      repos.unshift(parentRepoInfo); // Add parent first
    }
  }

  // Filter by requested repos
  if (options.repos) {
    const requested = options.repos.split(',').map(r => r.trim());
    return repos.filter(r => requested.includes(r.id) || requested.includes(r.name));
  }

  return repos;
}

/**
 * Get repository information
 */
async function getRepoInfo(
  id: string,
  name: string,
  repoPath: string,
  githubUrl: string | undefined,
  logger: Logger
): Promise<RepoInfo | null> {
  try {
    // Check if directory exists
    await fs.access(repoPath);

    // Check if it's a git repo
    const gitCheck = await execFileNoThrow('git', ['rev-parse', '--git-dir'], { cwd: repoPath });
    if (gitCheck.exitCode !== 0) {
      return null;
    }

    // Get branch
    const branch = await getCurrentBranch(repoPath);

    // Check if remote exists
    const remoteCheck = await execFileNoThrow('git', ['remote', 'get-url', 'origin'], { cwd: repoPath });
    const hasRemote = remoteCheck.exitCode === 0;

    // Check if working directory is dirty
    const isDirty = !(await isWorkingDirectoryClean(repoPath));

    // Get status
    const statusResult = await execFileNoThrow('git', ['status', '--porcelain'], { cwd: repoPath });
    const status = statusResult.stdout.trim();

    return {
      id,
      name,
      path: path.relative(process.cwd(), repoPath),
      absolutePath: repoPath,
      githubUrl,
      hasRemote,
      branch,
      isDirty,
      status
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check sync state with remote
 */
async function checkSyncState(repo: RepoInfo, logger: Logger): Promise<SyncState> {
  try {
    // Fetch without merge
    await execFileNoThrow('git', ['fetch', 'origin'], { cwd: repo.absolutePath });

    // Get refs
    const localResult = await execFileNoThrow('git', ['rev-parse', 'HEAD'], { cwd: repo.absolutePath });
    const local = localResult.stdout.trim();

    const remoteResult = await execFileNoThrow('git', ['rev-parse', '@{u}'], { cwd: repo.absolutePath });

    if (remoteResult.exitCode !== 0) {
      return {
        state: 'no-tracking',
        local,
        remote: '',
        base: '',
        aheadBy: 0,
        behindBy: 0
      };
    }

    const remote = remoteResult.stdout.trim();

    const baseResult = await execFileNoThrow('git', ['merge-base', 'HEAD', '@{u}'], { cwd: repo.absolutePath });
    const base = baseResult.stdout.trim();

    // Count commits
    const aheadResult = await execFileNoThrow('git', ['rev-list', '--count', `${remote}..HEAD`], { cwd: repo.absolutePath });
    const aheadBy = parseInt(aheadResult.stdout.trim() || '0', 10);

    const behindResult = await execFileNoThrow('git', ['rev-list', '--count', `HEAD..${remote}`], { cwd: repo.absolutePath });
    const behindBy = parseInt(behindResult.stdout.trim() || '0', 10);

    // Determine state
    let state: SyncState['state'];

    if (local === remote) {
      state = 'up-to-date';
    } else if (local === base) {
      state = 'behind';
    } else if (remote === base) {
      state = 'ahead';
    } else {
      state = 'diverged';
    }

    return {
      state,
      local,
      remote,
      base,
      aheadBy,
      behindBy
    };
  } catch (error: any) {
    throw new Error(`Failed to check sync state: ${error.message}`);
  }
}

/**
 * Sync repository with remote
 */
async function syncRepository(
  repo: RepoInfo,
  syncState: SyncState,
  strategy: 'rebase' | 'merge',
  noStash: boolean,
  dryRun: boolean,
  logger: Logger
): Promise<void> {
  logger.log(`${repo.name}:`);

  try {
    // Stash if dirty and not noStash
    let stashed = false;

    if (repo.isDirty && !noStash) {
      logger.log('   📦 Stashing uncommitted changes...');

      if (!dryRun) {
        const stashResult = await execFileNoThrow(
          'git',
          ['stash', 'push', '-m', 'specweave-save-autostash'],
          { cwd: repo.absolutePath }
        );

        if (stashResult.exitCode !== 0) {
          throw new Error(`Stash failed: ${stashResult.stderr}`);
        }

        stashed = true;
      }
    }

    // Pull with strategy
    const pullArgs = strategy === 'rebase' ? ['pull', '--rebase', 'origin', repo.branch] : ['pull', 'origin', repo.branch];

    logger.log(`   🔄 ${dryRun ? 'Would pull' : 'Pulling'}: git ${pullArgs.join(' ')}`);

    if (!dryRun) {
      const pullResult = await execFileNoThrow('git', pullArgs, { cwd: repo.absolutePath });

      if (pullResult.exitCode !== 0) {
        // Check if it's a conflict
        if (pullResult.stderr.includes('CONFLICT') || pullResult.stderr.includes('conflict')) {
          throw new Error('Merge conflict detected - please resolve manually');
        }

        throw new Error(`Pull failed: ${pullResult.stderr}`);
      }

      logger.log(`   ✓ Synced (${syncState.behindBy} commit(s))`);
    }

    // Restore stash
    if (stashed && !dryRun) {
      logger.log('   📦 Restoring stashed changes...');

      const unstashResult = await execFileNoThrow('git', ['stash', 'pop'], { cwd: repo.absolutePath });

      if (unstashResult.exitCode !== 0) {
        throw new Error(`Unstash failed: ${unstashResult.stderr}`);
      }
    }

    logger.log('');
  } catch (error: any) {
    logger.error(`   ❌ Sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze git changes
 */
async function analyzeChanges(repo: RepoInfo, logger: Logger): Promise<FileChange[]> {
  const statusResult = await execFileNoThrow('git', ['status', '--porcelain'], { cwd: repo.absolutePath });

  if (statusResult.exitCode !== 0) {
    return [];
  }

  const lines = statusResult.stdout.trim().split('\n').filter(l => l);
  const changes: FileChange[] = [];

  for (const line of lines) {
    if (line.length < 4) continue;

    const statusCode = line.substring(0, 2);
    const filePath = line.substring(3);

    let status: FileChange['status'];

    if (statusCode.includes('??') || statusCode.includes('A')) {
      status = 'new';
    } else if (statusCode.includes('M')) {
      status = 'modified';
    } else if (statusCode.includes('D')) {
      status = 'deleted';
    } else if (statusCode.includes('R')) {
      status = 'renamed';
    } else {
      status = 'modified';
    }

    const category = categorizeFile(filePath);

    changes.push({
      path: filePath,
      status,
      category
    });
  }

  return changes;
}

/**
 * Categorize file by type
 */
function categorizeFile(filePath: string): string {
  const patterns: Array<{ pattern: RegExp | ((p: string) => boolean); category: string }> = [
    { pattern: /\.(md|txt|rst)$/i, category: 'docs' },
    { pattern: (p) => p.includes('docs/') || p.includes('README'), category: 'docs' },
    { pattern: /\.(test|spec)\.(ts|js|tsx|jsx)$/i, category: 'tests' },
    { pattern: (p) => p.includes('tests/') || p.includes('__tests__/'), category: 'tests' },
    { pattern: /package(-lock)?\.json|yarn\.lock|.*\.config\.(ts|js)|tsconfig/i, category: 'config' },
    { pattern: (p) => p.includes('.github/') || p.includes('.gitlab-ci') || p.includes('Jenkinsfile'), category: 'ci' },
    { pattern: (p) => p.includes('dist/') || p.includes('build/'), category: 'build' },
    { pattern: (p) => p.includes('.specweave/increments/'), category: 'increment' },
    { pattern: /\.(css|scss|less|sass)$/i, category: 'styles' },
    { pattern: (p) => p.includes('scripts/') || p.includes('bin/'), category: 'scripts' },
    { pattern: /\.(ts|js|tsx|jsx|py|go|rs|java|c|cpp|cs)$/i, category: 'source' },
  ];

  for (const { pattern, category } of patterns) {
    const matches = typeof pattern === 'function' ? pattern(filePath) : pattern.test(filePath);
    if (matches) {
      // Special case: source files that are tests should be categorized as tests
      if (category === 'source' && (filePath.includes('.test.') || filePath.includes('.spec.'))) {
        return 'tests';
      }
      return category;
    }
  }

  return 'other';
}

/**
 * Generate commit message from changes
 */
async function generateCommitMessage(
  repo: RepoInfo,
  changes: FileChange[],
  logger: Logger
): Promise<string> {
  // Count by category
  const categoryCounts = new Map<string, number>();
  for (const change of changes) {
    categoryCounts.set(change.category, (categoryCounts.get(change.category) || 0) + 1);
  }

  // Count by status
  const statusCounts = new Map<FileChange['status'], number>();
  for (const change of changes) {
    statusCounts.set(change.status, (statusCounts.get(change.status) || 0) + 1);
  }

  // Determine primary type
  const sortedCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  const primaryCategory = sortedCategories[0]?.[0] || 'other';

  // Map category to commit type
  const typeMap: Record<string, string> = {
    docs: 'docs',
    source: 'feat',
    tests: 'test',
    config: 'chore',
    ci: 'ci',
    build: 'build',
    increment: 'feat',
    styles: 'style',
    scripts: 'chore',
    other: 'chore'
  };

  const commitType = typeMap[primaryCategory] || 'chore';

  // Determine action verb
  const newCount = statusCounts.get('new') || 0;
  const modifiedCount = statusCounts.get('modified') || 0;
  const deletedCount = statusCounts.get('deleted') || 0;

  let action: string;

  if (deletedCount > newCount && deletedCount > modifiedCount) {
    action = 'remove';
  } else if (newCount > modifiedCount) {
    action = 'add';
  } else {
    action = 'update';
  }

  // Derive scope from common path
  const commonPath = findCommonPath(changes.map(c => c.path));
  const scope = commonPath ? path.basename(path.dirname(commonPath)) : '';

  // Check for active increment
  let incrementContext = '';
  const incrementFiles = changes.filter(c => c.category === 'increment');

  if (incrementFiles.length > 0) {
    // Try to extract increment name
    const match = incrementFiles[0].path.match(/increments\/(\d{4}E?-[^/]+)/);
    if (match) {
      incrementContext = ` (${match[1]})`;
    }
  }

  // Generate description
  let description: string;

  if (changes.length === 1) {
    const fileName = path.basename(changes[0].path, path.extname(changes[0].path));
    description = `${action} ${fileName}`;
  } else if (primaryCategory === 'docs' && changes.length <= 5) {
    description = `${action} documentation`;
  } else if (primaryCategory === 'tests') {
    description = `${action} tests`;
  } else if (changes.length <= 5) {
    description = `${action} ${primaryCategory} files`;
  } else {
    description = `${action} ${primaryCategory}`;
  }

  // Build final message
  const scopePart = scope ? `(${scope})` : '';
  const message = `${commitType}${scopePart}: ${description}${incrementContext}`;

  return message;
}

/**
 * Find common path prefix
 */
function findCommonPath(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return paths[0];

  const parts = paths.map(p => p.split('/'));
  const minLength = Math.min(...parts.map(p => p.length));

  let commonParts: string[] = [];

  for (let i = 0; i < minLength; i++) {
    const part = parts[0][i];
    if (parts.every(p => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.join('/');
}

/**
 * Commit and push changes
 */
async function commitAndPush(
  repo: RepoInfo,
  message: string,
  noPush: boolean,
  force: boolean,
  dryRun: boolean,
  logger: Logger
): Promise<void> {
  logger.log(`${repo.name}:`);

  try {
    // Add all changes
    if (dryRun) {
      logger.log('   Would: git add -A');
    } else {
      const addResult = await execFileNoThrow('git', ['add', '-A'], { cwd: repo.absolutePath });

      if (addResult.exitCode !== 0) {
        throw new Error(`git add failed: ${addResult.stderr}`);
      }
    }

    // Commit
    if (dryRun) {
      logger.log(`   Would: git commit -m "${message}"`);
    } else {
      const commitResult = await execFileNoThrow('git', ['commit', '-m', message], { cwd: repo.absolutePath });

      if (commitResult.exitCode !== 0) {
        // Check if nothing to commit
        if (commitResult.stdout.includes('nothing to commit') || commitResult.stdout.includes('no changes')) {
          logger.log('   ⏭️  No changes to commit');
          return;
        }

        throw new Error(`git commit failed: ${commitResult.stderr}`);
      }
    }

    // Push
    if (!noPush) {
      const pushArgs = force ? ['push', '--force', 'origin', repo.branch] : ['push', 'origin', repo.branch];

      if (dryRun) {
        logger.log(`   Would: git ${pushArgs.join(' ')}`);
      } else {
        const pushResult = await execFileNoThrow('git', pushArgs, { cwd: repo.absolutePath });

        if (pushResult.exitCode !== 0) {
          throw new Error(`git push failed: ${pushResult.stderr}`);
        }

        logger.log('   ✓ Done!');
      }
    } else {
      logger.log('   ✓ Committed (not pushed)');
    }

    logger.log('');
  } catch (error: any) {
    throw error;
  }
}
