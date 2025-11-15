/**
 * Test helpers for increment duplicate detection tests
 *
 * Provides utilities to create test increments, directories, and metadata
 * for testing duplicate detection and conflict resolution.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';
import { IncrementStatus } from '../../src/core/types/increment-metadata.js';
import type { IncrementLocation } from '../../src/core/increment/duplicate-detector.js';

/**
 * Create a temporary test directory
 */
export async function createTestDir(prefix: string = 'specweave-test'): Promise<string> {
  const testDir = path.join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.ensureDir(testDir);
  await fs.ensureDir(path.join(testDir, '.specweave', 'increments'));
  await fs.ensureDir(path.join(testDir, '.specweave', 'increments', '_archive'));
  await fs.ensureDir(path.join(testDir, '.specweave', 'increments', '_abandoned'));
  return testDir;
}

/**
 * Clean up test directory
 */
export async function cleanupTestDir(testDir: string): Promise<void> {
  try {
    await fs.remove(testDir);
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create a test increment in specified location
 */
export async function createTestIncrement(
  rootDir: string,
  location: 'active' | '_archive' | '_abandoned',
  name: string,
  options: {
    status?: IncrementStatus;
    lastActivity?: string;
    hasReports?: boolean;
    hasGitHubLink?: boolean;
    fileCount?: number;
  } = {}
): Promise<string> {
  const locationDir = location === 'active'
    ? path.join(rootDir, '.specweave', 'increments')
    : path.join(rootDir, '.specweave', 'increments', location);

  const incDir = path.join(locationDir, name);
  await fs.ensureDir(incDir);

  // Create metadata.json
  const metadata = {
    id: name,
    status: options.status || 'active',
    type: 'feature',
    created: new Date().toISOString(),
    lastActivity: options.lastActivity || new Date().toISOString(),
    ...(options.hasGitHubLink && {
      github: {
        issue: 42,
        url: 'https://github.com/test/repo/issues/42'
      }
    })
  };

  await fs.writeJson(path.join(incDir, 'metadata.json'), metadata, { spaces: 2 });

  // Create some files to simulate real increment
  await fs.writeFile(path.join(incDir, 'spec.md'), '# Test Spec\n');
  await fs.writeFile(path.join(incDir, 'plan.md'), '# Test Plan\n');
  await fs.writeFile(path.join(incDir, 'tasks.md'), '# Test Tasks\n');

  // Create additional files if fileCount specified
  if (options.fileCount && options.fileCount > 3) {
    for (let i = 3; i < options.fileCount; i++) {
      await fs.writeFile(path.join(incDir, `file-${i}.md`), `# Test File ${i}\n`);
    }
  }

  // Create reports folder if needed
  if (options.hasReports) {
    await fs.ensureDir(path.join(incDir, 'reports'));
    await fs.writeFile(
      path.join(incDir, 'reports', 'test-report.md'),
      '# Test Report\n'
    );
  }

  return incDir;
}

/**
 * Create a mock IncrementLocation
 */
export function createMockLocation(
  name: string,
  status: IncrementStatus,
  lastActivity: string,
  options: {
    fileCount?: number;
    location?: 'active' | '_archive' | '_abandoned';
    hasReports?: boolean;
    hasGitHubLink?: boolean;
  } = {}
): IncrementLocation {
  const location = options.location || 'active';
  const basePath = location === 'active' ? '.specweave/increments' : `.specweave/increments/${location}`;

  return {
    path: path.join(basePath, name),
    name,
    status,
    lastActivity,
    fileCount: options.fileCount || 3,
    totalSize: (options.fileCount || 3) * 1024, // ~1KB per file
    hasReports: options.hasReports || false,
    hasGitHubLink: options.hasGitHubLink || false
  };
}

/**
 * Wait for filesystem operations to complete
 */
export async function waitForFs(ms: number = 100): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}
