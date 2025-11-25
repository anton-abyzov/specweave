/**
 * Unit tests for multi-repo intent detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectMultiRepoIntent,
  detectRepoTypeFromDescription,
  extractPrefixFromRepoName,
  getPrefixForRepoType,
} from '../../../src/utils/multi-repo-detector.js';

describe('detectMultiRepoIntent', () => {
  describe('explicit multi-repo patterns', () => {
    it('detects "3 repos" pattern', () => {
      const result = detectMultiRepoIntent('Build platform with 3 repos');
      expect(result.detected).toBe(true);
      expect(result.triggers).toContain('3 repos');
    });

    it('detects "multiple repos" pattern', () => {
      const result = detectMultiRepoIntent('I need multiple repos for this project');
      expect(result.detected).toBe(true);
    });

    it('detects "separate repos" pattern', () => {
      const result = detectMultiRepoIntent('Create separate repos for frontend and backend');
      expect(result.detected).toBe(true);
    });
  });

  describe('repo type detection', () => {
    it('detects frontend repo from keywords', () => {
      const result = detectMultiRepoIntent('Frontend repo with drag-drop menu builder');
      expect(result.detected).toBe(true);
      expect(result.suggestedRepos.some(r => r.type === 'frontend')).toBe(true);
    });

    it('detects backend repo from keywords', () => {
      const result = detectMultiRepoIntent('Backend API repo with CRUD endpoints');
      expect(result.detected).toBe(true);
      expect(result.suggestedRepos.some(r => r.type === 'backend')).toBe(true);
    });

    it('detects shared library repo', () => {
      const result = detectMultiRepoIntent('Shared library repo with schema validators');
      expect(result.detected).toBe(true);
      expect(result.suggestedRepos.some(r => r.type === 'shared')).toBe(true);
    });

    it('detects multiple repo types in one prompt', () => {
      const result = detectMultiRepoIntent(
        'Build platform with Frontend repo, Backend API repo, and Shared library'
      );
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.suggestedRepos.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GitHub URL extraction', () => {
    it('extracts single GitHub URL', () => {
      const result = detectMultiRepoIntent('Clone from https://github.com/myorg/my-app-fe');
      expect(result.cloneUrls).toContain('https://github.com/myorg/my-app-fe');
    });

    it('extracts multiple GitHub URLs', () => {
      const result = detectMultiRepoIntent(
        'Clone https://github.com/org/app-fe and https://github.com/org/app-be'
      );
      expect(result.cloneUrls.length).toBe(2);
      expect(result.detected).toBe(true);
    });
  });

  describe('confidence levels', () => {
    it('returns high confidence for multiple triggers + repos', () => {
      const result = detectMultiRepoIntent(
        '3 repos: Frontend repo, Backend API repo, Shared library'
      );
      expect(result.confidence).toBe('high');
    });

    it('returns medium confidence for single trigger', () => {
      const result = detectMultiRepoIntent('I need a frontend repo');
      expect(result.confidence).toBe('medium');
    });

    it('returns low confidence when no patterns match', () => {
      const result = detectMultiRepoIntent('Build something new');
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe('low');
    });
  });

  describe('real-world prompts', () => {
    it('detects sw-qr-menu style prompt', () => {
      const result = detectMultiRepoIntent(
        'Build contactless menu platform with 3 repos: Frontend Repo - drag-drop menu builder, Backend API Repo - CRUD endpoints, Shared Library Repo - schema validators'
      );
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.suggestedRepos.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('detectRepoTypeFromDescription', () => {
  it('detects frontend from UI keywords', () => {
    expect(detectRepoTypeFromDescription('User login form')).toBe('frontend');
    expect(detectRepoTypeFromDescription('Dashboard component')).toBe('frontend');
    expect(detectRepoTypeFromDescription('Drag-drop builder')).toBe('frontend');
  });

  it('detects backend from API keywords', () => {
    expect(detectRepoTypeFromDescription('REST API endpoint')).toBe('backend');
    expect(detectRepoTypeFromDescription('Database query')).toBe('backend');
    expect(detectRepoTypeFromDescription('Webhook notification')).toBe('backend');
  });

  it('detects shared from schema keywords', () => {
    expect(detectRepoTypeFromDescription('Validation schema')).toBe('shared');
    expect(detectRepoTypeFromDescription('Type definitions')).toBe('shared');
    expect(detectRepoTypeFromDescription('Utility helpers')).toBe('shared');
  });

  it('returns unknown for ambiguous descriptions', () => {
    expect(detectRepoTypeFromDescription('Implement feature')).toBe('unknown');
  });
});

describe('extractPrefixFromRepoName', () => {
  it('extracts FE prefix from frontend suffixes', () => {
    expect(extractPrefixFromRepoName('my-app-fe')).toBe('FE');
    expect(extractPrefixFromRepoName('my-app-frontend')).toBe('FE');
    expect(extractPrefixFromRepoName('my-app-web')).toBe('FE');
  });

  it('extracts BE prefix from backend suffixes', () => {
    expect(extractPrefixFromRepoName('my-app-be')).toBe('BE');
    expect(extractPrefixFromRepoName('my-app-backend')).toBe('BE');
    expect(extractPrefixFromRepoName('my-app-api')).toBe('BE');
  });

  it('extracts SHARED prefix from shared suffixes', () => {
    expect(extractPrefixFromRepoName('my-app-shared')).toBe('SHARED');
    expect(extractPrefixFromRepoName('my-app-common')).toBe('SHARED');
    expect(extractPrefixFromRepoName('my-app-lib')).toBe('SHARED');
  });

  it('returns null for unrecognized patterns', () => {
    expect(extractPrefixFromRepoName('my-project')).toBeNull();
    expect(extractPrefixFromRepoName('random-name')).toBeNull();
  });
});

describe('getPrefixForRepoType', () => {
  it('returns correct prefix for each type', () => {
    expect(getPrefixForRepoType('frontend')).toBe('FE');
    expect(getPrefixForRepoType('backend')).toBe('BE');
    expect(getPrefixForRepoType('api')).toBe('BE');
    expect(getPrefixForRepoType('shared')).toBe('SHARED');
    expect(getPrefixForRepoType('mobile')).toBe('MOBILE');
    expect(getPrefixForRepoType('infrastructure')).toBe('INFRA');
    expect(getPrefixForRepoType('unknown')).toBe('GEN');
  });
});
