import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for Repository ID Generator
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 90%+
 */

import { generateRepoId, generateRepoIdSmart, ensureUniqueId, validateRepoId, suggestRepoName } from '../../../src/core/repo-structure/repo-id-generator.js';

describe('generateRepoId', () => {
  describe('Suffix stripping', () => {
    it('should strip -app suffix by detecting it as suffix keyword', () => {
      expect(generateRepoId('my-app')).toBe('my');
    });

    it('should strip -service suffix by detecting it as suffix keyword', () => {
      expect(generateRepoId('backend-service')).toBe('backend');
    });

    it('should strip -api suffix by detecting it as suffix keyword', () => {
      expect(generateRepoId('api-gateway-api')).toBe('gateway');
    });

    it('should extract service type from -frontend (not a suffix keyword)', () => {
      // "frontend" is a service type, not a suffix keyword, so it's kept
      expect(generateRepoId('my-frontend')).toBe('frontend');
    });

    it('should extract service type from -backend (not a suffix keyword)', () => {
      // "backend" is a service type, not a suffix keyword, so it's kept
      expect(generateRepoId('my-backend')).toBe('backend');
    });

    it('should strip -web suffix by detecting it as suffix keyword', () => {
      expect(generateRepoId('my-project-web')).toBe('project');
    });

    it('should strip -mobile suffix by detecting it as suffix keyword', () => {
      expect(generateRepoId('my-project-mobile')).toBe('project');
    });
  });

  describe('Last segment extraction', () => {
    it('should take last segment from hyphenated name', () => {
      // "acme-saas-mobile" → strip "-mobile" suffix → "acme-saas" → take last → "saas"
      expect(generateRepoId('acme-saas-mobile')).toBe('saas');
    });

    it('should handle multiple suffixes correctly', () => {
      // "my-frontend-app" → strip "-app" → "my-frontend" → take last → "frontend"
      expect(generateRepoId('my-frontend-app')).toBe('frontend');
    });

    it('should handle name with no suffix', () => {
      expect(generateRepoId('simple-name')).toBe('name');
    });

    it('should handle single segment name', () => {
      expect(generateRepoId('frontend')).toBe('frontend');
    });
  });

  describe('Real-world examples from spec', () => {
    it('should generate "frontend" from "my-saas-frontend-app"', () => {
      expect(generateRepoId('my-saas-frontend-app')).toBe('frontend');
    });

    it('should generate "gateway" from "acme-api-gateway-service"', () => {
      expect(generateRepoId('acme-api-gateway-service')).toBe('gateway');
    });

    it('should generate "backend" from "backend-service"', () => {
      expect(generateRepoId('backend-service')).toBe('backend');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(generateRepoId('')).toBe('');
    });

    it('should handle single character', () => {
      expect(generateRepoId('a')).toBe('a');
    });
  });

  describe('Prefix stripping', () => {
    it('should strip sw- prefix', () => {
      expect(generateRepoId('sw-web-calc-frontend')).toBe('frontend');
    });

    it('should strip app- prefix', () => {
      expect(generateRepoId('app-backend-service')).toBe('backend');
    });

    it('should strip web- prefix', () => {
      expect(generateRepoId('web-admin-app')).toBe('admin');
    });

    it('should strip mobile- prefix', () => {
      expect(generateRepoId('mobile-ios-app')).toBe('ios');
    });

    it('should strip api- prefix', () => {
      expect(generateRepoId('api-gateway-service')).toBe('gateway');
    });

    it('should strip both prefix and suffix', () => {
      expect(generateRepoId('sw-web-calc-frontend-app')).toBe('frontend');
    });
  });
});

describe('ensureUniqueId', () => {
  it('should return original ID if no duplicates', () => {
    const result = ensureUniqueId('frontend', new Set());
    expect(result.id).toBe('frontend');
    expect(result.wasModified).toBe(false);
  });

  it('should append -2 if ID exists once', () => {
    const result = ensureUniqueId('frontend', new Set(['frontend']));
    expect(result.id).toBe('frontend-2');
    expect(result.wasModified).toBe(true);
  });

  it('should append -3 if frontend and frontend-2 exist', () => {
    const result = ensureUniqueId('frontend', new Set(['frontend', 'frontend-2']));
    expect(result.id).toBe('frontend-3');
    expect(result.wasModified).toBe(true);
  });

  it('should find first available suffix', () => {
    const result = ensureUniqueId('frontend', new Set(['frontend', 'frontend-2', 'frontend-3', 'frontend-5']));
    expect(result.id).toBe('frontend-4');
    expect(result.wasModified).toBe(true);
  });

  it('should handle empty existing IDs set', () => {
    const result = ensureUniqueId('backend', new Set());
    expect(result.id).toBe('backend');
    expect(result.wasModified).toBe(false);
  });
});

