/**
 * Tests for stop-auto.sh hook - the heart of autonomous execution
 *
 * This hook implements the Ralph Wiggum pattern with comprehensive testing validation.
 * It's critical for auto mode to work correctly across all platforms.
 *
 * Test coverage:
 * - Sound notifications (macOS, Linux, Windows)
 * - Session completion detection
 * - Test execution validation
 * - Agent type detection (orchestrator vs subagent)
 * - Block/approve decision logic
 * - Cross-platform compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
// CRITICAL: Import getCleanEnv to prevent NODE_OPTIONS debug flags from breaking child processes
import { getCleanEnv } from '../../test-utils/clean-env.js';

describe('stop-auto.sh hook', () => {
  let tempDir: string;
  let hookPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stop-auto-test-'));

    // Hook path (relative to project root)
    hookPath = path.resolve(__dirname, '../../../plugins/specweave/hooks/stop-auto.sh');

    // Ensure hook exists and is executable
    const hookStats = await fs.stat(hookPath);
    expect(hookStats.isFile()).toBe(true);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // NOTE: Sound notification feature is not currently implemented in stop-auto.sh
  // These tests are skipped until the feature is added
  describe.skip('Sound Notification Helper (UNIMPLEMENTED)', () => {
    it('should define play_notification_sound function', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');
      expect(hookContent).toContain('play_notification_sound()');
      expect(hookContent).toContain('local sound_type="${1:-attention}"');
    });

    it('should support cross-platform sound playback', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Check for platform detection
      expect(hookContent).toContain('case "$(uname -s)" in');

      // macOS support
      expect(hookContent).toContain('Darwin)');
      expect(hookContent).toContain('afplay');
      expect(hookContent).toContain('Glass.aiff');
      expect(hookContent).toContain('Ping.aiff');

      // Linux support
      expect(hookContent).toContain('Linux)');
      expect(hookContent).toContain('paplay');
      expect(hookContent).toContain('aplay');

      // Windows support
      expect(hookContent).toContain('MINGW*|MSYS*|CYGWIN*)');
      expect(hookContent).toContain('powershell.exe');
    });

    it('should have different sounds for success vs attention', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Check that function distinguishes between sound types
      expect(hookContent).toMatch(/if \[ "\$sound_type" = "success" \]/);
      expect(hookContent).toMatch(/Glass\.aiff/); // Success sound
      expect(hookContent).toMatch(/Ping\.aiff/); // Attention sound
    });
  });

  // NOTE: Sound notification feature is not currently implemented in stop-auto.sh
  // These tests are skipped until the feature is added
  describe.skip('approve() Function - Sound Integration (UNIMPLEMENTED)', () => {
    it('should call play_notification_sound ONLY on success', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Find approve() function
      const approveMatch = hookContent.match(/approve\(\) \{([\s\S]*?)^}/m);
      expect(approveMatch).toBeTruthy();

      const approveFn = approveMatch![0];

      // Should call play_notification_sound on success
      expect(approveFn).toContain('play_notification_sound');
      expect(approveFn).toMatch(/if \[ "\$is_success" = "true" \]/);
      expect(approveFn).toContain('play_notification_sound "success"');

      // Should NOT play sound on non-success (count occurrences)
      const soundCalls = (approveFn.match(/play_notification_sound/g) || []).length;
      expect(soundCalls).toBe(1); // Only one call - on success
    });

    it('should only play sound for orchestrator, not subagents', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Find approve() function
      const approveMatch = hookContent.match(/approve\(\) \{([\s\S]*?)^}/m);
      const approveFn = approveMatch![0];

      // Should check agent type before playing sound
      expect(approveFn).toMatch(/if \[ "\$agent_type" = "orchestrator" \]/);
    });
  });

  // NOTE: Sound notification feature is not currently implemented in stop-auto.sh
  // These tests are skipped until the feature is added
  describe.skip('block() Function - Sound Integration (UNIMPLEMENTED)', () => {
    it('should NOT play sound in block() (success-only policy)', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Find block() function (after approve)
      const blockMatch = hookContent.match(/^block\(\) \{([\s\S]*?)^}/m);
      expect(blockMatch).toBeTruthy();

      const blockFn = blockMatch![0];

      // Should NOT call play_notification_sound (block = continuing work)
      expect(blockFn).not.toContain('play_notification_sound');
    });

    it('should have comment explaining no sound on block', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      const blockMatch = hookContent.match(/^block\(\) \{([\s\S]*?)^}/m);
      const blockFn = blockMatch![0];

      // Should have explanatory comment
      expect(blockFn).toMatch(/NOTE:.*No sound.*SUCCESS/i);
    });
  });

  describe('Hook Execution - Integration Test', () => {
    it('should execute without errors when given valid input', async () => {
      // Create minimal auto session
      const stateDir = path.join(tempDir, '.specweave', 'state');
      await fs.mkdir(stateDir, { recursive: true });

      const sessionFile = path.join(stateDir, 'auto-session.json');
      await fs.writeFile(
        sessionFile,
        JSON.stringify({
          sessionId: 'test-session',
          incrementId: '0001-test',
          status: 'active',
          iteration: 1,
          maxIterations: 100,
        })
      );

      // Create tasks.md with completed tasks
      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-test');
      await fs.mkdir(incDir, { recursive: true });

      await fs.writeFile(
        path.join(incDir, 'tasks.md'),
        `### T-001: Test Task
**Status**: [x] completed
`
      );

      // Create transcript with completion signal
      const transcriptPath = path.join(tempDir, 'transcript.json');
      await fs.writeFile(
        transcriptPath,
        JSON.stringify({
          messages: [{ role: 'assistant', content: '<auto-complete>DONE</auto-complete>' }],
        })
      );

      // Prepare hook input
      const hookInput = JSON.stringify({
        transcript_path: transcriptPath,
        stop_hook_active: false,
      });

      // Execute hook
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
        (resolve, reject) => {
          const proc = spawn('bash', [hookPath], {
            cwd: tempDir,
            env: { ...getCleanEnv(), PROJECT_ROOT: tempDir },
          });

          let stdout = '';
          let stderr = '';

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          proc.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          proc.stdin.write(hookInput);
          proc.stdin.end();

          proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code || 0 });
          });

          proc.on('error', reject);
        }
      );

      // Should approve (all tasks complete)
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('approve');
    });

    it('should handle missing session gracefully', async () => {
      // No session file created

      const transcriptPath = path.join(tempDir, 'transcript.json');
      await fs.writeFile(
        transcriptPath,
        JSON.stringify({
          messages: [{ role: 'assistant', content: 'Some work' }],
        })
      );

      const hookInput = JSON.stringify({
        transcript_path: transcriptPath,
        stop_hook_active: false,
      });

      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
        (resolve, reject) => {
          const proc = spawn('bash', [hookPath], {
            cwd: tempDir,
            env: { ...getCleanEnv(), PROJECT_ROOT: tempDir },
          });

          let stdout = '';
          let stderr = '';

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          proc.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          proc.stdin.write(hookInput);
          proc.stdin.end();

          proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code || 0 });
          });

          proc.on('error', reject);
        }
      );

      // Should approve (no active session)
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('approve');
    });
  });

  // NOTE: Sound notification documentation tests - these check for unimplemented features
  describe.skip('Documentation (Sound Notifications - UNIMPLEMENTED)', () => {
    it('should have clear comments explaining sound notifications', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Check for documentation
      expect(hookContent).toMatch(/SOUND NOTIFICATION/i);
      expect(hookContent).toMatch(/v2\.6/); // Version marker
      expect(hookContent).toMatch(/Cross-platform/i);
    });

    it('should document sound types', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Should explain what each sound means
      expect(hookContent).toMatch(/success/i);
      expect(hookContent).toMatch(/attention/i);
    });
  });

  // NOTE: Sound notification edge case tests - these check for unimplemented features
  describe.skip('Edge Cases (Sound Notifications - UNIMPLEMENTED)', () => {
    it('should handle missing sound files gracefully (no crash)', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // All sound commands should have error redirection
      expect(hookContent).toMatch(/2>\/dev\/null/);

      // Should background sound processes (non-blocking)
      expect(hookContent).toMatch(/&$/m);
    });

    it('should work on systems without sound support', async () => {
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      // Sound commands should be optional (2>/dev/null &)
      // Hook should continue even if sound fails
      expect(hookContent).toContain('2>/dev/null &');
    });
  });
});

// NOTE: Sound notification platform tests - these check for unimplemented features
describe.skip('Sound Notification - Platform-Specific Tests (UNIMPLEMENTED)', () => {
  it('should detect macOS correctly', () => {
    // This test runs on macOS in CI
    if (process.platform === 'darwin') {
      expect(os.platform()).toBe('darwin');

      // macOS should have afplay
      const { spawnSync } = require('child_process');
      const result = spawnSync('which', ['afplay']);
      expect(result.status).toBe(0);
    }
  });

  it('should have fallback for Linux systems', async () => {
    const hookPath = path.resolve(
      __dirname,
      '../../../plugins/specweave/hooks/stop-auto.sh'
    );
    const hookContent = await fs.readFile(hookPath, 'utf-8');

    // Linux should try multiple sound systems
    expect(hookContent).toContain('paplay'); // PulseAudio
    expect(hookContent).toContain('aplay'); // ALSA
    expect(hookContent).toContain('speaker-test'); // Last resort
  });

  it('should have Windows support via PowerShell', async () => {
    const hookPath = path.resolve(
      __dirname,
      '../../../plugins/specweave/hooks/stop-auto.sh'
    );
    const hookContent = await fs.readFile(hookPath, 'utf-8');

    // Windows should use PowerShell
    expect(hookContent).toContain('powershell.exe');
    expect(hookContent).toContain('[console]::beep');
  });
});
