/**
 * Test Safeguards - Prevent Accidental Deletion of .specweave/ Directories
 *
 * This module provides safeguards to prevent tests from accidentally
 * deleting the real .specweave/increments and .specweave/docs directories.
 *
 * CRITICAL: Import this file in jest.setup.ts to enable global protection.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

// Store original fs.remove and fs.rm functions
const originalRemove = fs.remove.bind(fs);
const originalRm = fs.rm ? fs.rm.bind(fs) : null;

/**
 * Check if a path is inside the real .specweave/increments or .specweave/docs directories
 */
function isDangerousPath(targetPath: string): boolean {
  const absolutePath = path.resolve(targetPath);
  const projectRoot = process.cwd();

  // Dangerous paths (relative to project root)
  const dangerousPaths = [
    path.join(projectRoot, '.specweave/increments'),
    path.join(projectRoot, '.specweave/docs'),
    path.join(projectRoot, '.specweave/state'),
    path.join(projectRoot, '.specweave'),  // Root .specweave directory itself
  ];

  // Check if target path is one of the dangerous paths or a parent
  for (const dangerousPath of dangerousPaths) {
    if (absolutePath === dangerousPath || dangerousPath.startsWith(absolutePath + path.sep)) {
      return true;
    }
  }

  return false;
}

/**
 * Wrapped fs.remove that prevents deletion of .specweave/ directories
 */
async function safeRemove(targetPath: string): Promise<void> {
  if (isDangerousPath(targetPath)) {
    const errorMsg = `🚨 CRITICAL: Test attempted to delete protected directory: ${targetPath}\n` +
      `This is likely a test isolation bug. Tests should NEVER delete real .specweave/ directories!\n` +
      `\n` +
      `FIX:\n` +
      `1. Use an isolated test directory (e.g., tests/fixtures/temp-test-data)\n` +
      `2. NEVER use paths inside .specweave/ for test data\n` +
      `3. Example: path.join(__dirname, '../../fixtures/temp-test-data')\n`;

    console.error(errorMsg);
    throw new Error(`BLOCKED: Attempted to delete protected .specweave/ directory: ${targetPath}`);
  }

  return originalRemove(targetPath);
}

/**
 * Wrapped fs.rm that prevents deletion of .specweave/ directories
 */
async function safeRm(targetPath: string, options?: any): Promise<void> {
  if (isDangerousPath(targetPath)) {
    const errorMsg = `🚨 CRITICAL: Test attempted to delete protected directory: ${targetPath}\n` +
      `This is likely a test isolation bug. Tests should NEVER delete real .specweave/ directories!\n` +
      `\n` +
      `FIX:\n` +
      `1. Use an isolated test directory (e.g., tests/fixtures/temp-test-data)\n` +
      `2. NEVER use paths inside .specweave/ for test data\n` +
      `3. Example: path.join(__dirname, '../../fixtures/temp-test-data')\n`;

    console.error(errorMsg);
    throw new Error(`BLOCKED: Attempted to delete protected .specweave/ directory: ${targetPath}`);
  }

  if (originalRm) {
    return originalRm(targetPath, options);
  }

  // Fallback to originalRemove if fs.rm doesn't exist
  return originalRemove(targetPath);
}

/**
 * Install safeguards (wrap fs-extra methods)
 *
 * NOTE: Cannot monkey-patch fs.remove directly because it's a getter.
 * Instead, we provide wrapped safe functions that tests should import.
 */
export function installTestSafeguards(): void {
  console.log('✅ Test safeguards available: Use safeRemove() and safeRm() in tests to prevent .specweave/ deletion');
  console.log('   Or ensure test directories are OUTSIDE .specweave/ folder');
}

// Export safe wrappers for use in tests
export { safeRemove, safeRm };

// Note: Auto-installation is disabled because we can't monkey-patch fs-extra
// Tests should either:
// 1. Use isolated test directories OUTSIDE .specweave/ (RECOMMENDED)
// 2. Import and use safeRemove/safeRm explicitly (fallback)
