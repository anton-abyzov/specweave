/**
 * Project ID Generator with Duplicate Prevention (v0.29.0+)
 *
 * Generates unique SpecWeave project IDs from external tool entities:
 * - JIRA boards → Project IDs
 * - ADO area paths → Project IDs
 * - GitHub repos → Project IDs
 *
 * Handles collision detection and composite key generation.
 */

import * as fs from './fs-native.js';
import * as path from 'path';

/**
 * Project ID generation options
 */
export interface ProjectIdOptions {
  /** External container (JIRA project key, ADO project name) */
  externalContainer: string;

  /** Local name (board name, area path, repo name) */
  localName: string;

  /** Provider type */
  provider: 'jira' | 'ado' | 'github';

  /** Existing project IDs to check for collisions */
  existingIds?: string[];
}

/**
 * Generated project ID result
 */
export interface ProjectIdResult {
  /** Generated project ID */
  id: string;

  /** Whether collision was detected and prefix was added */
  hadCollision: boolean;

  /** Original local name before sanitization */
  originalName: string;

  /** Full composite key (container + local) */
  compositeKey: string;
}

/**
 * Normalize a string to a valid project ID
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Remove leading/trailing hyphens
 */
export function normalizeToProjectId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Generate a short prefix from external container name
 * Used when collision is detected
 */
export function generateContainerPrefix(container: string): string {
  // For JIRA project keys like "CORE", use as-is (already short)
  if (/^[A-Z]{2,10}$/.test(container)) {
    return container.toLowerCase();
  }

  // For longer names, create abbreviation
  // "MyProduct" → "mp", "Backend-Services" → "bs"
  const words = container.split(/[-_\s]+/);
  if (words.length === 1) {
    // Single word: use first 3 chars
    return container.substring(0, 3).toLowerCase();
  }

  // Multiple words: use first letter of each
  return words.map(w => w[0]).join('').toLowerCase();
}

/**
 * Generate unique project ID with collision detection
 *
 * Algorithm:
 * 1. Normalize local name to project ID format
 * 2. Check if ID exists in existingIds
 * 3. If collision, add container prefix: "core-fe" instead of "fe"
 * 4. If still collision (rare), add numeric suffix: "core-fe-2"
 *
 * @param options Generation options
 * @returns Generated project ID with metadata
 */
export function generateProjectId(options: ProjectIdOptions): ProjectIdResult {
  const { externalContainer, localName, provider, existingIds = [] } = options;

  // Step 1: Normalize local name
  const baseId = normalizeToProjectId(localName);
  const compositeKey = `${externalContainer}/${localName}`;

  // Step 2: Check for collision
  if (!existingIds.includes(baseId)) {
    return {
      id: baseId,
      hadCollision: false,
      originalName: localName,
      compositeKey,
    };
  }

  // Step 3: Collision detected - add container prefix
  const prefix = generateContainerPrefix(externalContainer);
  let prefixedId = `${prefix}-${baseId}`;

  if (!existingIds.includes(prefixedId)) {
    return {
      id: prefixedId,
      hadCollision: true,
      originalName: localName,
      compositeKey,
    };
  }

  // Step 4: Still collision (rare) - add numeric suffix
  let suffix = 2;
  while (existingIds.includes(`${prefixedId}-${suffix}`)) {
    suffix++;
    if (suffix > 100) {
      throw new Error(`Cannot generate unique ID for ${compositeKey} after 100 attempts`);
    }
  }

  return {
    id: `${prefixedId}-${suffix}`,
    hadCollision: true,
    originalName: localName,
    compositeKey,
  };
}

/**
 * Batch generate project IDs from multiple sources
 * Ensures no collisions within the batch and with existing IDs
 */
export function generateProjectIdsBatch(
  sources: Array<{ container: string; localName: string; provider: 'jira' | 'ado' | 'github' }>,
  existingIds: string[] = []
): Map<string, ProjectIdResult> {
  const results = new Map<string, ProjectIdResult>();
  const allIds = [...existingIds];

  for (const source of sources) {
    const result = generateProjectId({
      externalContainer: source.container,
      localName: source.localName,
      provider: source.provider,
      existingIds: allIds,
    });

    // Add to tracking to prevent intra-batch collisions
    allIds.push(result.id);

    // Key by composite key for easy lookup
    results.set(result.compositeKey, result);
  }

  return results;
}

