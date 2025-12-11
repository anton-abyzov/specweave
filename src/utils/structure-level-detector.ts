/**
 * Structure Level Detector
 *
 * Detects whether the project uses 1-level or 2-level folder structure
 * for living docs specs:
 *
 * - 1-Level: internal/specs/{project}/FS-XXX/
 * - 2-Level: internal/specs/{project}/{board}/FS-XXX/
 *
 * 2-level is used when:
 * - ADO area path mapping is configured (project → area paths)
 * - JIRA board mapping is configured with multiple boards per project
 * - Umbrella with team-based organization
 *
 * @module utils/structure-level-detector
 */

import * as fs from './fs-native.js';
import path from 'path';

/**
 * Structure level configuration
 */
export interface StructureLevelConfig {
  /** Whether this is 1-level or 2-level structure */
  level: 1 | 2;

  /** Available projects (for 1-level) or top-level containers (for 2-level) */
  projects: ProjectInfo[];

  /** Available boards (only for 2-level) - organized by project */
  boardsByProject?: Record<string, BoardInfo[]>;

  /** Detection reason for debugging */
  detectionReason: string;

  /** Source of configuration */
  source: 'ado-area-path' | 'jira-board' | 'umbrella-teams' | 'multi-project' | 'single-project' | 'existing-folders';
}

/**
 * Project information
 */
export interface ProjectInfo {
  id: string;
  name: string;
  /** For 2-level: this is the ADO project or JIRA project key */
  externalId?: string;
}

/**
 * Board information (for 2-level structures)
 */
export interface BoardInfo {
  id: string;
  name: string;
  /** Parent project ID */
  projectId: string;
  /** Keywords for matching */
  keywords?: string[];
  /** ADO area path */
  areaPath?: string;
  /** JIRA board ID */
  jiraBoardId?: string;
}

/**
 * Validation result for spec.md project/board context
 */
export interface ProjectContextValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  /** Detected structure level */
  structureLevel: 1 | 2;
  /** Parsed project from spec */
  project?: string;
  /** Parsed board from spec (for 2-level) */
  board?: string;
  /** Expected path where this spec will sync to */
  expectedPath?: string;
}

/**
 * Config subset needed for detection
 */
interface ConfigSubset {
  sync?: {
    profiles?: Record<string, {
      provider?: string;
      config?: {
        project?: string;
        areaPaths?: string[];
        areaPathMapping?: {
          project: string;
          mappings: Array<{
            areaPath: string;
            specweaveProject: string;
            keywords?: string[];
          }>;
        };
        boardMapping?: {
          /** JIRA project key (e.g., "CORE") - Level 1 in 2-level structure */
          projectKey?: string;
          boards?: Array<{
            id: string;
            name: string;
            specweaveProject: string;
            keywords?: string[];
          }>;
        };
      };
    }>;
  };
  umbrella?: {
    enabled?: boolean;
    childRepos?: Array<{
      id: string;
      name: string;
      team?: string;
      areaPath?: string;
    }>;
  };
  multiProject?: {
    enabled?: boolean;
    activeProject?: string;
    projects?: Record<string, { name?: string; description?: string }>;
  };
}

/**
 * Detect structure level from configuration
 *
 * @param projectRoot - Path to project root
 * @returns Structure level configuration
 */
