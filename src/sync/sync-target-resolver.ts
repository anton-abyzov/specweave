/**
 * Sync Target Resolver
 *
 * Resolves sync targets (GitHub, Jira, ADO) for a given project name
 * in umbrella mode. The **Project** field in spec.md controls routing.
 *
 * Three-phase resolution:
 * 1. Name match: childRepos.find(r => r.name === projectName || r.id === projectName)
 * 2. Prefix fallback: routeByPrefix(projectName, childRepos) for US-{PREFIX}-NNN IDs
 * 3. Global fallback: return config.sync.{github,jira,ado}
 *
 * When umbrella.enabled is false, always returns global config.
 */

import type { SpecWeaveConfig } from '../core/config/types.js';
import { routeByPrefix } from './story-router.js';

export interface SyncTargetConfig {
  github?: { owner: string; repo: string };
  jira?: { projectKey: string };
  ado?: { organization?: string; project: string };
  source: 'child-repo-name' | 'child-repo-prefix' | 'global';
}

/**
 * Resolve sync target for a project name given the umbrella config.
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

  // Short-circuit: umbrella disabled → always global
  if (!config.umbrella?.enabled) {
    return globalTarget;
  }

  const childRepos = config.umbrella?.childRepos ?? [];
  if (!projectName || childRepos.length === 0) {
    return globalTarget;
  }

  // Phase 0: Umbrella project match (case-insensitive, like project-resolution.ts)
  if (config.umbrella?.projectName && projectName.toLowerCase() === config.umbrella.projectName.toLowerCase()) {
    if (config.umbrella.sync) {
      return {
        github: config.umbrella.sync.github,
        jira: config.umbrella.sync.jira,
        ado: config.umbrella.sync.ado,
        source: 'child-repo-name', // Treat umbrella as a named project
      };
    }
    // No umbrella-specific sync config → fall through to global
    return globalTarget;
  }

  // Phase 1: Name/ID match
  const nameMatch = childRepos.find(
    r => r.name === projectName || r.id === projectName,
  );
  if (nameMatch) {
    return {
      github: nameMatch.sync?.github,
      jira: nameMatch.sync?.jira,
      ado: nameMatch.sync?.ado,
      source: 'child-repo-name',
    };
  }

  // Phase 2: Prefix fallback via story-router
  const routeResult = routeByPrefix(projectName, childRepos);
  if (routeResult.matched && routeResult.repoId) {
    const matched = childRepos.find(r => r.id === routeResult.repoId);
    if (matched?.sync) {
      return {
        github: matched.sync.github,
        jira: matched.sync.jira,
        ado: matched.sync.ado,
        source: 'child-repo-prefix',
      };
    }
  }

  // Phase 3: Global fallback
  return globalTarget;
}

/**
 * Validate umbrella sync targets for common misconfigurations.
 * Returns an array of warning messages (empty if all OK).
 */
export function validateSyncTargets(config: SpecWeaveConfig): string[] {
  const warnings: string[] = [];
  if (!config.umbrella?.enabled || !config.umbrella?.childRepos?.length) {
    return warnings;
  }

  const childRepos = config.umbrella.childRepos;

  // Check for child repos missing sync config entirely
  for (const child of childRepos) {
    if (!child.sync) {
      warnings.push(
        `Child repo "${child.id}" has no sync config — it will fall back to global defaults. ` +
        `Run sw:sync-setup to configure per-repo sync targets.`,
      );
    }
  }

  // Check for JIRA projectKey collisions with external projects
  // (e.g., a child repo accidentally routing to a different project's JIRA board)
  const jiraKeys = new Map<string, string[]>();
  for (const child of childRepos) {
    const key = child.sync?.jira?.projectKey;
    if (key) {
      if (!jiraKeys.has(key)) jiraKeys.set(key, []);
      jiraKeys.get(key)!.push(child.id);
    }
  }

  // Warn if umbrella.sync.jira differs from all childRepos (possible misconfiguration)
  const umbrellaJiraKey = config.umbrella?.sync?.jira?.projectKey;
  if (umbrellaJiraKey) {
    for (const [key, repos] of jiraKeys) {
      if (key !== umbrellaJiraKey && repos.length > 0) {
        // This is expected for multi-project setups — only warn if a single child differs
        // which likely indicates a copy-paste error
        if (jiraKeys.size === 1 && repos.length === 1) {
          warnings.push(
            `Child repo "${repos[0]}" uses JIRA project "${key}" while umbrella uses "${umbrellaJiraKey}". ` +
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
      github = { owner: firstGithubProfile.config.owner, repo: firstGithubProfile.config.repo };
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
