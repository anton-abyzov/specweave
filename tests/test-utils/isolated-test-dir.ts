/**
 * Test Utilities for Isolated Test Directories
 *
 * CRITICAL: ALWAYS use these utilities for tests that create .specweave/ structures
 *
 * WHY:
 * - Tests using process.cwd() can accidentally delete project .specweave/ folder
 * - os.tmpdir() provides complete isolation from project files
 * - Automatic cleanup prevents test pollution
 *
 * CORRECT USAGE:
 *   import { createIsolatedTestDir } from '../test-utils/isolated-test-dir';
 *
 *   test('my test', async () => {
 *     const { testDir, cleanup } = await createIsolatedTestDir('my-test');
 *     try {
 *       // Test code here...
 *     } finally {
 *       await cleanup();
 *     }
 *   });
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Creates an isolated test directory in OS temp directory
 *
 * ✅ SAFE: Uses os.tmpdir() (never touches project root)
 * ✅ AUTO-CLEANUP: Returns cleanup function
 * ✅ UNIQUE: Uses timestamp + random suffix to prevent collisions
 *
 * @param testName - Descriptive name for the test (used in directory name)
 * @returns Object with testDir path and cleanup function
 *
 * @example
 * const { testDir, cleanup } = await createIsolatedTestDir('my-test');
 * // testDir = /tmp/specweave-test-my-test-1234567890-abc123/
 * // Use testDir...
 * await cleanup(); // ALWAYS call cleanup in finally block!
 */
export async function createIsolatedTestDir(
  testName: string
): Promise<{ testDir: string; cleanup: () => Promise<void> }> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const testDir = path.join(os.tmpdir(), `specweave-test-${testName}-${timestamp}-${random}`);

  await fs.mkdir(testDir, { recursive: true });

  const cleanup = async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to cleanup test directory: ${testDir}`, err);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  };

  return { testDir, cleanup };
}

/**
 * Creates .specweave structure inside test directory
 *
 * Creates the following structure:
 *   testRoot/
 *   └── .specweave/
 *       ├── increments/
 *       │   ├── _archive/
 *       │   └── _abandoned/
 *       ├── docs/
 *       │   ├── internal/
 *       │   │   └── specs/
 *       │   └── public/
 *       └── state/
 *
 * @param testRoot - Root directory for the test (from createIsolatedTestDir)
 *
 * @example
 * const { testDir, cleanup } = await createIsolatedTestDir('my-test');
 * await createSpecweaveStructure(testDir);
 * // Now testDir/.specweave/increments/ exists
 */
export async function createSpecweaveStructure(testRoot: string): Promise<void> {
  const dirs = [
    '.specweave',
    '.specweave/increments',
    '.specweave/increments/_archive',
    '.specweave/increments/_abandoned',
    '.specweave/docs/internal/specs',
    '.specweave/docs/public',
    '.specweave/state',
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(testRoot, dir), { recursive: true });
  }
}

/**
 * Creates a minimal increment structure for testing
 *
 * Creates:
 *   testRoot/.specweave/increments/{incrementId}/
 *   ├── metadata.json
 *   ├── spec.md
 *   ├── plan.md
 *   └── tasks.md
 *
 * @param testRoot - Root directory for the test
 * @param incrementId - Increment ID (e.g., '0001-test-feature')
 * @param options - Optional metadata overrides
 *
 * @example
 * const { testDir, cleanup } = await createIsolatedTestDir('increment-test');
 * await createSpecweaveStructure(testDir);
 * await createTestIncrement(testDir, '0001-test-feature', {
 *   status: 'active',
 *   type: 'feature'
 * });
 */
export async function createTestIncrement(
  testRoot: string,
  incrementId: string,
  options?: {
    status?: string;
    type?: string;
    created?: string;
    lastActivity?: string;
  }
): Promise<void> {
  const incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
  await fs.mkdir(incrementPath, { recursive: true });

  // Create metadata.json
  const metadata = {
    id: incrementId,
    status: options?.status || 'active',
    type: options?.type || 'feature',
    created: options?.created || new Date().toISOString(),
    lastActivity: options?.lastActivity || new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(incrementPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Create minimal spec.md
  const specContent = `---
increment: ${incrementId}
status: ${metadata.status}
type: ${metadata.type}
---

# ${incrementId}

Test increment for automated testing.

## Acceptance Criteria

- [ ] AC-001: Test acceptance criterion 1
- [ ] AC-002: Test acceptance criterion 2
`;
  await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

  // Create minimal plan.md
  const planContent = `# Implementation Plan - ${incrementId}

## Phase 1: Implementation

### T-001: Test Task
- Description: Test task
- Estimate: 1h
`;
  await fs.writeFile(path.join(incrementPath, 'plan.md'), planContent);

  // Create minimal tasks.md
  const tasksContent = `# Tasks - ${incrementId}

## Phase 1: Implementation

### T-001: Test Task
**Status**: pending
**Estimate**: 1 hour

**Description**:
Test task for automated testing.

**ACs**: AC-001, AC-002
`;
  await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);
}

/**
 * Example test demonstrating correct usage
 *
 * @example
 * ```typescript
 * import { createIsolatedTestDir, createSpecweaveStructure, createTestIncrement } from '../test-utils/isolated-test-dir';
 *
 * describe('My Test Suite', () => {
 *   test('should work with isolated directory', async () => {
 *     const { testDir, cleanup } = await createIsolatedTestDir('my-test');
 *
 *     try {
 *       // Setup .specweave structure
 *       await createSpecweaveStructure(testDir);
 *       await createTestIncrement(testDir, '0001-test', { status: 'active' });
 *
 *       // Run test assertions
 *       const incrementPath = path.join(testDir, '.specweave', 'increments', '0001-test');
 *       const exists = await fs.access(incrementPath).then(() => true).catch(() => false);
 *       expect(exists).toBe(true);
 *
 *       // Test code will NEVER touch project .specweave/ folder!
 *     } finally {
 *       await cleanup(); // ALWAYS cleanup
 *     }
 *   });
 * });
 * ```
 */