export function detectStructureLevel(projectRoot: string = process.cwd()): StructureLevelConfig {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  const specsPath = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  let config: ConfigSubset = {};

  // Read config.json if exists
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Ignore parse errors, use defaults
    }
  }

  // Check 1: ADO area path mapping (2-level structure)
  if (config.sync?.profiles) {
    for (const [, profile] of Object.entries(config.sync.profiles)) {
      if (profile.provider !== 'ado') continue;

      const adoProject = profile.config?.project;

      // ADO with areaPathMapping = 2-level structure
      if (profile.config?.areaPathMapping?.mappings?.length && adoProject) {
        const projects: ProjectInfo[] = [{
          id: normalizeId(adoProject),
          name: adoProject,
          externalId: adoProject
        }];

        const boardsByProject: Record<string, BoardInfo[]> = {};
        const projectId = normalizeId(adoProject);
        boardsByProject[projectId] = [];

        for (const mapping of profile.config.areaPathMapping.mappings) {
          boardsByProject[projectId].push({
            id: normalizeId(mapping.specweaveProject),
            name: mapping.specweaveProject,
            projectId: projectId,
            keywords: mapping.keywords,
            areaPath: mapping.areaPath
          });
        }

        return {
          level: 2,
          projects,
          boardsByProject,
          detectionReason: 'ADO area path mapping configured',
          source: 'ado-area-path'
        };
      }

      // ADO with simple areaPaths list = also 2-level (project/area)
      if (profile.config?.areaPaths?.length && adoProject) {
        const projects: ProjectInfo[] = [{
          id: normalizeId(adoProject),
          name: adoProject,
          externalId: adoProject
        }];

        const boardsByProject: Record<string, BoardInfo[]> = {};
        const projectId = normalizeId(adoProject);
        boardsByProject[projectId] = profile.config.areaPaths.map(ap => ({
          id: normalizeId(ap),
          name: ap,
          projectId: projectId,
          areaPath: ap
        }));

        return {
          level: 2,
          projects,
          boardsByProject,
          detectionReason: 'ADO area paths configured',
          source: 'ado-area-path'
        };
      }
    }
  }

  // Check 2: JIRA board mapping with multiple boards (2-level structure)
  // 2-level structure for JIRA:
  //   Level 1 (project): JIRA projectKey (e.g., "CORE" or "JIRA-CORE")
  //   Level 2 (board): specweaveProject from each board (e.g., "fe", "be", "mobile")
  //
  // Example folder structure: .specweave/docs/internal/specs/JIRA-CORE/fe/FS-XXX/
  if (config.sync?.profiles) {
    for (const [, profile] of Object.entries(config.sync.profiles)) {
      if (profile.provider !== 'jira') continue;

      if (profile.config?.boardMapping?.boards?.length) {
        const boards = profile.config.boardMapping.boards;
        const jiraProjectKey = profile.config.boardMapping.projectKey;

        if (boards.length > 1 || (boards.length === 1 && jiraProjectKey)) {
          // Multiple boards = 2-level structure
          // Level 1: JIRA project key (use projectKey if available, otherwise derive from boards)
          const projectId = jiraProjectKey
            ? normalizeId(jiraProjectKey)
            : normalizeId(profile.config.project || 'jira-default');

          const projects: ProjectInfo[] = [{
            id: projectId,
            name: jiraProjectKey || profile.config.project || 'JIRA Project',
            externalId: jiraProjectKey
          }];

          // Level 2: specweaveProject from each board
          const boardsByProject: Record<string, BoardInfo[]> = {};
          boardsByProject[projectId] = [];

          for (const board of boards) {
            boardsByProject[projectId].push({
              id: normalizeId(board.specweaveProject),
              name: board.specweaveProject,
              projectId: projectId,
              keywords: board.keywords,
              jiraBoardId: board.id
            });
          }

          return {
            level: 2,
            projects,
            boardsByProject,
            detectionReason: 'JIRA board mapping with multiple boards',
            source: 'jira-board'
          };
        }
      }
    }
  }

  // Check 3: Umbrella with teams (2-level structure)
  if (config.umbrella?.enabled && config.umbrella?.childRepos?.length) {
    const repos = config.umbrella.childRepos;
    const teams = new Set(repos.filter(r => r.team).map(r => r.team!));

    if (teams.size > 1) {
      // Multiple teams = 2-level (team/repo)
      const projects: ProjectInfo[] = Array.from(teams).map(t => ({
        id: normalizeId(t),
        name: t
      }));

      const boardsByProject: Record<string, BoardInfo[]> = {};
      for (const team of teams) {
        const teamId = normalizeId(team);
        boardsByProject[teamId] = repos
          .filter(r => r.team === team)
          .map(r => ({
            id: normalizeId(r.name || r.id),
            name: r.name || r.id,
            projectId: teamId
          }));
      }

      return {
        level: 2,
        projects,
        boardsByProject,
        detectionReason: 'Umbrella with multiple teams',
        source: 'umbrella-teams'
      };
    }
  }

  // Check 4: multiProject.projects (1-level structure)
  if (config.multiProject?.enabled && config.multiProject?.projects) {
    const projectEntries = Object.entries(config.multiProject.projects);
    if (projectEntries.length >= 1) {
      const projects: ProjectInfo[] = projectEntries.map(([id, p]) => ({
        id: normalizeId(id),
        name: p.name || id
      }));

      return {
        level: 1,
        projects,
        detectionReason: 'multiProject configuration',
        source: 'multi-project'
      };
    }
  }

  // Check 5: Existing folder structure
  if (fs.existsSync(specsPath)) {
    try {
      const entries = fs.readdirSync(specsPath, { withFileTypes: true });
      const folders = entries.filter(e =>
        e.isDirectory() &&
        !e.name.startsWith('_') &&
        !e.name.startsWith('.') &&
        !e.name.match(/^FS-\d{3,}/)
      );

      if (folders.length > 0) {
        // Check if any folder has sub-folders (2-level)
        const firstFolder = folders[0];
        const subPath = path.join(specsPath, firstFolder.name);
        const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
        const subFolders = subEntries.filter(e =>
          e.isDirectory() &&
          !e.name.startsWith('_') &&
          !e.name.match(/^FS-\d{3,}/)
        );

        if (subFolders.length > 0) {
          // Has sub-folders that aren't FS-XXX = 2-level
          const projects: ProjectInfo[] = folders.map(f => ({
            id: f.name,
            name: f.name
          }));

          const boardsByProject: Record<string, BoardInfo[]> = {};
          for (const folder of folders) {
            const pPath = path.join(specsPath, folder.name);
            const pEntries = fs.readdirSync(pPath, { withFileTypes: true });
            const pFolders = pEntries.filter(e =>
              e.isDirectory() &&
              !e.name.startsWith('_') &&
              !e.name.match(/^FS-\d{3,}/)
            );

            if (pFolders.length > 0) {
              boardsByProject[folder.name] = pFolders.map(b => ({
                id: b.name,
                name: b.name,
                projectId: folder.name
              }));
            }
          }

          return {
            level: 2,
            projects,
            boardsByProject,
            detectionReason: 'Existing 2-level folder structure',
            source: 'existing-folders'
          };
        }

        // 1-level structure
        const projects: ProjectInfo[] = folders.map(f => ({
          id: f.name,
          name: f.name
        }));

        return {
          level: 1,
          projects,
          detectionReason: 'Existing project folders',
          source: 'existing-folders'
        };
      }
    } catch {
      // Ignore read errors
    }
  }

  // Default: single project (1-level)
  return {
    level: 1,
    projects: [{ id: 'default', name: 'Default' }],
    detectionReason: 'No multi-project configuration - single project mode',
    source: 'single-project'
  };
}

