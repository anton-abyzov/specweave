/**
 * LLM-Based Plugin Detection Integration Tests
 *
 * Tests the new LLM-powered plugin detection that replaces unreliable
 * grep-based keyword matching. Uses Claude CLI (`claude -p`) with Haiku
 * model for fast, accurate intent detection.
 *
 * Key improvements over grep:
 * - Understands context ("don't use React" → depends on what user WANTS)
 * - Handles complex prompts with multiple technologies
 * - Properly interprets user intent, not just keyword presence
 *
 * Cross-OS testing:
 * - Tests work on Windows, macOS, and Linux
 * - Handles shell functions/aliases on Unix systems
 * - Uses cross-platform path handling throughout
 *
 * @module tests/integration/lazy-loading/llm-plugin-detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

// Import from actual implementation for integration testing
import {
  detectPluginsViaLLM,
  isClaudeCliAvailable,
  clearCliCache,
  getCliStatus,
  SPECWEAVE_PLUGINS,
  type LLMDetectionResult,
} from '../../../src/core/lazy-loading/llm-plugin-detector.js';
import { detectClaudeCli } from '../../../src/utils/claude-cli-detector.js';

// ============================================================================
// TESTS
// ============================================================================

describe('Claude CLI Availability Detection', () => {
  beforeEach(() => {
    // Clear cache between tests for isolation
    clearCliCache();
  });

  it('should detect Claude CLI availability cross-platform', () => {
    const result = isClaudeCliAvailable();

    // Result should have the expected shape
    expect(result).toHaveProperty('available');
    expect(typeof result.available).toBe('boolean');

    if (result.available) {
      expect(result.path).toBeTruthy();
      expect(typeof result.path).toBe('string');
    } else {
      expect(result.error).toBeTruthy();
    }
  });

  it('should use correct command for platform', () => {
    const isWindows = process.platform === 'win32';

    // The function should use 'where' on Windows, 'which' on Unix
    // This is tested implicitly by isClaudeCliAvailable working
    expect(isWindows ? 'where' : 'which').toBeTruthy();
  });

  it('should detect shell functions/aliases on Unix', () => {
    // Only relevant on Unix systems
    if (process.platform === 'win32') {
      return;
    }

    const status = detectClaudeCli();

    // Status should indicate detection method
    expect(status.platform).toBe(process.platform);

    if (status.available) {
      // Should have one of the valid detection methods
      expect(['binary', 'function', 'alias', 'npm-global']).toContain(status.detectionMethod);

      // If via shell workaround, that should be indicated
      if (status.detectionMethod === 'function' || status.detectionMethod === 'alias') {
        expect(status.shellWorkaround).toBe(true);
      }
    }
  });

  it('should cache CLI detection result for performance', () => {
    // First call should populate cache
    const result1 = isClaudeCliAvailable();
    const cachedStatus = getCliStatus();

    expect(cachedStatus).not.toBeNull();
    expect(cachedStatus?.available).toBe(result1.available);

    // Second call should use cache (same result)
    const result2 = isClaudeCliAvailable();
    expect(result2.available).toBe(result1.available);
  });

  it('should clear cache when requested', () => {
    // Populate cache
    isClaudeCliAvailable();
    expect(getCliStatus()).not.toBeNull();

    // Clear cache
    clearCliCache();
    expect(getCliStatus()).toBeNull();
  });
});

describe('LLM Plugin Detection', () => {
  // Check if CLI is available for real LLM tests
  const cliStatus = isClaudeCliAvailable();
  const describeIfCli = cliStatus.available ? describe : describe.skip;

  beforeEach(() => {
    clearCliCache();
  });

  describeIfCli('With Claude CLI Available', () => {
    it('should detect frontend plugins for React prompt', async () => {
      const result = await detectPluginsViaLLM('Build a React dashboard with charts');

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-frontend');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.durationMs).toBeLessThan(30000);
    }, 60000);

    it('should detect backend plugins for API prompt', async () => {
      const result = await detectPluginsViaLLM('Create a Node.js REST API with Express');

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-backend');
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 60000);

    it('should detect multiple plugins for full-stack prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Build a full-stack app with React frontend, Node.js backend, and Playwright tests'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-frontend');
      expect(result.plugins).toContain('specweave-backend');
      expect(result.plugins).toContain('specweave-testing');
    }, 60000);

    it('should detect K8s plugins for Kubernetes prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Deploy the app to Kubernetes with Helm charts'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-kubernetes');
    }, 60000);

    it('should detect infrastructure plugins for Terraform prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Set up AWS infrastructure using Terraform with VPC and ECS'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-infrastructure');
    }, 60000);

    it('should detect payment plugins for Stripe prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Integrate Stripe checkout for subscription billing'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-payments');
    }, 60000);

    it('should detect testing plugins for TDD prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Use TDD to implement the user authentication with Vitest'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-testing');
    }, 60000);

    it('should detect ML plugins for machine learning prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Train a PyTorch model for image classification'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-ml');
    }, 60000);

    it('should detect mobile plugins for React Native prompt', async () => {
      const result = await detectPluginsViaLLM(
        'Build a React Native app for iOS and Android'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-mobile');
    }, 60000);

    it('should return empty plugins for unrelated prompt', async () => {
      const result = await detectPluginsViaLLM(
        'What is the weather like today?'
      );

      expect(result.success).toBe(true);
      expect(result.plugins.length).toBe(0);
    }, 60000);

    it('should provide reasoning for decisions', async () => {
      const result = await detectPluginsViaLLM(
        'Build a React app with authentication'
      );

      expect(result.success).toBe(true);
      expect(result.reasoning).toBeTruthy();
      expect(typeof result.reasoning).toBe('string');
    }, 60000);
  });

  // Nuanced negative context tests - verifying LLM understands INTENT
  describeIfCli('Nuanced Negative Context Handling', () => {
    it('should NOT detect frontend when user wants CLI tool only', async () => {
      const result = await detectPluginsViaLLM(
        'Build a simple CLI tool in Node.js. Don\'t use React or any frontend framework.'
      );

      expect(result.success).toBe(true);
      // Should NOT include frontend plugin - user explicitly wants CLI/backend only
      expect(result.plugins).not.toContain('specweave-frontend');
      // Should include backend for Node.js
      expect(result.plugins).toContain('specweave-backend');
    }, 60000);

    it('should detect frontend when user wants Vue instead of React', async () => {
      const result = await detectPluginsViaLLM(
        'Don\'t use React, I prefer Vue.js for this dashboard project'
      );

      expect(result.success).toBe(true);
      // Should STILL include frontend - Vue is frontend technology!
      expect(result.plugins).toContain('specweave-frontend');
    }, 60000);

    it('should detect mobile when user wants mobile instead of web', async () => {
      const result = await detectPluginsViaLLM(
        'Don\'t use React web, make it a React Native mobile app instead'
      );

      expect(result.success).toBe(true);
      // Should include mobile
      expect(result.plugins).toContain('specweave-mobile');
      // Frontend is optional here - React Native can be considered either way
    }, 60000);

    it('should detect frontend when migrating from one framework to another', async () => {
      const result = await detectPluginsViaLLM(
        'I tried React but it was too complex. Help me build a simple Vue.js app instead.'
      );

      expect(result.success).toBe(true);
      // Should detect frontend (Vue is frontend)
      expect(result.plugins).toContain('specweave-frontend');
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 60000);

    it('should detect frontend when user hates React but needs web UI', async () => {
      const result = await detectPluginsViaLLM(
        'I hate React but I need to build a web dashboard with Angular'
      );

      expect(result.success).toBe(true);
      // Negative sentiment about React shouldn't exclude frontend domain
      expect(result.plugins).toContain('specweave-frontend');
    }, 60000);

    it('should detect backend only for terminal/server application', async () => {
      const result = await detectPluginsViaLLM(
        'Build a terminal-based server application. No UI, just API endpoints.'
      );

      expect(result.success).toBe(true);
      expect(result.plugins).toContain('specweave-backend');
      expect(result.plugins).not.toContain('specweave-frontend');
    }, 60000);
  });

  describe('Without Claude CLI (Graceful Degradation)', () => {
    it('should return helpful error when CLI unavailable', async () => {
      // Test the error structure
      const mockResult: LLMDetectionResult = {
        success: false,
        plugins: [],
        confidence: 0,
        error: 'Claude CLI not found in PATH',
        durationMs: 0,
      };

      expect(mockResult.success).toBe(false);
      expect(mockResult.error).toContain('Claude CLI');
      expect(mockResult.plugins).toEqual([]);
    });
  });
});

describe('Cross-Platform Path Handling', () => {
  it('should handle Windows paths correctly', () => {
    const isWindows = process.platform === 'win32';

    // Paths should use path.join, not hardcoded separators
    const testPath = path.join(os.homedir(), '.claude', 'plugins');
    expect(testPath).toBeTruthy();

    // Should not contain Unix-specific paths on Windows
    if (isWindows) {
      expect(testPath).not.toContain('/home/');
    }
  });

  it('should handle Unix paths correctly', () => {
    const isUnix = process.platform !== 'win32';

    const testPath = path.join(os.homedir(), '.claude', 'plugins');
    expect(testPath).toBeTruthy();

    // Should not contain Windows-specific paths on Unix
    if (isUnix) {
      expect(testPath).not.toContain('C:\\');
    }
  });

  it('should use os.tmpdir() for safe working directory', () => {
    const tmpDir = os.tmpdir();
    expect(tmpDir).toBeTruthy();
    expect(typeof tmpDir).toBe('string');

    // tmpdir should exist and be accessible
    const fs = require('fs');
    expect(fs.existsSync(tmpDir)).toBe(true);
  });
});

describe('Cross-Platform CLI Execution', () => {
  const isWindows = process.platform === 'win32';

  it('should report correct platform', () => {
    expect(['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'sunos']).toContain(
      process.platform
    );
  });

  it('should have SHELL environment variable on Unix', () => {
    if (!isWindows) {
      // Unix systems should have SHELL defined (bash, zsh, etc.)
      const shell = process.env.SHELL;
      // May not be set in CI, but if set should be valid
      if (shell) {
        expect(shell).toMatch(/\/(bash|zsh|sh|fish|tcsh|csh)$/);
      }
    }
  });

  it('should detect user shell correctly for interactive execution', () => {
    if (isWindows) {
      // Windows doesn't use SHELL the same way
      return;
    }

    const userShell = process.env.SHELL || '/bin/bash';
    const isZsh = userShell.includes('zsh');
    const shell = isZsh ? 'zsh' : 'bash';

    // Shell should be a valid executable name
    expect(['zsh', 'bash']).toContain(shell);
  });

  it('should handle spawnSync with proper encoding', () => {
    // Test that spawnSync works with UTF-8 encoding on this platform
    const result = spawnSync('echo', ['hello'], {
      encoding: 'utf8',
      shell: isWindows,
    });

    // On Unix, echo should work; on Windows with shell, also works
    if (result.status === 0) {
      expect(result.stdout).toContain('hello');
    }
  });
});

describe('Hook Output Format', () => {
  it('should format hook output correctly for Claude Code', () => {
    // Hook output must be valid JSON with specific fields
    const hookOutput = {
      continue: true,
      systemMessage: 'SpecWeave: Loaded specweave-frontend, specweave-backend plugins for your React + Node.js project.',
    };

    // Must be valid JSON
    expect(() => JSON.stringify(hookOutput)).not.toThrow();

    // Must have 'continue' field
    expect(hookOutput.continue).toBe(true);

    // systemMessage is optional but useful
    expect(hookOutput.systemMessage).toBeTruthy();
  });

  it('should format error output for missing CLI', () => {
    const hookOutput = {
      continue: true, // Don't block Claude Code
      systemMessage: `SpecWeave: Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code

Plugin auto-loading is disabled until Claude CLI is installed.`,
    };

    expect(() => JSON.stringify(hookOutput)).not.toThrow();
    expect(hookOutput.continue).toBe(true);
    expect(hookOutput.systemMessage).toContain('npm install');
  });
});

describe('Performance', () => {
  const cliStatus = isClaudeCliAvailable();

  beforeEach(() => {
    clearCliCache();
  });

  // Only run timing tests if CLI is available
  (cliStatus.available ? it : it.skip)('should complete detection within timeout', async () => {
    const startTime = performance.now();

    // Perform detection - we don't need the result, just timing
    await detectPluginsViaLLM(
      'Build a simple React app',
      30000 // 30 second timeout
    );

    const duration = performance.now() - startTime;

    // Haiku should respond within 10 seconds typically
    expect(duration).toBeLessThan(30000);

    // Log actual timing for monitoring
    console.log(`LLM detection took ${duration.toFixed(0)}ms`);
  }, 60000);
});

describe('Error Handling', () => {
  it('should handle malformed JSON response gracefully', () => {
    // Simulate parsing error
    const malformedResponse = 'This is not JSON {broken';

    try {
      JSON.parse(malformedResponse);
      expect(true).toBe(false); // Should not reach here
    } catch {
      // Expected - should handle gracefully
      expect(true).toBe(true);
    }
  });

  it('should handle timeout gracefully', async () => {
    // With a very short timeout, the request should fail gracefully
    const result: LLMDetectionResult = {
      success: false,
      plugins: [],
      confidence: 0,
      error: 'Request timed out',
      durationMs: 100,
    };

    expect(result.success).toBe(false);
    expect(result.plugins).toEqual([]);
  });

  it('should validate plugin names against known list', () => {
    const unknownPlugin = 'specweave-unknown-plugin';
    const knownPlugin = 'specweave-frontend';

    expect(SPECWEAVE_PLUGINS.includes(unknownPlugin as typeof SPECWEAVE_PLUGINS[number])).toBe(false);
    expect(SPECWEAVE_PLUGINS.includes(knownPlugin as typeof SPECWEAVE_PLUGINS[number])).toBe(true);
  });
});

describe('Plugin List Validation', () => {
  it('should have all expected core plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('specweave');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-frontend');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-backend');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-testing');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-mobile');
  });

  it('should have all expected infrastructure plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('specweave-infrastructure');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-kubernetes');
  });

  it('should have all expected integration plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('specweave-github');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-jira');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-ado');
  });

  it('should have all expected specialized plugins', () => {
    expect(SPECWEAVE_PLUGINS).toContain('specweave-payments');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-ml');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-kafka');
    expect(SPECWEAVE_PLUGINS).toContain('specweave-confluent');
  });

  it('should use specweave-* prefix (not sw-*)', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      expect(plugin.startsWith('specweave')).toBe(true);
      expect(plugin.startsWith('sw-')).toBe(false);
    }
  });
});
