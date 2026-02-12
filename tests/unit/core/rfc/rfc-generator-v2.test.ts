/**
 * Unit tests for rfc-generator-v2.ts
 *
 * Tests the FlexibleRFCGenerator class:
 * - generateRFC: creates RFC file with correct content
 * - buildRFCContent: assembles all sections
 * - groupWorkItems: 6 grouping strategies (by_type, by_parent, by_priority, by_label, flat, custom)
 * - generateHeader: source-specific metadata
 * - generateDetailedDesign: work items with metadata
 * - helper methods: slugify, capitalizeFirst, formatGroupName, getSourceLabel
 *
 * Mocks: fs, path, ProjectStructureDetector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockExistsSync, mockMkdirSync, mockWriteFileSync, mockDetectStructure } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockDetectStructure: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('../../../../src/core/project/project-structure-detector.js', () => {
  class MockProjectStructureDetector {
    detectStructure = mockDetectStructure;
  }
  return {
    ProjectStructureDetector: MockProjectStructureDetector,
  };
});

// Import after mocks
import {
  FlexibleRFCGenerator,
  type FlexibleRFCContent,
  type FlexibleWorkItem,
  type RFCMetadata,
  type RFCSourceMetadata,
} from '../../../../src/core/rfc/rfc-generator-v2.js';
import type { ProjectStructure } from '../../../../src/core/project/project-structure-detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetadata(overrides: Partial<RFCMetadata> = {}): RFCMetadata {
  return {
    incrementId: '0001-auth',
    title: 'Authentication Feature',
    status: 'draft',
    source: 'manual',
    created: '2026-01-15',
    ...overrides,
  };
}

function makeStructure(overrides: Partial<ProjectStructure> = {}): ProjectStructure {
  return {
    source: 'manual',
    hierarchyLevel: 'two_level',
    workItemTypes: {
      parentLevel: 'Feature',
      itemLevel: 'Story',
      subItemLevel: 'Task',
    },
    groupingStrategy: 'by_type',
    ...overrides,
  };
}

function makeWorkItem(overrides: Partial<FlexibleWorkItem> = {}): FlexibleWorkItem {
  return {
    type: 'story',
    id: 'S-001',
    title: 'User login',
    ...overrides,
  };
}

function makeContent(overrides: Partial<FlexibleRFCContent> = {}): FlexibleRFCContent {
  return {
    metadata: makeMetadata(),
    summary: 'A feature for authentication.',
    motivation: 'Users need to log in.',
    workItems: [makeWorkItem()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FlexibleRFCGenerator', () => {
  let generator: FlexibleRFCGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    generator = new FlexibleRFCGenerator('/test/project');
  });

  // =========================================================================
  // generateRFC
  // =========================================================================

  describe('generateRFC', () => {
    it('should create the rfcs directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockDetectStructure.mockResolvedValue(makeStructure());

      await generator.generateRFC(makeContent());

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.specweave/docs/rfcs'),
        { recursive: true }
      );
    });

    it('should not create the rfcs directory if it already exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockDetectStructure.mockResolvedValue(makeStructure());

      await generator.generateRFC(makeContent());

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should write RFC file with correct name', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      const result = await generator.generateRFC(makeContent());

      expect(result).toContain('rfc-0001-auth-authentication-feature.md');
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rfc-0001-auth-authentication-feature.md'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should auto-detect project structure when not provided', async () => {
      const detectedStructure = makeStructure({ source: 'jira' });
      mockDetectStructure.mockResolvedValue(detectedStructure);

      await generator.generateRFC(makeContent());

      expect(mockDetectStructure).toHaveBeenCalled();
    });

    it('should use provided project structure instead of auto-detecting', async () => {
      const providedStructure = makeStructure({ source: 'github' });

      await generator.generateRFC(makeContent({ projectStructure: providedStructure }));

      expect(mockDetectStructure).not.toHaveBeenCalled();
    });

    it('should return the full path to the generated RFC', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      const result = await generator.generateRFC(makeContent());

      expect(result).toMatch(/^\/test\/project\/\.specweave\/docs\/rfcs\/rfc-.*\.md$/);
    });
  });

  // =========================================================================
  // RFC Content generation
  // =========================================================================

  describe('RFC content', () => {
    async function getRFCContent(content?: Partial<FlexibleRFCContent>, structure?: ProjectStructure): Promise<string> {
      const struct = structure || makeStructure();
      mockDetectStructure.mockResolvedValue(struct);

      await generator.generateRFC(makeContent({ projectStructure: struct, ...content }));

      const writeCall = mockWriteFileSync.mock.calls[0];
      return writeCall[1] as string;
    }

    describe('header', () => {
      it('should include title and metadata', async () => {
        const rfcContent = await getRFCContent();

        expect(rfcContent).toContain('# RFC 0001-auth: Authentication Feature');
        expect(rfcContent).toContain('**Status**: Draft');
        expect(rfcContent).toContain('**Created**: 2026-01-15');
      });

      it('should capitalize status correctly', async () => {
        const rfcContent = await getRFCContent({
          metadata: makeMetadata({ status: 'approved' }),
        });

        expect(rfcContent).toContain('**Status**: Approved');
      });

      it('should include parent work item link when source metadata has parent', async () => {
        const sourceMetadata: RFCSourceMetadata = {
          source_type: 'jira',
          parent_type: 'Epic',
          parent_key: 'PROJ-100',
          parent_url: 'https://jira.example.com/PROJ-100',
          parent_title: 'Auth Epic',
        };

        const rfcContent = await getRFCContent({ sourceMetadata });

        expect(rfcContent).toContain('**Epic**: [PROJ-100](https://jira.example.com/PROJ-100) - Auth Epic');
      });

      it('should use structure parentLevel if parent_type is not in source metadata', async () => {
        const sourceMetadata: RFCSourceMetadata = {
          source_type: 'jira',
          parent_key: 'PROJ-100',
          parent_url: 'https://jira.example.com/PROJ-100',
        };

        const structure = makeStructure({ workItemTypes: { parentLevel: 'Milestone', itemLevel: 'Issue' } });
        const rfcContent = await getRFCContent({ sourceMetadata }, structure);

        expect(rfcContent).toContain('**Milestone**: [PROJ-100]');
      });

      it('should fallback to Parent label when no type available', async () => {
        const sourceMetadata: RFCSourceMetadata = {
          source_type: 'github',
          parent_key: 'M-1',
          parent_url: 'https://github.com/m/1',
        };

        const structure = makeStructure({
          workItemTypes: { itemLevel: 'Issue' },
        });
        const rfcContent = await getRFCContent({ sourceMetadata }, structure);

        expect(rfcContent).toContain('**Parent**: [M-1]');
      });

      it('should include repository metadata', async () => {
        const sourceMetadata: RFCSourceMetadata = {
          source_type: 'github',
          repository: 'my-org/my-repo',
        };

        const rfcContent = await getRFCContent({ sourceMetadata });

        expect(rfcContent).toContain('**Repository**: my-org/my-repo');
      });

      it('should include project metadata', async () => {
        const sourceMetadata: RFCSourceMetadata = {
          source_type: 'ado',
          project: 'MyProject',
        };

        const rfcContent = await getRFCContent({ sourceMetadata });

        expect(rfcContent).toContain('**Project**: MyProject');
      });
    });

    describe('summary and motivation', () => {
      it('should include summary section', async () => {
        const rfcContent = await getRFCContent({
          summary: 'This is the summary.',
        });

        expect(rfcContent).toContain('## Summary\n\nThis is the summary.');
      });

      it('should include motivation section', async () => {
        const rfcContent = await getRFCContent({
          motivation: 'This is the motivation.',
        });

        expect(rfcContent).toContain('## Motivation\n\nThis is the motivation.');
      });
    });

    describe('alternatives', () => {
      it('should include alternatives content when provided', async () => {
        const rfcContent = await getRFCContent({
          alternatives: 'We could use OAuth instead.',
        });

        expect(rfcContent).toContain('## Alternatives Considered\n\nWe could use OAuth instead.');
      });

      it('should include placeholder when alternatives not provided', async () => {
        const rfcContent = await getRFCContent({
          alternatives: undefined,
        });

        expect(rfcContent).toContain('(To be filled in during design phase)');
      });
    });

    describe('implementation plan', () => {
      it('should reference the increment', async () => {
        const rfcContent = await getRFCContent();

        expect(rfcContent).toContain('## Implementation Plan');
        expect(rfcContent).toContain('See increment 0001-auth in `.specweave/increments/0001-auth/`');
      });
    });

    describe('detailed design - work items', () => {
      it('should render work item title and description', async () => {
        const rfcContent = await getRFCContent({
          workItems: [makeWorkItem({ title: 'Login flow', description: 'Implement OAuth2 login.' })],
        });

        expect(rfcContent).toContain('#### 1. Login flow');
        expect(rfcContent).toContain('Implement OAuth2 login.');
      });

      it('should render priority metadata', async () => {
        const rfcContent = await getRFCContent({
          workItems: [makeWorkItem({ priority: 'P1' })],
        });

        expect(rfcContent).toContain('**Priority**: P1');
      });

      it('should render parent metadata when not grouping by_parent', async () => {
        const rfcContent = await getRFCContent({
          workItems: [
            makeWorkItem({
              parent: { type: 'Epic', key: 'E-1', title: 'Auth Epic' },
            }),
          ],
        });

        expect(rfcContent).toContain('**Epic**: Auth Epic');
      });

      it('should not render parent metadata when grouping by_parent', async () => {
        const structure = makeStructure({ groupingStrategy: 'by_parent' });
        const rfcContent = await getRFCContent(
          {
            workItems: [
              makeWorkItem({
                parent: { type: 'Epic', key: 'E-1', title: 'Auth Epic' },
              }),
            ],
          },
          structure
        );

        expect(rfcContent).not.toContain('**Epic**: Auth Epic');
      });

      it('should render source link for jira items', async () => {
        const rfcContent = await getRFCContent({
          sourceMetadata: { source_type: 'jira' },
          workItems: [
            makeWorkItem({
              source_key: 'PROJ-123',
              source_url: 'https://jira.example.com/PROJ-123',
            }),
          ],
        });

        expect(rfcContent).toContain('**Jira**: [PROJ-123](https://jira.example.com/PROJ-123)');
      });

      it('should render source link for github items', async () => {
        const rfcContent = await getRFCContent({
          sourceMetadata: { source_type: 'github' },
          workItems: [
            makeWorkItem({
              source_key: '#42',
              source_url: 'https://github.com/org/repo/issues/42',
            }),
          ],
        });

        expect(rfcContent).toContain('**GitHub**: [#42](https://github.com/org/repo/issues/42)');
      });

      it('should render source link for ado items', async () => {
        const rfcContent = await getRFCContent({
          sourceMetadata: { source_type: 'ado' },
          workItems: [
            makeWorkItem({
              source_key: 'WI-500',
              source_url: 'https://dev.azure.com/org/WI-500',
            }),
          ],
        });

        expect(rfcContent).toContain('**ADO**: [WI-500](https://dev.azure.com/org/WI-500)');
      });

      it('should render labels', async () => {
        const rfcContent = await getRFCContent({
          workItems: [makeWorkItem({ labels: ['frontend', 'security'] })],
        });

        expect(rfcContent).toContain('**Labels**: frontend, security');
      });

      it('should use Source as default label for manual source', async () => {
        const rfcContent = await getRFCContent({
          sourceMetadata: { source_type: 'manual' },
          workItems: [
            makeWorkItem({
              source_key: 'REF-1',
              source_url: 'https://example.com/REF-1',
            }),
          ],
        });

        expect(rfcContent).toContain('**Source**: [REF-1]');
      });

      it('should use Source as default when no source type', async () => {
        const rfcContent = await getRFCContent({
          workItems: [
            makeWorkItem({
              source_key: 'REF-1',
              source_url: 'https://example.com/REF-1',
            }),
          ],
        });

        expect(rfcContent).toContain('**Source**: [REF-1]');
      });
    });
  });

  // =========================================================================
  // Grouping strategies
  // =========================================================================

  describe('grouping strategies', () => {
    async function getGroupedContent(
      workItems: FlexibleWorkItem[],
      structure: ProjectStructure
    ): Promise<string> {
      mockDetectStructure.mockResolvedValue(structure);

      await generator.generateRFC(makeContent({ workItems, projectStructure: structure }));

      return mockWriteFileSync.mock.calls[0][1] as string;
    }

    describe('by_type', () => {
      it('should group work items by their type', async () => {
        const items = [
          makeWorkItem({ type: 'story', id: 'S-1', title: 'Story A' }),
          makeWorkItem({ type: 'bug', id: 'B-1', title: 'Bug A' }),
          makeWorkItem({ type: 'story', id: 'S-2', title: 'Story B' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_type' }));

        expect(content).toContain('### User Stories');
        expect(content).toContain('### Bug Fixes');
      });

      it('should use predefined display names for known types', async () => {
        const items = [
          makeWorkItem({ type: 'task', id: 'T-1', title: 'Task A' }),
          makeWorkItem({ type: 'issue', id: 'I-1', title: 'Issue A' }),
          makeWorkItem({ type: 'feature', id: 'F-1', title: 'Feature A' }),
          makeWorkItem({ type: 'subtask', id: 'ST-1', title: 'SubTask A' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_type' }));

        expect(content).toContain('### Technical Tasks');
        expect(content).toContain('### Issues');
        expect(content).toContain('### Features');
        expect(content).toContain('### Sub-tasks');
      });

      it('should format unknown types as title case', async () => {
        const items = [
          makeWorkItem({ type: 'spike', id: 'SP-1', title: 'Research spike' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_type' }));

        expect(content).toContain('### Spike');
      });

      it('should handle user story type', async () => {
        const items = [
          makeWorkItem({ type: 'user story', id: 'US-1', title: 'User Story A' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_type' }));

        expect(content).toContain('### User Stories');
      });

      it('should handle sub-task type with hyphen', async () => {
        const items = [
          makeWorkItem({ type: 'sub-task', id: 'ST-1', title: 'Sub task A' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_type' }));

        expect(content).toContain('### Sub-tasks');
      });

      it('should preserve type order: stories first, then bugs, then tasks', async () => {
        const items = [
          makeWorkItem({ type: 'task', id: 'T-1', title: 'Task A' }),
          makeWorkItem({ type: 'bug', id: 'B-1', title: 'Bug A' }),
          makeWorkItem({ type: 'story', id: 'S-1', title: 'Story A' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_type' }));

        const storyPos = content.indexOf('### User Stories');
        const bugPos = content.indexOf('### Bug Fixes');
        const taskPos = content.indexOf('### Technical Tasks');

        expect(storyPos).toBeLessThan(bugPos);
        expect(bugPos).toBeLessThan(taskPos);
      });
    });

    describe('by_parent', () => {
      it('should group items under their parent', async () => {
        const items = [
          makeWorkItem({
            id: 'S-1',
            title: 'Story A',
            parent: { type: 'Epic', key: 'E-1', title: 'Auth Epic' },
          }),
          makeWorkItem({
            id: 'S-2',
            title: 'Story B',
            parent: { type: 'Epic', key: 'E-1', title: 'Auth Epic' },
          }),
          makeWorkItem({
            id: 'S-3',
            title: 'Story C',
            parent: { type: 'Epic', key: 'E-2', title: 'Payment Epic' },
          }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_parent' }));

        expect(content).toContain('### Epic: Auth Epic');
        expect(content).toContain('### Epic: Payment Epic');
      });

      it('should put items without parent in Other Work Items', async () => {
        const items = [
          makeWorkItem({
            id: 'S-1',
            title: 'Story A',
            parent: { type: 'Epic', key: 'E-1', title: 'Auth Epic' },
          }),
          makeWorkItem({ id: 'S-2', title: 'Orphan Story' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_parent' }));

        expect(content).toContain('### Other Work Items');
      });

      it('should handle all items without parents', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A' }),
          makeWorkItem({ id: 'S-2', title: 'Story B' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_parent' }));

        expect(content).toContain('### Other Work Items');
      });

      it('should use structure parentLevel when item parent type is missing', async () => {
        const items = [
          makeWorkItem({
            id: 'S-1',
            title: 'Story A',
            parent: { type: '', key: 'M-1', title: 'Milestone 1' },
          }),
        ];

        const structure = makeStructure({
          groupingStrategy: 'by_parent',
          workItemTypes: { parentLevel: 'Milestone', itemLevel: 'Issue' },
        });

        const content = await getGroupedContent(items, structure);

        // Since parent type is empty string (falsy), it should use structure's parentLevel
        expect(content).toContain('Milestone 1');
      });
    });

    describe('by_priority', () => {
      it('should group items by priority', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A', priority: 'P1' }),
          makeWorkItem({ id: 'S-2', title: 'Story B', priority: 'P2' }),
          makeWorkItem({ id: 'S-3', title: 'Story C', priority: 'P1' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_priority' }));

        expect(content).toContain('### Priority: P1');
        expect(content).toContain('### Priority: P2');
      });

      it('should put items without priority in None group', async () => {
        const items = [makeWorkItem({ id: 'S-1', title: 'Story A' })];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_priority' }));

        expect(content).toContain('### Priority: None');
      });

      it('should order known priorities correctly', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Low', priority: 'Low' }),
          makeWorkItem({ id: 'S-2', title: 'High', priority: 'High' }),
          makeWorkItem({ id: 'S-3', title: 'Medium', priority: 'Medium' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_priority' }));

        const highPos = content.indexOf('### Priority: High');
        const medPos = content.indexOf('### Priority: Medium');
        const lowPos = content.indexOf('### Priority: Low');

        expect(highPos).toBeLessThan(medPos);
        expect(medPos).toBeLessThan(lowPos);
      });

      it('should include non-standard priorities after standard ones', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A', priority: 'P1' }),
          makeWorkItem({ id: 'S-2', title: 'Story B', priority: 'Urgent' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_priority' }));

        const p1Pos = content.indexOf('### Priority: P1');
        const urgentPos = content.indexOf('### Priority: Urgent');

        expect(p1Pos).toBeLessThan(urgentPos);
      });
    });

    describe('by_label', () => {
      it('should group items by their labels', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A', labels: ['frontend'] }),
          makeWorkItem({ id: 'S-2', title: 'Story B', labels: ['backend'] }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_label' }));

        expect(content).toContain('### Label: frontend');
        expect(content).toContain('### Label: backend');
      });

      it('should put items without labels in Unlabeled Items', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A', labels: ['frontend'] }),
          makeWorkItem({ id: 'S-2', title: 'Story B' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_label' }));

        expect(content).toContain('### Unlabeled Items');
      });

      it('should duplicate items with multiple labels into each group', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Multi-label Story', labels: ['frontend', 'security'] }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_label' }));

        expect(content).toContain('### Label: frontend');
        expect(content).toContain('### Label: security');
      });

      it('should handle all items without labels', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A' }),
          makeWorkItem({ id: 'S-2', title: 'Story B', labels: [] }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'by_label' }));

        expect(content).toContain('### Unlabeled Items');
      });
    });

    describe('flat', () => {
      it('should place all items in a single Work Items group', async () => {
        const items = [
          makeWorkItem({ id: 'S-1', title: 'Story A', type: 'story' }),
          makeWorkItem({ id: 'B-1', title: 'Bug A', type: 'bug' }),
        ];

        const content = await getGroupedContent(items, makeStructure({ groupingStrategy: 'flat' }));

        expect(content).toContain('### Work Items');
      });
    });

    describe('custom', () => {
      it('should use custom grouping function when provided', async () => {
        const customGrouping = (items: any[]) => ({
          'team-alpha': items.filter((_: any, i: number) => i === 0),
          'team-beta': items.filter((_: any, i: number) => i === 1),
        });

        const structure = makeStructure({
          groupingStrategy: 'custom',
          customGrouping,
        });

        const items = [
          makeWorkItem({ id: 'S-1', title: 'Alpha Story' }),
          makeWorkItem({ id: 'S-2', title: 'Beta Story' }),
        ];

        const content = await getGroupedContent(items, structure);

        expect(content).toContain('### Team Alpha');
        expect(content).toContain('### Team Beta');
      });

      it('should fallback to by_type when custom strategy has no grouping function', async () => {
        const structure = makeStructure({
          groupingStrategy: 'custom',
        });

        const items = [
          makeWorkItem({ type: 'story', id: 'S-1', title: 'Story A' }),
          makeWorkItem({ type: 'bug', id: 'B-1', title: 'Bug A' }),
        ];

        const content = await getGroupedContent(items, structure);

        expect(content).toContain('### User Stories');
        expect(content).toContain('### Bug Fixes');
      });
    });

    describe('default/unknown', () => {
      it('should fallback to by_type for unknown grouping strategy', async () => {
        const structure = makeStructure({
          groupingStrategy: 'unknown_strategy' as any,
        });

        const items = [
          makeWorkItem({ type: 'story', id: 'S-1', title: 'Story A' }),
        ];

        const content = await getGroupedContent(items, structure);

        expect(content).toContain('### User Stories');
      });
    });
  });

  // =========================================================================
  // File name generation
  // =========================================================================

  describe('RFC file name generation', () => {
    it('should slugify the title', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      await generator.generateRFC(
        makeContent({ metadata: makeMetadata({ title: 'Add User Auth & 2FA!' }) })
      );

      const writePath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writePath).toContain('rfc-0001-auth-add-user-auth-2fa.md');
    });

    it('should truncate long titles to 50 chars', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());
      const longTitle = 'A'.repeat(100);

      await generator.generateRFC(
        makeContent({ metadata: makeMetadata({ title: longTitle }) })
      );

      const writePath = mockWriteFileSync.mock.calls[0][0] as string;
      const fileName = writePath.split('/').pop()!;
      // rfc-0001-auth-{slug}.md  => slug is max 50 chars
      const slug = fileName.replace('rfc-0001-auth-', '').replace('.md', '');
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('should handle special characters in title', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      await generator.generateRFC(
        makeContent({ metadata: makeMetadata({ title: 'Test @#$ Feature' }) })
      );

      const writePath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writePath).toContain('rfc-0001-auth-test-feature.md');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should handle empty work items array', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      await generator.generateRFC(makeContent({ workItems: [] }));

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('## Detailed Design');
    });

    it('should handle work items without optional fields', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      const minimalItem: FlexibleWorkItem = {
        type: 'story',
        id: 'S-1',
        title: 'Minimal',
      };

      await generator.generateRFC(makeContent({ workItems: [minimalItem] }));

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('#### 1. Minimal');
      // Should not contain metadata line since no priority, parent, source, or labels
    });

    it('should handle default constructor with process.cwd()', () => {
      const defaultGenerator = new FlexibleRFCGenerator();
      expect(defaultGenerator).toBeInstanceOf(FlexibleRFCGenerator);
    });

    it('should handle metadata with all statuses', async () => {
      const statuses: Array<'draft' | 'review' | 'approved' | 'deprecated'> = [
        'draft',
        'review',
        'approved',
        'deprecated',
      ];

      for (const status of statuses) {
        vi.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
        mockDetectStructure.mockResolvedValue(makeStructure());

        await generator.generateRFC(makeContent({ metadata: makeMetadata({ status }) }));

        const content = mockWriteFileSync.mock.calls[0][1] as string;
        const expected = status.charAt(0).toUpperCase() + status.slice(1);
        expect(content).toContain(`**Status**: ${expected}`);
      }
    });

    it('should render multiple metadata items joined with pipe', async () => {
      mockDetectStructure.mockResolvedValue(makeStructure());

      const item = makeWorkItem({
        priority: 'P1',
        source_key: 'JIRA-1',
        source_url: 'https://jira.example.com/JIRA-1',
        labels: ['frontend'],
      });

      await generator.generateRFC(
        makeContent({
          workItems: [item],
          sourceMetadata: { source_type: 'jira' },
        })
      );

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain(' | ');
    });
  });
});
