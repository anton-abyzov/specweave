/**
 * Feature ID Collision Prevention Tests (T-009)
 *
 * Tests for increment 0074: Fix Internal Feature ID Collision
 *
 * CRITICAL: Ensures FS-XXX (internal) never collides with FS-XXXE (external)
 *
 * Test Cases:
 * - TC-140: When FS-001E exists, internal sync creates FS-002 (not FS-001)
 * - TC-141: When FS-001 and FS-001E both exist, internal sync creates FS-002
 * - TC-142: Legacy projects with collisions work correctly (backward compat)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from '../../src/utils/fs-native.js';
import { mkdtemp, rm } from 'fs/promises';
import { mkdirSync } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  findNextAvailableInternalId,
  findNextAvailableInternalIdSync,
  checkFeatureIdCollision
} from '../../src/utils/feature-id-collision.js';
import { createTestLogger } from '../helpers/test-logger.js';

describe('Feature ID Collision Prevention (T-009)', () => {
  let testDir: string;
  let specsPath: string;
  const testProjectId = 'test-project';
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await mkdtemp(path.join(tmpdir(), 'specweave-collision-test-'));
    specsPath = path.join(testDir, '.specweave/docs/internal/specs');

    // Create project folder structure
    await fs.ensureDir(path.join(specsPath, testProjectId));

    logger = createTestLogger();
  });

  afterEach(async () => {
    // Clean up temp directory
    if (testDir && fs.existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('TC-140: FS-001E exists, internal should use FS-002', () => {
    it('should return 2 when FS-001E exists (async)', async () => {
      // Create FS-001E (external feature folder)
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));

      // Attempt to get internal ID starting from 1
      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(2);
      expect(logger.warnMessages.length).toBeGreaterThan(0);
      expect(logger.warnMessages[0]).toContain('collision avoided');
      expect(logger.warnMessages[0]).toContain('FS-001E exists');
    });

    it('should return 2 when FS-001E exists (sync)', () => {
      // Create FS-001E (external feature folder)
      mkdirSync(path.join(specsPath, testProjectId, 'FS-001E'), { recursive: true });

      // Attempt to get internal ID starting from 1
      const result = findNextAvailableInternalIdSync(1, specsPath, testProjectId, { logger });

      expect(result).toBe(2);
      expect(logger.warnMessages.length).toBeGreaterThan(0);
      expect(logger.warnMessages[0]).toContain('collision avoided');
    });

    it('should handle consecutive external IDs (FS-001E, FS-002E)', async () => {
      // Create FS-001E and FS-002E
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-002E'));

      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(3); // Skip both 1 and 2
    });
  });

  describe('TC-141: Both FS-001 and FS-001E exist', () => {
    it('should return 2 when both FS-001 and FS-001E exist', async () => {
      // Create both internal and external
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));

      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(2);
    });

    it('should handle gap scenario (FS-001, FS-002E exist, FS-002 available)', async () => {
      // FS-001 internal exists
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001'));
      // FS-002E external exists
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-002E'));

      // Starting from 1 (already exists), should skip to 3
      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(3); // 1 exists as internal, 2 exists as external
    });

    it('should find first available slot in sparse sequence', async () => {
      // Create: FS-001, FS-002E, FS-003, FS-004E, FS-005
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-002E'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-003'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-004E'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-005'));

      // Start from 1
      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      // 1 exists, 2 has E, 3 exists, 4 has E, 5 exists → 6 is first available
      expect(result).toBe(6);
    });
  });

  describe('TC-142: Backward compatibility with existing projects', () => {
    it('should return base number when no collisions exist', async () => {
      // Empty project folder - no collisions
      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(1);
      expect(logger.warnMessages.length).toBe(0); // No warning
    });

    it('should return base number when project folder does not exist', async () => {
      // Project folder doesn't exist
      const result = await findNextAvailableInternalId(1, specsPath, 'non-existent-project', { logger });

      expect(result).toBe(1);
      expect(logger.warnMessages.length).toBe(0);
    });

    it('should handle internal-only project (no external features)', async () => {
      // Create internal features only
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-002'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-003'));

      // Starting from 4 should work
      const result = await findNextAvailableInternalId(4, specsPath, testProjectId, { logger });

      expect(result).toBe(4);
    });

    it('should handle external-only project (no internal features)', async () => {
      // Create external features only
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-002E'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-003E'));

      // Starting from 1 should skip to 4
      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(4);
    });
  });

  describe('checkFeatureIdCollision utility', () => {
    it('should detect internal feature collision', async () => {
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001'));

      const result = checkFeatureIdCollision(1, specsPath, testProjectId);

      expect(result.internalExists).toBe(true);
      expect(result.externalExists).toBe(false);
      expect(result.hasCollision).toBe(true);
    });

    it('should detect external feature collision', async () => {
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));

      const result = checkFeatureIdCollision(1, specsPath, testProjectId);

      expect(result.internalExists).toBe(false);
      expect(result.externalExists).toBe(true);
      expect(result.hasCollision).toBe(true);
    });

    it('should detect both internal and external', async () => {
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001'));
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));

      const result = checkFeatureIdCollision(1, specsPath, testProjectId);

      expect(result.internalExists).toBe(true);
      expect(result.externalExists).toBe(true);
      expect(result.hasCollision).toBe(true);
    });

    it('should return no collision for unused ID', async () => {
      // Empty project
      const result = checkFeatureIdCollision(1, specsPath, testProjectId);

      expect(result.internalExists).toBe(false);
      expect(result.externalExists).toBe(false);
      expect(result.hasCollision).toBe(false);
    });

    it('should return no collision for non-existent project', () => {
      const result = checkFeatureIdCollision(1, specsPath, 'non-existent');

      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle large base numbers', async () => {
      // Create FS-999E
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-999E'));

      const result = await findNextAvailableInternalId(999, specsPath, testProjectId, { logger });

      expect(result).toBe(1000);
    });

    it('should handle 4-digit IDs', async () => {
      // Create FS-1234E
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-1234E'));

      const result = await findNextAvailableInternalId(1234, specsPath, testProjectId, { logger });

      expect(result).toBe(1235);
    });

    it('should throw error after max iterations', async () => {
      // Create a lot of features (not practical but tests the safety limit)
      // Use a small maxIterations for testing
      const options = { logger, maxIterations: 5 };

      // Create FS-001 through FS-005 and their E variants
      for (let i = 1; i <= 5; i++) {
        const id = `FS-${i.toString().padStart(3, '0')}`;
        await fs.ensureDir(path.join(specsPath, testProjectId, id));
        await fs.ensureDir(path.join(specsPath, testProjectId, `${id}E`));
      }

      await expect(
        findNextAvailableInternalId(1, specsPath, testProjectId, options)
      ).rejects.toThrow('Unable to find available feature ID after 5 iterations');
    });

    it('should handle zero-padded IDs correctly', async () => {
      // Create FS-001E (3-digit padded)
      await fs.ensureDir(path.join(specsPath, testProjectId, 'FS-001E'));

      // The utility should correctly check FS-001 and FS-001E
      const result = await findNextAvailableInternalId(1, specsPath, testProjectId, { logger });

      expect(result).toBe(2);
    });
  });

  describe('Multi-project scenarios', () => {
    const project1 = 'project-one';
    const project2 = 'project-two';

    beforeEach(async () => {
      await fs.ensureDir(path.join(specsPath, project1));
      await fs.ensureDir(path.join(specsPath, project2));
    });

    it('should handle collision in one project but not another', async () => {
      // Project 1 has FS-001E
      await fs.ensureDir(path.join(specsPath, project1, 'FS-001E'));
      // Project 2 is empty

      const result1 = await findNextAvailableInternalId(1, specsPath, project1, { logger });
      const result2 = await findNextAvailableInternalId(1, specsPath, project2, { logger });

      expect(result1).toBe(2); // Collision in project1
      expect(result2).toBe(1); // No collision in project2
    });

    it('should isolate collisions between projects', async () => {
      // Project 1 has FS-001, FS-002, FS-003
      await fs.ensureDir(path.join(specsPath, project1, 'FS-001'));
      await fs.ensureDir(path.join(specsPath, project1, 'FS-002'));
      await fs.ensureDir(path.join(specsPath, project1, 'FS-003'));

      // Project 2 has FS-001E, FS-002E
      await fs.ensureDir(path.join(specsPath, project2, 'FS-001E'));
      await fs.ensureDir(path.join(specsPath, project2, 'FS-002E'));

      // Project 1: next available starting from 1 should be 4
      const result1 = await findNextAvailableInternalId(1, specsPath, project1, { logger });
      expect(result1).toBe(4);

      // Project 2: next available starting from 1 should be 3
      const result2 = await findNextAvailableInternalId(1, specsPath, project2, { logger });
      expect(result2).toBe(3);
    });
  });
});

describe('Feature ID Collision - Real World Scenarios', () => {
  let testDir: string;
  let specsPath: string;
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'specweave-real-world-'));
    specsPath = path.join(testDir, '.specweave/docs/internal/specs');
    logger = createTestLogger();
  });

  afterEach(async () => {
    if (testDir && fs.existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should handle brownfield import scenario (increment 0074 root cause)', async () => {
    // Scenario: User has sw-meeting-cost-be project
    // External import created FS-001E from GitHub issue
    // Then internal sync tried to create FS-001 → COLLISION!
    const projectId = 'sw-meeting-cost-be';
    await fs.ensureDir(path.join(specsPath, projectId));

    // Step 1: External import creates FS-001E
    await fs.ensureDir(path.join(specsPath, projectId, 'FS-001E'));

    // Step 2: Internal sync for increment 0001 tries to get FS-001
    // OLD CODE would return 1 → collision!
    // NEW CODE should return 2
    const result = await findNextAvailableInternalId(1, specsPath, projectId, { logger });

    expect(result).toBe(2);
    expect(logger.warnMessages.length).toBeGreaterThan(0);
    expect(logger.warnMessages[0]).toContain('collision avoided');
  });

  it('should handle multiple external imports before internal sync', async () => {
    // Scenario: User imports 5 GitHub issues (FS-001E through FS-005E)
    // Then creates first internal increment (should get FS-006)
    const projectId = 'multi-import-project';
    await fs.ensureDir(path.join(specsPath, projectId));

    // Import 5 external features
    for (let i = 1; i <= 5; i++) {
      await fs.ensureDir(path.join(specsPath, projectId, `FS-${i.toString().padStart(3, '0')}E`));
    }

    // First internal increment (increment 0001) should get FS-006
    const result = await findNextAvailableInternalId(1, specsPath, projectId, { logger });

    expect(result).toBe(6);
  });

  it('should handle interleaved internal and external features', async () => {
    // Scenario: Mixed greenfield and brownfield
    // FS-001 (internal), FS-002E (external), FS-003 (internal), FS-004E (external)
    const projectId = 'mixed-project';
    await fs.ensureDir(path.join(specsPath, projectId));

    await fs.ensureDir(path.join(specsPath, projectId, 'FS-001'));
    await fs.ensureDir(path.join(specsPath, projectId, 'FS-002E'));
    await fs.ensureDir(path.join(specsPath, projectId, 'FS-003'));
    await fs.ensureDir(path.join(specsPath, projectId, 'FS-004E'));

    // New internal increment (0002) should get FS-005
    // Even though it would naturally want FS-002
    const result = await findNextAvailableInternalId(2, specsPath, projectId, { logger });

    expect(result).toBe(5);
  });
});
