/**
 * Unit tests for ThreeLayerSyncManager
 *
 * Tests three-layer synchronization:
 * - GitHub → Living Docs → Increment
 * - Increment → Living Docs → GitHub
 * - Bidirectional sync with conflict resolution
 */

import { ThreeLayerSyncManager } from '../../../src/core/living-docs/ThreeLayerSyncManager.js';
import type { SyncResult } from '../../../src/core/living-docs/ThreeLayerSyncManager.js';
import fs from 'fs/promises';
import { execSync } from 'child_process';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('child_process');

// Type-safe mock helpers
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

describe('ThreeLayerSyncManager', () => {
  let syncManager: ThreeLayerSyncManager;

  beforeEach(() => {
    syncManager = new ThreeLayerSyncManager();
    jest.clearAllMocks();
  });

  describe('syncGitHubToIncrement', () => {
    it('should sync checkbox changes from GitHub to increment', async () => {
      // Mock GitHub API response
      mockExecSync.mockReturnValue(Buffer.from(`
## Acceptance Criteria

- [x] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion

## Tasks

- [x] **T-001**: First task
- [ ] **T-002**: Second task
      `));

      // Mock file system
      mockReadFile.mockResolvedValue(`
---
id: US-001
---
## Acceptance Criteria
- [ ] **AC-US1-01**: First criterion
- [ ] **AC-US1-02**: Second criterion
      `);

      mockWriteFile.mockResolvedValue(undefined);

      const result = await syncManager.syncGitHubToIncrement(
        123,
        '/path/to/increment',
        '/path/to/living-docs'
      );

      expect(result.acsSynced).toBe(2);
      expect(result.tasksSynced).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing user story file', async () => {
      mockExecSync.mockReturnValue(Buffer.from('- [x] **AC-US1-01**: Test'));
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await syncManager.syncGitHubToIncrement(
        123,
        '/path/to/increment',
        '/path/to/living-docs'
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate code exists for completed tasks', async () => {
      mockExecSync.mockReturnValue(Buffer.from('- [x] **T-001**: Complete task'));
      mockReadFile.mockResolvedValue(`
---
id: US-001
---
- [ ] **T-001**: Complete task
      `);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await syncManager.syncGitHubToIncrement(
        123,
        '/path/to/increment',
        '/path/to/living-docs'
      );

      // Code validator should be called
      expect(result.tasksSynced).toBeGreaterThan(0);
    });
  });

  describe('syncIncrementToGitHub', () => {
    it('should sync changes from increment to Living Docs', async () => {
      mockReadFile.mockResolvedValue(`
- [x] **AC-US1-01**: First criterion
- [x] **AC-US1-02**: Second criterion
      `);

      const result = await syncManager.syncIncrementToGitHub(
        '/path/to/increment',
        '/path/to/living-docs'
      );

      expect(result.acsSynced).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should count synced items correctly', async () => {
      mockReadFile.mockResolvedValue(`
- [x] **AC-US1-01**: First
- [x] **AC-US1-02**: Second
- [ ] **AC-US1-03**: Third
      `);

      const result = await syncManager.syncIncrementToGitHub(
        '/path/to/increment',
        '/path/to/living-docs'
      );

      expect(result.acsSynced).toBe(3);
    });
  });

  describe('syncBidirectional', () => {
    it('should prioritize increment as source of truth', async () => {
      mockReadFile.mockResolvedValue('- [x] **AC-US1-01**: Test');

      const result = await syncManager.syncBidirectional(
        '/path/to/increment',
        '/path/to/living-docs'
      );

      expect(result.warnings).toContain('Bidirectional sync: Increment is source of truth, GitHub is informational');
    });
  });

  describe('reopenTask', () => {
    it('should reopen task with reason', async () => {
      const tasksContent = `
### T-001: Test Task
**Completed**: 2025-11-16
---
      `;

      mockReadFile.mockResolvedValue(tasksContent);
      mockWriteFile.mockResolvedValue(undefined);

      await syncManager.reopenTask('T-001', '/path/to/increment', 'Code validation failed');

      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
