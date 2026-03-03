/**
 * Provider-Agnostic AC Progress Sync
 *
 * Routes AC completion events to all enabled providers (GitHub, JIRA, ADO)
 * using a simple function-map pattern. No adapter classes, no orchestrator.
 *
 * GitHub: delegates to existing 0193 modules (postACProgressComments + autoCloseCompletedUserStories)
 * JIRA: calls JiraStatusSync for comments and transitions
 * ADO: calls AdoClient for comments, AdoStatusSync for state transitions
 *
 * @module ac-progress-sync
 */

import { readFile } from 'fs/promises';
import { formatACCheckboxes, type ACState } from './ac-checkbox-formatter.js';
import { SyncCircuitBreaker } from './increment/sync-circuit-breaker.js';
import type { SyncProvider } from './types/sync-profile.js';

// Lazy imports for provider modules (resolved at call time)
// This avoids hard dependency on plugins that may not be installed

// ============================================================================
// Types
// ============================================================================

export interface ACProgressSyncConfig {
  sync: {
    github?: { enabled?: boolean };
    jira?: { enabled?: boolean };
    ado?: { enabled?: boolean };
  };
  github?: { owner?: string; repo?: string; token?: string };
  jira?: { domain?: string; email?: string; apiToken?: string; projectKey?: string };
  ado?: { organization?: string; project?: string; pat?: string };
  externalLinks?: {
    github?: {
      issues?: Record<string, { issueNumber: number; issueUrl: string; status?: string }>;
    };
    jira?: {
      userStories?: Record<string, { issueKey: string; issueUrl: string; syncedAt?: string }>;
    };
    ado?: {
      userStories?: Record<string, { workItemId: number; workItemUrl: string; syncedAt?: string }>;
    };
  };
}

export interface ProviderSyncResult {
  posted: Array<{ usId: string; ref: string }>;
  closed: Array<{ usId: string; ref: string }>;
  skipped: Array<{ usId: string; reason: string }>;
  errors: Array<{ usId: string; error: string }>;
}

export type ACProgressSyncResult = Partial<Record<SyncProvider, ProviderSyncResult>>;

export interface ACProgressContext {
  specPath: string;
  specContent: string;
  userStories: Map<string, {
    acStates: ACState[];
  }>;
}

// ============================================================================
// Shared Helpers
// ============================================================================

function emptyResult(): ProviderSyncResult {
  return { posted: [], closed: [], skipped: [], errors: [] };
}

function serializeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function formatProgressText(acStates: ACState[], format: 'jira' | 'ado'): string {
  const commentBody = formatACCheckboxes(acStates, format);
  const total = acStates.length;
  const completed = acStates.filter(ac => ac.completed).length;
  return `AC Progress: ${completed}/${total}\n\n${commentBody}`;
}

function isAllComplete(acStates: ACState[]): boolean {
  return acStates.length > 0 && acStates.every(ac => ac.completed);
}

// ============================================================================
// Provider Functions
// ============================================================================

type SyncProviderFn = (
  incrementId: string,
  affectedUSIds: string[],
  ctx: ACProgressContext,
  config: ACProgressSyncConfig,
) => Promise<ProviderSyncResult>;

/**
 * GitHub provider: delegates to existing 0193 modules directly.
 */
async function syncGitHubACProgress(
  incrementId: string,
  affectedUSIds: string[],
  ctx: ACProgressContext,
  config: ACProgressSyncConfig,
): Promise<ProviderSyncResult> {
  const result = emptyResult();

  const { postACProgressComments } = await import(
    '../../plugins/specweave-github/lib/github-ac-comment-poster.js'
  );
  const { autoCloseCompletedUserStories } = await import(
    '../../plugins/specweave-github/lib/github-us-auto-closer.js'
  );

  const options = {
    owner: config.github?.owner || '',
    repo: config.github?.repo || '',
    token: config.github?.token,
  };

  // Post progress comments
  const commentResult = await postACProgressComments(
    incrementId, affectedUSIds, ctx.specPath, options,
  );
  for (const posted of commentResult.posted) {
    result.posted.push({ usId: posted.usId, ref: String(posted.issueNumber) });
  }
  for (const err of commentResult.errors) {
    result.errors.push({ usId: err.usId, error: err.error });
  }

  // Auto-close completed user stories
  const closeResult = await autoCloseCompletedUserStories(
    incrementId, affectedUSIds, ctx.specPath, options,
  );
  for (const closed of closeResult.closed) {
    result.closed.push({ usId: closed.usId, ref: String(closed.issueNumber) });
  }
  for (const skipped of closeResult.skipped) {
    result.skipped.push({ usId: skipped.usId, reason: skipped.reason });
  }
  for (const err of closeResult.errors) {
    result.errors.push({ usId: err.usId, error: err.error });
  }

  return result;
}

