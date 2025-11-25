import { describe, it, expect } from 'vitest';
import { normalizeRepoName, validateRepoId, suggestRepoName } from '../../../src/core/repo-structure/repo-id-generator.js';

describe('normalizeRepoName', () => {
  it('converts to lowercase', () => {
    expect(normalizeRepoName('My-SaaS-Frontend')).toBe('my-saas-frontend');
  });

  it('preserves full name', () => {
    expect(normalizeRepoName('my-saas-frontend')).toBe('my-saas-frontend');
  });

  it('replaces underscores with hyphens', () => {
    expect(normalizeRepoName('sw_qr_menu_be')).toBe('sw-qr-menu-be');
  });

  it('replaces spaces with hyphens', () => {
    expect(normalizeRepoName('acme api gateway')).toBe('acme-api-gateway');
  });

  it('removes special characters', () => {
    expect(normalizeRepoName('my@project#name!')).toBe('myprojectname');
  });

  it('collapses multiple hyphens', () => {
    expect(normalizeRepoName('my--project---name')).toBe('my-project-name');
  });

  it('trims leading/trailing hyphens', () => {
    expect(normalizeRepoName('-my-project-')).toBe('my-project');
  });

  it('handles empty string', () => {
    expect(normalizeRepoName('')).toBe('');
  });

  it('handles numbers', () => {
    expect(normalizeRepoName('project-v2')).toBe('project-v2');
  });
});

describe('validateRepoId', () => {
  it('accepts valid ID', () => {
    expect(validateRepoId('my-saas-frontend').valid).toBe(true);
  });

  it('rejects empty', () => {
    expect(validateRepoId('').valid).toBe(false);
  });

  it('rejects commas', () => {
    expect(validateRepoId('a,b,c').valid).toBe(false);
  });

  it('rejects uppercase', () => {
    expect(validateRepoId('MyRepo').valid).toBe(false);
  });

  it('rejects spaces', () => {
    expect(validateRepoId('my repo').valid).toBe(false);
  });

  it('rejects starting with number', () => {
    expect(validateRepoId('123-repo').valid).toBe(false);
  });
});

describe('suggestRepoName', () => {
  it('suggests frontend for index 0', () => {
    expect(suggestRepoName('my-project', 0, 3)).toBe('my-project-frontend');
  });

  it('suggests backend for index 1', () => {
    expect(suggestRepoName('my-project', 1, 3)).toBe('my-project-backend');
  });

  it('suggests mobile for index 2', () => {
    expect(suggestRepoName('my-project', 2, 3)).toBe('my-project-mobile');
  });

  it('falls back to service-N for large index', () => {
    expect(suggestRepoName('my-project', 15, 20)).toBe('my-project-service-16');
  });
});
