/**
 * Unit tests for session-start.sh plugin health check
 *
 * Tests the bash-level sw@specweave corruption repair logic added in inc 0573.
 * Uses real filesystem + jq to test the actual bash logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Skip if jq is not available (required for the health check)
const hasJq = (() => {
  try {
    execFileSync('which', ['jq'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasJq)('session-start plugin health check', () => {
  let tmpDir: string;
  let settingsPath: string;

  // Bash snippet that mirrors the health check logic in session-start.sh
  // Uses a custom HOME to isolate from real settings
  function runHealthCheck(home: string): string {
    const script = [
      `CLAUDE_SETTINGS="${home}/.claude/settings.json"`,
      'if command -v jq >/dev/null 2>&1 && [ -f "$CLAUDE_SETTINGS" ]; then',
      '  SW_STATE=$(jq -r \'.enabledPlugins["sw@specweave"]\' "$CLAUDE_SETTINGS" 2>/dev/null)',
      '  if [ "$SW_STATE" != "true" ]; then',
      '    jq \'.enabledPlugins["sw@specweave"] = true\' "$CLAUDE_SETTINGS" > "${CLAUDE_SETTINGS}.tmp" &&',
      '      mv "${CLAUDE_SETTINGS}.tmp" "$CLAUDE_SETTINGS" 2>/dev/null',
      '    echo "REPAIRED:$SW_STATE"',
      '  else',
      '    echo "OK"',
      '  fi',
      'fi',
    ].join('\n');

    return execFileSync('bash', ['-c', script], { encoding: 'utf-8' }).trim();
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-health-test-'));
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    settingsPath = path.join(tmpDir, '.claude', 'settings.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('repairs sw@specweave when set to false', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: {
        'sw@specweave': false,
        'frontend-design@claude-plugins-official': true,
      },
    }, null, 2));

    const output = runHealthCheck(tmpDir);
    expect(output).toBe('REPAIRED:false');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.enabledPlugins['sw@specweave']).toBe(true);
    // Other plugins should be preserved
    expect(settings.enabledPlugins['frontend-design@claude-plugins-official']).toBe(true);
  });

  it('adds sw@specweave when missing from enabledPlugins', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      enabledPlugins: {
        'frontend-design@claude-plugins-official': true,
      },
    }, null, 2));

    const output = runHealthCheck(tmpDir);
    // jq -r returns "null" for missing keys
    expect(output).toBe('REPAIRED:null');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.enabledPlugins['sw@specweave']).toBe(true);
  });

  it('is a no-op when sw@specweave is already true', () => {
    const original = JSON.stringify({
      enabledPlugins: {
        'sw@specweave': true,
        'frontend-design@claude-plugins-official': true,
      },
    }, null, 2);
    fs.writeFileSync(settingsPath, original);

    const output = runHealthCheck(tmpDir);
    expect(output).toBe('OK');

    // File should not have been modified
    const afterContent = fs.readFileSync(settingsPath, 'utf-8');
    expect(JSON.parse(afterContent)).toEqual(JSON.parse(original));
  });

  it('preserves all other settings when repairing', () => {
    const original = {
      permissions: { allow: ['mcp__pencil'], defaultMode: 'dontAsk' },
      enabledPlugins: {
        'sw@specweave': false,
        'skill-creator@claude-plugins-official': true,
        'hookify@claude-plugins-official': false,
      },
      voiceEnabled: true,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(original, null, 2));

    runHealthCheck(tmpDir);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.enabledPlugins['sw@specweave']).toBe(true);
    expect(settings.enabledPlugins['skill-creator@claude-plugins-official']).toBe(true);
    expect(settings.enabledPlugins['hookify@claude-plugins-official']).toBe(false);
    expect(settings.permissions).toEqual(original.permissions);
    expect(settings.voiceEnabled).toBe(true);
  });
});
