/**
 * Project Mapping Wizard (T-026, T-027, T-028)
 *
 * After sync-setup validates credentials, walks the user through mapping
 * each workspace repo to an external project (GitHub/Jira/ADO).
 *
 * - Lists all workspace repos + root repo
 * - Offers "Select all" shortcut for monorepo scenarios
 * - Validates each mapping before writing
 * - Writes resolved mappings to workspace.repos[].sync
 *
 * @module cli/helpers/issue-tracker/project-mapping-wizard
 */

import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import type { WorkspaceRepo, WorkspaceRepoSync, WorkspaceConfig } from '../../../core/config/types.js';

export type MappingProvider = 'github' | 'jira' | 'ado';

export interface MappingTarget {
  github?: { owner: string; repo: string };
  jira?: { projectKey: string };
  ado?: { organization?: string; project: string };
}

export interface RepoMapping {
  repoId: string;
  isRoot: boolean;
  target: MappingTarget;
  direction?: string;
}

export interface MappingWizardOptions {
  provider: MappingProvider;
  workspace: WorkspaceConfig;
  /** Validate a GitHub repo exists. Return true if valid. */
  validateGitHub?: (owner: string, repo: string) => Promise<boolean>;
  /** Validate a JIRA project key. Return true if valid. */
  validateJira?: (projectKey: string) => Promise<boolean>;
  /** Validate an ADO project. Return true if valid. */
  validateAdo?: (project: string) => Promise<boolean>;
}

export interface MappingWizardResult {
  mappings: RepoMapping[];
  rootRepoSync?: MappingTarget;
}

/**
 * Run the project mapping wizard.
 *
 * Displays each workspace repo and asks user to map it to an external project.
 * Validates each mapping and returns the resolved mappings.
 */
export async function runProjectMappingWizard(
  options: MappingWizardOptions
): Promise<MappingWizardResult> {
  const { provider, workspace } = options;
  const providerLabel = provider === 'github' ? 'GitHub' : provider === 'jira' ? 'JIRA' : 'Azure DevOps';

  console.log('');
  console.log(chalk.cyan.bold(`📋 Map workspace repos to ${providerLabel} projects`));
  console.log(chalk.gray('   Each repo can be mapped to a separate external project.'));
  console.log('');

  // Build list: root repo first, then all workspace repos
  const entries: Array<{ id: string; isRoot: boolean; name: string }> = [];

  entries.push({
    id: '__root__',
    isRoot: true,
    name: `Workspace root (${workspace.name})`,
  });

  for (const repo of workspace.repos) {
    entries.push({ id: repo.id, isRoot: false, name: repo.name || repo.id });
  }

  // Offer "Select all" shortcut
  if (entries.length > 2) {
    const useSelectAll = await confirm({
      message: `Map ALL repos to the same ${providerLabel} project?`,
      default: false,
    });

    if (useSelectAll) {
      const target = await promptMappingTarget(provider, providerLabel);
      const valid = await validateMapping(target, provider, options);
      if (!valid) {
        console.log(chalk.red('   Mapping validation failed. Please try again.'));
        return runProjectMappingWizard(options); // Retry
      }

      const mappings: RepoMapping[] = entries.map(e => ({
        repoId: e.id,
        isRoot: e.isRoot,
        target,
      }));

      return {
        mappings,
        rootRepoSync: target,
      };
    }
  }

  // Walk through each repo
  const mappings: RepoMapping[] = [];
  let rootRepoSync: MappingTarget | undefined;

  for (const entry of entries) {
    console.log(chalk.cyan(`\n   → ${entry.name}`));

    const skip = await confirm({
      message: `Map "${entry.name}" to a ${providerLabel} project?`,
      default: true,
    });

    if (!skip) continue;

    let valid = false;
    let target: MappingTarget = {};

    while (!valid) {
      target = await promptMappingTarget(provider, providerLabel);
      valid = await validateMapping(target, provider, options);
      if (!valid) {
        console.log(chalk.red('   Validation failed. Please re-enter.'));
      }
    }

    const mapping: RepoMapping = { repoId: entry.id, isRoot: entry.isRoot, target };
    mappings.push(mapping);

    if (entry.isRoot) {
      rootRepoSync = target;
    }
  }

  return { mappings, rootRepoSync };
}

/**
 * Prompt user for a mapping target based on provider.
 */
async function promptMappingTarget(
  provider: MappingProvider,
  providerLabel: string
): Promise<MappingTarget> {
  if (provider === 'github') {
    const owner = await input({
      message: 'GitHub owner (org/user):',
      validate: (v: string) => v.trim().length > 0 || 'Required',
    });
    const repo = await input({
      message: 'GitHub repository name:',
      validate: (v: string) => v.trim().length > 0 || 'Required',
    });
    return { github: { owner: owner.trim(), repo: repo.trim() } };
  }

  if (provider === 'jira') {
    const projectKey = await input({
      message: 'JIRA project key (e.g., FE):',
      validate: (v: string) => v.trim().length > 0 || 'Required',
    });
    return { jira: { projectKey: projectKey.trim().toUpperCase() } };
  }

  // ADO
  const project = await input({
    message: 'Azure DevOps project name:',
    validate: (v: string) => v.trim().length > 0 || 'Required',
  });
  return { ado: { project: project.trim() } };
}

/**
 * Validate a mapping target against the provider.
 * Returns true if valid.
 */
async function validateMapping(
  target: MappingTarget,
  provider: MappingProvider,
  options: MappingWizardOptions
): Promise<boolean> {
  try {
    if (provider === 'github' && target.github && options.validateGitHub) {
      return await options.validateGitHub(target.github.owner, target.github.repo);
    }
    if (provider === 'jira' && target.jira && options.validateJira) {
      return await options.validateJira(target.jira.projectKey);
    }
    if (provider === 'ado' && target.ado && options.validateAdo) {
      return await options.validateAdo(target.ado.project);
    }
    // No validator provided — assume valid
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply mapping results to a workspace config object.
 * Writes sync targets into workspace.repos[].sync and workspace.rootRepo.
 */
export function applyMappingsToWorkspace(
  workspace: WorkspaceConfig,
  result: MappingWizardResult
): WorkspaceConfig {
  const updated = { ...workspace, repos: [...workspace.repos] };

  for (const mapping of result.mappings) {
    if (mapping.isRoot) {
      updated.rootRepo = mappingTargetToSync(mapping.target);
      continue;
    }

    const idx = updated.repos.findIndex(r => r.id === mapping.repoId);
    if (idx >= 0) {
      updated.repos[idx] = {
        ...updated.repos[idx],
        sync: mappingTargetToSync(mapping.target),
      };
    }
  }

  return updated;
}

/**
 * Convert a MappingTarget to a WorkspaceRepoSync object.
 */
function mappingTargetToSync(target: MappingTarget): WorkspaceRepoSync {
  const sync: WorkspaceRepoSync = {};
  if (target.github) sync.github = { owner: target.github.owner, repo: target.github.repo };
  if (target.jira) sync.jira = { projectKey: target.jira.projectKey };
  if (target.ado) sync.ado = { project: target.ado.project, organization: target.ado.organization };
  return sync;
}
