/**
 * Spec Project Mapper
 *
 * Maps FS-XXX feature spec folders to their owning project(s) by scanning
 * increment metadata and spec.md **Project**: fields. Used by the
 * --reorganize-specs flag of migrate-to-umbrella.
 *
 * @module core/migration/spec-project-mapper
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReorgOperation {
  featureId: string;
  source: string;
  destination: string;
  type: 'move' | 'copy';
}

// ---------------------------------------------------------------------------
// buildFeatureProjectMap
// ---------------------------------------------------------------------------

/**
 * Builds a map of FS-XXX feature IDs to their owning project(s).
 *
 * Strategy:
 * 1. Scan all increments for feature_id in metadata.json (explicit link)
 * 2. Fall back to numeric matching: FS-282 → glob 0282-*
 * 3. Parse increment spec.md for **Project**: lines
 * 4. Default to current project folder name when no Project field found
 *
 * @param projectRoot - Root of the umbrella workspace
 * @returns Map of featureId (e.g. "FS-282") to project IDs (e.g. ["vskill-platform"])
 */
export async function buildFeatureProjectMap(
  projectRoot: string,
): Promise<Map<string, string[]>> {
  const specweavePath = path.join(projectRoot, '.specweave');
  const incrementsDir = path.join(specweavePath, 'increments');
  const specsBaseDir = path.join(specweavePath, 'docs', 'internal', 'specs');

  // Discover existing FS-XXX folders across all project subdirs
  const featureIds = await discoverFeatureIds(specsBaseDir);
  if (featureIds.length === 0) {
    return new Map();
  }

  // Build increment index: numeric prefix → increment dir name
  const incrementIndex = await buildIncrementIndex(incrementsDir);

  // Build feature_id → increment dir name from metadata
  const metadataIndex = await buildMetadataIndex(incrementsDir);

  const result = new Map<string, string[]>();

  for (const featureId of featureIds) {
    // Extract numeric part: FS-282 → 282
    const numericPart = featureId.replace('FS-', '');

    // Try metadata feature_id first, then numeric match
    let incrementDirName = metadataIndex.get(featureId);
    if (!incrementDirName) {
      // Pad to 4 digits for matching: 282 → 0282
      const padded = numericPart.padStart(4, '0');
      incrementDirName = incrementIndex.get(padded);
    }

    if (!incrementDirName) {
      // No matching increment — default to current project
      result.set(featureId, [detectCurrentProject(specsBaseDir)]);
      continue;
    }

    // Parse spec.md for **Project**: fields
    const specPath = path.join(incrementsDir, incrementDirName, 'spec.md');
    const projects = await parseProjectFields(specPath);

    if (projects.length === 0) {
      result.set(featureId, [detectCurrentProject(specsBaseDir)]);
    } else {
      // Deduplicate
      result.set(featureId, [...new Set(projects)]);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// generateReorganizationPlan
// ---------------------------------------------------------------------------

/**
 * Generates a list of move/copy operations to reorganize FS-XXX folders
 * from a centralized project directory to per-project directories.
 *
 * @param featureMap - Map from buildFeatureProjectMap()
 * @param specsDir - Path to .specweave/docs/internal/specs/
 * @param currentProject - Name of the current (centralized) project folder
 * @returns List of move/copy operations
 */
export async function generateReorganizationPlan(
  featureMap: Map<string, string[]>,
  specsDir: string,
  currentProject: string,
): Promise<ReorgOperation[]> {
  const ops: ReorgOperation[] = [];

  for (const [featureId, targetProjects] of featureMap) {
    const sourcePath = path.join(specsDir, currentProject, featureId);
    const sourceExists = fs.existsSync(sourcePath);

    // Source must exist under the current project to move/copy
    if (!sourceExists) continue;

    // If one of the targets IS the current project, keep the original in place
    // and copy to all other targets. Otherwise, move to first and copy to rest.
    const staysInPlace = targetProjects.includes(currentProject);
    let firstNonCurrent = true;

    for (const targetProject of targetProjects) {
      const destPath = path.join(specsDir, targetProject, featureId);

      // Skip if target is current project (already in place)
      if (targetProject === currentProject) continue;

      // Skip if destination already exists (idempotency)
      if (fs.existsSync(destPath)) continue;

      // If the original stays in place, all other targets are copies.
      // If the original doesn't stay, the first non-current target gets a move.
      const isMove = !staysInPlace && firstNonCurrent;
      firstNonCurrent = false;

      ops.push({
        featureId,
        source: sourcePath,
        destination: destPath,
        type: isMove ? 'move' : 'copy',
      });
    }
  }

  return ops;
}

// ---------------------------------------------------------------------------
// reorganizeSpecs
// ---------------------------------------------------------------------------

export interface ReorganizeOptions {
  execute: boolean;
}

/**
 * Executes a reorganization plan: moves/copies FS-XXX folders to per-project
 * directories and enables multiProject mode in config.json.
 *
 * @param plan - List of move/copy operations from generateReorganizationPlan()
 * @param configPath - Path to .specweave/config.json
 * @param options - { execute: true } to apply changes, false for dry-run
 */
export async function reorganizeSpecs(
  plan: ReorgOperation[],
  configPath: string,
  options: ReorganizeOptions,
): Promise<void> {
  if (!options.execute) {
    return;
  }

  // Execute move/copy operations
  for (const op of plan) {
    const destDir = path.dirname(op.destination);
    await fs.promises.mkdir(destDir, { recursive: true });

    if (op.type === 'move') {
      try {
        await fs.promises.rename(op.source, op.destination);
      } catch {
        // Cross-device: copy then delete
        await copyDirRecursive(op.source, op.destination);
        await fs.promises.rm(op.source, { recursive: true });
      }
    } else {
      // copy
      await copyDirRecursive(op.source, op.destination);
    }
  }

  // Update config.json: enable multiProject
  try {
    const raw = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    if (config.multiProject?.enabled !== true) {
      config.multiProject = config.multiProject || {};
      config.multiProject.enabled = true;
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Recursively copy a directory tree.
 */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Discovers all FS-XXX directory names across all project subfolders.
 */
async function discoverFeatureIds(specsBaseDir: string): Promise<string[]> {
  const featureIds: string[] = [];

  if (!fs.existsSync(specsBaseDir)) return featureIds;

  const projectDirs = await fs.promises.readdir(specsBaseDir, { withFileTypes: true });
  for (const dir of projectDirs) {
    if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
    const projectPath = path.join(specsBaseDir, dir.name);
    const entries = await fs.promises.readdir(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && /^FS-\d+/.test(entry.name)) {
        if (!featureIds.includes(entry.name)) {
          featureIds.push(entry.name);
        }
      }
    }
  }

  return featureIds;
}

/**
 * Builds an index of 4-digit numeric prefix → increment directory name.
 * E.g., "0282" → "0282-repo-links-all-skill-surfaces"
 */
async function buildIncrementIndex(
  incrementsDir: string,
): Promise<Map<string, string>> {
  const index = new Map<string, string>();

  if (!fs.existsSync(incrementsDir)) return index;

  const entries = await fs.promises.readdir(incrementsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(\d{4})/);
    if (match) {
      index.set(match[1], entry.name);
    }
  }

  return index;
}

/**
 * Builds an index of feature_id → increment directory name from metadata.json files.
 * E.g., "FS-190" → "0300-custom-feature"
 */
async function buildMetadataIndex(
  incrementsDir: string,
): Promise<Map<string, string>> {
  const index = new Map<string, string>();

  if (!fs.existsSync(incrementsDir)) return index;

  const entries = await fs.promises.readdir(incrementsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metadataPath = path.join(incrementsDir, entry.name, 'metadata.json');
    try {
      const raw = await fs.promises.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(raw);
      if (metadata.feature_id && typeof metadata.feature_id === 'string') {
        index.set(metadata.feature_id, entry.name);
      }
    } catch {
      // Skip invalid/missing metadata
    }
  }

  return index;
}

/**
 * Parses a spec.md file for **Project**: lines and returns unique project IDs.
 * Handles comma-separated values (e.g., "specweave, vskill").
 * Ignores backtick-escaped mentions (e.g., `**Project**:` in prose).
 */
async function parseProjectFields(specPath: string): Promise<string[]> {
  try {
    const content = await fs.promises.readFile(specPath, 'utf-8');
    const projects: string[] = [];
    // Match **Project**: at start of line (not inside backticks)
    const regex = /^\*\*Project\*\*:\s*(.+)/gm;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const rawValue = match[1].trim();
      // Skip if the line was inside backticks (preceded by `)
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const prefix = content.substring(lineStart, match.index);
      if (prefix.includes('`')) continue;

      // Split comma-separated project IDs
      const parts = rawValue.split(',').map((p) => p.trim()).filter(Boolean);
      for (const project of parts) {
        if (!projects.includes(project)) {
          projects.push(project);
        }
      }
    }
    return projects;
  } catch {
    return [];
  }
}

/**
 * Detects the current (primary) project folder name by finding the first
 * non-archive directory under the specs base dir.
 */
function detectCurrentProject(specsBaseDir: string): string {
  try {
    const entries = fs.readdirSync(specsBaseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_')) {
        return entry.name;
      }
    }
  } catch {
    // fallback
  }
  return 'default';
}
