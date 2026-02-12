/**
 * Unit Tests: Smart Filter Module
 *
 * Tests JQL/WIQL validation, filter application, and project filtering logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateJQL,
  validateWIQL,
  applyFilters,
  type FilterCriteria,
  type FilterResult,
  type FilterProvider,
} from '../../../../src/cli/helpers/smart-filter.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock chalk to return plain strings (avoid ANSI in assertions)
const { mockChalk } = vi.hoisted(() => {
  const handler: ProxyHandler<any> = {
    get: () => new Proxy(((s: string) => s) as any, handler),
    apply: (_target: any, _thisArg: any, args: any[]) => args[0],
  };
  return { mockChalk: new Proxy(((s: string) => s) as any, handler) };
});

vi.mock('chalk', () => ({ default: mockChalk }));

// Mock @inquirer/prompts (interactive functions — not tested here)
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal project stub for filter tests */
function makeProject(overrides: Record<string, any> = {}) {
  return {
    key: 'PROJ',
    name: 'Project',
    archived: false,
    deleted: false,
    status: 'active',
    state: 'active',
    ...overrides,
  };
}

/** Build a default FilterCriteria with overrides */
function makeCriteria(overrides: Partial<FilterCriteria> = {}): FilterCriteria {
  return {
    provider: 'jira',
    excludeArchived: false,
    excludeDeleted: false,
    onlyActive: false,
    ...overrides,
  };
}

// ─── validateJQL ──────────────────────────────────────────────────────────────

