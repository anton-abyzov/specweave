/**
 * User Prompt Submit Hook - Plugin Auto-Loading Tests (v1.0.147+)
 *
 * Tests that the user-prompt-submit.sh hook correctly implements
 * LLM-BASED plugin detection (replaced keyword-based in v1.0.147).
 *
 * The hook now:
 * 1. Calls `specweave detect-intent` for unified LLM detection
 * 2. Parses JSON response for plugins[] and increment{}
 * 3. Runs `claude plugin install` SYNCHRONOUSLY for detected plugins
 * 4. Shows increment suggestions based on LLM response
 *
 * Key verification:
 * - LLM detection via `specweave detect-intent`
 * - Synchronous plugin installation via `claude plugin install`
 * - 30-minute caching to avoid redundant LLM calls
 * - Config controls (pluginAutoLoad.enabled, incrementAssist.enabled)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('User Prompt Submit Hook - LLM-Based Plugin Auto-Loading (v1.0.147+)', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  describe('LLM Detection Integration', () => {
    it('should call specweave detect-intent for unified detection', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should call detect-intent CLI
      expect(hookContent).toContain('specweave detect-intent');
    });

    it('should parse JSON response from detect-intent', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should use jq to parse JSON
      expect(hookContent).toContain('jq');
      expect(hookContent).toContain('.plugins');
      expect(hookContent).toContain('.increment');
    });

    it('should extract plugins array from LLM response', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should extract plugins from JSON
      expect(hookContent).toContain("jq -r '.plugins[]");
    });

    it('should extract increment recommendation from LLM response', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should extract increment action
      expect(hookContent).toContain('.increment.action');
      expect(hookContent).toContain('.increment.confidence');
    });
  });

  describe('Synchronous Plugin Installation (v1.0.147)', () => {
    it('should install plugins via claude plugin install', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should call claude plugin install
      expect(hookContent).toContain('claude plugin install');
    });

    it('should use synchronous execution (not background)', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // The plugin install should NOT be run in background
      // (we removed & disown for sync execution)
      // Check that we iterate over plugins synchronously
      expect(hookContent).toContain('for plugin in $DETECTED_PLUGINS');
    });

    it('should track installed vs already-loaded plugins', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should track what was installed
      expect(hookContent).toContain('PLUGINS_INSTALLED');
      expect(hookContent).toContain('PLUGINS_ALREADY');
    });
  });

  describe('Increment Suggestion Display', () => {
    it('should handle "new" increment action', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have case for "new" action
      expect(hookContent).toContain('new)');
      expect(hookContent).toContain('/sw:increment');
    });

    it('should handle "hotfix" increment action', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have case for "hotfix" action
      expect(hookContent).toContain('hotfix)');
      expect(hookContent).toContain('--type=hotfix');
    });

    it('should handle "reopen" increment action', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have case for "reopen" action
      expect(hookContent).toContain('reopen)');
      expect(hookContent).toContain('/sw:resume');
    });

    it('should respect incrementAssist.enabled config', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should check config for incrementAssist.enabled
      expect(hookContent).toContain('INCREMENT_ASSIST_ENABLED');
      expect(hookContent).toContain('incrementAssist.enabled');
    });

    it('should respect confidence threshold from config', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have confidence threshold check
      expect(hookContent).toContain('INCREMENT_CONFIDENCE_THRESHOLD');
    });
  });

  describe('Visible Feedback Mechanism', () => {
    it('should set AUTOLOAD_PLUGINS_MSG when plugins are loaded', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have AUTOLOAD_PLUGINS_MSG variable
      expect(hookContent).toContain('AUTOLOAD_PLUGINS_MSG');
    });

    it('should show "Loaded" message for newly installed plugins', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should show loaded plugins message (v1.0.162: table format with "Loaded:")
      expect(hookContent).toContain('Loaded:');
    });

    it('should show "Using" message for already-loaded plugins', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should show using plugins message (v1.0.162: table format with "Using:")
      expect(hookContent).toContain('Using:');
    });

    it('should include LLM reasoning in output', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should extract and show reasoning
      expect(hookContent).toContain('.reasoning');
      expect(hookContent).toContain('LLM_REASON');
    });
  });

  describe('Per-Session Cache', () => {
    it('should have per-session cache to avoid redundant LLM calls', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have cache mechanism
      expect(hookContent).toContain('PROMPT_CACHE_DIR');
      expect(hookContent).toContain('CACHE_FILE');
      expect(hookContent).toContain('SHOULD_CALL_LLM');
    });

    it('should use 30-minute cache window', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have 30-minute (1800 seconds) cache
      expect(hookContent).toContain('1800');
    });

    it('should use prompt hash for cache key', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should hash prompt for cache key
      expect(hookContent).toContain('PROMPT_HASH');
      expect(hookContent).toMatch(/md5/);
    });
  });

  describe('Config Controls', () => {
    it('should respect pluginAutoLoad.enabled config', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should check config for pluginAutoLoad.enabled
      expect(hookContent).toContain('PLUGIN_AUTOLOAD_ENABLED');
      expect(hookContent).toContain('pluginAutoLoad.enabled');
    });

    it('should respect SPECWEAVE_DISABLE_AUTO_LOAD env var', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should check env var
      expect(hookContent).toContain('SPECWEAVE_DISABLE_AUTO_LOAD');
    });

    it('should respect SPECWEAVE_DISABLE_HOOKS env var', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should check env var
      expect(hookContent).toContain('SPECWEAVE_DISABLE_HOOKS');
    });
  });

  describe('Skip Conditions', () => {
    it('should skip when prompt starts with /sw:', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should skip for /sw: commands (user already in workflow)
      expect(hookContent).toContain('/sw:');
      expect(hookContent).toMatch(/grep.*\/sw:/);
    });
  });

  describe('Documentation of Skip Scenarios', () => {
    it('should document when NOT to create increment', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have documentation of skip scenarios
      expect(hookContent).toContain('WHEN NOT TO CREATE INCREMENT');
      expect(hookContent).toContain('Questions');
      expect(hookContent).toContain('Exploration');
      expect(hookContent).toContain('Commands');
      expect(hookContent).toContain('Small fixes');
    });

    it('should document explicit opt-out phrases', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should document explicit opt-out
      expect(hookContent).toContain('EXPLICIT OPT-OUT');
    });
  });

  describe('Logging', () => {
    it('should log to lazy-loading.log', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should log to lazy-loading.log
      expect(hookContent).toContain('LAZY_LOAD_LOG');
      expect(hookContent).toContain('lazy-loading.log');
    });

    it('should log detection duration', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should log timing info
      expect(hookContent).toContain('duration');
    });
  });
});

describe('LLM Detection Response Handling', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  it('should handle JSON output from detect-intent', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    // Should parse JSON response
    expect(hookContent).toContain('JSON_OUTPUT');
    expect(hookContent).toContain('grep -E');
  });

  it('should handle multiple plugins in response', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    // Should iterate over plugins array
    expect(hookContent).toContain('for plugin in');
  });

  it('should handle empty plugins array gracefully', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    // Should check if plugins were detected
    expect(hookContent).toContain('-n "$DETECTED_PLUGINS"');
  });

  it('should use timeout for LLM call', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    // Should have timeout protection
    expect(hookContent).toContain('timeout');
  });
});
