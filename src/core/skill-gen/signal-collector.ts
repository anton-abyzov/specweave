/**
 * Signal Collector — detects recurring patterns from living docs using LLM analysis.
 *
 * Runs on every increment closure (wired into LifecycleHookDispatcher.onIncrementDone).
 * Reads markdown files from .specweave/docs/internal/, sends them to the LLM for
 * pattern extraction, and persists results to .specweave/state/skill-signals.json.
 *
 * Error-isolated: never throws, never blocks increment closure.
 *
 * @module core/skill-gen/signal-collector
 */

import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import type { SignalEntry, SignalStore, LLMPatternResponse } from './types.js';
import { SKILL_GEN_DEFAULTS } from './types.js';
import {
  collectMarkdownFiles,
  loadSignalStore,
  saveSignalStore,
  sanitizeString,
  estimateTokenCount,
  capEvidence,
  TOKEN_BUDGET,
} from './utils.js';
import { loadLLMConfig, createProvider, hasLLMConfig } from '../llm/provider-factory.js';
import type { LLMProvider } from '../llm/types.js';

interface CollectorOptions {
  maxSignals?: number;
  minSignalCount?: number;
}

const LLM_PATTERN_SCHEMA = {
  type: 'object' as const,
  properties: {
    patterns: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          category: { type: 'string' as const, description: 'Kebab-case category slug' },
          name: { type: 'string' as const, description: 'Short pattern name' },
          description: { type: 'string' as const, description: 'What and why' },
          evidence: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['category', 'name', 'description', 'evidence'] as string[],
      },
    },
  },
  required: ['patterns'] as string[],
};

