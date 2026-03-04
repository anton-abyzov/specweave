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

function buildGlobalTarget(config: SpecWeaveConfig): SyncTargetConfig {
  return {
    github: config.sync?.github?.owner && config.sync?.github?.repo
      ? { owner: config.sync.github.owner, repo: config.sync.github.repo }
      : undefined,
    jira: config.sync?.jira?.projectKey
      ? { projectKey: config.sync.jira.projectKey }
      : undefined,
    ado: config.sync?.ado?.project
      ? { organization: config.sync.ado.organization, project: config.sync.ado.project }
      : undefined,
    source: 'global',
  };
}
