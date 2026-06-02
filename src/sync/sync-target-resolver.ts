/**
 * Sync Target Resolver
 *
 * Resolves sync targets (GitHub, Jira, ADO) for a given project name
 * in workspace mode. The **Project** field in spec.md controls routing.
 *
 * Three-phase resolution:
 * 1. Name match: workspace.repos.find(r => r.id === projectName) (also workspace.name → rootRepo)
 * 2. Prefix fallback: routeByPrefix(projectName, repos) for US-{PREFIX}-NNN IDs
 * 3. Global fallback: return config.sync.{github,jira,ado}
 *
 * SOURCE OF TRUTH (0865 T-005): reads `config.workspace.repos[]` ONLY.
 * The legacy umbrella reads were removed — config is auto-migrated v2.0→v3.0
 * (umbrella/multiProject consolidated into `config.workspace`), so the old
 * umbrella key is stale/undefined at runtime and reading it silently collapsed
 * routing to the global fallback.
 */

import type { SpecWeaveConfig, WorkspaceRepo } from '../core/config/types.js';
import { routeByPrefix } from './story-router.js';

export interface SyncTargetConfig {
  github?: { owner: string; repo: string };
  jira?: { projectKey: string };
  ado?: { organization?: string; project: string };
  source: 'child-repo-name' | 'child-repo-prefix' | 'global';
}

/**
 * Normalized routing target derived from a workspace repo's sync block.
 * Structurally compatible with the prefix-router (`id` + `prefix`).
 */
interface RoutingRepo {
  id: string;
  prefix?: string;
  sync?: WorkspaceRepo['sync'];
}

/**
 * Adapter: project a workspace repo list into the routing shape.
 *
 * This is the SINGLE place that bridges the v3.0 `workspace.repos[]` source of
 * truth to the prefix-routing logic in story-router. It preserves the previous
 * umbrella resolution semantics exactly (id/prefix match → per-repo sync).
 */
function toRoutingRepos(config: SpecWeaveConfig): RoutingRepo[] {
  const repos = config.workspace?.repos ?? [];
  return repos.map((r) => ({ id: r.id, prefix: r.prefix, sync: r.sync }));
}

/**
 * Map a workspace sync block to a SyncTargetConfig payload.
 */
function syncToTarget(
  sync: WorkspaceRepo['sync'] | undefined,
  source: SyncTargetConfig['source'],
): SyncTargetConfig {
  return {
    github: sync?.github
      ? { owner: sync.github.owner, repo: sync.github.repo }
      : undefined,
    jira: sync?.jira ? { projectKey: sync.jira.projectKey } : undefined,
    ado: sync?.ado ? { organization: sync.ado.organization, project: sync.ado.project } : undefined,
    source,
  };
}

/**
 * Resolve sync target for a project name given the workspace config.
 *
 * @param projectName - Project name, repo ID, or story ID (e.g., "vskill", "US-VSK-001")
 * @param config - Full SpecWeave config
 * @returns Resolved sync target with source indication
 */
export function resolveSyncTarget(
  projectName: string | undefined,
  config: SpecWeaveConfig,
): SyncTargetConfig {
  const globalTarget = buildGlobalTarget(config);

  const workspace = config.workspace;
  const repos = toRoutingRepos(config);

  // Short-circuit: no workspace repos configured → always global
  if (!projectName || !workspace || repos.length === 0) {
    return globalTarget;
  }

  // Phase 0: Workspace root match (case-insensitive) → workspace.rootRepo
  if (workspace.name && projectName.toLowerCase() === workspace.name.toLowerCase()) {
    if (workspace.rootRepo) {
      return syncToTarget(workspace.rootRepo, 'child-repo-name');
    }
    // No rootRepo-specific sync config → fall through to global
    return globalTarget;
  }

  // Phase 1: Name/ID match
  const nameMatch = repos.find((r) => r.id === projectName);
  if (nameMatch) {
    return syncToTarget(nameMatch.sync, 'child-repo-name');
  }

  // Phase 2: Prefix fallback via story-router
  const routeResult = routeByPrefix(projectName, repos);
  if (routeResult.matched && routeResult.repoId) {
    const matched = repos.find((r) => r.id === routeResult.repoId);
    if (matched?.sync) {
      return syncToTarget(matched.sync, 'child-repo-prefix');
    }
  }

  // Phase 3: Global fallback
  return globalTarget;
}

/**
 * Validate workspace sync targets for common misconfigurations.
 * Returns an array of warning messages (empty if all OK).
 */
export function validateSyncTargets(config: SpecWeaveConfig): string[] {
  const warnings: string[] = [];
  const repos = config.workspace?.repos ?? [];
  if (repos.length === 0) {
    return warnings;
  }

  // Check for repos missing sync config entirely
  for (const repo of repos) {
    if (!repo.sync) {
      warnings.push(
        `Workspace repo "${repo.id}" has no sync config — it will fall back to global defaults. ` +
        `Run sw:sync-setup to configure per-repo sync targets.`,
      );
    }
  }

  // Check for JIRA projectKey collisions
  const jiraKeys = new Map<string, string[]>();
  for (const repo of repos) {
    const key = repo.sync?.jira?.projectKey;
    if (key) {
      if (!jiraKeys.has(key)) jiraKeys.set(key, []);
      jiraKeys.get(key)!.push(repo.id);
    }
  }

  // Warn if rootRepo.jira differs from all repos (possible misconfiguration)
  const rootJiraKey = config.workspace?.rootRepo?.jira?.projectKey;
  if (rootJiraKey) {
    for (const [key, repoIds] of jiraKeys) {
      if (key !== rootJiraKey && repoIds.length > 0) {
        // Only warn if a single repo differs — likely a copy-paste error
        if (jiraKeys.size === 1 && repoIds.length === 1) {
          warnings.push(
            `Workspace repo "${repoIds[0]}" uses JIRA project "${key}" while the root uses "${rootJiraKey}". ` +
            `Verify this is intentional (not a misconfiguration).`,
          );
        }
      }
    }
  }

  return warnings;
}

function buildGlobalTarget(config: SpecWeaveConfig): SyncTargetConfig {
  // Resolve GitHub config: try sync.github first, then fall back to first sync.profiles entry
  let github: { owner: string; repo: string } | undefined;
  if (config.sync?.github?.owner && config.sync?.github?.repo) {
    github = { owner: config.sync.github.owner, repo: config.sync.github.repo };
  } else if (config.sync?.profiles) {
    const profiles = config.sync.profiles;
    const firstGithubProfile = Object.values(profiles).find(
      (p) => p?.provider === 'github' && p?.config?.owner && p?.config?.repo
    );
    if (firstGithubProfile) {
      github = { owner: firstGithubProfile.config.owner!, repo: firstGithubProfile.config.repo! };
    }
  }
  return {
    github,
    jira: config.sync?.jira?.projectKey
      ? { projectKey: config.sync.jira.projectKey }
      : undefined,
    ado: config.sync?.ado?.project
      ? { organization: config.sync.ado.organization, project: config.sync.ado.project }
      : undefined,
    source: 'global',
  };
}