const SYSTEM_PROMPT = `You are a software architecture analyst. Given project documentation, identify recurring implementation patterns. Return structured JSON only.`;

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
      if (!hasLLMConfig(this.projectRoot)) {
        console.warn('[skill-gen] No LLM config found — skipping pattern detection');
        return;
      }

      const docsDir = join(this.projectRoot, '.specweave', 'docs', 'internal');
      const files = await collectMarkdownFiles(docsDir);
      if (files.length === 0) return;

      const config = loadLLMConfig(this.projectRoot);
      if (!config) return;

      const provider = await createProvider(config);
      const patterns = await this.detectPatternsLLM(files, provider);

      const store = await loadSignalStore(this.getSignalsPath());

      for (const detected of patterns) {
        this.upsertSignal(store, detected, incrementId, files);
      }

      this.pruneIfNeeded(store);
      await saveSignalStore(this.getSignalsPath(), store);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[SignalCollector] Warning: ${msg}`);
    }
  }

  /**
   * Seed mode: scan all living docs and populate the signal store
   * without associating patterns with any increment.
   */
  async collectSeed(): Promise<void> {
    try {
      if (!hasLLMConfig(this.projectRoot)) {
        console.warn('[skill-gen] No LLM config found — skipping seed');
        return;
      }

      const docsDir = join(this.projectRoot, '.specweave', 'docs', 'internal');
      const files = await collectMarkdownFiles(docsDir);
      if (files.length === 0) return;

      const config = loadLLMConfig(this.projectRoot);
      if (!config) return;

      const provider = await createProvider(config);
      const patterns = await this.detectPatternsLLM(files, provider);

      const store = await loadSignalStore(this.getSignalsPath());
      const now = new Date().toISOString();

      for (const pattern of patterns) {
        const existingKey = store.signals.find(
          s => s.category === pattern.category && s.pattern === sanitizeString(pattern.name),
        );
        if (existingKey) continue; // Skip duplicates

        const newSignal: SignalEntry = {
          id: `sig-${sanitizeString(pattern.category)}-${sanitizeString(pattern.name)}`,
          pattern: sanitizeString(pattern.name),
          category: sanitizeString(pattern.category),
          description: sanitizeString(pattern.description),
          incrementIds: [],
          firstSeen: now,
          lastSeen: now,
          confidence: 0,
          evidence: capEvidence(pattern.evidence.map(e => sanitizeString(e))),
          uniqueSourceFiles: files.map(f => relative(this.projectRoot, f)),
          suggested: false,
          declined: false,
          generated: false,
        };
        store.signals.push(newSignal);
      }

      await saveSignalStore(this.getSignalsPath(), store);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[SignalCollector] Warning: ${msg}`);
    }
  }

  /**
   * Detect patterns via LLM analysis of markdown files.
   * Handles batching when total tokens exceed TOKEN_BUDGET.
   */
  private async detectPatternsLLM(
    files: string[],
    provider: LLMProvider,
  ): Promise<LLMPatternResponse['patterns']> {
    // Read files and estimate tokens
    const docs: Array<{ path: string; content: string; tokens: number }> = [];
    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const relPath = relative(this.projectRoot, filePath);
        docs.push({ path: relPath, content, tokens: estimateTokenCount(content) });
      } catch {
        // Skip unreadable files
      }
    }

    if (docs.length === 0) return [];

    const totalTokens = docs.reduce((sum, d) => sum + d.tokens, 0);

    if (totalTokens <= TOKEN_BUDGET) {
      // Single call
      const prompt = this.buildPrompt(docs);
      const result = await provider.analyzeStructured<LLMPatternResponse>(prompt, {
        schema: LLM_PATTERN_SCHEMA,
        temperature: 0.1,
        maxTokens: 4096,
        timeout: 30000,
        systemPrompt: SYSTEM_PROMPT,
      });
      return result.data.patterns;
    }

    // Batched chunking
    const chunks: Array<typeof docs> = [];
    let currentChunk: typeof docs = [];
    let currentTokens = 0;

    for (const doc of docs) {
      if (currentTokens + doc.tokens > TOKEN_BUDGET && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokens = 0;
      }
      currentChunk.push(doc);
      currentTokens += doc.tokens;
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Call LLM per chunk and merge
    const allPatterns: LLMPatternResponse['patterns'] = [];
    for (const chunk of chunks) {
      try {
        const prompt = this.buildPrompt(chunk);
        const result = await provider.analyzeStructured<LLMPatternResponse>(prompt, {
          schema: LLM_PATTERN_SCHEMA,
          temperature: 0.1,
          maxTokens: 4096,
          timeout: 30000,
          systemPrompt: SYSTEM_PROMPT,
        });
        allPatterns.push(...result.data.patterns);
      } catch {
        // Skip failed chunks, continue with others
      }
    }

    // Deduplicate by category + name
    const seen = new Map<string, LLMPatternResponse['patterns'][0]>();
    for (const p of allPatterns) {
      const key = `${p.category}::${p.name}`;
      if (!seen.has(key)) {
        seen.set(key, p);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Build the user prompt with <documents> block.
   */
  private buildPrompt(docs: Array<{ path: string; content: string }>): string {
    const docBlocks = docs
      .map(d => `--- file: ${d.path} ---\n${d.content}`)
      .join('\n');

    return `Analyze these project documents and identify recurring patterns.
For each pattern provide: category (kebab-case slug), name (short identifier),
description (1-2 sentences explaining what the pattern is and why it matters),
and evidence (list of relevant quotes or references from the docs, max 5 per pattern).

<documents>
${docBlocks}
</documents>`;
  }

  /**
   * Create or update a signal entry.
   */
  private upsertSignal(
    store: SignalStore,
    detected: LLMPatternResponse['patterns'][0],
    incrementId: string,
    sourceFiles: string[],
  ): void {
    const sanitizedName = sanitizeString(detected.name);
    const sanitizedCategory = sanitizeString(detected.category);
    const existing = store.signals.find(
      s => s.category === sanitizedCategory && s.pattern === sanitizedName,
    );
    const now = new Date().toISOString();
    const relSourceFiles = sourceFiles.map(f => relative(this.projectRoot, f));

    if (existing) {
      if (!existing.incrementIds.includes(incrementId)) {
        existing.incrementIds.push(incrementId);
      }
      existing.lastSeen = now;

      // Update uniqueSourceFiles with Set semantics
      const fileSet = new Set(existing.uniqueSourceFiles ?? []);
      for (const f of relSourceFiles) {
        fileSet.add(f);
      }
      existing.uniqueSourceFiles = Array.from(fileSet);

      // Merge evidence (deduplicated) then cap
      for (const ev of detected.evidence) {
        const sanitizedEv = sanitizeString(ev);
        if (!existing.evidence.includes(sanitizedEv)) {
          existing.evidence.push(sanitizedEv);
        }
      }
      existing.evidence = capEvidence(existing.evidence);

      // Confidence = uniqueSourceFiles.length / minSignalCount capped at 1.0
      existing.confidence = Math.min(
        1.0,
        existing.uniqueSourceFiles.length / this.minSignalCount,
      );
    } else {
      const uniqueFiles = Array.from(new Set(relSourceFiles));
      const newSignal: SignalEntry = {
        id: `sig-${sanitizedCategory}-${sanitizedName}`,
        pattern: sanitizedName,
        category: sanitizedCategory,
        description: sanitizeString(detected.description),
        incrementIds: [incrementId],
        firstSeen: now,
        lastSeen: now,
        confidence: Math.min(1.0, uniqueFiles.length / this.minSignalCount),
        evidence: capEvidence(detected.evidence.map(e => sanitizeString(e))),
        uniqueSourceFiles: uniqueFiles,
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
