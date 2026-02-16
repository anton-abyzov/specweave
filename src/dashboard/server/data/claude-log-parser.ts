import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type { SessionSummary, SessionError, ErrorGroup, PaginatedErrors } from '../../types.js';

/**
 * Parses Claude Code JSONL session logs from ~/.claude/projects/<slug>/
 * to extract session summaries, errors, and usage data.
 *
 * Tool name resolution: when a tool_result has is_error: true, we look up
 * the matching tool_use block (by tool_use_id) from the preceding assistant
 * message to extract the tool name and input args.
 */
export class ClaudeLogParser {
  private logDir: string;

  /** Cache of parsed sessions keyed by file mtime to avoid re-parsing */
  private sessionCache = new Map<string, { mtime: number; summary: SessionSummary }>();

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
        const summary = await this.parseSessionFileCached(file);
        if (summary) summaries.push(summary);
      } catch { /* skip corrupted files */ }
    }

    summaries.sort((a, b) => b.startTime.localeCompare(a.startTime));
    return summaries;
  }

  /** Get paginated errors with real total count */
  async getRecentErrors(limit = 50, offset = 0, typeFilter?: string): Promise<PaginatedErrors> {
    // Parse enough sessions to get a comprehensive error view
    const summaries = await this.getSessionSummaries(200);
    let allErrors: SessionError[] = [];

    for (const s of summaries) {
      allErrors.push(...s.errors);
    }

    allErrors.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply type filter
    if (typeFilter) {
      allErrors = allErrors.filter(e => e.type === typeFilter);
    }

    const total = allErrors.length;
    const errors = allErrors.slice(offset, offset + limit);

    return { total, errors, offset, limit };
  }

  /** Get error statistics grouped by type */
  async getErrorGroups(): Promise<ErrorGroup[]> {
    const { errors: allErrors } = await this.getRecentErrors(10000, 0);
    const groups = new Map<string, {
      count: number;
      lastSeen: string;
      sessions: Set<string>;
      messages: string[];
    }>();

    for (const err of allErrors) {
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
    return this.parseSessionFileCached(filePath);
  }

  /** Parse with mtime-based caching */
  private async parseSessionFileCached(filePath: string): Promise<SessionSummary | null> {
    try {
      const stat = fs.statSync(filePath);
      const cached = this.sessionCache.get(filePath);
      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.summary;
      }
      const summary = await this.parseSessionFile(filePath);
      if (summary) {
        this.sessionCache.set(filePath, { mtime: stat.mtimeMs, summary });
      }
      return summary;
    } catch {
      return this.parseSessionFile(filePath);
    }
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

    // Track tool_use blocks for name resolution: tool_use_id -> { name, input }
    const toolUseMap = new Map<string, { name: string; input: string }>();

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

        // Track tool_use blocks from assistant messages for name resolution
        if (entry.type === 'assistant') {
          const content = entry.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use' && block.id && block.name) {
                toolCallCount++;
                const inputSummary = this.summarizeToolInput(block.name, block.input);
                toolUseMap.set(block.id, { name: block.name, input: inputSummary });
              }
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
            context: { messageIndex: messageCount },
          });
        }

        // Detect tool failures (is_error: true in tool results)
        if (entry.type === 'user' && entry.message?.content) {
          const content = entry.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.is_error && block.type === 'tool_result') {
                const msg = typeof block.content === 'string'
                  ? block.content
                  : JSON.stringify(block.content);

                // Resolve tool name from the matching tool_use block
                const toolInfo = block.tool_use_id
                  ? toolUseMap.get(block.tool_use_id)
                  : undefined;

                errors.push({
                  timestamp: ts,
                  sessionId,
                  type: this.classifyToolError(msg),
                  message: msg,
                  context: {
                    toolName: toolInfo?.name,
                    toolInput: toolInfo?.input,
                    messageIndex: messageCount,
                  },
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

  /** Summarize tool input for context display */
  private summarizeToolInput(toolName: string, input: any): string {
    if (!input) return '';
    switch (toolName) {
      case 'Read':
        return input.file_path || '';
      case 'Write':
        return input.file_path || '';
      case 'Edit':
        return input.file_path || '';
      case 'Bash':
        return (input.command || '').slice(0, 200);
      case 'Grep':
        return `${input.pattern || ''} ${input.path || ''}`.trim();
      case 'Glob':
        return `${input.pattern || ''} ${input.path || ''}`.trim();
      case 'Task':
        return input.description || '';
      default:
        // Generic: try common field names
        return input.file_path || input.path || input.command || input.query || '';
    }
  }
}
