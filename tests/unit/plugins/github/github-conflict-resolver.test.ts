/**
 * Unit tests for GitHubConflictResolver (RED phase — module does not exist yet)
 *
 * Tests field-level conflict detection and resolution between local spec state
 * and GitHub issue state. Covers title, status, and acceptance criteria fields.
 *
 * Resolution modes: github-wins, spec-wins, prompt
 * Defaults: github-wins for status/AC, prompt for content (title)
 *
 * Pure logic class — no mocks needed.
 *
 * @see T-011: Conflict detection and resolution
 * @see plugins/specweave-github/lib/github-conflict-resolver.ts (not yet created)
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// RED phase import — this module does not exist yet and will cause test failure
// ---------------------------------------------------------------------------

import {
  GitHubConflictResolver,
} from '../../../../plugins/specweave-github/lib/github-conflict-resolver.js';

import type {
  ConflictResolution,
  ConflictField,
  ResolvedConflict,
  ConflictResolverConfig,
} from '../../../../plugins/specweave-github/lib/github-conflict-resolver.js';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const SPEC_STATE_BASE = {
  title: 'Implement user authentication',
  status: 'in-progress',
  acceptanceCriteria: [
    { id: 'AC-US1-01', completed: false },
    { id: 'AC-US1-02', completed: true },
    { id: 'AC-US1-03', completed: false },
  ],
};

const GITHUB_STATE_BASE = {
  title: 'Implement user authentication',
  state: 'open' as const,
  acceptanceCriteria: [
    { id: 'AC-US1-01', completed: false },
    { id: 'AC-US1-02', completed: true },
    { id: 'AC-US1-03', completed: false },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubConflictResolver', () => {
  let resolver: InstanceType<typeof GitHubConflictResolver>;

  beforeEach(() => {
    resolver = new GitHubConflictResolver();
  });

  // =========================================================================
  // 1. Constructor with default config
  // =========================================================================
  describe('constructor — default config', () => {
    it('should create an instance with default configuration', () => {
      const r = new GitHubConflictResolver();
      expect(r).toBeInstanceOf(GitHubConflictResolver);
    });

    it('should default status resolution to github-wins', () => {
      // Verify by checking that status conflicts resolve with github-wins
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'planned' },
        { ...GITHUB_STATE_BASE, state: 'closed' },
      );
      const statusConflict = conflicts.find(c => c.field === 'status');
      expect(statusConflict).toBeDefined();
      expect(statusConflict!.defaultResolution).toBe('github-wins');
    });

    it('should default content resolution to prompt', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, title: 'Spec title' },
        { ...GITHUB_STATE_BASE, title: 'GitHub title' },
      );
      const titleConflict = conflicts.find(c => c.field === 'title');
      expect(titleConflict).toBeDefined();
      expect(titleConflict!.defaultResolution).toBe('prompt');
    });

    it('should default AC resolution to github-wins', () => {
      const conflicts = resolver.detectConflicts(
        {
          ...SPEC_STATE_BASE,
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: false }],
        },
        {
          ...GITHUB_STATE_BASE,
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: true }],
        },
      );
      const acConflict = conflicts.find(c => c.field.startsWith('ac:'));
      expect(acConflict).toBeDefined();
      expect(acConflict!.defaultResolution).toBe('github-wins');
    });
  });

  // =========================================================================
  // 2. Constructor with custom config
  // =========================================================================
  describe('constructor — custom config', () => {
    it('should accept custom status resolution', () => {
      const r = new GitHubConflictResolver({
        defaultStatusResolution: 'spec-wins',
      });
      expect(r).toBeInstanceOf(GitHubConflictResolver);

      const conflicts = r.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'planned' },
        { ...GITHUB_STATE_BASE, state: 'closed' },
      );
      const statusConflict = conflicts.find(c => c.field === 'status');
      expect(statusConflict!.defaultResolution).toBe('spec-wins');
    });

    it('should accept custom content resolution', () => {
      const r = new GitHubConflictResolver({
        defaultContentResolution: 'github-wins',
      });
      expect(r).toBeInstanceOf(GitHubConflictResolver);

      const conflicts = r.detectConflicts(
        { ...SPEC_STATE_BASE, title: 'Spec title' },
        { ...GITHUB_STATE_BASE, title: 'GitHub title' },
      );
      const titleConflict = conflicts.find(c => c.field === 'title');
      expect(titleConflict!.defaultResolution).toBe('github-wins');
    });

    it('should accept custom AC resolution', () => {
      const r = new GitHubConflictResolver({
        defaultACResolution: 'prompt',
      });
      expect(r).toBeInstanceOf(GitHubConflictResolver);

      const conflicts = r.detectConflicts(
        {
          ...SPEC_STATE_BASE,
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: false }],
        },
        {
          ...GITHUB_STATE_BASE,
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: true }],
        },
      );
      const acConflict = conflicts.find(c => c.field.startsWith('ac:'));
      expect(acConflict!.defaultResolution).toBe('prompt');
    });

    it('should accept a full custom config', () => {
      const config: ConflictResolverConfig = {
        defaultStatusResolution: 'spec-wins',
        defaultContentResolution: 'spec-wins',
        defaultACResolution: 'spec-wins',
      };
      const r = new GitHubConflictResolver(config);
      expect(r).toBeInstanceOf(GitHubConflictResolver);
    });
  });

  // =========================================================================
  // 3. No conflicts when spec and GitHub match
  // =========================================================================
  describe('detectConflicts — no conflicts', () => {
    it('should return empty array when spec and GitHub states match exactly', () => {
      const conflicts = resolver.detectConflicts(SPEC_STATE_BASE, GITHUB_STATE_BASE);
      expect(conflicts).toEqual([]);
    });

    it('should return empty array when both have matching open status', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'in-progress' },
        { ...GITHUB_STATE_BASE, state: 'open' },
      );
      expect(conflicts).toEqual([]);
    });

    it('should return empty array when both have matching completed/closed status', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'completed' },
        { ...GITHUB_STATE_BASE, state: 'closed' },
      );
      expect(conflicts).toEqual([]);
    });
  });

  // =========================================================================
  // 4. Detects title conflict
  // =========================================================================
  describe('detectConflicts — title', () => {
    it('should detect a title conflict when titles differ', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, title: 'Spec: Auth feature' },
        { ...GITHUB_STATE_BASE, title: 'GitHub: Auth feature' },
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(expect.objectContaining({
        field: 'title',
        specValue: 'Spec: Auth feature',
        githubValue: 'GitHub: Auth feature',
        defaultResolution: 'prompt',
      }));
    });

    it('should treat title comparison as case-sensitive', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, title: 'Auth Feature' },
        { ...GITHUB_STATE_BASE, title: 'auth feature' },
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe('title');
    });
  });

  // =========================================================================
  // 5. Detects status conflict (spec planned, GitHub closed)
  // =========================================================================
  describe('detectConflicts — status', () => {
    it('should detect conflict when spec is planned but GitHub is closed', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'planned' },
        { ...GITHUB_STATE_BASE, state: 'closed' },
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(expect.objectContaining({
        field: 'status',
        specValue: 'planned',
        githubValue: 'closed',
        defaultResolution: 'github-wins',
      }));
    });

    it('should detect conflict when spec is completed but GitHub is open', () => {
      const conflicts = resolver.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'completed' },
        { ...GITHUB_STATE_BASE, state: 'open' },
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(expect.objectContaining({
        field: 'status',
        specValue: 'completed',
        githubValue: 'open',
      }));
    });
  });

  // =========================================================================
  // 6. Detects AC checkbox conflict
  // =========================================================================
  describe('detectConflicts — acceptance criteria', () => {
    it('should detect conflict when AC checkbox state differs', () => {
      const conflicts = resolver.detectConflicts(
        {
          ...SPEC_STATE_BASE,
          acceptanceCriteria: [
            { id: 'AC-US1-01', completed: false },
            { id: 'AC-US1-02', completed: true },
          ],
        },
        {
          ...GITHUB_STATE_BASE,
          acceptanceCriteria: [
            { id: 'AC-US1-01', completed: true },  // differs
            { id: 'AC-US1-02', completed: true },   // same
          ],
        },
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(expect.objectContaining({
        field: 'ac:AC-US1-01',
        specValue: 'false',
        githubValue: 'true',
        defaultResolution: 'github-wins',
      }));
    });

    it('should detect multiple AC conflicts across different criteria', () => {
      const conflicts = resolver.detectConflicts(
        {
          ...SPEC_STATE_BASE,
          acceptanceCriteria: [
            { id: 'AC-US1-01', completed: true },
            { id: 'AC-US1-02', completed: false },
            { id: 'AC-US1-03', completed: true },
          ],
        },
        {
          ...GITHUB_STATE_BASE,
          acceptanceCriteria: [
            { id: 'AC-US1-01', completed: false },  // differs
            { id: 'AC-US1-02', completed: true },    // differs
            { id: 'AC-US1-03', completed: true },    // same
          ],
        },
      );

      const acConflicts = conflicts.filter(c => c.field.startsWith('ac:'));
      expect(acConflicts).toHaveLength(2);
      expect(acConflicts.map(c => c.field)).toContain('ac:AC-US1-01');
      expect(acConflicts.map(c => c.field)).toContain('ac:AC-US1-02');
    });
  });

  // =========================================================================
  // 7. Detects multiple conflicts simultaneously
  // =========================================================================
  describe('detectConflicts — multiple simultaneous conflicts', () => {
    it('should detect title, status, and AC conflicts at the same time', () => {
      const conflicts = resolver.detectConflicts(
        {
          title: 'Spec title',
          status: 'planned',
          acceptanceCriteria: [
            { id: 'AC-US1-01', completed: false },
          ],
        },
        {
          title: 'GitHub title',
          state: 'closed',
          acceptanceCriteria: [
            { id: 'AC-US1-01', completed: true },
          ],
        },
      );

      expect(conflicts).toHaveLength(3);

      const fields = conflicts.map(c => c.field);
      expect(fields).toContain('title');
      expect(fields).toContain('status');
      expect(fields).toContain('ac:AC-US1-01');
    });

    it('should return proper ConflictField objects for each conflict', () => {
      const conflicts = resolver.detectConflicts(
        {
          title: 'Spec title',
          status: 'in-progress',
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: true }],
        },
        {
          title: 'GH title',
          state: 'closed',
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: false }],
        },
      );

      for (const conflict of conflicts) {
        expect(conflict).toHaveProperty('field');
        expect(conflict).toHaveProperty('specValue');
        expect(conflict).toHaveProperty('githubValue');
        expect(conflict).toHaveProperty('defaultResolution');
        expect(['github-wins', 'spec-wins', 'prompt']).toContain(conflict.defaultResolution);
      }
    });
  });

  // =========================================================================
  // 8. resolveConflicts uses github-wins for status by default
  // =========================================================================
  describe('resolveConflicts — default status resolution', () => {
    it('should resolve status conflict with github-wins by default', () => {
      const conflicts: ConflictField[] = [
        {
          field: 'status',
          specValue: 'planned',
          githubValue: 'closed',
          defaultResolution: 'github-wins',
        },
      ];

      const resolved = resolver.resolveConflicts(conflicts);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(expect.objectContaining({
        field: 'status',
        specValue: 'planned',
        githubValue: 'closed',
        resolution: 'github-wins',
        resolvedValue: 'closed',
      }));
    });
  });

  // =========================================================================
  // 9. resolveConflicts uses prompt for content by default
  // =========================================================================
  describe('resolveConflicts — default content resolution', () => {
    it('should resolve title conflict with prompt by default (keeps spec value pending user choice)', () => {
      const conflicts: ConflictField[] = [
        {
          field: 'title',
          specValue: 'Spec title',
          githubValue: 'GitHub title',
          defaultResolution: 'prompt',
        },
      ];

      const resolved = resolver.resolveConflicts(conflicts);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual(expect.objectContaining({
        field: 'title',
        resolution: 'prompt',
        // When resolution is 'prompt', the resolvedValue should be the spec value
        // (preserving current state until user decides)
        resolvedValue: 'Spec title',
      }));
    });
  });

  // =========================================================================
  // 10. resolveConflict with explicit spec-wins
  // =========================================================================
  describe('resolveConflict — explicit spec-wins', () => {
    it('should use spec value when resolution is spec-wins', () => {
      const conflict: ConflictField = {
        field: 'title',
        specValue: 'Spec title',
        githubValue: 'GitHub title',
        defaultResolution: 'prompt',
      };

      const resolved = resolver.resolveConflict(conflict, 'spec-wins');

      expect(resolved.resolution).toBe('spec-wins');
      expect(resolved.resolvedValue).toBe('Spec title');
      expect(resolved.field).toBe('title');
      expect(resolved.specValue).toBe('Spec title');
      expect(resolved.githubValue).toBe('GitHub title');
    });

    it('should override default resolution with spec-wins', () => {
      const conflict: ConflictField = {
        field: 'status',
        specValue: 'planned',
        githubValue: 'closed',
        defaultResolution: 'github-wins', // default is github-wins
      };

      const resolved = resolver.resolveConflict(conflict, 'spec-wins');

      expect(resolved.resolution).toBe('spec-wins');
      expect(resolved.resolvedValue).toBe('planned');
    });
  });

  // =========================================================================
  // 11. resolveConflict with explicit github-wins
  // =========================================================================
  describe('resolveConflict — explicit github-wins', () => {
    it('should use github value when resolution is github-wins', () => {
      const conflict: ConflictField = {
        field: 'title',
        specValue: 'Spec title',
        githubValue: 'GitHub title',
        defaultResolution: 'prompt',
      };

      const resolved = resolver.resolveConflict(conflict, 'github-wins');

      expect(resolved.resolution).toBe('github-wins');
      expect(resolved.resolvedValue).toBe('GitHub title');
    });

    it('should use github value for AC conflict when resolution is github-wins', () => {
      const conflict: ConflictField = {
        field: 'ac:AC-US1-01',
        specValue: 'false',
        githubValue: 'true',
        defaultResolution: 'github-wins',
      };

      const resolved = resolver.resolveConflict(conflict, 'github-wins');

      expect(resolved.resolution).toBe('github-wins');
      expect(resolved.resolvedValue).toBe('true');
    });
  });

  // =========================================================================
  // 12. resolveConflict sets resolvedAt timestamp
  // =========================================================================
  describe('resolveConflict — resolvedAt timestamp', () => {
    it('should set resolvedAt to an ISO 8601 timestamp string', () => {
      const conflict: ConflictField = {
        field: 'title',
        specValue: 'A',
        githubValue: 'B',
        defaultResolution: 'prompt',
      };

      const before = new Date().toISOString();
      const resolved = resolver.resolveConflict(conflict, 'spec-wins');
      const after = new Date().toISOString();

      expect(resolved.resolvedAt).toBeDefined();
      expect(typeof resolved.resolvedAt).toBe('string');
      // Verify it is a valid ISO date string
      expect(new Date(resolved.resolvedAt).toISOString()).toBe(resolved.resolvedAt);
      // Verify it is within the expected time range
      expect(resolved.resolvedAt >= before).toBe(true);
      expect(resolved.resolvedAt <= after).toBe(true);
    });

    it('should set resolvedAt on every resolved conflict in batch', () => {
      const conflicts: ConflictField[] = [
        {
          field: 'title',
          specValue: 'A',
          githubValue: 'B',
          defaultResolution: 'prompt',
        },
        {
          field: 'status',
          specValue: 'planned',
          githubValue: 'closed',
          defaultResolution: 'github-wins',
        },
      ];

      const resolved = resolver.resolveConflicts(conflicts);

      for (const r of resolved) {
        expect(r.resolvedAt).toBeDefined();
        expect(new Date(r.resolvedAt).toISOString()).toBe(r.resolvedAt);
      }
    });
  });

  // =========================================================================
  // 13. Custom resolution config overrides defaults
  // =========================================================================
  describe('custom config — overrides default resolutions', () => {
    it('should use spec-wins for status when configured', () => {
      const r = new GitHubConflictResolver({
        defaultStatusResolution: 'spec-wins',
      });

      const conflicts = r.detectConflicts(
        { ...SPEC_STATE_BASE, status: 'planned' },
        { ...GITHUB_STATE_BASE, state: 'closed' },
      );
      const statusConflict = conflicts.find(c => c.field === 'status')!;

      expect(statusConflict.defaultResolution).toBe('spec-wins');

      const resolved = r.resolveConflicts(conflicts);
      const statusResolved = resolved.find(re => re.field === 'status')!;

      expect(statusResolved.resolution).toBe('spec-wins');
      expect(statusResolved.resolvedValue).toBe('planned');
    });

    it('should use github-wins for content when configured', () => {
      const r = new GitHubConflictResolver({
        defaultContentResolution: 'github-wins',
      });

      const conflicts = r.detectConflicts(
        { ...SPEC_STATE_BASE, title: 'Spec version' },
        { ...GITHUB_STATE_BASE, title: 'GitHub version' },
      );
      const titleConflict = conflicts.find(c => c.field === 'title')!;

      expect(titleConflict.defaultResolution).toBe('github-wins');

      const resolved = r.resolveConflicts(conflicts);
      const titleResolved = resolved.find(re => re.field === 'title')!;

      expect(titleResolved.resolution).toBe('github-wins');
      expect(titleResolved.resolvedValue).toBe('GitHub version');
    });

    it('should use prompt for AC when configured', () => {
      const r = new GitHubConflictResolver({
        defaultACResolution: 'prompt',
      });

      const conflicts = r.detectConflicts(
        {
          ...SPEC_STATE_BASE,
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: false }],
        },
        {
          ...GITHUB_STATE_BASE,
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: true }],
        },
      );
      const acConflict = conflicts.find(c => c.field.startsWith('ac:'))!;

      expect(acConflict.defaultResolution).toBe('prompt');

      const resolved = r.resolveConflicts(conflicts);
      const acResolved = resolved.find(re => re.field.startsWith('ac:'))!;

      expect(acResolved.resolution).toBe('prompt');
      // prompt keeps spec value
      expect(acResolved.resolvedValue).toBe('false');
    });

    it('should apply all custom resolutions together', () => {
      const r = new GitHubConflictResolver({
        defaultStatusResolution: 'prompt',
        defaultContentResolution: 'spec-wins',
        defaultACResolution: 'spec-wins',
      });

      const conflicts = r.detectConflicts(
        {
          title: 'Spec title',
          status: 'planned',
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: true }],
        },
        {
          title: 'GitHub title',
          state: 'closed',
          acceptanceCriteria: [{ id: 'AC-US1-01', completed: false }],
        },
      );

      expect(conflicts).toHaveLength(3);

      const titleConflict = conflicts.find(c => c.field === 'title')!;
      const statusConflict = conflicts.find(c => c.field === 'status')!;
      const acConflict = conflicts.find(c => c.field.startsWith('ac:'))!;

      expect(titleConflict.defaultResolution).toBe('spec-wins');
      expect(statusConflict.defaultResolution).toBe('prompt');
      expect(acConflict.defaultResolution).toBe('spec-wins');

      const resolved = r.resolveConflicts(conflicts);

      const titleResolved = resolved.find(re => re.field === 'title')!;
      const statusResolved = resolved.find(re => re.field === 'status')!;
      const acResolved = resolved.find(re => re.field.startsWith('ac:'))!;

      expect(titleResolved.resolvedValue).toBe('Spec title');
      expect(statusResolved.resolvedValue).toBe('planned'); // prompt keeps spec value
      expect(acResolved.resolvedValue).toBe('true');
    });
  });

  // =========================================================================
  // Edge: resolveConflict uses default when no explicit resolution given
  // =========================================================================
  describe('resolveConflict — falls back to defaultResolution', () => {
    it('should use the defaultResolution from the conflict when no override provided', () => {
      const conflict: ConflictField = {
        field: 'status',
        specValue: 'in-progress',
        githubValue: 'closed',
        defaultResolution: 'github-wins',
      };

      const resolved = resolver.resolveConflict(conflict);

      expect(resolved.resolution).toBe('github-wins');
      expect(resolved.resolvedValue).toBe('closed');
    });

    it('should use prompt default and keep spec value when no override provided', () => {
      const conflict: ConflictField = {
        field: 'title',
        specValue: 'Spec value',
        githubValue: 'GH value',
        defaultResolution: 'prompt',
      };

      const resolved = resolver.resolveConflict(conflict);

      expect(resolved.resolution).toBe('prompt');
      expect(resolved.resolvedValue).toBe('Spec value');
    });
  });

  // =========================================================================
  // Edge: resolveConflicts with empty array
  // =========================================================================
  describe('resolveConflicts — empty input', () => {
    it('should return empty array when given no conflicts', () => {
      const resolved = resolver.resolveConflicts([]);
      expect(resolved).toEqual([]);
    });
  });

  // =========================================================================
  // Edge: resolveConflicts resolves all conflicts in a batch
  // =========================================================================
  describe('resolveConflicts — batch resolution', () => {
    it('should resolve all conflicts using their defaultResolution', () => {
      const conflicts: ConflictField[] = [
        {
          field: 'title',
          specValue: 'Spec',
          githubValue: 'GH',
          defaultResolution: 'prompt',
        },
        {
          field: 'status',
          specValue: 'planned',
          githubValue: 'closed',
          defaultResolution: 'github-wins',
        },
        {
          field: 'ac:AC-US1-01',
          specValue: 'false',
          githubValue: 'true',
          defaultResolution: 'github-wins',
        },
      ];

      const resolved = resolver.resolveConflicts(conflicts);

      expect(resolved).toHaveLength(3);

      const titleRes = resolved.find(r => r.field === 'title')!;
      expect(titleRes.resolution).toBe('prompt');
      expect(titleRes.resolvedValue).toBe('Spec');

      const statusRes = resolved.find(r => r.field === 'status')!;
      expect(statusRes.resolution).toBe('github-wins');
      expect(statusRes.resolvedValue).toBe('closed');

      const acRes = resolved.find(r => r.field === 'ac:AC-US1-01')!;
      expect(acRes.resolution).toBe('github-wins');
      expect(acRes.resolvedValue).toBe('true');
    });
  });
});
