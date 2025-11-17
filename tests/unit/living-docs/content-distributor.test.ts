/**
 * Unit tests for Content Distributor
 */

import {
  ContentDistributor,
  DistributionResult,
  DistributorOptions,
  createContentDistributor,
} from '../../../src/core/living-docs/content-distributor.js';
import { ParsedSection, ParsedSpec } from '../../../src/core/living-docs/content-parser.js';
import {
  ClassificationResult,
  ContentCategory,
} from '../../../src/core/living-docs/content-classifier.js';
import { ProjectContext } from '../../../src/core/living-docs/project-detector.js';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
vi.mock('fs-extra');

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Type-safe mocked functions
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockExistsSync = vi.mocked(fs.existsSync);
const mockReaddir = vi.mocked(fs.readdir);
const mockReadJSON = vi.mocked(fs.readJSON);
const mockEnsureDir = vi.mocked(fs.ensureDir);

describe('ContentDistributor', () => {
  let distributor: ContentDistributor;
  let mockBasePath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBasePath = '/test/.specweave/docs/internal';

    // Default mocks
    mockExistsSync.mockReturnValue(false);
    mockEnsureDir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('');
  });

  describe('Constructor and Options', () => {
    it('should create distributor with default options', () => {
      distributor = new ContentDistributor();

      // Should use default base path
      expect(distributor).toBeDefined();
    });

    it('should create distributor with custom options', () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        generateFrontmatter: false,
        preserveOriginal: false,
        dryRun: true,
      });

      expect(distributor).toBeDefined();
    });

    it('should use default values for missing options', () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
      });

      expect(distributor).toBeDefined();
    });
  });

  describe('Basic Distribution', () => {
    let spec: ParsedSpec;
    let classifications: ClassificationResult[];
    let project: ProjectContext;

    beforeEach(() => {
      spec = {
        frontmatter: {
          title: 'Test Spec',
          status: 'draft',
          priority: 'P1',
        },
        sections: [
          {
            id: 'us-001',
            heading: 'US-001: User Login',
            level: 2,
            content: 'User can log in with credentials',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
          {
            id: 'architecture',
            heading: 'Architecture',
            level: 2,
            content: 'System uses microservices architecture',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 6,
            endLine: 10,
            children: [],
          },
        ],
        raw: '# Test Spec\n\n## US-001: User Login\n\nUser can log in',
      };

      classifications = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: ['US-XXX pattern'],
          suggestedFilename: 'us-001-user-login.md',
          suggestedPath: 'specs/{project}',
        },
        {
          category: ContentCategory.Architecture,
          confidence: 0.8,
          reasoning: ['Architecture heading'],
          suggestedFilename: 'system-architecture.md',
          suggestedPath: 'architecture',
        },
      ];

      project = {
        id: 'backend',
        name: 'Backend Services',
        confidence: 0.9,
        reasoning: ['Project detected'],
      };

      distributor = new ContentDistributor({ basePath: mockBasePath });
    });

    it('should distribute sections to appropriate files', async () => {
      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(result.created.length).toBe(2);
      expect(result.summary.totalSections).toBe(2);
      expect(result.summary.filesCreated).toBe(2);
      expect(mockWriteFile).toHaveBeenCalledTimes(3); // 2 files + 1 archive
    });

    it('should count sections by category', async () => {
      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(result.summary.byCategory[ContentCategory.UserStory]).toBe(1);
      expect(result.summary.byCategory[ContentCategory.Architecture]).toBe(1);
    });

    it('should update existing files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('old content');

      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(result.updated.length).toBe(2);
      expect(result.summary.filesUpdated).toBe(2);
    });

    it('should skip unchanged files', async () => {
      mockExistsSync.mockReturnValue(true);

      // Mock readFile to return the exact content that would be generated
      mockReadFile.mockImplementation(async (filePath) => {
        // Return the same content that will be generated
        // This will cause the file to be skipped
        const generated = `---
id: "us-001"
title: "US-001: User Login"
sidebar_label: "US-001: User Login"
description: "User can log in with credentials"
tags: ["user-story", "backend", "0016-test"]
increment: "0016-test"
project: "backend"
category: "user-story"
last_updated: "${new Date().toISOString().split('T')[0]}"
status: "draft"
priority: "P1"
---

## US-001: User Login

User can log in with credentials

---

**Source**: [Increment 0016-test](../../../increments/0016-test/spec.md)
**Project**: Backend Services
**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;
        return generated;
      });

      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(result.skipped.length).toBeGreaterThan(0);
    });

    it('should handle errors during file write', async () => {
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary.errors).toBeGreaterThan(0);
    });

    it('should skip unknown categories', async () => {
      const unknownClassifications: ClassificationResult[] = [
        {
          category: ContentCategory.Unknown,
          confidence: 0.3,
          reasoning: [],
          suggestedFilename: '',
          suggestedPath: '',
        },
      ];

      const result = await distributor.distribute(
        '0016-test',
        spec,
        unknownClassifications,
        project
      );

      expect(result.created.length).toBe(0); // Unknown sections not written
    });

    it('should archive original spec when preserveOriginal is true', async () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        preserveOriginal: true,
      });

      await distributor.distribute('0016-test', spec, classifications, project);

      const archiveCalls = mockWriteFile.mock.calls.filter(
        (call) => call[0].includes('_archive')
      );

      expect(archiveCalls.length).toBe(1);
    });

    it('should not archive when preserveOriginal is false', async () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        preserveOriginal: false,
      });

      await distributor.distribute('0016-test', spec, classifications, project);

      const archiveCalls = mockWriteFile.mock.calls.filter(
        (call) => call[0].includes('_archive')
      );

      expect(archiveCalls.length).toBe(0);
    });
  });

  describe('Dry Run Mode', () => {
    it('should not write files in dry run mode', async () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        dryRun: true,
      });

      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [
          {
            id: 'test',
            heading: 'Test',
            level: 1,
            content: 'content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const classifications: ClassificationResult[] = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'test.md',
          suggestedPath: 'specs/{project}',
        },
      ];

      const project: ProjectContext = {
        id: 'default',
        name: 'Default',
        confidence: 1.0,
        reasoning: [],
      };

      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(result.created.length).toBeGreaterThan(0); // Still reports what would be created
    });
  });

  describe('Frontmatter Generation', () => {
    it('should generate Docusaurus frontmatter when enabled', async () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        generateFrontmatter: true,
      });

      const spec: ParsedSpec = {
        frontmatter: {
          title: 'Test',
          status: 'draft',
        },
        sections: [
          {
            id: 'us-001',
            heading: 'US-001',
            level: 2,
            content: 'User story content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const classifications: ClassificationResult[] = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'us-001.md',
          suggestedPath: 'specs/{project}',
        },
      ];

      const project: ProjectContext = {
        id: 'backend',
        name: 'Backend',
        confidence: 1.0,
        reasoning: [],
      };

      await distributor.distribute('0016-test', spec, classifications, project);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('---');
      expect(content).toContain('id:');
      expect(content).toContain('title:');
      expect(content).toContain('tags:');
    });

    it('should not generate frontmatter when disabled', async () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        generateFrontmatter: false,
      });

      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [
          {
            id: 'test',
            heading: 'Test',
            level: 2,
            content: 'content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const classifications: ClassificationResult[] = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'test.md',
          suggestedPath: 'specs/{project}',
        },
      ];

      const project: ProjectContext = {
        id: 'default',
        name: 'Default',
        confidence: 1.0,
        reasoning: [],
      };

      await distributor.distribute('0016-test', spec, classifications, project);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      // Should start with heading, not frontmatter
      expect(content.startsWith('---')).toBe(false);
      expect(content).toContain('## Test');
    });
  });

  describe('Index Generation', () => {
    it('should generate index file for category', async () => {
      distributor = new ContentDistributor({ basePath: mockBasePath });

      const files = [
        {
          path: '/test/specs/backend/us-001.md',
          category: ContentCategory.UserStory,
          size: 1000,
          sections: 1,
        },
        {
          path: '/test/specs/backend/us-002.md',
          category: ContentCategory.UserStory,
          size: 1500,
          sections: 1,
        },
      ];

      await distributor.generateIndex(ContentCategory.UserStory, 'backend', files);

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('# User Stories');
      expect(content).toContain('backend');
      expect(content).toContain('Files: 2');
    });

    it('should sort files alphabetically in index', async () => {
      distributor = new ContentDistributor({ basePath: mockBasePath });

      const files = [
        {
          path: '/test/specs/backend/us-003.md',
          category: ContentCategory.UserStory,
          size: 1000,
          sections: 1,
        },
        {
          path: '/test/specs/backend/us-001.md',
          category: ContentCategory.UserStory,
          size: 1000,
          sections: 1,
        },
        {
          path: '/test/specs/backend/us-002.md',
          category: ContentCategory.UserStory,
          size: 1000,
          sections: 1,
        },
      ];

      await distributor.generateIndex(ContentCategory.UserStory, 'backend', files);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      // Should be sorted: us-001, us-002, us-003
      const us001Index = content.indexOf('us-001');
      const us002Index = content.indexOf('us-002');
      const us003Index = content.indexOf('us-003');

      expect(us001Index).toBeLessThan(us002Index);
      expect(us002Index).toBeLessThan(us003Index);
    });

    it('should not generate index in dry run mode', async () => {
      distributor = new ContentDistributor({
        basePath: mockBasePath,
        dryRun: true,
      });

      await distributor.generateIndex(ContentCategory.UserStory, 'backend', []);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should calculate distribution statistics', () => {
      distributor = new ContentDistributor();

      const result: DistributionResult = {
        created: [
          {
            path: '/test/us-001.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/arch.md',
            category: ContentCategory.Architecture,
            size: 2000,
            sections: 2,
          },
        ],
        updated: [
          {
            path: '/test/us-002.md',
            category: ContentCategory.UserStory,
            size: 1500,
            sections: 1,
          },
        ],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 4,
          filesCreated: 2,
          filesUpdated: 1,
          filesSkipped: 0,
          errors: 0,
          byCategory: {
            [ContentCategory.UserStory]: 2,
            [ContentCategory.Architecture]: 1,
          } as any,
        },
      };

      const stats = distributor.getStatistics(result);

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(4500);
      expect(stats.averageSize).toBe(1500);
      expect(stats.byCategory[ContentCategory.UserStory].files).toBe(2);
      expect(stats.byCategory[ContentCategory.UserStory].size).toBe(2500);
    });

    it('should handle empty results', () => {
      distributor = new ContentDistributor();

      const result: DistributionResult = {
        created: [],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 0,
          filesCreated: 0,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      const stats = distributor.getStatistics(result);

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
    });
  });

  describe('Path Resolution', () => {
    it('should replace {project} placeholder in path', async () => {
      distributor = new ContentDistributor({ basePath: mockBasePath });

      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [
          {
            id: 'test',
            heading: 'Test',
            level: 1,
            content: 'content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const classifications: ClassificationResult[] = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'test.md',
          suggestedPath: 'specs/{project}', // Has placeholder
        },
      ];

      const project: ProjectContext = {
        id: 'backend',
        name: 'Backend',
        confidence: 1.0,
        reasoning: [],
      };

      await distributor.distribute('0016-test', spec, classifications, project);

      const writeCall = mockWriteFile.mock.calls[0];
      const filePath = writeCall[0];

      expect(filePath).toContain('specs/backend'); // Placeholder replaced
      expect(filePath).not.toContain('{project}');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections', async () => {
      distributor = new ContentDistributor({ basePath: mockBasePath });

      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [],
        raw: '',
      };

      const classifications: ClassificationResult[] = [];

      const project: ProjectContext = {
        id: 'default',
        name: 'Default',
        confidence: 1.0,
        reasoning: [],
      };

      const result = await distributor.distribute('0016-test', spec, classifications, project);

      expect(result.created.length).toBe(0);
      expect(result.summary.totalSections).toBe(0);
    });

    it('should handle nested sections', async () => {
      distributor = new ContentDistributor({ basePath: mockBasePath });

      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [
          {
            id: 'parent',
            heading: 'Parent',
            level: 1,
            content: 'parent content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [
              {
                id: 'child',
                heading: 'Child',
                level: 2,
                content: 'child content',
                rawContent: '',
                codeBlocks: [],
                links: [],
                images: [],
                startLine: 6,
                endLine: 10,
                children: [],
              },
            ],
          },
        ],
        raw: '',
      };

      const classifications: ClassificationResult[] = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'parent.md',
          suggestedPath: 'specs/{project}',
        },
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'child.md',
          suggestedPath: 'specs/{project}',
        },
      ];

      const project: ProjectContext = {
        id: 'default',
        name: 'Default',
        confidence: 1.0,
        reasoning: [],
      };

      const result = await distributor.distribute('0016-test', spec, classifications, project);

      // Both parent and child should be processed
      expect(result.summary.totalSections).toBe(2);
    });

    it('should ensure directories exist', async () => {
      distributor = new ContentDistributor({ basePath: mockBasePath });

      const spec: ParsedSpec = {
        frontmatter: {},
        sections: [
          {
            id: 'test',
            heading: 'Test',
            level: 1,
            content: 'content',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: 1,
            endLine: 5,
            children: [],
          },
        ],
        raw: '',
      };

      const classifications: ClassificationResult[] = [
        {
          category: ContentCategory.UserStory,
          confidence: 0.9,
          reasoning: [],
          suggestedFilename: 'test.md',
          suggestedPath: 'specs/{project}/subfolder',
        },
      ];

      const project: ProjectContext = {
        id: 'backend',
        name: 'Backend',
        confidence: 1.0,
        reasoning: [],
      };

      await distributor.distribute('0016-test', spec, classifications, project);

      expect(mockEnsureDir).toHaveBeenCalled();
    });
  });

  describe('Factory Functions', () => {
    it('should work with createContentDistributor', () => {
      const distributor = createContentDistributor();

      expect(distributor).toBeDefined();
    });

    it('should work with custom options', () => {
      const distributor = createContentDistributor({
        basePath: mockBasePath,
        dryRun: true,
      });

      expect(distributor).toBeDefined();
    });
  });
});
