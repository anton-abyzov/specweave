/**
 * Signal Collector — detects recurring patterns from living docs output.
 *
 * Runs on every increment closure (wired into LifecycleHookDispatcher.onIncrementDone).
 * Reads markdown files from .specweave/docs/internal/, extracts pattern candidates,
 * and persists them to .specweave/state/skill-signals.json.
 *
 * Error-isolated: never throws, never blocks increment closure.
 *
 * @module core/skill-gen/signal-collector
 */

import { readFile, writeFile, readdir, mkdir, copyFile } from 'fs/promises';
import { join, relative } from 'path';
import type { SignalEntry, SignalStore } from './types.js';
import { EMPTY_SIGNAL_STORE, SKILL_GEN_DEFAULTS } from './types.js';

/**
 * Pattern detection categories with keyword indicators.
 * A category is detected when 3+ keywords appear in a single file.
 */
const PATTERN_CATEGORIES: Record<string, { keywords: string[]; description: string }> = {
  'error-handling': {
    keywords: ['error-handling', 'error handling', 'try/catch', 'error boundar', 'catch block', 'error middleware'],
    description: 'Consistent error handling patterns',
  },
  'naming-conventions': {
    keywords: ['naming convention', 'file naming', 'variable naming', 'kebab-case', 'camelCase', 'PascalCase'],
    description: 'Consistent naming convention patterns',
  },
  'architecture-patterns': {
    keywords: ['architecture pattern', 'module organization', 'dependency injection', 'clean architecture', 'layered', 'hexagonal'],
    description: 'Architectural organization patterns',
  },
  'testing-patterns': {
    keywords: ['test pattern', 'mock pattern', 'test organization', 'test fixture', 'test factory', 'test helper'],
    description: 'Testing convention patterns',
  },
  'api-patterns': {
    keywords: ['api pattern', 'api boundary', 'endpoint pattern', 'route pattern', 'validation', 'zod', 'schema validation'],
    description: 'API design and validation patterns',
  },
  'auth-patterns': {
    keywords: ['auth pattern', 'authentication', 'authorization', 'jwt', 'session', 'oauth', 'auth middleware'],
    description: 'Authentication and authorization patterns',
  },
  'data-model': {
    keywords: ['data model', 'database', 'schema', 'migration', 'orm', 'prisma', 'typeorm', 'sequelize'],
    description: 'Data model and database patterns',
  },
  'state-management': {
    keywords: ['state management', 'redux', 'zustand', 'context', 'store', 'global state'],
    description: 'State management patterns',
  },
  'integration-patterns': {
    keywords: ['integration', 'external api', 'third-party', 'webhook', 'event-driven', 'message queue'],
    description: 'External integration patterns',
  },
  'build-deploy': {
    keywords: ['build pattern', 'deploy', 'ci/cd', 'pipeline', 'docker', 'containeriz'],
    description: 'Build and deployment patterns',
  },
};

const MIN_KEYWORD_HITS = 3;

interface CollectorOptions {
  maxSignals?: number;
  minSignalCount?: number;
}

export class SignalCollector {
  private projectRoot: string;
  private maxSignals: number;
  private minSignalCount: number;

  constructor(projectRoot: string, options?: CollectorOptions) {
    this.projectRoot = projectRoot;
    this.maxSignals = options?.maxSignals ?? SKILL_GEN_DEFAULTS.maxSignals;
    this.minSignalCount = options?.minSignalCount ?? SKILL_GEN_DEFAULTS.minSignalCount;
  }

