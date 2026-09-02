/**
 * `specweave sync` — the ONE external-tracker sync surface.
 *
 *   sync push   [incrementId] [--reconcile] [--dry-run] [--no-create] [--provider] [--force]
 *   sync pull   [--create-increments] [--provider] [--since]
 *   sync status [--json] [--provider] [--quick]
 *   sync setup  [--validate] [--provider] [--quick]
 *
 * Every verb delegates to the code path that already works:
 *   push   → sync-progress (tasks → ACs → living docs → GitHub/Jira/ADO) + retry-queue drain
 *   pull   → external-change-puller (report) / importers (--create-increments)
 *   status → token source + account, provider health, resilience state, sync gaps
 *   setup  → sync-setup wizard (or health validation with --validate)
 *
 * @module cli/commands/sync
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { consoleLogger, type Logger } from '../../utils/logger.js';
import {
  resolveGitHubToken,
  describeGitHubAuth,
  resolveGitHubLogin,
  type GitHubAuth,
} from '../../utils/auth-helpers.js';
import { syncProgress } from './sync-progress.js';
import { syncRetryCommand } from './sync-retry.js';
import { syncStatusCommand, type SyncStatusResult } from './sync-status.js';
import { detectSyncGaps, type SyncGapItem } from './sync-gaps.js';
import { syncSetupCommand, type SyncSetupProvider } from './sync-setup.js';
import { syncHealthCommand, runHealthChecksForConfig, getEnabledProviders } from './sync-health.js';
import type { HealthCheckResult } from '../../sync/integration-health-check.js';

export type SyncProvider = 'github' | 'jira' | 'ado';

const ALL_PROVIDERS: SyncProvider[] = ['github', 'jira', 'ado'];

export interface SyncPushOptions {
  incrementId?: string;
  reconcile?: boolean;
  dryRun?: boolean;
  /** Auto-create missing external issues (default true; `--no-create` disables). */
  create?: boolean;
  provider?: SyncProvider;
  force?: boolean;
}

export interface SyncPullOptions {
  /** Create SpecWeave increments from external issues (delegates to the importers). */
  createIncrements?: boolean;
  provider?: SyncProvider;
  /** ISO date or number of days to look back (default 7). */
  since?: string;
}

export interface SyncStatusOptions {
  json?: boolean;
  provider?: SyncProvider;
  /** Skip network probes (account lookup, provider health). */
  quick?: boolean;
}

export interface SyncSetupOptions {
  provider?: SyncProvider;
  quick?: boolean;
  /** Validate the existing configuration instead of running the wizard. */
  validate?: boolean;
}

export interface GitHubTokenStatus {
  source: GitHubAuth['source'];
  origin: GitHubAuth['origin'];
  isOAuthToken: boolean;
  login: string | null;
  repo: string | null;
  canPush: boolean | null;
  description: string;
}

export interface SyncStatusReport {
  providers: SyncProvider[];
  github?: GitHubTokenStatus;
  health: HealthCheckResult[];
  resilience?: SyncStatusResult;
  gaps: SyncGapItem[];
  hasIssues: boolean;
  exitCode: number;
}

export interface SyncDeps {
  logger?: Logger;
  projectRoot?: string;
  syncProgress?: typeof syncProgress;
  syncRetry?: typeof syncRetryCommand;
  resolveLogin?: (token: string) => string | null;
  /** Probe `owner/repo` push permission for the active token (null = unknown). */
  probeCanPush?: (token: string, owner: string, repo: string) => Promise<boolean | null>;
  runHealthChecks?: typeof runHealthChecksForConfig;
  syncStatus?: typeof syncStatusCommand;
  detectGaps?: typeof detectSyncGaps;
  syncSetup?: typeof syncSetupCommand;
  syncHealth?: typeof syncHealthCommand;
  runImport?: (projectRoot: string) => Promise<unknown>;
}

function parseProvider(value: string | undefined): SyncProvider | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === 'azure-devops' || v === 'azure') return 'ado';
  if (ALL_PROVIDERS.includes(v as SyncProvider)) return v as SyncProvider;
  throw new Error(`Unknown provider '${value}'. Use one of: ${ALL_PROVIDERS.join(', ')}`);
}

