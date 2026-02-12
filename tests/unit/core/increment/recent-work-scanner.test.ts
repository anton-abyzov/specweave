import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit Tests: RecentWorkScanner
 *
 * Tests scanning of recently completed increments and tasks,
 * keyword matching, scoring, and display formatting.
 *
 * Dependencies mocked: MetadataManager (static), fs-native (existsSync, readFileSync)
 */

// --- Hoisted mocks ---
const { mockGetCompleted, mockGetActive, mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockGetCompleted: vi.fn(),
  mockGetActive: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: {
    getCompleted: mockGetCompleted,
    getActive: mockGetActive,
  },
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

import { RecentWorkScanner, RecentWorkMatch, TaskMatch } from '../../../../src/core/increment/recent-work-scanner.js';
import { IncrementStatus, IncrementType } from '../../../../src/core/types/increment-metadata.js';

// --- Helpers ---

function makeIncrement(id: string, lastActivity: string, status = IncrementStatus.COMPLETED) {
  return {
    id,
    status,
    type: IncrementType.FEATURE,
    created: '2025-01-01T00:00:00Z',
    lastActivity,
  };
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function todayISO(): string {
  return new Date().toISOString();
}

/**
 * Build a tasks.md string from an array of task descriptors.
 *
 * NOTE: The source code uses a regex with the `g` flag in `String.match()`:
 *   `line.match(/^(#{2,3}) (T-\d+): (.+)$/gm)`
 * With the `g` flag, `.match()` returns only matched substrings (no capture groups),
 * so `taskMatch[2]` (id) and `taskMatch[3]` (title) will be `undefined`.
 * Tasks are still *detected* (the match array is truthy), but id/title are undefined.
 */
function buildTasksMd(
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedDate?: string;
    description?: string;
    headerLevel?: number;
  }>
): string {
  let content = '# Tasks\n\n';
  for (const task of tasks) {
    const hashes = '#'.repeat(task.headerLevel ?? 3);
    content += `${hashes} ${task.id}: ${task.title}\n`;
    const statusChar = task.completed ? 'x' : ' ';
    let statusLine = `**Status**: [${statusChar}]`;
    if (task.completedDate) {
      statusLine += ` Completed: ${task.completedDate}`;
    }
    content += `${statusLine}\n`;
    if (task.description) {
      content += `${task.description}\n`;
    }
    content += '\n';
  }
  return content;
}

// --- Tests ---

describe('RecentWorkScanner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetCompleted.mockReturnValue([]);
    mockGetActive.mockReturnValue([]);
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('');
  });

  // ================================================================
  // scanRecentIncrements
  // ================================================================
  describe('scanRecentIncrements', () => {
    it('should return empty array when no completed increments exist', () => {
      mockGetCompleted.mockReturnValue([]);

      const result = RecentWorkScanner.scanRecentIncrements();

      expect(result).toEqual([]);
      expect(mockGetCompleted).toHaveBeenCalledOnce();
    });

    it('should include increment completed today', () => {
      const inc = makeIncrement('0001-feature', todayISO());
      mockGetCompleted.mockReturnValue([inc]);

      const result = RecentWorkScanner.scanRecentIncrements();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('0001-feature');
    });

    it('should include increment completed 3 days ago (within default 7)', () => {
      const inc = makeIncrement('0002-bugfix', daysAgoISO(3));
      mockGetCompleted.mockReturnValue([inc]);

      const result = RecentWorkScanner.scanRecentIncrements();

      expect(result).toHaveLength(1);
    });

    it('should exclude increment completed 10 days ago (beyond default 7)', () => {
      const inc = makeIncrement('0003-old', daysAgoISO(10));
      mockGetCompleted.mockReturnValue([inc]);

      const result = RecentWorkScanner.scanRecentIncrements();

      expect(result).toHaveLength(0);
    });

    it('should include increment completed exactly 7 days ago (edge case - on cutoff)', () => {
      // The cutoff is "now - 7 days". An increment at exactly that boundary
      // should be included because the comparison is >=.
      const inc = makeIncrement('0004-edge', daysAgoISO(7));
      mockGetCompleted.mockReturnValue([inc]);

      const result = RecentWorkScanner.scanRecentIncrements(7);

      // The cutoff date is set to midnight-ish of 7 days ago. Since daysAgoISO
      // returns current time minus 7 days, it should be >= cutoff.
      expect(result).toHaveLength(1);
    });

    it('should exclude increment just beyond the cutoff', () => {
      // 8 days ago is clearly outside 7-day window
      const inc = makeIncrement('0005-beyond', daysAgoISO(8));
      mockGetCompleted.mockReturnValue([inc]);

      const result = RecentWorkScanner.scanRecentIncrements(7);

      expect(result).toHaveLength(0);
    });

    it('should respect custom days parameter', () => {
      const inc3 = makeIncrement('0006-three-days', daysAgoISO(3));
      const inc10 = makeIncrement('0007-ten-days', daysAgoISO(10));
      mockGetCompleted.mockReturnValue([inc3, inc10]);

      // 5-day window: only the 3-day one passes
      const result = RecentWorkScanner.scanRecentIncrements(5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('0006-three-days');
    });

    it('should return multiple recent increments', () => {
      const inc1 = makeIncrement('0008-a', daysAgoISO(1));
      const inc2 = makeIncrement('0009-b', daysAgoISO(2));
      const inc3 = makeIncrement('0010-c', daysAgoISO(6));
      mockGetCompleted.mockReturnValue([inc1, inc2, inc3]);

      const result = RecentWorkScanner.scanRecentIncrements();

      expect(result).toHaveLength(3);
    });

    it('should handle days=0 (only items from today)', () => {
      // Use a timestamp slightly in the future to avoid race with cutoff calculation
      const futureISO = new Date(Date.now() + 1000).toISOString();
      const incToday = makeIncrement('0011-today', futureISO);
      const incYesterday = makeIncrement('0012-yesterday', daysAgoISO(1));
      mockGetCompleted.mockReturnValue([incToday, incYesterday]);

      const result = RecentWorkScanner.scanRecentIncrements(0);

      // cutoff is exactly now; the future-dated item should pass, yesterday should not
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('0011-today');
    });
  });

  // ================================================================
  // scanActiveIncrements
  // ================================================================
  describe('scanActiveIncrements', () => {
    it('should return MetadataManager.getActive() result', () => {
      const active = [
        makeIncrement('0020-active', todayISO(), IncrementStatus.ACTIVE),
      ];
      mockGetActive.mockReturnValue(active);

      const result = RecentWorkScanner.scanActiveIncrements();

      expect(result).toEqual(active);
      expect(mockGetActive).toHaveBeenCalledOnce();
    });

    it('should return empty array when no active increments', () => {
      mockGetActive.mockReturnValue([]);

      const result = RecentWorkScanner.scanActiveIncrements();

      expect(result).toEqual([]);
    });

    it('should return multiple active increments', () => {
      const active = [
        makeIncrement('0021-a', todayISO(), IncrementStatus.ACTIVE),
        makeIncrement('0022-b', todayISO(), IncrementStatus.ACTIVE),
      ];
      mockGetActive.mockReturnValue(active);

      const result = RecentWorkScanner.scanActiveIncrements();

      expect(result).toHaveLength(2);
    });
  });

  // ================================================================
  // scanRecentTasks
  // ================================================================
  describe('scanRecentTasks', () => {
    it('should return empty when no increments exist', () => {
      mockGetActive.mockReturnValue([]);
      mockGetCompleted.mockReturnValue([]);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should return empty when tasks.md does not exist', () => {
      const inc = makeIncrement('0030-no-tasks', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should parse completed tasks with completion date within range', () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const inc = makeIncrement('0031-with-tasks', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'Setup auth', completed: true, completedDate: today },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      // Tasks are detected. Due to the `g` flag regex bug, id and title
      // will be undefined, but status and completedDate are parsed correctly.
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
      expect(result[0].completedDate).toBe(`${today}T00:00:00Z`);
      expect(result[0].incrementId).toBe('0031-with-tasks');
    });

    it('should exclude tasks completed outside the time window', () => {
      const oldDate = '2024-01-01';
      const inc = makeIncrement('0032-old-tasks', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'Old task', completed: true, completedDate: oldDate },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(0);
    });

    it('should exclude tasks without a completion date', () => {
      const inc = makeIncrement('0033-no-date', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      // Completed but no date
      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'No date task', completed: true },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      // Without a completedDate, the filter `if (!task.completedDate) return false` kicks in
      expect(result).toHaveLength(0);
    });

    it('should exclude pending tasks', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0034-pending', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'Pending task', completed: false },
        { id: 'T-002', title: 'Done task', completed: true, completedDate: today },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      // Only the completed task with a date within range should be returned
      expect(result).toHaveLength(1);
    });

    it('should deduplicate increments that appear in both active and recent', () => {
      const inc = makeIncrement('0035-overlap', todayISO(), IncrementStatus.ACTIVE);
      // Same increment in both active and completed
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([{ ...inc, status: IncrementStatus.COMPLETED }]);
      mockExistsSync.mockReturnValue(true);

      const today = new Date().toISOString().split('T')[0];
      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'Task A', completed: true, completedDate: today },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      // Should parse tasks only once despite the increment appearing in both lists
      expect(result).toHaveLength(1);
    });

    it('should parse tasks from multiple increments', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc1 = makeIncrement('0036-first', todayISO(), IncrementStatus.ACTIVE);
      const inc2 = makeIncrement('0037-second', daysAgoISO(2), IncrementStatus.COMPLETED);
      mockGetActive.mockReturnValue([inc1]);
      mockGetCompleted.mockReturnValue([inc2]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd1 = buildTasksMd([
        { id: 'T-001', title: 'First inc task', completed: true, completedDate: today },
      ]);
      const tasksMd2 = buildTasksMd([
        { id: 'T-001', title: 'Second inc task', completed: true, completedDate: today },
      ]);

      // Return different content based on path
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('0036-first')) return tasksMd1;
        if (filePath.includes('0037-second')) return tasksMd2;
        return '';
      });

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(2);
    });

    it('should respect custom days parameter', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      const inc = makeIncrement('0038-custom', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'Recent task', completed: true, completedDate: threeDaysAgoStr },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      // 2-day window: 3-day-old task should be excluded
      const resultNarrow = RecentWorkScanner.scanRecentTasks(2);
      expect(resultNarrow).toHaveLength(0);

      // 5-day window: 3-day-old task should be included
      const resultWide = RecentWorkScanner.scanRecentTasks(5);
      expect(resultWide).toHaveLength(1);
    });

    it('should handle tasks.md with ## (h2) headers', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0039-h2', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'H2 task', completed: true, completedDate: today, headerLevel: 2 },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(1);
    });

    it('should handle errors in parsing gracefully', () => {
      const inc = makeIncrement('0040-error', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // Should not throw, just return empty
      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should handle empty tasks.md file', () => {
      const inc = makeIncrement('0041-empty', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should handle tasks.md with no valid task headers', () => {
      const inc = makeIncrement('0042-noheaders', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('# Tasks\n\nSome random text without task headers\n');

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should collect description lines between tasks', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0043-desc', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: First Task',
        `**Status**: [x] Completed: ${today}`,
        'Some description text',
        'More description',
        '',
        '### T-002: Second Task',
        `**Status**: [x] Completed: ${today}`,
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      // Both tasks should be found. The first one should have description lines.
      expect(result).toHaveLength(2);
    });
  });

  // ================================================================
  // matchKeywords
  // ================================================================
  describe('matchKeywords', () => {
    it('should return empty when no matches found', () => {
      mockGetActive.mockReturnValue([]);
      mockGetCompleted.mockReturnValue([]);

      const result = RecentWorkScanner.matchKeywords(['nonexistent']);

      expect(result).toEqual([]);
    });

    it('should match increment by exact ID', () => {
      const inc = makeIncrement('auth', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('increment');
      expect(result[0].relevanceScore).toBe(10);
      expect(result[0].matchedKeywords).toContain('auth');
    });

    it('should match increment by partial ID', () => {
      const inc = makeIncrement('0050-authentication-flow', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      expect(result).toHaveLength(1);
      expect(result[0].relevanceScore).toBe(5);
    });

    it('should be case insensitive for increment matching', () => {
      const inc = makeIncrement('0051-Auth-Module', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      expect(result).toHaveLength(1);
      expect(result[0].relevanceScore).toBe(5); // Partial match (case insensitive)
    });

    it('should accumulate scores for multiple keyword matches on same increment', () => {
      const inc = makeIncrement('0052-auth-login', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth', 'login']);

      expect(result).toHaveLength(1);
      // Both are partial matches: 5 + 5 = 10
      expect(result[0].relevanceScore).toBe(10);
      expect(result[0].matchedKeywords).toContain('auth');
      expect(result[0].matchedKeywords).toContain('login');
    });

    it('should not match increment when keyword not in ID', () => {
      const inc = makeIncrement('0053-payments', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      expect(result).toHaveLength(0);
    });

    it('should throw when scoring tasks because title is undefined (g-flag regex bug)', () => {
      // BUG: parseTasksFromIncrement uses /^(#{2,3}) (T-\d+): (.+)$/gm with String.match().
      // The `g` flag causes .match() to return only full match strings (no capture groups),
      // so task.id and task.title are undefined. When scoreTaskMatch calls
      // task.title.toLowerCase(), it throws TypeError.
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0054-feature', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = buildTasksMd([
        { id: 'T-001', title: 'Setup authentication service', completed: true, completedDate: today },
      ]);
      mockReadFileSync.mockReturnValue(tasksMd);

      expect(() => RecentWorkScanner.matchKeywords(['authentication'])).toThrow(TypeError);
    });

    it('should throw on task scoring due to undefined title (g-flag regex bug)', () => {
      // BUG: Same g-flag issue as above. task.title is undefined after parsing,
      // causing scoreTaskMatch to crash on title.toLowerCase().
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0055-feature', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Some task',
        `**Status**: [x] Completed: ${today}`,
        'Implement authentication for the login flow',
        '',
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      expect(() => RecentWorkScanner.matchKeywords(['authentication'])).toThrow(TypeError);
    });

    it('should sort results by relevance score descending', () => {
      const inc1 = makeIncrement('auth', todayISO(), IncrementStatus.ACTIVE);
      const inc2 = makeIncrement('0056-auth-module', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc1, inc2]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      expect(result).toHaveLength(2);
      // Exact match (10) should come before partial (5)
      expect(result[0].relevanceScore).toBeGreaterThanOrEqual(result[1].relevanceScore);
      expect(result[0].relevanceScore).toBe(10);
      expect(result[1].relevanceScore).toBe(5);
    });

    it('should include matches from both active and recent completed increments', () => {
      const activeInc = makeIncrement('0057-auth-active', todayISO(), IncrementStatus.ACTIVE);
      const completedInc = makeIncrement('0058-auth-done', daysAgoISO(2), IncrementStatus.COMPLETED);
      mockGetActive.mockReturnValue([activeInc]);
      mockGetCompleted.mockReturnValue([completedInc]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      expect(result).toHaveLength(2);
    });

    it('should set correct fields on increment match', () => {
      const inc = makeIncrement('0059-login-flow', daysAgoISO(1), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['login']);

      expect(result).toHaveLength(1);
      const match = result[0];
      expect(match.type).toBe('increment');
      expect(match.id).toBe('0059-login-flow');
      expect(match.incrementId).toBe('0059-login-flow');
      expect(match.title).toBe('0059-login-flow');
      expect(match.completedDate).toBe(inc.lastActivity);
      expect(match.matchedKeywords).toEqual(['login']);
      expect(match.matchDetails).toContain('Partial match');
    });

    it('should set match details with exact match label', () => {
      const inc = makeIncrement('login', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords(['login']);

      expect(result[0].matchDetails).toContain('Exact match');
    });

    it('should respect days parameter for increments', () => {
      const oldInc = makeIncrement('0060-auth-old', daysAgoISO(10), IncrementStatus.COMPLETED);
      mockGetActive.mockReturnValue([]);
      mockGetCompleted.mockReturnValue([oldInc]);
      mockExistsSync.mockReturnValue(false);

      // 5-day window: old increment excluded
      const result = RecentWorkScanner.matchKeywords(['auth'], 5);

      expect(result).toHaveLength(0);
    });

    it('should handle empty keywords array', () => {
      const inc = makeIncrement('0061-feature', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.matchKeywords([]);

      // No keywords to match, so scores are all 0 and nothing passes
      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // scoreIncrementMatch (tested through matchKeywords)
  // ================================================================
  describe('scoreIncrementMatch (via matchKeywords)', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
      mockGetCompleted.mockReturnValue([]);
    });

    it('should give 10 points for exact ID match', () => {
      const inc = makeIncrement('bugfix', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);

      const result = RecentWorkScanner.matchKeywords(['bugfix']);

      expect(result[0].relevanceScore).toBe(10);
    });

    it('should give 5 points for partial ID match', () => {
      const inc = makeIncrement('0070-bugfix-login', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);

      const result = RecentWorkScanner.matchKeywords(['bugfix']);

      expect(result[0].relevanceScore).toBe(5);
    });

    it('should be case insensitive for exact match', () => {
      const inc = makeIncrement('BugFix', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);

      const result = RecentWorkScanner.matchKeywords(['bugfix']);

      expect(result[0].relevanceScore).toBe(10);
    });

    it('should be case insensitive for partial match', () => {
      const inc = makeIncrement('0071-BugFix-Module', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);

      const result = RecentWorkScanner.matchKeywords(['bugfix']);

      expect(result[0].relevanceScore).toBe(5);
    });

    it('should accumulate scores from multiple keywords', () => {
      const inc = makeIncrement('0072-login-auth', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);

      const result = RecentWorkScanner.matchKeywords(['login', 'auth']);

      // Both partial matches: 5 + 5 = 10
      expect(result[0].relevanceScore).toBe(10);
      expect(result[0].matchedKeywords).toHaveLength(2);
    });

    it('should not double-score: exact takes priority over partial', () => {
      // If keyword matches exactly, the else-if for partial is skipped
      const inc = makeIncrement('auth', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);

      const result = RecentWorkScanner.matchKeywords(['auth']);

      // Only exact match: 10 points (not 10+5)
      expect(result[0].relevanceScore).toBe(10);
    });
  });

  // ================================================================
  // scoreTaskMatch (tested through matchKeywords)
  // ================================================================
  describe('scoreTaskMatch (via matchKeywords)', () => {
    beforeEach(() => {
      mockGetCompleted.mockReturnValue([]);
    });

    it('should throw when scoring task with undefined title (g-flag regex bug)', () => {
      // BUG: task.title is undefined due to g-flag regex in parseTasksFromIncrement.
      // scoreTaskMatch crashes on task.title.toLowerCase().
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0080-unrelated', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Some task',
        `**Status**: [x] Completed: ${today}`,
        'Need to fix the authentication bug here',
        '',
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      expect(() => RecentWorkScanner.matchKeywords(['authentication'])).toThrow(TypeError);
    });

    it('should throw on title.toLowerCase() when title is undefined (g-flag regex bug)', () => {
      // BUG: Same g-flag issue. title is undefined, scoreTaskMatch crashes.
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0081-unrelated', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Authentication service',
        `**Status**: [x] Completed: ${today}`,
        'Handles authentication for the app',
        '',
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      expect(() => RecentWorkScanner.matchKeywords(['authentication'])).toThrow(TypeError);
    });
  });

  // ================================================================
  // parseTasksFromIncrement (tested through scanRecentTasks)
  // ================================================================
  describe('parseTasksFromIncrement (via scanRecentTasks)', () => {
    it('should parse ### T-NNN: Title format', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0090-parse', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: First task',
        `**Status**: [x] Completed: ${today}`,
        '',
        '### T-002: Second task',
        `**Status**: [x] Completed: ${today}`,
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(2);
    });

    it('should parse ## T-NNN: Title format', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0091-h2', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '## T-010: H2 format task',
        `**Status**: [x] Completed: ${today}`,
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(1);
    });

    it('should set status to completed for [x]', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0092-status', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Completed task',
        `**Status**: [x] Completed: ${today}`,
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('should set status to pending for [ ]', () => {
      const inc = makeIncrement('0093-pending', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Pending task',
        '**Status**: [ ] pending',
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      // scanRecentTasks filters to completed tasks with dates, so this won't appear
      // But we can verify the parsing works by checking it doesn't appear
      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(0); // Pending task excluded by date filter
    });

    it('should extract completion date from "Completed: YYYY-MM-DD" pattern', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0094-date', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Dated task',
        `**Status**: [x] Completed: ${today}`,
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(1);
      expect(result[0].completedDate).toBe(`${today}T00:00:00Z`);
    });

    it('should return empty when tasks.md does not exist', () => {
      const inc = makeIncrement('0095-missing', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should handle malformed content gracefully', () => {
      const inc = makeIncrement('0096-malformed', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{{{{invalid content not markdown}}}}');

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toEqual([]);
    });

    it('should handle multiple tasks with interleaved descriptions', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0097-multi', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Task one',
        `**Status**: [x] Completed: ${today}`,
        'Description for task one',
        'More details about task one',
        '',
        '### T-002: Task two',
        `**Status**: [x] Completed: ${today}`,
        'Description for task two',
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(2);
    });

    it('should save the last task when reaching end of file', () => {
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0098-last', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      // Only one task, no trailing content
      const tasksMd = [
        '### T-001: Only task',
        `**Status**: [x] Completed: ${today}`,
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      const result = RecentWorkScanner.scanRecentTasks();

      expect(result).toHaveLength(1);
    });
  });

  // ================================================================
  // formatMatches
  // ================================================================
  describe('formatMatches', () => {
    it('should return "No related work found" for empty matches', () => {
      const result = RecentWorkScanner.formatMatches([]);

      expect(result).toContain('No related work found');
    });

    it('should format a single increment match', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0100-auth',
        incrementId: '0100-auth',
        title: '0100-auth',
        completedDate: todayISO(),
        relevanceScore: 10,
        matchedKeywords: ['auth'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('INCREMENT');
      expect(result).toContain('0100-auth');
      expect(result).toContain('10 points');
      expect(result).toContain('auth');
    });

    it('should format a single task match', () => {
      const match: RecentWorkMatch = {
        type: 'task',
        id: 'T-001',
        incrementId: '0101-feature',
        title: 'Fix login bug',
        completedDate: todayISO(),
        relevanceScore: 7,
        matchedKeywords: ['login'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('TASK');
      expect(result).toContain('Fix login bug');
      expect(result).toContain('7 points');
    });

    it('should limit output to maxResults', () => {
      const matches: RecentWorkMatch[] = Array.from({ length: 10 }, (_, i) => ({
        type: 'increment' as const,
        id: `inc-${i}`,
        incrementId: `inc-${i}`,
        title: `Increment ${i}`,
        completedDate: todayISO(),
        relevanceScore: 10 - i,
        matchedKeywords: ['test'],
      }));

      const result = RecentWorkScanner.formatMatches(matches, 3);

      // Should show "Found 10 related item(s)" but only render 3
      expect(result).toContain('Found 10 related item(s)');
      // Count occurrences of "INCREMENT" in output
      const incrementCount = (result.match(/INCREMENT/g) || []).length;
      expect(incrementCount).toBe(3);
    });

    it('should default maxResults to 5', () => {
      const matches: RecentWorkMatch[] = Array.from({ length: 8 }, (_, i) => ({
        type: 'increment' as const,
        id: `inc-${i}`,
        incrementId: `inc-${i}`,
        title: `Increment ${i}`,
        completedDate: todayISO(),
        relevanceScore: 8 - i,
        matchedKeywords: ['test'],
      }));

      const result = RecentWorkScanner.formatMatches(matches);

      const incrementCount = (result.match(/INCREMENT/g) || []).length;
      expect(incrementCount).toBe(5);
    });

    it('should suggest /sw:reopen for increment matches', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0102-auth',
        incrementId: '0102-auth',
        title: '0102-auth',
        completedDate: todayISO(),
        relevanceScore: 10,
        matchedKeywords: ['auth'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('/sw:reopen 0102-auth');
      expect(result).not.toContain('--task');
    });

    it('should suggest /sw:reopen with --task for task matches', () => {
      const match: RecentWorkMatch = {
        type: 'task',
        id: 'T-001',
        incrementId: '0103-feature',
        title: 'Fix bug',
        completedDate: todayISO(),
        relevanceScore: 7,
        matchedKeywords: ['bug'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('/sw:reopen 0103-feature --task T-001');
    });

    it('should show count header', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0104-test',
        incrementId: '0104-test',
        title: '0104-test',
        completedDate: todayISO(),
        relevanceScore: 5,
        matchedKeywords: ['test'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Found 1 related item(s)');
    });

    it('should include increment ID line for each match', () => {
      const match: RecentWorkMatch = {
        type: 'task',
        id: 'T-005',
        incrementId: '0105-payments',
        title: 'Process refund',
        completedDate: todayISO(),
        relevanceScore: 7,
        matchedKeywords: ['refund'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Increment: 0105-payments');
    });

    it('should show matched keywords', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0106-auth-login',
        incrementId: '0106-auth-login',
        title: '0106-auth-login',
        completedDate: todayISO(),
        relevanceScore: 10,
        matchedKeywords: ['auth', 'login'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Matched: auth, login');
    });
  });

  // ================================================================
  // getDaysAgo (tested through formatMatches)
  // ================================================================
  describe('getDaysAgo (via formatMatches)', () => {
    it('should show "today" for current date', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0110-today',
        incrementId: '0110-today',
        title: '0110-today',
        completedDate: todayISO(),
        relevanceScore: 5,
        matchedKeywords: ['today'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Completed: today');
    });

    it('should show "1 day ago" for yesterday', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0111-yesterday',
        incrementId: '0111-yesterday',
        title: '0111-yesterday',
        completedDate: daysAgoISO(1),
        relevanceScore: 5,
        matchedKeywords: ['yesterday'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Completed: 1 day ago');
    });

    it('should show "N days ago" for older dates', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0112-old',
        incrementId: '0112-old',
        title: '0112-old',
        completedDate: daysAgoISO(5),
        relevanceScore: 5,
        matchedKeywords: ['old'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Completed: 5 days ago');
    });

    it('should show "3 days ago" for 3-day-old date', () => {
      const match: RecentWorkMatch = {
        type: 'increment',
        id: '0113-three',
        incrementId: '0113-three',
        title: '0113-three',
        completedDate: daysAgoISO(3),
        relevanceScore: 5,
        matchedKeywords: ['three'],
      };

      const result = RecentWorkScanner.formatMatches([match]);

      expect(result).toContain('Completed: 3 days ago');
    });
  });

  // ================================================================
  // Integration-style: end-to-end keyword search
  // ================================================================
  describe('end-to-end keyword search', () => {
    it('should throw when tasks exist due to undefined title in scoreTaskMatch (g-flag bug)', () => {
      // When tasks are found and keyword matching is attempted, the g-flag regex
      // bug causes task.title to be undefined, crashing scoreTaskMatch.
      const today = new Date().toISOString().split('T')[0];
      const inc = makeIncrement('0120-auth-service', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const tasksMd = [
        '### T-001: Setup auth module',
        `**Status**: [x] Completed: ${today}`,
        'Implement the auth service',
        '',
      ].join('\n');
      mockReadFileSync.mockReturnValue(tasksMd);

      expect(() => RecentWorkScanner.matchKeywords(['auth'])).toThrow(TypeError);
    });

    it('should find increment matches when no tasks exist', () => {
      const inc = makeIncrement('0120-auth-service', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false); // No tasks.md

      const result = RecentWorkScanner.matchKeywords(['auth']);

      const incMatches = result.filter(m => m.type === 'increment');
      expect(incMatches).toHaveLength(1);
      expect(incMatches[0].relevanceScore).toBe(5);
    });

    it('should format end-to-end results correctly', () => {
      const inc = makeIncrement('0121-login', todayISO(), IncrementStatus.ACTIVE);
      mockGetActive.mockReturnValue([inc]);
      mockGetCompleted.mockReturnValue([]);
      mockExistsSync.mockReturnValue(false);

      const matches = RecentWorkScanner.matchKeywords(['login']);
      const formatted = RecentWorkScanner.formatMatches(matches);

      expect(formatted).toContain('Found 1 related item(s)');
      expect(formatted).toContain('0121-login');
      expect(formatted).toContain('/sw:reopen');
    });
  });
});
