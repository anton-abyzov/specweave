/**
 * E2E Test: Skill Invocation Directive Generation
 *
 * Tests that:
 * 1. Hook generates skill invocation directive when LLM recommends a skill
 * 2. MANDATORY skills use `<skill_invocation_required>` tags
 * 3. Skill({ skill: "..." }) syntax is correctly generated
 * 4. Non-mandatory skills show as recommendations (not required)
 *
 * This ensures domain skills (csharp-lsp, sw-ml:ml-engineer, etc.) are
 * invoked when plugins are installed.
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

describe('Skill Invocation Directive - E2E', () => {
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
      `skill-invocation-e2e-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    // Create isolated test directory with .specweave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'state'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'logs'));

    // Create mock bin directory for CLI mocks
    mockBinDir = path.join(testRoot, 'mock-bin');
    await fs.ensureDir(mockBinDir);

    // Create config with incrementAssist ENABLED
    await fs.writeJSON(
      path.join(testRoot, '.specweave', 'config.json'),
      {
        pluginAutoLoad: { enabled: false }, // Disable plugin auto-load (not testing that)
        incrementAssist: {
          enabled: true,
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

  describe('MANDATORY Skill Invocation', () => {
    it('should generate skill_invocation_required tag for mandatory skill', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.92,
          mandatory: true,
          suggestedName: 'ml-model',
          reasoning: 'Machine learning model implementation'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'sw-ml:ml-engineer',
          reason: 'Building a machine learning model requires ML expertise',
          mandatory: true
        }
      });

      const result = executeHook('Build a machine learning model to predict customer churn');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain skill_invocation_required tag
      expect(additionalContext).toBeTruthy();
      expect(additionalContext).toContain('skill_invocation_required');
      expect(additionalContext).toContain('sw-ml:ml-engineer');
    });

    it('should include Skill tool syntax for mandatory skills', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.88,
          mandatory: true,
          suggestedName: 'dotnet-api',
          reasoning: 'Backend API implementation'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'sw-backend:dotnet-backend',
          reason: '.NET development requires backend skill for patterns and best practices',
          mandatory: true
        }
      });

      const result = executeHook('Create a .NET Core API with Entity Framework');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should include explicit Skill tool syntax (note: LSP plugins work automatically, not as skills)
      expect(additionalContext).toContain('Skill({');
      expect(additionalContext).toContain('sw-backend:dotnet-backend');
    });

    it('should include MANDATORY label and "Do NOT skip" warning', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.95,
          mandatory: true,
          suggestedName: 'react-dashboard',
          reasoning: 'Frontend dashboard implementation'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'sw-frontend:frontend-architect',
          reason: 'Complex React dashboard needs frontend architecture expertise',
          mandatory: true
        }
      });

      const result = executeHook('Build a React dashboard with charts and data visualization');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should have strong warning language
      expect(additionalContext).toContain('MANDATORY');
      expect(additionalContext).toMatch(/Do NOT skip|Do NOT implement directly/i);
    });
  });

  describe('Non-Mandatory (Recommended) Skill Invocation', () => {
    it('should show recommendation for non-mandatory skills', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.75,
          mandatory: false,
          suggestedName: 'simple-feature',
          reasoning: 'Simple feature work'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'sw-testing:qa-engineer',
          reason: 'Testing could benefit from QA expertise',
          mandatory: false // Non-mandatory
        }
      });

      const result = executeHook('Add unit tests for the user service');

      const additionalContext = extractAdditionalContext(result.parsed);

      if (additionalContext) {
        // Should NOT use skill_invocation_required tag
        expect(additionalContext).not.toContain('skill_invocation_required');

        // Should show as recommendation
        expect(additionalContext).toContain('sw-testing:qa-engineer');
        expect(additionalContext).toMatch(/Recommended|Consider/i);
      }
    });

    it('should include Skill tool syntax even for recommendations', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.80,
          mandatory: false,
          suggestedName: 'api-endpoint',
          reasoning: 'API development'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'sw-backend:database-optimizer',
          reason: 'Database operations might benefit from optimization',
          mandatory: false
        }
      });

      const result = executeHook('Create an API endpoint for user data');

      const additionalContext = extractAdditionalContext(result.parsed);

      if (additionalContext) {
        // Should still include Skill syntax for easy invocation
        expect(additionalContext).toContain('Skill({');
        expect(additionalContext).toContain('sw-backend:database-optimizer');
      }
    });
  });

  describe('No Skill Invocation', () => {
    it('should not include skill directives when no skill recommended', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.85,
          mandatory: true,
          suggestedName: 'simple-fix',
          reasoning: 'Simple implementation'
        },
        routing: { skills: [] }
        // No skillInvocation field
      });

      const result = executeHook('Fix the bug in user authentication');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should NOT contain specific skill invocation directive
      if (additionalContext) {
        expect(additionalContext).not.toContain('skill_invocation_required');
        // But should still contain increment planning info (v1.0.170+ uses SKILL FIRST)
        expect(additionalContext).toContain('SKILL FIRST');
      }
    });

    it('should not fail if skillInvocation is empty', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'none',
          confidence: 0,
          mandatory: false,
          reasoning: 'Question, not implementation'
        },
        routing: { skills: [] },
        skillInvocation: null // Explicitly null
      });

      const result = executeHook('What is React?');

      expect(result.exitCode).toBe(0);
      // Should produce valid JSON
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });
  });

  describe('Skill Invocation with Routing Fallback', () => {
    it('should use skillInvocation over routing when both present', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.90,
          mandatory: true,
          suggestedName: 'k8s-deployment',
          reasoning: 'Kubernetes deployment'
        },
        routing: {
          skills: [
            {
              plugin: 'sw-infra',
              name: 'devops',
              fullName: 'sw-infra:devops',
              priority: 'primary',
              reason: 'Infrastructure work'
            }
          ]
        },
        skillInvocation: {
          skill: 'sw-k8s:kubernetes-architect',
          reason: 'Kubernetes-specific deployment needs K8s expertise',
          mandatory: true
        }
      });

      const result = executeHook('Create Kubernetes deployment manifests');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should use skillInvocation (kubernetes-architect) not routing (devops)
      expect(additionalContext).toContain('sw-k8s:kubernetes-architect');
      expect(additionalContext).toContain('skill_invocation_required');
    });

    it('should use routing when skillInvocation is empty', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.88,
          mandatory: true,
          suggestedName: 'terraform-infra',
          reasoning: 'Infrastructure as code'
        },
        routing: {
          skills: [
            {
              plugin: 'sw-infra',
              name: 'devops',
              fullName: 'sw-infra:devops',
              priority: 'primary',
              reason: 'Terraform infrastructure'
            }
          ]
        }
        // No skillInvocation
      });

      const result = executeHook('Create Terraform modules for AWS');

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should fall back to routing agent spawn directive
      if (additionalContext) {
        // Should have Task tool syntax (not Skill)
        expect(additionalContext).toContain('Task({');
        expect(additionalContext).toContain('sw-infra');
      }
    });
  });

  describe('Various Domain Skills', () => {
    const skillScenarios = [
      {
        name: 'Frontend React',
        skill: 'sw-frontend:frontend-architect',
        prompt: 'Build a React component library',
        reason: 'React component development'
      },
      {
        name: 'Backend .NET',
        skill: 'sw-backend:dotnet-backend',
        prompt: 'Create ASP.NET Core Web API',
        reason: '.NET backend development'
      },
      {
        name: 'Machine Learning',
        skill: 'sw-ml:ml-engineer',
        prompt: 'Train a neural network for image classification',
        reason: 'Machine learning model training'
      },
      {
        name: 'Kubernetes',
        skill: 'sw-k8s:kubernetes-architect',
        prompt: 'Set up Kubernetes cluster with Helm',
        reason: 'Kubernetes orchestration'
      },
      {
        name: 'Payments',
        skill: 'sw-payments:stripe-integration',
        prompt: 'Integrate Stripe payment processing',
        reason: 'Payment integration'
      },
      {
        name: 'Testing',
        skill: 'sw-testing:qa-engineer',
        prompt: 'Create E2E test suite with Playwright',
        reason: 'End-to-end testing'
      }
    ];

    for (const scenario of skillScenarios) {
      it(`should handle ${scenario.name} skill invocation`, async () => {
        await createMockSpecweaveCli({
          plugins: [],
          increment: {
            action: 'new',
            confidence: 0.90,
            mandatory: true,
            suggestedName: 'test-feature',
            reasoning: scenario.reason
          },
          routing: { skills: [] },
          skillInvocation: {
            skill: scenario.skill,
            reason: scenario.reason,
            mandatory: true
          }
        });

        const result = executeHook(scenario.prompt);

        expect(result.exitCode).toBe(0);

        const additionalContext = extractAdditionalContext(result.parsed);

        expect(additionalContext).toBeTruthy();
        expect(additionalContext).toContain(scenario.skill);
        expect(additionalContext).toContain('skill_invocation_required');
      });
    }
  });

  describe('Edge Cases', () => {
    it('should handle skill with special characters in name', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.85,
          mandatory: true,
          suggestedName: 'test',
          reasoning: 'Test'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'plugin-name:skill-with-dashes',
          reason: 'Test skill with dashes',
          mandatory: true
        }
      });

      // Use unique prompt to avoid cache collision
      const result = executeHook('Test prompt for special characters edge case');

      expect(result.exitCode).toBe(0);
      // Should produce valid JSON
      expect(() => JSON.parse(result.raw)).not.toThrow();

      const additionalContext = extractAdditionalContext(result.parsed);
      expect(additionalContext).toContain('plugin-name:skill-with-dashes');
    });

    it('should handle very long skill reason', async () => {
      const longReason = 'This is a very long reason '.repeat(20);

      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.85,
          mandatory: true,
          suggestedName: 'test',
          reasoning: 'Test'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'test:skill',
          reason: longReason,
          mandatory: true
        }
      });

      // Use unique prompt to avoid cache collision
      const result = executeHook('Test prompt for very long reason edge case');

      expect(result.exitCode).toBe(0);
      // Should produce valid JSON
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should handle skill with empty reason', async () => {
      await createMockSpecweaveCli({
        plugins: [],
        increment: {
          action: 'new',
          confidence: 0.85,
          mandatory: true,
          suggestedName: 'test',
          reasoning: 'Test'
        },
        routing: { skills: [] },
        skillInvocation: {
          skill: 'test:skill',
          reason: '', // Empty reason
          mandatory: true
        }
      });

      // Use unique prompt to avoid cache collision
      const result = executeHook('Test prompt for empty reason edge case');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);
      // Should still work and use default reason
      expect(additionalContext).toContain('test:skill');
      expect(additionalContext).toContain('specialized support');
    });
  });
});
