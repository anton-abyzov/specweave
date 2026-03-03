/**
 * Multi-Project Detector
 *
 * Detects multi-project/umbrella configuration from:
 * 1. config.json (umbrella.enabled, multiProject.enabled)
 * 2. childRepos configuration
 * 3. Project folders in specs/
 * 4. Sync profile projects
 *
 * Used by PM Agent, spec generators, and initial-increment-generator
 * to determine whether to generate project-scoped user stories.
 *
 * @module utils/multi-project-detector
 */

import * as fs from './fs-native.js';
import path from 'path';

/**
 * Project configuration detected from config or folder structure
 */
export interface DetectedProject {
  id: string;           // Full project ID (e.g., 'sw-app-fe')
  prefix: string;       // Short prefix for US/AC (e.g., 'FE')
  name: string;         // Display name (e.g., 'Frontend')
  path?: string;        // Optional path to project folder
}

/**
 * Multi-project detection result
 */
export interface MultiProjectDetectionResult {
  /** Whether multi-project mode is active */
  isMultiProject: boolean;

  /** Reason for detection (for debugging/logging) */
  detectionReason: string;

  /** Detected projects (empty if single-project) */
  projects: DetectedProject[];

  /** Whether umbrella mode is enabled */
  umbrellaEnabled: boolean;

  /** Whether board/area path mapping is configured */
  hasBoardMapping: boolean;

  /** Primary project prefix for cross-cutting stories (e.g., 'AUTH' for auth) */
  crossCuttingPrefix?: string;
}

/**
 * Default project prefixes for common architectures
 */
const DEFAULT_PROJECT_PREFIXES: Record<string, string> = {
  'fe': 'FE',
  'frontend': 'FE',
  'web': 'FE',
  'ui': 'FE',
  'client': 'FE',
  'be': 'BE',
  'backend': 'BE',
  'api': 'BE',
  'server': 'BE',
  'service': 'BE',
  'shared': 'SHARED',
  'common': 'SHARED',
  'lib': 'SHARED',
  'types': 'SHARED',
  'mobile': 'MOBILE',
  'ios': 'MOBILE',
  'android': 'MOBILE',
  'app': 'MOBILE',
  'infra': 'INFRA',
  'infrastructure': 'INFRA',
  'devops': 'INFRA',
  'deploy': 'INFRA',
};

/**
 * Infer project prefix from project ID/name
 */
export function inferProjectPrefix(projectId: string): string {
  const normalizedId = projectId.toLowerCase();

  // Check for exact matches first
  if (DEFAULT_PROJECT_PREFIXES[normalizedId]) {
    return DEFAULT_PROJECT_PREFIXES[normalizedId];
  }

  // Check for suffix matches (e.g., 'my-app-fe' → 'FE')
  for (const [key, prefix] of Object.entries(DEFAULT_PROJECT_PREFIXES)) {
    if (normalizedId.endsWith(`-${key}`) || normalizedId.endsWith(`_${key}`)) {
      return prefix;
    }
  }

  // Check for contains (e.g., 'frontend-service' → 'FE')
  for (const [key, prefix] of Object.entries(DEFAULT_PROJECT_PREFIXES)) {
    if (normalizedId.includes(key)) {
      return prefix;
    }
  }

  // Default: uppercase first part of ID
  const parts = projectId.split(/[-_]/);
  return parts[0].toUpperCase().slice(0, 6);
}

/**
 * Parse project configuration from childRepos
 */
function parseChildRepos(childRepos: any[]): DetectedProject[] {
  const projects: DetectedProject[] = [];

  for (const repo of childRepos) {
    if (!repo.id) continue;

    projects.push({
      id: repo.id,
      prefix: repo.prefix || inferProjectPrefix(repo.id),
      name: repo.name || repo.id,
      path: repo.path
    });
  }

  return projects;
}

/**
 * Parse project configuration from multiProject.projects
 */
function parseMultiProjectConfig(projectsConfig: Record<string, any>): DetectedProject[] {
  const projects: DetectedProject[] = [];

  for (const [id, config] of Object.entries(projectsConfig)) {
    if (typeof config !== 'object') continue;

    projects.push({
      id: id,
      prefix: config.prefix || inferProjectPrefix(id),
      name: config.name || config.displayName || id,
      path: config.path
    });
  }

  return projects;
}

/**
 * Detect projects from specs folder structure
 */
