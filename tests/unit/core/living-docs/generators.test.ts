/**
 * Generator Tests
 *
 * Tests for living docs markdown generators (FEATURE.md, README.md, user story files).
 * All functions under test are pure - no mocking needed.
 *
 * @see src/core/living-docs/sync-helpers/generators.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateFeatureFile,
  generateReadmeFile,
  generateUserStoryFile,
} from '../../../../src/core/living-docs/sync-helpers/generators.js';
import type { GeneratorContext } from '../../../../src/core/living-docs/sync-helpers/generators.js';
import type { ParsedSpec, UserStoryData } from '../../../../src/core/living-docs/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid ParsedSpec for tests */
function makeParsedSpec(overrides?: Partial<ParsedSpec>): ParsedSpec {
  return {
    title: 'Test Feature',
    overview: 'This is the overview. More details follow.',
    status: 'in-progress',
    priority: 'high',
    created: '2026-01-15',
    userStories: [],
    acceptanceCriteria: [],
    frontmatter: {},
    ...overrides,
  };
}

/** Build a minimal valid UserStoryData for tests */
function makeStory(overrides?: Partial<UserStoryData>): UserStoryData {
  return {
    id: 'US1',
    title: 'User can login',
    description: 'As a user I want to login. So I can access my data.',
    acceptanceCriteria: ['AC-US1-01'],
    ...overrides,
  };
}

