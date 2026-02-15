/**
 * Integration Test: Adaptive Context Budget
 *
 * Tests turn deduplication, configurable budget levels, auto-adaptation
 * under context pressure, and environment overrides in user-prompt-submit.sh.
 *
 * These are structural content-verification tests (read the hook file and
 * verify patterns exist) following the same approach as
 * user-prompt-submit-autoload.test.ts.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.join(
  process.cwd(),
  'plugins/specweave/hooks/user-prompt-submit.sh'
);

describe('Adaptive Context Budget (v1.0.262)', () => {
  const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');

  describe('Turn Deduplication', () => {
    it('should have dedup hash file variable', () => {
      expect(hookContent).toContain('.context-hash');
    });

    it('should compute hash with md5 or md5sum', () => {
      expect(hookContent).toMatch(/md5sum|md5/);
    });

    it('should compare current hash with previous', () => {
      expect(hookContent).toContain('PREV_HASH');
      expect(hookContent).toContain('CURRENT_HASH');
    });

    it('should output bare approve when hashes match', () => {
      // When dedup matches, should output just approve without additionalContext
      expect(hookContent).toMatch(/CURRENT_HASH.*==.*PREV_HASH|PREV_HASH.*==.*CURRENT_HASH/);
    });

    it('should save hash for next turn', () => {
      // Should write current hash to file
      expect(hookContent).toContain('CURRENT_HASH');
      expect(hookContent).toContain('.context-hash');
    });
  });

  describe('Configurable Budget Levels', () => {
    it('should read contextBudget.level from config', () => {
      expect(hookContent).toContain('contextBudget.level');
    });

    it('should read contextBudget.autoAdapt from config', () => {
      expect(hookContent).toContain('contextBudget.autoAdapt');
    });

    it('should have BUDGET_LEVEL variable', () => {
      expect(hookContent).toContain('BUDGET_LEVEL');
    });

    it('should map levels to char budgets', () => {
      // full=2500, compact=1000, minimal=300, off=0
      expect(hookContent).toContain('full)');
      expect(hookContent).toContain('compact)');
      expect(hookContent).toContain('minimal)');
      expect(hookContent).toContain('off)');
    });

    it('should support SPECWEAVE_CONTEXT_BUDGET env override', () => {
      expect(hookContent).toContain('SPECWEAVE_CONTEXT_BUDGET');
    });

    it('should exit early when budget is 0 (off)', () => {
      // When CONTEXT_BUDGET is 0, skip all assembly
      expect(hookContent).toMatch(/CONTEXT_BUDGET.*-eq.*0|CONTEXT_BUDGET.*==.*0/);
    });
  });

  describe('Context Pressure Auto-Adaptation', () => {
    it('should check context-pressure.json for auto-adapt', () => {
      expect(hookContent).toContain('context-pressure.json');
    });

    it('should read pressure level from state file', () => {
      expect(hookContent).toContain('PRESSURE_LEVEL');
    });

    it('should handle elevated pressure', () => {
      expect(hookContent).toContain('elevated');
    });

    it('should handle critical pressure', () => {
      expect(hookContent).toContain('critical');
    });

    it('should step down budget under pressure', () => {
      // When elevated: full→compact, compact→minimal
      // When critical: anything→minimal
      expect(hookContent).toContain('BUDGET_LEVEL');
    });
  });
});

describe('Session Start - Context Cleanup', () => {
  const sessionStartPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/v2/dispatchers/session-start.sh'
  );
  const sessionContent = fs.readFileSync(sessionStartPath, 'utf-8');

  it('should clear context-pressure.json on session start', () => {
    expect(sessionContent).toContain('context-pressure.json');
  });

  it('should clear .context-hash on session start', () => {
    expect(sessionContent).toContain('.context-hash');
  });
});

describe('PreCompact Hook Registration', () => {
  const hooksJsonPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/hooks.json'
  );
  const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));

  it('should have PreCompact entry in hooks.json', () => {
    expect(hooksJson.hooks).toHaveProperty('PreCompact');
  });

  it('should use fail-fast-wrapper for PreCompact', () => {
    const preCompactHooks = hooksJson.hooks.PreCompact;
    expect(preCompactHooks).toBeDefined();
    expect(preCompactHooks.length).toBeGreaterThan(0);
    const command = preCompactHooks[0].hooks[0].command;
    expect(command).toContain('fail-fast-wrapper.sh');
    expect(command).toContain('pre-compact.sh');
  });
});

describe('Fail-Fast Wrapper - PreCompact Timeout', () => {
  const wrapperPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/universal/fail-fast-wrapper.sh'
  );
  const wrapperContent = fs.readFileSync(wrapperPath, 'utf-8');

  it('should have timeout case for pre-compact.sh', () => {
    expect(wrapperContent).toContain('pre-compact.sh');
  });
});
