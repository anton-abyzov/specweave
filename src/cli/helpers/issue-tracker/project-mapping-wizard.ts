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

import path from 'path';
import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
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
  /** Authenticated GitHub username (for auto-detect) */
  authenticatedOwner?: string;
  /** Project path for git remote detection */
  projectPath?: string;
  /** Validate a GitHub repo exists. Return true if valid. */
  validateGitHub?: (owner: string, repo: string) => Promise<boolean>;
  /** Validate a JIRA project key. Return true if valid. */
  validateJira?: (projectKey: string) => Promise<boolean>;
  /** Validate an ADO project. Return true if valid. */
  validateAdo?: (project: string) => Promise<boolean>;
}

export interface DetectGitHubInput {
  repoName: string;
  gitRemoteUrl?: string;
  authenticatedOwner?: string;
}

/**
 * Auto-detect GitHub owner/repo from git remote URL or authenticated owner.
 * Pure function — no side effects, no prompts.
 */
export function detectGitHubMapping(input: DetectGitHubInput): { owner: string; repo: string } | null {
  // Try git remote first
  if (input.gitRemoteUrl) {
    const match = input.gitRemoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    // Non-GitHub remote — can't auto-detect
    return null;
  }

  // Fall back to authenticated owner + repo name
  if (input.authenticatedOwner) {
    return { owner: input.authenticatedOwner, repo: input.repoName };
  }

  return null;
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
  // Skip __root__ for single-repo workspaces — the root IS the repo, showing both is confusing
  const entries: Array<{ id: string; isRoot: boolean; name: string }> = [];

  if (workspace.repos.length > 1) {
    entries.push({
      id: '__root__',
      isRoot: true,
      name: `Workspace root (${workspace.name})`,
    });
  }

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

    // For GitHub: try auto-detect from git remote or authenticated owner
    if (provider === 'github') {
      const repoPath = entry.isRoot ? options.projectPath : getRepoPath(entry, options);
      const gitRemoteUrl = repoPath ? getGitRemoteUrl(repoPath) : undefined;
      const detected = detectGitHubMapping({
        repoName: entry.name.replace(/^Workspace root \(|\)$/g, ''),
        gitRemoteUrl: gitRemoteUrl || undefined,
        authenticatedOwner: options.authenticatedOwner,
      });

      if (detected) {
        const useDetected = await confirm({
          message: `Map "${entry.name}" to ${detected.owner}/${detected.repo}?`,
          default: true,
        });

        if (useDetected) {
          const target: MappingTarget = { github: detected };
          const valid = await validateMapping(target, provider, options);
          if (valid) {
            const mapping: RepoMapping = { repoId: entry.id, isRoot: entry.isRoot, target };
            mappings.push(mapping);
            if (entry.isRoot) rootRepoSync = target;
            continue;
          }
          console.log(chalk.red('   Validation failed. Entering manually.'));
        }
        // User rejected or validation failed — fall through to manual
      }
    }

    const skip = await confirm({
      message: `Map "${entry.name}" to a ${providerLabel} project?`,
      default: true,
    });

    if (!skip) continue;

    let valid = false;
    let target: MappingTarget = {};
    // Use entry name as default repo name to avoid redundant question
    const defaultRepoName = entry.isRoot
      ? workspace.name
      : (entry.name || entry.id);

    while (!valid) {
      target = await promptMappingTarget(provider, providerLabel, defaultRepoName);
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
 * @param defaultRepoName - Pre-fill repo name from the entry being mapped (avoids redundant question)
 */
async function promptMappingTarget(
  provider: MappingProvider,
  providerLabel: string,
  defaultRepoName?: string
): Promise<MappingTarget> {
  if (provider === 'github') {
    const owner = await input({
      message: 'GitHub owner (org/user):',
      validate: (v: string) => v.trim().length > 0 || 'Required',
    });
    const repo = await input({
      message: 'GitHub repository name:',
      default: defaultRepoName,
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

/**
 * Get git remote URL for a repo path. Returns empty string if not available.
 */
function getGitRemoteUrl(repoPath: string): string {
  try {
    const result = execFileNoThrowSync('git', ['remote', 'get-url', 'origin'], { cwd: repoPath, shell: false });
    return result.success ? result.stdout.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Resolve the filesystem path for a workspace repo entry.
 * Uses path.resolve() which normalises separators per-OS (/ on POSIX, \ on Windows).
 */
export function getRepoPath(
  entry: { id: string; isRoot: boolean; name: string },
  options: MappingWizardOptions
): string | undefined {
  if (!options.projectPath) return undefined;
  const repo = options.workspace.repos.find(r => r.id === entry.id);
  if (!repo?.path) return undefined;
  const resolved = path.resolve(options.projectPath, repo.path);
  // Containment check: reject paths that escape the project root
  const root = path.resolve(options.projectPath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return undefined;
  return resolved;
}
