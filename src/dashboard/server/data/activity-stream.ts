import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type { ActivityEvent } from '../../types.js';

/**
 * Unified activity stream that merges events from multiple sources
 * into a single chronological timeline.
 */
export class ActivityStream {
  constructor(private projectRoot: string) {}

  /** Get recent activity events merged from all sources */
  async getRecentActivity(options: {
    limit?: number;
    categories?: string[];
    severity?: string;
    since?: string;
  } = {}): Promise<ActivityEvent[]> {
    const { limit = 100, categories, severity, since } = options;
    const events: ActivityEvent[] = [];

    // Gather from all sources in parallel
    const [analyticsEvents, decisionEvents, notificationEvents, costEvents] = await Promise.all([
      this.readAnalyticsEvents(),
      this.readDecisionLog(),
      this.readNotificationEvents(),
      this.readCostEvents(),
    ]);

    events.push(...analyticsEvents, ...decisionEvents, ...notificationEvents, ...costEvents);

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply filters
    let filtered = events;
    if (categories && categories.length > 0) {
      filtered = filtered.filter(e => categories.includes(e.category));
    }
    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }
    if (since) {
      filtered = filtered.filter(e => e.timestamp >= since);
    }

    return filtered.slice(0, limit);
  }

  /** Read analytics events.jsonl */
  private async readAnalyticsEvents(): Promise<ActivityEvent[]> {
    const filePath = path.join(this.projectRoot, '.specweave/state/analytics/events.jsonl');
    return this.readJsonlAsActivity(filePath, (entry) => ({
      timestamp: entry.timestamp || new Date().toISOString(),
      category: entry.category === 'skill_activation' ? 'command' :
               entry.category === 'agent_spawn' ? 'command' :
               'command',
      severity: 'info' as const,
      title: entry.action || entry.name || entry.type || 'Analytics event',
      detail: entry.detail || entry.description,
      source: 'analytics',
      metadata: entry,
    }));
  }

  /** Read decisions.jsonl */
  private async readDecisionLog(): Promise<ActivityEvent[]> {
    const filePath = path.join(this.projectRoot, '.specweave/logs/decisions.jsonl');
    return this.readJsonlAsActivity(filePath, (entry) => ({
      timestamp: entry.timestamp || new Date().toISOString(),
      category: 'hook' as const,
      severity: entry.decision === 'blocked' || entry.decision === 'denied'
        ? 'warning' as const
        : 'info' as const,
      title: `Hook ${entry.decision || 'decision'}: ${entry.hook || entry.name || ''}`,
      detail: entry.reason || entry.message,
      source: 'decisions',
      metadata: entry,
    }));
  }

  /** Read notifications as events */
  private async readNotificationEvents(): Promise<ActivityEvent[]> {
    const filePath = path.join(this.projectRoot, '.specweave/state/notifications.json');
    try {
      if (!fs.existsSync(filePath)) return [];
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const notifications = data?.notifications || data || [];
      if (!Array.isArray(notifications)) return [];

      return notifications.slice(-50).map((n: any) => ({
        timestamp: n.createdAt || n.timestamp || new Date().toISOString(),
        category: 'notification' as const,
        severity: n.severity === 'critical' ? 'error' as const :
                  n.severity === 'warning' ? 'warning' as const :
                  'info' as const,
        title: n.title || n.message || 'Notification',
        detail: n.detail || n.body,
        source: 'notifications',
        metadata: { id: n.id, type: n.type, dismissed: !!n.dismissedAt },
      }));
    } catch { return []; }
  }

  /** Read cost events */
  private async readCostEvents(): Promise<ActivityEvent[]> {
    const filePath = path.join(this.projectRoot, '.specweave/logs/costs.json');
    try {
      if (!fs.existsSync(filePath)) return [];
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const sessions = data?.sessions || [];
      if (!Array.isArray(sessions)) return [];

      return sessions.slice(-30).map((s: any) => ({
        timestamp: s.timestamp || s.startedAt || new Date().toISOString(),
        category: 'cost' as const,
        severity: 'info' as const,
        title: `Session ${s.sessionId?.slice(0, 8) || ''}: $${(s.cost || 0).toFixed(4)}`,
        detail: `${s.model || 'unknown'} | ${((s.inputTokens || 0) + (s.outputTokens || 0)).toLocaleString()} tokens`,
        source: 'costs',
        metadata: { sessionId: s.sessionId, model: s.model, cost: s.cost },
      }));
    } catch { return []; }
  }

  /** Read a JSONL file and convert each line to an ActivityEvent */
  private async readJsonlAsActivity(
    filePath: string,
    transform: (entry: any) => ActivityEvent,
  ): Promise<ActivityEvent[]> {
    if (!fs.existsSync(filePath)) return [];

    const events: ActivityEvent[] = [];
    try {
      const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          events.push(transform(entry));
        } catch { /* skip malformed */ }
      }
    } catch { /* file read error */ }

    // Return only last 50 from each source to keep things manageable
    return events.slice(-50);
  }
}
