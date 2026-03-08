import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type { HookEvent, AgentRecord } from '../../types.js';

export interface AgentUpdate {
  agentId: string;
  agentType: string;
  sessionId: string;
  startedAt?: string;
  stoppedAt?: string;
}

export interface EventQueryOptions {
  sessionId?: string;
  eventType?: string;
  limit?: number;
}

export interface AgentQueryOptions {
  sessionId?: string;
  status?: 'running' | 'stopped';
}

export interface StoreStats {
  totalEvents: number;
  activeSessions: number;
  activeAgents: number;
}

export class HookEventStore {
  private eventsBySession = new Map<string, HookEvent[]>();
  private agents = new Map<string, AgentRecord>();
  private eventsFilePath: string;
  private agentsFilePath: string;
  private totalEventCount = 0;
  private fileSizes = new Map<string, number>();
  private dirEnsured = false;

  constructor(private projectRoot: string) {
    const hooksDir = path.join(projectRoot, '.specweave', 'state', 'hooks');
    this.eventsFilePath = path.join(hooksDir, 'events.jsonl');
    this.agentsFilePath = path.join(hooksDir, 'agents.jsonl');
  }

  addEvent(event: HookEvent): void {
    const events = this.eventsBySession.get(event.sessionId) ?? [];
    events.push(event);
    // Cap in-memory events per session to prevent unbounded growth
    if (events.length > 10_000) {
      const removed = events.length - 10_000;
      events.splice(0, removed);
      this.totalEventCount -= removed;
    }
    this.eventsBySession.set(event.sessionId, events);
    this.totalEventCount++;
    this.appendJSONL(this.eventsFilePath, event);
  }

  updateAgent(data: AgentUpdate): void {
    const existing = this.agents.get(data.agentId);
    if (existing) {
      if (data.stoppedAt) {
        existing.stoppedAt = data.stoppedAt;
        existing.durationMs = new Date(data.stoppedAt).getTime() - new Date(existing.startedAt).getTime();
      }
    } else {
      const record: AgentRecord = {
        agentId: data.agentId,
        agentType: data.agentType,
        sessionId: data.sessionId,
        startedAt: data.startedAt ?? new Date().toISOString(),
        stoppedAt: data.stoppedAt,
      };
      if (data.stoppedAt && record.startedAt) {
        record.durationMs = new Date(data.stoppedAt).getTime() - new Date(record.startedAt).getTime();
      }
      this.agents.set(data.agentId, record);
    }
    this.appendJSONL(this.agentsFilePath, this.agents.get(data.agentId)!);
  }

  getEvents(opts: EventQueryOptions = {}): HookEvent[] {
    let result: HookEvent[] = [];
    if (opts.sessionId) {
      result = this.eventsBySession.get(opts.sessionId) ?? [];
    } else {
      for (const events of this.eventsBySession.values()) {
        result.push(...events);
      }
    }
    if (opts.eventType) {
      result = result.filter(e => e.eventName === opts.eventType);
    }
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (opts.limit) {
      result = result.slice(0, opts.limit);
    }
    return result;
  }

  getAgents(opts: AgentQueryOptions = {}): AgentRecord[] {
    let result = Array.from(this.agents.values());
    if (opts.sessionId) {
      result = result.filter(a => a.sessionId === opts.sessionId);
    }
    if (opts.status === 'running') {
      result = result.filter(a => !a.stoppedAt);
    } else if (opts.status === 'stopped') {
      result = result.filter(a => !!a.stoppedAt);
    }
    return result;
  }

  getStats(): StoreStats {
    return {
      totalEvents: this.totalEventCount,
      activeSessions: this.eventsBySession.size,
      activeAgents: Array.from(this.agents.values()).filter(a => !a.stoppedAt).length,
    };
  }

  flush(): void {
    // All events are already appended to JSONL in real-time
    // This is a no-op for safety; called on shutdown
  }

  async hydrate(): Promise<void> {
    this.ensureDir();
    // Seed file size counters from disk
    for (const fp of [this.eventsFilePath, this.agentsFilePath]) {
      try { this.fileSizes.set(fp, fs.statSync(fp).size); } catch { /* doesn't exist yet */ }
    }
    await this.hydrateFile(this.eventsFilePath, (parsed) => {
      const event = parsed as HookEvent;
      if (event.sessionId && event.id) {
        const events = this.eventsBySession.get(event.sessionId) ?? [];
        events.push(event);
        this.eventsBySession.set(event.sessionId, events);
        this.totalEventCount++;
      }
    });
    // Apply per-session cap after hydration to prevent unbounded memory
    for (const [sessionId, events] of this.eventsBySession) {
      if (events.length > 10_000) {
        const removed = events.length - 10_000;
        events.splice(0, removed);
        this.totalEventCount -= removed;
        this.eventsBySession.set(sessionId, events);
      }
    }
    await this.hydrateFile(this.agentsFilePath, (parsed) => {
      const agent = parsed as AgentRecord;
      if (agent.agentId) {
        this.agents.set(agent.agentId, agent);
      }
    });
  }

  cleanup(): void {
    const hooksDir = path.dirname(this.eventsFilePath);
    try {
      const files = fs.readdirSync(hooksDir);
      const thirtyDaysMs = 30 * 86400 * 1000;
      for (const file of files) {
        const match = file.match(/^(?:events|agents)-(\d+)\.jsonl$/);
        if (match) {
          const ts = parseInt(match[1], 10);
          if (Date.now() - ts > thirtyDaysMs) {
            fs.rmSync(path.join(hooksDir, file), { force: true });
          }
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  private async hydrateFile(filePath: string, handler: (parsed: unknown) => void): Promise<void> {
    if (!fs.existsSync(filePath)) return;
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        handler(parsed);
      } catch {
        // Skip malformed lines
      }
    }
  }

  private ensureDir(): void {
    if (this.dirEnsured) return;
    fs.mkdirSync(path.dirname(this.eventsFilePath), { recursive: true });
    this.dirEnsured = true;
  }

  private getFileSize(filePath: string): number {
    const cached = this.fileSizes.get(filePath);
    if (cached !== undefined) return cached;
    try { const s = fs.statSync(filePath).size; this.fileSizes.set(filePath, s); return s; } catch { return 0; }
  }

  private appendJSONL(filePath: string, record: unknown): void {
    try {
      this.ensureDir();
      const line = JSON.stringify(record) + '\n';
      const currentSize = this.getFileSize(filePath);
      if (currentSize > 10_485_760) { // 10MB
        const ext = path.extname(filePath);
        const base = filePath.slice(0, -ext.length);
        fs.renameSync(filePath, `${base}-${Date.now()}${ext}`);
        this.fileSizes.set(filePath, 0);
      }
      fs.appendFileSync(filePath, line);
      this.fileSizes.set(filePath, (this.fileSizes.get(filePath) ?? 0) + Buffer.byteLength(line));
    } catch {
      // JSONL write failure must never block
    }
  }
}
