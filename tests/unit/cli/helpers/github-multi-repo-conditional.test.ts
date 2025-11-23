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

  describe('when repositoryHosting is github-multi', () => {
    it('should ask ONLY about architecture type (monorepo vs multi-repo vs parent)', async () => {
      // Given: repositoryHosting is github-multi
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // Mock the architecture type prompt
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ multiType: 'monorepo' });

      // When: promptGitHubSetupType is called with github-multi
      const result = await promptGitHubSetupType(undefined, undefined, 'github-multi');

      // Then: Should ask about architecture type only
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Select architecture type:',
            choices: expect.arrayContaining([
              expect.objectContaining({ value: 'monorepo' }),
              expect.objectContaining({ value: 'multiple' }),
              expect.objectContaining({ value: 'github-parent' })
            ])
          })
        ])
      );
      expect(result).toEqual({ setupType: 'monorepo' });
    });

    it('should map github-parent to multiple for backwards compatibility', async () => {
      // Given: repositoryHosting is github-multi
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // Mock user selecting github-parent
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ multiType: 'github-parent' });

      // When: promptGitHubSetupType is called
      const result = await promptGitHubSetupType(undefined, undefined, 'github-multi');

      // Then: Should map github-parent to multiple
      expect(result).toEqual({ setupType: 'multiple' });
    });

    it('should return multi-repo setupType when user selects multi-repo', async () => {
      // Given: repositoryHosting is github-multi
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // Mock user selecting multi-repo
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ multiType: 'multiple' });

      // When: promptGitHubSetupType is called
      const result = await promptGitHubSetupType(undefined, undefined, 'github-multi');

      // Then: Should return multiple
      expect(result).toEqual({ setupType: 'multiple' });
    });
  });

  describe('when repositoryHosting is local', () => {
    it('should return none setupType without prompting', async () => {
      // Given: repositoryHosting is local
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // When: promptGitHubSetupType is called with local
      const result = await promptGitHubSetupType(undefined, undefined, 'local');

      // Then: Should return none without prompting
      expect(result).toEqual({ setupType: 'none' });
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });

  describe('when repositoryHosting is other', () => {
    it('should return none setupType without prompting', async () => {
      // Given: repositoryHosting is other
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      // When: promptGitHubSetupType is called with other
      const result = await promptGitHubSetupType(undefined, undefined, 'other');

      // Then: Should return none without prompting
      expect(result).toEqual({ setupType: 'none' });
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
      // Given: Various repositoryHosting values
      const { promptGitHubSetupType } = await import('../../../../src/cli/helpers/issue-tracker/github-multi-repo.js');

      const testCases = [
        { hosting: 'github-single', expectedCalls: 0 },
        { hosting: 'github-multi', expectedCalls: 1 }, // Only asks about TYPE
        { hosting: 'local', expectedCalls: 0 },
        { hosting: 'other', expectedCalls: 0 }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        if (testCase.expectedCalls > 0) {
          vi.mocked(inquirer.prompt).mockResolvedValueOnce({ multiType: 'monorepo' });
        }

        // When: Called with each hosting type
        await promptGitHubSetupType(undefined, undefined, testCase.hosting);

        // Then: Should not ask about single vs multiple (that was already answered in init.ts)
        expect(inquirer.prompt).toHaveBeenCalledTimes(testCase.expectedCalls);

        if (testCase.expectedCalls > 0) {
          // Should only ask about architecture TYPE, not hosting
          expect(inquirer.prompt).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({
                message: expect.stringMatching(/architecture type/i)
              })
            ])
          );
        }
      }
    });
  });
});