/**
 * Validate spec.md has required project/board context
 *
 * @param specContent - Content of spec.md file
 * @param projectRoot - Path to project root
 * @returns Validation result
 */
export function validateProjectContext(
  specContent: string,
  projectRoot: string = process.cwd()
): ProjectContextValidation {
  const structureConfig = detectStructureLevel(projectRoot);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse YAML frontmatter
  let project: string | undefined;
  let board: string | undefined;

  const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // Extract project field
    const projectMatch = frontmatter.match(/^project:\s*(.+)$/m);
    if (projectMatch) {
      project = projectMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    // Extract board field
    const boardMatch = frontmatter.match(/^board:\s*(.+)$/m);
    if (boardMatch) {
      board = boardMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  // Also check for **Project**: field in body (legacy format)
  if (!project) {
    const bodyProjectMatch = specContent.match(/\*\*Project\*\*:\s*(.+?)(?:\n|$)/i);
    if (bodyProjectMatch) {
      project = bodyProjectMatch[1].trim();
      warnings.push('Using **Project**: field from body - prefer project: in YAML frontmatter');
    }
  }

  // Validation based on structure level
  if (structureConfig.level === 1) {
    // 1-level: project is REQUIRED
    if (!project) {
      errors.push(
        'Missing project field in spec.md. ' +
        'Add `project: <project_name>` to YAML frontmatter. ' +
        `Available projects: ${structureConfig.projects.map(p => p.id).join(', ')}`
      );
    } else {
      // Validate project exists
      const validProject = structureConfig.projects.find(
        p => normalizeId(p.id) === normalizeId(project!)
      );
      if (!validProject && structureConfig.source !== 'single-project') {
        warnings.push(
          `Project "${project}" not found in configuration. ` +
          `Available: ${structureConfig.projects.map(p => p.id).join(', ')}`
        );
      }
    }
  } else {
    // 2-level: BOTH project AND board are REQUIRED
    if (!project) {
      errors.push(
        'Missing project field in spec.md (2-level structure detected). ' +
        'Add `project: <project_name>` to YAML frontmatter. ' +
        `Available projects: ${structureConfig.projects.map(p => p.id).join(', ')}`
      );
    }

    if (!board) {
      const boardOptions = project && structureConfig.boardsByProject?.[normalizeId(project)]
        ? structureConfig.boardsByProject[normalizeId(project)].map(b => b.id).join(', ')
        : 'N/A';

      errors.push(
        'Missing board field in spec.md (2-level structure detected). ' +
        'Add `board: <board_name>` to YAML frontmatter. ' +
        `Available boards: ${boardOptions}`
      );
    } else if (project && structureConfig.boardsByProject) {
      // Validate board exists under project
      const projectBoards = structureConfig.boardsByProject[normalizeId(project)];
      if (projectBoards) {
        const validBoard = projectBoards.find(
          b => normalizeId(b.id) === normalizeId(board!)
        );
        if (!validBoard) {
          warnings.push(
            `Board "${board}" not found under project "${project}". ` +
            `Available: ${projectBoards.map(b => b.id).join(', ')}`
          );
        }
      }
    }
  }

  // Calculate expected path
  let expectedPath: string | undefined;
  if (project) {
    if (structureConfig.level === 2 && board) {
      expectedPath = `internal/specs/${normalizeId(project)}/${normalizeId(board)}/`;
    } else if (structureConfig.level === 1) {
      expectedPath = `internal/specs/${normalizeId(project)}/`;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    structureLevel: structureConfig.level,
    project,
    board,
    expectedPath
  };
}

/**
 * Get required fields for spec.md based on structure level
 *
 * @param projectRoot - Path to project root
 * @returns Object describing required fields
 */
export function getRequiredSpecFields(projectRoot: string = process.cwd()): {
  level: 1 | 2;
  requiredFields: string[];
  optionalFields: string[];
  projects: ProjectInfo[];
  boardsByProject?: Record<string, BoardInfo[]>;
} {
  const config = detectStructureLevel(projectRoot);

  if (config.level === 2) {
    return {
      level: 2,
      requiredFields: ['project', 'board'],
      optionalFields: [],
      projects: config.projects,
      boardsByProject: config.boardsByProject
    };
  }

  return {
    level: 1,
    requiredFields: ['project'],
    optionalFields: ['board'],
    projects: config.projects
  };
}

/**
 * Normalize ID to kebab-case
 */
function normalizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export { normalizeId };
