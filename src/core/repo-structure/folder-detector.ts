/**
 * Folder Detector
 *
 * Auto-detects repository structure from existing folders
 * to suggest repository count during multi-repo setup.
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';

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
    // Note: COMMON_PATTERNS no longer contains glob patterns (removed nested patterns)
    // All patterns are now direct folder names
    const folderPath = path.join(projectPath, pattern);
    try {
      if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
        detected.push(pattern);
      }
    } catch {
      // Ignore file system errors
    }
  }

  const uniqueFolders = [...new Set(detected)];
  const folderCount = uniqueFolders.length;

  // Calculate confidence based on folder count
  let confidence: 'low' | 'medium' | 'high';
  if (folderCount >= 3) {
    confidence = 'high';
  } else if (folderCount >= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    suggestedCount: Math.max(2, folderCount),
    detectedFolders: uniqueFolders,
    confidence
  };
}
