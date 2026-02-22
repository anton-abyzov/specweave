/**
 * Feature ID Resolver
 *
 * Resolves the feature ID for an increment by checking:
 * 1. metadata.json feature_id field
 * 2. spec.md frontmatter feature_id
 * 3. Derivation from increment number (FS-{NNNN})
 *
 * Part of increment 0313: Post-closure sync pipeline
 */

import { readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Resolve the feature ID for an increment.
 * Returns null if no feature ID can be determined.
 */
export async function resolveFeatureId(
  projectRoot: string,
  incrementId: string,
): Promise<string | null> {
  try {
    // Find increment directory
    const incrementDirs = await glob(
      path.join(projectRoot, '.specweave/increments', `${incrementId.slice(0, 4)}*`),
    );
    if (incrementDirs.length === 0) return null;
    const incrementDir = incrementDirs[0];

    // 1. Check metadata.json feature_id
    try {
      const metadataPath = path.join(incrementDir, 'metadata.json');
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
      if (metadata.feature_id) return metadata.feature_id;
    } catch {
      // metadata.json missing or malformed — continue
    }

    // 2. Check spec.md frontmatter
    try {
      const specPath = path.join(incrementDir, 'spec.md');
      const specContent = await readFile(specPath, 'utf-8');
      const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const featureMatch = frontmatterMatch[1].match(/feature_id:\s*["']?([^\s"']+)/);
        if (featureMatch) return featureMatch[1];
      }
    } catch {
      // spec.md missing or malformed — continue
    }

    // 3. Derive from increment number
    const numMatch = incrementId.match(/^(\d{4})/);
    if (numMatch) {
      return `FS-${numMatch[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}