  /**
   * Collect signals from living docs for the given increment.
   * Never throws — all errors are caught and logged.
   */
  async collect(incrementId: string): Promise<void> {
    try {
      const store = await this.loadStore();
      const docsDir = join(this.projectRoot, '.specweave', 'docs', 'internal');
      const patterns = await this.detectPatterns(docsDir);

      for (const detected of patterns) {
        this.upsertSignal(store, detected, incrementId);
      }

      this.pruneIfNeeded(store);
      await this.saveStore(store);
    } catch (error) {
      // Error-isolated: log and continue
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[SignalCollector] Warning: ${msg}`);
    }
  }

  /**
   * Load signal store from disk, recovering from corruption.
   */
  private async loadStore(): Promise<SignalStore> {
    const signalsPath = this.getSignalsPath();
    try {
      const content = await readFile(signalsPath, 'utf-8');
      return JSON.parse(content) as SignalStore;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return { ...EMPTY_SIGNAL_STORE, signals: [] };
      }
      // Corrupted file — backup and start fresh
      try {
        await copyFile(signalsPath, signalsPath + '.bak');
      } catch {
        // backup failed, continue anyway
      }
      return { ...EMPTY_SIGNAL_STORE, signals: [] };
    }
  }

  /**
   * Save signal store to disk.
   */
  private async saveStore(store: SignalStore): Promise<void> {
    const signalsPath = this.getSignalsPath();
    const dir = join(this.projectRoot, '.specweave', 'state');
    await mkdir(dir, { recursive: true });
    await writeFile(signalsPath, JSON.stringify(store, null, 2));
  }

  /**
   * Detect patterns from living docs markdown files.
   */
  private async detectPatterns(docsDir: string): Promise<Array<{ category: string; evidence: string[] }>> {
    const files = await this.collectMarkdownFiles(docsDir);
    const detectedMap = new Map<string, string[]>();

    for (const filePath of files) {
      try {
        const content = (await readFile(filePath, 'utf-8')).toLowerCase();
        const relPath = relative(this.projectRoot, filePath);

        for (const [category, { keywords }] of Object.entries(PATTERN_CATEGORIES)) {
          const hits = keywords.filter((kw) => content.includes(kw.toLowerCase()));
          if (hits.length >= MIN_KEYWORD_HITS) {
            const existing = detectedMap.get(category) || [];
            if (!existing.includes(relPath)) {
              existing.push(relPath);
            }
            detectedMap.set(category, existing);
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return Array.from(detectedMap.entries()).map(([category, evidence]) => ({
      category,
      evidence,
    }));
  }

  /**
   * Recursively collect markdown files from a directory.
   */
  private async collectMarkdownFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...(await this.collectMarkdownFiles(fullPath)));
        } else if (entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or is unreadable
    }
    return results;
  }

  /**
   * Create or update a signal entry.
   */
  private upsertSignal(
    store: SignalStore,
    detected: { category: string; evidence: string[] },
    incrementId: string,
  ): void {
    const existing = store.signals.find((s) => s.category === detected.category);
    const now = new Date().toISOString();

    if (existing) {
      if (!existing.incrementIds.includes(incrementId)) {
        existing.incrementIds.push(incrementId);
      }
      existing.lastSeen = now;
      // Merge evidence (deduplicated)
      for (const ev of detected.evidence) {
        if (!existing.evidence.includes(ev)) {
          existing.evidence.push(ev);
        }
      }
      // Recalculate confidence based on increment count
      existing.confidence = Math.min(
        1.0,
        existing.incrementIds.length / this.minSignalCount,
      );
    } else {
      const meta = PATTERN_CATEGORIES[detected.category];
      const newSignal: SignalEntry = {
        id: `sig-${detected.category}`,
        pattern: `${detected.category}-pattern`,
        category: detected.category,
        description: meta?.description ?? `Detected ${detected.category} pattern`,
        incrementIds: [incrementId],
        firstSeen: now,
        lastSeen: now,
        confidence: 1 / this.minSignalCount,
        evidence: detected.evidence,
        suggested: false,
        declined: false,
        generated: false,
      };
      store.signals.push(newSignal);
    }
  }

  /**
   * Prune lowest-confidence signals when store exceeds maxSignals.
   */
  private pruneIfNeeded(store: SignalStore): void {
    if (store.signals.length > this.maxSignals) {
      store.signals.sort((a, b) => b.confidence - a.confidence);
      store.signals = store.signals.slice(0, this.maxSignals);
    }
  }

  private getSignalsPath(): string {
    return join(this.projectRoot, '.specweave', 'state', 'skill-signals.json');
  }
}
