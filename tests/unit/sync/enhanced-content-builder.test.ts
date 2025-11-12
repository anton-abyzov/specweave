/**
 * Unit tests for Enhanced Content Builder
 *
 * Tests the building of rich external issue descriptions with full spec content.
 * Following TDD: Tests written first, implementation follows.
 */

import { EnhancedContentBuilder, EnhancedSpecContent, TaskMapping, ArchitectureDoc, SourceLinks } from '../../../src/core/sync/enhanced-content-builder';
import { SpecUserStory, SpecAcceptanceCriterion } from '../../../src/core/spec-content-sync';

// Helper to create test spec with proper structure
function createTestSpec(overrides: Partial<EnhancedSpecContent> = {}): EnhancedSpecContent {
  return {
    identifier: {
      compact: 'SPEC-0031',
      full: 'spec-0031-external-tool-status-sync',
      display: 'SPEC-0031',
      source: 'sequential',
      project: 'default',
      stable: true
    },
    id: 'SPEC-0031',
    title: 'External Tool Status Sync',
    description: 'Test summary',
    project: 'default',
    userStories: [],
    metadata: { priority: 'P1' },
    ...overrides
  };
}

describe('EnhancedContentBuilder', () => {
  let builder: EnhancedContentBuilder;

  beforeEach(() => {
    builder = new EnhancedContentBuilder();
  });

  describe('buildExternalDescription', () => {
    it('should include executive summary', () => {
      const spec = createTestSpec({
        summary: 'Enhance external tool integration with bidirectional status sync.'
      });

      const description = builder.buildExternalDescription(spec);

      expect(description).toContain('## Summary');
      expect(description).toContain('Enhance external tool integration');
    });

    it('should include all user stories with collapsible sections', () => {
      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Rich External Issue Content',
          acceptanceCriteria: [
            {
              id: 'AC-US1-01',
              description: 'External issues show executive summary',
              priority: 'P1',
              testable: true,
              completed: false
            }
          ]
        }
      ];

      const spec = createTestSpec({ userStories });
      const description = builder.buildExternalDescription(spec);

      expect(description).toContain('## User Stories');
      expect(description).toContain('<details>');
      expect(description).toContain('<summary><strong>US-001: Rich External Issue Content</strong></summary>');
      expect(description).toContain('**Acceptance Criteria**:');
      expect(description).toContain('- [ ] **AC-US1-01**: External issues show executive summary (P1, testable)');
    });

    it('should include task links with GitHub issue numbers', () => {
      const taskMapping: TaskMapping = {
        incrementId: '0031-external-tool-status-sync',
        tasks: [
          {
            id: 'T-001',
            title: 'Create Enhanced Content Builder',
            userStories: ['US-001'],
            githubIssue: 123
          },
          {
            id: 'T-002',
            title: 'Create Spec-to-Increment Mapper',
            userStories: ['US-002'],
            githubIssue: 124
          }
        ],
        tasksUrl: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md'
      };

      const spec = createTestSpec({ taskMapping });
      const description = builder.buildExternalDescription(spec);

      expect(description).toContain('## Tasks');
      expect(description).toContain('This epic includes 2 tasks from increment 0031-external-tool-status-sync');
      expect(description).toContain('- **T-001**: Create Enhanced Content Builder (#123)');
      expect(description).toContain('- **T-002**: Create Spec-to-Increment Mapper (#124)');
      expect(description).toContain('See full task list: [tasks.md]');
    });

    it('should include architecture references when available', () => {
      const architectureDocs: ArchitectureDoc[] = [
        { type: 'adr', path: '.specweave/docs/internal/architecture/adr/0031-001-status-mapping.md', title: 'ADR-0031-001: Status Mapping Strategy' },
        { type: 'hld', path: '.specweave/docs/internal/architecture/hld-status-sync.md', title: 'Status Sync Architecture' }
      ];

      const spec = createTestSpec({ architectureDocs });
      const description = builder.buildExternalDescription(spec);

      expect(description).toContain('## Architecture');
      expect(description).toContain('ADR-0031-001: Status Mapping Strategy');
      expect(description).toContain('Status Sync Architecture');
    });

    it('should include source links', () => {
      const sourceLinks: SourceLinks = {
        spec: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/spec-0031-external-tool-status-sync.md',
        plan: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/plan.md',
        tasks: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md'
      };

      const spec = createTestSpec({ sourceLinks });
      const description = builder.buildExternalDescription(spec);

      expect(description).toContain('## Source');
      expect(description).toContain('[spec.md]');
      expect(description).toContain('[plan.md]');
      expect(description).toContain('[tasks.md]');
    });
  });

  describe('buildUserStoriesSection', () => {
    it('should format user stories with collapsible sections', () => {
      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Rich External Issue Content',
          acceptanceCriteria: [
            {
              id: 'AC-US1-01',
              description: 'External issues show executive summary',
              priority: 'P1',
              testable: true,
              completed: false
            },
            {
              id: 'AC-US1-02',
              description: 'External issues show all user stories',
              priority: 'P1',
              testable: true,
              completed: false
            }
          ]
        }
      ];

      const section = builder.buildUserStoriesSection(userStories);

      expect(section).toContain('## User Stories');
      expect(section).toContain('<details>');
      expect(section).toContain('<summary><strong>US-001: Rich External Issue Content</strong></summary>');
      expect(section).toContain('**Acceptance Criteria**:');
      expect(section).toContain('- [ ] **AC-US1-01**:');
      expect(section).toContain('- [ ] **AC-US1-02**:');
    });

    it('should handle user stories without acceptance criteria', () => {
      const userStories: SpecUserStory[] = [
        {
          id: 'US-001',
          title: 'Test Story',
          acceptanceCriteria: []
        }
      ];

      const section = builder.buildUserStoriesSection(userStories);

      expect(section).toContain('US-001: Test Story');
      expect(section).not.toContain('**Acceptance Criteria**:');
    });
  });

  describe('buildTasksSection', () => {
    it('should build tasks section with GitHub issue links', () => {
      const taskMapping: TaskMapping = {
        incrementId: '0031-external-tool-status-sync',
        tasks: [
          {
            id: 'T-001',
            title: 'Create Enhanced Content Builder',
            userStories: ['US-001', 'US-002'],
            githubIssue: 123
          },
          {
            id: 'T-002',
            title: 'Create Spec-to-Increment Mapper',
            userStories: ['US-002'],
            githubIssue: 124
          }
        ],
        tasksUrl: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md'
      };

      const section = builder.buildTasksSection(taskMapping);

      expect(section).toContain('## Tasks');
      expect(section).toContain('This epic includes 2 tasks from increment 0031-external-tool-status-sync');
      expect(section).toContain('- **T-001**: Create Enhanced Content Builder (#123)');
      expect(section).toContain('  - Implements: US-001, US-002');
      expect(section).toContain('- **T-002**: Create Spec-to-Increment Mapper (#124)');
      expect(section).toContain('  - Implements: US-002');
      expect(section).toContain('See full task list: [tasks.md]');
    });

    it('should handle tasks without GitHub issues', () => {
      const taskMapping: TaskMapping = {
        incrementId: '0031-external-tool-status-sync',
        tasks: [
          {
            id: 'T-001',
            title: 'Create Enhanced Content Builder',
            userStories: ['US-001']
          }
        ],
        tasksUrl: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md'
      };

      const section = builder.buildTasksSection(taskMapping);

      expect(section).toContain('- **T-001**: Create Enhanced Content Builder');
      expect(section).not.toContain('(#');
    });
  });

  describe('buildArchitectureSection', () => {
    it('should build architecture references section', () => {
      const architectureDocs: ArchitectureDoc[] = [
        { type: 'adr', path: '.specweave/docs/internal/architecture/adr/0031-001-status-mapping.md', title: 'ADR-0031-001: Status Mapping Strategy' },
        { type: 'hld', path: '.specweave/docs/internal/architecture/hld-status-sync.md', title: 'Status Sync Architecture' },
        { type: 'diagram', path: '.specweave/docs/internal/architecture/diagrams/status-sync-flow.mmd', title: 'Status Sync Flow' }
      ];

      const section = builder.buildArchitectureSection(architectureDocs);

      expect(section).toContain('## Architecture');
      expect(section).toContain('**Architecture Decision Records (ADRs)**:');
      expect(section).toContain('- [ADR-0031-001: Status Mapping Strategy]');
      expect(section).toContain('**High-Level Design (HLD)**:');
      expect(section).toContain('- [Status Sync Architecture]');
      expect(section).toContain('**Diagrams**:');
      expect(section).toContain('- [Status Sync Flow]');
    });

    it('should return empty string when no architecture docs', () => {
      const section = builder.buildArchitectureSection([]);

      expect(section).toBe('');
    });
  });

  describe('buildSummarySection', () => {
    it('should build summary section', () => {
      const spec = createTestSpec({
        summary: 'Enhance SpecWeave\'s external tool integration (GitHub, JIRA, Azure DevOps) with bidirectional status synchronization.'
      });

      const section = builder.buildSummarySection(spec);

      expect(section).toContain('## Summary');
      expect(section).toContain('Enhance SpecWeave\'s external tool integration');
      expect(section).toContain('bidirectional status synchronization');
    });
  });

  describe('buildSourceLinksSection', () => {
    it('should build source links section', () => {
      const sourceLinks: SourceLinks = {
        spec: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/spec-0031-external-tool-status-sync.md',
        plan: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/plan.md',
        tasks: 'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md'
      };

      const section = builder.buildSourceLinksSection(sourceLinks);

      expect(section).toContain('## Source');
      expect(section).toContain('[spec.md]');
      expect(section).toContain('[plan.md]');
      expect(section).toContain('[tasks.md]');
    });
  });
});
