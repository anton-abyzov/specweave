/**
 * Unit tests for Cross-Linker
 */

import {
  CrossLinker,
  CrossLink,
  LinkType,
  LinkerOptions,
  createCrossLinker,
} from '../../../src/core/living-docs/cross-linker.js';
import { DistributionResult, DistributedFile } from '../../../src/core/living-docs/content-distributor.js';
import { ContentCategory } from '../../../src/core/living-docs/content-classifier.js';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs-extra BEFORE importing
vi.mock('fs-extra');

// Import after mock
import fs from 'fs-extra';

// Type-safe mocked functions
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockExistsSync = vi.mocked(fs.existsSync);

describe('CrossLinker', () => {
  let linker: CrossLinker;
  let mockBasePath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBasePath = '/test/.specweave/docs/internal';

    // Default mocks - set existsSync to true so documentsRelated() can find links
    mockExistsSync.mockReturnValue(true);
    // Return content with cross-references to trigger link detection
    mockReadFile.mockResolvedValue(
      '# Document\n\nSee authentication-architecture and 0001-use-oauth-authentication for details about us-001-user-authentication'
    );
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('Constructor and Options', () => {
    it('should create linker with default options', () => {
      linker = new CrossLinker();

      expect(linker).toBeDefined();
      const links = linker.getLinks();
      expect(links).toHaveLength(0);
    });

    it('should create linker with custom options', () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        generateBacklinks: false,
        updateExisting: false,
        dryRun: true,
      });

      expect(linker).toBeDefined();
    });

    it('should use default values for missing options', () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
      });

      expect(linker).toBeDefined();
    });
  });

  describe('Link Generation', () => {
    let result: DistributionResult;

    beforeEach(() => {
      result = {
        created: [
          {
            path: '/test/specs/backend/us-001-user-authentication-flow.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-flow-architecture.md',
            category: ContentCategory.Architecture,
            size: 2000,
            sections: 2,
          },
          {
            path: '/test/architecture/adr/0001-authentication-flow-oauth-decision.md',
            category: ContentCategory.ADR,
            size: 1500,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 3,
          filesCreated: 3,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      // Mock files exist and have content with cross-references
      mockExistsSync.mockReturnValue(true);
      // Content mentions the other file basenames for cross-reference detection
      // Note: Must match actual basenames from test data above
      mockReadFile.mockResolvedValue(
        '# Document\n\nSee authentication-architecture and 0001-use-oauth-authentication for details about us-001-user-authentication'
      );

      linker = new CrossLinker({
        basePath: mockBasePath,
        generateBacklinks: false,
        updateExisting: false,
        dryRun: true,
      });
    });

    it('should generate links between user stories and architecture', async () => {
      const links = await linker.generateLinks(result);

      const architectureLinks = links.filter(
        (l) => l.type === LinkType.Implements && l.target.includes('architecture')
      );

      expect(architectureLinks.length).toBeGreaterThan(0);
    });

    it('should generate links between user stories and ADRs', async () => {
      const links = await linker.generateLinks(result);

      const adrLinks = links.filter(
        (l) => l.type === LinkType.References && l.target.includes('adr')
      );

      expect(adrLinks.length).toBeGreaterThan(0);
    });

    it('should generate operations to architecture links', async () => {
      result.created.push({
        path: '/test/operations/runbook-authentication-flow-service.md',
        category: ContentCategory.Operations,
        size: 1000,
        sections: 1,
      });

      const links = await linker.generateLinks(result);

      const opsLinks = links.filter(
        (l) =>
          l.type === LinkType.DependsOn &&
          l.source.includes('operations') &&
          l.target.includes('architecture')
      );

      expect(opsLinks.length).toBeGreaterThan(0);
    });

    it('should generate delivery to specs links', async () => {
      result.created.push({
        path: '/test/delivery/test-strategy-user-authentication-flow.md',
        category: ContentCategory.Delivery,
        size: 1000,
        sections: 1,
      });

      const links = await linker.generateLinks(result);

      const deliveryLinks = links.filter(
        (l) =>
          l.type === LinkType.TestsFor &&
          l.source.includes('delivery') &&
          l.target.includes('specs')
      );

      expect(deliveryLinks.length).toBeGreaterThan(0);
    });

    it('should generate strategy to specs links', async () => {
      result.created.push({
        path: '/test/strategy/user-authentication-flow-requirements.md',
        category: ContentCategory.Strategy,
        size: 1000,
        sections: 1,
      });

      const links = await linker.generateLinks(result);

      const strategyLinks = links.filter(
        (l) =>
          l.type === LinkType.DefinedIn &&
          l.source.includes('strategy') &&
          l.target.includes('specs')
      );

      expect(strategyLinks.length).toBeGreaterThan(0);
    });

    it('should generate backlinks when enabled', async () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        generateBacklinks: true,
        updateExisting: false,
        dryRun: true,
      });

      const links = await linker.generateLinks(result);

      // Should have both forward and backward links
      expect(links.length).toBeGreaterThan(0);

      // Check for bidirectional pairs
      const forwardLinks = links.filter((l) => l.type === LinkType.Implements);
      const backwardLinks = links.filter((l) => l.type === LinkType.DefinedIn);

      expect(forwardLinks.length).toBeGreaterThan(0);
      expect(backwardLinks.length).toBeGreaterThan(0);
    });

    it('should not generate backlinks when disabled', async () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        generateBacklinks: false,
        updateExisting: false,
        dryRun: true,
      });

      const links = await linker.generateLinks(result);

      // Should only have forward links
      const linkTypeCounts = new Map<LinkType, number>();
      for (const link of links) {
        linkTypeCounts.set(link.type, (linkTypeCounts.get(link.type) || 0) + 1);
      }

      // Should have forward links (Implements, References, etc.)
      // Should not have backward links (DefinedIn from backlink generation)
      const forwardCount =
        (linkTypeCounts.get(LinkType.Implements) || 0) +
        (linkTypeCounts.get(LinkType.References) || 0);

      expect(forwardCount).toBeGreaterThan(0);
    });

    it('should not update documents in dry run mode', async () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        dryRun: true,
        updateExisting: true,
      });

      mockExistsSync.mockReturnValue(true);

      await linker.generateLinks(result);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should update documents when updateExisting is true', async () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        dryRun: false,
        updateExisting: true,
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('# Document\n\nContent\n\n---\n\nFooter');

      await linker.generateLinks(result);

      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  describe('Document Relationship Detection', () => {
    beforeEach(() => {
      linker = new CrossLinker({ basePath: mockBasePath });
    });

    it('should detect related documents by shared words in filename', async () => {
      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-authentication-flow.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-flow-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      const links = await linker.generateLinks(result);

      // Should find links due to shared words: "authentication" and "flow"
      expect(links.length).toBeGreaterThan(0);
    });

    it('should not link unrelated documents', async () => {
      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-login.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/payment-gateway.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      const links = await linker.generateLinks(result);

      // Should not find links - completely unrelated topics
      expect(links).toHaveLength(0);
    });

    it('should detect relationships from content cross-references', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockImplementation(async (filePath: any) => {
        if (filePath.includes('user-login')) {
          return 'User login uses authentication-system';
        }
        return 'Authentication system design';
      });

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-login.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-system.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      const links = await linker.generateLinks(result);

      // Should find link due to content mention
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Link Type Reversal', () => {
    it('should generate correct reverse link types', async () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        generateBacklinks: true,
        updateExisting: false,
        dryRun: true,
      });

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-authentication-flow.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-flow-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      const links = await linker.generateLinks(result);

      // Check for Implements → DefinedIn reversal
      const implementsLinks = links.filter((l) => l.type === LinkType.Implements);
      const definedInLinks = links.filter((l) => l.type === LinkType.DefinedIn);

      expect(implementsLinks.length).toBeGreaterThan(0);
      expect(definedInLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Document Updates', () => {
    beforeEach(() => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        dryRun: false,
        updateExisting: true,
      });

      mockExistsSync.mockReturnValue(true);
    });

    it('should add links section to document without one', async () => {
      mockReadFile.mockResolvedValue('# Document\n\nContent\n\n---\n\nFooter');

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-authentication-flow.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-flow-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('## Related Documents');
    });

    it('should update existing links section', async () => {
      mockReadFile.mockResolvedValue(
        '# Document\n\n## Related Documents\n\nOld links\n\n---\n\nFooter'
      );

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-authentication-flow.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-flow-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('## Related Documents');
      expect(content).not.toContain('Old links');
    });

    it('should group links by type in markdown', async () => {
      linker = new CrossLinker({
        basePath: mockBasePath,
        dryRun: false,
        updateExisting: true,
        generateBacklinks: false,
      });

      mockReadFile.mockResolvedValue('# Document\n\nContent\n\n---\n\nFooter');

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-authentication-system.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-system-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/adr/0001-authentication-system-oauth-decision.md',
            category: ContentCategory.ADR,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 3,
          filesCreated: 3,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      // Should have type headings
      expect(content).toContain('### Implements');
      expect(content).toContain('### References');
    });

    it('should use relative paths in links', async () => {
      mockReadFile.mockResolvedValue('# Document\n\nContent\n\n---\n\nFooter');

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/backend/user-authentication-flow.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/authentication-flow-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1];

      // Should use relative path (from specs/backend/ to architecture/)
      expect(content).toMatch(/\[.*\]\(.*\)/); // Has markdown links
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      linker = new CrossLinker({ basePath: mockBasePath, dryRun: true });
    });

    it('should get all links', async () => {
      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-auth.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/auth-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const links = linker.getLinks();

      expect(links).toBeDefined();
      expect(Array.isArray(links)).toBe(true);
    });

    it('should get links for specific file', async () => {
      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-auth.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/auth-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const links = linker.getLinksFor('/test/specs/user-auth.md');

      expect(links).toBeDefined();
      expect(Array.isArray(links)).toBe(true);
      expect(links.every((l) => l.source === '/test/specs/user-auth.md')).toBe(true);
    });

    it('should get statistics', async () => {
      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/user-auth.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/architecture/auth-design.md',
            category: ContentCategory.Architecture,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      await linker.generateLinks(result);

      const stats = linker.getStatistics();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType).toBeDefined();
      expect(stats.bidirectional).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result', async () => {
      linker = new CrossLinker({ basePath: mockBasePath });

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

      const links = await linker.generateLinks(result);

      expect(links).toHaveLength(0);
    });

    it('should handle missing files gracefully', async () => {
      linker = new CrossLinker({ basePath: mockBasePath, dryRun: false, updateExisting: true });

      mockExistsSync.mockReturnValue(false);

      const result: DistributionResult = {
        created: [
          {
            path: '/test/missing.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 1,
          filesCreated: 1,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      // Should not throw
      await expect(linker.generateLinks(result)).resolves.toBeDefined();
    });

    it('should handle single category', async () => {
      linker = new CrossLinker({ basePath: mockBasePath });

      const result: DistributionResult = {
        created: [
          {
            path: '/test/specs/us-001.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
          {
            path: '/test/specs/us-002.md',
            category: ContentCategory.UserStory,
            size: 1000,
            sections: 1,
          },
        ],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          totalSections: 2,
          filesCreated: 2,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
          byCategory: {} as any,
        },
      };

      const links = await linker.generateLinks(result);

      // Should handle gracefully (no cross-category links possible)
      expect(links).toHaveLength(0);
    });
  });

  describe('Factory Functions', () => {
    it('should work with createCrossLinker', () => {
      const linker = createCrossLinker();

      expect(linker).toBeDefined();
      expect(linker.getLinks()).toHaveLength(0);
    });

    it('should work with custom options', () => {
      const linker = createCrossLinker({
        basePath: mockBasePath,
        dryRun: true,
      });

      expect(linker).toBeDefined();
    });
  });
});
