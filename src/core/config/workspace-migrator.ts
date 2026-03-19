/**
 * Workspace Config Migrator
 *
 * Migrates legacy umbrella/multiProject/projectMappings configs
 * into the unified workspace format (v3.0).
 *
 * @module core/config/workspace-migrator
 */

import type {
  SpecWeaveConfig,
  WorkspaceConfig,
  WorkspaceRepo,
  WorkspaceRepoSync,
  ChildRepoConfig,
  ProjectMapping,
} from './types.js';

export interface MigrationLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
}

const NOOP_LOGGER: MigrationLogger = {
  info: () => {},
  warn: () => {},
};

/**
 * Migrate legacy config to workspace format.
 *
 * - umbrella.childRepos → workspace.repos
 * - umbrella.sync → workspace.rootRepo
 * - umbrella.projectName → workspace.name
 * - multiProject.projects → workspace.repos (deduplicated by id)
 * - projectMappings → workspace.repos[].sync
 *
 * Idempotent: if config already has workspace and no legacy keys, returns unchanged.
 * On error: logs warning and returns original config untouched.
 */
export function migrateToWorkspace(
  config: SpecWeaveConfig,
  logger: MigrationLogger = NOOP_LOGGER,
): SpecWeaveConfig {
  const hasLegacy = !!(config.umbrella || config.multiProject || config.projectMappings);

  // Already migrated — nothing to do
  if (config.workspace && !hasLegacy) {
    return config;
  }

  // No legacy keys and no workspace — nothing to migrate
  if (!hasLegacy) {
    return config;
  }

  try {
    return performMigration(config, logger);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Migration failed: ${msg} — preserving original config`);
    return config;
  }
}

function performMigration(
  config: SpecWeaveConfig,
  logger: MigrationLogger,
): SpecWeaveConfig {
  // Start building workspace from existing or empty
  const workspace: WorkspaceConfig = config.workspace
    ? structuredClone(config.workspace)
    : { name: 'workspace', repos: [] };

  // --- Phase 1: umbrella → workspace ---
  if (config.umbrella) {
    const umb = config.umbrella;

    // Resolve name
    if (umb.projectName) {
      workspace.name = umb.projectName;
    } else if (config.project?.name && workspace.name === 'workspace') {
      workspace.name = config.project.name;
    }

    // rootRepo from umbrella.sync
    if (umb.sync && !workspace.rootRepo) {
      workspace.rootRepo = convertChildRepoSync(umb.sync);
    }

    // childRepos → workspace.repos
    if (Array.isArray(umb.childRepos)) {
      for (const child of umb.childRepos) {
        if (!workspace.repos.some(r => r.id === child.id)) {
          workspace.repos.push(convertChildRepo(child));
        }
      }
    }
  }

  // --- Phase 2: multiProject → workspace ---
  if (config.multiProject?.projects) {
    const projects = config.multiProject.projects;

    // Resolve name fallback
    if (workspace.name === 'workspace' && config.project?.name) {
      workspace.name = config.project.name;
    }

    if (typeof projects === 'object' && !Array.isArray(projects)) {
      // Record<string, ProjectConfig> format
      for (const [id, proj] of Object.entries(projects)) {
        if (!workspace.repos.some(r => r.id === id)) {
          workspace.repos.push({
            id,
            path: '',
            prefix: id.toUpperCase().replace(/-/g, '_'),
            name: proj.name,
            techStack: proj.techStack,
          });
        }
      }
    } else if (Array.isArray(projects)) {
      // Array format (from schema)
      for (const proj of projects as Array<{ id?: string; name: string; techStack?: string[] }>) {
        const id = proj.id || proj.name.toLowerCase().replace(/\s+/g, '-');
        if (!workspace.repos.some(r => r.id === id)) {
          workspace.repos.push({
            id,
            path: '',
            prefix: id.toUpperCase().replace(/-/g, '_'),
            name: proj.name,
            techStack: proj.techStack,
          });
        }
      }
    }
  }

  // --- Phase 3: projectMappings → workspace.repos[].sync ---
  if (config.projectMappings) {
    for (const [projectId, mapping] of Object.entries(config.projectMappings)) {
      let repo = workspace.repos.find(r => r.id === projectId);

      if (!repo) {
        // Create a placeholder repo for orphan mappings
        repo = {
          id: projectId,
          path: '',
          prefix: projectId.toUpperCase().replace(/-/g, '-'),
        };
        workspace.repos.push(repo);
      }

      mergeMappingIntoSync(repo, mapping);
    }
  }

  // --- Build result: strip legacy keys ---
  const result: SpecWeaveConfig = { ...config };
  result.workspace = workspace;
  result.version = '3.0';

  delete result.umbrella;
  delete result.multiProject;
  delete result.projectMappings;

  logger.info(
    'Config migrated from v2.0 to v3.0 — umbrella/multiProject consolidated into workspace',
  );

  return result;
}

/**
 * Convert a ChildRepoConfig to a WorkspaceRepo
 */
function convertChildRepo(child: ChildRepoConfig): WorkspaceRepo {
  const repo: WorkspaceRepo = {
    id: child.id,
    path: child.path,
    prefix: child.prefix,
  };

  if (child.name) repo.name = child.name;
  if (child.techStack) repo.techStack = child.techStack;
  if (child.role) repo.role = child.role;
  if (child.sync) repo.sync = convertChildRepoSync(child.sync);

  return repo;
}

/**
 * Convert legacy ChildRepoSyncConfig to WorkspaceRepoSync
 */
function convertChildRepoSync(
  sync: NonNullable<ChildRepoConfig['sync']>,
): WorkspaceRepoSync {
  const result: WorkspaceRepoSync = {};

  if (sync.github) {
    result.github = { owner: sync.github.owner, repo: sync.github.repo };
  }
  if (sync.jira) {
    result.jira = { projectKey: sync.jira.projectKey };
  }
  if (sync.ado) {
    result.ado = { project: sync.ado.project };
    if (sync.ado.organization) {
      result.ado.organization = sync.ado.organization;
    }
  }

  return result;
}

/**
 * Merge a ProjectMapping into a WorkspaceRepo's sync, without overwriting existing values
 */
function mergeMappingIntoSync(repo: WorkspaceRepo, mapping: ProjectMapping): void {
  if (!repo.sync) {
    repo.sync = {};
  }

  if (mapping.github && !repo.sync.github) {
    repo.sync.github = { owner: mapping.github.owner, repo: mapping.github.repo };
  }

  if (mapping.jira && !repo.sync.jira) {
    repo.sync.jira = { projectKey: mapping.jira.project };
  }

  if (mapping.ado && !repo.sync.ado) {
    repo.sync.ado = { project: mapping.ado.project };
    if (mapping.ado.areaPath) {
      // areaPath has no equivalent in WorkspaceRepoSync, but project is mapped
    }
  }
}
