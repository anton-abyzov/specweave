/**
 * Multi-Project Folder Helper (0188)
 *
 * Creates specs directories for any provider's multi-project setup.
 * Shared by JIRA, ADO, GitHub, and Bitbucket init paths.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Normalize a project name into a valid folder name.
 * Lowercases, replaces spaces and non-alphanumeric chars with hyphens.
 */
function normalizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create project folders under .specweave/docs/internal/specs/.
 *
 * @param targetDir - Project root directory
 * @param projects - List of project names to create folders for
 * @returns List of normalized folder names that were ensured to exist
 */
export async function createProjectFolders(
  targetDir: string,
  projects: string[]
): Promise<string[]> {
  const specsBase = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs');
  const ensured: string[] = [];

  for (const project of projects) {
    const folderName = normalizeFolderName(project);
    if (!folderName) continue;

    const folderPath = path.join(specsBase, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    ensured.push(folderName);
  }

  return ensured;
}
