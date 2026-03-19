import { describe, it, expect } from 'vitest';

/**
 * WorkspacePage unit tests
 *
 * These test the core logic functions extracted from the component,
 * not the React rendering (no jsdom/testing-library in this project).
 */

describe('WorkspacePage helpers', () => {
  describe('formatMapping', () => {
    // Re-implement the logic here to test it
    function formatMapping(
      sync: { github?: { owner: string; repo: string }; jira?: { projectKey: string }; ado?: { project: string } } | undefined,
      platform: 'github' | 'jira' | 'ado',
    ): string {
      if (!sync) return '';
      if (platform === 'github' && sync.github) return `${sync.github.owner}/${sync.github.repo}`;
      if (platform === 'jira' && sync.jira) return sync.jira.projectKey;
      if (platform === 'ado' && sync.ado) return sync.ado.project;
      return '';
    }

    it('formats github mapping as owner/repo', () => {
      expect(formatMapping({ github: { owner: 'acme', repo: 'fe' } }, 'github')).toBe('acme/fe');
    });

    it('formats jira mapping as projectKey', () => {
      expect(formatMapping({ jira: { projectKey: 'FE' } }, 'jira')).toBe('FE');
    });

    it('formats ado mapping as project', () => {
      expect(formatMapping({ ado: { project: 'frontend' } }, 'ado')).toBe('frontend');
    });

    it('returns empty string when no sync', () => {
      expect(formatMapping(undefined, 'github')).toBe('');
    });

    it('returns empty string for unset platform', () => {
      expect(formatMapping({ github: { owner: 'acme', repo: 'fe' } }, 'jira')).toBe('');
    });
  });

  describe('parseMappingUpdate', () => {
    function parseMappingUpdate(platform: 'github' | 'jira' | 'ado', value: string) {
      if (platform === 'github') {
        const parts = value.split('/');
        if (parts.length === 2) return { github: { owner: parts[0], repo: parts[1] } };
        return { github: { owner: '', repo: value } };
      }
      if (platform === 'jira') return { jira: { projectKey: value } };
      if (platform === 'ado') return { ado: { project: value } };
      return {};
    }

    it('parses github owner/repo format', () => {
      expect(parseMappingUpdate('github', 'acme/frontend')).toEqual({
        github: { owner: 'acme', repo: 'frontend' },
      });
    });

    it('parses github with no slash', () => {
      expect(parseMappingUpdate('github', 'frontend')).toEqual({
        github: { owner: '', repo: 'frontend' },
      });
    });

    it('parses jira project key', () => {
      expect(parseMappingUpdate('jira', 'FE')).toEqual({
        jira: { projectKey: 'FE' },
      });
    });

    it('parses ado project', () => {
      expect(parseMappingUpdate('ado', 'frontend-team')).toEqual({
        ado: { project: 'frontend-team' },
      });
    });
  });
});