/** Extract YAML frontmatter from generated markdown as key-value map */
function parseFrontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const map: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(': ');
    if (idx > 0) {
      map[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Freeze Date.toISOString for deterministic lastUpdated assertions
// ---------------------------------------------------------------------------
const FROZEN_DATE = '2026-02-11T00:00:00.000Z';
let realDateNow: typeof Date.now;
let RealDate: DateConstructor;

beforeEach(() => {
  realDateNow = Date.now;
  RealDate = globalThis.Date as DateConstructor;
  const frozenMs = new Date(FROZEN_DATE).getTime();

  vi.useFakeTimers();
  vi.setSystemTime(frozenMs);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// generateFeatureFile
// ===========================================================================

describe('generateFeatureFile', () => {
  // --- Basic output ---

  it('should produce valid markdown with frontmatter, heading, and TL;DR', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-test-feature');

    expect(result).toContain('---');
    expect(result).toContain('# Test Feature');
    expect(result).toContain('## TL;DR');
  });

  it('should start and end frontmatter with triple dashes', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-test');
    const dashes = result.split('---');
    // First element is empty string before first ---, second is frontmatter content
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  // --- Frontmatter fields ---

  it('should include id in frontmatter', () => {
    const fm = parseFrontmatter(generateFeatureFile('FS-042', makeParsedSpec(), '0001-x'));
    expect(fm['id']).toBe('FS-042');
  });

  it('should include title in frontmatter wrapped in quotes', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ title: 'My Feature' }), '0001-x'),
    );
    expect(fm['title']).toBe('"My Feature"');
  });

  it('should set type to feature', () => {
    const fm = parseFrontmatter(generateFeatureFile('FS-001', makeParsedSpec(), '0001-x'));
    expect(fm['type']).toBe('feature');
  });

  it('should include status from parsed spec', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ status: 'completed' }), '0001-x'),
    );
    expect(fm['status']).toBe('completed');
  });

  it('should include priority from parsed spec', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ priority: 'critical' }), '0001-x'),
    );
    expect(fm['priority']).toBe('critical');
  });

  it('should include created date from parsed spec', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ created: '2025-12-01' }), '0001-x'),
    );
    expect(fm['created']).toBe('2025-12-01');
  });

  it('should set lastUpdated to today', () => {
    const fm = parseFrontmatter(generateFeatureFile('FS-001', makeParsedSpec(), '0001-x'));
    expect(fm['lastUpdated']).toBe('2026-02-11');
  });

  it('should set stakeholder_relevant to true', () => {
    const fm = parseFrontmatter(generateFeatureFile('FS-001', makeParsedSpec(), '0001-x'));
    expect(fm['stakeholder_relevant']).toBe('true');
  });

  // --- Project field ---

  it('should NOT include project when context is default', () => {
    const fm = parseFrontmatter(generateFeatureFile('FS-001', makeParsedSpec(), '0001-x'));
    expect(fm['project']).toBeUndefined();
  });

  it('should include project when context has non-default projectId', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec(), '0001-x', { projectId: 'my-app' }),
    );
    expect(fm['project']).toBe('my-app');
  });

  // --- TL;DR ---

  it('should build TL;DR from overview first sentence', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ overview: 'Short summary sentence. More details.' }),
      '0001-x',
    );
    expect(result).toContain('**What**: Short summary sentence.');
  });

  it('should fall back to title when overview is empty', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ overview: '', title: 'Fallback Title' }),
      '0001-x',
    );
    expect(result).toContain('**What**: Fallback Title');
  });

  it('should include status and priority in TL;DR', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ status: 'done', priority: 'low' }),
      '0001-x',
    );
    expect(result).toContain('**Status**: done | **Priority**: low');
  });

  it('should include user stories count in TL;DR', () => {
    const stories = [makeStory({ id: 'US1' }), makeStory({ id: 'US2' })];
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ userStories: stories }),
      '0001-x',
    );
    expect(result).toContain('**User Stories**: 2');
  });

  // --- tldr frontmatter ---

  it('should set tldr in frontmatter from overview first sentence', () => {
    const fm = parseFrontmatter(
      generateFeatureFile(
        'FS-001',
        makeParsedSpec({ overview: 'A brief summary. Extended explanation.' }),
        '0001-x',
      ),
    );
    expect(fm['tldr']).toBe('"A brief summary."');
  });

  it('should escape double quotes in tldr', () => {
    const fm = parseFrontmatter(
      generateFeatureFile(
        'FS-001',
        makeParsedSpec({ overview: 'Uses "quotes" inside. More text.' }),
        '0001-x',
      ),
    );
    expect(fm['tldr']).toContain("'quotes'");
    expect(fm['tldr']).not.toContain('"quotes"');
  });

  it('should fall back tldr to title when overview is empty', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ overview: '', title: 'My Title' }), '0001-x'),
    );
    expect(fm['tldr']).toBe('"My Title"');
  });

  // --- Overview section ---

  it('should include Overview section when overview exists', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ overview: 'Detailed overview text.' }),
      '0001-x',
    );
    expect(result).toContain('## Overview');
    expect(result).toContain('Detailed overview text.');
  });

  it('should omit Overview section when overview is empty', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ overview: '' }),
      '0001-x',
    );
    expect(result).not.toContain('## Overview');
  });

  // --- Implementation History ---

  it('should include Implementation History table', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-my-feature');
    expect(result).toContain('## Implementation History');
    expect(result).toContain('| Increment | Status | Completion Date |');
  });

  it('should use completed emoji for completed status', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ status: 'completed' }),
      '0001-x',
    );
    // The status emoji check
    expect(result).toMatch(/\u2705\s*completed/);
  });

  it('should use in-progress emoji for non-completed status', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ status: 'in-progress' }),
      '0001-x',
    );
    expect(result).toMatch(/\u23F3\s*in-progress/);
  });

  it('should link increment with relative path by default', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-my-feature');
    expect(result).toContain('(../../../../increments/0001-my-feature/spec.md)');
  });

  it('should include created date in history table', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ created: '2026-01-20' }),
      '0001-x',
    );
    expect(result).toContain('2026-01-20');
  });

  // --- Complexity ---

  it('should be "low" complexity for 0 stories', () => {
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ userStories: [] }), '0001-x'),
    );
    expect(fm['complexity']).toBe('low');
  });

  it('should be "low" complexity for 1 story', () => {
    const fm = parseFrontmatter(
      generateFeatureFile(
        'FS-001',
        makeParsedSpec({ userStories: [makeStory()] }),
        '0001-x',
      ),
    );
    expect(fm['complexity']).toBe('low');
  });

  it('should be "medium" complexity for 2 stories', () => {
    const stories = [makeStory({ id: 'US1' }), makeStory({ id: 'US2' })];
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ userStories: stories }), '0001-x'),
    );
    expect(fm['complexity']).toBe('medium');
  });

  it('should be "medium" complexity for 3 stories', () => {
    const stories = [
      makeStory({ id: 'US1' }),
      makeStory({ id: 'US2' }),
      makeStory({ id: 'US3' }),
    ];
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ userStories: stories }), '0001-x'),
    );
    expect(fm['complexity']).toBe('medium');
  });

  it('should be "high" complexity for 4 stories', () => {
    const stories = [
      makeStory({ id: 'US1' }),
      makeStory({ id: 'US2' }),
      makeStory({ id: 'US3' }),
      makeStory({ id: 'US4' }),
    ];
    const fm = parseFrontmatter(
      generateFeatureFile('FS-001', makeParsedSpec({ userStories: stories }), '0001-x'),
    );
    expect(fm['complexity']).toBe('high');
  });

  // --- User Stories list ---

  it('should list user stories with links', () => {
    const stories = [
      makeStory({ id: 'US1', title: 'Login Feature' }),
      makeStory({ id: 'US2', title: 'Logout Feature' }),
    ];
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ userStories: stories }),
      '0001-x',
    );
    expect(result).toContain('## User Stories');
    expect(result).toContain('- [US1: Login Feature]');
    expect(result).toContain('- [US2: Logout Feature]');
  });

  it('should generate story file slug from title', () => {
    const stories = [makeStory({ id: 'US1', title: 'My Cool Feature!' })];
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ userStories: stories }),
      '0001-x',
    );
    // id.toLowerCase() + '-' + slug
    expect(result).toContain('./us1-my-cool-feature-.md');
  });

  it('should omit User Stories section when no stories exist', () => {
    const result = generateFeatureFile(
      'FS-001',
      makeParsedSpec({ userStories: [] }),
      '0001-x',
    );
    expect(result).not.toContain('## User Stories');
  });

  // --- Relative vs absolute links ---

  it('should use custom incrementsRelativePath when provided', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-x', {
      incrementsRelativePath: '../../../custom-path',
    });
    expect(result).toContain('(../../../custom-path/0001-x/spec.md)');
  });

  it('should use absolute path when useRelativeLinks is false', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-x', {
      useRelativeLinks: false,
    });
    expect(result).toContain('(/.specweave/increments/0001-x/spec.md)');
  });

  it('should use relative path when useRelativeLinks is true (explicit)', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-x', {
      useRelativeLinks: true,
    });
    expect(result).toContain('(../../../../increments/0001-x/spec.md)');
  });
});

