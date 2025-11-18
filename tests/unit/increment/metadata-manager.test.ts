import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: MetadataManager
 *
 * Tests for increment metadata CRUD operations (T-015)
 * Part of increment 0007: Smart Status Management
 */

import { MetadataManager, MetadataError } from '../../../src/core/increment/metadata-manager.js';
import { IncrementStatus, IncrementType, createDefaultMetadata } from '../../../src/core/types/increment-metadata.js';
import { ActiveIncrementManager } from '../../../src/core/increment/active-increment-manager.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('MetadataManager', () => {
  // ✅ SAFE: Use temp directory instead of project root
  const testRootPath = path.join(os.tmpdir(), 'specweave-test-metadata-manager');
  const testIncrementsPath = path.join(testRootPath, '.specweave', 'increments');
  const testIncrementId = '0001-test-increment';
  const testIncrementPath = path.join(testIncrementsPath, testIncrementId);
  const testMetadataPath = path.join(testIncrementPath, 'metadata.json');

  let originalCwd: string;

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd();

    // Clean up test directory
    if (fs.existsSync(testRootPath)) {
      fs.removeSync(testRootPath);
    }

    // Create test structure
    fs.ensureDirSync(testIncrementPath);

    // Change to test directory
    process.chdir(testRootPath);
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Cleanup with retry logic for ENOTEMPTY errors
    if (fs.existsSync(testRootPath)) {
      try {
        fs.rmSync(testRootPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (error) {
        // Ignore cleanup errors in tests
        console.warn(`Failed to cleanup test directory: ${error}`);
      }
    }
  });

  describe('exists()', () => {
    it('returns true when metadata.json exists', () => {
      // Create metadata file
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      expect(MetadataManager.exists(testIncrementId)).toBe(true);
    });

    it('returns false when metadata.json does not exist', () => {
      expect(MetadataManager.exists(testIncrementId)).toBe(false);
    });
  });

  describe('read()', () => {
    it('reads existing metadata successfully', () => {
      // Create metadata file
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.read(testIncrementId);

      expect(result.id).toBe(testIncrementId);
      expect(result.status).toBe(IncrementStatus.PLANNING); // NEW: Default status is PLANNING
      expect(result.type).toBe(IncrementType.FEATURE);
    });

    it('lazy initialization creates default metadata if missing', () => {
      // Ensure metadata doesn't exist
      expect(fs.existsSync(testMetadataPath)).toBe(false);

      const result = MetadataManager.read(testIncrementId);

      // Should create default metadata with PLANNING status
      expect(result.id).toBe(testIncrementId);
      expect(result.status).toBe(IncrementStatus.PLANNING); // NEW: Default status is PLANNING
      expect(fs.existsSync(testMetadataPath)).toBe(true);
    });

    it('lazy initialization does NOT update active increment state for PLANNING status', () => {
      // Ensure metadata doesn't exist
      expect(fs.existsSync(testMetadataPath)).toBe(false);

      // Ensure state directory exists
      const stateDir = path.join(testRootPath, '.specweave', 'state');
      fs.ensureDirSync(stateDir);

      // Read should trigger lazy initialization
      const result = MetadataManager.read(testIncrementId);

      // Should create default metadata with PLANNING status
      expect(result.id).toBe(testIncrementId);
      expect(result.status).toBe(IncrementStatus.PLANNING);

      // **CHANGED**: PLANNING increments do NOT get added to active-increment.json
      // Only ACTIVE status increments count toward WIP limits
      const activeManager = new ActiveIncrementManager(testRootPath);
      const activeIncrement = activeManager.getActive();
      // PLANNING increment should NOT be in active list
      expect(activeIncrement).not.toContain(testIncrementId);
    });

    it('throws MetadataError if increment directory not found', () => {
      // Remove increment directory
      fs.removeSync(testIncrementPath);

      expect(() => MetadataManager.read(testIncrementId)).toThrow(MetadataError);
      expect(() => MetadataManager.read(testIncrementId)).toThrow('Increment not found');
    });

    it('throws MetadataError if JSON is corrupted', () => {
      // Write invalid JSON
      fs.writeFileSync(testMetadataPath, '{invalid json}', 'utf-8');

      expect(() => MetadataManager.read(testIncrementId)).toThrow(MetadataError);
    });

    it('validates schema on read', () => {
      // Write metadata missing required field
      fs.writeJsonSync(testMetadataPath, { id: testIncrementId });

      expect(() => MetadataManager.read(testIncrementId)).toThrow('Invalid status');
    });
  });

  describe('write()', () => {
    it('writes metadata successfully', () => {
      const metadata = createDefaultMetadata(testIncrementId);

      MetadataManager.write(testIncrementId, metadata);

      expect(fs.existsSync(testMetadataPath)).toBe(true);
      const written = fs.readJsonSync(testMetadataPath);
      expect(written.id).toBe(testIncrementId);
    });

    it('atomic write uses temp file then rename', () => {
      const metadata = createDefaultMetadata(testIncrementId);

      MetadataManager.write(testIncrementId, metadata);

      // Should not leave temp file behind
      expect(fs.existsSync(`${testMetadataPath}.tmp`)).toBe(false);
      expect(fs.existsSync(testMetadataPath)).toBe(true);
    });

    it('validates metadata before writing', () => {
      const invalidMetadata = {
        id: testIncrementId,
        status: 'invalid-status' as any,
        type: IncrementType.FEATURE,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      expect(() => MetadataManager.write(testIncrementId, invalidMetadata)).toThrow('Invalid status');
    });

    it('throws MetadataError if increment directory not found', () => {
      // Remove increment directory
      fs.removeSync(testIncrementPath);

      const metadata = createDefaultMetadata(testIncrementId);
      expect(() => MetadataManager.write(testIncrementId, metadata)).toThrow(MetadataError);
      expect(() => MetadataManager.write(testIncrementId, metadata)).toThrow('Increment directory not found');
    });
  });

  describe('delete()', () => {
    it('deletes metadata file successfully', () => {
      // Create metadata file
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      MetadataManager.delete(testIncrementId);

      expect(fs.existsSync(testMetadataPath)).toBe(false);
    });

    it('does nothing if metadata already deleted', () => {
      // Ensure metadata doesn't exist
      expect(fs.existsSync(testMetadataPath)).toBe(false);

      // Should not throw
      expect(() => MetadataManager.delete(testIncrementId)).not.toThrow();
    });
  });

  describe('updateStatus()', () => {
    it('updates status from active to paused', () => {
      // Create active increment
      const metadata = createDefaultMetadata(testIncrementId);
      metadata.status = IncrementStatus.ACTIVE; // Set to ACTIVE first
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED, 'Waiting for API keys');

      expect(result.status).toBe(IncrementStatus.PAUSED);
      expect(result.pausedReason).toBe('Waiting for API keys');
      expect(result.pausedAt).toBeDefined();
      expect(result.lastActivity).toBeDefined();
    });

    it('updates status from paused to active (resume)', () => {
      // Create paused increment
      const metadata = createDefaultMetadata(testIncrementId);
      metadata.status = IncrementStatus.PAUSED;
      metadata.pausedReason = 'Test reason';
      metadata.pausedAt = new Date().toISOString();
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.ACTIVE);

      expect(result.status).toBe(IncrementStatus.ACTIVE);
      expect(result.pausedReason).toBeUndefined();
      expect(result.pausedAt).toBeUndefined();
    });

    it('updates status to abandoned with reason', () => {
      // Create active increment
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.ABANDONED, 'Requirements changed');

      expect(result.status).toBe(IncrementStatus.ABANDONED);
      expect(result.abandonedReason).toBe('Requirements changed');
      expect(result.abandonedAt).toBeDefined();
    });

    it('throws MetadataError on invalid transition', () => {
      // Create completed increment
      const metadata = createDefaultMetadata(testIncrementId);
      metadata.status = IncrementStatus.COMPLETED;
      fs.writeJsonSync(testMetadataPath, metadata);

      // Cannot transition COMPLETED → PAUSED (invalid)
      expect(() => MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED)).toThrow(MetadataError);
      expect(() => MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED)).toThrow('Invalid status transition');
    });

    describe('PLANNING status transitions', () => {
      it('PLANNING → ACTIVE transition is valid', () => {
        // Create increment in PLANNING
        const metadata = createDefaultMetadata(testIncrementId);
        expect(metadata.status).toBe(IncrementStatus.PLANNING);
        fs.writeJsonSync(testMetadataPath, metadata);

        // Transition to ACTIVE
        const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.ACTIVE);

        expect(result.status).toBe(IncrementStatus.ACTIVE);
      });

      it('PLANNING → BACKLOG transition is valid', () => {
        // Create increment in PLANNING
        const metadata = createDefaultMetadata(testIncrementId);
        fs.writeJsonSync(testMetadataPath, metadata);

        // Transition to BACKLOG (deprioritize planning)
        const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.BACKLOG, 'Deprioritized');

        expect(result.status).toBe(IncrementStatus.BACKLOG);
        expect(result.backlogReason).toBe('Deprioritized');
      });

      it('PLANNING → ABANDONED transition is valid', () => {
        // Create increment in PLANNING
        const metadata = createDefaultMetadata(testIncrementId);
        fs.writeJsonSync(testMetadataPath, metadata);

        // Abandon planning
        const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.ABANDONED, 'Requirements changed');

        expect(result.status).toBe(IncrementStatus.ABANDONED);
        expect(result.abandonedReason).toBe('Requirements changed');
      });

      it('PLANNING → PAUSED transition is invalid', () => {
        // Create increment in PLANNING
        const metadata = createDefaultMetadata(testIncrementId);
        fs.writeJsonSync(testMetadataPath, metadata);

        // Cannot pause planning (not in VALID_TRANSITIONS)
        expect(() => MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED)).toThrow(MetadataError);
      });

      it('BACKLOG → PLANNING transition is valid', () => {
        // Create increment in BACKLOG
        const metadata = createDefaultMetadata(testIncrementId);
        metadata.status = IncrementStatus.BACKLOG;
        fs.writeJsonSync(testMetadataPath, metadata);

        // Resume planning
        const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.PLANNING);

        expect(result.status).toBe(IncrementStatus.PLANNING);
      });
    });
  });

  describe('updateType()', () => {
    it('updates increment type', () => {
      // Create increment
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateType(testIncrementId, IncrementType.HOTFIX);

      expect(result.type).toBe(IncrementType.HOTFIX);
      expect(result.lastActivity).toBeDefined();
    });
  });

  describe('touch()', () => {
    it('updates lastActivity timestamp', () => {
      // Create increment
      const metadata = createDefaultMetadata(testIncrementId);
      const oldTimestamp = metadata.lastActivity;
      fs.writeJsonSync(testMetadataPath, metadata);

      // Wait a bit
      setTimeout(() => {}, 10);

      const result = MetadataManager.touch(testIncrementId);

      expect(new Date(result.lastActivity).getTime()).toBeGreaterThanOrEqual(new Date(oldTimestamp).getTime());
    });
  });

  describe('getAll()', () => {
    it('returns all increments', () => {
      // Remove default test increment first
      fs.removeSync(testIncrementPath);

      // Create multiple increments
      const inc1 = createDefaultMetadata('0001-first');
      const inc2 = createDefaultMetadata('0002-second');

      const inc1Path = path.join(testIncrementsPath, '0001-first');
      const inc2Path = path.join(testIncrementsPath, '0002-second');

      fs.ensureDirSync(inc1Path);
      fs.ensureDirSync(inc2Path);
      fs.writeJsonSync(path.join(inc1Path, 'metadata.json'), inc1);
      fs.writeJsonSync(path.join(inc2Path, 'metadata.json'), inc2);

      const result = MetadataManager.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('0001-first');
      expect(result[1].id).toBe('0002-second');
    });

    it('returns empty array if no increments', () => {
      // Remove all increments (but keep .specweave/ structure)
      fs.removeSync(testIncrementsPath);
      fs.ensureDirSync(path.join(testRootPath, '.specweave'));

      const result = MetadataManager.getAll();

      expect(result).toEqual([]);
    });

    it('skips increments with invalid metadata', () => {
      // Remove default test increment first
      fs.removeSync(testIncrementPath);

      // Create valid and invalid increments
      const valid = createDefaultMetadata('0001-valid');
      const validPath = path.join(testIncrementsPath, '0001-valid');
      const invalidPath = path.join(testIncrementsPath, '0002-invalid');

      fs.ensureDirSync(validPath);
      fs.ensureDirSync(invalidPath);
      fs.writeJsonSync(path.join(validPath, 'metadata.json'), valid);
      fs.writeFileSync(path.join(invalidPath, 'metadata.json'), '{invalid}');

      const result = MetadataManager.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('0001-valid');
    });
  });

  describe('getByStatus()', () => {
    it('returns increments with matching status', () => {
      // Remove default test increment first
      fs.removeSync(testIncrementPath);

      // Create increments with different statuses
      const active = createDefaultMetadata('0001-active');
      active.status = IncrementStatus.ACTIVE; // Set to ACTIVE
      const paused = createDefaultMetadata('0002-paused');
      paused.status = IncrementStatus.PAUSED;

      const activePath = path.join(testIncrementsPath, '0001-active');
      const pausedPath = path.join(testIncrementsPath, '0002-paused');

      fs.ensureDirSync(activePath);
      fs.ensureDirSync(pausedPath);
      fs.writeJsonSync(path.join(activePath, 'metadata.json'), active);
      fs.writeJsonSync(path.join(pausedPath, 'metadata.json'), paused);

      const activeResults = MetadataManager.getByStatus(IncrementStatus.ACTIVE);
      const pausedResults = MetadataManager.getByStatus(IncrementStatus.PAUSED);

      expect(activeResults).toHaveLength(1);
      expect(activeResults[0].id).toBe('0001-active');
      expect(pausedResults).toHaveLength(1);
      expect(pausedResults[0].id).toBe('0002-paused');
    });
  });

  describe('getExtended()', () => {
    it('calculates progress from tasks.md', () => {
      // Create increment with tasks.md
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      // Create tasks.md with some completed tasks
      const tasksContent = `
## Tasks

- [x] Task 1
- [x] Task 2
- [ ] Task 3
- [ ] Task 4
`;
      fs.writeFileSync(path.join(testIncrementPath, 'tasks.md'), tasksContent);

      const result = MetadataManager.getExtended(testIncrementId);

      expect(result.completedTasks).toBe(2);
      expect(result.totalTasks).toBe(4);
      expect(result.progress).toBe(50); // 2/4 = 50%
    });

    it('calculates age in days', () => {
      // Create increment with old timestamp
      const metadata = createDefaultMetadata(testIncrementId);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      metadata.created = twoDaysAgo.toISOString();
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.getExtended(testIncrementId);

      expect(result.ageInDays).toBeGreaterThanOrEqual(2);
    });

    it('calculates days paused', () => {
      // Create paused increment
      const metadata = createDefaultMetadata(testIncrementId);
      metadata.status = IncrementStatus.PAUSED;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      metadata.pausedAt = threeDaysAgo.toISOString();
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.getExtended(testIncrementId);

      expect(result.daysPaused).toBeGreaterThanOrEqual(3);
    });

    it('handles missing tasks.md gracefully', () => {
      // Create increment without tasks.md
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.getExtended(testIncrementId);

      // Should not crash
      expect(result.id).toBe(testIncrementId);
    });
  });

  describe('validate()', () => {
    it('validates complete metadata successfully', () => {
      const metadata = createDefaultMetadata(testIncrementId);

      expect(() => MetadataManager.validate(metadata)).not.toThrow();
    });

    it('throws on missing id', () => {
      const metadata: any = {
        status: IncrementStatus.ACTIVE,
        type: IncrementType.FEATURE,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      expect(() => MetadataManager.validate(metadata)).toThrow('missing required field: id');
    });

    it('throws on invalid status', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).status = 'invalid-status';

      expect(() => MetadataManager.validate(metadata)).toThrow('Invalid status');
    });

    it('throws on invalid type', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).type = 'invalid-type';

      expect(() => MetadataManager.validate(metadata)).toThrow('Invalid type');
    });

    it('throws on missing created', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).created = undefined;

      expect(() => MetadataManager.validate(metadata)).toThrow('missing required field: created');
    });

    it('throws on missing lastActivity', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).lastActivity = undefined;

      expect(() => MetadataManager.validate(metadata)).toThrow('missing required field: lastActivity');
    });
  });
});