describe('validateRepoId', () => {
  describe('Valid IDs', () => {
    it('should accept valid lowercase ID with hyphens', () => {
      const result = validateRepoId('frontend-app');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept single word', () => {
      const result = validateRepoId('frontend');
      expect(result.valid).toBe(true);
    });

    it('should accept numbers in ID', () => {
      const result = validateRepoId('app-v2');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid IDs', () => {
    it('should reject ID with commas', () => {
      const result = validateRepoId('parent,fe,be');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('comma');
    });

    it('should reject ID with uppercase letters', () => {
      const result = validateRepoId('MyRepo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject ID with spaces', () => {
      const result = validateRepoId('my repo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('space');
    });

    it('should reject empty ID', () => {
      const result = validateRepoId('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject ID that is too long', () => {
      const longId = 'a'.repeat(51);
      const result = validateRepoId(longId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should reject ID starting with number', () => {
      const result = validateRepoId('123-frontend');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('letter');
    });

    it('should reject ID with special characters', () => {
      const result = validateRepoId('frontend_app');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('alphanumeric');
    });
  });
});

describe('generateRepoIdSmart', () => {
  describe('No conflicts', () => {
    it('should return base ID when no existing names', () => {
      const result = generateRepoIdSmart('sw-web-calc-frontend', []);
      expect(result).toBe('frontend');
    });

    it('should return base ID when no conflict with existing names', () => {
      const result = generateRepoIdSmart('sw-web-calc-frontend', ['sw-web-calc-backend']);
      expect(result).toBe('frontend');
    });
  });

  describe('Conflict resolution', () => {
    it('should use abbreviated form when base ID conflicts', () => {
      const result = generateRepoIdSmart('sw-web-calc-frontend', ['sw-mobile-calc-frontend']);
      // Both generate "frontend" → should try "fe" (abbreviated)
      expect(result).toBe('fe');
    });

    it('should use abbreviated form for backend conflict', () => {
      const result = generateRepoIdSmart('api-backend-service', ['mobile-backend-app']);
      // Both generate "backend" → should try "be" (abbreviated)
      expect(result).toBe('be');
    });

    it('should use last two segments when abbreviation conflicts', () => {
      // Setup: both "frontend" and "fe" are taken
      const existingNames = [
        'sw-mobile-calc-frontend', // generates "frontend"
        'admin-fe-app'              // generates "fe"
      ];
      const result = generateRepoIdSmart('sw-web-calc-frontend-app', existingNames);
      // Should try "calc-frontend" or "calc-fe"
      expect(['calc-frontend', 'calc-fe']).toContain(result);
    });

    it('should handle multiple conflicts and find unique ID', () => {
      const existingNames = [
        'project-a-frontend',
        'project-b-frontend',
        'project-c-frontend'
      ];
      const result = generateRepoIdSmart('my-app-frontend', existingNames);
      // All generate "frontend", should use "fe" or fallback
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle calculator app example from user prompt', () => {
      const repo1 = generateRepoIdSmart('sw-web-calc-frontend', []);
      expect(repo1).toBe('frontend');

      const repo2 = generateRepoIdSmart('sw-mobile-calc-frontend', [repo1]);
      // Should detect conflict and use different strategy
      expect(repo2).not.toBe('frontend');
      expect(['fe', 'calc-fe', 'mobile-calc-frontend']).toContain(repo2);
    });

    it('should handle multi-service setup', () => {
      const repos = [
        'acme-saas-frontend-app',
        'acme-saas-backend-service',
        'acme-saas-admin-frontend',
        'acme-saas-mobile-app'
      ];

      const ids = repos.map((repo, i) => {
        const previousRepos = repos.slice(0, i);
        return generateRepoIdSmart(repo, previousRepos);
      });

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Should have generated: frontend, backend, admin, mobile (or variants)
      expect(ids).toContain('frontend');
      expect(ids).toContain('backend');
      expect(ids).toContain('mobile');
    });

    it('should handle service with multiple suffix types', () => {
      const result = generateRepoIdSmart('company-api-gateway-service', []);
      expect(result).toBe('gateway');
    });

    it('should handle abbreviated service conflicts', () => {
      const existingNames = ['user-service', 'auth-service', 'payment-service'];
      const result = generateRepoIdSmart('admin-service', existingNames);
      // Should generate "admin" (no conflict with "user", "auth", "payment")
      expect(result).toBe('admin');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty repo name', () => {
      const result = generateRepoIdSmart('', []);
      expect(result).toBe('');
    });

    it('should handle single word repo name', () => {
      const result = generateRepoIdSmart('frontend', []);
      expect(result).toBe('frontend');
    });

    it('should handle repo name with only prefixes/suffixes', () => {
      const result = generateRepoIdSmart('sw-app', []);
      expect(result).toBeDefined();
    });

    it('should handle many existing repos', () => {
      const existingNames = Array.from({ length: 20 }, (_, i) => `service-${i}`);
      const result = generateRepoIdSmart('new-service', existingNames);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('suggestRepoName', () => {
  describe('Standard suggestions for first 3 repos', () => {
    it('should suggest frontend for first repository', () => {
      const result = suggestRepoName('my-project', 0, 3);
      expect(result).toBe('my-project-frontend');
    });

    it('should suggest backend for second repository', () => {
      const result = suggestRepoName('my-project', 1, 3);
      expect(result).toBe('my-project-backend');
    });

    it('should suggest mobile for third repository', () => {
      const result = suggestRepoName('my-project', 2, 3);
      expect(result).toBe('my-project-mobile');
    });
  });

  describe('Extended patterns for more repositories', () => {
    it('should suggest api for fourth repository', () => {
      const result = suggestRepoName('my-project', 3, 5);
      expect(result).toBe('my-project-api');
    });

    it('should suggest infra for fifth repository', () => {
      const result = suggestRepoName('my-project', 4, 6);
      expect(result).toBe('my-project-infra');
    });

    it('should suggest shared for sixth repository', () => {
      const result = suggestRepoName('my-project', 5, 7);
      expect(result).toBe('my-project-shared');
    });

    it('should suggest worker for seventh repository', () => {
      const result = suggestRepoName('my-project', 6, 8);
      expect(result).toBe('my-project-worker');
    });
  });

  describe('Fallback for many repositories', () => {
    it('should use service-N pattern when exhausting predefined types', () => {
      const result = suggestRepoName('my-project', 10, 15);
      expect(result).toBe('my-project-service-11');
    });

    it('should handle very large repository count', () => {
      const result = suggestRepoName('my-project', 99, 100);
      expect(result).toBe('my-project-service-100');
    });
  });

  describe('Real-world examples from user scenario', () => {
    it('should suggest intelligent names for markdown editor project', () => {
      const projectName = 'sw-markdown-editor';

      const repo1 = suggestRepoName(projectName, 0, 3);
      const repo2 = suggestRepoName(projectName, 1, 3);
      const repo3 = suggestRepoName(projectName, 2, 3);

      expect(repo1).toBe('sw-markdown-editor-frontend');
      expect(repo2).toBe('sw-markdown-editor-backend');
      expect(repo3).toBe('sw-markdown-editor-mobile');
    });

    it('should work with different project naming styles', () => {
      expect(suggestRepoName('acme-saas', 0, 2)).toBe('acme-saas-frontend');
      expect(suggestRepoName('company-app', 1, 2)).toBe('company-app-backend');
      expect(suggestRepoName('my-startup', 2, 3)).toBe('my-startup-mobile');
    });
  });

  describe('Edge cases', () => {
    it('should handle single repository', () => {
      const result = suggestRepoName('my-project', 0, 1);
      expect(result).toBe('my-project-frontend');
    });

    it('should handle very short project names', () => {
      const result = suggestRepoName('a', 0, 3);
      expect(result).toBe('a-frontend');
    });

    it('should handle project names with hyphens', () => {
      const result = suggestRepoName('my-cool-project', 1, 3);
      expect(result).toBe('my-cool-project-backend');
    });
  });
});
