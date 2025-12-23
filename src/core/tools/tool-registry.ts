/**
 * Tool Registry - Centralized Tool Search and Management
 * @module core/tools/tool-registry
 * @since v0.35.0
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import { ToolEventBus } from './tool-event-bus.js';
import { ToolIndexBuilder } from './tool-index-builder.js';
import { ToolSearchEngine } from './tool-search-engine.js';
import type {
  IndexedTool, LoadedTool, ToolRegistryData, ToolSearchResult,
  ToolSearchOptions, IndexBuildOptions, IndexBuildResult, ToolType, ToolRegistryStats,
} from './types/tool-registry-types.js';

const REGISTRY_VERSION = '1.0.0';
const REGISTRY_FILENAME = 'tool-registry.json';

export class ToolRegistry {
  private projectRoot: string;
  private registryPath: string;
  private tools: Map<string, IndexedTool>;
  private loadedTools: Map<string, LoadedTool>;
  private keywordIndex: Map<string, Set<string>>;
  private searchEngine: ToolSearchEngine;
  private indexBuilder: ToolIndexBuilder;
  private eventBus: ToolEventBus;
  private logger: Logger;
  private initialized: boolean;
  private metadata: ToolRegistryData['metadata'] | null;

  constructor(projectRoot: string, options: { logger?: Logger; eventBus?: ToolEventBus } = {}) {
    this.projectRoot = projectRoot;
    this.registryPath = path.join(projectRoot, '.specweave', 'state', REGISTRY_FILENAME);
    this.logger = options.logger ?? consoleLogger;
    this.eventBus = options.eventBus ?? new ToolEventBus({ logger: this.logger });
    this.tools = new Map();
    this.loadedTools = new Map();
    this.keywordIndex = new Map();
    this.searchEngine = new ToolSearchEngine();
    this.indexBuilder = new ToolIndexBuilder(projectRoot, { logger: this.logger });
    this.initialized = false;
    this.metadata = null;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.load();
    this.initialized = true;
  }

  async load(): Promise<void> {
    try {
      if (fs.existsSync(this.registryPath)) {
        const content = fs.readFileSync(this.registryPath, 'utf-8');
        const data: ToolRegistryData = JSON.parse(content);
        this.tools.clear();
        this.keywordIndex.clear();
        for (const [id, tool] of Object.entries(data.tools)) {
          this.tools.set(id, tool);
        }
        if (data.keywordIndex) {
          for (const [keyword, toolIds] of Object.entries(data.keywordIndex)) {
            this.keywordIndex.set(keyword, new Set(toolIds));
          }
        }
        this.metadata = data.metadata;
        this.searchEngine.buildIndex(Array.from(this.tools.values()));
        this.logger.debug(`Loaded ${this.tools.size} tools from registry`);
      }
    } catch (error) {
      this.logger.error(`Failed to load tool registry: ${error}`);
      throw error;
    }
  }

  async save(): Promise<void> {
    try {
      const stateDir = path.dirname(this.registryPath);
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

      const keywordIndex: Record<string, string[]> = {};
      for (const [keyword, toolIds] of this.keywordIndex) {
        keywordIndex[keyword] = Array.from(toolIds);
      }

      const data: ToolRegistryData = {
        version: REGISTRY_VERSION,
        tools: Object.fromEntries(this.tools),
        metadata: {
          created: this.metadata?.created ?? new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          toolCount: this.tools.size,
          buildDuration: this.metadata?.buildDuration,
        },
        keywordIndex,
      };

      fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
      this.logger.debug(`Saved ${this.tools.size} tools to registry`);
    } catch (error) {
      this.logger.error(`Failed to save tool registry: ${error}`);
      throw error;
    }
  }

  async rebuild(options: IndexBuildOptions = {}): Promise<IndexBuildResult> {
    const startTime = Date.now();
    try {
      const result = await this.indexBuilder.buildIndex(options);
      if (result.success) {
        this.tools.clear();
        this.keywordIndex.clear();
        this.loadedTools.clear();

        const tools = this.indexBuilder.getIndexedTools();
        for (const tool of tools) {
          this.tools.set(tool.id, tool);
          for (const keyword of tool.keywords) {
            if (!this.keywordIndex.has(keyword)) this.keywordIndex.set(keyword, new Set());
            this.keywordIndex.get(keyword)!.add(tool.id);
          }
          if (options.emitEvents) {
            this.eventBus.emit({ type: 'ToolIndexed', tool, timestamp: new Date().toISOString() });
          }
        }

        this.searchEngine.buildIndex(tools);
        this.metadata = {
          created: this.metadata?.created ?? new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          toolCount: this.tools.size,
          buildDuration: Date.now() - startTime,
        };
        await this.save();

        if (options.emitEvents) {
          this.eventBus.emit({ type: 'RegistryRebuilt', result, timestamp: new Date().toISOString() });
        }

        this.logger.info(`Tool registry rebuilt: ${result.toolCount} tools in ${result.duration}ms`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to rebuild tool registry: ${error}`);
      return {
        success: false, toolCount: 0, skillCount: 0, agentCount: 0, commandCount: 0,
        duration: Date.now() - startTime, errors: [String(error)], warnings: [],
      };
    }
  }

  async search(query: string, options: ToolSearchOptions = {}): Promise<ToolSearchResult[]> {
    await this.ensureInitialized();
    return this.searchEngine.search(query, options);
  }

  async findBestMatch(intent: string): Promise<ToolSearchResult | null> {
    await this.ensureInitialized();
    const results = await this.search(intent, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async suggest(partialQuery: string, limit: number = 5): Promise<IndexedTool[]> {
    await this.ensureInitialized();
    return this.searchEngine.suggest(partialQuery, limit);
  }

  async getTool(id: string): Promise<IndexedTool | null> {
    await this.ensureInitialized();
    return this.tools.get(id) ?? null;
  }

  async getLoadedTool(id: string): Promise<LoadedTool | null> {
    await this.ensureInitialized();
    if (this.loadedTools.has(id)) return this.loadedTools.get(id)!;
    return this.loadToolContent(id);
  }

  async listTools(filter?: { type?: ToolType; plugin?: string }): Promise<IndexedTool[]> {
    await this.ensureInitialized();
    let tools = Array.from(this.tools.values());
    if (filter?.type) tools = tools.filter((t) => t.type === filter.type);
    if (filter?.plugin) tools = tools.filter((t) => t.pluginName === filter.plugin);
    return tools;
  }

  async hasTool(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.tools.has(id);
  }

  async count(filter?: { type?: ToolType; plugin?: string }): Promise<number> {
    return (await this.listTools(filter)).length;
  }

  async loadToolContent(id: string): Promise<LoadedTool | null> {
    await this.ensureInitialized();
    const tool = this.tools.get(id);
    if (!tool) return null;

    try {
      const fullPath = tool.relativePath.startsWith('/') 
        ? tool.relativePath 
        : path.join(this.projectRoot, tool.relativePath);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`Tool file not found: ${fullPath}`);
        return null;
      }
      const content = fs.readFileSync(fullPath, 'utf-8');
      const loadedTool: LoadedTool = {
        ...tool, content, systemPrompt: tool.type === 'agent' ? content : undefined, loaded: true,
      };
      this.loadedTools.set(id, loadedTool);
      this.eventBus.emit({ type: 'ToolLoaded', toolId: id, tool: loadedTool, timestamp: new Date().toISOString() });
      return loadedTool;
    } catch (error) {
      this.logger.error(`Failed to load tool content for ${id}: ${error}`);
      return null;
    }
  }

  async preloadTools(ids: string[]): Promise<void> {
    await this.ensureInitialized();
    for (const id of ids) {
      if (!this.loadedTools.has(id)) await this.loadToolContent(id);
    }
  }

  unloadTool(id: string): void { this.loadedTools.delete(id); }
  unloadAll(): void { this.loadedTools.clear(); }
  getEventBus(): ToolEventBus { return this.eventBus; }

  recordToolSelection(toolId: string, query: string, score: number, context?: string): void {
    this.eventBus.emit({ type: 'ToolSelected', toolId, query, score, context, timestamp: new Date().toISOString() });
  }

  async getStats(): Promise<ToolRegistryStats> {
    await this.ensureInitialized();
    const tools = Array.from(this.tools.values());
    const plugins = new Set(tools.map((t) => t.pluginName));
    return {
      totalTools: tools.length,
      skillCount: tools.filter((t) => t.type === 'skill').length,
      agentCount: tools.filter((t) => t.type === 'agent').length,
      commandCount: tools.filter((t) => t.type === 'command').length,
      loadedCount: this.loadedTools.size,
      pluginCount: plugins.size,
      keywordCount: this.keywordIndex.size,
      lastUpdated: this.metadata?.lastUpdated ?? 'never',
    };
  }
}