function readConfig(projectRoot: string): Record<string, any> | null {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

/** Explicit token + owner/repo from config.json (legacy sync.github block or a github profile). */
export function readGitHubConfig(config: Record<string, any> | null): { token?: string; owner?: string; repo?: string } {
  if (!config?.sync) return {};
  const legacy = config.sync.github;
  if (legacy?.owner && legacy?.repo) {
    return { token: legacy.token, owner: legacy.owner, repo: legacy.repo };
  }
  const profiles = Object.values(config.sync.profiles ?? {}) as Array<{ provider?: string; config?: Record<string, any> }>;
  const gh = profiles.find((p) => p?.provider === 'github' && p?.config?.owner && p?.config?.repo);
  if (gh?.config) {
    return { token: gh.config.token ?? legacy?.token, owner: gh.config.owner, repo: gh.config.repo };
  }
  return { token: legacy?.token };
}

/** Build the argv that sync-progress understands from typed push options. */
export function buildPushArgs(options: SyncPushOptions): string[] {
  const args: string[] = [];
  if (options.incrementId) args.push(options.incrementId);
  if (options.dryRun) args.push('--dry-run');
  if (options.create === false) args.push('--no-create');
  if (options.force) args.push('--force');
  if (options.reconcile) args.push('--reconcile');
  if (options.provider) {
    for (const p of ALL_PROVIDERS) {
      if (p !== options.provider) args.push(`--no-${p}`);
    }
  }
  return args;
}

async function describeGitHubForPush(projectRoot: string, deps: SyncDeps, logger: Logger): Promise<void> {
  const gh = readGitHubConfig(readConfig(projectRoot));
  const auth = resolveGitHubToken(projectRoot, { configToken: gh.token });
  const login = auth.token ? (deps.resolveLogin ?? resolveGitHubLogin)(auth.token) : null;
  logger.log(`🔑 ${describeGitHubAuth(auth, login)}${gh.owner && gh.repo ? ` → ${gh.owner}/${gh.repo}` : ''}`);
}

/**
 * `specweave sync push` — push local progress to the configured tracker(s).
 * Body = sync-progress phases 1-4; afterwards the retry queue is drained by
 * re-pushing the increments it holds (one entry point, one throttle).
 */
export async function syncPush(options: SyncPushOptions = {}, deps: SyncDeps = {}): Promise<void> {
  const logger = deps.logger ?? consoleLogger;
  const projectRoot = deps.projectRoot ?? resolveEffectiveRoot(process.cwd());
  const push = deps.syncProgress ?? syncProgress;

  if (options.provider !== 'jira' && options.provider !== 'ado') {
    await describeGitHubForPush(projectRoot, deps, logger);
  }

  await push(buildPushArgs(options), { logger });

  if (options.dryRun) return;

  // Fold of the old `sync-retry`: failed provider writes queued during the
  // increment's lifetime get re-pushed through the same entry point.
  const retry = deps.syncRetry ?? syncRetryCommand;
  await retry(projectRoot, { force: Boolean(options.force) }, {
    syncFn: async (entry) => {
      await push([entry.incrementId, '--force', ...buildPushArgs({ provider: options.provider })], { logger });
    },
  });
}

function parseSince(value: string | undefined): Date {
  if (!value) return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (/^\d+$/.test(value)) return new Date(Date.now() - Number(value) * 24 * 60 * 60 * 1000);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid --since '${value}' (use an ISO date or a number of days)`);
  return d;
}

/**
 * `specweave sync pull` — report what changed on the tracker side, or create
 * increments from external issues (`--create-increments`, the old sw:import).
 */
export async function syncPull(options: SyncPullOptions = {}, deps: SyncDeps = {}): Promise<void> {
  const logger = deps.logger ?? consoleLogger;
  const projectRoot = deps.projectRoot ?? resolveEffectiveRoot(process.cwd());

  if (options.createIncrements) {
    const runImport = deps.runImport ?? (async (root: string) => {
      const { promptAndRunExternalImport } = await import('../helpers/init/external-import.js');
      return promptAndRunExternalImport(root, false, 'en', {});
    });
    await runImport(projectRoot);
    return;
  }

  const config = readConfig(projectRoot);
  const enabled = config ? getEnabledProviders(config) : [];
  const platforms = options.provider ? [options.provider] : enabled;
  if (platforms.length === 0) {
    logger.log('No external sync providers configured. Run: specweave sync setup');
    return;
  }

  const since = parseSince(options.since);
  const { ExternalChangePuller } = await import('../../sync/external-change-puller.js');
  const puller = new ExternalChangePuller({ projectRoot, logger, platforms });
  const changes = await puller.fetchRecentChanges(since);

  if (changes.length === 0) {
    logger.log(`No external changes since ${since.toISOString()} (${platforms.join(', ')}).`);
    return;
  }
  logger.log(`${changes.length} external change(s) since ${since.toISOString()}:`);
  for (const c of changes) {
    const fields = c.changedFields.map((f) => `${f.field}: ${String(f.oldValue)} → ${String(f.newValue)}`).join(', ');
    logger.log(`  ${c.platform} ${c.externalId}  ${c.currentState.status}  by ${c.changedBy}  ${fields}`);
  }
  logger.log('Local files are not modified by pull; run `specweave sync push` to reconcile from the local side.');
}

/**
 * `specweave sync status` — one report: which token/account is active and
 * whether it can push, provider health, retry queue / circuit breakers, and
 * increments with partial sync coverage (absorbs sync-status, sync-health,
 * sync-gaps and validate-jira).
 */
export async function syncStatus(options: SyncStatusOptions = {}, deps: SyncDeps = {}): Promise<SyncStatusReport> {
  const logger = deps.logger ?? consoleLogger;
  const projectRoot = deps.projectRoot ?? resolveEffectiveRoot(process.cwd());
  const config = readConfig(projectRoot);

  const report: SyncStatusReport = {
    providers: [],
    health: [],
    gaps: [],
    hasIssues: false,
    exitCode: 0,
  };

  if (!config) {
    if (options.json) logger.log(JSON.stringify({ ...report, error: 'Not a SpecWeave project' }, null, 2));
    else logger.error('No .specweave/config.json found. Run `specweave init` first.');
    report.exitCode = 1;
    return report;
  }

  report.providers = getEnabledProviders(config).filter((p) => !options.provider || p === options.provider);

  if (report.providers.includes('github')) {
    const gh = readGitHubConfig(config);
    const auth = resolveGitHubToken(projectRoot, { configToken: gh.token });
    const login = auth.token && !options.quick ? (deps.resolveLogin ?? resolveGitHubLogin)(auth.token) : null;
    let canPush: boolean | null = null;
    if (auth.token && gh.owner && gh.repo && !options.quick) {
      const probe = deps.probeCanPush ?? defaultProbeCanPush;
      canPush = await probe(auth.token, gh.owner, gh.repo);
    }
    report.github = {
      source: auth.source,
      origin: auth.origin,
      isOAuthToken: Boolean(auth.isOAuthToken),
      login,
      repo: gh.owner && gh.repo ? `${gh.owner}/${gh.repo}` : null,
      canPush,
      description: describeGitHubAuth(auth, login),
    };
    if (!auth.token || canPush === false) report.hasIssues = true;
  }

  if (!options.quick) {
    try {
      const run = deps.runHealthChecks ?? runHealthChecksForConfig;
      report.health = (await run(config, projectRoot)).filter((r) => !options.provider || r.provider === options.provider);
      if (report.health.some((r) => !r.healthy)) report.hasIssues = true;
    } catch (error) {
      logger.warn(`Health checks failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.json) {
    // Resilience report prints its own text; capture it silently for JSON mode.
    const status = deps.syncStatus ?? syncStatusCommand;
    report.resilience = await withSilencedLogger(() => status(projectRoot));
  } else {
    logger.log('');
    report.resilience = await (deps.syncStatus ?? syncStatusCommand)(projectRoot);
  }
  if (report.resilience?.hasIssues) report.hasIssues = true;

  report.gaps = await (deps.detectGaps ?? detectSyncGaps)(projectRoot);
  if (report.gaps.length > 0) report.hasIssues = true;

  report.exitCode = report.hasIssues ? 1 : 0;

  if (options.json) {
    logger.log(JSON.stringify(report, null, 2));
    return report;
  }

  logger.log('');
  logger.log('Providers: ' + (report.providers.length ? report.providers.join(', ') : 'none (run: specweave sync setup)'));
  if (report.github) {
    logger.log(`GitHub:    ${report.github.description}`);
    if (report.github.repo) {
      const push = report.github.canPush === null ? 'unknown' : report.github.canPush ? 'yes' : 'NO';
      logger.log(`           target ${report.github.repo} — can push: ${push}`);
      if (report.github.canPush === false) {
        logger.log(`           ✗ token${report.github.login ? ` (account ${report.github.login})` : ''} has no write access to ${report.github.repo}`);
      }
    }
  }
  for (const h of report.health) {
    logger.log(`${h.provider}: ${h.healthy ? 'healthy' : 'UNHEALTHY'}`);
    for (const c of h.checks.filter((x) => x.status !== 'pass')) {
      logger.log(`  ${c.status === 'fail' ? '✗' : '⚠'} ${c.name}: ${c.message ?? ''}`);
    }
  }
  if (report.gaps.length > 0) {
    logger.log(`Sync gaps: ${report.gaps.length} increment(s) with partial coverage`);
    for (const gap of report.gaps) {
      logger.log(`  ${gap.incrementId}: missing ${gap.missingProviders.join(', ')} (synced: ${gap.syncedProviders.join(', ') || 'none'})`);
    }
    logger.log('  Fix: specweave sync push <incrementId>');
  } else {
    logger.log('Sync gaps: none');
  }
  logger.log('');
  logger.log(report.hasIssues ? 'Status: ISSUES DETECTED' : 'Status: HEALTHY');
  return report;
}

