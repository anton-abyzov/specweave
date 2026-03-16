/**
 * Integration Tests: Selection Strategy Glob Matching
 *
 * Tests real minimatch behavior (NOT mocked) to verify glob patterns
 * work correctly with real-world repository names including dots,
 * mixed case, and special characters.
 */

import { describe, it, expect } from 'vitest';
import { minimatch } from 'minimatch';
import {
  parsePatternShortcut,
} from '../../../../src/cli/helpers/selection-strategy.js';

/**
 * Simulates the real matching logic from matchByGlob/filterRepositoriesByPattern
 * using actual minimatch (not mocked).
 */
function matchRepos(repoNames: string[], pattern: string): string[] {
  const parsedPattern = parsePatternShortcut(pattern);
  return repoNames.filter(name => minimatch(name, parsedPattern, { nocase: true }));
}

describe('selection-strategy glob integration', () => {
  // Real-world repo names from GitHub org with 729 repos
  const mckissockRepos = [
    'cloudops-docker-test-container',
    'cloudops-mini-orange',
    'cloudops-tf-config-common-apps',
    'cloudops-tf-config-demo-env',
    'cloudops-tf-config-elementary-dashboard',
    'cloudops-tf-config-email-gateway',
    'cloudops-tf-config-marketing-admin',
    'cloudops-tf-config-microservices-api',
    'cloudops-tf-config-nuget-packages',
    'cloudops-tf-config-s3-bucket',
    'cloudops-tf-infrastructure-tooling-vpc',
    'Nexus_DB',
    'Nexus_Stored_Procs',
    'nexus-containers',
    'nexus-rubi-scripts',
    'Nexus.Api',
    'Nexus.Identity.Keycloak',
    'Nexus.Identity.Widget',
    'Nexus.Platform.API',
    'Nexus.Platform.Web',
    'Nexus.Shared.Models',
  ];

  describe('*nexus.identity* pattern', () => {
    it('should match only repos containing "nexus.identity" (case-insensitive)', () => {
      const matched = matchRepos(mckissockRepos, '*nexus.identity*');
      expect(matched).toEqual([
        'Nexus.Identity.Keycloak',
        'Nexus.Identity.Widget',
      ]);
    });

    it('should NOT match repos with just "nexus" but no ".identity"', () => {
      const matched = matchRepos(mckissockRepos, '*nexus.identity*');
      expect(matched).not.toContainEqual('Nexus_DB');
      expect(matched).not.toContainEqual('Nexus_Stored_Procs');
      expect(matched).not.toContainEqual('nexus-containers');
      expect(matched).not.toContainEqual('Nexus.Api');
      expect(matched).not.toContainEqual('Nexus.Platform.API');
    });

    it('should NOT match cloudops repos', () => {
      const matched = matchRepos(mckissockRepos, '*nexus.identity*');
      const cloudopsMatches = matched.filter(n => n.startsWith('cloudops'));
      expect(cloudopsMatches).toHaveLength(0);
    });
  });

  describe('case-insensitive matching', () => {
    it('should match regardless of case in pattern', () => {
      expect(matchRepos(mckissockRepos, '*NEXUS.IDENTITY*')).toEqual([
        'Nexus.Identity.Keycloak',
        'Nexus.Identity.Widget',
      ]);
    });

    it('should match mixed case repo names with lowercase pattern', () => {
      expect(matchRepos(mckissockRepos, '*nexus.api*')).toEqual([
        'Nexus.Api',
      ]);
    });
  });

  describe('dot handling in patterns', () => {
    it('should treat dots as literal characters in minimatch', () => {
      // In minimatch, dots are literal (not regex wildcards)
      expect(matchRepos(mckissockRepos, '*Nexus.*')).toEqual([
        'Nexus.Api',
        'Nexus.Identity.Keycloak',
        'Nexus.Identity.Widget',
        'Nexus.Platform.API',
        'Nexus.Platform.Web',
        'Nexus.Shared.Models',
      ]);
    });

    it('should NOT match underscore variants with dot pattern', () => {
      const matched = matchRepos(mckissockRepos, '*Nexus.*');
      expect(matched).not.toContainEqual('Nexus_DB');
      expect(matched).not.toContainEqual('Nexus_Stored_Procs');
    });
  });

  describe('shortcut patterns', () => {
    it('should handle "contains: nexus.identity"', () => {
      const matched = matchRepos(mckissockRepos, 'contains: nexus.identity');
      expect(matched).toEqual([
        'Nexus.Identity.Keycloak',
        'Nexus.Identity.Widget',
      ]);
    });

    it('should handle "starts: cloudops"', () => {
      const matched = matchRepos(mckissockRepos, 'starts: cloudops');
      expect(matched).toHaveLength(11);
      expect(matched.every(n => n.startsWith('cloudops'))).toBe(true);
    });

    it('should handle "ends: .Widget"', () => {
      const matched = matchRepos(mckissockRepos, 'ends: .Widget');
      expect(matched).toEqual(['Nexus.Identity.Widget']);
    });
  });

  describe('auto-expansion (plain text without globs)', () => {
    it('should auto-append * to plain text (prefix match)', () => {
      // "Nexus" → "Nexus*" (matches Nexus.*, Nexus_*)
      const matched = matchRepos(mckissockRepos, 'Nexus');
      expect(matched).toContainEqual('Nexus_DB');
      expect(matched).toContainEqual('Nexus.Api');
      expect(matched).toContainEqual('Nexus.Identity.Keycloak');
    });

    it('should NOT auto-expand when glob chars are present', () => {
      // "*nexus*" stays as-is, matches anything with "nexus"
      const matched = matchRepos(mckissockRepos, '*nexus*');
      expect(matched).toContainEqual('Nexus_DB');
      expect(matched).toContainEqual('nexus-containers');
      expect(matched).toContainEqual('Nexus.Identity.Keycloak');
    });
  });
});