/**
 * JIRA provider: posts comments and transitions issues.
 */
async function syncJiraACProgress(
  incrementId: string,
  affectedUSIds: string[],
  ctx: ACProgressContext,
  config: ACProgressSyncConfig,
): Promise<ProviderSyncResult> {
  const result = emptyResult();

  const { JiraStatusSync } = await import(
    '../../plugins/specweave-jira/lib/jira-status-sync.js'
  );

  const jiraSync = new JiraStatusSync(
    config.jira?.domain || '',
    config.jira?.email || '',
    config.jira?.apiToken || '',
    config.jira?.projectKey || '',
  );

  const jiraLinks = config.externalLinks?.jira?.userStories || {};

  for (const usId of affectedUSIds) {
    const link = jiraLinks[usId];
    if (!link) {
      result.skipped.push({ usId, reason: 'no-issue-link' });
      continue;
    }

    const us = ctx.userStories.get(usId);
    const acStates = us?.acStates || [];

    try {
      // Post progress comment with proper ADF formatting and dedup
      const posted = await jiraSync.postProgressComment(link.issueKey, acStates);
      if (posted) {
        result.posted.push({ usId, ref: link.issueKey });
      } else {
        result.skipped.push({ usId, reason: 'duplicate-progress' });
      }

      // Auto-transition to "In Progress" when work has started (partial completion)
      const completed = acStates.filter(ac => ac.completed).length;
      if (completed > 0 && !isAllComplete(acStates)) {
        await jiraSync.updateStatus(link.issueKey, { state: 'In Progress' });
      }

      // Auto-transition to Done if all ACs complete
      if (isAllComplete(acStates)) {
        const transitioned = await jiraSync.updateStatus(link.issueKey, { state: 'Done' });
        if (transitioned) {
          result.closed.push({ usId, ref: link.issueKey });
        } else {
          result.skipped.push({ usId, reason: 'already-closed' });
        }
      }
    } catch (err) {
      result.errors.push({ usId, error: serializeError(err) });
    }
  }

  return result;
}

/**
 * ADO provider: posts comments and transitions work items.
 */
async function syncAdoACProgress(
  incrementId: string,
  affectedUSIds: string[],
  ctx: ACProgressContext,
  config: ACProgressSyncConfig,
): Promise<ProviderSyncResult> {
  const result = emptyResult();

  const { AdoStatusSync } = await import(
    '../../plugins/specweave-ado/lib/ado-status-sync.js'
  );
  const { AdoClient } = await import(
    '../../plugins/specweave-ado/lib/ado-client.js'
  );

  const adoSync = new AdoStatusSync(
    config.ado?.organization || '',
    config.ado?.project || '',
    config.ado?.pat || '',
  );

  const adoClient = new AdoClient({
    organization: config.ado?.organization || '',
    project: config.ado?.project || '',
    personalAccessToken: config.ado?.pat || '',
  });

  const adoLinks = config.externalLinks?.ado?.userStories || {};

  for (const usId of affectedUSIds) {
    const link = adoLinks[usId];
    if (!link) {
      result.skipped.push({ usId, reason: 'no-issue-link' });
      continue;
    }

    const us = ctx.userStories.get(usId);
    const acStates = us?.acStates || [];

    try {
      // Post progress comment
      const commentText = formatProgressText(acStates, 'ado');
      await adoClient.addComment(link.workItemId, commentText);
      result.posted.push({ usId, ref: String(link.workItemId) });

      // Auto-transition to Closed if all ACs complete
      if (isAllComplete(acStates)) {
        const currentStatus = await adoSync.getStatus(link.workItemId);
        if (currentStatus.state === 'Closed') {
          result.skipped.push({ usId, reason: 'already-closed' });
        } else {
          await adoSync.updateStatus(link.workItemId, { state: 'Closed' });
          result.closed.push({ usId, ref: String(link.workItemId) });
        }
      }
    } catch (err) {
      result.errors.push({ usId, error: serializeError(err) });
    }
  }

  return result;
}

// ============================================================================
// Provider Map
// ============================================================================

const PROVIDER_MAP: Record<SyncProvider, SyncProviderFn> = {
  github: syncGitHubACProgress,
  jira: syncJiraACProgress,
  ado: syncAdoACProgress,
};

// Per-provider circuit breakers (module-level singletons)
const circuitBreakers: Record<SyncProvider, SyncCircuitBreaker> = {
  github: new SyncCircuitBreaker(),
  jira: new SyncCircuitBreaker(),
  ado: new SyncCircuitBreaker(),
};

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Sync AC progress to all enabled providers.
 *
 * Reads config to determine which providers are enabled, then calls each
 * provider's sync function. Errors are isolated per provider.
 *
 * @param incrementId - The increment ID
 * @param affectedUSIds - User story IDs that have AC changes
 * @param specPath - Path to spec.md
 * @param config - Sync configuration with provider settings and external links
 * @returns Per-provider results with posted, closed, skipped, and errors
 */
