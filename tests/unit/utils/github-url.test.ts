import { describe, it, expect } from 'vitest';
import { toGitHubUrl, toGitHubTreeUrl } from '../../../src/utils/github-url.js';

describe('github-url', () => {
  const defaultOptions = {
    owner: 'anton-abyzov',
    repo: 'specweave',
    branch: 'develop',
  };

  describe('toGitHubUrl', () => {
    it('should convert local path to GitHub blob URL', () => {
      const result = toGitHubUrl('.specweave/docs/internal/specs/FS-001/FEATURE.md', defaultOptions);
      expect(result).toBe(
        'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/FS-001/FEATURE.md'
      );
    });

    it('should strip leading ./ from path', () => {
      const result = toGitHubUrl('./.specweave/increments/0001/spec.md', defaultOptions);
      expect(result).toBe(
        'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0001/spec.md'
      );
    });

    it('should add .specweave prefix if missing', () => {
      const result = toGitHubUrl('increments/0001/spec.md', defaultOptions);
      expect(result).toBe(
        'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0001/spec.md'
      );
    });

    it('should default branch to develop', () => {
      const result = toGitHubUrl('.specweave/config.json', { owner: 'test', repo: 'repo' });
      expect(result).toContain('/blob/develop/');
    });

    it('should use custom branch', () => {
      const result = toGitHubUrl('.specweave/config.json', { ...defaultOptions, branch: 'main' });
      expect(result).toContain('/blob/main/');
    });
  });

  describe('toGitHubTreeUrl', () => {
    it('should convert directory path to GitHub tree URL', () => {
      const result = toGitHubTreeUrl('.specweave/increments/0001-feature', defaultOptions);
      expect(result).toBe(
        'https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/0001-feature'
      );
    });

    it('should strip leading ./ from directory path', () => {
      const result = toGitHubTreeUrl('./.specweave/docs', defaultOptions);
      expect(result).toBe(
        'https://github.com/anton-abyzov/specweave/tree/develop/.specweave/docs'
      );
    });

    it('should add .specweave prefix for bare directories', () => {
      const result = toGitHubTreeUrl('docs/internal', defaultOptions);
      expect(result).toBe(
        'https://github.com/anton-abyzov/specweave/tree/develop/.specweave/docs/internal'
      );
    });

    it('should default branch to develop', () => {
      const result = toGitHubTreeUrl('.specweave/increments', { owner: 'test', repo: 'repo' });
      expect(result).toContain('/tree/develop/');
    });
  });
});
