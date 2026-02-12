/**
 * Tests for streamlined init question flow
 * T-003 [RED] → T-004 [GREEN]
 *
 * Verifies that the new prompt flow:
 * - Minimizes questions via auto-detection
 * - Never asks greenfield/brownfield or mono/multi-repo taxonomy
 * - Respects existing config on re-init
 * - Works in CI mode without prompts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  runPromptFlow,
  suggestTracker,
  type PromptFlowContext,
  type PromptFlowDeps,
  type PromptCallbacks,
} from '../../../../../src/cli/helpers/init/prompt-flow.js';
import type { ProviderInfo } from '../../../../../src/cli/helpers/init/provider-detection.js';

function createMockPrompts(overrides: Partial<PromptCallbacks> = {}): PromptCallbacks {
  return {
    confirmTracker: vi.fn().mockResolvedValue(true),
    selectTracker: vi.fn().mockResolvedValue({ type: 'none', name: 'None' }),
    promptCredentials: vi.fn().mockResolvedValue('token-from-prompt'),
    promptTrackerCredentials: vi.fn().mockResolvedValue({
      host: 'jira.example.com', email: 'a@b.com', apiToken: 'tok',
    }),
    confirmAddRepos: vi.fn().mockResolvedValue(false),
    selectRepos: vi.fn().mockResolvedValue([]),
    selectProvider: vi.fn().mockResolvedValue({
      provider: 'github', owner: 'user', repo: 'repo',
    }),
    ...overrides,
  };
}

function createContext(overrides: Partial<PromptFlowContext> = {}): PromptFlowContext {
  return {
    targetDir: '/tmp/test-project',
    language: 'en',
    isCI: false,
    ...overrides,
  };
}

describe('prompt-flow', () => {
  describe('runPromptFlow', () => {
    // ─── T-003 Required Tests ────────────────────────────────────

    it('should show only confirmTracker for GitHub + gh auth (≤2 total with language)', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      // Only confirmTracker should be called (1 prompt in flow + language = 2 total)
      expect(prompts.confirmTracker).toHaveBeenCalledOnce();
      expect(prompts.selectProvider).not.toHaveBeenCalled();
      expect(prompts.promptCredentials).not.toHaveBeenCalled();
      expect(prompts.confirmAddRepos).not.toHaveBeenCalled();
      expect(prompts.selectRepos).not.toHaveBeenCalled();
      expect(prompts.selectTracker).not.toHaveBeenCalled();
      expect(prompts.promptTrackerCredentials).not.toHaveBeenCalled();
    });

    it('should pre-select GitHub Issues when GitHub provider detected', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.confirmTracker).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'github-issues', name: 'GitHub Issues' }),
      );
    });

    it('should ask "add more repos?" when organization detected in remote (ADO)', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'ado', organization: 'myorg' }),
        detectCredentials: vi.fn().mockReturnValue(null),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.confirmAddRepos).toHaveBeenCalledWith('myorg');
    });

    it('should NOT ask "add more repos?" for GitHub single repo (owner, not org)', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.confirmAddRepos).not.toHaveBeenCalled();
    });

    it('should never ask about greenfield/brownfield status', async () => {
      // PromptCallbacks interface has no greenfield/brownfield methods
      // Greenfield detection is auto via isGreenfield(), not interactive
      const promptMethodNames = Object.keys(createMockPrompts());
      expect(promptMethodNames.every(name =>
        !name.toLowerCase().includes('greenfield') &&
        !name.toLowerCase().includes('brownfield'),
      )).toBe(true);

      // Run flow to verify it completes without greenfield questions
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      const result = await runPromptFlow(createContext(), deps);
      expect(result.provider).toBeTruthy();
    });

    it('should never ask mono/multi-repo taxonomy question', async () => {
      // PromptCallbacks uses "confirmAddRepos" (contextual: "add more repos?")
      // NOT "selectRepoTopology" or "chooseMonoMulti"
      const promptMethodNames = Object.keys(createMockPrompts());
      expect(promptMethodNames.some(name =>
        name.toLowerCase().includes('mono') ||
        name.toLowerCase().includes('multi') ||
        name.toLowerCase().includes('topology'),
      )).toBe(false);
    });

    it('should use existing tracker config as default on re-init', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      const existingConfig = {
        sync: {
          tracker: { type: 'jira', name: 'Jira' },
        },
      };

      await runPromptFlow(createContext({ existingConfig }), deps);

      // Should suggest existing Jira config, not auto-detected GitHub Issues
      expect(prompts.confirmTracker).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'jira', name: 'Jira' }),
      );
    });

    // ─── Provider Detection ─────────────────────────────────────

    it('should prompt for provider when none auto-detected', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue(null),
        detectCredentials: vi.fn().mockReturnValue(null),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.selectProvider).toHaveBeenCalledOnce();
    });

    it('should use auto-detected provider without prompting', async () => {
      const prompts = createMockPrompts();
      const provider: ProviderInfo = { provider: 'github', owner: 'acme', repo: 'my-app' };
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue(provider),
        detectCredentials: vi.fn().mockReturnValue('tok'),
        prompts,
      };

      const result = await runPromptFlow(createContext(), deps);

      expect(prompts.selectProvider).not.toHaveBeenCalled();
      expect(result.provider).toEqual(provider);
    });

    // ─── Credential Detection ───────────────────────────────────

    it('should prompt for credentials when none auto-detected', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue(null),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.promptCredentials).toHaveBeenCalledWith('github');
    });

    it('should skip credential prompt when auto-detected', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      const result = await runPromptFlow(createContext(), deps);

      expect(prompts.promptCredentials).not.toHaveBeenCalled();
      expect(result.credentials).toBe('gho_abc123');
    });

    // ─── CI Mode ────────────────────────────────────────────────

    it('should skip all prompts in CI mode', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      await runPromptFlow(createContext({ isCI: true }), deps);

      // No prompt functions should be called in CI mode
      expect(prompts.confirmTracker).not.toHaveBeenCalled();
      expect(prompts.selectProvider).not.toHaveBeenCalled();
      expect(prompts.promptCredentials).not.toHaveBeenCalled();
      expect(prompts.confirmAddRepos).not.toHaveBeenCalled();
      expect(prompts.selectRepos).not.toHaveBeenCalled();
      expect(prompts.selectTracker).not.toHaveBeenCalled();
      expect(prompts.promptTrackerCredentials).not.toHaveBeenCalled();
    });

    it('should return auto-detected values in CI mode', async () => {
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts: createMockPrompts(),
      };

      const result = await runPromptFlow(createContext({ isCI: true }), deps);

      expect(result.provider).toEqual({ provider: 'github', owner: 'acme', repo: 'my-app' });
      expect(result.credentials).toBe('gho_abc123');
      expect(result.tracker.type).toBe('github-issues');
    });

    // ─── Tracker Credentials ────────────────────────────────────

    it('should prompt for tracker credentials when tracker differs from provider', async () => {
      const prompts = createMockPrompts({
        confirmTracker: vi.fn().mockResolvedValue(false),
        selectTracker: vi.fn().mockResolvedValue({ type: 'jira', name: 'Jira' }),
      });
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.promptTrackerCredentials).toHaveBeenCalledWith('jira');
    });

    it('should not prompt for tracker credentials when tracker matches provider', async () => {
      const prompts = createMockPrompts({
        confirmTracker: vi.fn().mockResolvedValue(true),
      });
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'github', owner: 'acme', repo: 'my-app' }),
        detectCredentials: vi.fn().mockReturnValue('gho_abc123'),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.promptTrackerCredentials).not.toHaveBeenCalled();
    });

    // ─── Multi-Repo Expansion ───────────────────────────────────

    it('should call selectRepos when user confirms add repos', async () => {
      const prompts = createMockPrompts({
        confirmAddRepos: vi.fn().mockResolvedValue(true),
        selectRepos: vi.fn().mockResolvedValue(['repo-a', 'repo-b']),
      });
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'ado', organization: 'myorg' }),
        detectCredentials: vi.fn().mockReturnValue('pat123'),
        prompts,
      };

      const result = await runPromptFlow(createContext(), deps);

      expect(prompts.selectRepos).toHaveBeenCalledWith('myorg', 'ado');
      expect(result.additionalRepos).toEqual(['repo-a', 'repo-b']);
    });

    it('should not call selectRepos when user declines add repos', async () => {
      const prompts = createMockPrompts({
        confirmAddRepos: vi.fn().mockResolvedValue(false),
      });
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'ado', organization: 'myorg' }),
        detectCredentials: vi.fn().mockReturnValue('pat123'),
        prompts,
      };

      const result = await runPromptFlow(createContext(), deps);

      expect(prompts.selectRepos).not.toHaveBeenCalled();
      expect(result.additionalRepos).toEqual([]);
    });

    // ─── ADO Provider ───────────────────────────────────────────

    it('should suggest ADO Boards for ADO provider', async () => {
      const prompts = createMockPrompts();
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue({ provider: 'ado', organization: 'myorg' }),
        detectCredentials: vi.fn().mockReturnValue('pat123'),
        prompts,
      };

      await runPromptFlow(createContext(), deps);

      expect(prompts.confirmTracker).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ado-boards', name: 'Azure DevOps Boards' }),
      );
    });

    // ─── Null Provider from User Selection ──────────────────────

    it('should handle null provider from user selection (local project)', async () => {
      const prompts = createMockPrompts({
        selectProvider: vi.fn().mockResolvedValue(null),
      });
      const deps: PromptFlowDeps = {
        detectProvider: vi.fn().mockReturnValue(null),
        detectCredentials: vi.fn().mockReturnValue(null),
        prompts,
      };

      const result = await runPromptFlow(createContext(), deps);

      expect(result.provider).toBeNull();
      expect(result.credentials).toBeNull();
      // For null provider, tracker must be explicitly selected
      expect(prompts.selectTracker).toHaveBeenCalled();
    });
  });

  describe('suggestTracker', () => {
    it('should suggest GitHub Issues for GitHub provider', () => {
      const result = suggestTracker({ provider: 'github', owner: 'acme', repo: 'my-app' });
      expect(result).toEqual({ type: 'github-issues', name: 'GitHub Issues' });
    });

    it('should suggest ADO Boards for ADO provider', () => {
      const result = suggestTracker({ provider: 'ado', organization: 'myorg' });
      expect(result).toEqual({ type: 'ado-boards', name: 'Azure DevOps Boards' });
    });

    it('should suggest none for null provider', () => {
      const result = suggestTracker(null);
      expect(result).toEqual({ type: 'none', name: 'None' });
    });

    it('should suggest none for Bitbucket (no built-in tracker)', () => {
      const result = suggestTracker({ provider: 'bitbucket', owner: 'ws', repo: 'repo' });
      expect(result).toEqual({ type: 'none', name: 'None' });
    });
  });
});