export async function syncACProgressToProviders(
  incrementId: string,
  affectedUSIds: string[],
  specPath: string,
  config: ACProgressSyncConfig,
): Promise<ACProgressSyncResult> {
  const result: ACProgressSyncResult = {};

  if (affectedUSIds.length === 0) {
    return result;
  }

  // Build context from spec.md
  const ctx = await buildACProgressContext(specPath, affectedUSIds);

  // Execute each enabled provider
  const providers: SyncProvider[] = ['github', 'jira', 'ado'];

  for (const provider of providers) {
    const providerConfig = config.sync?.[provider];
    if (!providerConfig?.enabled) continue;

    // Check circuit breaker before calling provider
    const breaker = circuitBreakers[provider];
    if (!breaker.canSync()) {
      const skippedResult = emptyResult();
      for (const usId of affectedUSIds) {
        skippedResult.skipped.push({ usId, reason: 'circuit-open' });
      }
      result[provider] = skippedResult;
      continue;
    }

    const syncFn = PROVIDER_MAP[provider];
    try {
      const providerResult = await syncFn(incrementId, affectedUSIds, ctx, config);
      result[provider] = providerResult;
      // Record circuit breaker outcome based on provider errors
      // A successful sync can have posted (comments), closed (issues), or both.
      // Only record failure when there were errors AND nothing succeeded.
      const anySuccess = providerResult.posted.length > 0 || providerResult.closed.length > 0;
      if (providerResult.errors.length > 0 && !anySuccess) {
        breaker.recordFailure();
      } else {
        breaker.recordSuccess();
      }
    } catch (err) {
      breaker.recordFailure();
      // Top-level error isolation: if provider function throws unexpectedly
      const providerResult = emptyResult();
      providerResult.errors.push({
        usId: affectedUSIds[0] || 'unknown',
        error: serializeError(err),
      });
      result[provider] = providerResult;
    }
  }

  return result;
}

/**
 * Close all external tool issues for a completed increment.
 *
 * Unlike syncACProgressToProviders (which operates on recently-changed US IDs),
 * this function parses ALL user story IDs from spec.md and attempts to close
 * their corresponding external issues. Used when increment status -> "completed".
 */
export async function closeIncrementIssues(
  incrementId: string,
  specPath: string,
  config: ACProgressSyncConfig,
): Promise<ACProgressSyncResult> {
  const content = await readFile(specPath, 'utf-8');
  const allUSIds = parseAllUserStoryIds(content);

  if (allUSIds.length === 0) {
    return {};
  }

  return syncACProgressToProviders(incrementId, allUSIds, specPath, config);
}

/**
 * Parse all user story IDs from spec.md content.
 * Matches patterns like "### US-001:", "### US-002:" etc.
 */
export function parseAllUserStoryIds(content: string): string[] {
  const ids: string[] = [];
  const pattern = /###\s+(US-\d+):/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Reset all circuit breakers (for testing only).
 */
export function resetCircuitBreakers(): void {
  for (const provider of Object.keys(circuitBreakers) as SyncProvider[]) {
    circuitBreakers[provider].reset();
  }
}

/**
 * Build AC progress context by parsing spec.md.
 *
 * Extracts AC states (id, description, completed) for each affected user story.
 */
export async function buildACProgressContext(
  specPath: string,
  affectedUSIds: string[],
): Promise<ACProgressContext> {
  const content = await readFile(specPath, 'utf-8');

  const userStories = new Map<string, { acStates: ACState[] }>();

  for (const usId of affectedUSIds) {
    const acStates = parseACStatesForUS(content, usId);
    userStories.set(usId, { acStates });
  }

  return {
    specPath,
    specContent: content,
    userStories,
  };
}

/**
 * Extract AC states for a specific user story from spec.md content.
 * Reuses the same parsing logic from github-ac-comment-poster.
 */
function parseACStatesForUS(content: string, usId: string): ACState[] {
  const states: ACState[] = [];
  // AC IDs use unpadded US number: US-001 → AC-US1-XX
  const usNum = String(parseInt(usId.replace('US-', ''), 10));

  // Support both bold (**AC-US1-01**:) and plain (AC-US1-01:) formats
  const acPattern = new RegExp(
    `- \\[([ x])\\] (?:\\*\\*)?AC-US${usNum}-(\\d+)(?:\\*\\*)?:\\s*(.+)`,
    'g',
  );

  let match;
  while ((match = acPattern.exec(content)) !== null) {
    states.push({
      id: `AC-US${usNum}-${match[2]}`,
      description: match[3].trim(),
      completed: match[1] === 'x',
    });
  }

  return states;
}
