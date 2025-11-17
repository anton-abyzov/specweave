import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for Repository ID Generator
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 90%+
 */

import { generateRepoId, ensureUniqueId, validateRepoId } from '../../../src/core/repo-structure/repo-id-generator.js';

describe('generateRepoId', () => {
  describe('Suffix stripping', () => {
    it('should strip -app suffix', () => {
      expect(generateRepoId('my-app')).toBe('my');
    });

    it('should strip -service suffix', () => {
      expect(generateRepoId('backend-service')).toBe('backend');
    });

    it('should strip -api suffix', () => {
      expect(generateRepoId('api-gateway-api')).toBe('gateway');
    });

    it('should strip -frontend suffix', () => {
      expect(generateRepoId('my-frontend')).toBe('my');
    });

    it('should strip -backend suffix', () => {
      expect(generateRepoId('my-backend')).toBe('my');
    });

    it('should strip -web suffix', () => {
      expect(generateRepoId('my-project-web')).toBe('project');
    });

    it('should strip -mobile suffix', () => {
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