function detectProjectsFromFolders(specsPath: string): DetectedProject[] {
  const projects: DetectedProject[] = [];

  if (!fs.existsSync(specsPath)) {
    return projects;
  }

  try {
    const entries = fs.readdirSync(specsPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories and special folders
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      if (entry.name === 'default') continue;

      projects.push({
        id: entry.name,
        prefix: inferProjectPrefix(entry.name),
        name: entry.name,
        path: path.join(specsPath, entry.name)
      });
    }
  } catch {
    // Ignore read errors
  }

  return projects;
}

/**
 * Parse projects from sync profile configuration
 */
function parseProjectsFromSyncProfiles(syncConfig: any): DetectedProject[] {
  const projects: DetectedProject[] = [];
  const seenIds = new Set<string>();

  if (!syncConfig?.profiles) return projects;

  for (const [, profile] of Object.entries(syncConfig.profiles)) {
    const profileConfig = (profile as any)?.config;
    if (!profileConfig) continue;

    // Check for boardMapping (JIRA)
    if (profileConfig.boardMapping) {
      for (const [boardName, projectId] of Object.entries(profileConfig.boardMapping)) {
        const id = String(projectId);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        projects.push({
          id: id,
          prefix: inferProjectPrefix(id),
          name: boardName || id
        });
      }
    }

    // Check for areaPathMapping (ADO)
    if (profileConfig.areaPathMapping) {
      for (const [areaPath, projectId] of Object.entries(profileConfig.areaPathMapping)) {
        const id = String(projectId);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        projects.push({
          id: id,
          prefix: inferProjectPrefix(id),
          name: areaPath.split('\\').pop() || id
        });
      }
    }

    // Check for projects array
    if (profileConfig.projects && Array.isArray(profileConfig.projects)) {
      for (const projectId of profileConfig.projects) {
        const id = String(projectId);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        projects.push({
          id: id,
          prefix: inferProjectPrefix(id),
          name: id
        });
      }
    }
  }

  return projects;
}

/**
 * Detect multi-project configuration
 *
 * @param projectRoot - Path to project root (default: process.cwd())
 * @returns Detection result with project information
 */
export function detectMultiProjectMode(projectRoot: string = process.cwd()): MultiProjectDetectionResult {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  const specsPath = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  let config: any = {};

  // Read config.json if exists
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Ignore parse errors
    }
  }

  // Check 1: umbrella.enabled with 2+ child repos
  if (config.umbrella?.enabled === true) {
    const projects = config.umbrella?.childRepos
      ? parseChildRepos(config.umbrella.childRepos)
      : [];

    // Multi-project requires 2+ projects (1 project = single-project mode)
    if (projects.length > 1) {
      return {
        isMultiProject: true,
        detectionReason: 'umbrella.enabled with childRepos',
        projects,
        umbrellaEnabled: true,
        hasBoardMapping: false
      };
    }
  }

  // Check 2: multiProject.enabled with 2+ projects
  if (config.multiProject?.enabled === true) {
    const projects = config.multiProject?.projects
      ? parseMultiProjectConfig(config.multiProject.projects)
      : [];

    // Multi-project requires 2+ projects (1 project = single-project mode)
    if (projects.length > 1) {
      return {
        isMultiProject: true,
        detectionReason: 'multiProject.enabled with projects config',
        projects,
        umbrellaEnabled: false,
        hasBoardMapping: false
      };
    }
  }

  // Check 3: Sync profile with board/area path mapping
  if (config.sync?.profiles) {
    const syncProjects = parseProjectsFromSyncProfiles(config.sync);
    const hasBoardMapping = Object.values(config.sync.profiles).some((p: any) =>
      p?.config?.boardMapping || p?.config?.areaPathMapping
    );

    if (syncProjects.length > 1) {
      return {
        isMultiProject: true,
        detectionReason: 'sync profiles with multiple projects',
        projects: syncProjects,
        umbrellaEnabled: false,
        hasBoardMapping
      };
    }
  }

  // Check 4: Multiple project folders in specs/
  const folderProjects = detectProjectsFromFolders(specsPath);
  if (folderProjects.length > 1) {
    return {
      isMultiProject: true,
      detectionReason: 'multiple project folders in specs/',
      projects: folderProjects,
      umbrellaEnabled: false,
      hasBoardMapping: false
    };
  }

  // Single project mode
  return {
    isMultiProject: false,
    detectionReason: 'no multi-project configuration detected',
    projects: [],
    umbrellaEnabled: false,
    hasBoardMapping: false
  };
}