describe('validateJQL', () => {
  describe('empty / whitespace input', () => {
    it('should reject empty string', () => {
      const result = validateJQL('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JQL query cannot be empty');
    });

    it('should reject whitespace-only string', () => {
      const result = validateJQL('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JQL query cannot be empty');
    });

    it('should reject null-ish coerced values', () => {
      // TypeScript types say string, but defensive code handles falsy
      const result = validateJQL(undefined as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JQL query cannot be empty');
    });
  });

  describe('parenthesis balancing', () => {
    it('should reject unbalanced opening parenthesis', () => {
      const result = validateJQL('project = TEST AND (status = Open');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unbalanced parentheses in JQL query');
    });

    it('should reject unbalanced closing parenthesis', () => {
      const result = validateJQL('project = TEST AND status = Open)');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unbalanced parentheses in JQL query');
    });

    it('should accept balanced nested parentheses', () => {
      const result = validateJQL('project = TEST AND (status = Open OR (priority = High AND type = Bug))');
      expect(result.valid).toBe(true);
    });

    it('should accept query with no parentheses', () => {
      const result = validateJQL('project = TEST');
      expect(result.valid).toBe(true);
    });
  });

  describe('valid JQL keywords', () => {
    const validKeywords = [
      'project', 'type', 'status', 'priority', 'assignee', 'reporter',
      'created', 'updated', 'resolved', 'labels', 'component', 'fixVersion',
      'affectsVersion', 'sprint', 'epic', 'parent', 'key',
    ];

    for (const keyword of validKeywords) {
      it(`should accept keyword "${keyword}"`, () => {
        const result = validateJQL(`${keyword} = someValue`);
        expect(result.valid).toBe(true);
      });
    }

    it('should accept keywords case-insensitively', () => {
      expect(validateJQL('PROJECT = TEST').valid).toBe(true);
      expect(validateJQL('Status = Open').valid).toBe(true);
      expect(validateJQL('PRIORITY = High').valid).toBe(true);
    });

    it('should reject query with no valid keyword', () => {
      const result = validateJQL('foo = bar');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must include at least one valid field');
    });
  });

  describe('valid operators', () => {
    const operators = ['=', '!=', 'IN', 'NOT IN', '~', '!~', '>', '<', '>=', '<=', 'IS', 'IS NOT'];

    for (const op of operators) {
      it(`should accept operator "${op}"`, () => {
        const result = validateJQL(`project ${op} TEST`);
        expect(result.valid).toBe(true);
      });
    }

    it('should reject query without any valid operator', () => {
      // "project" is a valid keyword, but no operator present
      const result = validateJQL('project TEST');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must include at least one valid operator');
    });
  });

  describe('complex valid queries', () => {
    it('should accept query with AND/OR and multiple fields', () => {
      const result = validateJQL('project = MYAPP AND status != Closed AND priority IN (High, Critical)');
      expect(result.valid).toBe(true);
    });

    it('should accept query with text search operator (~)', () => {
      const result = validateJQL('project = MYAPP AND labels ~ "backend"');
      expect(result.valid).toBe(true);
    });

    it('should accept query with IS NOT operator', () => {
      const result = validateJQL('assignee IS NOT EMPTY AND project = MYAPP');
      expect(result.valid).toBe(true);
    });

    it('should accept query with date comparison', () => {
      const result = validateJQL('project = MYAPP AND created >= "2024-01-01"');
      expect(result.valid).toBe(true);
    });
  });
});

// ─── validateWIQL ─────────────────────────────────────────────────────────────

describe('validateWIQL', () => {
  describe('empty / whitespace input', () => {
    it('should reject empty string', () => {
      const result = validateWIQL('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('WIQL query cannot be empty');
    });

    it('should reject whitespace-only string', () => {
      const result = validateWIQL('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('WIQL query cannot be empty');
    });

    it('should reject null-ish coerced values', () => {
      const result = validateWIQL(null as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('WIQL query cannot be empty');
    });
  });

  describe('SELECT requirement', () => {
    it('should reject query not starting with SELECT', () => {
      const result = validateWIQL('FROM WorkItems WHERE [System.State] = "Active"');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('WIQL query must start with SELECT');
    });

    it('should accept SELECT regardless of case', () => {
      const result = validateWIQL('select [System.Id] FROM WorkItems');
      expect(result.valid).toBe(true);
    });

    it('should accept SELECT with leading whitespace', () => {
      const result = validateWIQL('  SELECT [System.Id] FROM WorkItems');
      expect(result.valid).toBe(true);
    });
  });

  describe('FROM requirement', () => {
    it('should reject query missing FROM clause', () => {
      const result = validateWIQL('SELECT [System.Id]');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('WIQL query must include FROM clause');
    });

    it('should accept FROM regardless of case', () => {
      const result = validateWIQL('SELECT [System.Id] from WorkItems');
      expect(result.valid).toBe(true);
    });
  });

  describe('valid WIQL queries', () => {
    it('should accept basic SELECT FROM', () => {
      const result = validateWIQL('SELECT [System.Id] FROM WorkItems');
      expect(result.valid).toBe(true);
    });

    it('should accept query with WHERE clause', () => {
      const result = validateWIQL(
        'SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = "Active"'
      );
      expect(result.valid).toBe(true);
    });

    it('should accept query with ORDER BY', () => {
      const result = validateWIQL(
        'SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = "MyProject" ORDER BY [System.CreatedDate] DESC'
      );
      expect(result.valid).toBe(true);
    });
  });
});

// ─── applyFilters ─────────────────────────────────────────────────────────────

describe('applyFilters', () => {
  const sampleProjects = [
    makeProject({ key: 'ALPHA', name: 'Alpha', archived: false, deleted: false, status: 'active', state: 'active' }),
    makeProject({ key: 'BETA', name: 'Beta', archived: true, deleted: false, status: 'active', state: 'active' }),
    makeProject({ key: 'GAMMA', name: 'Gamma', archived: false, deleted: true, status: 'inactive', state: 'inactive' }),
    makeProject({ key: 'DELTA', name: 'Delta', archived: false, deleted: false, status: 'inactive', state: 'inactive' }),
    makeProject({ key: 'EPSILON', name: 'Epsilon', archived: true, deleted: true, status: 'active', state: 'active' }),
  ];

  describe('return shape', () => {
    it('should return correct total count', () => {
      const result = applyFilters(sampleProjects, makeCriteria());
      expect(result.total).toBe(5);
    });

    it('should return criteria in result', () => {
      const criteria = makeCriteria({ provider: 'ado' });
      const result = applyFilters(sampleProjects, criteria);
      expect(result.criteria).toBe(criteria);
    });

    it('should calculate excluded as total minus filtered', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ excludeArchived: true }));
      expect(result.excluded).toBe(result.total - result.filtered);
    });
  });

  describe('no filters applied', () => {
    it('should return all projects when no filters are set', () => {
      const result = applyFilters(sampleProjects, makeCriteria());
      expect(result.filtered).toBe(5);
      expect(result.excluded).toBe(0);
      expect(result.items).toHaveLength(5);
    });
  });

  describe('projectKeys filter', () => {
    it('should filter by exact project key', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ projectKeys: ['ALPHA'] }));
      expect(result.filtered).toBe(1);
      expect(result.items[0].key).toBe('ALPHA');
    });

    it('should filter by project name', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ projectKeys: ['Beta'] }));
      expect(result.filtered).toBe(1);
      expect(result.items[0].name).toBe('Beta');
    });

    it('should match multiple project keys', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ projectKeys: ['ALPHA', 'GAMMA', 'DELTA'] }));
      expect(result.filtered).toBe(3);
      const keys = result.items.map((p: any) => p.key);
      expect(keys).toContain('ALPHA');
      expect(keys).toContain('GAMMA');
      expect(keys).toContain('DELTA');
    });

    it('should match by either key or name', () => {
      // Match ALPHA by key, and 'Delta' by name
      const result = applyFilters(sampleProjects, makeCriteria({ projectKeys: ['ALPHA', 'Delta'] }));
      expect(result.filtered).toBe(2);
    });

    it('should return nothing if no keys match', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ projectKeys: ['NONEXISTENT'] }));
      expect(result.filtered).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should ignore empty projectKeys array (no filter)', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ projectKeys: [] }));
      expect(result.filtered).toBe(5);
    });
  });

  describe('excludeArchived filter', () => {
    it('should exclude archived projects', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ excludeArchived: true }));
      expect(result.filtered).toBe(3);
      const keys = result.items.map((p: any) => p.key);
      expect(keys).not.toContain('BETA');
      expect(keys).not.toContain('EPSILON');
    });

    it('should keep all when excludeArchived is false', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ excludeArchived: false }));
      expect(result.filtered).toBe(5);
    });
  });

  describe('excludeDeleted filter', () => {
    it('should exclude deleted projects', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ excludeDeleted: true }));
      expect(result.filtered).toBe(3);
      const keys = result.items.map((p: any) => p.key);
      expect(keys).not.toContain('GAMMA');
      expect(keys).not.toContain('EPSILON');
    });

    it('should keep all when excludeDeleted is false', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ excludeDeleted: false }));
      expect(result.filtered).toBe(5);
    });
  });

  describe('onlyActive filter', () => {
    it('should keep only projects with status=active', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ onlyActive: true }));
      // ALPHA (active), BETA (active), EPSILON (active) => 3
      expect(result.filtered).toBe(3);
      result.items.forEach((p: any) => {
        expect(p.status === 'active' || p.state === 'active').toBe(true);
      });
    });

    it('should match on state field as well as status field', () => {
      const projectsWithState = [
        makeProject({ key: 'P1', status: 'inactive', state: 'active' }),
        makeProject({ key: 'P2', status: 'active', state: 'closed' }),
        makeProject({ key: 'P3', status: 'closed', state: 'closed' }),
      ];
      const result = applyFilters(projectsWithState, makeCriteria({ onlyActive: true }));
      expect(result.filtered).toBe(2);
      const keys = result.items.map((p: any) => p.key);
      expect(keys).toContain('P1'); // state is active
      expect(keys).toContain('P2'); // status is active
    });

    it('should keep all when onlyActive is false', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ onlyActive: false }));
      expect(result.filtered).toBe(5);
    });
  });

  describe('combined filters', () => {
    it('should apply all filters together', () => {
      const result = applyFilters(sampleProjects, makeCriteria({
        excludeArchived: true,
        excludeDeleted: true,
        onlyActive: true,
      }));
      // ALPHA is the only non-archived, non-deleted, active project
      expect(result.filtered).toBe(1);
      expect(result.items[0].key).toBe('ALPHA');
    });

    it('should apply projectKeys AND excludeArchived together', () => {
      const result = applyFilters(sampleProjects, makeCriteria({
        projectKeys: ['ALPHA', 'BETA'],
        excludeArchived: true,
      }));
      // BETA is archived, so only ALPHA remains
      expect(result.filtered).toBe(1);
      expect(result.items[0].key).toBe('ALPHA');
    });

    it('should apply projectKeys AND excludeDeleted together', () => {
      const result = applyFilters(sampleProjects, makeCriteria({
        projectKeys: ['ALPHA', 'GAMMA'],
        excludeDeleted: true,
      }));
      // GAMMA is deleted, so only ALPHA remains
      expect(result.filtered).toBe(1);
      expect(result.items[0].key).toBe('ALPHA');
    });

    it('should apply projectKeys AND onlyActive together', () => {
      const result = applyFilters(sampleProjects, makeCriteria({
        projectKeys: ['ALPHA', 'DELTA'],
        onlyActive: true,
      }));
      // DELTA is inactive, so only ALPHA remains
      expect(result.filtered).toBe(1);
      expect(result.items[0].key).toBe('ALPHA');
    });

    it('should apply all four filters yielding empty result', () => {
      const result = applyFilters(sampleProjects, makeCriteria({
        projectKeys: ['EPSILON'],
        excludeArchived: true,
        excludeDeleted: true,
        onlyActive: true,
      }));
      // EPSILON is archived AND deleted
      expect(result.filtered).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project list', () => {
      const result = applyFilters([], makeCriteria({ excludeArchived: true }));
      expect(result.total).toBe(0);
      expect(result.filtered).toBe(0);
      expect(result.excluded).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should handle projects without archived/deleted/status fields', () => {
      const sparseProjects = [
        { key: 'P1', name: 'Minimal' },
        { key: 'P2', name: 'Also Minimal' },
      ];
      // excludeArchived: filter p => !p.archived — undefined is falsy, so !undefined = true => kept
      const result = applyFilters(sparseProjects, makeCriteria({
        excludeArchived: true,
        excludeDeleted: true,
      }));
      expect(result.filtered).toBe(2);
    });

    it('should exclude projects with truthy archived field (string)', () => {
      const projects = [
        makeProject({ key: 'P1', archived: 'yes' }),
        makeProject({ key: 'P2', archived: false }),
      ];
      const result = applyFilters(projects, makeCriteria({ excludeArchived: true }));
      expect(result.filtered).toBe(1);
      expect(result.items[0].key).toBe('P2');
    });

    it('should handle onlyActive when neither status nor state is "active"', () => {
      const projects = [
        makeProject({ key: 'P1', status: 'closed', state: 'closed' }),
        makeProject({ key: 'P2', status: 'paused', state: 'paused' }),
      ];
      const result = applyFilters(projects, makeCriteria({ onlyActive: true }));
      expect(result.filtered).toBe(0);
    });

    it('should handle single project list', () => {
      const projects = [makeProject({ key: 'ONLY' })];
      const result = applyFilters(projects, makeCriteria({ excludeArchived: true }));
      expect(result.total).toBe(1);
      expect(result.filtered).toBe(1);
    });

    it('should handle large project list', () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => makeProject({
        key: `P${i}`,
        name: `Project ${i}`,
        archived: i % 3 === 0,
        status: i % 2 === 0 ? 'active' : 'inactive',
        state: i % 2 === 0 ? 'active' : 'inactive',
      }));
      const result = applyFilters(largeList, makeCriteria({
        excludeArchived: true,
        onlyActive: true,
      }));
      // Not archived (i%3 !== 0) AND active (i%2 === 0)
      // i%3 !== 0 AND i%2 === 0 => count from 0..999
      const expected = largeList.filter(p => !p.archived && (p.status === 'active' || p.state === 'active'));
      expect(result.filtered).toBe(expected.length);
    });
  });

  describe('provider field', () => {
    it('should work identically for jira provider', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ provider: 'jira', excludeArchived: true }));
      expect(result.filtered).toBe(3);
      expect(result.criteria.provider).toBe('jira');
    });

    it('should work identically for ado provider', () => {
      const result = applyFilters(sampleProjects, makeCriteria({ provider: 'ado', excludeArchived: true }));
      expect(result.filtered).toBe(3);
      expect(result.criteria.provider).toBe('ado');
    });
  });
});

