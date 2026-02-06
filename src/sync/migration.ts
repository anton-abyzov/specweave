/**
 * E-to-Platform Suffix Migration
 *
 * Migrates legacy E suffix items to platform-specific suffixes (G/J/A).
 * ADR-0233: Platform suffix IDs.
 */

import { type PlatformSuffix, SUFFIX_MAP, type Platform } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationItem {
  id: string;
  source: string | undefined;
  folderPath: string | undefined;
}

export interface MigrationRename {
  oldId: string;
  newId: string;
  oldFolder: string | undefined;
  newFolder: string | undefined;
  source: string;
}

export interface MigrationPlan {
  renames: MigrationRename[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/**
 * Map an external source name to the correct platform suffix.
 * Returns 'E' for unknown sources (migration skipped).
 */
export function mapEToplatformSuffix(source: string | undefined): PlatformSuffix {
  if (!source) return 'E';

  const platform = source.toLowerCase() as Platform;
  return SUFFIX_MAP[platform] || 'E';
}

// ---------------------------------------------------------------------------
// Migration planning
// ---------------------------------------------------------------------------

/**
 * Create a migration plan for E-suffix items.
 * Does NOT execute the migration — just builds the plan.
 */
export function planMigration(items: MigrationItem[]): MigrationPlan {
  const renames: MigrationRename[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const newSuffix = mapEToplatformSuffix(item.source);

    if (newSuffix === 'E') {
      // Can't determine platform — warn and skip
      warnings.push(
        `${item.id}: Cannot migrate — source is "${item.source || 'undefined'}". Item will remain with E suffix.`
      );
      continue;
    }

    // Replace E suffix with platform suffix in ID
    const newId = item.id.replace(/E$/, newSuffix);

    // Replace E suffix in folder path if present
    let newFolder: string | undefined;
    if (item.folderPath) {
      // Pattern: /0042E-name → /0042G-name
      newFolder = item.folderPath.replace(/(\d+)E(-)/,  `$1${newSuffix}$2`);
    }

    renames.push({
      oldId: item.id,
      newId,
      oldFolder: item.folderPath,
      newFolder,
      source: item.source || 'unknown',
    });
  }

  return { renames, warnings };
}

/**
 * Execute a migration plan — rename files and update references.
 * This is the destructive operation; planMigration() is safe.
 */
export async function executeMigration(
  plan: MigrationPlan,
  fs: { rename: (oldPath: string, newPath: string) => Promise<void>; readFile: (path: string) => Promise<string>; writeFile: (path: string, content: string) => Promise<void> },
): Promise<{ renamed: number; errors: string[] }> {
  let renamed = 0;
  const errors: string[] = [];

  for (const rename of plan.renames) {
    try {
      // Rename folder if applicable
      if (rename.oldFolder && rename.newFolder) {
        await fs.rename(rename.oldFolder, rename.newFolder);
      }

      // Update internal references (spec.md, tasks.md, metadata.json)
      const baseFolder = rename.newFolder || rename.oldFolder;
      if (baseFolder) {
        for (const fileName of ['spec.md', 'tasks.md', 'metadata.json']) {
          try {
            const filePath = `${baseFolder}/${fileName}`;
            const content = await fs.readFile(filePath);
            const updated = content.replace(
              new RegExp(escapeRegex(rename.oldId), 'g'),
              rename.newId
            );
            if (updated !== content) {
              await fs.writeFile(filePath, updated);
            }
          } catch {
            // File may not exist, skip
          }
        }
      }

      renamed++;
    } catch (error) {
      errors.push(`Failed to migrate ${rename.oldId} → ${rename.newId}: ${String(error)}`);
    }
  }

  return { renamed, errors };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
