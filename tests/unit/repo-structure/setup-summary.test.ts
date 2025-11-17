import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for Setup Summary
 *
 * Following BDD Given/When/Then format for test cases
 * Test Coverage Target: 85%
 */

import { generateSetupSummary, formatRepo } from '../../../src/core/repo-structure/setup-summary.js';

describe('generateSetupSummary', () => {
  it('should include repository count in summary', () => {
    // Given: config with 3 repos
    const config = {
      projectName: 'my-project',
      state: {
        version: '1.0',
        architecture: 'parent' as const,
        parentRepo: {
          name: 'parent-repo',
          owner: 'myorg',
          description: 'Parent repository',
          visibility: 'private' as const,
          createOnGitHub: true,
          url: 'https://github.com/myorg/parent-repo'
        },
        repos: [
          {
            id: 'frontend',
            displayName: 'Frontend',
            owner: 'myorg',
            repo: 'frontend',
            visibility: 'private' as const,
            path: 'frontend/'
          },
          {
            id: 'backend',
            displayName: 'Backend',
            owner: 'myorg',
            repo: 'backend',
            visibility: 'private' as const,
            path: 'backend/'
          },
        ],
        currentStep: 'complete',
        timestamp: new Date().toISOString(),
        envCreated: false,
      },
    };

    // When: generateSetupSummary is called
    const result = generateSetupSummary(config);

    // Then: Includes repository information
    expect(result).toContain('3');
    expect(result).toContain('Repositories');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(100);
  });
});

describe('formatRepo', () => {
  it('should format repo as "displayName (owner/repo)"', () => {
    // Given: RepoConfig
    const repo = {
      id: 'frontend',
      displayName: 'Frontend App',
      owner: 'myorg',
      repo: 'my-frontend-app',
      visibility: 'public' as const,
    };

    // When: formatRepo is called
    const result = formatRepo(repo);

    // Then: Returns "Frontend App (myorg/my-frontend-app)"
    expect(result).toContain('Frontend App');
    expect(result).toContain('myorg/my-frontend-app');
    expect(result).toContain('(');
    expect(result).toContain(')');
  });
});
