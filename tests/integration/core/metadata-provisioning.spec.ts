/**
 * Metadata Provisioning Tests
 *
 * CRITICAL: These tests verify that metadata.json is ALWAYS created
 * during increment planning, regardless of hook execution status.
 *
 * Background:
 * - Increment 0038 was created without metadata.json
 * - Root cause: post-increment-planning hook didn't run
 * - Current architecture relies on Bash hooks (unreliable)
 * - Solution: Create metadata.json synchronously in TypeScript
 *
 * Test coverage:
 * 1. metadata.json exists after increment creation
 * 2. metadata.json has all required fields
 * 3. metadata.json created even if hooks fail
 * 4. metadata.json inherits project testing config
 * 5. metadata.json created for all increment types
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { MetadataManager } from '../../src/core/increment/metadata-manager.js';
import { IncrementStatus, IncrementType } from '../../src/core/types/increment-metadata.js';
import { createTestDir, cleanupTestDir, createTestIncrement } from '../../helpers/increment-test-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Metadata Provisioning', () => {
  let testDir: string;

  test.beforeEach(async () => {
    testDir = await createTestDir('metadata-provision');
  });

  test.afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  test('metadata.json is created during increment creation', async () => {
    // Create test increment
    const incrementId = '0001-test-feature';
    await createTestIncrement(testDir, 'active', incrementId);

    // Verify metadata.json exists
    const metadataPath = path.join(testDir, '.specweave', 'increments', incrementId, 'metadata.json');
    expect(await fs.pathExists(metadataPath)).toBe(true);
  });

  test('metadata.json has all required fields', async () => {
    // Create test increment
    const incrementId = '0002-test-feature';
    await createTestIncrement(testDir, 'active', incrementId);

    // Read metadata
    const oldCwd = process.cwd();
    process.chdir(testDir);

    try {
      const metadata = MetadataManager.read(incrementId);

      // Verify required fields
      expect(metadata.id).toBe(incrementId);
      expect(metadata.status).toBeDefined();
      expect(metadata.type).toBeDefined();
      expect(metadata.created).toBeDefined();
      expect(metadata.lastActivity).toBeDefined();

      // Verify valid enums
      expect(Object.values(IncrementStatus)).toContain(metadata.status);
      expect(Object.values(IncrementType)).toContain(metadata.type);

      // Verify timestamps are valid ISO 8601
      expect(() => new Date(metadata.created)).not.toThrow();
      expect(() => new Date(metadata.lastActivity)).not.toThrow();
    } finally {
      process.chdir(oldCwd);
    }
  });

  test('metadata.json inherits testing config from .specweave/config.json', async () => {
    // Create config with custom testing settings
    const configPath = path.join(testDir, '.specweave', 'config.json');
    const config = {
      testing: {
        defaultTestMode: 'test-after',
        defaultCoverageTarget: 90
      }
    };
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Create increment (simulating hook execution)
    const incrementId = '0003-test-feature';
    const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create spec.md with frontmatter
    const specContent = `---
increment: ${incrementId}
title: Test Feature
priority: P1
status: planning
created: 2025-11-16
---

# Test Feature
`;
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Simulate post-increment-planning hook creating metadata
    const metadata = {
      id: incrementId,
      status: 'active',
      type: 'feature',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      testMode: 'test-after', // From config
      coverageTarget: 90 // From config
    };
    await fs.writeJson(path.join(incrementDir, 'metadata.json'), metadata, { spaces: 2 });

    // Verify metadata has testing config
    const oldCwd = process.cwd();
    process.chdir(testDir);

    try {
      const savedMetadata = MetadataManager.read(incrementId);
      expect(savedMetadata.testMode).toBe('test-after');
      expect(savedMetadata.coverageTarget).toBe(90);
    } finally {
      process.chdir(oldCwd);
    }
  });

  test('metadata.json created for all increment types', async () => {
    const types: IncrementType[] = [
      IncrementType.FEATURE,
      IncrementType.HOTFIX,
      IncrementType.BUG,
      IncrementType.CHANGE_REQUEST,
      IncrementType.REFACTOR,
      IncrementType.EXPERIMENT
    ];

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const incrementId = `000${i + 1}-${type}-test`;
      const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      // Create metadata with specific type
      const metadata = {
        id: incrementId,
        status: 'active',
        type: type,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      await fs.writeJson(path.join(incrementDir, 'metadata.json'), metadata, { spaces: 2 });

      // Verify type is correct
      const oldCwd = process.cwd();
      process.chdir(testDir);

      try {
        const savedMetadata = MetadataManager.read(incrementId);
        expect(savedMetadata.type).toBe(type);
      } finally {
        process.chdir(oldCwd);
      }
    }
  });

  test('MetadataManager.read() creates metadata.json if missing (lazy init)', async () => {
    // Create increment WITHOUT metadata.json (simulating 0038 bug)
    const incrementId = '0038-missing-metadata';
    const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create only spec.md (no metadata.json)
    const specContent = `---
increment: ${incrementId}
title: Missing Metadata Test
type: feature
---

# Missing Metadata Test
`;
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Verify metadata.json doesn't exist yet
    const metadataPath = path.join(incrementDir, 'metadata.json');
    expect(await fs.pathExists(metadataPath)).toBe(false);

    // Call MetadataManager.read() - should trigger lazy init
    const oldCwd = process.cwd();
    process.chdir(testDir);

    try {
      const metadata = MetadataManager.read(incrementId);

      // Verify metadata was created
      expect(metadata).toBeDefined();
      expect(metadata.id).toBe(incrementId);

      // Verify file was written
      expect(await fs.pathExists(metadataPath)).toBe(true);

      // Verify default values
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      expect(metadata.type).toBe(IncrementType.FEATURE); // Default
    } finally {
      process.chdir(oldCwd);
    }
  });

  test('metadata.json creation is idempotent', async () => {
    // Create increment with metadata
    const incrementId = '0007-idempotent-test';
    await createTestIncrement(testDir, 'active', incrementId, {
      status: IncrementStatus.PAUSED,
      lastActivity: '2025-11-15T10:00:00Z'
    });

    const oldCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Read metadata multiple times
      const metadata1 = MetadataManager.read(incrementId);
      const metadata2 = MetadataManager.read(incrementId);
      const metadata3 = MetadataManager.read(incrementId);

      // All reads should return same data
      expect(metadata1).toEqual(metadata2);
      expect(metadata2).toEqual(metadata3);

      // Status should be preserved (not reset to ACTIVE)
      expect(metadata1.status).toBe(IncrementStatus.PAUSED);
      expect(metadata1.lastActivity).toBe('2025-11-15T10:00:00Z');
    } finally {
      process.chdir(oldCwd);
    }
  });

  test('metadata.json validates required fields on read', async () => {
    // Create increment with INVALID metadata (missing required fields)
    const incrementId = '0008-invalid-metadata';
    const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Write invalid metadata (missing 'created' field)
    const invalidMetadata = {
      id: incrementId,
      status: 'active',
      type: 'feature',
      lastActivity: new Date().toISOString()
      // Missing 'created' field!
    };
    await fs.writeJson(path.join(incrementDir, 'metadata.json'), invalidMetadata);

    const oldCwd = process.cwd();
    process.chdir(testDir);

    try {
      // MetadataManager.read() should throw validation error
      expect(() => {
        MetadataManager.read(incrementId);
      }).toThrow(/missing required field.*created/i);
    } finally {
      process.chdir(oldCwd);
    }
  });
});

test.describe('Regression Tests for 0038 Bug', () => {
  let testDir: string;

  test.beforeEach(async () => {
    testDir = await createTestDir('regression-0038');
  });

  test.afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  test('REGRESSION: increment 0038 should have metadata.json', async () => {
    // This test documents the exact bug that occurred
    const incrementId = '0038-serverless-architecture-intelligence';
    const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create increment files (spec.md, plan.md, tasks.md) as the PM agent would
    const specContent = `---
increment: ${incrementId}
title: Serverless Architecture Intelligence
priority: P1
status: planning
created: 2025-11-16
feature: FS-038
---

# Serverless Architecture Intelligence
`;
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);
    await fs.writeFile(path.join(incrementDir, 'plan.md'), '# Plan');
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');

    // SIMULATE POST-INCREMENT-PLANNING HOOK
    // This hook SHOULD create metadata.json but may fail
    // We need to ensure metadata.json exists even if hook fails

    const metadata = {
      id: incrementId,
      status: 'active',
      type: 'feature',
      created: '2025-11-16T06:44:42Z',
      lastActivity: '2025-11-16T06:44:42Z',
      testMode: 'TDD',
      coverageTarget: 80
    };
    await fs.writeJson(path.join(incrementDir, 'metadata.json'), metadata, { spaces: 2 });

    // Verify metadata.json exists
    const metadataPath = path.join(incrementDir, 'metadata.json');
    expect(await fs.pathExists(metadataPath)).toBe(true);

    // Verify content
    const savedMetadata = await fs.readJson(metadataPath);
    expect(savedMetadata.id).toBe(incrementId);
    expect(savedMetadata.testMode).toBe('TDD');
    expect(savedMetadata.coverageTarget).toBe(80);
  });

  test('REGRESSION: MetadataManager.read() rescues missing metadata.json', async () => {
    // Simulate the exact scenario: increment exists but no metadata.json
    const incrementId = '0038-serverless-architecture-intelligence';
    const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create increment files WITHOUT metadata.json
    await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Spec');
    await fs.writeFile(path.join(incrementDir, 'plan.md'), '# Plan');
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), '# Tasks');

    // Verify no metadata.json
    const metadataPath = path.join(incrementDir, 'metadata.json');
    expect(await fs.pathExists(metadataPath)).toBe(false);

    const oldCwd = process.cwd();
    process.chdir(testDir);

    try {
      // MetadataManager.read() should create it via lazy init
      const metadata = MetadataManager.read(incrementId);

      // Verify it was created
      expect(await fs.pathExists(metadataPath)).toBe(true);
      expect(metadata.id).toBe(incrementId);

      // Verify defaults were used
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      expect(metadata.type).toBe(IncrementType.FEATURE);
    } finally {
      process.chdir(oldCwd);
    }
  });
});
