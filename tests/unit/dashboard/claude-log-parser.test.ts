import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeLogParser } from '../../../src/dashboard/server/data/claude-log-parser.js';

describe('ClaudeLogParser', () => {
  let tempHome: string;
  let logDir: string;
  let parser: ClaudeLogParser;
  const projectRoot = '/test/logparser';
  let origHome: string | undefined;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'log-parser-test-'));
    origHome = process.env.HOME;
    process.env.HOME = tempHome;

    // ClaudeLogParser logDir = $HOME/.claude/projects/-test-logparser
    logDir = path.join(tempHome, '.claude', 'projects', '-test-logparser');
    fs.mkdirSync(logDir, { recursive: true });

    parser = new ClaudeLogParser(projectRoot);
  });

  afterEach(() => {
    process.env.HOME = origHome;
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  function writeSession(sessionId: string, entries: Record<string, unknown>[]): void {
    const filePath = path.join(logDir, `${sessionId}.jsonl`);
    fs.writeFileSync(filePath, entries.map(e => JSON.stringify(e)).join('\n'));
  }

  describe('getSessionSummaries', () => {
    it('should return empty array for empty log dir', async () => {
      const result = await parser.getSessionSummaries();
      expect(result).toEqual([]);
    });

    it('should parse multiple session files in parallel', async () => {
      for (let i = 0; i < 5; i++) {
        writeSession(`session-${i}`, [
          { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
          {
            type: 'assistant',
            timestamp: '2026-02-15T10:00:01Z',
            message: { content: [{ type: 'text', text: 'hi' }], model: 'claude-opus-4-6' },
          },
        ]);
      }

      const result = await parser.getSessionSummaries(10);
      expect(result).toHaveLength(5);
      for (const s of result) {
        expect(s.messageCount).toBe(1);
      }
    });

    it('should deduplicate concurrent calls', async () => {
      writeSession('session-0', [
        { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
      ]);

      // Fire two concurrent calls
      const [r1, r2] = await Promise.all([
        parser.getSessionSummaries(10),
        parser.getSessionSummaries(10),
      ]);

      expect(r1).toHaveLength(1);
      expect(r2).toHaveLength(1);
      // Both should return equivalent data (dedup)
      expect(r1).toEqual(r2);
    });

    it('should use aggregate cache on subsequent calls', async () => {
      writeSession('session-0', [
        { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
      ]);

      const r1 = await parser.getSessionSummaries(10);
      const r2 = await parser.getSessionSummaries(10);

      // Second call should return equivalent cached result
      expect(r1).toEqual(r2);
    });

    it('should skip corrupted files gracefully', async () => {
      writeSession('good-session', [
        { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
      ]);
      fs.writeFileSync(path.join(logDir, 'bad-session.jsonl'), 'not valid json\n{broken');

      const result = await parser.getSessionSummaries(10);
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('good-session');
    });
  });

  describe('error detection', () => {
    it('should detect system errors', async () => {
      writeSession('error-session', [
        { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
        {
          type: 'system',
          level: 'error',
          subtype: 'api_error',
          timestamp: '2026-02-15T10:00:01Z',
          error: { error: { error: { message: 'Rate limit exceeded', type: 'overloaded_error' } } },
        },
      ]);

      const result = await parser.getSessionSummaries(10);
      expect(result).toHaveLength(1);
      expect(result[0].errors).toHaveLength(1);
      expect(result[0].errors[0].type).toBe('rate_limit');
    });

    it('should detect tool failures with context', async () => {
      writeSession('tool-error-session', [
        {
          type: 'assistant',
          timestamp: '2026-02-15T10:00:00Z',
          message: {
            content: [
              { type: 'tool_use', id: 'tu-1', name: 'Bash', input: { command: 'npm test' } },
            ],
          },
        },
        {
          type: 'user',
          timestamp: '2026-02-15T10:00:01Z',
          message: {
            content: [
              { type: 'tool_result', tool_use_id: 'tu-1', is_error: true, content: 'Command failed' },
            ],
          },
        },
      ]);

      const result = await parser.getSessionSummaries(10);
      expect(result).toHaveLength(1);
      expect(result[0].errors).toHaveLength(1);
      expect(result[0].errors[0].type).toBe('tool_failure');
      expect(result[0].errors[0].context?.toolName).toBe('Bash');
    });
  });

  describe('getRecentErrors', () => {
    it('should return paginated errors', async () => {
      writeSession('error-session', [
        { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
        { type: 'system', level: 'error', subtype: 'api_error', timestamp: '2026-02-15T10:00:01Z', error: { message: 'Error 1' } },
        { type: 'system', level: 'error', subtype: 'api_error', timestamp: '2026-02-15T10:00:02Z', error: { message: 'Error 2' } },
      ]);

      const result = await parser.getRecentErrors(1, 0);
      expect(result.total).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.limit).toBe(1);
    });

    it('should filter by type', async () => {
      writeSession('mixed-errors', [
        { type: 'user', timestamp: '2026-02-15T10:00:00Z', message: { content: 'hello' } },
        { type: 'system', level: 'error', subtype: 'api_error', timestamp: '2026-02-15T10:00:01Z', error: { message: 'API error' } },
        {
          type: 'assistant',
          timestamp: '2026-02-15T10:00:02Z',
          message: { content: [{ type: 'tool_use', id: 'tu-1', name: 'Read', input: {} }] },
        },
        {
          type: 'user',
          timestamp: '2026-02-15T10:00:03Z',
          message: { content: [{ type: 'tool_result', tool_use_id: 'tu-1', is_error: true, content: 'File not found' }] },
        },
      ]);

      const apiErrors = await parser.getRecentErrors(100, 0, 'api_error');
      expect(apiErrors.total).toBe(1);

      const toolErrors = await parser.getRecentErrors(100, 0, 'tool_failure');
      expect(toolErrors.total).toBe(1);
    });
  });
});
