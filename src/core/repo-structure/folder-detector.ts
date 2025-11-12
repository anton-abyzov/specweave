/**
 * Folder Detector
 *
 * Auto-detects repository structure from existing folders
 * to suggest repository count during multi-repo setup.
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface RepositoryHints {
  suggestedCount: number;
  detectedFolders: string[];
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Common repository patterns
 * NOTE: Removed nested patterns (services/*, apps/*, packages/*) to ensure
 * repositories are created at ROOT level only (e.g., backend/, frontend/)
 * not in nested folders (e.g., services/backend/)
 */
const COMMON_PATTERNS = [
  // Direct folders (highest confidence)
  'frontend',
  'backend',
  'api',
  'mobile',
  'web',
  'admin',
  'client',
  'server',
  'ui',

  // Microservice patterns (medium confidence)
  // NOTE: Removed '*-service', '*-api', '*-app' patterns
  // to prevent creating repos in services/ folder
];

/**
 * Detect repository hints from existing folder structure
 *
 * @param projectPath - Path to project directory
 * @returns Repository hints with suggested count
 */
export async function detectRepositoryHints(
  projectPath: string
): Promise<RepositoryHints> {
  const detected: string[] = [];

  for (const pattern of COMMON_PATTERNS) {
    if (pattern.includes('*')) {
      // Glob pattern
      try {
        const matches = await glob(pattern, {
          cwd: projectPath,
          absolute: false,
          nodir: false
        });

        // Filter to directories only
        const dirs = matches.filter(m => {
          const fullPath = path.join(projectPath, m);
          try {
            return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
          } catch {
            return false;
          }
        });

        detected.push(...dirs);
      } catch (error) {
        // Ignore glob errors
      }
    } else {
      // Direct folder check
      const folderPath = path.join(projectPath, pattern);
      try {
        if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
          detected.push(pattern);
        }
      } catch {
        // Ignore file system errors
      }
    }
  }

  // Deduplicate
  const uniqueFolders = [...new Set(detected)];

  // Calculate confidence
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (uniqueFolders.length >= 3) {
    confidence = 'high';
  } else if (uniqueFolders.length >= 2) {
    confidence = 'medium';
  }

  // Suggest count (at least 2 for multi-repo)
  const suggestedCount = Math.max(2, uniqueFolders.length);

  return {
    suggestedCount,
    detectedFolders: uniqueFolders,
    confidence
  };
}
