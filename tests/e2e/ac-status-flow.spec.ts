/**
 * E2E tests for AC Status Automation Flow
 *
 * Tests the complete AC status synchronization workflow:
 * 1. Create increment with spec.md (ACs) and tasks.md
 * 2. Mark tasks as complete
 * 3. Verify AC checkboxes update automatically (via hook)
 * 4. Test manual sync command (/specweave:sync-acs)
 * 5. Test conflict detection (manual override)
 * 6. Test orphaned AC warnings
 * 7. Test metadata logging
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { ACStatusManager } from '../../src/core/increment/ac-status-manager';

// ✅ SAFE: Isolated test directory (prevents .specweave deletion)
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'specweave-test-e2e-ac-status-flow-' + Date.now());

test.describe('AC Status Automation E2E Flow', () => {
  let manager: ACStatusManager;

  test.beforeAll(() => {
    // Create test project directory
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_PROJECT_DIR, { recursive: true });

    // Initialize ACStatusManager
    manager = new ACStatusManager(TEST_PROJECT_DIR);
  });

  test.afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
  });

  test.describe('Scenario 1: Normal AC Sync (100% Complete)', () => {
    test('should update AC from [ ] to [x] when all tasks complete', async () => {
      // Arrange: Create test increment
      const incrementId = '0901-ac-sync-normal';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      // Create spec.md with unchecked ACs
      const specContent = `---
increment: ${incrementId}
---

# Feature: AC Sync Test

## User Stories

### US-001: Login Feature

**Acceptance Criteria**:
- [ ] AC-US1-01: User can login with email
- [ ] AC-US1-02: Session persists after reload
- [ ] AC-US1-03: Password validation works
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      // Create tasks.md with all tasks complete for AC-US1-01
      const tasksContent = `# Tasks

#### T-001: Implement login API
**AC**: AC-US1-01
- [x] Completed

#### T-002: Add session storage
**AC**: AC-US1-01
- [x] Completed

#### T-003: Test session persistence
**AC**: AC-US1-02
- [ ] Not started
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      // Create metadata.json
      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act: Trigger AC sync
      const result = await manager.syncACStatus(incrementId);

      // Assert: AC-US1-01 should be updated to [x]
      expect(result.synced).toBe(true);
      expect(result.updated).toContain('AC-US1-01');
      expect(result.updated).not.toContain('AC-US1-02'); // Only 0/1 tasks complete
      expect(result.updated).not.toContain('AC-US1-03'); // No tasks

      // Verify spec.md was updated
      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01: User can login with email');
      expect(updatedSpec).toContain('[ ] AC-US1-02: Session persists after reload');
      expect(updatedSpec).toContain('[ ] AC-US1-03: Password validation works');

      // Verify metadata logging
      const updatedMetadata = JSON.parse(fs.readFileSync(path.join(incrementDir, 'metadata.json'), 'utf-8'));
      expect(updatedMetadata.acSyncEvents).toBeDefined();
      expect(updatedMetadata.acSyncEvents.length).toBe(1);
      expect(updatedMetadata.acSyncEvents[0].updated).toContain('AC-US1-01');
      expect(updatedMetadata.acSyncEvents[0].changesCount).toBe(1);
    });
  });

  test.describe('Scenario 2: Partial Completion (No Update)', () => {
    test('should NOT update AC when only partial tasks complete', async () => {
      // Arrange
      const incrementId = '0902-ac-sync-partial';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `---
increment: ${incrementId}
---

- [ ] AC-US1-01: Feature complete
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: First task
**AC**: AC-US1-01
- [x] Completed

#### T-002: Second task
**AC**: AC-US1-01
- [ ] Not started

#### T-003: Third task
**AC**: AC-US1-01
- [ ] Not started
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act
      const result = await manager.syncACStatus(incrementId);

      // Assert: No update (only 33% complete)
      expect(result.synced).toBe(false);
      expect(result.updated).toHaveLength(0);

      // Verify spec.md unchanged
      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[ ] AC-US1-01: Feature complete');
    });
  });

  test.describe('Scenario 3: Conflict Detection', () => {
    test('should detect conflict when AC is [x] but tasks incomplete', async () => {
      // Arrange
      const incrementId = '0903-ac-sync-conflict';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `---
increment: ${incrementId}
---

- [x] AC-US1-01: Manually checked AC
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Task one
**AC**: AC-US1-01
- [x] Completed

#### T-002: Task two
**AC**: AC-US1-01
- [ ] Not complete
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act
      const result = await manager.syncACStatus(incrementId);

      // Assert: Conflict detected
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]).toContain('AC-US1-01');
      expect(result.conflicts[0]).toContain('[x]');
      expect(result.conflicts[0]).toContain('1/2'); // 1 of 2 tasks complete

      // Verify spec.md NOT changed (manual override preserved)
      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01'); // Still [x]
    });
  });

  test.describe('Scenario 4: Orphaned AC Warnings', () => {
    test('should warn about ACs with no implementing tasks', async () => {
      // Arrange
      const incrementId = '0904-ac-sync-orphaned';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `---
increment: ${incrementId}
---

- [ ] AC-US1-01: Has tasks
- [ ] AC-US1-99: No tasks (orphaned)
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Only task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act
      const result = await manager.syncACStatus(incrementId);

      // Assert: Warning about orphaned AC
      expect(result.warnings).toBeDefined();
      const orphanedWarning = result.warnings.find(w => w.includes('AC-US1-99'));
      expect(orphanedWarning).toBeDefined();
      expect(orphanedWarning).toContain('no tasks');
    });
  });

  test.describe('Scenario 5: Multiple ACs Per Task', () => {
    test('should handle tasks covering multiple ACs', async () => {
      // Arrange
      const incrementId = '0905-ac-sync-multiple';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `---
increment: ${incrementId}
---

- [ ] AC-US1-01: First AC
- [ ] AC-US1-02: Second AC
- [ ] AC-US1-03: Third AC
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Task covering multiple ACs
**AC**: AC-US1-01, AC-US1-02
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act
      const result = await manager.syncACStatus(incrementId);

      // Assert: Both AC-US1-01 and AC-US1-02 should be updated
      expect(result.updated).toContain('AC-US1-01');
      expect(result.updated).toContain('AC-US1-02');
      expect(result.updated).not.toContain('AC-US1-03');

      const updatedSpec = fs.readFileSync(path.join(incrementDir, 'spec.md'), 'utf-8');
      expect(updatedSpec).toContain('[x] AC-US1-01');
      expect(updatedSpec).toContain('[x] AC-US1-02');
      expect(updatedSpec).toContain('[ ] AC-US1-03');
    });
  });

  test.describe('Scenario 6: Edge Cases', () => {
    test('should handle missing spec.md gracefully', async () => {
      const incrementId = '0906-ac-sync-missing-spec';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const tasksContent = `#### T-001: Task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const result = await manager.syncACStatus(incrementId);

      expect(result.synced).toBe(false);
      expect(result.warnings).toContain('spec.md does not exist');
    });

    test('should handle missing tasks.md gracefully', async () => {
      const incrementId = '0907-ac-sync-missing-tasks';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `- [ ] AC-US1-01: Test`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const result = await manager.syncACStatus(incrementId);

      expect(result.synced).toBe(false);
      expect(result.warnings).toContain('tasks.md does not exist');
    });

    test('should handle tasks with no AC tags', async () => {
      const incrementId = '0908-ac-sync-no-ac-tags';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `- [ ] AC-US1-01: Test`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Task without AC tag
- [x] Completed

#### T-002: Task with AC
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      const result = await manager.syncACStatus(incrementId);

      // Should only process T-002
      expect(result.updated).toContain('AC-US1-01');
    });

    test('should handle malformed AC patterns gracefully', async () => {
      const incrementId = '0909-ac-sync-malformed';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `- [ ] AC-US1-01: Valid
- [ ] INVALID-AC: Bad pattern
`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      const result = await manager.syncACStatus(incrementId);

      // Should process valid AC only
      expect(result.updated).toContain('AC-US1-01');
    });
  });

  test.describe('Scenario 7: Metadata Logging', () => {
    test('should log sync events to metadata.json with rolling 20-event limit', async () => {
      const incrementId = '0910-ac-sync-metadata-logging';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `- [ ] AC-US1-01: Test AC`;
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      const tasksContent = `#### T-001: Test task
**AC**: AC-US1-01
- [x] Completed
`;
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act: Run sync multiple times to test rolling limit
      await manager.syncACStatus(incrementId);

      // Verify first sync logged
      let updatedMetadata = JSON.parse(fs.readFileSync(path.join(incrementDir, 'metadata.json'), 'utf-8'));
      expect(updatedMetadata.acSyncEvents).toBeDefined();
      expect(updatedMetadata.acSyncEvents.length).toBe(1);
      expect(updatedMetadata.acSyncEvents[0].timestamp).toBeDefined();
      expect(updatedMetadata.acSyncEvents[0].updated).toContain('AC-US1-01');
      expect(updatedMetadata.acSyncEvents[0].changesCount).toBe(1);

      // Simulate 25 more syncs to test rolling limit
      for (let i = 0; i < 25; i++) {
        // Reset spec to trigger new sync
        fs.writeFileSync(path.join(incrementDir, 'spec.md'), `- [ ] AC-US1-0${i + 2}: Test AC ${i + 2}`);
        fs.writeFileSync(path.join(incrementDir, 'tasks.md'), `#### T-00${i + 2}: Test task\n**AC**: AC-US1-0${i + 2}\n- [x] Completed\n`);
        await manager.syncACStatus(incrementId);
      }

      // Verify rolling 20-event limit
      updatedMetadata = JSON.parse(fs.readFileSync(path.join(incrementDir, 'metadata.json'), 'utf-8'));
      expect(updatedMetadata.acSyncEvents.length).toBeLessThanOrEqual(20);
      expect(updatedMetadata.acSyncEvents[0].timestamp).toBeTruthy(); // Newest first
    });
  });

  test.describe('Scenario 8: Performance', () => {
    test('should sync within 200ms for typical increment (50 ACs, 100 tasks)', async () => {
      const incrementId = '0911-ac-sync-performance';
      const incrementDir = path.join(TEST_PROJECT_DIR, '.specweave', 'increments', incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      // Create spec with 50 ACs
      let specContent = '---\\nincrement: ' + incrementId + '\\n---\\n\\n';
      for (let i = 1; i <= 50; i++) {
        specContent += `- [ ] AC-US1-${String(i).padStart(2, '0')}: AC ${i}\\n`;
      }
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      // Create tasks with 100 tasks (all complete)
      let tasksContent = '# Tasks\\n\\n';
      for (let i = 1; i <= 100; i++) {
        const acId = `AC-US1-${String((i % 50) + 1).padStart(2, '0')}`;
        tasksContent += `#### T-${String(i).padStart(3, '0')}: Task ${i}\\n`;
        tasksContent += `**AC**: ${acId}\\n`;
        tasksContent += `- [x] Completed\\n\\n`;
      }
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

      const metadata = {
        id: incrementId,
        status: 'active',
        type: 'feature',
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Act: Measure sync time
      const startTime = Date.now();
      await manager.syncACStatus(incrementId);
      const duration = Date.now() - startTime;

      // Assert: Should complete within 200ms
      expect(duration).toBeLessThan(200);
    });
  });
});