async function withSilencedLogger<T>(fn: () => Promise<T>): Promise<T> {
  const original = consoleLogger.log;
  (consoleLogger as { log: Logger['log'] }).log = () => undefined;
  try {
    return await fn();
  } finally {
    (consoleLogger as { log: Logger['log'] }).log = original;
  }
}

async function defaultProbeCanPush(token: string, owner: string, repo: string): Promise<boolean | null> {
  try {
    const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');
    const { resolveGitHubAccessFacts } = await import(
      '../../../plugins/specweave/lib/integrations/github/github-access-error.js'
    );
    const facts = await resolveGitHubAccessFacts(execFileNoThrow, { ...process.env, GH_TOKEN: token }, owner, repo);
    return facts.canPush;
  } catch {
    return null;
  }
}

/**
 * `specweave sync setup` — interactive wizard (GitHub / Jira / ADO), or
 * `--validate` to check the existing configuration and credentials.
 */
export async function syncSetup(options: SyncSetupOptions = {}, deps: SyncDeps = {}): Promise<number> {
  if (options.validate) {
    const health = deps.syncHealth ?? syncHealthCommand;
    return health({ provider: options.provider });
  }
  const setup = deps.syncSetup ?? syncSetupCommand;
  await setup({ provider: options.provider as SyncSetupProvider | undefined, quick: options.quick });
  return 0;
}

/** Shared by bin/specweave.js: parse `--provider` consistently for every verb. */
export { parseProvider };

/** Old verb → new verb map, used for the hidden deprecation aliases. */
export const DEPRECATED_SYNC_VERBS: Record<string, string> = {
  'sync-progress': 'sync push',
  'sync-retry': 'sync push',
  'sync-status': 'sync status',
  'sync-health': 'sync status',
  'sync-gaps': 'sync status',
  'sync-setup': 'sync setup',
  'validate-jira': 'sync setup --validate --provider jira',
  'sync-living-docs': 'docs sync',
};

export function deprecationNotice(oldVerb: string): string {
  const replacement = DEPRECATED_SYNC_VERBS[oldVerb];
  return `'specweave ${oldVerb}' is deprecated — use 'specweave ${replacement}'.`;
}
