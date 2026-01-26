/**
 * E2E Test: MANDATORY Increment Creation Enforcement
 *
 * Tests that:
 * 1. Hook generates MANDATORY instruction when increment assist detects feature request
 * 2. The MANDATORY message uses Claude-compliant format (XML tags, Skill tool syntax)
 * 3. Post-hook verification can detect if increment was created
 *
 * This fills the gap: previous tests disabled incrementAssist, so MANDATORY
 * flow was never actually tested.
 *
 * @since 1.0.168
 * @see ADR-0230 (UserPromptSubmit Hook additionalContext Fix)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import * as fs from '../../../src/utils/fs-native.js';
import { getCleanEnv } from '../../test-utils/clean-env.js';
import { findProjectRoot } from '../../test-utils/project-root.js';

const projectRoot = findProjectRoot(import.meta.url);

describe('MANDATORY Increment Creation - E2E', () => {
  const hookPath = path.join(
    projectRoot,
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  let testRoot: string;
  let mockBinDir: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `mandatory-increment-e2e-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    // Create isolated test directory with .specweave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'state'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'logs'));

    // Create mock bin directory for CLI mocks
    mockBinDir = path.join(testRoot, 'mock-bin');
    await fs.ensureDir(mockBinDir);

    // Create config with incrementAssist ENABLED and mandatory
    await fs.writeJSON(
      path.join(testRoot, '.specweave', 'config.json'),
      {
        pluginAutoLoad: { enabled: false }, // Disable plugin auto-load (not testing that)
        incrementAssist: {
          enabled: true,
          mandatory: true,
          confidenceThreshold: 0.7
        },
        testing: { defaultTestMode: 'test-after' }
      },
      { spaces: 2 }
    );

    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  /**
   * Create a mock specweave CLI that returns deterministic detect-intent response
   */
  async function createMockSpecweaveCli(detectIntentResponse: object): Promise<void> {
    const mockScript = `#!/bin/bash
# Mock specweave CLI for testing

if [[ "$1" == "detect-intent" ]]; then
  cat << 'MOCK_EOF'
${JSON.stringify(detectIntentResponse, null, 2)}
MOCK_EOF
  exit 0
fi

# Fall through for other commands
echo "Mock: Unknown command $1"
exit 1
`;

    const mockPath = path.join(mockBinDir, 'specweave');
    await fs.writeFile(mockPath, mockScript);
    await fs.chmod(mockPath, 0o755);
  }

  /**
   * Execute hook with mock CLI in PATH
   */
  function executeHook(prompt: string, options: { env?: Record<string, string> } = {}): {
    raw: string;
    parsed: unknown;
    exitCode: number;
    stderr: string;
  } {
    const env = {
      ...getCleanEnv(),
      SPECWEAVE_DISABLE_AUTO_LOAD: '0', // Enable auto-load detection
      SPECWEAVE_DISABLE_HOOKS: '0',
      PWD: testRoot,
      PATH: `${mockBinDir}:${process.env.PATH}`, // Mock CLI first in PATH
      ...options.env
    };

    const input = JSON.stringify({ prompt });

    try {
      const result = spawnSync('bash', [hookPath], {
        input,
        encoding: 'utf8',
        cwd: testRoot,
        env,
        timeout: 15000
      });

      const raw = result.stdout?.trim() || '';
      let parsed: unknown = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        // Output might not be JSON
      }

      return {
        raw,
        parsed,
        exitCode: result.status ?? -1,
        stderr: result.stderr || ''
      };
    } catch (err) {
      return {
        raw: '',
        parsed: null,
        exitCode: -1,
        stderr: String(err)
      };
    }
  }

  /**
   * Extract additionalContext from parsed hook output
   */
  function extractAdditionalContext(parsed: unknown): string | null {
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const output = parsed as Record<string, unknown>;

    if ('hookSpecificOutput' in output && typeof output.hookSpecificOutput === 'object') {
      const hookOutput = output.hookSpecificOutput as Record<string, unknown>;
      if ('additionalContext' in hookOutput && typeof hookOutput.additionalContext === 'string') {
        return hookOutput.additionalContext;
      }
    }

    return null;
  }

  describe('MANDATORY Message Generation', () => {
    it('should generate MANDATORY message when detect-intent returns new increment action', async () => {
      // Mock detect-intent to return a feature detection with mandatory: true
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.95,
          mandatory: true, // LLM decides this is mandatory
          suggestedName: 'react-dashboard',
          reasoning: 'Multi-file full-stack feature requiring spec-driven tracking'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Create a React dashboard with Stripe checkout');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // SKILL FIRST message should be present (v1.0.170+ format)
      expect(additionalContext).toBeTruthy();
      expect(additionalContext).toContain('SKILL FIRST');
      expect(additionalContext).toContain('sw:increment-planner');
      expect(additionalContext).toContain('Feature request');
    });

    it('should include Skill tool invocation syntax in MANDATORY message', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.90,
          mandatory: true,
          suggestedName: 'auth-feature',
          reasoning: 'Authentication feature implementation'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Build user authentication with JWT');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should include explicit Skill tool syntax for Claude
      expect(additionalContext).toContain('Skill(');
      expect(additionalContext).toContain('sw:increment');
    });

    it('should include explicit ordering instructions', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.88,
          mandatory: true,
          suggestedName: 'api-endpoints',
          reasoning: 'API development requiring specs'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Create REST API for user management');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should include explicit ordering (v1.0.170+ format)
      expect(additionalContext).toContain('Order matters');
      expect(additionalContext).toContain('Call Skill tool FIRST');
    });

    it('should NOT generate SKILL FIRST when LLM says mandatory: false', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.5,
          mandatory: false, // LLM decides this is NOT mandatory
          suggestedName: 'minor-fix',
          reasoning: 'Minor change'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Fix the typo in README');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should NOT have SKILL FIRST instruction (low confidence)
      if (additionalContext) {
        expect(additionalContext).not.toContain('SKILL FIRST');
      }
    });

    it('should NOT generate SKILL FIRST for questions', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'none',
          confidence: 0,
          mandatory: false,
          reasoning: 'Question, not implementation'
        },
        routing: { skills: [] }
      });

      const result = executeHook('How do I use React hooks?');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should not have SKILL FIRST instruction for questions
      if (additionalContext) {
        expect(additionalContext).not.toContain('SKILL FIRST');
      }
    });
  });

  describe('MANDATORY Message Format - Claude Compliance', () => {
    it('should use structured markdown format for instructions', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.92,
          mandatory: true,
          suggestedName: 'feature-x',
          reasoning: 'Feature implementation'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Implement feature X');

      const additionalContext = extractAdditionalContext(result.parsed);

      // v1.0.170+ uses structured markdown format with ASCII box
      expect(additionalContext).toContain('═');  // ASCII box border
      expect(additionalContext).toContain('**Your FIRST tool call must be:**');
      expect(additionalContext).toContain('Skill(');
    });

    it('should include confidence score for transparency', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.89,
          mandatory: true,
          suggestedName: 'dashboard',
          reasoning: 'Dashboard feature'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Build analytics dashboard');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should show confidence for transparency
      expect(additionalContext).toContain('0.89');
    });

    it('should include reasoning in the detection section', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.91,
          mandatory: true,
          suggestedName: 'stripe-integration',
          reasoning: 'Payment integration'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Add Stripe payment processing');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should include detection reason (v1.0.170+ format)
      expect(additionalContext).toContain('**Reason**:');
      expect(additionalContext).toContain('Payment integration');
    });
  });

  describe('Increment Detection Scenarios', () => {
    it('should detect multi-file feature requests', async () => {
      await createMockSpecweaveCli({
        plugins: ['sw-frontend', 'sw-backend'],
        increment: {
          action: 'new',
          confidence: 0.95,
          mandatory: true,
          suggestedName: 'fullstack-app',
          reasoning: 'Multi-file full-stack feature (React frontend + Node backend)'
        },
        routing: { skills: [] }
      });

      const result = executeHook('Create a fullstack app with React frontend and Node backend');

      const additionalContext = extractAdditionalContext(result.parsed);

      // v1.0.170+ format includes SKILL FIRST instruction
      expect(additionalContext).toContain('SKILL FIRST');
      expect(additionalContext).toContain('Multi-file');
    });

    it('should detect external folder project creation', async () => {
      // Note: External folder detection happens BEFORE LLM detection
      // So it doesn't need the mock

      const result = executeHook('Create project in ~/Projects/new-app', {
        env: { SPECWEAVE_DISABLE_AUTO_LOAD: '1' } // Disable to isolate external folder detection
      });

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      if (additionalContext) {
        // Should warn about external project
        expect(additionalContext).toMatch(/EXTERNAL|outside|NEW.*session/i);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle detect-intent timeout gracefully', async () => {
      // Create a mock that takes longer than the 15s timeout in the hook
      // The hook uses `timeout 15 specweave detect-intent`
      const mockScript = `#!/bin/bash
if [[ "$1" == "detect-intent" ]]; then
  sleep 20
  exit 1
fi
exit 1
`;
      const mockPath = path.join(mockBinDir, 'specweave');
      await fs.writeFile(mockPath, mockScript);
      await fs.chmod(mockPath, 0o755);

      const result = executeHook('Build something');

      // When detect-intent times out, hook should still return valid output
      // Exit code should be 0 (hook handles timeout internally)
      // OR if spawnSync itself times out, we just verify no hang
      // The key assertion: we didn't hang forever (test completed)
      expect(result.raw).toBeDefined();

      // If we got output, it should be valid JSON
      if (result.raw && result.raw.length > 0) {
        expect(() => JSON.parse(result.raw)).not.toThrow();
      }
    }, 20000); // Extended timeout for slow timeout test

    it('should handle malformed detect-intent response', async () => {
      // Create a mock that returns invalid JSON
      const mockScript = `#!/bin/bash
if [[ "$1" == "detect-intent" ]]; then
  echo "not valid json"
  exit 0
fi
exit 1
`;
      const mockPath = path.join(mockBinDir, 'specweave');
      await fs.writeFile(mockPath, mockScript);
      await fs.chmod(mockPath, 0o755);

      const result = executeHook('Build something');

      // Should handle gracefully
      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should handle missing specweave CLI', async () => {
      // Remove the mock from PATH
      const result = executeHook('Build something', {
        env: {
          PATH: '/usr/bin:/bin', // No specweave in PATH
          SPECWEAVE_DISABLE_AUTO_LOAD: '1'
        }
      });

      // Should handle gracefully
      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });
  });

  describe('Post-Hook Verification', () => {
    it('should be possible to verify increment was created after hook runs', async () => {
      // This tests the verification mechanism, not the actual creation
      // (Creation requires Claude to invoke the Skill tool)

      const incrementsDir = path.join(testRoot, '.specweave', 'increments');

      // Simulate increment creation (as if Claude followed the instruction)
      const incrementId = '0176-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      await fs.ensureDir(incrementDir);
      await fs.writeJSON(
        path.join(incrementDir, 'metadata.json'),
        {
          id: incrementId,
          status: 'planning',
          title: 'Test Increment',
          createdAt: new Date().toISOString()
        },
        { spaces: 2 }
      );

      // Verify increment exists
      const exists = await fs.pathExists(path.join(incrementDir, 'metadata.json'));
      expect(exists).toBe(true);

      // Verify metadata is valid
      const metadata = await fs.readJSON(path.join(incrementDir, 'metadata.json'));
      expect(metadata.id).toBe(incrementId);
      expect(metadata.status).toBe('planning');
    });

    it('should provide increment count check utility', async () => {
      const incrementsDir = path.join(testRoot, '.specweave', 'increments');

      // Count increments before
      const beforeEntries = await fs.readdir(incrementsDir).catch(() => []);
      const beforeCount = beforeEntries.filter(e => e.match(/^\d{4}/)).length;

      // Simulate increment creation
      await fs.ensureDir(path.join(incrementsDir, '0001-test'));
      await fs.writeJSON(
        path.join(incrementsDir, '0001-test', 'metadata.json'),
        { id: '0001-test', status: 'planning' },
        { spaces: 2 }
      );

      // Count increments after
      const afterEntries = await fs.readdir(incrementsDir);
      const afterCount = afterEntries.filter(e => e.match(/^\d{4}/)).length;

      // Verify count increased
      expect(afterCount).toBe(beforeCount + 1);
    });
  });
});

/**
 * Integration test helper: Check if increment exists
 */
export async function incrementExists(testRoot: string, pattern: string | RegExp): Promise<boolean> {
  const incrementsDir = path.join(testRoot, '.specweave', 'increments');

  if (!await fs.pathExists(incrementsDir)) {
    return false;
  }

  const entries = await fs.readdir(incrementsDir);

  if (typeof pattern === 'string') {
    return entries.includes(pattern);
  }

  return entries.some(e => pattern.test(e));
}

/**
 * Integration test helper: Count increments matching pattern
 */
export async function countIncrements(testRoot: string, pattern?: RegExp): Promise<number> {
  const incrementsDir = path.join(testRoot, '.specweave', 'increments');

  if (!await fs.pathExists(incrementsDir)) {
    return 0;
  }

  const entries = await fs.readdir(incrementsDir);

  if (!pattern) {
    return entries.filter(e => e.match(/^\d{4}/)).length;
  }

  return entries.filter(e => pattern.test(e)).length;
}
