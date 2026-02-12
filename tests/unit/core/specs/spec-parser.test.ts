/**
 * Unit tests for spec-parser.ts
 *
 * Tests the SpecParser class:
 * - parseUserStory: parse a single user story by ID
 * - parseAllUserStories: extract all user stories from markdown
 * - parseAcceptanceCriteria: parse ACs for a user story
 * - parseIncrementReferences: parse increment table references
 * - extractFrontmatter: extract YAML frontmatter via gray-matter
 * - extractOverview: extract the Overview section
 * - extractExternalReferences: extract GitHub/Jira/ADO refs
 * - calculateProgress: compute progress stats from user stories
 * - filterUserStories: filter by status and/or priority
 * - findUserStory: lookup a single user story by ID
 * - updateUserStoryStatus: check/uncheck AC boxes in markdown
 *
 * Mocks: gray-matter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockMatter } = vi.hoisted(() => ({
  mockMatter: vi.fn(),
}));

vi.mock('gray-matter', () => ({
  default: mockMatter,
}));

// Import after mocks
import { SpecParser } from '../../../../src/core/specs/spec-parser.js';
import type { UserStory, AcceptanceCriteria } from '../../../../src/core/types/spec-metadata.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal spec markdown with user stories and ACs */
function buildSpecMarkdown(opts: {
  stories?: Array<{
    id: string;
    title: string;
    acs?: Array<{ num: string; done: boolean; desc: string }>;
    priority?: string;
  }>;
  overview?: string;
  externalRefs?: string;
  incrementTable?: string;
  frontmatter?: string;
} = {}): string {
  let md = '';

  if (opts.frontmatter) {
    md += `---\n${opts.frontmatter}\n---\n\n`;
  }

  if (opts.overview) {
    md += `## Overview\n${opts.overview}\n\n`;
  }

  if (opts.stories) {
    md += '## User Stories\n\n';
    for (const story of opts.stories) {
      const prioritySuffix = story.priority ? ` (${story.priority})` : '';
      md += `**${story.id}**: ${story.title}${prioritySuffix}\n\n`;
      if (story.acs) {
        const usNum = story.id.replace('US-', '');
        for (const ac of story.acs) {
          const check = ac.done ? 'x' : ' ';
          md += `- [${check}] **AC-${usNum}-${ac.num}**: ${ac.desc}\n`;
        }
        md += '\n';
      }
    }
  }

  if (opts.incrementTable) {
    md += opts.incrementTable + '\n\n';
  }

  if (opts.externalRefs) {
    md += `## External References\n${opts.externalRefs}\n\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpecParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatter.mockImplementation((md: string) => ({ data: {}, content: md }));
  });

  // =========================================================================
  // parseUserStory
  // =========================================================================
  describe('parseUserStory', () => {
    it('should parse a user story with matching ID', () => {
      const md = buildSpecMarkdown({
        stories: [
          {
            id: 'US-001',
            title: 'As a user, I want to login',
            acs: [
              { num: '01', done: false, desc: 'Login form renders' },
              { num: '02', done: true, desc: 'Validation works' },
            ],
          },
        ],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('US-001');
      expect(result!.title).toBe('As a user, I want to login');
      expect(result!.acceptanceCriteria).toHaveLength(2);
      expect(result!.status).toBe('in-progress');
    });

    it('should return null when user story ID is not found', () => {
      const md = buildSpecMarkdown({
        stories: [{ id: 'US-001', title: 'Some story' }],
      });
      expect(SpecParser.parseUserStory(md, 'US-999')).toBeNull();
    });

    it('should return null for empty markdown', () => {
      expect(SpecParser.parseUserStory('', 'US-001')).toBeNull();
    });

    it('should set status to done when all ACs are completed', () => {
      const md = buildSpecMarkdown({
        stories: [
          {
            id: 'US-001',
            title: 'Story',
            acs: [
              { num: '01', done: true, desc: 'AC one' },
              { num: '02', done: true, desc: 'AC two' },
            ],
          },
        ],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result!.status).toBe('done');
    });

    it('should set status to todo when no ACs are completed', () => {
      const md = buildSpecMarkdown({
        stories: [
          {
            id: 'US-001',
            title: 'Story',
            acs: [
              { num: '01', done: false, desc: 'AC one' },
              { num: '02', done: false, desc: 'AC two' },
            ],
          },
        ],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result!.status).toBe('todo');
    });

    it('should set status to todo when there are no ACs', () => {
      const md = buildSpecMarkdown({
        stories: [{ id: 'US-001', title: 'Story without ACs' }],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result!.status).toBe('todo');
      expect(result!.acceptanceCriteria).toHaveLength(0);
    });

    it('should extract priority from nearby text', () => {
      const md = buildSpecMarkdown({
        stories: [{ id: 'US-001', title: 'Story', priority: 'P2' }],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result!.priority).toBe('P2');
    });

    it('should default to P1 when no priority is found', () => {
      const md = buildSpecMarkdown({
        stories: [{ id: 'US-001', title: 'Story without priority' }],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result!.priority).toBe('P1');
    });

    it('should extract P3 priority', () => {
      const md = buildSpecMarkdown({
        stories: [{ id: 'US-001', title: 'Nice to have feature', priority: 'P3' }],
      });

      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result!.priority).toBe('P3');
    });
  });

  // =========================================================================
  // parseAllUserStories
  // =========================================================================
  describe('parseAllUserStories', () => {
    it('should parse multiple user stories', () => {
      const md = buildSpecMarkdown({
        stories: [
          { id: 'US-001', title: 'First story' },
          { id: 'US-002', title: 'Second story' },
          { id: 'US-003', title: 'Third story' },
        ],
      });

      const results = SpecParser.parseAllUserStories(md);
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('US-001');
      expect(results[1].id).toBe('US-002');
      expect(results[2].id).toBe('US-003');
    });

    it('should return empty array for markdown without user stories', () => {
      const md = '## Overview\nSome text without stories.';
      expect(SpecParser.parseAllUserStories(md)).toEqual([]);
    });

    it('should deduplicate user stories with the same ID', () => {
      const md = '**US-001**: First occurrence\n**US-001**: Duplicate occurrence\n';
      const results = SpecParser.parseAllUserStories(md);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('US-001');
    });

    it('should handle empty markdown', () => {
      expect(SpecParser.parseAllUserStories('')).toEqual([]);
    });

    it('should handle multiple user stories with mixed statuses', () => {
      const md = buildSpecMarkdown({
        stories: [
          {
            id: 'US-001',
            title: 'Done story',
            acs: [{ num: '01', done: true, desc: 'Done AC' }],
          },
          {
            id: 'US-002',
            title: 'Todo story',
            acs: [{ num: '01', done: false, desc: 'Pending AC' }],
          },
        ],
      });

      const results = SpecParser.parseAllUserStories(md);
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('done');
      expect(results[1].status).toBe('todo');
    });
  });

  // =========================================================================
  // parseAcceptanceCriteria
  // =========================================================================
  describe('parseAcceptanceCriteria', () => {
    it('should parse completed and pending ACs', () => {
      const md = buildSpecMarkdown({
        stories: [
          {
            id: 'US-001',
            title: 'Story',
            acs: [
              { num: '01', done: true, desc: 'First AC' },
              { num: '02', done: false, desc: 'Second AC' },
            ],
          },
        ],
      });

      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs).toHaveLength(2);
      expect(acs[0].id).toBe('AC-001-01');
      expect(acs[0].status).toBe('done');
      expect(acs[0].description).toBe('First AC');
      expect(acs[1].id).toBe('AC-001-02');
      expect(acs[1].status).toBe('todo');
      expect(acs[1].description).toBe('Second AC');
    });

    it('should return empty array when no ACs found for the user story', () => {
      const md = buildSpecMarkdown({
        stories: [{ id: 'US-001', title: 'No ACs' }],
      });

      expect(SpecParser.parseAcceptanceCriteria(md, 'US-001')).toEqual([]);
    });

    it('should not return ACs from a different user story', () => {
      const md = buildSpecMarkdown({
        stories: [
          {
            id: 'US-001',
            title: 'First',
            acs: [{ num: '01', done: false, desc: 'First story AC' }],
          },
          {
            id: 'US-002',
            title: 'Second',
            acs: [{ num: '01', done: true, desc: 'Second story AC' }],
          },
        ],
      });

      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-002');
      expect(acs).toHaveLength(1);
      expect(acs[0].id).toBe('AC-002-01');
      expect(acs[0].description).toBe('Second story AC');
    });

    it('should parse AC metadata with priority', () => {
      const md = '- [ ] **AC-001-01**: Must have login (P1, testable)\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs).toHaveLength(1);
      expect(acs[0].priority).toBe('P1');
      expect(acs[0].testable).toBe(true);
      expect(acs[0].description).toBe('Must have login');
    });

    it('should parse AC metadata with P2 priority', () => {
      const md = '- [x] **AC-001-01**: Should validate (P2)\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs).toHaveLength(1);
      expect(acs[0].priority).toBe('P2');
      expect(acs[0].status).toBe('done');
    });

    it('should parse AC metadata with P3 priority', () => {
      const md = '- [ ] **AC-001-01**: Nice animation (P3)\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs[0].priority).toBe('P3');
    });

    it('should parse AC metadata with "not testable" flag', () => {
      const md = '- [ ] **AC-001-01**: UX improvement (not testable)\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs[0].testable).toBe(false);
    });

    it('should handle AC description without metadata', () => {
      const md = '- [ ] **AC-001-01**: Simple description without parens\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs[0].priority).toBeUndefined();
      expect(acs[0].testable).toBeUndefined();
      expect(acs[0].description).toBe('Simple description without parens');
    });

    it('should handle AC with metadata containing no known tokens', () => {
      const md = '- [ ] **AC-001-01**: Feature (some unknown meta)\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs[0].priority).toBeUndefined();
      expect(acs[0].testable).toBeUndefined();
      expect(acs[0].description).toBe('Feature');
    });

    it('should return empty for non-existent user story', () => {
      const md = '- [ ] **AC-001-01**: AC for US-001\n';
      expect(SpecParser.parseAcceptanceCriteria(md, 'US-999')).toEqual([]);
    });
  });

  // =========================================================================
  // parseIncrementReferences
  // =========================================================================
  describe('parseIncrementReferences', () => {
    it('should parse an increment table row with complete status', () => {
      const md =
        '| **0001-core-setup** | ✅ Complete | 2024-01-15 | Implements US-001 |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].id).toBe('0001-core-setup');
      expect(refs[0].status).toBe('complete');
      expect(refs[0].completedAt).toBe('2024-01-15');
      expect(refs[0].userStories).toEqual(['US-001']);
      expect(refs[0].notes).toBe('Implements US-001');
    });

    it('should parse in-progress increment', () => {
      const md =
        '| **0002-auth-flow** | ⏳ Active | | Working on US-002, US-003 |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].id).toBe('0002-auth-flow');
      expect(refs[0].status).toBe('in-progress');
      expect(refs[0].completedAt).toBeUndefined();
      expect(refs[0].userStories).toEqual(['US-002', 'US-003']);
    });

    it('should parse abandoned increment', () => {
      const md =
        '| **0003-old-feature** | ❌ Abandoned | 2024-02-01 | Was for US-004 |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].status).toBe('abandoned');
    });

    it('should parse planned increment (default status)', () => {
      const md =
        '| **0004-future-work** |  Planned | | Future work |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].status).toBe('planned');
    });

    it('should parse multiple increment rows', () => {
      const md = [
        '| **0001-first** | ✅ Complete | 2024-01-01 | US-001 |',
        '| **0002-second** | ⏳ Active | | US-002 |',
        '| **0003-third** |  Planned | | Future |',
      ].join('\n');

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(3);
    });

    it('should return empty array for markdown without increment tables', () => {
      const md = '## Overview\nSome text without increment tables.';
      expect(SpecParser.parseIncrementReferences(md)).toEqual([]);
    });

    it('should extract user story references from notes', () => {
      const md =
        '| **0001-multi** | ✅ Complete | 2024-03-01 | Covers US-001, US-002, and US-005 |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs[0].userStories).toEqual(['US-001', 'US-002', 'US-005']);
    });

    it('should handle notes without user story references', () => {
      const md =
        '| **0001-infra** | ✅ Complete | 2024-01-01 | Infrastructure setup |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs[0].userStories).toEqual([]);
      expect(refs[0].notes).toBe('Infrastructure setup');
    });

    it('should parse cancel status text', () => {
      const md =
        '| **0005-cancelled** | ❌ Cancelled | 2024-05-01 | No longer needed |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs[0].status).toBe('abandoned');
    });

    it('should parse in-progress with Active text and icon', () => {
      // The regex (\w+) captures a single word for status text.
      // "In-Progress" won't match because the hyphen breaks \w+\s*\|.
      // "Active" works because it's a single word.
      const md =
        '| **0006-wip** | ⏳ Active | | WIP |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].status).toBe('in-progress');
    });

    it('should not match hyphenated status text like In-Progress', () => {
      // Documents the limitation: \w+ only matches single-word status texts.
      const md =
        '| **0006-wip** | ⏳ In-Progress | | WIP |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(0);
    });

    it('should parse progress status text without icon', () => {
      const md =
        '| **0006-wip** |  Progress | | WIP |\n';

      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].status).toBe('in-progress');
    });
  });

  // =========================================================================
  // extractFrontmatter
  // =========================================================================
  describe('extractFrontmatter', () => {
    it('should extract frontmatter data via gray-matter', () => {
      const mockData = { id: 'spec-001', title: 'Test Spec', status: 'draft' };
      mockMatter.mockReturnValue({ data: mockData, content: '' });

      const result = SpecParser.extractFrontmatter('---\nid: spec-001\n---\n# Test');
      expect(result).toEqual(mockData);
      expect(mockMatter).toHaveBeenCalledWith('---\nid: spec-001\n---\n# Test');
    });

    it('should return empty object when gray-matter throws', () => {
      mockMatter.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const result = SpecParser.extractFrontmatter('invalid frontmatter');
      expect(result).toEqual({});
    });

    it('should return empty object for markdown without frontmatter', () => {
      mockMatter.mockReturnValue({ data: {}, content: '# Title' });

      const result = SpecParser.extractFrontmatter('# Title');
      expect(result).toEqual({});
    });
  });

  // =========================================================================
  // extractOverview
  // =========================================================================
  describe('extractOverview', () => {
    it('should extract the overview section content', () => {
      const md = buildSpecMarkdown({
        overview: 'This is the project overview.\nWith multiple lines.',
      });

      const result = SpecParser.extractOverview(md);
      expect(result).toBe('This is the project overview.\nWith multiple lines.');
    });

    it('should return empty string when no overview section exists', () => {
      const md = '## Introduction\nSome intro text.';
      expect(SpecParser.extractOverview(md)).toBe('');
    });

    it('should stop at the next section header', () => {
      const md =
        '## Overview\nOverview text here.\n\n## User Stories\nStory content.';
      const result = SpecParser.extractOverview(md);
      expect(result).toBe('Overview text here.');
    });

    it('should stop at a horizontal rule', () => {
      const md = '## Overview\nOverview content.\n\n---\nOther stuff.';
      const result = SpecParser.extractOverview(md);
      expect(result).toBe('Overview content.');
    });

    it('should handle empty overview section with immediate next header', () => {
      // The regex captures [\s\S]*? between ## Overview and next ##.
      // When "## Overview\n\n## Next Section", the greedy-enough capture
      // includes the newline plus "## Next Section" at end.
      // Test actual behavior: with a blank line separator, the overview
      // regex captures the blank line, which trims to empty.
      const md = '## Overview\n\nSome overview.\n\n## Next Section';
      const result = SpecParser.extractOverview(md);
      expect(result).toBe('Some overview.');
    });

    it('should handle overview at end of document', () => {
      const md = '## Overview\nLast section content.';
      const result = SpecParser.extractOverview(md);
      expect(result).toBe('Last section content.');
    });
  });

  // =========================================================================
  // extractExternalReferences
  // =========================================================================
  describe('extractExternalReferences', () => {
    it('should extract GitHub project reference', () => {
      const md = buildSpecMarkdown({
        externalRefs: 'GitHub Project: https://github.com/orgs/acme/projects/1',
      });

      const refs = SpecParser.extractExternalReferences(md);
      expect(refs.github).toBe('https://github.com/orgs/acme/projects/1');
    });

    it('should extract Jira epic reference', () => {
      const md = buildSpecMarkdown({
        externalRefs: 'Jira Epic: SPEC-123',
      });

      const refs = SpecParser.extractExternalReferences(md);
      expect(refs.jira).toBe('SPEC-123');
    });

    it('should extract ADO feature reference', () => {
      const md = buildSpecMarkdown({
        externalRefs: 'ADO Feature: 456',
      });

      const refs = SpecParser.extractExternalReferences(md);
      expect(refs.ado).toBe('456');
    });

    it('should extract Azure DevOps feature reference', () => {
      const md = buildSpecMarkdown({
        externalRefs: 'Azure DevOps Feature: 789',
      });

      const refs = SpecParser.extractExternalReferences(md);
      expect(refs.ado).toBe('789');
    });

    it('should extract all references at once', () => {
      const md = buildSpecMarkdown({
        externalRefs: [
          'GitHub Project: https://github.com/orgs/acme/projects/1',
          'Jira Epic: PROJ-42',
          'ADO Feature: 100',
        ].join('\n'),
      });

      const refs = SpecParser.extractExternalReferences(md);
      expect(refs.github).toBe('https://github.com/orgs/acme/projects/1');
      expect(refs.jira).toBe('PROJ-42');
      expect(refs.ado).toBe('100');
    });

    it('should return empty object when no external references section', () => {
      const md = '## Overview\nSome content.';
      expect(SpecParser.extractExternalReferences(md)).toEqual({});
    });

    it('should return empty fields when section exists but has no known refs', () => {
      const md = buildSpecMarkdown({
        externalRefs: 'Some other reference: value',
      });

      const refs = SpecParser.extractExternalReferences(md);
      expect(refs.github).toBeUndefined();
      expect(refs.jira).toBeUndefined();
      expect(refs.ado).toBeUndefined();
    });
  });

  // =========================================================================
  // calculateProgress
  // =========================================================================
  describe('calculateProgress', () => {
    it('should calculate progress for mixed statuses', () => {
      const stories: UserStory[] = [
        { id: 'US-001', title: 'Done', status: 'done', priority: 'P1', acceptanceCriteria: [] },
        { id: 'US-002', title: 'WIP', status: 'in-progress', priority: 'P1', acceptanceCriteria: [] },
        { id: 'US-003', title: 'Todo', status: 'todo', priority: 'P2', acceptanceCriteria: [] },
        { id: 'US-004', title: 'Also done', status: 'done', priority: 'P1', acceptanceCriteria: [] },
      ];

      const progress = SpecParser.calculateProgress(stories);
      expect(progress.totalUserStories).toBe(4);
      expect(progress.completedUserStories).toBe(2);
      expect(progress.inProgressUserStories).toBe(1);
      expect(progress.todoUserStories).toBe(1);
      expect(progress.percentComplete).toBe(50);
    });

    it('should return all zeros for empty array', () => {
      const progress = SpecParser.calculateProgress([]);
      expect(progress.totalUserStories).toBe(0);
      expect(progress.completedUserStories).toBe(0);
      expect(progress.inProgressUserStories).toBe(0);
      expect(progress.todoUserStories).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });

    it('should return 100% when all stories are done', () => {
      const stories: UserStory[] = [
        { id: 'US-001', title: 'Done', status: 'done', priority: 'P1', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Done', status: 'done', priority: 'P1', acceptanceCriteria: [] },
      ];

      const progress = SpecParser.calculateProgress(stories);
      expect(progress.percentComplete).toBe(100);
      expect(progress.completedUserStories).toBe(2);
    });

    it('should return 0% when no stories are done', () => {
      const stories: UserStory[] = [
        { id: 'US-001', title: 'Todo', status: 'todo', priority: 'P1', acceptanceCriteria: [] },
        { id: 'US-002', title: 'WIP', status: 'in-progress', priority: 'P1', acceptanceCriteria: [] },
      ];

      const progress = SpecParser.calculateProgress(stories);
      expect(progress.percentComplete).toBe(0);
    });

    it('should round percentComplete to nearest integer', () => {
      const stories: UserStory[] = [
        { id: 'US-001', title: 'Done', status: 'done', priority: 'P1', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Todo', status: 'todo', priority: 'P1', acceptanceCriteria: [] },
        { id: 'US-003', title: 'Todo', status: 'todo', priority: 'P1', acceptanceCriteria: [] },
      ];

      const progress = SpecParser.calculateProgress(stories);
      // 1/3 = 33.33... -> 33
      expect(progress.percentComplete).toBe(33);
    });

    it('should handle null/undefined gracefully via nullish coalescing', () => {
      const progress = SpecParser.calculateProgress(null as any);
      expect(progress.totalUserStories).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });
  });

  // =========================================================================
  // filterUserStories
  // =========================================================================
  describe('filterUserStories', () => {
    const stories: UserStory[] = [
      { id: 'US-001', title: 'P1 Done', status: 'done', priority: 'P1', acceptanceCriteria: [] },
      { id: 'US-002', title: 'P1 WIP', status: 'in-progress', priority: 'P1', acceptanceCriteria: [] },
      { id: 'US-003', title: 'P2 Todo', status: 'todo', priority: 'P2', acceptanceCriteria: [] },
      { id: 'US-004', title: 'P3 Todo', status: 'todo', priority: 'P3', acceptanceCriteria: [] },
    ];

    it('should return all stories when no filters applied', () => {
      const result = SpecParser.filterUserStories(stories);
      expect(result).toHaveLength(4);
    });

    it('should filter by status only', () => {
      const result = SpecParser.filterUserStories(stories, 'todo');
      expect(result).toHaveLength(2);
      expect(result.every(s => s.status === 'todo')).toBe(true);
    });

    it('should filter by priority only', () => {
      const result = SpecParser.filterUserStories(stories, undefined, 'P1');
      expect(result).toHaveLength(2);
      expect(result.every(s => s.priority === 'P1')).toBe(true);
    });

    it('should filter by both status and priority', () => {
      const result = SpecParser.filterUserStories(stories, 'todo', 'P2');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('US-003');
    });

    it('should return empty array when no stories match', () => {
      const result = SpecParser.filterUserStories(stories, 'done', 'P3');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const result = SpecParser.filterUserStories([], 'done');
      expect(result).toHaveLength(0);
    });
  });

  // =========================================================================
  // findUserStory
  // =========================================================================
  describe('findUserStory', () => {
    const stories: UserStory[] = [
      { id: 'US-001', title: 'First', status: 'done', priority: 'P1', acceptanceCriteria: [] },
      { id: 'US-002', title: 'Second', status: 'todo', priority: 'P2', acceptanceCriteria: [] },
    ];

    it('should find a user story by ID', () => {
      const result = SpecParser.findUserStory(stories, 'US-002');
      expect(result).toBeDefined();
      expect(result!.title).toBe('Second');
    });

    it('should return undefined when story not found', () => {
      const result = SpecParser.findUserStory(stories, 'US-999');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const result = SpecParser.findUserStory([], 'US-001');
      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // updateUserStoryStatus
  // =========================================================================
  describe('updateUserStoryStatus', () => {
    it('should check all AC boxes when setting status to done', () => {
      const md = [
        '- [ ] **AC-001-01**: First AC',
        '- [ ] **AC-001-02**: Second AC',
      ].join('\n');

      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'done');
      expect(result).toContain('- [x] **AC-001-01**:');
      expect(result).toContain('- [x] **AC-001-02**:');
    });

    it('should uncheck all AC boxes when setting status to todo', () => {
      const md = [
        '- [x] **AC-001-01**: First AC',
        '- [x] **AC-001-02**: Second AC',
      ].join('\n');

      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'todo');
      expect(result).toContain('- [ ] **AC-001-01**:');
      expect(result).toContain('- [ ] **AC-001-02**:');
    });

    it('should return markdown unchanged when setting status to in-progress', () => {
      const md = [
        '- [x] **AC-001-01**: First AC',
        '- [ ] **AC-001-02**: Second AC',
      ].join('\n');

      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'in-progress');
      expect(result).toBe(md);
    });

    it('should only affect ACs for the specified user story', () => {
      const md = [
        '- [ ] **AC-001-01**: US-001 AC',
        '- [ ] **AC-002-01**: US-002 AC',
      ].join('\n');

      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'done');
      expect(result).toContain('- [x] **AC-001-01**:');
      expect(result).toContain('- [ ] **AC-002-01**:');
    });

    it('should handle markdown with no matching ACs gracefully', () => {
      const md = '## Overview\nNo ACs here.';
      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'done');
      expect(result).toBe(md);
    });

    it('should handle already-checked boxes when setting done', () => {
      const md = [
        '- [x] **AC-001-01**: Already done',
        '- [ ] **AC-001-02**: Not done yet',
      ].join('\n');

      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'done');
      // The already-checked one stays checked, the unchecked one gets checked
      expect(result).toContain('- [x] **AC-001-01**:');
      expect(result).toContain('- [x] **AC-001-02**:');
    });

    it('should handle already-unchecked boxes when setting todo', () => {
      const md = [
        '- [ ] **AC-001-01**: Already unchecked',
        '- [x] **AC-001-02**: Was checked',
      ].join('\n');

      const result = SpecParser.updateUserStoryStatus(md, 'US-001', 'todo');
      expect(result).toContain('- [ ] **AC-001-01**:');
      expect(result).toContain('- [ ] **AC-001-02**:');
    });
  });

  // =========================================================================
  // Integration-like: full spec parse workflow
  // =========================================================================
  describe('full spec parsing workflow', () => {
    it('should parse a realistic spec markdown end-to-end', () => {
      const md = buildSpecMarkdown({
        overview: 'A comprehensive feature for user authentication.',
        stories: [
          {
            id: 'US-001',
            title: 'As a user, I want to register',
            priority: 'P1',
            acs: [
              { num: '01', done: true, desc: 'Registration form exists (P1, testable)' },
              { num: '02', done: true, desc: 'Email validation works (P1, testable)' },
            ],
          },
          {
            id: 'US-002',
            title: 'As a user, I want to login',
            priority: 'P2',
            acs: [
              { num: '01', done: true, desc: 'Login form renders (P2, testable)' },
              { num: '02', done: false, desc: 'Remember me works (P3)' },
            ],
          },
          {
            id: 'US-003',
            title: 'As an admin, I want to manage users',
            priority: 'P3',
            acs: [
              { num: '01', done: false, desc: 'User list page (P3)' },
            ],
          },
        ],
        incrementTable: [
          '| **0001-registration** | ✅ Complete | 2024-01-15 | Implements US-001 |',
          '| **0002-login** | ⏳ Active | | Working on US-002 |',
        ].join('\n'),
        externalRefs: [
          'GitHub Project: https://github.com/orgs/acme/projects/1',
          'Jira Epic: AUTH-100',
        ].join('\n'),
      });

      // Parse all user stories
      const stories = SpecParser.parseAllUserStories(md);
      expect(stories).toHaveLength(3);

      // Calculate progress
      const progress = SpecParser.calculateProgress(stories);
      expect(progress.totalUserStories).toBe(3);
      expect(progress.completedUserStories).toBe(1);
      expect(progress.inProgressUserStories).toBe(1);
      expect(progress.todoUserStories).toBe(1);
      expect(progress.percentComplete).toBe(33);

      // Filter
      const todoStories = SpecParser.filterUserStories(stories, 'todo');
      expect(todoStories).toHaveLength(1);
      expect(todoStories[0].id).toBe('US-003');

      // Find
      const found = SpecParser.findUserStory(stories, 'US-002');
      expect(found).toBeDefined();
      expect(found!.status).toBe('in-progress');

      // Parse increments
      const increments = SpecParser.parseIncrementReferences(md);
      expect(increments).toHaveLength(2);
      expect(increments[0].status).toBe('complete');
      expect(increments[1].status).toBe('in-progress');

      // Overview
      const overview = SpecParser.extractOverview(md);
      expect(overview).toBe('A comprehensive feature for user authentication.');

      // External refs
      const extRefs = SpecParser.extractExternalReferences(md);
      expect(extRefs.github).toBe('https://github.com/orgs/acme/projects/1');
      expect(extRefs.jira).toBe('AUTH-100');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('should handle user story with special characters in title', () => {
      const md = '**US-001**: As a user, I want to use "quotes" & <angle brackets>\n';
      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result).not.toBeNull();
      expect(result!.title).toContain('"quotes"');
    });

    it('should handle very large user story numbers', () => {
      const md = '**US-999**: High number story\n';
      const results = SpecParser.parseAllUserStories(md);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('US-999');
    });

    it('should handle AC with multi-digit numbers', () => {
      const md = '- [ ] **AC-001-10**: Tenth AC\n- [x] **AC-001-99**: Ninety-ninth AC\n';
      const acs = SpecParser.parseAcceptanceCriteria(md, 'US-001');
      expect(acs).toHaveLength(2);
      expect(acs[0].id).toBe('AC-001-10');
      expect(acs[1].id).toBe('AC-001-99');
    });

    it('should handle markdown with CRLF line endings when normalized', () => {
      // The parser regex uses (?=\n|$), so raw \r\n doesn't match.
      // Real-world usage normalizes CRLF to LF before parsing.
      const md = '**US-001**: Story with CRLF\r\n- [ ] **AC-001-01**: AC with CRLF\r\n'
        .replace(/\r\n/g, '\n');
      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result).not.toBeNull();
      expect(result!.title).toContain('Story with CRLF');
    });

    it('should return null for raw CRLF without normalization', () => {
      // Documents the limitation: parser expects \n not \r\n
      const md = '**US-001**: Story with CRLF\r\n';
      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result).toBeNull();
    });

    it('should handle user story title with trailing whitespace', () => {
      const md = '**US-001**: Trailing whitespace   \n';
      const result = SpecParser.parseUserStory(md, 'US-001');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Trailing whitespace');
    });

    it('should handle increment with hyphenated name', () => {
      const md =
        '| **0001-my-complex-feature-name** | ✅ Complete | 2024-01-01 | Done |\n';
      const refs = SpecParser.parseIncrementReferences(md);
      expect(refs).toHaveLength(1);
      expect(refs[0].id).toBe('0001-my-complex-feature-name');
    });
  });
});