// ===========================================================================
// generateReadmeFile
// ===========================================================================

describe('generateReadmeFile', () => {
  // --- Basic output ---

  it('should produce valid markdown with frontmatter and heading', () => {
    const result = generateReadmeFile('FS-001', makeParsedSpec(), '0001-x');
    expect(result).toContain('---');
    expect(result).toContain('# Test Feature');
  });

  it('should include feature link to FEATURE.md', () => {
    const result = generateReadmeFile('FS-010', makeParsedSpec(), '0001-x');
    expect(result).toContain('**Feature**: [FS-010](./FEATURE.md)');
  });

  // --- Frontmatter ---

  it('should use default project suffix when context is default', () => {
    const fm = parseFrontmatter(generateReadmeFile('FS-001', makeParsedSpec(), '0001-x'));
    // No suffix for default
    expect(fm['id']).toBe('FS-001');
  });

  it('should append project suffix to id when projectId is set', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec(), '0001-x', { projectId: 'backend' }),
    );
    expect(fm['id']).toBe('FS-001-backend');
  });

  it('should use projectName in title when provided', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec({ title: 'Auth' }), '0001-x', {
        projectId: 'api',
        projectName: 'API Service',
      }),
    );
    expect(fm['title']).toBe('"Auth - API Service Implementation"');
  });

  it('should fall back to projectId in title when projectName is explicitly undefined', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec({ title: 'Auth' }), '0001-x', {
        projectId: 'api',
        projectName: undefined,
      }),
    );
    // Spread with explicit undefined overwrites default 'Project' with undefined
    // Then ctx.projectName || ctx.projectId resolves to 'api'
    expect(fm['title']).toBe('"Auth - api Implementation"');
  });

  it('should use projectId when projectName is empty string', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec({ title: 'Auth' }), '0001-x', {
        projectId: 'api',
        projectName: '',
      }),
    );
    // Empty string is falsy, so || falls through to projectId
    expect(fm['title']).toBe('"Auth - api Implementation"');
  });

  it('should set feature to featureId', () => {
    const fm = parseFrontmatter(generateReadmeFile('FS-099', makeParsedSpec(), '0001-x'));
    expect(fm['feature']).toBe('FS-099');
  });

  it('should set type to feature-context', () => {
    const fm = parseFrontmatter(generateReadmeFile('FS-001', makeParsedSpec(), '0001-x'));
    expect(fm['type']).toBe('feature-context');
  });

  it('should include status from parsed spec', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec({ status: 'completed' }), '0001-x'),
    );
    expect(fm['status']).toBe('completed');
  });

  it('should include project from context', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec(), '0001-x', { projectId: 'web' }),
    );
    expect(fm['project']).toBe('web');
  });

  // --- Overview ---

  it('should include Overview section when overview exists', () => {
    const result = generateReadmeFile(
      'FS-001',
      makeParsedSpec({ overview: 'Some overview content.' }),
      '0001-x',
    );
    expect(result).toContain('## Overview');
    expect(result).toContain('Some overview content.');
  });

  it('should omit Overview section when overview is empty', () => {
    const result = generateReadmeFile('FS-001', makeParsedSpec({ overview: '' }), '0001-x');
    expect(result).not.toContain('## Overview');
  });

  // --- User Stories ---

  it('should include user stories reference section', () => {
    const result = generateReadmeFile('FS-001', makeParsedSpec(), '0001-x');
    expect(result).toContain('## User Stories');
    expect(result).toContain('See user story files in this directory.');
  });

  // --- Default context display name ---

  it('should use "Project" as default display name in title', () => {
    const fm = parseFrontmatter(
      generateReadmeFile('FS-001', makeParsedSpec({ title: 'Foo' }), '0001-x'),
    );
    // default projectName is 'Project'
    expect(fm['title']).toBe('"Foo - Project Implementation"');
  });
});

