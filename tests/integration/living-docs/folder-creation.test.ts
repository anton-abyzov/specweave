import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';
import { FSIdAllocator, type ExternalWorkItem } from '../../../src/living-docs/fs-id-allocator.js';
import { IDRegistry } from '../../../src/living-docs/id-registry.js';
import { createExternalMetadata } from '../../../src/core/types/origin-metadata.js';

describe('Folder Creation and ID Registry (T-042)', () => {
  let testDir: string;
  let allocator: FSIdAllocator;
  let registry: IDRegistry;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `test-folder-creation-${Date.now()}`);
    await fs.ensureDir(testDir);

    allocator = new FSIdAllocator(testDir);
    registry = new IDRegistry(testDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('TC-133: Create FS-XXX folder with metadata', () => {
    it('should create folder with README.md containing all frontmatter fields', async () => {
      // Given: FS-042E and work item with GitHub metadata
      const fsId = 'FS-042E';
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#638',
        title: 'Implement US-Task Linkage',
        createdAt: '2025-01-15T10:30:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/638'
      };

      const metadata = createExternalMetadata({
        id: fsId,
        source: 'github',
        externalId: workItem.externalId,
        externalUrl: workItem.externalUrl,
        externalTitle: 'Original GitHub Title',
        formatPreservation: true
      });

      // When: createFeatureFolder() called
      const featurePath = await allocator.createFeatureFolder(fsId, workItem, metadata);

      // Then: Folder created with README.md
      expect(await fs.pathExists(featurePath)).toBe(true);

      const readmePath = path.join(featurePath, 'README.md');
      expect(await fs.pathExists(readmePath)).toBe(true);

      // Parse README frontmatter
      const content = await fs.readFile(readmePath, 'utf-8');
      const parsed = matter(content);
      const frontmatter = parsed.data;

      // Verify all required fields
      expect(frontmatter.id).toBe(fsId);
      expect(frontmatter.title).toBe(workItem.title);
      expect(frontmatter.origin).toBe('external');
      expect(frontmatter.source).toBe('github');
      expect(frontmatter.external_id).toBe(workItem.externalId);
      expect(frontmatter.external_url).toBe(workItem.externalUrl);
      expect(frontmatter.external_title).toBe('Original GitHub Title');
      expect(frontmatter.format_preservation).toBe(true);

      // gray-matter parses ISO 8601 timestamps as Date objects
      const importedAt = frontmatter.imported_at instanceof Date
        ? frontmatter.imported_at.toISOString()
        : frontmatter.imported_at;
      expect(importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601

      const created = frontmatter.created instanceof Date
        ? frontmatter.created.toISOString()
        : frontmatter.created;
      // Normalize timestamp format (gray-matter adds milliseconds)
      expect(created.replace(/\.000Z$/, 'Z')).toBe(workItem.createdAt);
    });

    it('should handle optional frontmatter fields correctly', async () => {
      // Given: Minimal metadata (no external_title or format_preservation)
      const fsId = 'FS-001E';
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#1',
        title: 'Minimal Work Item',
        createdAt: '2025-01-01T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/1'
      };

      const metadata = createExternalMetadata({
        id: fsId,
        source: 'github',
        externalId: workItem.externalId,
        externalUrl: workItem.externalUrl
        // No externalTitle or formatPreservation
      });

      // When: createFeatureFolder() called
      await allocator.createFeatureFolder(fsId, workItem, metadata);

      // Then: README should exist without optional fields causing issues
      const readmePath = path.join(testDir, '.specweave/docs/internal/specs', fsId, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.data.id).toBe(fsId);
      expect(parsed.data.external_title).toBeUndefined();
      expect(parsed.data.format_preservation).toBeUndefined();
    });
  });

  describe('TC-134: Add origin badge to README', () => {
    it('should include origin badge in README content for GitHub', async () => {
      // Given: External work item from GitHub Milestone #42
      const fsId = 'FS-050E';
      const workItem: ExternalWorkItem = {
        externalId: 'GH-#638',
        title: 'GitHub Feature',
        createdAt: '2025-02-01T00:00:00Z',
        externalUrl: 'https://github.com/owner/repo/issues/638'
      };

      const metadata = createExternalMetadata({
        id: fsId,
        source: 'github',
        externalId: workItem.externalId,
        externalUrl: workItem.externalUrl
      });

      // When: README generated
      await allocator.createFeatureFolder(fsId, workItem, metadata);

      // Then: Contains origin badge
      const readmePath = path.join(testDir, '.specweave/docs/internal/specs', fsId, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');

      expect(content).toContain('**Origin**: 🔗 [GITHUB #638]');
      expect(content).toContain(workItem.externalUrl);
    });

    it('should include origin badge for JIRA', async () => {
      // Given: JIRA work item
      const fsId = 'FS-051E';
      const workItem: ExternalWorkItem = {
        externalId: 'JIRA-SPEC-789',
        title: 'JIRA Feature',
        createdAt: '2025-02-02T00:00:00Z',
        externalUrl: 'https://jira.example.com/browse/SPEC-789'
      };

      const metadata = createExternalMetadata({
        id: fsId,
        source: 'jira',
        externalId: workItem.externalId,
        externalUrl: workItem.externalUrl
      });

      // When: README generated
      await allocator.createFeatureFolder(fsId, workItem, metadata);

      // Then: Contains JIRA badge
      const readmePath = path.join(testDir, '.specweave/docs/internal/specs', fsId, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');

      expect(content).toContain('**Origin**: 🎫 [JIRA SPEC-789]');
      expect(content).toContain(workItem.externalUrl);
    });
  });

  describe('TC-135: Atomic ID registration (concurrent access)', () => {
    it('should handle concurrent registerID calls safely', async () => {
      // Given: 3 concurrent calls to registerID with different IDs
      const ids = ['FS-001E', 'FS-002E', 'FS-003E'];
      const promises = ids.map(id =>
        registry.registerID(id, {
          registeredAt: new Date().toISOString(),
          externalId: `GH-#${id}`,
          externalUrl: `https://github.com/owner/repo/issues/${id}`,
          origin: 'external'
        })
      );

      // When: Executed in parallel
      await Promise.all(promises);

      // Then: All should succeed
      const allIDs = await registry.getAllIDs();
      expect(allIDs.sort()).toEqual(ids.sort());
    });

    it('should prevent duplicate registration of same ID', async () => {
      // Given: First registration succeeds
      await registry.registerID('FS-010E', {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#100',
        externalUrl: 'https://github.com/owner/repo/issues/100',
        origin: 'external'
      });

      // When: Attempting to register same ID again
      const promise = registry.registerID('FS-010E', {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#101',
        externalUrl: 'https://github.com/owner/repo/issues/101',
        origin: 'external'
      });

      // Then: Should throw collision error
      await expect(promise).rejects.toThrow('ID collision: FS-010E conflicts with FS-010E');
    });
  });

  describe('TC-136: ID registry prevents collision', () => {
    it('should detect collision between FS-042 and FS-042E', async () => {
      // Given: FS-042 already in registry
      await registry.registerID('FS-042', {
        registeredAt: new Date().toISOString(),
        origin: 'internal'
      });

      // When: Attempting to register FS-042E
      const promise = registry.registerID('FS-042E', {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#638',
        externalUrl: 'https://github.com/owner/repo/issues/638',
        origin: 'external'
      });

      // Then: Should throw collision error
      await expect(promise).rejects.toThrow('ID collision: FS-042E conflicts with FS-042');
    });

    it('should detect collision between FS-042E and FS-042', async () => {
      // Given: FS-042E already in registry
      await registry.registerID('FS-042E', {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#638',
        externalUrl: 'https://github.com/owner/repo/issues/638',
        origin: 'external'
      });

      // When: Attempting to register FS-042
      const promise = registry.registerID('FS-042', {
        registeredAt: new Date().toISOString(),
        origin: 'internal'
      });

      // Then: Should throw collision error
      await expect(promise).rejects.toThrow('ID collision: FS-042 conflicts with FS-042E');
    });

    it('should allow different IDs without collision', async () => {
      // Given: FS-042 in registry
      await registry.registerID('FS-042', {
        registeredAt: new Date().toISOString(),
        origin: 'internal'
      });

      // When: Registering FS-043E (different number)
      await registry.registerID('FS-043E', {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#639',
        externalUrl: 'https://github.com/owner/repo/issues/639',
        origin: 'external'
      });

      // Then: Both should exist
      const allIDs = await registry.getAllIDs();
      expect(allIDs.sort()).toEqual(['FS-042', 'FS-043E'].sort());
    });
  });

  describe('Registry Utility Methods', () => {
    it('should check if ID exists', async () => {
      // Given: Registered ID
      await registry.registerID('FS-100E', {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#1000',
        externalUrl: 'https://github.com/owner/repo/issues/1000',
        origin: 'external'
      });

      // When: Checking existence
      const exists = await registry.hasID('FS-100E');
      const notExists = await registry.hasID('FS-999E');

      // Then: Should return correct results
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should retrieve registry entry', async () => {
      // Given: Registered ID
      const metadata = {
        registeredAt: new Date().toISOString(),
        externalId: 'GH-#1000',
        externalUrl: 'https://github.com/owner/repo/issues/1000',
        origin: 'external' as const
      };

      await registry.registerID('FS-200E', metadata);

      // When: Retrieving entry
      const entry = await registry.getEntry('FS-200E');

      // Then: Should return full entry
      expect(entry).not.toBeNull();
      expect(entry?.id).toBe('FS-200E');
      expect(entry?.externalId).toBe(metadata.externalId);
      expect(entry?.externalUrl).toBe(metadata.externalUrl);
      expect(entry?.origin).toBe('external');
    });

    it('should return null for non-existent entry', async () => {
      // When: Retrieving non-existent entry
      const entry = await registry.getEntry('FS-999E');

      // Then: Should return null
      expect(entry).toBeNull();
    });

    it('should get all registered IDs', async () => {
      // Given: Multiple registered IDs
      await registry.registerID('FS-001', { registeredAt: new Date().toISOString(), origin: 'internal' });
      await registry.registerID('FS-002E', { registeredAt: new Date().toISOString(), origin: 'external', externalId: 'GH-#2', externalUrl: 'https://github.com/owner/repo/issues/2' });
      await registry.registerID('FS-003', { registeredAt: new Date().toISOString(), origin: 'internal' });

      // When: Getting all IDs
      const allIDs = await registry.getAllIDs();

      // Then: Should return all IDs
      expect(allIDs.sort()).toEqual(['FS-001', 'FS-002E', 'FS-003'].sort());
    });
  });
});
