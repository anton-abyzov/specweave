import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface SessionTokenSummary {
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  cost: number;
  savings: number;
  timestamp: string;
  duration?: number;
}

export interface BillingContext {
  planType: 'api' | 'subscription';
  monthlyAmount?: number;
}

export interface CostsSummaryPayload {
  totalCost: number;
  totalSavings: number;
  totalTokens: number;
  sessionCount: number;
  sessions: SessionTokenSummary[];
  modelBreakdown: Record<string, { cost: number; tokens: number; sessions: number }>;
  billingContext: BillingContext;
}

// Pricing per million tokens — official Anthropic rates (Mar 2026)
// Source: https://platform.claude.com/docs/en/about-claude/pricing
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.50 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.10 },
};

// Friendly display names for model IDs
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-opus-4-6': 'Opus 4.6',
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
};

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

// Resolve raw model ID from logs to a known pricing key.
// Checks exact match first, then falls back to family pattern matching.
// Order of pattern checks matters: more specific before more generic.
function resolveModel(raw: string): string {
  if (!raw) return 'unknown';
  if (PRICING[raw]) return raw;
  if (raw.includes('opus')) return 'claude-opus-4-6';
  if (raw.includes('sonnet')) return 'claude-sonnet-4-6';
  if (raw.includes('haiku')) return 'claude-haiku-4-5-20251001';
  return raw;
}

function getPricing(model: string) {
  return PRICING[model] || PRICING[resolveModel(model)] || PRICING['claude-sonnet-4-6'];
}

/** Per-file cache entry: mtime + parsed summary */
interface FileCacheEntry {
  mtimeMs: number;
  summary: SessionTokenSummary;
}

export class CostAggregator {
  private logDir: string;

  /** Level-1: per-file cache keyed by absolute file path */
  private fileCache = new Map<string, FileCacheEntry>();

  /** Level-2: response cache — invalidated when file list/mtimes change */
  private responseCache: CostsSummaryPayload | null = null;
  private responseCacheHash = '';

  constructor(projectRoot: string) {
    const slug = projectRoot.replace(/^\//, '').replace(/\//g, '-');
    this.logDir = path.join(process.env.HOME || '', '.claude/projects', `-${slug}`);
  }

  async getTokenSummaries(limit = 200, billingConfig?: { planType?: string; monthlyAmount?: number }): Promise<CostsSummaryPayload> {
    // 1. Get current file list with mtimes
    const fileInfos = this.getSessionFilesWithMtime();
    const recent = fileInfos.slice(-limit);

    // 2. Compute a hash from file paths + mtimes for response cache invalidation
    const hash = recent.map(f => `${f.path}:${f.mtimeMs}`).join('|');
    if (this.responseCache && this.responseCacheHash === hash) {
      return this.responseCache;
    }

    // 3. Evict deleted files from per-file cache
    const currentPaths = new Set(recent.map(f => f.path));
    for (const cachedPath of this.fileCache.keys()) {
      if (!currentPaths.has(cachedPath)) {
        this.fileCache.delete(cachedPath);
      }
    }

    // 4. Determine which files need re-parsing (new or mtime changed)
    const toReparse: Array<{ path: string; mtimeMs: number }> = [];
    for (const info of recent) {
      const cached = this.fileCache.get(info.path);
      if (!cached || cached.mtimeMs !== info.mtimeMs) {
        toReparse.push(info);
      }
    }

    // 5. Parse only changed/new files in batches
    const CONCURRENCY = 15;
    for (let i = 0; i < toReparse.length; i += CONCURRENCY) {
      const batch = toReparse.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map(async (info) => {
          const summary = await this.extractTokensFromSession(info.path);
          return { path: info.path, mtimeMs: info.mtimeMs, summary };
        }),
      );
      for (const result of settled) {
        if (result.status === 'fulfilled' && result.value.summary) {
          const { path: filePath, mtimeMs, summary } = result.value;
          if (summary.inputTokens + summary.outputTokens > 0) {
            this.fileCache.set(filePath, { mtimeMs, summary });
          }
        }
      }
    }

    // 6. Rebuild aggregates from all per-file cached summaries
    const sessions: SessionTokenSummary[] = [];
    const modelBreakdown: Record<string, { cost: number; tokens: number; sessions: number }> = {};

    for (const info of recent) {
      const cached = this.fileCache.get(info.path);
      if (!cached) continue;
      const summary = cached.summary;
      sessions.push(summary);
      const model = summary.model || 'unknown';
      if (!modelBreakdown[model]) modelBreakdown[model] = { cost: 0, tokens: 0, sessions: 0 };
      modelBreakdown[model].cost += summary.cost;
      modelBreakdown[model].tokens += summary.inputTokens + summary.outputTokens;
      modelBreakdown[model].sessions++;
    }

    sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const totalCost = sessions.reduce((s, x) => s + x.cost, 0);
    const totalSavings = sessions.reduce((s, x) => s + x.savings, 0);
    const totalTokens = sessions.reduce((s, x) => s + x.inputTokens + x.outputTokens, 0);

    const planType = billingConfig?.planType === 'subscription' ? 'subscription' as const : 'api' as const;
    const billingContext: BillingContext = {
      planType,
      ...(planType === 'subscription' && billingConfig?.monthlyAmount != null
        ? { monthlyAmount: billingConfig.monthlyAmount }
        : {}),
    };

    const result: CostsSummaryPayload = {
      totalCost,
      totalSavings,
      totalTokens,
      sessionCount: sessions.length,
      sessions,
      modelBreakdown,
      billingContext,
    };

    this.responseCache = result;
    this.responseCacheHash = hash;
    return result;
  }