// ===========================================================================
// generateUserStoryFile
// ===========================================================================

describe('generateUserStoryFile', () => {
  const baseSpec = makeParsedSpec({
    acceptanceCriteria: [
      { id: 'AC-US1-01', userStoryId: 'US1', description: 'Must validate email', completed: false },
      { id: 'AC-US1-02', userStoryId: 'US1', description: 'Must hash password', completed: true },
      { id: 'AC-US2-01', userStoryId: 'US2', description: 'Other story AC', completed: false },
    ],
  });

  // --- Basic output ---

  it('should produce valid markdown with frontmatter, heading, and sections', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0001-x', baseSpec);
    expect(result).toContain('---');
    expect(result).toContain('# US1: User can login');
    expect(result).toContain('## Acceptance Criteria');
    expect(result).toContain('## Implementation');
  });

  it('should include feature link', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-010', '0001-x', baseSpec);
    expect(result).toContain('**Feature**: [FS-010](./FEATURE.md)');
  });

  // --- Frontmatter fields ---

  it('should set id to story id', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory({ id: 'US42' }), 'FS-001', '0001-x', baseSpec),
    );
    expect(fm['id']).toBe('US42');
  });

  it('should set feature to featureId', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory(), 'FS-007', '0001-x', baseSpec),
    );
    expect(fm['feature']).toBe('FS-007');
  });

  it('should wrap title in quotes', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory({ title: 'Login Form' }), 'FS-001', '0001-x', baseSpec),
    );
    expect(fm['title']).toBe('"Login Form"');
  });

  it('should use story status when present', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory({ status: 'done' }), 'FS-001', '0001-x', baseSpec),
    );
    expect(fm['status']).toBe('done');
  });

  it('should fall back to parsed status when story has no status', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ status: undefined }),
        'FS-001',
        '0001-x',
        makeParsedSpec({ status: 'in-progress' }),
      ),
    );
    expect(fm['status']).toBe('in-progress');
  });

  it('should include priority from parsed spec', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory(), 'FS-001', '0001-x', makeParsedSpec({ priority: 'low' })),
    );
    expect(fm['priority']).toBe('low');
  });

  it('should include created from parsed spec', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory(),
        'FS-001',
        '0001-x',
        makeParsedSpec({ created: '2025-06-01' }),
      ),
    );
    expect(fm['created']).toBe('2025-06-01');
  });

  // --- tldr ---

  it('should build tldr from description first sentence', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ description: 'User needs auth. It is important.' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['tldr']).toBe('"User needs auth."');
  });

  it('should fall back tldr to title when description is empty', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ description: '', title: 'My Story' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['tldr']).toBe('"My Story"');
  });

  it('should escape quotes in tldr', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ description: 'Needs "special" handling. More.' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['tldr']).toContain("'special'");
  });

  // --- Description ---

  it('should include description when present', () => {
    const result = generateUserStoryFile(
      makeStory({ description: 'As a user I want to do stuff.' }),
      'FS-001',
      '0001-x',
      baseSpec,
    );
    expect(result).toContain('As a user I want to do stuff.');
  });

  it('should omit description block when description is empty', () => {
    const withDesc = generateUserStoryFile(
      makeStory({ description: 'Some real content here.' }),
      'FS-001',
      '0001-x',
      baseSpec,
    );
    const withoutDesc = generateUserStoryFile(
      makeStory({ description: '' }),
      'FS-001',
      '0001-x',
      baseSpec,
    );
    // The version without description should not contain the description text
    expect(withDesc).toContain('Some real content here.');
    expect(withoutDesc).not.toContain('Some real content here.');
    // The version without description should be shorter (no description paragraph)
    expect(withoutDesc.length).toBeLessThan(withDesc.length);
  });

  // --- Acceptance Criteria ---

  it('should render matching ACs with checkboxes', () => {
    const result = generateUserStoryFile(makeStory({ id: 'US1' }), 'FS-001', '0001-x', baseSpec);
    expect(result).toContain('- [ ] **AC-US1-01**: Must validate email');
    expect(result).toContain('- [x] **AC-US1-02**: Must hash password');
  });

  it('should only render ACs matching the story id', () => {
    const result = generateUserStoryFile(makeStory({ id: 'US1' }), 'FS-001', '0001-x', baseSpec);
    expect(result).not.toContain('AC-US2-01');
  });

  it('should show fallback text when no ACs match', () => {
    const result = generateUserStoryFile(
      makeStory({ id: 'US99' }),
      'FS-001',
      '0001-x',
      baseSpec,
    );
    expect(result).toContain('No acceptance criteria defined.');
  });

  it('should show fallback text when acceptanceCriteria is empty', () => {
    const result = generateUserStoryFile(
      makeStory(),
      'FS-001',
      '0001-x',
      makeParsedSpec({ acceptanceCriteria: [] }),
    );
    expect(result).toContain('No acceptance criteria defined.');
  });

  // --- Implementation section ---

  it('should include increment link with relative path by default', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0042-auth', baseSpec);
    expect(result).toContain('**Increment**: [0042-auth]');
    expect(result).toContain('(../../../../increments/0042-auth/spec.md)');
  });

  it('should use absolute path when useRelativeLinks is false', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0042-auth', baseSpec, {
      context: { useRelativeLinks: false },
    });
    expect(result).toContain('(/.specweave/increments/0042-auth/spec.md)');
  });

  it('should use custom incrementsRelativePath', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0042-auth', baseSpec, {
      context: { incrementsRelativePath: '../../my-path' },
    });
    expect(result).toContain('(../../my-path/0042-auth/spec.md)');
  });

  it('should include tasks reference text', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0001-x', baseSpec);
    expect(result).toContain('**Tasks**: See increment tasks.md for implementation details.');
  });

  // --- Project / Cross-project ---

  it('should include project from story when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ project: 'frontend-app' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['project']).toBe('frontend-app');
  });

  it('should fall back to context projectId when story has no project', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory({ project: undefined }), 'FS-001', '0001-x', baseSpec, {
        context: { projectId: 'web-app' },
      }),
    );
    expect(fm['project']).toBe('web-app');
  });

  it('should omit project when both story and context are default', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory({ project: undefined }), 'FS-001', '0001-x', baseSpec),
    );
    expect(fm['project']).toBeUndefined();
  });

  it('should include related_projects when allProjects and story.project are set', () => {
    const result = generateUserStoryFile(
      makeStory({ project: 'frontend' }),
      'FS-001',
      '0001-x',
      baseSpec,
      { allProjects: ['frontend', 'backend', 'shared'] },
    );
    expect(result).toContain('related_projects: [backend, shared]');
  });

  it('should omit related_projects when story has no project', () => {
    const result = generateUserStoryFile(
      makeStory({ project: undefined }),
      'FS-001',
      '0001-x',
      baseSpec,
      { allProjects: ['frontend', 'backend'] },
    );
    expect(result).not.toContain('related_projects');
  });

  it('should omit related_projects when allProjects is not provided', () => {
    const result = generateUserStoryFile(
      makeStory({ project: 'frontend' }),
      'FS-001',
      '0001-x',
      baseSpec,
    );
    expect(result).not.toContain('related_projects');
  });

  it('should omit related_projects when story is the only project', () => {
    const result = generateUserStoryFile(
      makeStory({ project: 'frontend' }),
      'FS-001',
      '0001-x',
      baseSpec,
      { allProjects: ['frontend'] },
    );
    expect(result).not.toContain('related_projects');
  });

  // --- Board / External Provider ---

  it('should include board when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ board: 'mobile-team' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['board']).toBe('mobile-team');
  });

  it('should omit board when not set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory({ board: undefined }), 'FS-001', '0001-x', baseSpec),
    );
    expect(fm['board']).toBeUndefined();
  });

  it('should include external_provider when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ externalProvider: 'jira' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['external_provider']).toBe('jira');
  });

  it('should omit external_provider when not set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ externalProvider: undefined }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['external_provider']).toBeUndefined();
  });

  // --- External metadata fields ---

  it('should include format_preservation when set to true', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ format_preservation: true }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['format_preservation']).toBe('true');
  });

  it('should include format_preservation when set to false', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ format_preservation: false }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['format_preservation']).toBe('false');
  });

  it('should omit format_preservation when undefined', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ format_preservation: undefined }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['format_preservation']).toBeUndefined();
  });

  it('should include external_title when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ external_title: 'JIRA-123 Login Bug' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['external_title']).toBe('"JIRA-123 Login Bug"');
  });

  it('should include external_source when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ external_source: 'github' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['external_source']).toBe('github');
  });

  it('should include external_id when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ external_id: 'GH-456' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['external_id']).toBe('"GH-456"');
  });

  it('should include external_url when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ external_url: 'https://github.com/org/repo/issues/1' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['external_url']).toBe('"https://github.com/org/repo/issues/1"');
  });

  it('should include imported_at when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ imported_at: '2026-01-20T10:00:00Z' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['imported_at']).toBe('"2026-01-20T10:00:00Z"');
  });

  it('should include origin when set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(
        makeStory({ origin: 'external' }),
        'FS-001',
        '0001-x',
        baseSpec,
      ),
    );
    expect(fm['origin']).toBe('external');
  });

  it('should omit all external fields when not set', () => {
    const fm = parseFrontmatter(
      generateUserStoryFile(makeStory(), 'FS-001', '0001-x', baseSpec),
    );
    expect(fm['external_title']).toBeUndefined();
    expect(fm['external_source']).toBeUndefined();
    expect(fm['external_id']).toBeUndefined();
    expect(fm['external_url']).toBeUndefined();
    expect(fm['imported_at']).toBeUndefined();
    expect(fm['origin']).toBeUndefined();
  });

  // --- Full external metadata story ---

  it('should include all external metadata when fully populated', () => {
    const story = makeStory({
      project: 'backend-api',
      board: 'api-team',
      externalProvider: 'jira',
      format_preservation: true,
      external_title: 'PROJ-100 Auth Service',
      external_source: 'jira',
      external_id: 'PROJ-100',
      external_url: 'https://jira.example.com/browse/PROJ-100',
      imported_at: '2026-02-01T08:00:00Z',
      origin: 'external',
    });

    const result = generateUserStoryFile(story, 'FS-001', '0001-x', baseSpec, {
      allProjects: ['backend-api', 'frontend-web'],
    });
    const fm = parseFrontmatter(result);

    expect(fm['project']).toBe('backend-api');
    expect(fm['board']).toBe('api-team');
    expect(fm['external_provider']).toBe('jira');
    expect(fm['format_preservation']).toBe('true');
    expect(fm['external_title']).toBe('"PROJ-100 Auth Service"');
    expect(fm['external_source']).toBe('jira');
    expect(fm['external_id']).toBe('"PROJ-100"');
    expect(result).toContain('related_projects: [frontend-web]');
    expect(fm['origin']).toBe('external');
  });
});

