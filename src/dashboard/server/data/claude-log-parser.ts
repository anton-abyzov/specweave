import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type { SessionSummary, SessionError } from '../../types.js';

/**
 * Parses Claude Code JSONL session logs from ~/.claude/projects/<slug>/
 * to extract session summaries, errors, and usage data.
 */
export class ClaudeLogParser {
  private logDir: string;

  constructor(projectRoot: string) {
    const slug = projectRoot.replace(/^\//, '').replace(/\//g, '-');
    this.logDir = path.join(process.env.HOME || '', '.claude/projects', `-${slug}`);
  }

  /** Get recent session summaries with error counts */
  async getSessionSummaries(limit = 50): Promise<SessionSummary[]> {
    const files = this.getSessionFiles();
    const recent = files.slice(-limit);
    const summaries: SessionSummary[] = [];

    for (const file of recent) {
      try {
        const summary = await this.parseSessionFile(file);
        if (summary) summaries.push(summary);
      } catch { /* skip corrupted files */ }
    }

    // Sort by start time descending
    summaries.sort((a, b) => b.startTime.localeCompare(a.startTime));
    return summaries;
  }

  /** Get recent errors across all sessions */
  async getRecentErrors(limit = 100): Promise<SessionError[]> {
    const summaries = await this.getSessionSummaries(100);
    const allErrors: SessionError[] = [];

    for (const s of summaries) {
      allErrors.push(...s.errors);
    }

    allErrors.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return allErrors.slice(0, limit);
  }

  /** Get error statistics grouped by type */
  async getErrorGroups(): Promise<Array<{
    type: string;
    count: number;
    lastSeen: string;
    sessions: number;
    recentMessages: string[];
  }>> {
    const errors = await this.getRecentErrors(500);
    const groups = new Map<string, {
      count: number;
      lastSeen: string;
      sessions: Set<string>;
      messages: string[];
    }>();

    for (const err of errors) {
      const existing = groups.get(err.type);
      if (existing) {
        existing.count++;
        if (err.timestamp > existing.lastSeen) existing.lastSeen = err.timestamp;
        existing.sessions.add(err.sessionId);
        if (existing.messages.length < 5) existing.messages.push(err.message);
      } else {
        groups.set(err.type, {
          count: 1,
          lastSeen: err.timestamp,
          sessions: new Set([err.sessionId]),
          messages: [err.message],
        });
      }
    }

    return Array.from(groups.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        lastSeen: data.lastSeen,
        sessions: data.sessions.size,
        recentMessages: data.messages,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /** Get full session detail with all errors */
  async getSessionDetail(sessionId: string): Promise<SessionSummary | null> {
    const filePath = path.join(this.logDir, `${sessionId}.jsonl`);
    if (!fs.existsSync(filePath)) return null;
    return this.parseSessionFile(filePath);
  }

  /** Parse a single JSONL session file */
  private async parseSessionFile(filePath: string): Promise<SessionSummary | null> {
    const sessionId = path.basename(filePath, '.jsonl');
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let startTime = '';
    let endTime = '';
    let messageCount = 0;
    let toolCallCount = 0;
    let version = '';
    let gitBranch = '';
    const errors: SessionError[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const ts = entry.timestamp || '';

        if (!startTime && ts) startTime = ts;
        if (ts) endTime = ts;

        if (entry.version && !version) version = entry.version;
        if (entry.gitBranch && !gitBranch) gitBranch = entry.gitBranch;

        // Count messages
        if (entry.type === 'user') messageCount++;
        if (entry.type === 'assistant') {
          const content = entry.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') toolCallCount++;
            }
          }
        }

        // Detect system-level errors (API errors, overloaded, etc.)
        if (entry.type === 'system' && entry.level === 'error') {
          const errorType = this.classifySystemError(entry);
          const errorMsg = this.extractErrorMessage(entry);
          errors.push({
            timestamp: ts,
            sessionId,
            type: errorType,
            message: errorMsg,
            context: { lastToolCall: undefined, messageIndex: messageCount },
          });
        }

        // Detect tool failures (is_error: true in tool results)
        if (entry.type === 'user' && entry.message?.content) {
          const content = entry.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.is_error && block.type === 'tool_result') {
                const msg = typeof block.content === 'string'
                  ? block.content.slice(0, 300)
                  : JSON.stringify(block.content).slice(0, 300);
                errors.push({
                  timestamp: ts,
                  sessionId,
                  type: this.classifyToolError(msg),
                  message: msg,
                  context: { lastToolCall: block.tool_use_id, messageIndex: messageCount },
                });
              }
            }
          }
        }
      } catch { /* skip malformed lines */ }
    }

    if (!startTime) return null;

    return {
      sessionId,
      startTime,
      endTime,
      messageCount,
      toolCallCount,
      errors,
      version,
      gitBranch,
    };
  }

  /** Get sorted list of session JSONL files */
  private getSessionFiles(): string[] {
    if (!fs.existsSync(this.logDir)) return [];
    try {
      return fs.readdirSync(this.logDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => path.join(this.logDir, f))
        .sort((a, b) => {
          try {
            return fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs;
          } catch { return 0; }
        });
    } catch { return []; }
  }

  /** Classify a system error entry */
  private classifySystemError(entry: any): SessionError['type'] {
    const subtype = entry.subtype || '';
    if (subtype === 'api_error') {
      const errorType = entry.error?.error?.error?.type || '';
      if (errorType === 'overloaded_error') return 'rate_limit';
      return 'api_error';
    }
    if (subtype.includes('hook')) return 'hook_error';
    return 'unknown';
  }

  /** Classify a tool error message */
  private classifyToolError(message: string): SessionError['type'] {
    if (message.includes('exceeds maximum allowed tokens') || message.includes('prompt is too long')) {
      return 'prompt_too_long';
    }
    return 'tool_failure';
  }

  /** Extract human-readable error message */
  private extractErrorMessage(entry: any): string {
    if (entry.error?.error?.error?.message) return entry.error.error.error.message;
    if (entry.error?.message) return entry.error.message;
    if (entry.message) return typeof entry.message === 'string' ? entry.message : '';
    return entry.subtype || 'Unknown error';
  }
}
