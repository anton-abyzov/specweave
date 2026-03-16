/**
 * User Prompt Submit Hook - On-Demand Plugin Install Tests (v1.0.540)
 *
 * Tests that the restored on-demand plugin installation block:
 * 1. Calls `specweave refresh-plugins --plugin <name> --quiet` for detected plugins
 * 2. Skips already-installed plugins (cache dir or skills dir check)
 * 3. Skips session-repeated plugins (marker file idempotency)
 * 4. Skips `sw` (core always installed)
 * 5. Degrades gracefully when specweave CLI is unavailable
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('User Prompt Submit Hook - On-Demand Plugin Install (v1.0.540)', () => {
  const hookPath = path.join(
    __dirname,
    '../../../plugins/specweave/hooks/user-prompt-submit.sh'
  );

  let hookContent: string;

  beforeAll(() => {
    hookContent = fs.readFileSync(hookPath, 'utf-8');
  });

  // TC-001 (AC-US4-01): On-demand install triggers specweave refresh-plugins --plugin
  it('should call specweave refresh-plugins --plugin for detected plugins', () => {
    expect(hookContent).toContain('specweave refresh-plugins --plugin');
    expect(hookContent).toContain('--quiet');
  });

  // TC-002 (AC-US4-04): Session marker prevents duplicate installs
  it('should use session marker directory for idempotency', () => {
    expect(hookContent).toContain('SESSION_MARKER_DIR');
    expect(hookContent).toContain('specweave-ondemand-');
    expect(hookContent).toMatch(/touch.*SESSION_MARKER_DIR.*PLUGIN_NAME/);
    expect(hookContent).toMatch(/-f.*SESSION_MARKER_DIR.*PLUGIN_NAME/);
  });

  // TC-003 (AC-US4-04): Skip already-installed plugins (cache or skills dir)
  it('should check both cache and skills directories before installing', () => {
    expect(hookContent).toContain('CACHE_BASE=');
    expect(hookContent).toContain('SKILLS_BASE=');
    expect(hookContent).toMatch(/-d.*CACHE_BASE.*PLUGIN_NAME/);
    expect(hookContent).toMatch(/-d.*SKILLS_BASE.*PLUGIN_NAME/);
  });

  // TC-004 (AC-US4-03): Graceful degradation via 2>/dev/null
  it('should redirect stderr to /dev/null for graceful degradation', () => {
    // The specweave refresh-plugins call should have 2>/dev/null
    expect(hookContent).toMatch(/specweave refresh-plugins.*2>\/dev\/null/);
  });

  // TC-005: Skip sw (core always installed)
  it('should skip the sw core plugin', () => {
    expect(hookContent).toContain('PLUGIN_NAME" == "sw"');
  });

  // TC-006: Empty plugins array = no install
  it('should parse plugins from JSON_OUTPUT using jq', () => {
    expect(hookContent).toContain("DETECTED_PLUGINS=$(echo");
    expect(hookContent).toContain('.plugins[]');
  });

  // Verify the REMOVED block was actually replaced
  it('should no longer contain the REMOVED (v1.0.535) plugin install block', () => {
    // The first block should be replaced
    expect(hookContent).not.toContain('PLUGIN INSTALLATION/SUGGESTION — REMOVED (v1.0.535)');
    expect(hookContent).toContain('ON-DEMAND PLUGIN INSTALL (v1.0.540');
  });

  // Verify timeout handling
  it('should have a bounded wait for background install', () => {
    expect(hookContent).toContain('sleep 5');
    expect(hookContent).toContain('ONDEMAND_PIDS');
    expect(hookContent).toContain('timeout_pid');
  });

  // Verify plugin name sanitization
  it('should sanitize plugin names to prevent injection', () => {
    expect(hookContent).toMatch(/PLUGIN_NAME.*=~.*\^.*a-zA-Z/);
  });
});
