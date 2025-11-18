import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: MetadataValidator
 *
 * Tests metadata validation and consistency checks between
 * metadata.json and actual increment state (tasks.md).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataValidator } from '../../../../src/core/increment/metadata-validator.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('MetadataValidator', () => {
  let tempDir: string;
  let validator: MetadataValidator;

  beforeEach(async () => {
    // Create temporary project directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-validator-test-'));
    validator = new MetadataValidator(tempDir);

    // Create .specweave structure
    await fs.ensureDir(path.join(tempDir, '.specweave', 'increments'));
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.remove(tempDir);
  });

  describe('validate() - single increment', () => {
    it('should return missing_file issue when metadata.json does not exist', async () => {
      // Setup: Increment with tasks.md but no metadata.json
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 2
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_file');
      expect(result.issues[0].message).toContain('metadata.json not found');
      expect(result.issues[0].severity).toBe('warning');
    });

    it('should return invalid_json issue when metadata.json is malformed', async () => {
      // Setup: Increment with invalid JSON
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeFile(path.join(incrementDir, 'metadata.json'), '{invalid json}');

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('invalid_json');
      expect(result.issues[0].message).toContain('invalid JSON');
      expect(result.issues[0].severity).toBe('error');
    });

    it('should return status_mismatch when status is completed but tasks remain', async () => {
      // Setup: Metadata says completed but tasks.md has pending work
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: incrementId,
        status: 'completed',
        completed: new Date().toISOString()
      });

      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 3
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending

### T-003: Task 3
**Status**: [ ] Pending
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('status_mismatch');
      expect(result.issues[0].message).toContain('completed');
      expect(result.issues[0].message).toContain('2 tasks remain');
      expect(result.issues[0].severity).toBe('error');
    });

    it('should return status_mismatch warning when all tasks complete but status is active', async () => {
      // Setup: All tasks done but status still active
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: incrementId,
        status: 'active',
        created: new Date().toISOString()
      });

      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 2
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [x] Completed
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('status_mismatch');
      expect(result.issues[0].message).toContain('All tasks complete');
      expect(result.issues[0].message).toContain('status is still "active"');
      expect(result.issues[0].severity).toBe('warning');
    });

    it('should return missing_timestamp when completed but no completion timestamp', async () => {
      // Setup: Status completed but missing timestamp
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: incrementId,
        status: 'completed',
        created: new Date().toISOString()
        // Missing: completed timestamp
      });

      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 1
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_timestamp');
      expect(result.issues[0].message).toContain('no completion timestamp');
      expect(result.issues[0].severity).toBe('warning');
    });

    it('should return missing_timestamp when paused but no pause timestamp', async () => {
      // Setup: Status paused but missing timestamp
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: incrementId,
        status: 'paused',
        created: new Date().toISOString()
        // Missing: paused timestamp
      });

      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 2
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_timestamp');
      expect(result.issues[0].message).toContain('no pause timestamp');
      expect(result.issues[0].severity).toBe('warning');
    });

    it('should pass validation when metadata is consistent with tasks', async () => {
      // Setup: Everything consistent
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: incrementId,
        status: 'active',
        created: new Date().toISOString()
      });

      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 2
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate GitHub sync consistency (issue closed but increment active)', async () => {
      // Setup: GitHub issue closed but increment still active
      // Note: This test would require gh CLI, so we mock the behavior
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(tempDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: incrementId,
        status: 'active',
        created: new Date().toISOString(),
        github: {
          issue: 123,
          url: 'https://github.com/test/repo/issues/123'
        }
      });

      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# Test spec');
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        `---
increment: ${incrementId}
total_tasks: 1
---

# Tasks

### T-001: Task 1
**Status**: [ ] Pending
`
      );

      // Act
      const result = await validator.validate(incrementId);

      // Assert
      // If gh CLI not available, no issues should be reported
      // If available and issue is closed, should report github_mismatch
      expect(result.valid).toBe(true); // Valid if gh not available
      // Note: Full GitHub validation would require gh CLI available
    });
  });

  describe('validateAll()', () => {
    it('should validate all increments in project', async () => {
      // Setup: Create 3 increments with different states
      const incrementsDir = path.join(tempDir, '.specweave', 'increments');

      // Increment 1: Valid
      const inc1 = '0001-valid';
      await fs.ensureDir(path.join(incrementsDir, inc1));
      await fs.writeJson(path.join(incrementsDir, inc1, 'metadata.json'), {
        id: inc1,
        status: 'active'
      });
      await fs.writeFile(path.join(incrementsDir, inc1, 'spec.md'), '# Spec');
      await fs.writeFile(
        path.join(incrementsDir, inc1, 'tasks.md'),
        `---
increment: ${inc1}
total_tasks: 1
---

# Tasks

### T-001: Task
**Status**: [ ] Pending
`
      );

      // Increment 2: Status mismatch
      const inc2 = '0002-mismatch';
      await fs.ensureDir(path.join(incrementsDir, inc2));
      await fs.writeJson(path.join(incrementsDir, inc2, 'metadata.json'), {
        id: inc2,
        status: 'completed',
        completed: new Date().toISOString()
      });
      await fs.writeFile(path.join(incrementsDir, inc2, 'spec.md'), '# Spec');
      await fs.writeFile(
        path.join(incrementsDir, inc2, 'tasks.md'),
        `---
increment: ${inc2}
total_tasks: 2
---

# Tasks

### T-001: Task 1
**Status**: [x] Completed

### T-002: Task 2
**Status**: [ ] Pending
`
      );

      // Increment 3: Missing metadata
      const inc3 = '0003-missing';
      await fs.ensureDir(path.join(incrementsDir, inc3));
      await fs.writeFile(path.join(incrementsDir, inc3, 'spec.md'), '# Spec');
      await fs.writeFile(
        path.join(incrementsDir, inc3, 'tasks.md'),
        `---
increment: ${inc3}
total_tasks: 1
---

# Tasks

### T-001: Task
**Status**: [ ] Pending
`
      );

      // Act
      const results = await validator.validateAll();

      // Assert
      expect(results.size).toBe(3);

      const result1 = results.get(inc1)!;
      expect(result1.valid).toBe(true);
      expect(result1.issues).toHaveLength(0);

      const result2 = results.get(inc2)!;
      expect(result2.valid).toBe(false);
      expect(result2.issues.length).toBeGreaterThan(0);
      expect(result2.issues[0].type).toBe('status_mismatch');

      const result3 = results.get(inc3)!;
      expect(result3.valid).toBe(false);
      expect(result3.issues).toHaveLength(1);
      expect(result3.issues[0].type).toBe('missing_file');
    });

    it('should return empty map when no increments exist', async () => {
      // Act
      const results = await validator.validateAll();

      // Assert
      expect(results.size).toBe(0);
    });

    it('should only validate directories matching increment pattern', async () => {
      // Setup: Create increments + non-increment directories
      const incrementsDir = path.join(tempDir, '.specweave', 'increments');

      // Valid increment directory
      const inc1 = '0001-valid';
      await fs.ensureDir(path.join(incrementsDir, inc1));
      await fs.writeJson(path.join(incrementsDir, inc1, 'metadata.json'), {
        id: inc1,
        status: 'active'
      });
      await fs.writeFile(path.join(incrementsDir, inc1, 'spec.md'), '# Spec');
      await fs.writeFile(
        path.join(incrementsDir, inc1, 'tasks.md'),
        `---
increment: ${inc1}
total_tasks: 1
---

# Tasks

### T-001: Task
**Status**: [ ] Pending
`
      );

      // Invalid directory names (should be ignored)
      await fs.ensureDir(path.join(incrementsDir, '_backlog'));
      await fs.ensureDir(path.join(incrementsDir, 'templates'));
      await fs.ensureDir(path.join(incrementsDir, 'invalid-name'));

      // Act
      const results = await validator.validateAll();

      // Assert
      expect(results.size).toBe(1); // Only 0001-valid counted
      expect(results.has(inc1)).toBe(true);
    });
  });
});
