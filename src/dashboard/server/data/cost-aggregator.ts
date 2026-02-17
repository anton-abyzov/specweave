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
  isMaxPlan: boolean;
  billingContext: BillingContext;
}

// Pricing per million tokens — official Anthropic rates (Feb 2026)
// Source: https://platform.claude.com/docs/en/about-claude/pricing
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.50 },
  'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.10 },
};

// Friendly display names for model IDs
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-opus-4-6': 'Opus 4.6',
  'claude-sonnet-4-5-20250929': 'Sonnet 4.5',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
};

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

// Fallback patterns for model detection
function resolveModel(raw: string): string {
  if (!raw) return 'unknown';
  if (raw.includes('opus')) return 'claude-opus-4-6';
  if (raw.includes('sonnet')) return 'claude-sonnet-4-5-20250929';
  if (raw.includes('haiku')) return 'claude-haiku-4-5-20251001';
  return raw;
}

function getPricing(model: string) {
  return PRICING[model] || PRICING[resolveModel(model)] || PRICING['claude-sonnet-4-5-20250929'];
}

export class CostAggregator {
  private logDir: string;
  private cache: CostsSummaryPayload | null = null;
  private cacheTime = 0;
  private readonly cacheTTL = 60_000; // 60 seconds

  constructor(projectRoot: string) {
    const slug = projectRoot.replace(/^\//, '').replace(/\//g, '-');
    this.logDir = path.join(process.env.HOME || '', '.claude/projects', `-${slug}`);
  }

  async getTokenSummaries(limit = 200, billingConfig?: { planType?: string; monthlyAmount?: number }): Promise<CostsSummaryPayload> {
    if (this.cache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cache;
    }

    const files = this.getSessionFiles();
    const recent = files.slice(-limit);
    const sessions: SessionTokenSummary[] = [];
    const modelBreakdown: Record<string, { cost: number; tokens: number; sessions: number }> = {};

    for (const file of recent) {
      try {
        const summary = await this.extractTokensFromSession(file);
        if (summary && summary.inputTokens + summary.outputTokens > 0) {
          sessions.push(summary);
          const model = summary.model || 'unknown';
          if (!modelBreakdown[model]) modelBreakdown[model] = { cost: 0, tokens: 0, sessions: 0 };
          modelBreakdown[model].cost += summary.cost;
          modelBreakdown[model].tokens += summary.inputTokens + summary.outputTokens;
          modelBreakdown[model].sessions++;
        }
      } catch { /* skip corrupted files */ }
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
      isMaxPlan: planType === 'subscription',
      billingContext,
    };

    this.cache = result;
    this.cacheTime = Date.now();
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

  private getSessionFiles(): string[] {
    if (!fs.existsSync(this.logDir)) return [];
    try {
      return fs.readdirSync(this.logDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => path.join(this.logDir, f))
        .sort((a, b) => {
          try { return fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs; } catch { return 0; }
        });
    } catch { return []; }
  }
}
