import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';
import { EpicIdAllocator, type ExternalEpicItem } from '../../../src/living-docs/epic-id-allocator.js';

describe('Epic ID Allocator (Per-Project Epics v0.30.3)', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create isolated test directory with per-project structure
    testDir = path.join(os.tmpdir(), `test-epic-allocator-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.ensureDir(testDir);
    // Create per-project _epics folder structure
    await fs.ensureDir(path.join(testDir, '.specweave/docs/internal/specs/acme/_epics'));
    await fs.ensureDir(path.join(testDir, '.specweave/docs/internal/specs/parent/_epics'));
  });

  afterEach(async () => {
    // Cleanup test directory
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Per-Project Epic Path Construction', () => {
    it('should construct epics path with projectId', () => {
      const allocator = new EpicIdAllocator(testDir, 'acme');

      expect(allocator.getProjectId()).toBe('acme');
      expect(allocator.getEpicsPath()).toBe(
        path.join(testDir, '.specweave/docs/internal/specs/acme/_epics')
      );
    });

    it('should construct epics path for parent project', () => {
      const allocator = new EpicIdAllocator(testDir, 'parent');

      expect(allocator.getProjectId()).toBe('parent');
      expect(allocator.getEpicsPath()).toBe(
        path.join(testDir, '.specweave/docs/internal/specs/parent/_epics')
      );
    });
  });

  describe('TC-EP-001: First epic allocation', () => {
    it('should allocate EP-001E for first epic in project', async () => {
      const allocator = new EpicIdAllocator(testDir, 'acme');

      const workItem: ExternalEpicItem = {
        externalId: 'ADO-123',
        title: 'Platform Capabilities',
        createdAt: '2025-01-01T00:00:00Z',
        externalUrl: 'https://dev.azure.com/org/project/_workitems/edit/123',
        workItemType: 'Capability'
      };

      const result = await allocator.allocateId(workItem);

      expect(result.id).toBe('EP-001E');
      expect(result.strategy).toBe('first');
      expect(result.number).toBe(1);
    });
  });

  describe('TC-EP-002: Append mode allocation', () => {
    it('should append EP-002E after EP-001E', async () => {
      const allocator = new EpicIdAllocator(testDir, 'acme');

      // Create existing epic
      await createEpicFolder(testDir, 'acme', 'EP-001E', '2025-01-01T00:00:00Z');

      const workItem: ExternalEpicItem = {
        externalId: 'ADO-456',
        title: 'Second Capability',
        createdAt: '2025-01-15T00:00:00Z',
        externalUrl: 'https://dev.azure.com/org/project/_workitems/edit/456',
        workItemType: 'Capability'
      };

      const result = await allocator.allocateId(workItem);

      expect(result.id).toBe('EP-002E');
      expect(result.strategy).toBe('append');
      expect(result.number).toBe(2);
    });
  });

  describe('TC-EP-003: Project isolation', () => {
    it('should not see epics from other projects', async () => {
      // Create epic in acme project
      await createEpicFolder(testDir, 'acme', 'EP-001E', '2025-01-01T00:00:00Z');

      // Create allocator for parent project (different project)
      const allocator = new EpicIdAllocator(testDir, 'parent');

      const workItem: ExternalEpicItem = {
        externalId: 'ADO-789',
        title: 'Parent Capability',
        createdAt: '2025-01-01T00:00:00Z',
        externalUrl: 'https://dev.azure.com/org/project/_workitems/edit/789',
        workItemType: 'Capability'
      };

      const result = await allocator.allocateId(workItem);

      // Should allocate EP-001E (not EP-002E) since parent project has no epics
      expect(result.id).toBe('EP-001E');
      expect(result.strategy).toBe('first');
    });
  });

  describe('TC-EP-004: Collision detection', () => {
    it('should detect collision with existing EP-XXX', async () => {
      const allocator = new EpicIdAllocator(testDir, 'acme');

      // Create EP-001 (internal) and EP-001E (external) - same index
      await createEpicFolder(testDir, 'acme', 'EP-001', '2025-01-01T00:00:00Z');

      // Both should be detected as collision
      expect(allocator.hasCollision('EP-001')).toBe(false); // Not scanned yet
      await allocator.scanExistingIds();
      expect(allocator.hasCollision('EP-001')).toBe(true);
      expect(allocator.hasCollision('EP-001E')).toBe(true); // Same index
    });
  });

  describe('TC-EP-005: Epic folder creation', () => {
    it('should create EPIC.md in per-project _epics folder', async () => {
      const allocator = new EpicIdAllocator(testDir, 'acme');

      const workItem: ExternalEpicItem = {
        externalId: 'ADO-999',
        title: 'Test Capability',
        createdAt: '2025-01-01T00:00:00Z',
        externalUrl: 'https://dev.azure.com/org/project/_workitems/edit/999',
        workItemType: 'Capability'
      };

      const metadata = {
        id: 'EP-001E',
        source: 'ado' as const,
        external_id: 'ADO-999',
        external_url: 'https://dev.azure.com/org/project/_workitems/edit/999',
        external_title: 'Test Capability',
        imported_at: new Date().toISOString()
      };

      const epicPath = await allocator.createEpicFolder('EP-001E', workItem, metadata);

      // Verify path is in per-project location
      expect(epicPath).toBe(
        path.join(testDir, '.specweave/docs/internal/specs/acme/_epics/EP-001E')
      );

      // Verify EPIC.md exists
      const epicMdPath = path.join(epicPath, 'EPIC.md');
      expect(await fs.pathExists(epicMdPath)).toBe(true);

      // Verify content
      const content = await fs.readFile(epicMdPath, 'utf-8');
      expect(content).toContain('id: EP-001E');
      expect(content).toContain('title: "Test Capability"');
      expect(content).toContain('work_item_type: Capability');
    });
  });
});

/**
 * Helper to create test epic folder with EPIC.md
 */
async function createEpicFolder(testDir: string, projectId: string, epicId: string, createdAt: string): Promise<void> {
  const epicPath = path.join(testDir, '.specweave/docs/internal/specs', projectId, '_epics', epicId);
  await fs.ensureDir(epicPath);

  const epicContent = `---
id: ${epicId}
created: ${createdAt}
---
# Test Epic
`;

  await fs.writeFile(path.join(epicPath, 'EPIC.md'), epicContent);
}
