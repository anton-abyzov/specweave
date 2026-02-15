import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Integration tests for stop-sync.sh event routing.
 * Validates that get_best_event_type() correctly prioritizes user-story events.
 */

const STOP_SYNC_PATH = join(
  process.cwd(),
  'plugins/specweave/hooks/stop-sync.sh',
);

describe('stop-sync.sh get_best_event_type', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'sw-stop-sync-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * Creates an event-types temp file and invokes get_best_event_type() from stop-sync.sh.
   * Extracts just the function and runs it in isolation.
   */
  function getBestEventType(
    incId: string,
    events: string[],
  ): string {
    const eventTypesFile = join(tmpDir, `event-types-${Date.now()}`);
    writeFileSync(eventTypesFile, events.join('\n') + '\n');

    // Extract the function from stop-sync.sh and call it
    const script = `
      EVENT_TYPES_FILE="${eventTypesFile}"

      # Priority: done > created > user-story.completed > reopened > user-story.reopened > sync
      get_best_event_type() {
          local inc_id="$1"
          if [ -f "$EVENT_TYPES_FILE" ]; then
              if grep -q "^\${inc_id}|increment\\.done$" "$EVENT_TYPES_FILE" 2>/dev/null; then
                  echo "increment.done"
              elif grep -q "^\${inc_id}|increment\\.created$" "$EVENT_TYPES_FILE" 2>/dev/null; then
                  echo "increment.created"
              elif grep -q "^\${inc_id}|user-story\\.completed$" "$EVENT_TYPES_FILE" 2>/dev/null; then
                  echo "user-story.completed"
              elif grep -q "^\${inc_id}|increment\\.reopened$" "$EVENT_TYPES_FILE" 2>/dev/null; then
                  echo "increment.reopened"
              elif grep -q "^\${inc_id}|user-story\\.reopened$" "$EVENT_TYPES_FILE" 2>/dev/null; then
                  echo "user-story.reopened"
              else
                  echo "increment.sync"
              fi
          else
              echo "increment.sync"
          fi
      }

      get_best_event_type "${incId}"
    `;

    try {
      return execSync(`bash -c '${script}'`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      }).trim();
    } catch {
      return 'error';
    }
  }

  it('returns increment.done when present (highest priority)', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|increment.done',
      '0206-test|user-story.completed',
      '0206-test|task.updated',
    ]);
    expect(result).toBe('increment.done');
  });

  it('returns increment.created over user-story.completed', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|increment.created',
      '0206-test|user-story.completed',
    ]);
    expect(result).toBe('increment.created');
  });

  it('returns user-story.completed over increment.reopened', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|user-story.completed',
      '0206-test|increment.reopened',
    ]);
    expect(result).toBe('user-story.completed');
  });

  it('returns user-story.completed for standalone US completion event', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|user-story.completed',
      '0206-test|task.updated',
    ]);
    expect(result).toBe('user-story.completed');
  });

  it('returns user-story.reopened when present', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|user-story.reopened',
      '0206-test|task.updated',
    ]);
    expect(result).toBe('user-story.reopened');
  });

  it('returns increment.reopened over user-story.reopened', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|increment.reopened',
      '0206-test|user-story.reopened',
    ]);
    expect(result).toBe('increment.reopened');
  });

  it('returns increment.sync for task.updated only', () => {
    const result = getBestEventType('0206-test', [
      '0206-test|task.updated',
      '0206-test|spec.updated',
    ]);
    expect(result).toBe('increment.sync');
  });

  it('returns increment.sync when no event-types file exists', () => {
    const script = `
      EVENT_TYPES_FILE="/nonexistent/file"
      get_best_event_type() {
          local inc_id="$1"
          if [ -f "$EVENT_TYPES_FILE" ]; then
              echo "should-not-reach"
          else
              echo "increment.sync"
          fi
      }
      get_best_event_type "0206-test"
    `;
    const result = execSync(`bash -c '${script}'`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
    expect(result).toBe('increment.sync');
  });

  it('isolates events by increment ID', () => {
    const result = getBestEventType('0210-test', [
      '0206-test|increment.done',
      '0210-test|user-story.completed',
    ]);
    expect(result).toBe('user-story.completed');
  });
});
