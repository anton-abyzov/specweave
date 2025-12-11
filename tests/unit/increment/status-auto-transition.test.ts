import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: Status Auto-Transition
 *
 * Tests automatic status transitions based on file activity
 * Part of increment 0039: Ultra-Smart Next Command
 */

import {
  autoTransitionStatus,
  onFileCreated,
  shouldTransitionToActive,
  migrateLegacyStatuses,
  getTaskCompletionStatus,
  areAllTasksCompleted,
  checkAndTransitionToReadyForReview
} from '../../../src/core/increment/status-auto-transition.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { IncrementStatus, IncrementType } from '../../../src/core/types/increment-metadata.js';
import * as fs from '../../../src/utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';

describe('Status Auto-Transition', () => {
  // ✅ SAFE: Use unique temp directory per test run to avoid parallel test interference
  let testRootPath: string;
  let testIncrementsPath: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();

    // Generate unique path for each test to avoid parallel test collisions
    testRootPath = path.join(os.tmpdir(), `specweave-test-status-auto-transition-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testIncrementsPath = path.join(testRootPath, '.specweave', 'increments');

    // Create test structure
    fs.ensureDirSync(testIncrementsPath);

    // Change to test directory
    process.chdir(testRootPath);
  });

  afterEach(() => {
    process.chdir(originalCwd);

    // Cleanup
    if (fs.existsSync(testRootPath)) {
      try {
        fs.rmSync(testRootPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (error) {
        console.warn(`Failed to cleanup test directory: ${error}`);
      }
    }
  });

  /**
   * Helper: Create increment with specific status
   */
  function createTestIncrement(incrementId: string, status: IncrementStatus = IncrementStatus.PLANNING): string {
    const incrementPath = path.join(testIncrementsPath, incrementId);
    fs.ensureDirSync(incrementPath);

    const metadata = {
      id: incrementId,
      status,
      type: IncrementType.FEATURE,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    fs.writeJsonSync(path.join(incrementPath, 'metadata.json'), metadata, { spaces: 2 });

    return incrementPath;
  }

  /**
   * Helper: Create file in increment
   */
  function createFile(incrementId: string, fileName: string, content: string = ''): void {
    const incrementPath = path.join(testIncrementsPath, incrementId);
    fs.writeFileSync(path.join(incrementPath, fileName), content);
  }

  describe('autoTransitionStatus()', () => {
    describe('Rule 1: PLANNING → ACTIVE when tasks.md created', () => {
      it('transitions from PLANNING to ACTIVE when tasks.md exists with in-progress task', () => {
        const incrementId = '0001-test';
        createTestIncrement(incrementId, IncrementStatus.PLANNING);

        // Create tasks.md with in-progress task
        createFile(incrementId, 'tasks.md', '# Tasks\n\n- [⏳] **T-001**: Test task in progress');

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(true);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      });

      it('does not transition if tasks.md does not exist', () => {
        const incrementId = '0002-test';
        createTestIncrement(incrementId, IncrementStatus.PLANNING);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(false);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.PLANNING);
      });

      it('does not transition if already ACTIVE', () => {
        const incrementId = '0003-test';
        createTestIncrement(incrementId, IncrementStatus.ACTIVE);
        createFile(incrementId, 'tasks.md', '# Tasks');

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(false);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      });
    });

    describe('Rule 2: BACKLOG → PLANNING when spec.md created', () => {
      it('transitions from BACKLOG to PLANNING when spec.md exists', () => {
        const incrementId = '0004-test';
        createTestIncrement(incrementId, IncrementStatus.BACKLOG);

        // Create spec.md
        createFile(incrementId, 'spec.md', '# Spec\n\nTest spec');

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(true);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.PLANNING);
      });

      it('does not transition if spec.md does not exist', () => {
        const incrementId = '0005-test';
        createTestIncrement(incrementId, IncrementStatus.BACKLOG);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(false);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.BACKLOG);
      });
    });

    describe('Rule 3: Any status → ACTIVE when tasks in-progress', () => {
      it('transitions from PLANNING to ACTIVE when tasks in-progress', () => {
        const incrementId = '0006-test';
        createTestIncrement(incrementId, IncrementStatus.PLANNING);

        // Create tasks.md with in-progress task
        createFile(incrementId, 'tasks.md', `# Tasks

## Phase 1

- [⏳] **T-001**: In-progress task
- [ ] **T-002**: Pending task
`);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(true);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      });

      it('transitions from BACKLOG to ACTIVE when tasks in-progress', () => {
        const incrementId = '0007-test';
        createTestIncrement(incrementId, IncrementStatus.BACKLOG);

        // Create tasks.md with in-progress task (🔄 marker)
        createFile(incrementId, 'tasks.md', `# Tasks

- [🔄] **T-001**: In-progress task
`);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(true);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      });

      it('does not transition if all tasks pending', () => {
        const incrementId = '0008-test';
        createTestIncrement(incrementId, IncrementStatus.PLANNING);

        // Create tasks.md with only pending tasks
        createFile(incrementId, 'tasks.md', `# Tasks

- [ ] **T-001**: Pending task
- [ ] **T-002**: Another pending task
`);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(false);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.PLANNING);
      });
    });

    it('handles missing increment gracefully', () => {
      const result = autoTransitionStatus('9999-nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('onFileCreated()', () => {
    it('triggers auto-transition when spec.md created', () => {
      const incrementId = '0009-test';
      createTestIncrement(incrementId, IncrementStatus.BACKLOG);

      const specPath = path.join(testIncrementsPath, incrementId, 'spec.md');
      createFile(incrementId, 'spec.md', '# Spec');

      onFileCreated(incrementId, specPath);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING);
    });

    it('triggers auto-transition when tasks.md created', () => {
      const incrementId = '0010-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      const tasksPath = path.join(testIncrementsPath, incrementId, 'tasks.md');
      createFile(incrementId, 'tasks.md', '# Tasks\n\n- [⏳] **T-001**: Task in progress');

      onFileCreated(incrementId, tasksPath);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });

    it('ignores non-trigger files', () => {
      const incrementId = '0011-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      const randomPath = path.join(testIncrementsPath, incrementId, 'random.txt');
      createFile(incrementId, 'random.txt', 'Random content');

      onFileCreated(incrementId, randomPath);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING); // Unchanged
    });
  });

  describe('shouldTransitionToActive()', () => {
    it('returns true for PLANNING with tasks.md', () => {
      const incrementId = '0012-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);
      createFile(incrementId, 'tasks.md', '# Tasks');

      expect(shouldTransitionToActive(incrementId)).toBe(true);
    });

    it('returns true for PLANNING with in-progress tasks', () => {
      const incrementId = '0013-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);
      createFile(incrementId, 'tasks.md', '- [⏳] **T-001**: In-progress');

      expect(shouldTransitionToActive(incrementId)).toBe(true);
    });

    it('returns false for ACTIVE status', () => {
      const incrementId = '0014-test';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);
      createFile(incrementId, 'tasks.md', '# Tasks');

      expect(shouldTransitionToActive(incrementId)).toBe(false);
    });

    it('returns false for PLANNING without tasks.md', () => {
      const incrementId = '0015-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      expect(shouldTransitionToActive(incrementId)).toBe(false);
    });

    it('handles missing increment gracefully', () => {
      expect(shouldTransitionToActive('9999-nonexistent')).toBe(false);
    });
  });

  describe('migrateLegacyStatuses()', () => {
    it('migrates "planned" to "planning"', () => {
      const incrementId = '0016-test';
      const incrementPath = path.join(testIncrementsPath, incrementId);
      fs.ensureDirSync(incrementPath);

      // Create metadata with legacy "planned" status
      const legacyMetadata = {
        id: incrementId,
        status: 'planned', // ❌ Invalid (not in enum)
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      fs.writeJsonSync(path.join(incrementPath, 'metadata.json'), legacyMetadata, { spaces: 2 });

      const migratedCount = migrateLegacyStatuses();

      expect(migratedCount).toBe(1);

      const metadata = fs.readJsonSync(path.join(incrementPath, 'metadata.json'));
      expect(metadata.status).toBe('planning'); // ✅ Valid
    });

    it('migrates multiple increments', () => {
      // Create 3 increments with legacy status
      for (let i = 1; i <= 3; i++) {
        const incrementId = `001${i}-test`;
        const incrementPath = path.join(testIncrementsPath, incrementId);
        fs.ensureDirSync(incrementPath);

        const legacyMetadata = {
          id: incrementId,
          status: 'planned',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        fs.writeJsonSync(path.join(incrementPath, 'metadata.json'), legacyMetadata, { spaces: 2 });
      }

      const migratedCount = migrateLegacyStatuses();

      expect(migratedCount).toBe(3);
    });

    it('skips increments with valid status', () => {
      const incrementId = '0020-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      const migratedCount = migrateLegacyStatuses();

      expect(migratedCount).toBe(0);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING); // Unchanged
    });

    it('skips _archive folder', () => {
      const archivePath = path.join(testIncrementsPath, '_archive');
      fs.ensureDirSync(path.join(archivePath, '0021-test'));

      const legacyMetadata = {
        id: '0021-test',
        status: 'planned',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      fs.writeJsonSync(path.join(archivePath, '0021-test', 'metadata.json'), legacyMetadata, { spaces: 2 });

      const migratedCount = migrateLegacyStatuses();

      expect(migratedCount).toBe(0); // Archive not migrated
    });

    it('handles empty increments folder', () => {
      const migratedCount = migrateLegacyStatuses();
      expect(migratedCount).toBe(0);
    });
  });

  describe('getTaskCompletionStatus()', () => {
    it('returns null when tasks.md does not exist', () => {
      const incrementId = '0030-no-tasks';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      const status = getTaskCompletionStatus(incrementId);
      expect(status).toBeNull();
    });

    it('returns correct count for all pending tasks', () => {
      const incrementId = '0031-all-pending';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [ ] pending

### T-002: Second Task
**Status**: [ ] pending

### T-003: Third Task
**Status**: [ ] pending
`);

      const status = getTaskCompletionStatus(incrementId);
      expect(status).not.toBeNull();
      expect(status!.totalTasks).toBe(3);
      expect(status!.completedTasks).toBe(0);
      expect(status!.pendingTasks).toBe(3);
      expect(status!.percentage).toBe(0);
      expect(status!.allCompleted).toBe(false);
    });

    it('returns correct count for all completed tasks', () => {
      const incrementId = '0032-all-complete';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [x] completed

### T-003: Third Task
**Status**: [x] completed
`);

      const status = getTaskCompletionStatus(incrementId);
      expect(status).not.toBeNull();
      expect(status!.totalTasks).toBe(3);
      expect(status!.completedTasks).toBe(3);
      expect(status!.pendingTasks).toBe(0);
      expect(status!.percentage).toBe(100);
      expect(status!.allCompleted).toBe(true);
    });

    it('returns correct count for mixed tasks', () => {
      const incrementId = '0033-mixed-tasks';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [ ] pending

### T-003: Third Task
**Status**: [x] completed

### T-004: Fourth Task
**Status**: [ ] pending
`);

      const status = getTaskCompletionStatus(incrementId);
      expect(status).not.toBeNull();
      expect(status!.totalTasks).toBe(4);
      expect(status!.completedTasks).toBe(2);
      expect(status!.pendingTasks).toBe(2);
      expect(status!.percentage).toBe(50);
      expect(status!.allCompleted).toBe(false);
    });

    it('returns zero tasks for empty tasks.md', () => {
      const incrementId = '0034-empty-tasks';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', '# Tasks\n\nNo tasks yet.');

      const status = getTaskCompletionStatus(incrementId);
      expect(status).not.toBeNull();
      expect(status!.totalTasks).toBe(0);
      expect(status!.completedTasks).toBe(0);
      expect(status!.allCompleted).toBe(false);
    });
  });

  describe('areAllTasksCompleted()', () => {
    it('returns false when tasks.md does not exist', () => {
      const incrementId = '0035-no-tasks';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      expect(areAllTasksCompleted(incrementId)).toBe(false);
    });

    it('returns false when some tasks are pending', () => {
      const incrementId = '0036-some-pending';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [ ] pending
`);

      expect(areAllTasksCompleted(incrementId)).toBe(false);
    });

    it('returns true when all tasks are completed', () => {
      const incrementId = '0037-all-complete';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [x] completed
`);

      expect(areAllTasksCompleted(incrementId)).toBe(true);
    });

    it('returns false for empty tasks.md (no tasks)', () => {
      const incrementId = '0038-empty';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', '# Tasks\n\nNothing here.');

      expect(areAllTasksCompleted(incrementId)).toBe(false);
    });
  });

  describe('Rule 4 (v0.35.0+): ACTIVE → READY_FOR_REVIEW when all tasks completed', () => {
    it('transitions from ACTIVE to READY_FOR_REVIEW when all tasks completed', () => {
      const incrementId = '0040-auto-review';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [x] completed

### T-003: Third Task
**Status**: [x] completed
`);

      const result = autoTransitionStatus(incrementId);

      expect(result).toBe(true);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.READY_FOR_REVIEW);
    });

    it('does NOT transition if some tasks are pending', () => {
      const incrementId = '0041-not-all-complete';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [ ] pending
`);

      const result = autoTransitionStatus(incrementId);

      expect(result).toBe(false);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE); // Unchanged
    });

    it('does NOT transition directly to READY_FOR_REVIEW if not ACTIVE status', () => {
      const incrementId = '0042-not-active';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      // Tasks are all completed but status is PLANNING
      // The only way to get to READY_FOR_REVIEW is from ACTIVE
      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed
`);

      const result = autoTransitionStatus(incrementId);

      // No transition because:
      // - Not ACTIVE (so can't go to READY_FOR_REVIEW)
      // - No in-progress tasks (so can't trigger PLANNING → ACTIVE)
      expect(result).toBe(false);

      const metadata = MetadataManager.read(incrementId);
      // Status remains PLANNING - would need to go to ACTIVE first (via in-progress task)
      expect(metadata.status).toBe(IncrementStatus.PLANNING);
    });

    it('prevents direct transition to COMPLETED (must go through READY_FOR_REVIEW)', () => {
      const incrementId = '0043-no-direct-complete';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed
`);

      // Auto-transition triggers
      autoTransitionStatus(incrementId);

      // Status should be READY_FOR_REVIEW, NOT COMPLETED
      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.READY_FOR_REVIEW);
      expect(metadata.status).not.toBe(IncrementStatus.COMPLETED);
    });
  });

  describe('checkAndTransitionToReadyForReview()', () => {
    it('transitions and returns correct result when all tasks complete', () => {
      const incrementId = '0050-check-transition';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [x] completed
`);

      const result = checkAndTransitionToReadyForReview(incrementId);

      expect(result.transitioned).toBe(true);
      expect(result.from).toBe(IncrementStatus.ACTIVE);
      expect(result.to).toBe(IncrementStatus.READY_FOR_REVIEW);
      expect(result.taskStatus).toBeDefined();
      expect(result.taskStatus!.allCompleted).toBe(true);
      expect(result.message).toContain('READY_FOR_REVIEW');

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.READY_FOR_REVIEW);
    });

    it('does not transition when tasks are pending', () => {
      const incrementId = '0051-check-pending';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [ ] pending
`);

      const result = checkAndTransitionToReadyForReview(incrementId);

      expect(result.transitioned).toBe(false);
      expect(result.taskStatus).toBeDefined();
      expect(result.taskStatus!.completedTasks).toBe(1);
      expect(result.taskStatus!.pendingTasks).toBe(1);
      expect(result.message).toContain('not ready for review');

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE); // Unchanged
    });

    it('does not transition when not ACTIVE', () => {
      const incrementId = '0052-check-not-active';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed
`);

      const result = checkAndTransitionToReadyForReview(incrementId);

      expect(result.transitioned).toBe(false);
      expect(result.message).toContain('not active');

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING); // Unchanged
    });

    it('handles missing tasks.md gracefully', () => {
      const incrementId = '0053-check-no-tasks';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      const result = checkAndTransitionToReadyForReview(incrementId);

      expect(result.transitioned).toBe(false);
      expect(result.message).toContain('No tasks.md found');
    });

    it('handles missing increment gracefully', () => {
      const result = checkAndTransitionToReadyForReview('9999-nonexistent');

      expect(result.transitioned).toBe(false);
      expect(result.message).toContain('Error');
    });
  });

  describe('Integration: Full workflow', () => {
    it('increment lifecycle: PLANNING → ACTIVE', () => {
      const incrementId = '0022-full-lifecycle';

      // Step 1: Create increment (starts in PLANNING)
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      let metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING);

      // Step 2: Create spec.md (still PLANNING)
      createFile(incrementId, 'spec.md', '# Spec');
      autoTransitionStatus(incrementId);

      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING);

      // Step 3: Create tasks.md with in-progress task (auto-transition to ACTIVE)
      createFile(incrementId, 'tasks.md', '# Tasks\n\n- [⏳] **T-001**: Test in progress');
      autoTransitionStatus(incrementId);

      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });

    it('increment lifecycle: BACKLOG → PLANNING → ACTIVE', () => {
      const incrementId = '0023-full-lifecycle-backlog';

      // Step 1: Create increment in BACKLOG
      createTestIncrement(incrementId, IncrementStatus.BACKLOG);

      let metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.BACKLOG);

      // Step 2: Create spec.md (BACKLOG → PLANNING)
      createFile(incrementId, 'spec.md', '# Spec');
      autoTransitionStatus(incrementId);

      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING);

      // Step 3: Create tasks.md with in-progress task (PLANNING → ACTIVE)
      createFile(incrementId, 'tasks.md', '# Tasks\n\n- [⏳] **T-001**: Task in progress');
      autoTransitionStatus(incrementId);

      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });

    it('CRITICAL: Full lifecycle prevents auto-completion bug (v0.35.0+)', () => {
      const incrementId = '0024-full-lifecycle-review';

      // Step 1: Create increment in ACTIVE
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);

      // Step 2: Create tasks.md with pending tasks
      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [ ] pending

### T-002: Second Task
**Status**: [ ] pending
`);

      autoTransitionStatus(incrementId);
      let metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);

      // Step 3: Complete first task (still ACTIVE)
      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [ ] pending
`);

      autoTransitionStatus(incrementId);
      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);

      // Step 4: Complete all tasks → AUTO-TRANSITION to READY_FOR_REVIEW
      createFile(incrementId, 'tasks.md', `# Tasks

### T-001: First Task
**Status**: [x] completed

### T-002: Second Task
**Status**: [x] completed
`);

      autoTransitionStatus(incrementId);
      metadata = MetadataManager.read(incrementId);

      // CRITICAL: Status should be READY_FOR_REVIEW, NOT COMPLETED!
      expect(metadata.status).toBe(IncrementStatus.READY_FOR_REVIEW);
      expect(metadata.status).not.toBe(IncrementStatus.COMPLETED);

      // Step 5: Only /sw:done can transition to COMPLETED
      // (This would require user approval via MetadataManager.updateStatus)
    });
  });
});
