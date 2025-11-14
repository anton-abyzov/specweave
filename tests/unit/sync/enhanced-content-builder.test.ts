import { EnhancedContentBuilder } from '../../../src/core/sync/enhanced-content-builder';
import { SpecContent, UserStory, TaskLink } from '../../../src/core/sync/types';

describe('EnhancedContentBuilder', () => {
  let builder: EnhancedContentBuilder;

  beforeEach(() => {
    builder = new EnhancedContentBuilder();
  });

  describe('buildExternalDescription', () => {
    it('should build complete external description with all sections', () => {
      const spec: SpecContent = {
        id: 'SPEC-001',
        title: 'User Authentication',
        summary: 'Implement secure user authentication with JWT tokens',
        userStories: [
          {
            id: 'US-001',
            title: 'User Login',
            description: 'As a user, I want to log in with email and password',
            acceptanceCriteria: [
              { id: 'AC-US1-01', description: 'User can login with valid credentials', priority: 'P1' },
              { id: 'AC-US1-02', description: 'System shows error for invalid credentials', priority: 'P1' }
            ]
          }
        ],
        tasks: [
          {
            id: 'T-001',
            title: 'Implement login endpoint',
            githubIssue: 42,
            userStoryIds: ['US-001']
          }
        ],
        architectureDocs: ['architecture/auth-flow.md'],
        sourceLinks: {
          spec: '.specweave/increments/0001/spec.md',
          plan: '.specweave/increments/0001/plan.md',
          tasks: '.specweave/increments/0001/tasks.md'
        }
      };

      const result = builder.buildExternalDescription(spec);

      // Verify all sections are present
      expect(result).toContain('## Summary');
      expect(result).toContain(spec.summary);
      expect(result).toContain('## User Stories');
      expect(result).toContain('US-001');
      expect(result).toContain('## Tasks');
      expect(result).toContain('T-001');
      expect(result).toContain('## Architecture');
      expect(result).toContain('## Source Files');
    });

    it('should handle spec without architecture docs', () => {
      const spec: SpecContent = {
        id: 'SPEC-001',
        title: 'Simple Feature',
        summary: 'A simple feature',
        userStories: [],
        tasks: [],
        architectureDocs: [],
        sourceLinks: {
          spec: 'spec.md',
          plan: 'plan.md',
          tasks: 'tasks.md'
        }
      };

      const result = builder.buildExternalDescription(spec);

      expect(result).toContain('## Summary');
      expect(result).not.toContain('## Architecture');
    });
  });

  describe('buildUserStoriesSection', () => {
    it('should format user stories with collapsible details', () => {
      const userStories: UserStory[] = [
        {
          id: 'US-001',
          title: 'User Login',
          description: 'As a user, I want to log in',
          acceptanceCriteria: [
            { id: 'AC-US1-01', description: 'Login with valid credentials', priority: 'P1' },
            { id: 'AC-US1-02', description: 'Error for invalid credentials', priority: 'P1' }
          ]
        }
      ];

      const result = builder.buildUserStoriesSection(userStories);

      // Should use GitHub collapsible format
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>');
      expect(result).toContain('US-001: User Login');
      expect(result).toContain('AC-US1-01');
      expect(result).toContain('AC-US1-02');
      expect(result).toContain('P1');
    });

    it('should handle empty user stories array', () => {
      const result = builder.buildUserStoriesSection([]);

      expect(result).toContain('No user stories defined');
    });
  });

  describe('buildTasksSection', () => {
    it('should build tasks section with GitHub issue links', () => {
      const tasks: TaskLink[] = [
        {
          id: 'T-001',
          title: 'Implement feature',
          githubIssue: 42,
          userStoryIds: ['US-001']
        }
      ];

      const result = builder.buildTasksSection(tasks, 'anton-abyzov', 'specweave');

      expect(result).toContain('T-001');
      expect(result).toContain('#42');
      expect(result).toContain('US-001');
    });
  });
});