/**
 * Get project prefixes for user story generation
 *
 * @param projectRoot - Path to project root
 * @returns Array of project prefixes (e.g., ['FE', 'BE', 'SHARED'])
 */
export function getProjectPrefixes(projectRoot: string = process.cwd()): string[] {
  const detection = detectMultiProjectMode(projectRoot);

  if (!detection.isMultiProject || detection.projects.length === 0) {
    return [];
  }

  return detection.projects.map(p => p.prefix);
}

/**
 * Get project by prefix
 *
 * @param prefix - Project prefix (e.g., 'FE')
 * @param projectRoot - Path to project root
 * @returns Project or undefined
 */
export function getProjectByPrefix(
  prefix: string,
  projectRoot: string = process.cwd()
): DetectedProject | undefined {
  const detection = detectMultiProjectMode(projectRoot);
  return detection.projects.find(p =>
    p.prefix.toUpperCase() === prefix.toUpperCase()
  );
}

/**
 * Format user story ID with project prefix (if multi-project)
 *
 * @param storyNumber - Story number (1, 2, 3...)
 * @param projectPrefix - Optional project prefix (e.g., 'FE')
 * @param projectRoot - Path to project root
 * @returns Formatted ID (e.g., 'US-FE-001' or 'US-001')
 */
export function formatUserStoryId(
  storyNumber: number,
  projectPrefix?: string,
  projectRoot: string = process.cwd()
): string {
  const paddedNumber = String(storyNumber).padStart(3, '0');

  if (projectPrefix) {
    return `US-${projectPrefix.toUpperCase()}-${paddedNumber}`;
  }

  // Auto-detect if multi-project
  const detection = detectMultiProjectMode(projectRoot);
  if (detection.isMultiProject) {
    // If multi-project but no prefix provided, use generic format
    // (caller should provide prefix for proper scoping)
    return `US-${paddedNumber}`;
  }

  return `US-${paddedNumber}`;
}

/**
 * Format acceptance criteria ID with project prefix (if multi-project)
 *
 * @param userStoryNumber - User story number (1, 2, 3...)
 * @param acNumber - Acceptance criteria number within story (1, 2, 3...)
 * @param projectPrefix - Optional project prefix (e.g., 'FE')
 * @returns Formatted ID (e.g., 'AC-FE-US1-01' or 'AC-US1-01')
 */
export function formatAcceptanceCriteriaId(
  userStoryNumber: number,
  acNumber: number,
  projectPrefix?: string
): string {
  const paddedAcNumber = String(acNumber).padStart(2, '0');

  if (projectPrefix) {
    return `AC-${projectPrefix.toUpperCase()}-US${userStoryNumber}-${paddedAcNumber}`;
  }

  return `AC-US${userStoryNumber}-${paddedAcNumber}`;
}

/**
 * Generate template variables for multi-project spec
 *
 * @param detection - Multi-project detection result
 * @returns Template variable map
 */
export function generateMultiProjectTemplateVars(
  detection: MultiProjectDetectionResult
): Record<string, string> {
  const vars: Record<string, string> = {
    MULTI_PROJECT: detection.isMultiProject ? 'true' : 'false'
  };

  if (!detection.isMultiProject) {
    return vars;
  }

  // Add project-specific variables
  for (const project of detection.projects) {
    const prefixUpper = project.prefix.toUpperCase();
    vars[`PROJECT_${prefixUpper}_ID`] = project.id;
    vars[`PROJECT_${prefixUpper}_PREFIX`] = project.prefix;
    vars[`PROJECT_${prefixUpper}_NAME`] = project.name;
  }

  // Add common project IDs for templates
  const feProject = detection.projects.find(p => p.prefix.toUpperCase() === 'FE');
  const beProject = detection.projects.find(p => p.prefix.toUpperCase() === 'BE');
  const sharedProject = detection.projects.find(p =>
    p.prefix.toUpperCase() === 'SHARED' || p.prefix.toUpperCase() === 'COMMON'
  );

  if (feProject) vars.PROJECT_FE_ID = feProject.id;
  if (beProject) vars.PROJECT_BE_ID = beProject.id;
  if (sharedProject) vars.PROJECT_SHARED_ID = sharedProject.id;

  return vars;
}