/**
 * Get existing project IDs from a SpecWeave project
 *
 * @param projectRoot Path to project root
 * @returns Array of existing project IDs
 */
export function getExistingProjectIds(projectRoot: string): string[] {
  const specsDir = path.join(projectRoot, '.specweave', 'docs', 'internal', 'specs');

  if (!fs.existsSync(specsDir)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

/**
 * Create 2-level directory structure for JIRA/ADO projects
 *
 * Structure:
 * .specweave/docs/internal/specs/
 * ├── JIRA-CORE/                  (external container level)
 * │   ├── fe/                     (SpecWeave project level)
 * │   ├── be/
 * │   └── mobile/
 * └── ADO-MyProduct/
 *     ├── fe/
 *     └── be/
 *
 * @param projectRoot Path to project root
 * @param containerType Type of external container
 * @param containerId External container ID (JIRA project key or ADO project name)
 * @param specweaveProjectId SpecWeave project ID
 */
export function createTwoLevelProjectDir(
  projectRoot: string,
  containerType: 'jira' | 'ado',
  containerId: string,
  specweaveProjectId: string
): string {
  // Normalize container ID to directory-safe name
  const containerDirName = `${containerType.toUpperCase()}-${normalizeToProjectId(containerId)}`;
  const projectDirName = specweaveProjectId;

  const fullPath = path.join(
    projectRoot,
    '.specweave',
    'docs',
    'internal',
    'specs',
    containerDirName,
    projectDirName
  );

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}

/**
 * Get the 2-level path for a project
 *
 * @param projectRoot Path to project root
 * @param containerType Type of external container
 * @param containerId External container ID
 * @param specweaveProjectId SpecWeave project ID
 * @returns Full path or undefined if using flat structure
 */
export function getTwoLevelProjectPath(
  projectRoot: string,
  containerType: 'jira' | 'ado' | null,
  containerId: string | null,
  specweaveProjectId: string
): string {
  // If no container type, use flat structure (GitHub or single project)
  if (!containerType || !containerId) {
    return path.join(
      projectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs',
      specweaveProjectId
    );
  }

  // 2-level structure for JIRA/ADO
  const containerDirName = `${containerType.toUpperCase()}-${normalizeToProjectId(containerId)}`;
  return path.join(
    projectRoot,
    '.specweave',
    'docs',
    'internal',
    'specs',
    containerDirName,
    specweaveProjectId
  );
}

/**
 * Parse a 2-level project path to extract container and project info
 *
 * @param projectPath Path like ".specweave/docs/internal/specs/JIRA-CORE/fe"
 * @returns Parsed container and project info
 */
export function parseTwoLevelPath(projectPath: string): {
  containerType: 'jira' | 'ado' | null;
  containerId: string | null;
  projectId: string;
} | null {
  // Match pattern: .../specs/{CONTAINER-TYPE-ID}/{PROJECT-ID}
  const match = projectPath.match(/specs[/\\]((?:JIRA|ADO)-([^/\\]+))[/\\]([^/\\]+)/);

  if (!match) {
    // Try flat structure: .../specs/{PROJECT-ID}
    const flatMatch = projectPath.match(/specs[/\\]([^/\\]+)$/);
    if (flatMatch) {
      return {
        containerType: null,
        containerId: null,
        projectId: flatMatch[1],
      };
    }
    return null;
  }

  const [, containerDir, containerId, projectId] = match;
  const containerType = containerDir.startsWith('JIRA-') ? 'jira' : 'ado';

  return {
    containerType,
    containerId,
    projectId,
  };
}

/**
 * Validate project ID format
 */
export function isValidProjectId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(id);
}

/**
 * Suggest a valid project ID from an invalid one
 */
export function suggestProjectId(invalidId: string): string {
  const suggestion = normalizeToProjectId(invalidId);
  return suggestion || 'project';
}
