/**
 * Unit Tests for GitHub Multi-Repo Conditional Prompt Logic
 *
 * Tests the conditional flow that prevents duplicate prompts when
 * repositoryHosting is already provided from init.ts
 *
 * @module tests/unit/cli/helpers/github-multi-repo-conditional
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import inquirer from 'inquirer';

// Mock inquirer before importing the module under test
vi.mock('inquirer');

// Mock the RepoStructureManager to prevent real file system operations
vi.mock('../../../../src/core/repo-structure/repo-structure-manager.js', () => ({
  RepoStructureManager: vi.fn()
}));

describe('promptGitHubSetupType - Conditional Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when repositoryHosting is github-single', () => {
    it('should return single setupType without prompting', async () => {
      // Given: repositoryHosting is github-single
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // When: promptGitHubSetupType is called with github-single
      const result = await promptGitHubSetupType(undefined, undefined, 'github-single');

      // Then: Should return single without prompting
      expect(result).toEqual({ setupType: 'single' });
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });


  describe('when repositoryHosting is github-multirepo', () => {
    it('should return multiple setupType without prompting', async () => {
      // Given: repositoryHosting is github-multirepo
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // When: promptGitHubSetupType is called with github-multirepo
      const result = await promptGitHubSetupType(undefined, undefined, 'github-multirepo');

      // Then: Should return multiple without prompting
      expect(result).toEqual({ setupType: 'multiple' });
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });


  describe('when repositoryHosting is NOT provided (legacy flow)', () => {
    it('should show full repository setup prompt', async () => {
      // Given: repositoryHosting is undefined (legacy flow)
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // Mock the full setup prompt
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ setupType: 'single' });

      // When: promptGitHubSetupType is called without repositoryHosting
      const result = await promptGitHubSetupType();

      // Then: Should show full prompt with all options
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Select your repository setup:',
            choices: expect.arrayContaining([
              expect.objectContaining({ value: 'none' }),
              expect.objectContaining({ value: 'single' }),
              expect.objectContaining({ value: 'multiple' }),
              expect.objectContaining({ value: 'monorepo' })
            ])
          })
        ])
      );
      expect(result).toEqual({ setupType: 'single' });
    });
  });

  describe('duplicate prevention validation', () => {
    it('should NOT ask about single vs multiple when repositoryHosting is provided', async () => {
      // Given: All repositoryHosting values (two-step flow: structure + provider)
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      const testCases = [
        // GitHub providers
        { hosting: 'github-single', expectedCalls: 0, expectedSetupType: 'single' },
        { hosting: 'github-multirepo', expectedCalls: 0, expectedSetupType: 'multiple' },
        { hosting: 'github', expectedCalls: 0, expectedSetupType: 'single' },

        // Non-GitHub providers (should return 'none')
        { hosting: 'bitbucket-single', expectedCalls: 0, expectedSetupType: 'none' },
        { hosting: 'bitbucket-multirepo', expectedCalls: 0, expectedSetupType: 'none' },
        { hosting: 'ado-single', expectedCalls: 0, expectedSetupType: 'none' },
        { hosting: 'ado-multirepo', expectedCalls: 0, expectedSetupType: 'none' },
        { hosting: 'local', expectedCalls: 0, expectedSetupType: 'none' },
        { hosting: 'other-single', expectedCalls: 0, expectedSetupType: 'none' },
        { hosting: 'other-multirepo', expectedCalls: 0, expectedSetupType: 'none' }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        // When: Called with each hosting type
        const result = await promptGitHubSetupType(undefined, undefined, testCase.hosting);

        // Then: Should not ask about single vs multiple (that was already answered in init.ts)
        expect(inquirer.prompt).toHaveBeenCalledTimes(testCase.expectedCalls);
        expect(result.setupType).toBe(testCase.expectedSetupType);
      }
    });
  });
});
