/**
 * Tool Search Engine - BM25-inspired keyword matching
 * @module core/tools/tool-search-engine
 * @since v0.35.0
 */

import type {
  IndexedTool,
  ToolSearchResult,
  ToolSearchOptions,
} from './types/tool-registry-types.js';

const K1 = 1.2;
const B = 0.75;
const KEYWORD_EXACT_WEIGHT = 3.0;
const KEYWORD_PARTIAL_WEIGHT = 1.5;
const DESCRIPTION_WEIGHT = 1.0;
const CAPABILITY_WEIGHT = 2.0;
const NAME_WEIGHT = 2.5;

export class ToolSearchEngine {
  private tools: Map<string, IndexedTool>;
  private keywordIndex: Map<string, Set<string>>;
  private idfCache: Map<string, number>;
  private avgDocLength: number;

  constructor() {
    this.tools = new Map();
    this.keywordIndex = new Map();
    this.idfCache = new Map();
    this.avgDocLength = 0;
  }

  buildIndex(tools: IndexedTool[]): void {
    this.tools.clear();
    this.keywordIndex.clear();
    this.idfCache.clear();
    let totalKeywords = 0;

    for (const tool of tools) {
      this.tools.set(tool.id, tool);
      for (const keyword of tool.keywords) {
        const lower = keyword.toLowerCase();
        if (!this.keywordIndex.has(lower)) {
          this.keywordIndex.set(lower, new Set());
        }
        this.keywordIndex.get(lower)!.add(tool.id);
      }
      totalKeywords += tool.keywords.length;
    }

    this.avgDocLength = tools.length > 0 ? totalKeywords / tools.length : 0;

    for (const keyword of this.keywordIndex.keys()) {
      this.idfCache.set(keyword, this.calculateIDF(keyword));
    }
  }

  search(query: string, options: ToolSearchOptions = {}): ToolSearchResult[] {
    const { limit = 10, minScore = 0.1, type, plugin } = options;
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const results: ToolSearchResult[] = [];

    for (const tool of this.tools.values()) {
      if (type) {
        const types = Array.isArray(type) ? type : [type];
        if (!types.includes(tool.type)) continue;
      }
      if (plugin) {
        const plugins = Array.isArray(plugin) ? plugin : [plugin];
        if (!plugins.includes(tool.pluginName)) continue;
      }

      const { score, matchedKeywords } = this.calculateScore(tool, queryTerms);
      if (score >= minScore) {
        results.push({
          tool: { ...tool },
          score: Math.min(score, 1),
          matchedKeywords,
          snippet: this.generateSnippet(tool, matchedKeywords),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  suggest(partialQuery: string, limit: number = 5): IndexedTool[] {
    const queryLower = partialQuery.toLowerCase();
    const suggestions: Array<{ tool: IndexedTool; score: number }> = [];

    for (const tool of this.tools.values()) {
      let score = 0;
      if (tool.name.toLowerCase().includes(queryLower)) score += NAME_WEIGHT;
      for (const keyword of tool.keywords) {
        if (keyword.toLowerCase().startsWith(queryLower)) score += KEYWORD_PARTIAL_WEIGHT;
      }
      if (score > 0) suggestions.push({ tool, score });
    }

    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, limit).map((s) => s.tool);
  }

  getByKeyword(keyword: string): IndexedTool[] {
    const lower = keyword.toLowerCase();
    const toolIds = this.keywordIndex.get(lower);
    if (!toolIds) return [];
    return Array.from(toolIds).map((id) => this.tools.get(id)!).filter(Boolean);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s,.:;!?()[\]{}'"]+/)
      .map((t) => t.replace(/[^a-z0-9-]/g, ''))
      .filter((t) => t.length >= 2);
  }

  private calculateScore(
    tool: IndexedTool,
    queryTerms: string[]
  ): { score: number; matchedKeywords: string[] } {
    let score = 0;
    const matchedKeywords: string[] = [];
    const toolKeywordsLower = tool.keywords.map((k) => k.toLowerCase());
    const nameLower = tool.name.toLowerCase();
    const descLower = tool.description.toLowerCase();

    for (const term of queryTerms) {
      if (toolKeywordsLower.includes(term)) {
        const idf = this.idfCache.get(term) ?? 1;
        score += KEYWORD_EXACT_WEIGHT * idf;
        matchedKeywords.push(term);
        continue;
      }

      let partialMatch = false;
      for (const keyword of toolKeywordsLower) {
        if (keyword.includes(term) || term.includes(keyword)) {
          score += KEYWORD_PARTIAL_WEIGHT;
          matchedKeywords.push(keyword);
          partialMatch = true;
          break;
        }
      }
      if (partialMatch) continue;

      if (nameLower.includes(term)) {
        score += NAME_WEIGHT;
        matchedKeywords.push(term);
        continue;
      }

      if (descLower.includes(term)) {
        score += DESCRIPTION_WEIGHT;
        continue;
      }

      if (tool.capabilities) {
        for (const cap of tool.capabilities) {
          if (cap.keywords.some((k) => k.toLowerCase().includes(term))) {
            score += CAPABILITY_WEIGHT;
            break;
          }
        }
      }
    }

    const docLength = tool.keywords.length;
    if (docLength > 0 && this.avgDocLength > 0) {
      const lengthNorm = 1 - B + B * (docLength / this.avgDocLength);
      score = score / lengthNorm;
    }

    const maxPossibleScore = queryTerms.length * KEYWORD_EXACT_WEIGHT * 2;
    const normalizedScore = maxPossibleScore > 0 ? score / maxPossibleScore : 0;

    return { score: normalizedScore, matchedKeywords: [...new Set(matchedKeywords)] };
  }

  private calculateIDF(term: string): number {
    const toolIds = this.keywordIndex.get(term);
    if (!toolIds || toolIds.size === 0) return 1;
    const N = this.tools.size;
    const df = toolIds.size;
    return Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  private generateSnippet(tool: IndexedTool, matchedKeywords: string[]): string {
    if (matchedKeywords.length === 0) return tool.description.slice(0, 100);
    let snippet = tool.description;
    for (const keyword of matchedKeywords) {
      // Escape regex special characters to prevent injection
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      snippet = snippet.replace(regex, `**${keyword}**`);
    }
    return snippet.slice(0, 150);
  }
}
