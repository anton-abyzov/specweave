import { describe, it, expect } from 'vitest';
import { parseSource } from '../../../../../src/cli/helpers/get/source-parser.js';

describe('parseSource', () => {
  describe('GitHub shorthand', () => {
    it('parses owner/repo', () => {
      const result = parseSource('owner/repo');
      expect(result).toEqual({
        type: 'github',
        owner: 'owner',
        repo: 'repo',
        cloneUrl: 'https://github.com/owner/repo.git',
      });
    });

    it('parses owner/repo with dots and hyphens', () => {
      const result = parseSource('my-org/my.repo-name');
      expect(result.type).toBe('github');
      expect(result.owner).toBe('my-org');
      expect(result.repo).toBe('my.repo-name');
    });

    it('AC-US1-01: returns correct structure', () => {
      const result = parseSource('owner/repo');
      expect(result.type).toBe('github');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.cloneUrl).toBe('https://github.com/owner/repo.git');
    });
  });

  describe('GitHub HTTPS URL', () => {
    it('AC-US1-02: parses https://github.com/org/my-repo', () => {
      const result = parseSource('https://github.com/org/my-repo');
      expect(result).toEqual({
        type: 'github',
        owner: 'org',
        repo: 'my-repo',
        cloneUrl: 'https://github.com/org/my-repo.git',
      });
    });

    it('strips .git suffix from repo name', () => {
      const result = parseSource('https://github.com/org/my-repo.git');
      expect(result.repo).toBe('my-repo');
      expect(result.cloneUrl).toBe('https://github.com/org/my-repo.git');
    });

    it('throws for nested subpaths (3+ path segments)', () => {
      // https://gitlab.com/org/team/project has 3 segments — ambiguous, not supported
      expect(() => parseSource('https://gitlab.com/my-org/my-team/my-project')).toThrow('Cannot parse source');
    });
  });

  describe('GitHub SSH URL', () => {
    it('AC-US1-03: parses git@github.com:org/repo.git', () => {
      const result = parseSource('git@github.com:org/repo.git');
      expect(result).toEqual({
        type: 'github',
        owner: 'org',
        repo: 'repo',
        cloneUrl: 'git@github.com:org/repo.git',
      });
    });

    it('adds .git suffix if missing', () => {
      const result = parseSource('git@github.com:org/repo');
      expect(result.cloneUrl).toBe('git@github.com:org/repo.git');
    });
  });

  describe('generic git URL (non-GitHub)', () => {
    it('AC-US1-05: parses https://gitlab.com/org/repo', () => {
      const result = parseSource('https://gitlab.com/org/repo');
      expect(result.type).toBe('git');
      expect(result.owner).toBe('org');
      expect(result.repo).toBe('repo');
      expect(result.cloneUrl).toBe('https://gitlab.com/org/repo');
    });

    it('parses generic SSH URL', () => {
      const result = parseSource('git@gitlab.com:org/repo');
      expect(result.type).toBe('git');
      expect(result.owner).toBe('org');
      expect(result.repo).toBe('repo');
    });
  });

  describe('local path', () => {
    it('AC-US1-04: parses ./path/to/repo', () => {
      const result = parseSource('./path/to/repo');
      expect(result.type).toBe('local');
      expect(result.absolutePath).toBeTruthy();
      expect(result.absolutePath).not.toContain('~');
    });

    it('parses absolute path', () => {
      const result = parseSource('/home/user/my-repo');
      expect(result.type).toBe('local');
      expect(result.absolutePath).toBe('/home/user/my-repo');
      expect(result.repo).toBe('my-repo');
    });

    it('parses ../ relative path', () => {
      const result = parseSource('../sibling-repo');
      expect(result.type).toBe('local');
      expect(result.repo).toBe('sibling-repo');
    });

    it('strips trailing slash', () => {
      const result = parseSource('./my-repo/');
      expect(result.repo).toBe('my-repo');
    });

    it('expands tilde to home directory', () => {
      const result = parseSource('~/my-repo');
      expect(result.type).toBe('local');
      expect(result.repo).toBe('my-repo');
      expect(result.absolutePath).not.toContain('~');
      expect(result.absolutePath).toMatch(/^\/.*\/my-repo$/);
    });
  });

  describe('shorthand takes priority over local fs check', () => {
    it('owner/repo is always github, not local path', () => {
      // Even if a directory named "owner/repo" happened to exist, shorthand wins
      const result = parseSource('some-org/some-repo');
      expect(result.type).toBe('github');
    });
  });

  describe('error cases', () => {
    it('throws on unrecognizable input', () => {
      expect(() => parseSource('not-a-valid-source-with-no-slash-or-url')).toThrow('Cannot parse source');
    });

    it('error message lists accepted formats', () => {
      expect(() => parseSource('totally-invalid')).toThrow('Accepted formats');
    });
  });
});
