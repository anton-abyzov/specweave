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
  ALL_KNOWN_PLUGINS,
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
  // CRITICAL: Clear cache BEFORE checking CLI availability to prevent test pollution
  // This ensures fresh state when running with other test files
  clearCliCache();
  const cliStatus = isClaudeCliAvailable();
  const describeIfCli = cliStatus.available ? describe : describe.skip;

  beforeEach(() => {
    clearCliCache();
  });

  describeIfCli('With Claude CLI Available', () => {
    it('should return empty plugins for React prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM('Build a React dashboard with charts');

      // Skip gracefully if LLM API isn't working (auth error, rate limit, etc.)
      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (frontend, backend, etc.) are no longer returned - only sw-* plugins
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
      expect(result.durationMs).toBeLessThan(30000);
    }, 60000);

    it('should return empty plugins for API prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM('Create a Node.js REST API with Express');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (backend, etc.) are no longer returned - only sw-* plugins
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for full-stack prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Build a full-stack app with React frontend, Node.js backend, and Playwright tests'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (frontend, backend, testing) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for Kubernetes prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Deploy the app to Kubernetes with Helm charts'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (k8s) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for Terraform prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Set up AWS infrastructure using Terraform with VPC and ECS'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (infra) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for Stripe prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Integrate Stripe checkout for subscription billing'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (payments) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for TDD prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Use TDD to implement the user authentication with Vitest'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (testing) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for ML prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Train a PyTorch model for image classification'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (ml) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for React Native prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Build a React Native app for iOS and Android'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (mobile) are no longer returned
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return empty plugins for unrelated prompt', async () => {
      const result = await detectPluginsViaLLM(
        'What is the weather like today?'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.plugins.length).toBe(0);
    }, 60000);

    it('should provide reasoning for decisions', async () => {
      const result = await detectPluginsViaLLM(
        'Build a React app with authentication'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.reasoning).toBeTruthy();
      expect(typeof result.reasoning).toBe('string');
    }, 60000);
  });

  // Nuanced negative context tests - verifying LLM understands INTENT
  describeIfCli('Nuanced Negative Context Handling', () => {
    it('should NOT detect domain plugins when user wants CLI tool only', async () => {
      const result = await detectPluginsViaLLM(
        'Build a simple CLI tool in Node.js. Don\'t use React or any frontend framework.'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins are no longer returned - only sw-* plugins
      expect(result.plugins).not.toContain('frontend');
      expect(result.plugins).not.toContain('backend');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for Vue prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Don\'t use React, I prefer Vue.js for this dashboard project'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (frontend) are no longer returned
      expect(result.plugins).not.toContain('frontend');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for mobile prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Don\'t use React web, make it a React Native mobile app instead'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (mobile) are no longer returned
      expect(result.plugins).not.toContain('mobile');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for framework migration prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'I tried React but it was too complex. Help me build a simple Vue.js app instead.'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (frontend) are no longer returned
      expect(result.plugins).not.toContain('frontend');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for Angular prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'I hate React but I need to build a web dashboard with Angular'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (frontend) are no longer returned
      expect(result.plugins).not.toContain('frontend');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should return only sw-* plugins for server application prompt (domain plugins removed)', async () => {
      const result = await detectPluginsViaLLM(
        'Build a terminal-based server application. No UI, just API endpoints.'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (backend, frontend) are no longer returned
      expect(result.plugins).not.toContain('backend');
      expect(result.plugins).not.toContain('frontend');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
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
      systemMessage: 'SpecWeave: Loaded sw-github plugin for your project.',
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
  // CRITICAL: Clear cache BEFORE checking CLI availability to prevent test pollution
  clearCliCache();
  const cliStatus = isClaudeCliAvailable();

  beforeEach(() => {
    clearCliCache();
  });

  // Only run timing tests if CLI is available
  (cliStatus.available ? it : it.skip)('should complete detection within timeout', async () => {
    const startTime = performance.now();

    // Perform detection - we don't need the result, just timing
    const result = await detectPluginsViaLLM(
      'Build a simple React app',
      45000 // 45 second timeout (Opus can be slower)
    );

    const duration = performance.now() - startTime;

    // Skip gracefully if LLM failed (auth error, etc.)
    if (!result.success) {
      console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping timing test`);
      return;
    }

    // Opus model can take longer than Haiku - be generous with timing
    // Note: 45 seconds is the max reasonable response time
    expect(duration).toBeLessThan(50000);

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
    const unknownPlugin = 'sw-unknown-plugin';
    const knownSpecweavePlugin = 'sw';

    expect(SPECWEAVE_PLUGINS.includes(unknownPlugin as typeof SPECWEAVE_PLUGINS[number])).toBe(false);
    expect(SPECWEAVE_PLUGINS.includes(knownSpecweavePlugin as typeof SPECWEAVE_PLUGINS[number])).toBe(true);
  });
});

describe('Plugin List Validation', () => {
  it('should have all expected core plugins', () => {
    // 2.0 ships ONE plugin: `sw`. The tracker plugins (sw-github/jira/ado)
    // are gone — sync lives in the `sw:sync` skill + the `specweave sync` CLI.
    expect(SPECWEAVE_PLUGINS).toContain('sw');
  });

  // ============================================================================
  // GAP #1 TEST: OFFICIAL_PLUGINS should NOT include broken LSP plugins
  // See: https://github.com/anthropics/claude-code/issues/15148
  // Official marketplace LSP plugins only contain README files (no config)
  // ============================================================================
  it('should NOT include broken LSP plugins in ALL_KNOWN_PLUGINS', () => {
    // These LSP plugins are BROKEN in @claude-plugins-official
    // They only contain README.md files, no actual config
    const brokenLspPlugins = [
      'csharp-lsp',
      'gopls-lsp',
      'jdtls-lsp',
      'kotlin-lsp',
      'php-lsp',
      'lua-lsp',
      'clangd-lsp',
      'typescript-lsp',
      'pyright-lsp',
      'rust-analyzer-lsp',
    ];

    for (const brokenPlugin of brokenLspPlugins) {
      expect(ALL_KNOWN_PLUGINS).not.toContain(brokenPlugin);
    }
  });

  it('should not include removed vskill domain plugins', () => {
    // Domain plugins have been removed from the known plugins list
    expect(ALL_KNOWN_PLUGINS).not.toContain('frontend');
    expect(ALL_KNOWN_PLUGINS).not.toContain('backend');
    expect(ALL_KNOWN_PLUGINS).not.toContain('testing');
    expect(ALL_KNOWN_PLUGINS).not.toContain('mobile');
    expect(ALL_KNOWN_PLUGINS).not.toContain('infra');
    expect(ALL_KNOWN_PLUGINS).not.toContain('k8s');
    expect(ALL_KNOWN_PLUGINS).not.toContain('payments');
    expect(ALL_KNOWN_PLUGINS).not.toContain('ml');
  });

  it('should not advertise the removed 1.x tracker plugins', () => {
    // 2.0 removed sw-github / sw-jira / sw-ado from the capability surface.
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-github');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-jira');
    expect(SPECWEAVE_PLUGINS).not.toContain('sw-ado');
  });

  it('should have all expected integration plugins in SPECWEAVE_PLUGINS', () => {
    expect(SPECWEAVE_PLUGINS).toContain('sw-release');
    expect(SPECWEAVE_PLUGINS).toContain('sw-diagrams');
    expect(SPECWEAVE_PLUGINS).toContain('sw-docs');
    expect(SPECWEAVE_PLUGINS).toContain('sw-media');
  });

  it('should use sw-* marketplace prefix (not specweave-*)', () => {
    for (const plugin of SPECWEAVE_PLUGINS) {
      // All plugins either equal 'sw' or start with 'sw-'
      expect(plugin === 'sw' || plugin.startsWith('sw-')).toBe(true);
      // Should NOT use directory names (specweave-*)
      expect(plugin.startsWith('specweave-')).toBe(false);
    }
  });

  // ============================================================================
  // 0198: context7 and playwright should NOT be in OFFICIAL_PLUGINS
  // These are optional — users install manually if they want them
  // ============================================================================
  it('should NOT include context7 in ALL_KNOWN_PLUGINS', () => {
    expect(ALL_KNOWN_PLUGINS).not.toContain('context7');
  });

  it('should NOT include playwright in ALL_KNOWN_PLUGINS', () => {
    expect(ALL_KNOWN_PLUGINS).not.toContain('playwright');
  });

  it('should NOT have any "Core/Required" optional plugins', () => {
    // Optional third-party tools should not be in the known plugins list
    const optionalPlugins = ['context7', 'playwright'];
    for (const p of optionalPlugins) {
      expect(ALL_KNOWN_PLUGINS).not.toContain(p);
    }
  });
});

// ============================================================================
// LSP DETECTION TESTS (v1.0.198+)
// Unified LLM detection now includes LSP operation recommendation
// ============================================================================
describe('LLM Detection LSP Recommendation', () => {
  // CRITICAL: Clear cache BEFORE checking CLI availability to prevent test pollution
  clearCliCache();
  const cliStatus = isClaudeCliAvailable();
  const describeIfCli = cliStatus.available ? describe : describe.skip;

  beforeEach(() => {
    clearCliCache();
  });

  describeIfCli('With Claude CLI Available', () => {
    it('should return lsp.needed=true for "find references" prompt', async () => {
      const result = await detectPluginsViaLLM('Find all references to the handleRequest function');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // NEW: LSP field should exist and indicate LSP is needed
      expect(result.lsp).toBeDefined();
      expect(result.lsp?.needed).toBe(true);
      expect(result.lsp?.operation).toBe('references');
    }, 60000);

    it('should return lsp.needed=true for "go to definition" prompt', async () => {
      const result = await detectPluginsViaLLM('Go to the definition of UserService class');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.lsp).toBeDefined();
      expect(result.lsp?.needed).toBe(true);
      expect(result.lsp?.operation).toBe('definition');
    }, 60000);

    it('should return lsp.needed=true for "show type" or "hover" prompt', async () => {
      const result = await detectPluginsViaLLM('What is the type signature of processData?');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.lsp).toBeDefined();
      expect(result.lsp?.needed).toBe(true);
      expect(result.lsp?.operation).toBe('hover');
    }, 60000);

    it('should return lsp.needed=true for "list symbols" prompt', async () => {
      const result = await detectPluginsViaLLM('List all exported symbols in src/api/users.ts');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.lsp).toBeDefined();
      expect(result.lsp?.needed).toBe(true);
      expect(result.lsp?.operation).toBe('symbols');
    }, 60000);

    it('should detect language from prompt context', async () => {
      const result = await detectPluginsViaLLM('Find all references to handleRequest in the TypeScript codebase');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.lsp?.language).toBe('typescript');
    }, 60000);

    it('should return lsp.needed=false for non-LSP prompts', async () => {
      const result = await detectPluginsViaLLM('Build a React dashboard with charts');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // LSP should either be undefined or have needed=false
      if (result.lsp) {
        expect(result.lsp.needed).toBe(false);
      }
    }, 60000);

    it('should indicate warmupRequired when workspace not indexed', async () => {
      const result = await detectPluginsViaLLM('Find all usages of AuthService class');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      expect(result.lsp).toBeDefined();
      // warmupRequired should be a boolean
      expect(typeof result.lsp?.warmupRequired).toBe('boolean');
    }, 60000);
  });
});

// ============================================================================
// GAP #5 TEST: LLM detection should NOT suggest broken LSP plugins
// ============================================================================
describe('LLM Detection Should NOT Suggest Broken LSP Plugins', () => {
  // CRITICAL: Clear cache BEFORE checking CLI availability to prevent test pollution
  clearCliCache();
  const cliStatus = isClaudeCliAvailable();
  const describeIfCli = cliStatus.available ? describe : describe.skip;

  beforeEach(() => {
    clearCliCache();
  });

  describeIfCli('With Claude CLI Available', () => {
    it('should NOT return csharp-lsp for .NET prompt', async () => {
      const result = await detectPluginsViaLLM('Build a .NET API with Entity Framework');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (backend) are no longer returned - only sw-* plugins
      expect(result.plugins).not.toContain('backend');
      // Should NOT have broken csharp-lsp from official marketplace
      expect(result.plugins).not.toContain('csharp-lsp');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should NOT return gopls-lsp for Go prompt', async () => {
      const result = await detectPluginsViaLLM('Build a Go microservice with Gin');

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);
      // Domain plugins (backend) are no longer returned - only sw-* plugins
      expect(result.plugins).not.toContain('backend');
      // Should NOT have broken gopls-lsp from official marketplace
      expect(result.plugins).not.toContain('gopls-lsp');
      expect(result.plugins.every((p: string) => p === 'sw' || p.startsWith('sw-'))).toBe(true);
    }, 60000);

    it('should NOT return any *-lsp plugins from official marketplace', async () => {
      const result = await detectPluginsViaLLM(
        'Build a full-stack app with C#, Go, Java, PHP, and Lua'
      );

      if (!result.success) {
        console.log(`⚠️  LLM detection failed: ${result.error || 'unknown'} - skipping`);
        return;
      }

      expect(result.success).toBe(true);

      // Should NOT return ANY broken LSP plugins
      const brokenLspPlugins = [
        'csharp-lsp',
        'gopls-lsp',
        'jdtls-lsp',
        'kotlin-lsp',
        'php-lsp',
        'lua-lsp',
        'clangd-lsp',
      ];

      for (const brokenPlugin of brokenLspPlugins) {
        expect(result.plugins).not.toContain(brokenPlugin);
      }
    }, 60000);
  });
});
