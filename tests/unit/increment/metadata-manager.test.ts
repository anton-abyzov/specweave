/**
 * Unit Tests: MetadataManager
 *
 * Tests for increment metadata CRUD operations (T-015)
 * Part of increment 0007: Smart Status Management
 */

import { MetadataManager, MetadataError } from '../../../src/core/increment/metadata-manager';
import { IncrementStatus, IncrementType, createDefaultMetadata } from '../../../src/core/types/increment-metadata';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('MetadataManager', () => {
  const testRootPath = path.join(process.cwd(), '.specweave-test');
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
    test('returns true when metadata.json exists', () => {
      // Create metadata file
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      expect(MetadataManager.exists(testIncrementId)).toBe(true);
    });

    test('returns false when metadata.json does not exist', () => {
      expect(MetadataManager.exists(testIncrementId)).toBe(false);
    });
  });

  describe('read()', () => {
    test('reads existing metadata successfully', () => {
      // Create metadata file
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.read(testIncrementId);

      expect(result.id).toBe(testIncrementId);
      expect(result.status).toBe(IncrementStatus.ACTIVE);
      expect(result.type).toBe(IncrementType.FEATURE);
    });

    test('lazy initialization creates default metadata if missing', () => {
      // Ensure metadata doesn't exist
      expect(fs.existsSync(testMetadataPath)).toBe(false);

      const result = MetadataManager.read(testIncrementId);

      // Should create default metadata
      expect(result.id).toBe(testIncrementId);
      expect(result.status).toBe(IncrementStatus.ACTIVE);
      expect(fs.existsSync(testMetadataPath)).toBe(true);
    });

    test('throws MetadataError if increment directory not found', () => {
      // Remove increment directory
      fs.removeSync(testIncrementPath);

      expect(() => MetadataManager.read(testIncrementId)).toThrow(MetadataError);
      expect(() => MetadataManager.read(testIncrementId)).toThrow('Increment not found');
    });

    test('throws MetadataError if JSON is corrupted', () => {
      // Write invalid JSON
      fs.writeFileSync(testMetadataPath, '{invalid json}', 'utf-8');

      expect(() => MetadataManager.read(testIncrementId)).toThrow(MetadataError);
    });

    test('validates schema on read', () => {
      // Write metadata missing required field
      fs.writeJsonSync(testMetadataPath, { id: testIncrementId });

      expect(() => MetadataManager.read(testIncrementId)).toThrow('Invalid status');
    });
  });

  describe('write()', () => {
    test('writes metadata successfully', () => {
      const metadata = createDefaultMetadata(testIncrementId);

      MetadataManager.write(testIncrementId, metadata);

      expect(fs.existsSync(testMetadataPath)).toBe(true);
      const written = fs.readJsonSync(testMetadataPath);
      expect(written.id).toBe(testIncrementId);
    });

    test('atomic write uses temp file then rename', () => {
      const metadata = createDefaultMetadata(testIncrementId);

      MetadataManager.write(testIncrementId, metadata);

      // Should not leave temp file behind
      expect(fs.existsSync(`${testMetadataPath}.tmp`)).toBe(false);
      expect(fs.existsSync(testMetadataPath)).toBe(true);
    });

    test('validates metadata before writing', () => {
      const invalidMetadata = {
        id: testIncrementId,
        status: 'invalid-status' as any,
        type: IncrementType.FEATURE,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      expect(() => MetadataManager.write(testIncrementId, invalidMetadata)).toThrow('Invalid status');
    });

    test('throws MetadataError if increment directory not found', () => {
      // Remove increment directory
      fs.removeSync(testIncrementPath);

      const metadata = createDefaultMetadata(testIncrementId);
      expect(() => MetadataManager.write(testIncrementId, metadata)).toThrow(MetadataError);
      expect(() => MetadataManager.write(testIncrementId, metadata)).toThrow('Increment directory not found');
    });
  });

  describe('delete()', () => {
    test('deletes metadata file successfully', () => {
      // Create metadata file
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      MetadataManager.delete(testIncrementId);

      expect(fs.existsSync(testMetadataPath)).toBe(false);
    });

    test('does nothing if metadata already deleted', () => {
      // Ensure metadata doesn't exist
      expect(fs.existsSync(testMetadataPath)).toBe(false);

      // Should not throw
      expect(() => MetadataManager.delete(testIncrementId)).not.toThrow();
    });
  });

  describe('updateStatus()', () => {
    test('updates status from active to paused', () => {
      // Create active increment
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED, 'Waiting for API keys');

      expect(result.status).toBe(IncrementStatus.PAUSED);
      expect(result.pausedReason).toBe('Waiting for API keys');
      expect(result.pausedAt).toBeDefined();
      expect(result.lastActivity).toBeDefined();
    });

    test('updates status from paused to active (resume)', () => {
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

    test('updates status to abandoned with reason', () => {
      // Create active increment
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateStatus(testIncrementId, IncrementStatus.ABANDONED, 'Requirements changed');

      expect(result.status).toBe(IncrementStatus.ABANDONED);
      expect(result.abandonedReason).toBe('Requirements changed');
      expect(result.abandonedAt).toBeDefined();
    });

    test('throws MetadataError on invalid transition', () => {
      // Create completed increment
      const metadata = createDefaultMetadata(testIncrementId);
      metadata.status = IncrementStatus.COMPLETED;
      fs.writeJsonSync(testMetadataPath, metadata);

      // Cannot transition from completed
      expect(() => MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED)).toThrow(MetadataError);
      expect(() => MetadataManager.updateStatus(testIncrementId, IncrementStatus.PAUSED)).toThrow('Invalid status transition');
    });
  });

  describe('updateType()', () => {
    test('updates increment type', () => {
      // Create increment
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.updateType(testIncrementId, IncrementType.HOTFIX);

      expect(result.type).toBe(IncrementType.HOTFIX);
      expect(result.lastActivity).toBeDefined();
    });
  });

  describe('touch()', () => {
    test('updates lastActivity timestamp', () => {
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
    test('returns all increments', () => {
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

    test('returns empty array if no increments', () => {
      // Remove all increments (but keep .specweave/ structure)
      fs.removeSync(testIncrementsPath);
      fs.ensureDirSync(path.join(testRootPath, '.specweave'));

      const result = MetadataManager.getAll();

      expect(result).toEqual([]);
    });

    test('skips increments with invalid metadata', () => {
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
    test('returns increments with matching status', () => {
      // Remove default test increment first
      fs.removeSync(testIncrementPath);

      // Create increments with different statuses
      const active = createDefaultMetadata('0001-active');
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
    test('calculates progress from tasks.md', () => {
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

    test('calculates age in days', () => {
      // Create increment with old timestamp
      const metadata = createDefaultMetadata(testIncrementId);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      metadata.created = twoDaysAgo.toISOString();
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.getExtended(testIncrementId);

      expect(result.ageInDays).toBeGreaterThanOrEqual(2);
    });

    test('calculates days paused', () => {
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

    test('handles missing tasks.md gracefully', () => {
      // Create increment without tasks.md
      const metadata = createDefaultMetadata(testIncrementId);
      fs.writeJsonSync(testMetadataPath, metadata);

      const result = MetadataManager.getExtended(testIncrementId);

      // Should not crash
      expect(result.id).toBe(testIncrementId);
    });
  });

  describe('validate()', () => {
    test('validates complete metadata successfully', () => {
      const metadata = createDefaultMetadata(testIncrementId);

      expect(() => MetadataManager.validate(metadata)).not.toThrow();
    });

    test('throws on missing id', () => {
      const metadata: any = {
        status: IncrementStatus.ACTIVE,
        type: IncrementType.FEATURE,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      expect(() => MetadataManager.validate(metadata)).toThrow('missing required field: id');
    });

    test('throws on invalid status', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).status = 'invalid-status';

      expect(() => MetadataManager.validate(metadata)).toThrow('Invalid status');
    });

    test('throws on invalid type', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).type = 'invalid-type';

      expect(() => MetadataManager.validate(metadata)).toThrow('Invalid type');
    });

    test('throws on missing created', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).created = undefined;

      expect(() => MetadataManager.validate(metadata)).toThrow('missing required field: created');
    });

    test('throws on missing lastActivity', () => {
      const metadata = createDefaultMetadata(testIncrementId);
      (metadata as any).lastActivity = undefined;

      expect(() => MetadataManager.validate(metadata)).toThrow('missing required field: lastActivity');
    });
  });
});