// ===========================================================================
// Context handling (shared across generators)
// ===========================================================================

describe('Context handling', () => {
  it('should use default context when none is provided', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-x');
    // Default uses relative links with ../../../../increments path
    expect(result).toContain('../../../../increments/0001-x/spec.md');
  });

  it('should merge partial context with defaults', () => {
    // Only override projectId, rest should use defaults
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-x', {
      projectId: 'my-app',
    });
    // Project should appear
    expect(result).toContain('project: my-app');
    // Still uses default relative path
    expect(result).toContain('../../../../increments/0001-x/spec.md');
  });

  it('should override incrementsRelativePath while keeping other defaults', () => {
    const result = generateFeatureFile('FS-001', makeParsedSpec(), '0001-x', {
      incrementsRelativePath: '../../custom',
    });
    expect(result).toContain('../../custom/0001-x/spec.md');
    // projectId still default, so no project field
    const fm = parseFrontmatter(result);
    expect(fm['project']).toBeUndefined();
  });

  it('should propagate context through UserStoryFileOptions', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0001-x', makeParsedSpec(), {
      context: {
        projectId: 'mobile',
        incrementsRelativePath: '../inc',
        useRelativeLinks: true,
      },
    });
    expect(result).toContain('project: mobile');
    expect(result).toContain('../inc/0001-x/spec.md');
  });

  it('should use absolute paths in user story when useRelativeLinks is false', () => {
    const result = generateUserStoryFile(makeStory(), 'FS-001', '0005-auth', makeParsedSpec(), {
      context: { useRelativeLinks: false },
    });
    expect(result).toContain('(/.specweave/increments/0005-auth/spec.md)');
    expect(result).not.toContain('../../../../increments');
  });

  it('should pass context to README generator correctly', () => {
    const result = generateReadmeFile('FS-001', makeParsedSpec(), '0001-x', {
      projectId: 'dashboard',
      projectName: 'Dashboard App',
    });
    const fm = parseFrontmatter(result);
    expect(fm['id']).toBe('FS-001-dashboard');
    expect(fm['project']).toBe('dashboard');
    expect(fm['title']).toContain('Dashboard App Implementation');
  });
});
