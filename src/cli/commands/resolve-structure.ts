/**
 * Resolve Structure CLI Command
 *
 * Resolves deferred repository structure decision for greenfield projects.
 * Called during the first increment when project.structureDeferred is true.
 *
 * Usage: specweave resolve-structure --type single|multiple
 *
 * @module cli/commands/resolve-structure
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';

export interface ResolveStructureOptions {
  type: 'single' | 'multiple';
}

export interface ResolveStructureResult {
  success: boolean;
  message: string;
  previouslyDeferred: boolean;
}

/**
 * Resolve a deferred structure decision.
 *
 * Updates config.json:
 * - Sets multiProject.enabled based on --type
 * - Clears project.structureDeferred
 * - Creates repositories/ directory for multi-repo
 */
export async function resolveStructureCommand(
  options: ResolveStructureOptions
): Promise<ResolveStructureResult> {
  const configPath = path.join(process.cwd(), '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      message: 'No .specweave/config.json found. Run specweave init first.',
      previouslyDeferred: false,
    };
  }

  let config: Record<string, unknown>;
  try {
    config = fs.readJsonSync(configPath);
  } catch {
    return {
      success: false,
      message: 'Failed to read config.json',
      previouslyDeferred: false,
    };
  }

  const project = config.project as Record<string, unknown> | undefined;
  const wasDeferred = !!project?.structureDeferred;

  if (!wasDeferred) {
    return {
      success: true,
      message: 'Structure already resolved (not deferred)',
      previouslyDeferred: false,
    };
  }

  // Update config
  const isMulti = options.type === 'multiple';

  // Update project section
  if (project) {
    delete project.structureDeferred;
  }

  // Update multiProject
  config.multiProject = { enabled: isMulti };

  // Write updated config
  try {
    fs.writeJsonSync(configPath, config, { spaces: 2 });
  } catch {
    return {
      success: false,
      message: 'Failed to write config.json',
      previouslyDeferred: true,
    };
  }

  // Create repositories/ directory for multi-repo
  if (isMulti) {
    const reposDir = path.join(process.cwd(), 'repositories');
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true });
    }
  }

  const structureLabel = isMulti ? 'multi-repo' : 'single repo';
  console.log(chalk.green(`   ✓ Structure resolved: ${structureLabel}`));

  return {
    success: true,
    message: `Structure set to ${structureLabel}`,
    previouslyDeferred: true,
  };
}
