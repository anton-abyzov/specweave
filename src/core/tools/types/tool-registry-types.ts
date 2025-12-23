/**
 * Tool Registry Type Definitions
 * @module core/tools/types/tool-registry-types
 * @since v0.35.0
 */

export type ToolType = 'skill' | 'agent' | 'command';

export interface ToolCapability {
  description: string;
  keywords: string[];
}

export interface IndexedTool {
  id: string;
  name: string;
  type: ToolType;
  pluginName: string;
  description: string;
  keywords: string[];
  capabilities?: ToolCapability[];
  relativePath: string;
  loaded: boolean;
  indexedAt: string;
  contentHash?: string;
  modelPreference?: string;
  allowedTools?: string[];
}

export interface LoadedTool extends IndexedTool {
  content: string;
  systemPrompt?: string;
  loaded: true;
}

export interface ToolSearchResult {
  tool: IndexedTool;
  score: number;
  matchedKeywords: string[];
  snippet?: string;
}

export interface ToolSearchOptions {
  limit?: number;
  minScore?: number;
  type?: ToolType | ToolType[];
  plugin?: string | string[];
  includeContent?: boolean;
}

export interface ToolRegistryData {
  version: string;
  tools: Record<string, IndexedTool>;
  metadata: {
    created: string;
    lastUpdated: string;
    toolCount: number;
    buildDuration?: number;
  };
  keywordIndex?: Record<string, string[]>;
}

export interface IndexBuildOptions {
  force?: boolean;
  plugins?: string[];
  emitEvents?: boolean;
  pluginsDir?: string;
}

export interface IndexBuildResult {
  success: boolean;
  toolCount: number;
  skillCount: number;
  agentCount: number;
  commandCount: number;
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface ToolEventBase {
  timestamp: string;
}

export interface ToolIndexedEvent extends ToolEventBase {
  type: 'ToolIndexed';
  tool: IndexedTool;
}

export interface ToolLoadedEvent extends ToolEventBase {
  type: 'ToolLoaded';
  toolId: string;
  tool: LoadedTool;
}

export interface RegistryRebuiltEvent extends ToolEventBase {
  type: 'RegistryRebuilt';
  result: IndexBuildResult;
}

export interface ToolSelectedEvent extends ToolEventBase {
  type: 'ToolSelected';
  toolId: string;
  query: string;
  score: number;
  context?: string;
}

export type ToolEvent =
  | ToolIndexedEvent
  | ToolLoadedEvent
  | RegistryRebuiltEvent
  | ToolSelectedEvent;

export type ToolEventType = ToolEvent['type'];

export type ToolEventHandler<T extends ToolEvent = ToolEvent> = (
  event: T
) => void | Promise<void>;

export interface ToolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ToolRegistryStats {
  totalTools: number;
  skillCount: number;
  agentCount: number;
  commandCount: number;
  loadedCount: number;
  pluginCount: number;
  keywordCount: number;
  lastUpdated: string;
}
