/**
 * Unit tests for spec-task-mapper
 *
 * Tests all exported functions:
 * - parseSpec() - parses spec.md for user stories and acceptance criteria
 * - parseTasks() - parses tasks.md for tasks with AC-IDs
 * - createTaskToUserStoryMapping() - maps tasks to user stories
 * - getSpecTaskMapping() - full mapping for an increment
 * - getCompletedUserStories() - filters completed user stories
 * - getRecentlyCompletedTasks() - filters completed tasks
 * - findSpecForIncrement() - finds spec path for increment
 *
 * Internal functions tested indirectly:
 * - parseAcceptanceCriteriaFromContent() via parseSpec
 * - extractACIds() / deriveUserStoriesFromACIds() via parseTasks
 * - extractTaskSection() via parseTasks
 * - findSpecPath() via getSpecTaskMapping
 *
 * Uses vi.mock() for fs/promises. ESM imports with .js extensions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

const { mockGlobSync } = vi.hoisted(() => ({
  mockGlobSync: vi.fn(),
}));

vi.mock('glob', () => ({
  sync: mockGlobSync,
}));

// Import after mocks
import {
  parseSpec,
  parseTasks,
  createTaskToUserStoryMapping,
  getSpecTaskMapping,
  getCompletedUserStories,
  getRecentlyCompletedTasks,
  findSpecForIncrement,
} from '../../../../src/core/specs/spec-task-mapper.js';

import type {
  UserStory,
  Task,
  SpecTaskMapping,
} from '../../../../src/core/specs/spec-task-mapper.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SPEC_CONTENT_BASIC = `# Feature: User Authentication

## User Stories & Acceptance Criteria

**US-001**: As a user, I want to log in with email and password
- [x] **AC-US001-01**: User can enter email and password (P1, testable)
- [ ] **AC-US001-02**: Invalid credentials show error message (P1, testable)
- [x] **AC-US001-03**: Successful login redirects to dashboard (P2)

**US-002**: As a user, I want to reset my password
- [ ] **AC-US002-01**: Reset link is sent to email (P1, testable)
- [ ] **AC-US002-02**: Link expires after 24 hours (P2, testable)
`;

const SPEC_CONTENT_E_SUFFIX = `# Feature: Emergency Fixes

## User Stories & Acceptance Criteria

**US-001E**: As an admin, I want emergency access
- [x] **AC-US001E-01**: Admin can bypass auth in emergency (P1, testable)
- [ ] **AC-US001E-02**: Emergency access is logged (P1, testable)

**US-002**: As a user, I want normal access
- [x] **AC-US002-01**: Normal login works (P1)
`;

const SPEC_CONTENT_ALL_COMPLETED = `# Feature: Done

**US-001**: As a user, fully done story
- [x] **AC-US001-01**: First AC done (P1, testable)
- [x] **AC-US001-02**: Second AC done (P1, testable)

**US-002**: As a user, also done
- [x] **AC-US002-01**: Only AC done (P1)
`;

const SPEC_CONTENT_EMPTY = `# Empty Spec

## Overview
No user stories here.
`;

const TASKS_CONTENT_BASIC = `# Tasks

- [x] T-001
- [ ] T-002
- [ ] T-003

## T-001: Implement login form
**User Story**: US-001 | **Status**: [x] completed
**AC**: AC-US001-01, AC-US001-02
**Test**: Given valid credentials -> When submitting -> Then redirect to dashboard

## T-002: Implement error handling
**User Story**: US-001 | **Status**: [ ] pending
**AC**: AC-US001-02, AC-US001-03
**Test**: Given invalid credentials -> When submitting -> Then show error

## T-003: Implement password reset
**User Story**: US-002 | **Status**: [ ] pending
**AC**: AC-US002-01, AC-US002-02
**Test**: Given email -> When requesting reset -> Then send link

---

## Notes
Some extra content after separator.
`;

const TASKS_CONTENT_CROSS_STORY = `# Tasks

- [x] T-001

## T-001: Cross-story task
**User Story**: US-001, US-002 | **Status**: [x] completed
**AC**: AC-US001-01, AC-US002-01
**Test**: Given setup -> When action -> Then result
`;

const TASKS_CONTENT_NO_ACS = `# Tasks

## T-001: Task without AC line
**User Story**: US-001 | **Status**: [ ] pending
**Test**: Given X -> When Y -> Then Z

## T-002: Another task no ACs
**Status**: [ ] pending
`;

const TASKS_CONTENT_EMPTY = `# Tasks

No tasks defined yet.
`;

const TASKS_CONTENT_ALL_COMPLETED = `# Tasks

- [x] T-001
- [x] T-002

## T-001: First completed task
**User Story**: US-001 | **Status**: [x] completed
**AC**: AC-US001-01

## T-002: Second completed task
**User Story**: US-002 | **Status**: [x] completed
**AC**: AC-US002-01
`;

const INCREMENT_SPEC_WITH_REF = `# Increment Spec

**Implements**: SPEC-042-user-authentication

## Tasks
See tasks.md
`;

const INCREMENT_SPEC_NO_REF = `# Increment Spec

## Tasks
See tasks.md
`;

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =========================================================================
// parseSpec
// =========================================================================
describe('parseSpec', () => {
  it('parses user stories with IDs and titles', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_BASIC);
    const result = await parseSpec('/fake/spec.md');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('US-001');
    expect(result[0].title).toBe('As a user, I want to log in with email and password');
    expect(result[1].id).toBe('US-002');
    expect(result[1].title).toBe('As a user, I want to reset my password');
  });

  it('reads the file with utf-8 encoding', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_EMPTY);
    await parseSpec('/some/path/spec.md');

    expect(mockReadFile).toHaveBeenCalledWith('/some/path/spec.md', 'utf-8');
  });

  it('parses acceptance criteria for each user story', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_BASIC);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].acceptanceCriteria).toHaveLength(3);
    expect(result[0].acceptanceCriteria[0].id).toBe('AC-US001-01');
    expect(result[0].acceptanceCriteria[1].id).toBe('AC-US001-02');
    expect(result[0].acceptanceCriteria[2].id).toBe('AC-US001-03');

    expect(result[1].acceptanceCriteria).toHaveLength(2);
    expect(result[1].acceptanceCriteria[0].id).toBe('AC-US002-01');
    expect(result[1].acceptanceCriteria[1].id).toBe('AC-US002-02');
  });

  it('parses AC descriptions correctly', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_BASIC);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].acceptanceCriteria[0].description).toBe(
      'User can enter email and password'
    );
    expect(result[0].acceptanceCriteria[1].description).toBe(
      'Invalid credentials show error message'
    );
  });

  it('parses completed [x] vs pending [ ] AC states', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_BASIC);
    const result = await parseSpec('/fake/spec.md');

    // US-001 ACs
    expect(result[0].acceptanceCriteria[0].completed).toBe(true); // [x]
    expect(result[0].acceptanceCriteria[1].completed).toBe(false); // [ ]
    expect(result[0].acceptanceCriteria[2].completed).toBe(true); // [x]

    // US-002 ACs
    expect(result[1].acceptanceCriteria[0].completed).toBe(false); // [ ]
    expect(result[1].acceptanceCriteria[1].completed).toBe(false); // [ ]
  });

  it('parses P1 and P2 priority from metadata parenthetical', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_BASIC);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].acceptanceCriteria[0].priority).toBe('P1');
    expect(result[0].acceptanceCriteria[1].priority).toBe('P1');
    expect(result[0].acceptanceCriteria[2].priority).toBe('P2');
    expect(result[1].acceptanceCriteria[0].priority).toBe('P1');
    expect(result[1].acceptanceCriteria[1].priority).toBe('P2');
  });

  it('parses testable flag from metadata', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_BASIC);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].acceptanceCriteria[0].testable).toBe(true); // (P1, testable)
    expect(result[0].acceptanceCriteria[1].testable).toBe(true); // (P1, testable)
    expect(result[0].acceptanceCriteria[2].testable).toBe(false); // (P2) - no testable
    expect(result[1].acceptanceCriteria[0].testable).toBe(true); // (P1, testable)
  });

  it('returns no priority when metadata is missing', async () => {
    const content = `# Spec

**US-001**: Story
- [ ] **AC-US001-01**: No metadata at all
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].acceptanceCriteria[0].priority).toBeUndefined();
    expect(result[0].acceptanceCriteria[0].testable).toBe(false);
  });

  it('handles E-suffixed user story IDs', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_E_SUFFIX);
    const result = await parseSpec('/fake/spec.md');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('US-001E');
    expect(result[0].title).toBe('As an admin, I want emergency access');
    expect(result[0].acceptanceCriteria).toHaveLength(2);
    expect(result[0].acceptanceCriteria[0].id).toBe('AC-US001E-01');
    expect(result[0].acceptanceCriteria[1].id).toBe('AC-US001E-02');
  });

  it('handles E-suffixed and normal user stories together', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_E_SUFFIX);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].id).toBe('US-001E');
    expect(result[1].id).toBe('US-002');
    expect(result[1].acceptanceCriteria[0].id).toBe('AC-US002-01');
  });

  it('returns empty array when no user stories exist', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_EMPTY);
    const result = await parseSpec('/fake/spec.md');

    expect(result).toEqual([]);
  });

  it('returns empty acceptance criteria when US has no ACs', async () => {
    const content = `# Spec

**US-001**: Story with no criteria listed below
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    expect(result).toHaveLength(1);
    expect(result[0].acceptanceCriteria).toEqual([]);
  });

  it('parses all-completed spec correctly', async () => {
    mockReadFile.mockResolvedValue(SPEC_CONTENT_ALL_COMPLETED);
    const result = await parseSpec('/fake/spec.md');

    expect(result).toHaveLength(2);
    result.forEach((us) => {
      us.acceptanceCriteria.forEach((ac) => {
        expect(ac.completed).toBe(true);
      });
    });
  });

  it('handles user story title with special characters', async () => {
    const content = `# Spec

**US-001**: As a user, I want to use "quotes" & symbols <angle>
- [ ] **AC-US001-01**: AC description (P1)
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    expect(result[0].title).toBe(
      'As a user, I want to use "quotes" & symbols <angle>'
    );
  });

  it('propagates fs.readFile errors', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));
    await expect(parseSpec('/nonexistent/spec.md')).rejects.toThrow(
      'ENOENT: no such file'
    );
  });
});

// =========================================================================
// parseTasks
// =========================================================================
describe('parseTasks', () => {
  it('parses tasks with IDs and titles', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_BASIC);
    const result = await parseTasks('/fake/tasks.md');

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('T-001');
    expect(result[0].title).toBe('Implement login form');
    expect(result[1].id).toBe('T-002');
    expect(result[1].title).toBe('Implement error handling');
    expect(result[2].id).toBe('T-003');
    expect(result[2].title).toBe('Implement password reset');
  });

  it('reads the file with utf-8 encoding', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_EMPTY);
    await parseTasks('/some/path/tasks.md');

    expect(mockReadFile).toHaveBeenCalledWith('/some/path/tasks.md', 'utf-8');
  });

  it('extracts AC-IDs from task sections', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_BASIC);
    const result = await parseTasks('/fake/tasks.md');

    expect(result[0].acIds).toEqual(['AC-US001-01', 'AC-US001-02']);
    expect(result[1].acIds).toEqual(['AC-US001-02', 'AC-US001-03']);
    expect(result[2].acIds).toEqual(['AC-US002-01', 'AC-US002-02']);
  });

  it('derives user stories from AC-IDs', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_BASIC);
    const result = await parseTasks('/fake/tasks.md');

    expect(result[0].userStories).toEqual(['US-001']);
    expect(result[1].userStories).toEqual(['US-001']);
    expect(result[2].userStories).toEqual(['US-002']);
  });

  it('derives multiple user stories for cross-story tasks', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_CROSS_STORY);
    const result = await parseTasks('/fake/tasks.md');

    expect(result[0].acIds).toEqual(['AC-US001-01', 'AC-US002-01']);
    expect(result[0].userStories).toContain('US-001');
    expect(result[0].userStories).toContain('US-002');
    expect(result[0].userStories).toHaveLength(2);
  });

  it('deduplicates user story references', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_BASIC);
    const result = await parseTasks('/fake/tasks.md');

    // T-001 references AC-US001-01 and AC-US001-02, both from US-1
    expect(result[0].userStories).toEqual(['US-001']);
  });

  it('parses completed status [x]', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_BASIC);
    const result = await parseTasks('/fake/tasks.md');

    expect(result[0].completed).toBe(true); // [x] T-001
    expect(result[1].completed).toBe(false); // [ ] T-002
    expect(result[2].completed).toBe(false); // [ ] T-003
  });

  it('returns empty acIds when no AC line exists', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_NO_ACS);
    const result = await parseTasks('/fake/tasks.md');

    expect(result).toHaveLength(2);
    expect(result[0].acIds).toEqual([]);
    expect(result[0].userStories).toEqual([]);
    expect(result[1].acIds).toEqual([]);
  });

  it('returns empty array when no tasks exist', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_EMPTY);
    const result = await parseTasks('/fake/tasks.md');

    expect(result).toEqual([]);
  });

  it('handles all-completed tasks', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_ALL_COMPLETED);
    const result = await parseTasks('/fake/tasks.md');

    expect(result).toHaveLength(2);
    expect(result[0].completed).toBe(true);
    expect(result[1].completed).toBe(true);
  });

  it('stops task section at --- separator', async () => {
    mockReadFile.mockResolvedValue(TASKS_CONTENT_BASIC);
    const result = await parseTasks('/fake/tasks.md');

    // The "Notes" section after --- should not be parsed as a task
    expect(result).toHaveLength(3);
    const taskIds = result.map((t) => t.id);
    expect(taskIds).not.toContain('Notes');
  });

  it('propagates fs.readFile errors', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));
    await expect(parseTasks('/nonexistent/tasks.md')).rejects.toThrow(
      'ENOENT: no such file'
    );
  });

  it('handles task title with special characters', async () => {
    const content = `# Tasks

## T-001: Fix "quoted" bug & edge-case <issue>
**AC**: AC-US001-01
**Status**: [ ] pending
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseTasks('/fake/tasks.md');

    expect(result[0].title).toBe('Fix "quoted" bug & edge-case <issue>');
  });
});

// =========================================================================
// createTaskToUserStoryMapping
// =========================================================================
describe('createTaskToUserStoryMapping', () => {
  const sampleTasks: Task[] = [
    {
      id: 'T-001',
      title: 'Task one',
      acIds: ['AC-US001-01', 'AC-US001-02'],
      userStories: ['US-001'],
      completed: true,
    },
    {
      id: 'T-002',
      title: 'Task two',
      acIds: ['AC-US002-01'],
      userStories: ['US-002'],
      completed: false,
    },
  ];

  const sampleUserStories: UserStory[] = [
    {
      id: 'US-001',
      title: 'Story one',
      acceptanceCriteria: [],
    },
    {
      id: 'US-002',
      title: 'Story two',
      acceptanceCriteria: [],
    },
  ];

  it('creates mapping entries for each task', () => {
    const result = createTaskToUserStoryMapping(sampleTasks, sampleUserStories);

    expect(result).toHaveLength(2);
  });

  it('maps task IDs correctly', () => {
    const result = createTaskToUserStoryMapping(sampleTasks, sampleUserStories);

    expect(result[0].taskId).toBe('T-001');
    expect(result[1].taskId).toBe('T-002');
  });

  it('maps user story IDs from tasks', () => {
    const result = createTaskToUserStoryMapping(sampleTasks, sampleUserStories);

    expect(result[0].userStoryIds).toEqual(['US-001']);
    expect(result[1].userStoryIds).toEqual(['US-002']);
  });

  it('maps AC IDs from tasks', () => {
    const result = createTaskToUserStoryMapping(sampleTasks, sampleUserStories);

    expect(result[0].acIds).toEqual(['AC-US001-01', 'AC-US001-02']);
    expect(result[1].acIds).toEqual(['AC-US002-01']);
  });

  it('maps completion status from tasks', () => {
    const result = createTaskToUserStoryMapping(sampleTasks, sampleUserStories);

    expect(result[0].completed).toBe(true);
    expect(result[1].completed).toBe(false);
  });

  it('returns empty array for empty tasks', () => {
    const result = createTaskToUserStoryMapping([], sampleUserStories);

    expect(result).toEqual([]);
  });

  it('handles tasks with empty acIds and userStories', () => {
    const tasks: Task[] = [
      {
        id: 'T-001',
        title: 'Orphan task',
        acIds: [],
        userStories: [],
        completed: false,
      },
    ];

    const result = createTaskToUserStoryMapping(tasks, sampleUserStories);

    expect(result).toHaveLength(1);
    expect(result[0].acIds).toEqual([]);
    expect(result[0].userStoryIds).toEqual([]);
  });
});

// =========================================================================
// getCompletedUserStories
// =========================================================================
describe('getCompletedUserStories', () => {
  it('returns user stories where all related tasks are completed', () => {
    const mapping: SpecTaskMapping = {
      specId: 'spec-001',
      specPath: '/fake/spec.md',
      incrementId: '0001-feature',
      incrementPath: '/fake/0001-feature',
      userStories: [
        { id: 'US-001', title: 'Story one', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Story two', acceptanceCriteria: [] },
      ],
      tasks: [
        {
          id: 'T-001',
          title: 'Task A',
          acIds: ['AC-US001-01'],
          userStories: ['US-001'],
          completed: true,
        },
        {
          id: 'T-002',
          title: 'Task B',
          acIds: ['AC-US001-02'],
          userStories: ['US-001'],
          completed: true,
        },
        {
          id: 'T-003',
          title: 'Task C',
          acIds: ['AC-US002-01'],
          userStories: ['US-002'],
          completed: false,
        },
      ],
      mappings: [],
    };

    const result = getCompletedUserStories(mapping);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('US-001');
  });

  it('returns empty when no user stories have all tasks completed', () => {
    const mapping: SpecTaskMapping = {
      specId: 'spec-001',
      specPath: '/fake/spec.md',
      incrementId: '0001',
      incrementPath: '/fake/0001',
      userStories: [
        { id: 'US-001', title: 'Story one', acceptanceCriteria: [] },
      ],
      tasks: [
        {
          id: 'T-001',
          title: 'Task A',
          acIds: ['AC-US001-01'],
          userStories: ['US-001'],
          completed: false,
        },
      ],
      mappings: [],
    };

    const result = getCompletedUserStories(mapping);

    expect(result).toEqual([]);
  });

  it('excludes user stories with no related tasks', () => {
    const mapping: SpecTaskMapping = {
      specId: 'spec-001',
      specPath: '/fake/spec.md',
      incrementId: '0001',
      incrementPath: '/fake/0001',
      userStories: [
        { id: 'US-001', title: 'Story with tasks', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Story without tasks', acceptanceCriteria: [] },
      ],
      tasks: [
        {
          id: 'T-001',
          title: 'Task A',
          acIds: ['AC-US001-01'],
          userStories: ['US-001'],
          completed: true,
        },
      ],
      mappings: [],
    };

    const result = getCompletedUserStories(mapping);

    // US-2 has no tasks, so it should NOT be in completed list
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('US-001');
  });

  it('returns all user stories when everything is completed', () => {
    const mapping: SpecTaskMapping = {
      specId: 'spec-001',
      specPath: '/fake/spec.md',
      incrementId: '0001',
      incrementPath: '/fake/0001',
      userStories: [
        { id: 'US-001', title: 'Story one', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Story two', acceptanceCriteria: [] },
      ],
      tasks: [
        {
          id: 'T-001',
          title: 'Task A',
          acIds: ['AC-US001-01'],
          userStories: ['US-001'],
          completed: true,
        },
        {
          id: 'T-002',
          title: 'Task B',
          acIds: ['AC-US002-01'],
          userStories: ['US-002'],
          completed: true,
        },
      ],
      mappings: [],
    };

    const result = getCompletedUserStories(mapping);

    expect(result).toHaveLength(2);
  });

  it('returns empty for mapping with no tasks', () => {
    const mapping: SpecTaskMapping = {
      specId: 'spec-001',
      specPath: '/fake/spec.md',
      incrementId: '0001',
      incrementPath: '/fake/0001',
      userStories: [
        { id: 'US-001', title: 'Story one', acceptanceCriteria: [] },
      ],
      tasks: [],
      mappings: [],
    };

    const result = getCompletedUserStories(mapping);

    expect(result).toEqual([]);
  });
});

// =========================================================================
// getRecentlyCompletedTasks
// =========================================================================
describe('getRecentlyCompletedTasks', () => {
  const baseMapping: SpecTaskMapping = {
    specId: 'spec-001',
    specPath: '/fake/spec.md',
    incrementId: '0001',
    incrementPath: '/fake/0001',
    userStories: [],
    tasks: [
      {
        id: 'T-001',
        title: 'Completed',
        acIds: [],
        userStories: [],
        completed: true,
      },
      {
        id: 'T-002',
        title: 'Pending',
        acIds: [],
        userStories: [],
        completed: false,
      },
      {
        id: 'T-003',
        title: 'Also completed',
        acIds: [],
        userStories: [],
        completed: true,
      },
    ],
    mappings: [],
  };

  it('returns all completed tasks', () => {
    const result = getRecentlyCompletedTasks(baseMapping);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('T-001');
    expect(result[1].id).toBe('T-003');
  });

  it('returns empty when no tasks are completed', () => {
    const mapping = {
      ...baseMapping,
      tasks: baseMapping.tasks.map((t) => ({ ...t, completed: false })),
    };

    const result = getRecentlyCompletedTasks(mapping);

    expect(result).toEqual([]);
  });

  it('returns all tasks when all are completed', () => {
    const mapping = {
      ...baseMapping,
      tasks: baseMapping.tasks.map((t) => ({ ...t, completed: true })),
    };

    const result = getRecentlyCompletedTasks(mapping);

    expect(result).toHaveLength(3);
  });

  it('ignores lastSyncDate parameter (returns all completed)', () => {
    const result = getRecentlyCompletedTasks(
      baseMapping,
      new Date('2099-01-01')
    );

    expect(result).toHaveLength(2);
  });

  it('returns empty for mapping with no tasks', () => {
    const mapping = { ...baseMapping, tasks: [] };

    const result = getRecentlyCompletedTasks(mapping);

    expect(result).toEqual([]);
  });
});

// =========================================================================
// getSpecTaskMapping
// =========================================================================
describe('getSpecTaskMapping', () => {
  it('returns full mapping when increment spec references a SPEC-ID and spec path is provided', async () => {
    // Call 1: read increment spec.md
    // Call 2: read the actual spec.md (parseSpec)
    // Call 3: read tasks.md (parseTasks)
    mockReadFile
      .mockResolvedValueOnce(INCREMENT_SPEC_WITH_REF) // increment spec.md
      .mockResolvedValueOnce(SPEC_CONTENT_BASIC) // actual spec.md
      .mockResolvedValueOnce(TASKS_CONTENT_BASIC); // tasks.md

    const result = await getSpecTaskMapping(
      '/project/.specweave/increments/0001-auth',
      '/project/.specweave/docs/internal/specs/feature/spec-042-user-auth.md'
    );

    expect(result).not.toBeNull();
    expect(result!.specId).toBe('spec-042');
    expect(result!.specPath).toBe(
      '/project/.specweave/docs/internal/specs/feature/spec-042-user-auth.md'
    );
    expect(result!.incrementId).toBe('0001-auth');
    expect(result!.incrementPath).toBe(
      '/project/.specweave/increments/0001-auth'
    );
    expect(result!.userStories).toHaveLength(2);
    expect(result!.tasks).toHaveLength(3);
    expect(result!.mappings).toHaveLength(3);
  });

  it('returns null when no spec reference and no spec path', async () => {
    mockReadFile.mockResolvedValueOnce(INCREMENT_SPEC_NO_REF);

    const result = await getSpecTaskMapping(
      '/project/.specweave/increments/0001-orphan'
    );

    expect(result).toBeNull();
  });

  it('returns null when increment spec cannot be read', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await getSpecTaskMapping('/nonexistent/path');

    expect(result).toBeNull();
  });

  it('uses findSpecPath when spec path not provided but SPEC-ID found', async () => {
    mockReadFile
      .mockResolvedValueOnce(INCREMENT_SPEC_WITH_REF) // increment spec.md
      .mockResolvedValueOnce(SPEC_CONTENT_BASIC) // actual spec.md
      .mockResolvedValueOnce(TASKS_CONTENT_BASIC); // tasks.md

    // Mock glob.sync to find spec file
    mockGlobSync.mockReturnValue([
      '/project/.specweave/docs/internal/specs/auth/spec-042-user-auth.md',
    ]);

    const result = await getSpecTaskMapping(
      '/project/.specweave/increments/0001-auth'
    );

    expect(result).not.toBeNull();
    expect(result!.specId).toBe('spec-042');
  });

  it('returns null when findSpecPath finds no matching files', async () => {
    mockReadFile.mockResolvedValueOnce(INCREMENT_SPEC_WITH_REF);
    mockGlobSync.mockReturnValue([]);

    const result = await getSpecTaskMapping(
      '/project/.specweave/increments/0001-auth'
    );

    expect(result).toBeNull();
  });

  it('populates mappings array with task-to-story links', async () => {
    mockReadFile
      .mockResolvedValueOnce(INCREMENT_SPEC_WITH_REF)
      .mockResolvedValueOnce(SPEC_CONTENT_BASIC)
      .mockResolvedValueOnce(TASKS_CONTENT_BASIC);

    const result = await getSpecTaskMapping(
      '/project/.specweave/increments/0001-auth',
      '/fake/spec.md'
    );

    expect(result!.mappings).toHaveLength(3);
    expect(result!.mappings[0].taskId).toBe('T-001');
    expect(result!.mappings[0].acIds).toEqual(['AC-US001-01', 'AC-US001-02']);
    expect(result!.mappings[0].completed).toBe(true);
  });
});

// =========================================================================
// findSpecForIncrement
// =========================================================================
describe('findSpecForIncrement', () => {
  it('returns spec path when mapping exists', async () => {
    mockReadFile
      .mockResolvedValueOnce(INCREMENT_SPEC_WITH_REF)
      .mockResolvedValueOnce(SPEC_CONTENT_BASIC)
      .mockResolvedValueOnce(TASKS_CONTENT_BASIC);

    mockGlobSync.mockReturnValue([
      '/project/.specweave/docs/internal/specs/auth/spec-042-user-auth.md',
    ]);

    const result = await findSpecForIncrement(
      '/project/.specweave/increments/0001-auth'
    );

    expect(result).toBe(
      '/project/.specweave/docs/internal/specs/auth/spec-042-user-auth.md'
    );
  });

  it('returns null when no mapping exists', async () => {
    mockReadFile.mockResolvedValueOnce(INCREMENT_SPEC_NO_REF);

    const result = await findSpecForIncrement(
      '/project/.specweave/increments/0001-orphan'
    );

    expect(result).toBeNull();
  });

  it('returns null when increment path is invalid', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await findSpecForIncrement('/nonexistent/path');

    expect(result).toBeNull();
  });
});

// =========================================================================
// Integration-style: parseSpec + parseTasks + createTaskToUserStoryMapping
// =========================================================================
describe('integration: parseSpec + parseTasks + createTaskToUserStoryMapping', () => {
  it('creates end-to-end mapping from spec and tasks content', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_BASIC);
    const userStories = await parseSpec('/fake/spec.md');

    mockReadFile.mockResolvedValueOnce(TASKS_CONTENT_BASIC);
    const tasks = await parseTasks('/fake/tasks.md');

    const mappings = createTaskToUserStoryMapping(tasks, userStories);

    // Verify the full chain
    expect(userStories).toHaveLength(2);
    expect(tasks).toHaveLength(3);
    expect(mappings).toHaveLength(3);

    // T-001 maps to US-1 via AC-US001-01, AC-US001-02
    expect(mappings[0].taskId).toBe('T-001');
    expect(mappings[0].userStoryIds).toEqual(['US-001']);
    expect(mappings[0].acIds).toEqual(['AC-US001-01', 'AC-US001-02']);
    expect(mappings[0].completed).toBe(true);

    // T-003 maps to US-2 via AC-US002-01, AC-US002-02
    expect(mappings[2].taskId).toBe('T-003');
    expect(mappings[2].userStoryIds).toEqual(['US-002']);
    expect(mappings[2].acIds).toEqual(['AC-US002-01', 'AC-US002-02']);
    expect(mappings[2].completed).toBe(false);
  });

  it('handles empty spec with tasks gracefully', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_EMPTY);
    const userStories = await parseSpec('/fake/spec.md');

    mockReadFile.mockResolvedValueOnce(TASKS_CONTENT_BASIC);
    const tasks = await parseTasks('/fake/tasks.md');

    const mappings = createTaskToUserStoryMapping(tasks, userStories);

    expect(userStories).toEqual([]);
    expect(tasks).toHaveLength(3);
    expect(mappings).toHaveLength(3);
    // Tasks still have their AC-IDs even without matching spec entries
    expect(mappings[0].acIds).toEqual(['AC-US001-01', 'AC-US001-02']);
  });

  it('handles spec with no matching tasks', async () => {
    mockReadFile.mockResolvedValueOnce(SPEC_CONTENT_BASIC);
    const userStories = await parseSpec('/fake/spec.md');

    mockReadFile.mockResolvedValueOnce(TASKS_CONTENT_EMPTY);
    const tasks = await parseTasks('/fake/tasks.md');

    const mappings = createTaskToUserStoryMapping(tasks, userStories);

    expect(userStories).toHaveLength(2);
    expect(tasks).toEqual([]);
    expect(mappings).toEqual([]);
  });
});

// =========================================================================
// Edge cases: malformed input
// =========================================================================
describe('edge cases: malformed input', () => {
  it('parseSpec handles content with only partial US pattern', async () => {
    const content = `# Spec
**US-**: Missing number
**US-abc**: Non-numeric
Regular text mentioning US-001 without bold.
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    // Only **US-NNN** pattern should match (requires digits)
    expect(result).toEqual([]);
  });

  it('parseTasks handles content with only partial task pattern', async () => {
    const content = `# Tasks
# T-001: Single hash (wrong level)
## Not a task heading
## T-: Missing number
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseTasks('/fake/tasks.md');

    // Only ## T-NNN: pattern should match; # (single) and "## T-:" (no number) should not
    expect(result).toEqual([]);
  });

  it('parseSpec handles AC without closing paren in metadata', async () => {
    const content = `# Spec

**US-001**: Story
- [ ] **AC-US001-01**: Description (P1, testable
- [x] **AC-US001-02**: Another (P2
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    // Without closing paren, the metadata group won't match
    // The AC description regex requires (**AC-USn-nn**): desc (metadata)
    // If no closing paren, the optional metadata group won't capture
    expect(result[0].acceptanceCriteria).toHaveLength(2);
    // No metadata captured means no priority, not testable
    expect(result[0].acceptanceCriteria[0].priority).toBeUndefined();
    expect(result[0].acceptanceCriteria[0].testable).toBe(false);
  });

  it('parseTasks handles task with AC line but no valid AC-IDs', async () => {
    const content = `# Tasks

## T-001: Task with invalid ACs
**AC**: something-invalid, not-an-ac-id
**Status**: [ ] pending
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseTasks('/fake/tasks.md');

    expect(result).toHaveLength(1);
    expect(result[0].acIds).toEqual([]);
    expect(result[0].userStories).toEqual([]);
  });

  it('parseSpec handles multiple user stories with same number', async () => {
    const content = `# Spec

**US-001**: First occurrence
- [x] **AC-US001-01**: First AC (P1)

**US-001**: Second occurrence (duplicate)
- [ ] **AC-US001-01**: Second AC (P1)
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    // Both should be parsed (the mapper does not deduplicate)
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('US-001');
    expect(result[1].id).toBe('US-001');
  });

  it('parseSpec handles large US numbers', async () => {
    const content = `# Spec

**US-999**: Large user story number
- [ ] **AC-US999-01**: AC for large US (P1)
- [ ] **AC-US999-99**: AC with large number (P2)
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseSpec('/fake/spec.md');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('US-999');
    expect(result[0].acceptanceCriteria).toHaveLength(2);
    expect(result[0].acceptanceCriteria[0].id).toBe('AC-US999-01');
    expect(result[0].acceptanceCriteria[1].id).toBe('AC-US999-99');
  });

  it('parseTasks handles whitespace variations in task headings', async () => {
    const content = `# Tasks

##  T-001:  Extra spaces in heading
**AC**: AC-US001-01
**Status**: [ ] pending
`;
    mockReadFile.mockResolvedValue(content);
    const result = await parseTasks('/fake/tasks.md');

    expect(result).toHaveLength(1);
    // The \\s+ in regex handles multiple spaces after ##
    expect(result[0].id).toBe('T-001');
    expect(result[0].title).toBe('Extra spaces in heading');
  });
});
