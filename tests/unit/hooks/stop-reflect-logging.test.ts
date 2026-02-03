/**
 * @file stop-reflect-logging.test.ts
 * @description Tests for stop-reflect.sh structured decision logging
 *
 * T-007 [RED]: Write failing tests for stop-reflect outcome logging
 * Satisfies: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
 *
 * Test Cases:
 * - TC-008: Stop-reflect logs transcript stats
 * - TC-009: Stop-reflect logs learnings count
 * - TC-010: Stop-reflect logs exit reason
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('stop-reflect-logging', () => {
  let testDir: string;
  let hookPath: string;
  let logDecisionPath: string;
  let decisionsLogPath: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-stop-reflect-'));
    hookPath = path.resolve(
      __dirname,
      '../../../plugins/specweave/hooks/stop-reflect.sh',
    );
    logDecisionPath = path.resolve(
      __dirname,
      '../../../plugins/specweave/hooks/log-decision.sh',
    );

    // Setup .specweave directories
    fs.mkdirSync(path.join(testDir, '.specweave', 'logs', 'reflect'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });

    decisionsLogPath = path.join(testDir, '.specweave', 'logs', 'decisions.jsonl');
  });

  afterEach(() => {
    // Clean up test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to create a config file
   */
  function createConfig(options: { reflectEnabled?: boolean } = {}): void {
    const config = {
      reflect: {
        enabled: options.reflectEnabled ?? true,
      },
    };
    fs.writeFileSync(
      path.join(testDir, '.specweave', 'config.json'),
      JSON.stringify(config, null, 2),
    );
  }

  /**
   * Helper to create a mock transcript file
   * Note: wc -l counts newlines, so we add a trailing newline to get exact count
   */
  function createTranscript(lineCount: number): string {
    const transcriptPath = path.join(testDir, 'transcript.txt');
    const lines = Array.from(
      { length: lineCount },
      (_, i) => `Line ${i + 1}: Sample conversation content`,
    );
    // Add trailing newline so wc -l counts correctly
    fs.writeFileSync(transcriptPath, lines.join('\n') + '\n');
    return transcriptPath;
  }

  /**
   * Helper to run the hook with given input
   */
  function runHook(input: object): { stdout: string; stderr: string; status: number | null } {
    const result = spawnSync('bash', [hookPath], {
      input: JSON.stringify(input),
      env: {
        ...process.env,
        PROJECT_ROOT: testDir,
        // Override specweave command to avoid actual reflection
        PATH: `${testDir}/mock-bin:${process.env.PATH}`,
      },
      encoding: 'utf-8',
      cwd: testDir,
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status,
    };
  }

  /**
   * Helper to get the last decision log entry
   */
  function getLastDecisionEntry(): Record<string, unknown> | null {
    if (!fs.existsSync(decisionsLogPath)) {
      return null;
    }
    const content = fs.readFileSync(decisionsLogPath, 'utf-8').trim();
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  }

  /**
   * Helper to create a mock specweave CLI that reports learnings
   */
  function createMockSpecweaveCLI(options: { learningsExtracted?: number; categories?: string[]; exitCode?: number } = {}): void {
    const mockBinDir = path.join(testDir, 'mock-bin');
    fs.mkdirSync(mockBinDir, { recursive: true });

    // Create a mock specweave script
    const mockScript = `#!/bin/bash
# Mock specweave CLI for testing
if [ "$1" = "reflect-stop" ]; then
  # Output learnings info that the hook can parse
  echo "Learnings extracted: ${options.learningsExtracted ?? 0}"
  echo "Categories: ${(options.categories ?? []).join(', ')}"
  exit ${options.exitCode ?? 0}
fi
echo "Unknown command: $1"
exit 1
`;
    const mockPath = path.join(mockBinDir, 'specweave');
    fs.writeFileSync(mockPath, mockScript);
    fs.chmodSync(mockPath, '755');
  }

  describe('TC-008: Stop-reflect logs transcript stats', () => {
    it('should log transcriptLines in decision context', async () => {
      // Given: Transcript with 500 lines
      const transcriptPath = createTranscript(500);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI({ learningsExtracted: 0 });

      // When: stop-reflect.sh executes
      runHook({ transcript_path: transcriptPath });

      // Wait briefly for async logging
      await new Promise((r) => setTimeout(r, 100));

      // Then: Decision log entry has transcriptLines=500
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.hook).toBe('stop-reflect');
      expect(entry?.context).toBeDefined();

      const context = entry?.context as Record<string, unknown>;
      expect(context.transcriptLines).toBe(500);
    });

    it('should log reflectionEnabled status in context', async () => {
      // Given: Reflection is enabled in config
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI();

      // When: stop-reflect.sh executes
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 100));

      // Then: Decision log entry has reflectionEnabled=true
      const entry = getLastDecisionEntry();
      expect(entry?.context).toBeDefined();
      const context = entry?.context as Record<string, unknown>;
      expect(context.reflectionEnabled).toBe(true);
    });
  });

  describe('TC-009: Stop-reflect logs learnings count', () => {
    it('should log learningsExtracted count from reflection output', async () => {
      // Given: Reflection extracts 2 learnings
      const transcriptPath = createTranscript(200);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI({ learningsExtracted: 2, categories: ['general', 'testing'] });

      // When: stop-reflect.sh completes
      runHook({ transcript_path: transcriptPath });

      // Wait for background process and logging
      await new Promise((r) => setTimeout(r, 500));

      // Then: Decision log entry has learningsExtracted=2
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      const context = entry?.context as Record<string, unknown>;
      expect(context.learningsExtracted).toBe(2);
    });

    it('should log learningCategories array', async () => {
      // Given: Reflection extracts learnings in specific categories
      const transcriptPath = createTranscript(200);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI({
        learningsExtracted: 3,
        categories: ['devops', 'logging', 'general'],
      });

      // When: stop-reflect.sh completes
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 500));

      // Then: Decision log entry has learningCategories
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      const context = entry?.context as Record<string, unknown>;
      expect(context.learningCategories).toEqual(
        expect.arrayContaining(['devops', 'logging', 'general']),
      );
    });
  });

  describe('TC-010: Stop-reflect logs exit reason', () => {
    it('should log exitReason="disabled" when reflection is disabled in config', async () => {
      // Given: Reflection disabled in config (no mock CLI needed since we won't reach it)
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: false });

      // When: stop-reflect.sh executes
      runHook({ transcript_path: transcriptPath });
      // No need to wait long since disabled exits immediately (no background process)
      await new Promise((r) => setTimeout(r, 50));

      // Then: Decision log entry has exitReason="disabled"
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.decision).toBe('approve');
      expect(entry?.reasonCode).toBe('disabled');
      const context = entry?.context as Record<string, unknown>;
      expect(context.exitReason).toBe('disabled');
      expect(context.reflectionEnabled).toBe(false);
    });

    it('should log exitReason="no_transcript" when transcript is missing', async () => {
      // Given: No transcript available
      createConfig({ reflectEnabled: true });

      // When: stop-reflect.sh executes with no transcript
      runHook({ transcript_path: '' });
      await new Promise((r) => setTimeout(r, 100));

      // Then: Decision log entry has exitReason="no_transcript"
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.reasonCode).toBe('no_transcript');
      const context = entry?.context as Record<string, unknown>;
      expect(context.exitReason).toBe('no_transcript');
    });

    it('should log exitReason="transcript_too_short" when transcript has fewer than 10 lines', async () => {
      // Given: Transcript with only 5 lines
      const transcriptPath = createTranscript(5);
      createConfig({ reflectEnabled: true });

      // When: stop-reflect.sh executes
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 100));

      // Then: Decision log entry has exitReason="transcript_too_short"
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.reasonCode).toBe('transcript_too_short');
      const context = entry?.context as Record<string, unknown>;
      expect(context.exitReason).toBe('transcript_too_short');
      expect(context.transcriptLines).toBe(5);
    });

    it('should log exitReason="learnings_saved" when reflection succeeds with learnings', async () => {
      // Given: Reflection that extracts learnings
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI({ learningsExtracted: 2, exitCode: 0 });

      // When: stop-reflect.sh completes
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 500));

      // Then: Decision log entry has exitReason="learnings_saved"
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.reasonCode).toBe('learnings_saved');
      const context = entry?.context as Record<string, unknown>;
      expect(context.exitReason).toBe('learnings_saved');
    });

    it('should log exitReason="nothing_to_learn" when reflection finds no learnings', async () => {
      // Given: Reflection that extracts 0 learnings
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI({ learningsExtracted: 0, exitCode: 0 });

      // When: stop-reflect.sh completes
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 500));

      // Then: Decision log entry has exitReason="nothing_to_learn"
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.reasonCode).toBe('nothing_to_learn');
      const context = entry?.context as Record<string, unknown>;
      expect(context.exitReason).toBe('nothing_to_learn');
    });
  });

  describe('Additional context fields', () => {
    it('should log durationMs in decision entry (AC-US3-05)', async () => {
      // Given: Any valid reflection scenario
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI();

      // When: stop-reflect.sh executes
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 100));

      // Then: Decision log entry has durationMs
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      expect(entry?.durationMs).toBeDefined();
      expect(typeof entry?.durationMs).toBe('number');
      expect(entry?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should log trigger reason in context (AC-US3-01)', async () => {
      // Given: Session end triggers reflection
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI();

      // When: stop-reflect.sh executes (session end is the trigger)
      runHook({ transcript_path: transcriptPath });
      await new Promise((r) => setTimeout(r, 100));

      // Then: Decision log entry has triggerReason="session_end"
      const entry = getLastDecisionEntry();
      expect(entry).toBeDefined();
      const context = entry?.context as Record<string, unknown>;
      expect(context.triggerReason).toBe('session_end');
    });

    it('should always approve (never block sessions)', async () => {
      // Given: Any scenario
      const transcriptPath = createTranscript(100);
      createConfig({ reflectEnabled: true });
      createMockSpecweaveCLI();

      // When: stop-reflect.sh executes
      const result = runHook({ transcript_path: transcriptPath });

      // Then: Output is always approve
      expect(result.stdout.trim()).toBe('{"decision":"approve"}');
      expect(result.status).toBe(0);
    });
  });
});
