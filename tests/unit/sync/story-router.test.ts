/**
 * Unit tests for story-router
 *
 * Routes user stories to repos by prefix matching (US-FE-001 → frontend repo).
 * Includes fallback for old configs without storyPrefix.
 */

import { describe, it, expect } from 'vitest';

import {
  routeByPrefix,
  extractPrefix,
  type StoryRoutingResult,
} from '../../../src/sync/story-router.js';

import type { ChildRepoConfig } from '../../../src/core/config/types.js';

// Helper to create ChildRepoConfig for tests
function makeRepo(overrides: Partial<ChildRepoConfig> & { id: string; path: string; prefix: string }): ChildRepoConfig {
  return {
    ...overrides,
  };
}

const REPOS: ChildRepoConfig[] = [
  makeRepo({ id: 'acme-frontend', path: 'repositories/acme/acme-frontend', prefix: 'FE' }),
  makeRepo({ id: 'acme-api', path: 'repositories/acme/acme-api', prefix: 'BE' }),
  makeRepo({ id: 'acme-mobile', path: 'repositories/acme/acme-mobile', prefix: 'MOB' }),
];

describe('story-router', () => {
  // ─── extractPrefix ──────────────────────────────────────────────

  describe('extractPrefix', () => {
    it('should extract prefix from US-FE-001', () => {
      expect(extractPrefix('US-FE-001')).toBe('FE');
    });

    it('should extract prefix from US-BE-042', () => {
      expect(extractPrefix('US-BE-042')).toBe('BE');
    });

    it('should extract prefix from US-MOB-123', () => {
      expect(extractPrefix('US-MOB-123')).toBe('MOB');
    });

    it('should extract prefix from US-INFRA-007', () => {
      expect(extractPrefix('US-INFRA-007')).toBe('INFRA');
    });

    it('should handle lowercase input', () => {
      expect(extractPrefix('us-fe-001')).toBe('FE');
    });

    it('should return null for unprefixed story (US-001)', () => {
      expect(extractPrefix('US-001')).toBeNull();
    });

    it('should return null for malformed ID', () => {
      expect(extractPrefix('STORY-123')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractPrefix('')).toBeNull();
    });

    it('should handle prefix with max length (6 chars)', () => {
      expect(extractPrefix('US-SHARED-001')).toBe('SHARED');
    });
  });

  // ─── routeByPrefix ─────────────────────────────────────────────

  describe('routeByPrefix', () => {
    it('should route US-FE-001 to frontend repo', () => {
      const result = routeByPrefix('US-FE-001', REPOS);
      expect(result.repoId).toBe('acme-frontend');
      expect(result.matched).toBe(true);
    });

    it('should route US-BE-042 to backend repo', () => {
      const result = routeByPrefix('US-BE-042', REPOS);
      expect(result.repoId).toBe('acme-api');
      expect(result.matched).toBe(true);
    });

    it('should route US-MOB-007 to mobile repo', () => {
      const result = routeByPrefix('US-MOB-007', REPOS);
      expect(result.repoId).toBe('acme-mobile');
      expect(result.matched).toBe(true);
    });

    it('should match prefix case-insensitively', () => {
      const result = routeByPrefix('us-fe-001', REPOS);
      expect(result.repoId).toBe('acme-frontend');
      expect(result.matched).toBe(true);
    });

    // ─── Default repo fallback ─────────────────────────────────

    it('should return first repo for unprefixed story (US-001)', () => {
      const result = routeByPrefix('US-001', REPOS);
      expect(result.repoId).toBe('acme-frontend');
      expect(result.matched).toBe(false);
      expect(result.reason).toMatch(/no prefix/i);
    });

    it('should return first repo for unknown prefix', () => {
      const result = routeByPrefix('US-XYZ-001', REPOS);
      expect(result.repoId).toBe('acme-frontend');
      expect(result.matched).toBe(false);
      expect(result.reason).toMatch(/unknown prefix/i);
    });

    it('should use custom defaultRepoId when provided', () => {
      const result = routeByPrefix('US-001', REPOS, 'acme-api');
      expect(result.repoId).toBe('acme-api');
      expect(result.matched).toBe(false);
    });

    // ─── Edge cases ────────────────────────────────────────────

    it('should return null repoId for empty repos array', () => {
      const result = routeByPrefix('US-FE-001', []);
      expect(result.repoId).toBeNull();
      expect(result.matched).toBe(false);
      expect(result.reason).toMatch(/no repos/i);
    });

    it('should handle malformed story ID gracefully', () => {
      const result = routeByPrefix('GARBAGE', REPOS);
      expect(result.repoId).toBe('acme-frontend');
      expect(result.matched).toBe(false);
    });

    // ─── Old config fallback (no prefix field) ─────────────────

    it('should fall back to name matching when repo has no prefix', () => {
      const legacyRepos: ChildRepoConfig[] = [
        { id: 'acme-frontend', path: 'repositories/acme/acme-frontend', prefix: '' },
        { id: 'acme-backend', path: 'repositories/acme/acme-backend', prefix: '' },
      ];

      const result = routeByPrefix('US-FE-001', legacyRepos);
      // No prefix match possible → falls back to first repo
      expect(result.repoId).toBe('acme-frontend');
      expect(result.matched).toBe(false);
    });

    it('should fall back to id substring matching for old configs', () => {
      const legacyRepos: ChildRepoConfig[] = [
        { id: 'frontend-app', path: 'repos/frontend', prefix: '' },
        { id: 'backend-api', path: 'repos/backend', prefix: '' },
      ];

      // Should try to match "FE" against repo IDs but fail → first repo
      const result = routeByPrefix('US-FE-001', legacyRepos);
      expect(result.repoId).toBe('frontend-app');
      expect(result.matched).toBe(false);
    });
  });
});