// ─── FilterResult type contract ───────────────────────────────────────────────

describe('FilterResult contract', () => {
  it('should satisfy total = filtered + excluded', () => {
    const projects = Array.from({ length: 20 }, (_, i) => makeProject({
      key: `K${i}`,
      archived: i % 4 === 0,
      deleted: i % 5 === 0,
      status: i % 3 === 0 ? 'inactive' : 'active',
      state: i % 3 === 0 ? 'inactive' : 'active',
    }));

    const result = applyFilters(projects, makeCriteria({
      excludeArchived: true,
      excludeDeleted: true,
      onlyActive: true,
    }));

    expect(result.total).toBe(result.filtered + result.excluded);
  });

  it('should return items array matching filtered count', () => {
    const projects = [
      makeProject({ key: 'A' }),
      makeProject({ key: 'B', archived: true }),
      makeProject({ key: 'C' }),
    ];
    const result = applyFilters(projects, makeCriteria({ excludeArchived: true }));
    expect(result.items.length).toBe(result.filtered);
  });
});

// ─── FilterProvider type ──────────────────────────────────────────────────────

describe('FilterProvider type', () => {
  it('should accept "jira" as a valid provider', () => {
    const criteria: FilterCriteria = { provider: 'jira' };
    expect(criteria.provider).toBe('jira');
  });

  it('should accept "ado" as a valid provider', () => {
    const criteria: FilterCriteria = { provider: 'ado' };
    expect(criteria.provider).toBe('ado');
  });
});

