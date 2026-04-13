import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { RubricDocument, RubricCriterion } from './types.js';
import { parseRubric } from './rubric-parser.js';

interface MergeOptions {
  globalPath?: string;
  projectPath?: string;
  incrementPath?: string;
}

async function tryParseFile(filePath: string): Promise<RubricCriterion[] | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const doc = parseRubric(content);
    return doc.criteria;
  } catch (error: unknown) {
    // File not found → silently skip (expected for missing tiers)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return null;
    }
    // Parse errors and other failures → re-throw so caller can warn
    throw error;
  }
}

/**
 * Merge rubric criteria from three tiers: global → project → increment.
 * Lower tier overrides higher on ID collision (whole-criterion replacement).
 * Returns null if no rubric files exist at any tier.
 */
export async function mergeRubricLayers(
  projectRoot: string,
  incrementId: string,
  incrementPath: string,
  options: MergeOptions = {},
): Promise<RubricDocument | null> {
  const globalFile = options.globalPath ??
    path.join(projectRoot, 'plugins', 'specweave', 'defaults', 'rubric-defaults.md');
  const projectFile = options.projectPath ??
    path.join(projectRoot, '.specweave', 'rubric-defaults.md');
  const incrementFile = options.incrementPath ??
    path.join(incrementPath, 'rubric.md');

  const globalCriteria = await tryParseFile(globalFile);
  const projectCriteria = await tryParseFile(projectFile);
  const incrementCriteria = await tryParseFile(incrementFile);

  if (!globalCriteria && !projectCriteria && !incrementCriteria) {
    return null;
  }

  // Build merged criteria map: global → project → increment (last wins)
  const merged = new Map<string, RubricCriterion>();

  if (globalCriteria) {
    for (const c of globalCriteria) merged.set(c.id, c);
  }
  if (projectCriteria) {
    for (const c of projectCriteria) merged.set(c.id, c);
  }
  if (incrementCriteria) {
    for (const c of incrementCriteria) merged.set(c.id, c);
  }

  // Stable ordering: functional-correctness first, then standard categories
  const categoryOrder: string[] = [
    'functional-correctness',
    'test-coverage',
    'code-quality',
    'security',
    'performance',
    'documentation',
    'independent-evaluation',
  ];

  const sortedCriteria = [...merged.values()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.id.localeCompare(b.id);
  });

  return {
    incrementId,
    title: `Merged Rubric for ${incrementId}`,
    generated: new Date().toISOString(),
    source: 'merged',
    version: '1.0',
    status: 'pending',
    criteria: sortedCriteria,
  };
}
