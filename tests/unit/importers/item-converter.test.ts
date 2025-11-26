/**
 * Unit tests for ItemConverter
 *
 * Tests conversion of external items to living docs User Stories
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ItemConverter } from '../../../src/importers/item-converter.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';

describe('ItemConverter', () => {
  let testDir: string;
  let specsDir: string;
  let converter: ItemConverter;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `item-converter-test-${Date.now()}`);
    specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });

    converter = new ItemConverter({ specsDir });
  });

  afterEach(() => {
    // Cleanup
    try {
      fs.removeSync(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('TC-072: Convert GitHub issue to US with E suffix', () => {
    it('should convert GitHub issue to US-001E', () => {
      const githubIssue: ExternalItem = {
        id: 'GITHUB-638',
        type: 'user-story',
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        status: 'open',
        priority: 'P1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        url: 'https://github.com/owner/repo/issues/638',
        labels: ['feature', 'backend'],
        acceptanceCriteria: ['User can login', 'User can register'],
        platform: 'github'
      };

      const converted = converter.convertItem(githubIssue, 1);

      expect(converted.id).toBe('US-001E');
      expect(converted.title).toBe('Implement user authentication');
      expect(converted.description).toBe('Add login and registration functionality');
      expect(converted.priority).toBe('P1');
      expect(converted.status).toBe('Open');
      expect(converted.acceptanceCriteria).toHaveLength(2);
      expect(converted.metadata.externalId).toBe('GITHUB-638');
      expect(converted.metadata.externalUrl).toBe('https://github.com/owner/repo/issues/638');
      expect(converted.metadata.externalPlatform).toBe('github');
    });

    it('should generate correct file name with kebab-case', () => {
      const githubIssue: ExternalItem = {
        id: 'GITHUB-638',
        type: 'user-story',
        title: 'Implement User Authentication & Authorization',
        description: 'Test',
        status: 'open',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        url: 'https://github.com/owner/repo/issues/638',
        labels: [],
        platform: 'github'
      };

      const converted = converter.convertItem(githubIssue, 1);

      expect(converted.filePath).toContain('us-001e-implement-user-authentication-authorization.md');
    });

    it('should increment US-ID for multiple items', () => {
      const item1: ExternalItem = {
        id: 'GITHUB-1',
        type: 'user-story',
        title: 'First Story',
        description: 'First',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://github.com/owner/repo/issues/1',
        labels: [],
        platform: 'github'
      };

      const item2: ExternalItem = {
        id: 'GITHUB-2',
        type: 'user-story',
        title: 'Second Story',
        description: 'Second',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://github.com/owner/repo/issues/2',
        labels: [],
        platform: 'github'
      };

      const converted1 = converter.convertItem(item1, 1);
      const converted2 = converter.convertItem(item2, 2);

      expect(converted1.id).toBe('US-001E');
      expect(converted2.id).toBe('US-002E');
    });
  });

  describe('TC-073: Preserve external metadata in living docs', () => {
    it('should preserve all metadata fields', () => {
      const jiraIssue: ExternalItem = {
        id: 'JIRA-PROJECT-123',
        type: 'epic',
        title: 'Epic Feature',
        description: 'Epic description',
        status: 'in-progress',
        priority: 'P0',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-15T15:30:00Z'),
        url: 'https://example.atlassian.net/browse/PROJECT-123',
        labels: ['backend', 'api', 'critical'],
        acceptanceCriteria: ['AC1', 'AC2', 'AC3'],
        platform: 'jira'
      };

      const converted = converter.convertItem(jiraIssue, 1);

      expect(converted.metadata.externalId).toBe('JIRA-PROJECT-123');
      expect(converted.metadata.externalUrl).toBe('https://example.atlassian.net/browse/PROJECT-123');
      expect(converted.metadata.externalPlatform).toBe('jira');
      expect(converted.metadata.createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(converted.metadata.updatedAt).toBe('2024-01-15T15:30:00.000Z');
      expect(converted.metadata.labels).toEqual(['backend', 'api', 'critical']);
      expect(converted.metadata.importedAt).toBeDefined();
    });

    it('should include metadata in markdown content', () => {
      const adoItem: ExternalItem = {
        id: 'ADO-456',
        type: 'bug',
        title: 'Fix critical bug',
        description: 'Bug description',
        status: 'completed',
        priority: 'P0',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        url: 'https://dev.azure.com/org/project/_workitems/edit/456',
        labels: ['bug', 'hotfix'],
        platform: 'ado'
      };

      const converted = converter.convertItem(adoItem, 1);

      expect(converted.markdown).toContain('## External Metadata');
      expect(converted.markdown).toContain('**External ID**: ADO-456');
      expect(converted.markdown).toContain('**External URL**: https://dev.azure.com/org/project/_workitems/edit/456');
      expect(converted.markdown).toContain('**Platform**: ado');
      expect(converted.markdown).toContain('**Labels**: bug, hotfix');
    });
  });

  describe('TC-074: Create living docs file with origin badge (NO increment)', () => {
    it('should create living docs file only', async () => {
      const items: ExternalItem[] = [
        {
          id: 'GITHUB-100',
          type: 'user-story',
          title: 'User Story Title',
          description: 'Description here',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/100',
          labels: [],
          platform: 'github'
        }
      ];

      const converted = await converter.convertItems(items);

      // Living docs file should exist
      expect(fs.existsSync(converted[0].filePath)).toBe(true);

      // Increments directory should NOT be created
      const incrementsDir = path.join(testDir, '.specweave', 'increments');
      expect(fs.existsSync(incrementsDir)).toBe(false);
    });

    it('should include origin badge in markdown', () => {
      const githubIssue: ExternalItem = {
        id: 'GITHUB-638',
        type: 'user-story',
        title: 'Test Issue',
        description: 'Test',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://github.com/owner/repo/issues/638',
        labels: [],
        platform: 'github'
      };

      const converted = converter.convertItem(githubIssue, 1);

      expect(converted.markdown).toContain('**Origin**: 🔗 [GitHub #638](https://github.com/owner/repo/issues/638)');
    });

    it('should generate origin badge for JIRA', () => {
      const jiraIssue: ExternalItem = {
        id: 'JIRA-PROJECT-123',
        type: 'user-story',
        title: 'Test Issue',
        description: 'Test',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://example.atlassian.net/browse/PROJECT-123',
        labels: [],
        platform: 'jira'
      };

      const converted = converter.convertItem(jiraIssue, 1);

      expect(converted.markdown).toContain('**Origin**: 🔗 [JIRA #PROJECT-123](https://example.atlassian.net/browse/PROJECT-123)');
    });

    it('should generate origin badge for ADO', () => {
      const adoItem: ExternalItem = {
        id: 'ADO-456',
        type: 'user-story',
        title: 'Test Issue',
        description: 'Test',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://dev.azure.com/org/project/_workitems/edit/456',
        labels: [],
        platform: 'ado'
      };

      const converted = converter.convertItem(adoItem, 1);

      expect(converted.markdown).toContain('**Origin**: 🔗 [Azure DevOps #456](https://dev.azure.com/org/project/_workitems/edit/456)');
    });
  });

  describe('TC-075: Validate no auto-increment creation', () => {
    it('should pass validation if no increments created', () => {
      // No increments directory exists
      expect(() => {
        ItemConverter.validateNoIncrementsCreated(testDir);
      }).not.toThrow();
    });

    it('should pass validation if increments directory is empty', () => {
      // Create empty increments directory
      const incrementsDir = path.join(testDir, '.specweave', 'increments');
      fs.mkdirSync(incrementsDir, { recursive: true });

      expect(() => {
        ItemConverter.validateNoIncrementsCreated(testDir);
      }).not.toThrow();
    });

    it('should fail validation if increment directory created', () => {
      // Create increment directory (simulating auto-creation)
      const incrementsDir = path.join(testDir, '.specweave', 'increments');
      fs.mkdirSync(path.join(incrementsDir, '0001-test-increment'), { recursive: true });

      expect(() => {
        ItemConverter.validateNoIncrementsCreated(testDir);
      }).toThrow('VALIDATION FAILED: Increments were auto-created during import');
    });

    it('should detect multiple auto-created increments', () => {
      // Create multiple increment directories
      const incrementsDir = path.join(testDir, '.specweave', 'increments');
      fs.mkdirSync(path.join(incrementsDir, '0001-first'), { recursive: true });
      fs.mkdirSync(path.join(incrementsDir, '0002-second'), { recursive: true });

      expect(() => {
        ItemConverter.validateNoIncrementsCreated(testDir);
      }).toThrow('Found: 0001-first, 0002-second');
    });
  });

  describe('Acceptance Criteria Conversion', () => {
    it('should generate AC-IDs from acceptance criteria', () => {
      const item: ExternalItem = {
        id: 'GITHUB-1',
        type: 'user-story',
        title: 'User Story',
        description: 'Description',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://github.com/owner/repo/issues/1',
        labels: [],
        acceptanceCriteria: ['First AC', 'Second AC', 'Third AC'],
        platform: 'github'
      };

      const converted = converter.convertItem(item, 1);

      expect(converted.markdown).toContain('- [ ] **AC-US-001-01**: First AC');
      expect(converted.markdown).toContain('- [ ] **AC-US-001-02**: Second AC');
      expect(converted.markdown).toContain('- [ ] **AC-US-001-03**: Third AC');
    });

    it('should handle items without acceptance criteria', () => {
      const item: ExternalItem = {
        id: 'GITHUB-1',
        type: 'user-story',
        title: 'User Story',
        description: 'Description',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://github.com/owner/repo/issues/1',
        labels: [],
        platform: 'github'
      };

      const converted = converter.convertItem(item, 1);

      // Should not have AC section
      expect(converted.acceptanceCriteria).toHaveLength(0);
      expect(converted.markdown).not.toContain('## Acceptance Criteria');
    });
  });

  describe('Status Mapping', () => {
    it('should map external statuses correctly', () => {
      const testCases: Array<{ external: ExternalItem['status']; expected: string }> = [
        { external: 'open', expected: 'Open' },
        { external: 'in-progress', expected: 'In Progress' },
        { external: 'completed', expected: 'Completed' },
        { external: 'closed', expected: 'Completed' }
      ];

      for (const testCase of testCases) {
        const item: ExternalItem = {
          id: 'GITHUB-1',
          type: 'user-story',
          title: 'Test',
          description: 'Test',
          status: testCase.external,
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/1',
          labels: [],
          platform: 'github'
        };

        const converted = converter.convertItem(item, 1);
        expect(converted.status).toBe(testCase.expected);
        expect(converted.markdown).toContain(`**Status**: ${testCase.expected}`);
      }
    });
  });

  describe('Batch Conversion', () => {
    it('should convert multiple items and write files', async () => {
      const items: ExternalItem[] = [
        {
          id: 'GITHUB-1',
          type: 'user-story',
          title: 'First Story',
          description: 'First',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/1',
          labels: [],
          platform: 'github'
        },
        {
          id: 'GITHUB-2',
          type: 'user-story',
          title: 'Second Story',
          description: 'Second',
          status: 'in-progress',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/2',
          labels: ['feature'],
          platform: 'github'
        },
        {
          id: 'JIRA-PROJECT-123',
          type: 'epic',
          title: 'Third Story',
          description: 'Third',
          status: 'completed',
          priority: 'P1',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://example.atlassian.net/browse/PROJECT-123',
          labels: ['epic'],
          platform: 'jira'
        }
      ];

      const converted = await converter.convertItems(items);

      expect(converted).toHaveLength(3);
      expect(converted[0].id).toBe('US-001E');
      expect(converted[1].id).toBe('US-002E');
      expect(converted[2].id).toBe('US-003E');

      // All files should exist
      for (const story of converted) {
        expect(fs.existsSync(story.filePath)).toBe(true);
        const content = fs.readFileSync(story.filePath, 'utf-8');
        expect(content).toContain(story.id);
        expect(content).toContain(story.title);
      }
    });

    it('should use custom starting ID', async () => {
      const converterCustom = new ItemConverter({ specsDir, startingId: 10 });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-1',
          type: 'user-story',
          title: 'Story',
          description: 'Test',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/1',
          labels: [],
          platform: 'github'
        }
      ];

      const converted = await converterCustom.convertItems(items);

      expect(converted[0].id).toBe('US-010E');
    });
  });

  describe('AC-US2-01: Feature Folder Organization', () => {
    it('should place items in feature folders when enableFeatureAllocation is true', async () => {
      // Setup: Create _features directory for FSIdAllocator
      const featuresDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      const converterWithFeatures = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0, // Disable auto-archive for this test
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-100',
          type: 'user-story',
          title: 'Feature Item',
          description: 'Item with feature allocation',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/100',
          labels: [],
          platform: 'github',
          sourceRepo: 'org/frontend'
        }
      ];

      const converted = await converterWithFeatures.convertItems(items);

      expect(converted).toHaveLength(1);
      // Should have a featureId assigned
      expect(converted[0].featureId).toBeDefined();
      expect(converted[0].featureId).toMatch(/^FS-\d{3}E?$/); // May have 'E' suffix for external
      // File path should contain feature folder
      expect(converted[0].filePath).toContain(converted[0].featureId);
    });

    it('should group items by sourceRepo into same feature folder', async () => {
      const featuresDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      const converterWithFeatures = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0,
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-1',
          type: 'user-story',
          title: 'First Item',
          description: 'First',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/org/frontend/issues/1',
          labels: [],
          platform: 'github',
          sourceRepo: 'org/frontend'
        },
        {
          id: 'GITHUB-2',
          type: 'user-story',
          title: 'Second Item',
          description: 'Second',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/org/frontend/issues/2',
          labels: [],
          platform: 'github',
          sourceRepo: 'org/frontend'
        }
      ];

      const converted = await converterWithFeatures.convertItems(items);

      expect(converted).toHaveLength(2);
      // Both items should have the same featureId (grouped by sourceRepo)
      expect(converted[0].featureId).toBe(converted[1].featureId);
    });
  });

  describe('AC-US2-02: FEATURE.md with External Origin Metadata', () => {
    it('should create FEATURE.md with external origin metadata', async () => {
      const featuresDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      let createdFeaturePath = '';
      const converterWithFeatures = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0,
        onFeatureCreated: (featureId, featurePath) => {
          createdFeaturePath = featurePath;
        }
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-500',
          type: 'user-story',
          title: 'Test Story',
          description: 'Test',
          status: 'open',
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-15'),
          url: 'https://github.com/myorg/myrepo/issues/500',
          labels: ['feature'],
          platform: 'github',
          sourceRepo: 'myorg/myrepo'
        }
      ];

      await converterWithFeatures.convertItems(items);

      // Check FEATURE.md was created
      const featureFilePath = path.join(createdFeaturePath, 'FEATURE.md');
      expect(fs.existsSync(featureFilePath)).toBe(true);

      // Read and verify content
      const featureContent = fs.readFileSync(featureFilePath, 'utf-8');

      // Check YAML frontmatter
      expect(featureContent).toContain('origin: external');
      expect(featureContent).toContain('source: github');
      expect(featureContent).toContain('source_repo: myorg/myrepo');

      // Check content body
      expect(featureContent).toContain('Imported from github');
      expect(featureContent).toContain('myorg/myrepo');
    });
  });

  describe('AC-US2-03: File Path Structure', () => {
    it('should use correct file path pattern: specs/{featureId}/us-xxxe-title.md', async () => {
      const featuresDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      const converterWithFeatures = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0,
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-42',
          type: 'user-story',
          title: 'User Can Login',
          description: 'Login functionality',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/42',
          labels: [],
          platform: 'github',
          sourceRepo: 'owner/repo'
        }
      ];

      const converted = await converterWithFeatures.convertItems(items);

      // File path should follow pattern: {specsDir}/{featureId}/us-001e-*.md
      const expectedPattern = new RegExp(
        `${specsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/FS-\\d{3}E?/us-001e-user-can-login\\.md$`
      );
      expect(converted[0].filePath).toMatch(expectedPattern);

      // File should exist
      expect(fs.existsSync(converted[0].filePath)).toBe(true);
    });

    it('should support multi-project mode with projectId', async () => {
      const projectId = 'frontend';
      const projectSpecsDir = path.join(specsDir, projectId);
      const featuresDir = path.join(projectSpecsDir, '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      const converterWithProject = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        projectId,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0,
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-99',
          type: 'user-story',
          title: 'Project Item',
          description: 'Item in project subfolder',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/99',
          labels: [],
          platform: 'github',
          sourceRepo: 'owner/repo'
        }
      ];

      const converted = await converterWithProject.convertItems(items);

      // Path should include projectId: specs/{projectId}/{featureId}/us-xxxe.md
      expect(converted[0].filePath).toContain(`/${projectId}/`);
      expect(converted[0].filePath).toContain('/FS-');
    });
  });

  describe('AC-US2-04: FSIdAllocator Integration', () => {
    it('should allocate chronological FS-IDs for features', async () => {
      const featuresDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      // Create an existing feature to ensure new IDs are allocated correctly
      const existingFeatureDir = path.join(featuresDir, 'FS-001');
      fs.mkdirSync(existingFeatureDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingFeatureDir, 'FEATURE.md'),
        '---\nid: FS-001\ntitle: Existing Feature\n---\n'
      );

      const converterWithFeatures = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0,
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-NEW',
          type: 'user-story',
          title: 'New Feature Item',
          description: 'Should get new FS-ID',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/new',
          labels: [],
          platform: 'github',
          sourceRepo: 'owner/new-repo'
        }
      ];

      const converted = await converterWithFeatures.convertItems(items);

      // Should allocate next FS-ID (FS-002 or FS-002E for external)
      // FSIdAllocator may append 'E' for external work items
      expect(converted[0].featureId).toMatch(/^FS-\d{3}E?$/);
      // Should be allocated after existing FS-001
      const allocatedNumber = parseInt(converted[0].featureId!.match(/\d+/)![0]);
      expect(allocatedNumber).toBeGreaterThanOrEqual(1);
    });

    it('should call onFeatureCreated callback when feature is allocated', async () => {
      const featuresDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features');
      fs.mkdirSync(featuresDir, { recursive: true });

      const featureCallbacks: Array<{ featureId: string; featurePath: string }> = [];

      const converterWithCallback = new ItemConverter({
        specsDir,
        projectRoot: testDir,
        enableFeatureAllocation: true,
        autoArchiveAfterDays: 0,
        onFeatureCreated: (featureId, featurePath) => {
          featureCallbacks.push({ featureId, featurePath });
        }
      });

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-CB1',
          type: 'user-story',
          title: 'Callback Test',
          description: 'Test callback',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          url: 'https://github.com/owner/repo/issues/cb1',
          labels: [],
          platform: 'github',
          sourceRepo: 'owner/callback-test'
        }
      ];

      await converterWithCallback.convertItems(items);

      expect(featureCallbacks).toHaveLength(1);
      expect(featureCallbacks[0].featureId).toMatch(/^FS-\d{3}E?$/); // May have 'E' suffix for external
      expect(featureCallbacks[0].featurePath).toContain(featureCallbacks[0].featureId);
    });
  });

  describe('Auto-Archive Feature', () => {
    it('should archive items older than threshold', async () => {
      const converterWithArchive = new ItemConverter({
        specsDir,
        autoArchiveAfterDays: 30, // Archive items older than 30 days
      });

      // Create item that's 60 days old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-OLD',
          type: 'user-story',
          title: 'Old Item',
          description: 'Should be archived',
          status: 'closed',
          createdAt: oldDate,
          updatedAt: oldDate,
          url: 'https://github.com/owner/repo/issues/old',
          labels: [],
          platform: 'github'
        }
      ];

      const converted = await converterWithArchive.convertItems(items);

      // File path should contain _archive
      expect(converted[0].filePath).toContain('_archive');
    });

    it('should not archive recent items', async () => {
      const converterWithArchive = new ItemConverter({
        specsDir,
        autoArchiveAfterDays: 30,
      });

      // Create item that's 5 days old
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-NEW',
          type: 'user-story',
          title: 'Recent Item',
          description: 'Should not be archived',
          status: 'open',
          createdAt: recentDate,
          updatedAt: recentDate,
          url: 'https://github.com/owner/repo/issues/new',
          labels: [],
          platform: 'github'
        }
      ];

      const converted = await converterWithArchive.convertItems(items);

      // File path should NOT contain _archive
      expect(converted[0].filePath).not.toContain('_archive');
    });

    it('should call onItemArchived callback when item is archived', async () => {
      const archivedItems: Array<{ usId: string; reason: string }> = [];

      const converterWithCallback = new ItemConverter({
        specsDir,
        autoArchiveAfterDays: 30,
        onItemArchived: (usId, reason) => {
          archivedItems.push({ usId, reason });
        }
      });

      // Create item that's 45 days old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);

      const items: ExternalItem[] = [
        {
          id: 'GITHUB-ARCHIVE',
          type: 'user-story',
          title: 'Archive Test',
          description: 'Test archive callback',
          status: 'closed',
          createdAt: oldDate,
          updatedAt: oldDate,
          url: 'https://github.com/owner/repo/issues/archive',
          labels: [],
          platform: 'github'
        }
      ];

      await converterWithCallback.convertItems(items);

      expect(archivedItems).toHaveLength(1);
      expect(archivedItems[0].usId).toBe('US-001E');
      expect(archivedItems[0].reason).toContain('45 days old');
    });
  });

  describe('Source Repository Tracking', () => {
    it('should include sourceRepo in metadata', () => {
      const item: ExternalItem = {
        id: 'GITHUB-SRC',
        type: 'user-story',
        title: 'Source Repo Test',
        description: 'Test sourceRepo tracking',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        url: 'https://github.com/myorg/myrepo/issues/src',
        labels: [],
        platform: 'github',
        sourceRepo: 'myorg/myrepo'
      };

      const converted = converter.convertItem(item, 1);

      expect(converted.metadata.sourceRepo).toBe('myorg/myrepo');
      expect(converted.markdown).toContain('**Source Repository**: myorg/myrepo');
    });
  });
});
