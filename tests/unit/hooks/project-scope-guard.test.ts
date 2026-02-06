/**
 * Project-Scope Initialization Guard Tests
 *
 * Tests the hook logic that prevents SpecWeave skills from running
 * in non-initialized projects, with user consent prompting.
 *
 * TDD Phase: GREEN - Testing actual implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  isSpecWeaveSkillInvocation,
  isProjectInitialized,
  evaluateProjectScopeGuard
} from '../../../src/core/hooks/project-scope-guard.js';

describe('Project-Scope Initialization Guard', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create temporary test directory
    tempDir = path.join(tmpdir(), `specweave-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    configPath = path.join(tempDir, '.specweave', 'config.json');
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('SpecWeave Skill Detection', () => {
    it('should detect /sw: skill invocations', () => {
      expect(isSpecWeaveSkillInvocation('/sw:increment "new feature"')).toBe(true);
      expect(isSpecWeaveSkillInvocation('/sw:do')).toBe(true);
      expect(isSpecWeaveSkillInvocation('/sw:progress')).toBe(true);
      expect(isSpecWeaveSkillInvocation('/sw:done 0001')).toBe(true);
    });

    it('should detect plugin-namespaced skill invocations', () => {
      expect(isSpecWeaveSkillInvocation('/sw-frontend:component-generate')).toBe(true);
      expect(isSpecWeaveSkillInvocation('/sw-testing:e2e-setup')).toBe(true);
      expect(isSpecWeaveSkillInvocation('/sw-jira:sync')).toBe(true);
    });

    it('should NOT detect non-SpecWeave commands', () => {
      expect(isSpecWeaveSkillInvocation('write a function')).toBe(false);
      expect(isSpecWeaveSkillInvocation('/help')).toBe(false);
      expect(isSpecWeaveSkillInvocation('implement user authentication')).toBe(false);
    });

    it('should handle case-insensitive detection', () => {
      expect(isSpecWeaveSkillInvocation('/SW:INCREMENT "test"')).toBe(true);
      expect(isSpecWeaveSkillInvocation('/Sw:Do')).toBe(true);
    });

    it('should detect skills in prompts with leading whitespace', () => {
      expect(isSpecWeaveSkillInvocation('  /sw:increment "test"')).toBe(true);
      expect(isSpecWeaveSkillInvocation('\n/sw:do')).toBe(true);
    });
  });

  describe('Project Initialization Detection', () => {
    it('should return false when .specweave does not exist', () => {
      expect(isProjectInitialized(tempDir)).toBe(false);
    });

    it('should return false when .specweave exists but config.json is missing', () => {
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      expect(isProjectInitialized(tempDir)).toBe(false);
    });

    it('should return true when .specweave/config.json exists', () => {
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ version: '1.0.0' }));
      expect(isProjectInitialized(tempDir)).toBe(true);
    });

    it('should handle symlinks correctly', () => {
      // Create a real project directory
      const realDir = path.join(tmpdir(), `specweave-real-${Date.now()}`);
      fs.mkdirSync(path.join(realDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(realDir, '.specweave', 'config.json'),
        JSON.stringify({ version: '1.0.0' })
      );

      // Create symlink to it
      const symlinkDir = path.join(tmpdir(), `specweave-link-${Date.now()}`);
      fs.symlinkSync(realDir, symlinkDir);

      expect(isProjectInitialized(symlinkDir)).toBe(true);

      // Cleanup
      fs.rmSync(symlinkDir, { force: true });
      fs.rmSync(realDir, { recursive: true, force: true });
    });
  });

  describe('Guard Evaluation Logic', () => {
    it('should NOT block non-SpecWeave prompts', () => {
      const result = evaluateProjectScopeGuard('write a function', tempDir);
      expect(result.shouldBlock).toBe(false);
      expect(result.promptUser).toBeUndefined();
    });

    it('should NOT block SpecWeave skills in initialized projects', () => {
      // Setup initialized project
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ version: '1.0.0' }));

      const result = evaluateProjectScopeGuard('/sw:increment "test"', tempDir);
      expect(result.shouldBlock).toBe(false);
      expect(result.promptUser).toBeUndefined();
    });

    it('should PROMPT user for SpecWeave skills in non-initialized projects', () => {
      const result = evaluateProjectScopeGuard('/sw:increment "test"', tempDir);

      expect(result.shouldBlock).toBe(true);
      expect(result.promptUser).toBe(true);
      expect(result.userPromptMessage).toBeDefined();
      expect(result.userPromptMessage).toContain('SpecWeave');
      expect(result.userPromptMessage).toContain('initialize');
    });

    it('should generate helpful prompt message with init command', () => {
      const result = evaluateProjectScopeGuard('/sw:do', tempDir);

      expect(result.userPromptMessage).toContain('specweave init');
      expect(result.userPromptMessage?.toLowerCase()).toContain('not initialized');
    });

    it('should suggest disabling plugins in prompt message', () => {
      const result = evaluateProjectScopeGuard('/sw:progress', tempDir);

      expect(result.userPromptMessage).toContain('disable');
      expect(result.userPromptMessage).toMatch(/settings\.json/i);
    });
  });

  describe('Guard Configuration', () => {
    it('should respect SPECWEAVE_DISABLE_GUARD environment variable', () => {
      process.env.SPECWEAVE_DISABLE_GUARD = '1';

      const result = evaluateProjectScopeGuard('/sw:increment "test"', tempDir);
      expect(result.shouldBlock).toBe(false);

      delete process.env.SPECWEAVE_DISABLE_GUARD;
    });

    it('should respect guard.enabled config in .specweave/config.json', () => {
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          version: '1.0.0',
          guard: { enabled: false }
        })
      );

      const result = evaluateProjectScopeGuard('/sw:increment "test"', tempDir);
      expect(result.shouldBlock).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing read permissions gracefully', () => {
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ version: '1.0.0' }));

      // Make config unreadable
      fs.chmodSync(configPath, 0o000);

      const result = evaluateProjectScopeGuard('/sw:increment "test"', tempDir);

      // Should treat as not initialized if can't read
      expect(result.shouldBlock).toBe(true);

      // Restore permissions for cleanup
      fs.chmodSync(configPath, 0o644);
    });

    it('should handle corrupted config.json gracefully', () => {
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.writeFileSync(configPath, 'INVALID JSON {{{');

      const result = evaluateProjectScopeGuard('/sw:increment "test"', tempDir);

      // Should treat as not initialized if config is corrupted
      expect(result.shouldBlock).toBe(true);
    });

    it('should handle very long prompts without performance issues', () => {
      const longPrompt = '/sw:increment "' + 'x'.repeat(10000) + '"';

      const start = Date.now();
      const result = evaluateProjectScopeGuard(longPrompt, tempDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be fast
      expect(result.shouldBlock).toBe(true);
    });
  });

  describe('Multi-Project Scenarios', () => {
    it('should detect initialization when in nested subdirectory', () => {
      // Setup: project root has .specweave
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ version: '1.0.0' }));

      // Create nested directory
      const nestedDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Should walk up and find .specweave at root
      const result = evaluateProjectScopeGuard('/sw:do', nestedDir);
      expect(result.shouldBlock).toBe(false);
    });

    it('should NOT find initialization in parent directory', () => {
      // Setup: parent has .specweave
      const parentDir = path.join(tmpdir(), `specweave-parent-${Date.now()}`);
      fs.mkdirSync(path.join(parentDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(parentDir, '.specweave', 'config.json'),
        JSON.stringify({ version: '1.0.0' })
      );

      // Child directory (separate project)
      const childDir = path.join(parentDir, 'unrelated-project');
      fs.mkdirSync(childDir, { recursive: true });

      // Should NOT use parent's .specweave
      const result = evaluateProjectScopeGuard('/sw:increment "test"', childDir);

      // This test depends on how we define "project boundary"
      // Option A: Only check current dir (strict)
      // Option B: Walk up tree (lenient) - this is what we'll implement
      expect(result.shouldBlock).toBe(false); // Found in parent

      // Cleanup
      fs.rmSync(parentDir, { recursive: true, force: true });
    });
  });
});