  private async extractTokensFromSession(filePath: string): Promise<SessionTokenSummary | null> {
    const sessionId = path.basename(filePath, '.jsonl');
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheWriteTokens = 0;
    let cacheReadTokens = 0;
    let model = '';
    let startTime = '';
    let endTime = '';

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const ts = entry.timestamp || '';
        if (!startTime && ts) startTime = ts;
        if (ts) endTime = ts;

        // Extract model from assistant messages
        if (entry.type === 'assistant' && entry.message?.model && !model) {
          model = entry.message.model;
        }

        // Extract token usage
        const usage = entry.message?.usage || entry.usage;
        if (usage) {
          inputTokens += usage.input_tokens || 0;
          outputTokens += usage.output_tokens || 0;
          cacheWriteTokens += usage.cache_creation_input_tokens || 0;
          cacheReadTokens += usage.cache_read_input_tokens || 0;
        }
      } catch { /* skip malformed lines */ }
    }

    if (!startTime || (inputTokens + outputTokens === 0)) return null;

    const resolvedModel = resolveModel(model);
    const pricing = getPricing(resolvedModel);
    const cost = (
      (inputTokens * pricing.input) +
      (outputTokens * pricing.output) +
      (cacheWriteTokens * pricing.cacheWrite) +
      (cacheReadTokens * pricing.cacheRead)
    ) / 1_000_000;

    // Savings from cache hits (difference between full input price and cache read price)
    const savings = (cacheReadTokens * (pricing.input - pricing.cacheRead)) / 1_000_000;

    const duration = startTime && endTime
      ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
      : undefined;

    return {
      sessionId,
      model: getModelDisplayName(resolvedModel),
      inputTokens,
      outputTokens,
      cacheWriteTokens,
      cacheReadTokens,
      cost,
      savings,
      timestamp: startTime,
      duration,
    };
  }

  /** Get session files sorted by mtime, with mtime included for cache comparison */
  private getSessionFilesWithMtime(): Array<{ path: string; mtimeMs: number }> {
    if (!fs.existsSync(this.logDir)) return [];
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => {
          const fullPath = path.join(this.logDir, f);
          try {
            const stat = fs.statSync(fullPath);
            return { path: fullPath, mtimeMs: stat.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter((f): f is { path: string; mtimeMs: number } => f !== null)
        .sort((a, b) => a.mtimeMs - b.mtimeMs);
      return files;
    } catch { return []; }
  }
}