// ─── Cross-validation integration ─────────────────────────────────────────────

describe('cross-function integration', () => {
  it('should validate JQL before using criteria with query', () => {
    const jql = 'project = MYAPP AND status != Closed';
    const validation = validateJQL(jql);
    expect(validation.valid).toBe(true);

    // Use the validated query in criteria
    const criteria = makeCriteria({ query: jql, excludeArchived: true });
    const projects = [
      makeProject({ key: 'MYAPP', name: 'My App' }),
      makeProject({ key: 'OTHER', name: 'Other', archived: true }),
    ];

    // applyFilters does not use the query field — it is for API calls
    // But the criteria should carry the query through
    const result = applyFilters(projects, criteria);
    expect(result.criteria.query).toBe(jql);
    expect(result.filtered).toBe(1);
  });

  it('should validate WIQL before using criteria with query', () => {
    const wiql = 'SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = "MyProject"';
    const validation = validateWIQL(wiql);
    expect(validation.valid).toBe(true);

    const criteria = makeCriteria({ provider: 'ado', query: wiql });
    const projects = [makeProject({ key: 'P1' })];
    const result = applyFilters(projects, criteria);
    expect(result.criteria.query).toBe(wiql);
    expect(result.criteria.provider).toBe('ado');
  });

  it('should reject invalid JQL and not proceed', () => {
    const jql = 'nonsense gibberish';
    const validation = validateJQL(jql);
    expect(validation.valid).toBe(false);
    // Caller should not proceed with filter if validation fails
  });

  it('should reject invalid WIQL and not proceed', () => {
    const wiql = 'DELETE FROM WorkItems';
    const validation = validateWIQL(wiql);
    expect(validation.valid).toBe(false);
  });
});
