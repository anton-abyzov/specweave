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
  migrateLegacyStatuses
} from '../../../src/core/increment/status-auto-transition.js.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js.js';
import { IncrementStatus, IncrementType } from '../../../src/core/types/increment-metadata.js.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Status Auto-Transition', () => {
  // ✅ SAFE: Use temp directory instead of project root
  const testRootPath = path.join(os.tmpdir(), 'specweave-test-status-auto-transition');
  const testIncrementsPath = path.join(testRootPath, '.specweave', 'increments');

  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();

    // Clean up test directory
    if (fs.existsSync(testRootPath)) {
      fs.removeSync(testRootPath);
    }

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
      test('transitions from PLANNING to ACTIVE when tasks.md exists', () => {
        const incrementId = '0001-test';
        createTestIncrement(incrementId, IncrementStatus.PLANNING);

        // Create tasks.md
        createFile(incrementId, 'tasks.md', '# Tasks\n\n- [ ] **T-001**: Test task');

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(true);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.ACTIVE);
      });

      test('does not transition if tasks.md does not exist', () => {
        const incrementId = '0002-test';
        createTestIncrement(incrementId, IncrementStatus.PLANNING);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(false);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.PLANNING);
      });

      test('does not transition if already ACTIVE', () => {
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
      test('transitions from BACKLOG to PLANNING when spec.md exists', () => {
        const incrementId = '0004-test';
        createTestIncrement(incrementId, IncrementStatus.BACKLOG);

        // Create spec.md
        createFile(incrementId, 'spec.md', '# Spec\n\nTest spec');

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(true);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.PLANNING);
      });

      test('does not transition if spec.md does not exist', () => {
        const incrementId = '0005-test';
        createTestIncrement(incrementId, IncrementStatus.BACKLOG);

        const result = autoTransitionStatus(incrementId);

        expect(result).toBe(false);

        const metadata = MetadataManager.read(incrementId);
        expect(metadata.status).toBe(IncrementStatus.BACKLOG);
      });
    });

    describe('Rule 3: Any status → ACTIVE when tasks in-progress', () => {
      test('transitions from PLANNING to ACTIVE when tasks in-progress', () => {
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

      test('transitions from BACKLOG to ACTIVE when tasks in-progress', () => {
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

      test('does not transition if all tasks pending', () => {
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

    test('handles missing increment gracefully', () => {
      const result = autoTransitionStatus('9999-nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('onFileCreated()', () => {
    test('triggers auto-transition when spec.md created', () => {
      const incrementId = '0009-test';
      createTestIncrement(incrementId, IncrementStatus.BACKLOG);

      const specPath = path.join(testIncrementsPath, incrementId, 'spec.md');
      createFile(incrementId, 'spec.md', '# Spec');

      onFileCreated(incrementId, specPath);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING);
    });

    test('triggers auto-transition when tasks.md created', () => {
      const incrementId = '0010-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      const tasksPath = path.join(testIncrementsPath, incrementId, 'tasks.md');
      createFile(incrementId, 'tasks.md', '# Tasks');

      onFileCreated(incrementId, tasksPath);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });

    test('ignores non-trigger files', () => {
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
    test('returns true for PLANNING with tasks.md', () => {
      const incrementId = '0012-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);
      createFile(incrementId, 'tasks.md', '# Tasks');

      expect(shouldTransitionToActive(incrementId)).toBe(true);
    });

    test('returns true for PLANNING with in-progress tasks', () => {
      const incrementId = '0013-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);
      createFile(incrementId, 'tasks.md', '- [⏳] **T-001**: In-progress');

      expect(shouldTransitionToActive(incrementId)).toBe(true);
    });

    test('returns false for ACTIVE status', () => {
      const incrementId = '0014-test';
      createTestIncrement(incrementId, IncrementStatus.ACTIVE);
      createFile(incrementId, 'tasks.md', '# Tasks');

      expect(shouldTransitionToActive(incrementId)).toBe(false);
    });

    test('returns false for PLANNING without tasks.md', () => {
      const incrementId = '0015-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      expect(shouldTransitionToActive(incrementId)).toBe(false);
    });

    test('handles missing increment gracefully', () => {
      expect(shouldTransitionToActive('9999-nonexistent')).toBe(false);
    });
  });

  describe('migrateLegacyStatuses()', () => {
    test('migrates "planned" to "planning"', () => {
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

    test('migrates multiple increments', () => {
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

    test('skips increments with valid status', () => {
      const incrementId = '0020-test';
      createTestIncrement(incrementId, IncrementStatus.PLANNING);

      const migratedCount = migrateLegacyStatuses();

      expect(migratedCount).toBe(0);

      const metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.PLANNING); // Unchanged
    });

    test('skips _archive folder', () => {
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

    test('handles empty increments folder', () => {
      const migratedCount = migrateLegacyStatuses();
      expect(migratedCount).toBe(0);
    });
  });

  describe('Integration: Full workflow', () => {
    test('increment lifecycle: PLANNING → ACTIVE', () => {
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

      // Step 3: Create tasks.md (auto-transition to ACTIVE)
      createFile(incrementId, 'tasks.md', '# Tasks\n\n- [ ] **T-001**: Test');
      autoTransitionStatus(incrementId);

      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });

    test('increment lifecycle: BACKLOG → PLANNING → ACTIVE', () => {
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

      // Step 3: Create tasks.md (PLANNING → ACTIVE)
      createFile(incrementId, 'tasks.md', '# Tasks');
      autoTransitionStatus(incrementId);

      metadata = MetadataManager.read(incrementId);
      expect(metadata.status).toBe(IncrementStatus.ACTIVE);
    });
  });
});
