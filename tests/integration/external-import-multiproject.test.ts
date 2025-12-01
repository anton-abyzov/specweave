/**
 * Integration tests for multi-project external import functionality
 *
 * Tests the fix for:
 * - FE repo GitHub issues not being imported
 * - "default" folder being used instead of direct specs/
 * - BE external sync numbering (FS-001E pattern)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import the functions we're testing
import { ItemConverter } from '../../src/importers/item-converter.js';
import { FSIdAllocator } from '../../src/living-docs/fs-id-allocator.js';
import type { ExternalItem } from '../../src/importers/external-importer.js';

describe('Multi-Project External Import', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    // Create .specweave/docs/internal/specs structure
    fs.mkdirSync(path.join(tempDir, '.specweave', 'docs', 'internal', 'specs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('ItemConverter with undefined projectId', () => {
    it('should place items directly in specs/ when projectId is undefined', async () => {
      const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');

      const converter = new ItemConverter({
        specsDir,
        projectRoot: tempDir,
        enableFeatureAllocation: true,
        projectId: undefined, // Should NOT create 'default' folder
      });

      const items: ExternalItem[] = [
        {
          id: 'github#1',
          title: 'Test Issue',
          description: 'Test description',
          status: 'open',
          platform: 'github',
          url: 'https://github.com/test/repo/issues/1',
          createdAt: new Date(),
          updatedAt: new Date(),
          labels: [],
        },
      ];

      const converted = await converter.convertItems(items);

      expect(converted.length).toBe(1);

      // Verify file was created in specs/ directly, NOT in specs/default/
      const filePath = converted[0].filePath;
      expect(filePath).not.toContain('/default/');
      expect(filePath).toContain('/specs/');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should place items in project folder when projectId is provided', async () => {
      const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');

      const converter = new ItemConverter({
        specsDir,
        projectRoot: tempDir,
        enableFeatureAllocation: true,
        projectId: 'sw-thumbnail-ab-be', // Should create this folder
      });

      const items: ExternalItem[] = [
        {
          id: 'github#1',
          title: 'Backend Issue',
          description: 'Backend description',
          status: 'open',
          platform: 'github',
          url: 'https://github.com/test/sw-thumbnail-ab-be/issues/1',
          createdAt: new Date(),
          updatedAt: new Date(),
          labels: [],
          sourceRepo: 'test/sw-thumbnail-ab-be',
        },
      ];

      const converted = await converter.convertItems(items);

      expect(converted.length).toBe(1);

      // Verify file was created in specs/sw-thumbnail-ab-be/
      const filePath = converted[0].filePath;
      expect(filePath).toContain('/sw-thumbnail-ab-be/');
      expect(filePath).not.toContain('/default/');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('FSIdAllocator with undefined projectId', () => {
    it('should scan specs/ directly when projectId is undefined', async () => {
      const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');

      // Create a feature folder directly in specs/
      const featurePath = path.join(specsDir, 'FS-001');
      fs.mkdirSync(featurePath, { recursive: true });
      fs.writeFileSync(
        path.join(featurePath, 'FEATURE.md'),
        `---
id: FS-001
title: Test Feature
created: ${new Date().toISOString()}
---

# Test Feature
`
      );

      const allocator = new FSIdAllocator(tempDir, undefined);
      await allocator.scanExistingIds();

      // Allocate a new ID
      const result = await allocator.allocateId({
        externalId: 'github#2',
        title: 'New Feature',
        createdAt: new Date().toISOString(),
        externalUrl: 'https://github.com/test/repo/issues/2',
      });

      // Should allocate FS-002E (next after existing FS-001)
      expect(result.id).toBe('FS-002E');
    });

    it('should scan project folder when projectId is provided', async () => {
      const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');
      const projectDir = path.join(specsDir, 'sw-thumbnail-ab-be');

      // Create a feature folder in project folder
      const featurePath = path.join(projectDir, 'FS-001');
      fs.mkdirSync(featurePath, { recursive: true });
      fs.writeFileSync(
        path.join(featurePath, 'FEATURE.md'),
        `---
id: FS-001
title: Backend Feature
created: ${new Date().toISOString()}
---

# Backend Feature
`
      );

      const allocator = new FSIdAllocator(tempDir, 'sw-thumbnail-ab-be');
      await allocator.scanExistingIds();

      // Allocate a new ID
      const result = await allocator.allocateId({
        externalId: 'github#2',
        title: 'New Backend Feature',
        createdAt: new Date().toISOString(),
        externalUrl: 'https://github.com/test/sw-thumbnail-ab-be/issues/2',
      });

      // Should allocate FS-002E (next after existing FS-001)
      expect(result.id).toBe('FS-002E');
    });
  });

  describe('Multi-repo item grouping', () => {
    it('should correctly group items by source repository', async () => {
      const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');

      // Items from different repos
      const items: ExternalItem[] = [
        {
          id: 'github#1',
          title: 'Backend Issue 1',
          description: 'BE description',
          status: 'open',
          platform: 'github',
          url: 'https://github.com/test/sw-thumbnail-ab-be/issues/1',
          createdAt: new Date(),
          updatedAt: new Date(),
          labels: [],
          sourceRepo: 'test/sw-thumbnail-ab-be',
        },
        {
          id: 'github#2',
          title: 'Frontend Issue 1',
          description: 'FE description',
          status: 'open',
          platform: 'github',
          url: 'https://github.com/test/sw-thumbnail-ab-fe/issues/1',
          createdAt: new Date(),
          updatedAt: new Date(),
          labels: [],
          sourceRepo: 'test/sw-thumbnail-ab-fe',
        },
        {
          id: 'github#3',
          title: 'Frontend Issue 2',
          description: 'FE description 2',
          status: 'open',
          platform: 'github',
          url: 'https://github.com/test/sw-thumbnail-ab-fe/issues/2',
          createdAt: new Date(),
          updatedAt: new Date(),
          labels: [],
          sourceRepo: 'test/sw-thumbnail-ab-fe',
        },
      ];

      // Process BE items
      const beConverter = new ItemConverter({
        specsDir,
        projectRoot: tempDir,
        enableFeatureAllocation: true,
        projectId: 'sw-thumbnail-ab-be',
      });

      const beItems = items.filter(i => i.sourceRepo?.includes('sw-thumbnail-ab-be'));
      const beConverted = await beConverter.convertItems(beItems);
      expect(beConverted.length).toBe(1);
      expect(beConverted[0].filePath).toContain('/sw-thumbnail-ab-be/');

      // Process FE items
      const feConverter = new ItemConverter({
        specsDir,
        projectRoot: tempDir,
        enableFeatureAllocation: true,
        projectId: 'sw-thumbnail-ab-fe',
      });

      const feItems = items.filter(i => i.sourceRepo?.includes('sw-thumbnail-ab-fe'));
      const feConverted = await feConverter.convertItems(feItems);
      expect(feConverted.length).toBe(2);
      expect(feConverted[0].filePath).toContain('/sw-thumbnail-ab-fe/');
      expect(feConverted[1].filePath).toContain('/sw-thumbnail-ab-fe/');

      // Verify directory structure
      expect(fs.existsSync(path.join(specsDir, 'sw-thumbnail-ab-be'))).toBe(true);
      expect(fs.existsSync(path.join(specsDir, 'sw-thumbnail-ab-fe'))).toBe(true);
      expect(fs.existsSync(path.join(specsDir, 'default'))).toBe(false); // Should NOT exist
    });
  });
});

describe('ADO Hierarchy Grouping', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'docs', 'internal', 'specs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should group ADO User Stories by parent Epic/Capability', async () => {
    const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');

    // Create items representing ADO hierarchy:
    // Epic ADO-100 has children: User Story ADO-200, ADO-201
    // Epic ADO-101 has children: User Story ADO-202
    const items: ExternalItem[] = [
      // Epic 1 (will become FS-001E folder)
      {
        id: 'ADO-100',
        type: 'epic',
        title: 'Authentication Epic',
        description: 'Authentication feature epic',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/100',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Platform',
        adoWorkItemType: 'Epic',
      },
      // User Story under Epic 1
      {
        id: 'ADO-200',
        type: 'user-story',
        title: 'Login Page',
        description: 'As a user I want to login',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/200',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        parentId: 'ADO-100',
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Frontend', // Different area path!
        adoWorkItemType: 'User Story',
      },
      // Another User Story under Epic 1
      {
        id: 'ADO-201',
        type: 'user-story',
        title: 'Logout Button',
        description: 'As a user I want to logout',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/201',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        parentId: 'ADO-100',
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Frontend',
        adoWorkItemType: 'User Story',
      },
      // Epic 2 (will become FS-002E folder)
      {
        id: 'ADO-101',
        type: 'epic',
        title: 'Payment Epic',
        description: 'Payment feature epic',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/101',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Backend',
        adoWorkItemType: 'Epic',
      },
      // User Story under Epic 2
      {
        id: 'ADO-202',
        type: 'user-story',
        title: 'Payment Processing',
        description: 'As a user I want to pay',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/202',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        parentId: 'ADO-101',
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Backend',
        adoWorkItemType: 'User Story',
      },
    ];

    // Process items - each Epic group should get its own converter
    // This simulates what happens in external-import.ts groupItemsByExternalContainer

    // Group 1: Epic ADO-100 and its children
    const epic1Items = items.filter(i =>
      i.id === 'ADO-100' || i.parentId === 'ADO-100'
    );
    const converter1 = new ItemConverter({
      specsDir,
      projectRoot: tempDir,
      enableFeatureAllocation: true,
      projectId: 'authentication-epic', // Derived from Epic title
      externalContainer: {
        type: 'ado-project',
        containerId: 'MyProject',
        containerName: 'MyProject',
        areaPath: 'MyProject\\Platform',
      },
    });
    const converted1 = await converter1.convertItems(epic1Items);

    // Group 2: Epic ADO-101 and its children
    const epic2Items = items.filter(i =>
      i.id === 'ADO-101' || i.parentId === 'ADO-101'
    );
    const converter2 = new ItemConverter({
      specsDir,
      projectRoot: tempDir,
      enableFeatureAllocation: true,
      projectId: 'payment-epic', // Derived from Epic title
      externalContainer: {
        type: 'ado-project',
        containerId: 'MyProject',
        containerName: 'MyProject',
        areaPath: 'MyProject\\Backend',
      },
    });
    const converted2 = await converter2.convertItems(epic2Items);

    // Verify results
    // Epic 1 group: 3 items (1 Epic + 2 User Stories) → should be in authentication-epic folder
    expect(converted1.length).toBe(3);

    // Epic 2 group: 2 items (1 Epic + 1 User Story) → should be in payment-epic folder
    expect(converted2.length).toBe(2);

    // Verify separate project folders were created (containerId is normalized to lowercase)
    // Structure: specs/{containerId}/{projectId}/FS-XXX/
    const containerDir = path.join(specsDir, 'myproject'); // containerId normalized
    expect(fs.existsSync(containerDir)).toBe(true);

    const containerContents = fs.readdirSync(containerDir);
    expect(containerContents).toContain('authentication-epic');
    expect(containerContents).toContain('payment-epic');

    // CRITICAL: Verify items with different area paths ended up together
    // (ADO-100 has area MyProject\Platform but ADO-200/201 have MyProject\Frontend)
    // They should still be in the same folder because they share the same parent Epic
    const authEpicFolder = path.join(containerDir, 'authentication-epic');
    const authEpicContents = fs.readdirSync(authEpicFolder);

    // Should have at least one FS-XXX folder with FEATURE.md
    const featureFolders = authEpicContents.filter(f => f.startsWith('FS-'));
    expect(featureFolders.length).toBeGreaterThan(0);

    const firstFeatureFolder = path.join(authEpicFolder, featureFolders[0]);
    const featureContents = fs.readdirSync(firstFeatureFolder);
    expect(featureContents.some(f => f.includes('FEATURE.md'))).toBe(true);
  });

  it('should create separate folders for orphan User Stories (parent not in dataset)', async () => {
    const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');

    // User Stories without their parent Epic in the dataset
    // They should still be grouped by their parentId
    const items: ExternalItem[] = [
      {
        id: 'ADO-300',
        type: 'user-story',
        title: 'Orphan Story 1',
        description: 'Story with missing parent',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/300',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        parentId: 'ADO-999', // Parent not in dataset
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Frontend',
        adoWorkItemType: 'User Story',
      },
      {
        id: 'ADO-301',
        type: 'user-story',
        title: 'Orphan Story 2 Same Parent',
        description: 'Another story with same missing parent',
        status: 'open',
        platform: 'ado',
        url: 'https://dev.azure.com/org/project/_workitems/edit/301',
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        parentId: 'ADO-999', // Same parent as ADO-300
        adoProjectName: 'MyProject',
        adoAreaPath: 'MyProject\\Frontend',
        adoWorkItemType: 'User Story',
      },
    ];

    // These should be grouped together because they share the same parentId
    const converter = new ItemConverter({
      specsDir,
      projectRoot: tempDir,
      enableFeatureAllocation: true,
      projectId: 'orphan-999', // Derived from missing parent ID
      externalContainer: {
        type: 'ado-project',
        containerId: 'MyProject',
        containerName: 'MyProject',
        areaPath: 'MyProject\\Frontend',
      },
    });

    const converted = await converter.convertItems(items);

    // Both orphan stories should be converted
    expect(converted.length).toBe(2);

    // They should be in the same folder
    const folder1 = path.dirname(converted[0].filePath);
    const folder2 = path.dirname(converted[1].filePath);
    expect(folder1).toBe(folder2);
  });
});

describe('getExistingSyncProfiles helper', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Inline implementation of getExistingSyncProfiles for testing
  function getExistingSyncProfiles(projectRoot: string): string[] | null {
    try {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
        const profiles = config.sync.profiles;
        const repos: string[] = [];

        for (const [profileId, profile] of Object.entries(profiles)) {
          const p = profile as { config?: { owner?: string; repo?: string } };
          if (p.config?.owner && p.config?.repo) {
            repos.push(`${p.config.owner}/${p.config.repo}`);
          }
        }

        return repos.length > 0 ? repos : null;
      }

      return null;
    } catch {
      return null;
    }
  }

  it('should return null when config.json does not exist', () => {
    const result = getExistingSyncProfiles(tempDir);
    expect(result).toBeNull();
  });

  it('should return null when sync.profiles is not present', () => {
    const configPath = path.join(tempDir, '.specweave', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ version: '2.0' }));

    const result = getExistingSyncProfiles(tempDir);
    expect(result).toBeNull();
  });

  it('should extract repositories from sync.profiles', () => {
    const config = {
      version: '2.0',
      sync: {
        profiles: {
          'sw-thumbnail-ab-be': {
            provider: 'github',
            config: {
              owner: 'anton-abyzov',
              repo: 'sw-thumbnail-ab-be',
            },
          },
          'sw-thumbnail-ab-fe': {
            provider: 'github',
            config: {
              owner: 'anton-abyzov',
              repo: 'sw-thumbnail-ab-fe',
            },
          },
          'sw-thumbnail-ab-shared': {
            provider: 'github',
            config: {
              owner: 'anton-abyzov',
              repo: 'sw-thumbnail-ab-shared',
            },
          },
        },
      },
    };

    const configPath = path.join(tempDir, '.specweave', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const result = getExistingSyncProfiles(tempDir);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result).toContain('anton-abyzov/sw-thumbnail-ab-be');
    expect(result).toContain('anton-abyzov/sw-thumbnail-ab-fe');
    expect(result).toContain('anton-abyzov/sw-thumbnail-ab-shared');
  });
});
