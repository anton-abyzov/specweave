/**
 * Adapter Loader
 *
 * Loads adapters from registry, detects tools, and provides API for init command.
 * Enables SpecWeave to work with ANY AI coding tool.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { IAdapter } from './adapter-interface';
import { ClaudeAdapter } from './claude/adapter';
import { CursorAdapter } from './cursor/adapter';
import { CopilotAdapter } from './copilot/adapter';
import { GeminiAdapter } from './gemini/adapter';
import { CodexAdapter } from './codex/adapter';
import { GenericAdapter } from './generic/adapter';

export interface AdapterRegistry {
  version: number;
  last_updated: string;
  adapters: Array<{
    name: string;
    description: string;
    automation_level: string;
    status: string;
    directory: string;
    market_share: string;
    priority: string;
  }>;
}

/**
 * Adapter Loader - Main API for working with adapters
 */
export class AdapterLoader {
  private adapters: Map<string, IAdapter> = new Map();
  private registry: AdapterRegistry | null = null;

  constructor() {
    this.initializeAdapters();
  }

  /**
   * Initialize all adapters
   */
  private initializeAdapters(): void {
    this.adapters.set('claude', new ClaudeAdapter());
    this.adapters.set('cursor', new CursorAdapter());
    this.adapters.set('copilot', new CopilotAdapter());
    this.adapters.set('gemini', new GeminiAdapter());
    this.adapters.set('codex', new CodexAdapter());
    this.adapters.set('generic', new GenericAdapter());
  }

  /**
   * Load registry.yaml
   */
  async loadRegistry(): Promise<AdapterRegistry> {
    if (this.registry) {
      return this.registry;
    }

    // Try dist first, then fall back to src (for development)
    let registryPath = path.join(__dirname, 'registry.yaml');
    if (!await fs.pathExists(registryPath)) {
      registryPath = path.join(__dirname, '../../src/adapters/registry.yaml');
    }

    const content = await fs.readFile(registryPath, 'utf-8');
    this.registry = YAML.parse(content) as AdapterRegistry;

    return this.registry;
  }

  /**
   * Get all available adapters
   */
  getAllAdapters(): IAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapter by name
   */
  getAdapter(name: string): IAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Auto-detect which tool is being used
   *
   * Detection priority (based on market share and probability):
   * 1. Claude Code (if .claude/ exists or claude CLI found)
   * 2. Cursor (if cursor CLI or .cursor/ or .cursorrules exists)
   * 3. Gemini CLI (if gemini CLI found)
   * 4. Codex (if codex CLI found)
   * 5. Copilot (if .github/copilot/ exists)
   * 6. Generic (fallback - always returns true)
   *
   * @returns Promise<string> Detected adapter name
   */
  async detectTool(): Promise<string> {
    console.log('🔍 Detecting AI coding tool...\n');

    // Try detection in priority order
    const detectionOrder = ['claude', 'cursor', 'gemini', 'codex', 'copilot', 'generic'];

    for (const adapterName of detectionOrder) {
      const adapter = this.adapters.get(adapterName);
      if (!adapter) continue;

      const detected = await adapter.detect();
      if (detected) {
        console.log(`✅ Detected: ${adapter.name} (${adapter.automationLevel} automation)`);
        return adapterName;
      }
    }

    // Fallback to generic (should never reach here since generic always returns true)
    console.log('ℹ️  Using generic adapter (manual workflow)');
    return 'generic';
  }

  /**
   * Check requirements for a specific adapter
   */
  async checkRequirements(adapterName: string): Promise<void> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }

    const result = await adapter.checkRequirements();

    if (!result.met) {
      console.error('\n❌ Requirements not met:\n');
      result.missing.forEach(req => console.error(`  - ${req}`));
      throw new Error('System requirements not met');
    }

    if (result.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:\n');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  }

  /**
   * List all available adapters with details
   */
  async listAdapters(): Promise<void> {
    const registry = await this.loadRegistry();

    console.log('\n📋 Available SpecWeave Adapters:\n');
    console.log('━'.repeat(70));
    console.log('');

    for (const adapterInfo of registry.adapters) {
      const adapter = this.adapters.get(adapterInfo.name);
      if (!adapter) continue;

      console.log(`${this.getAutomationIcon(adapter.automationLevel)} ${adapter.name.toUpperCase()}`);
      console.log(`   ${adapter.description}`);
      console.log(`   Automation: ${adapter.automationLevel} | Market: ${adapterInfo.market_share}`);
      console.log('');
    }

    console.log('━'.repeat(70));
    console.log('\nTotal Market Coverage: 100%');
    console.log('SpecWeave works with ANY AI coding tool!\n');
  }

  /**
   * Get icon for automation level
   */
  private getAutomationIcon(level: string): string {
    switch (level) {
      case 'full': return '🚀';
      case 'semi': return '⚡';
      case 'basic': return '📝';
      case 'manual': return '📖';
      default: return '❓';
    }
  }

  /**
   * Get recommended adapter based on detection and user preference
   */
  async getRecommendedAdapter(explicitChoice?: string): Promise<IAdapter> {
    // If user explicitly chose an adapter, use it
    if (explicitChoice) {
      const adapter = this.adapters.get(explicitChoice);
      if (!adapter) {
        throw new Error(`Invalid adapter: ${explicitChoice}. Use 'claude', 'cursor', 'copilot', or 'generic'`);
      }
      return adapter;
    }

    // Otherwise, auto-detect
    const detectedName = await this.detectTool();
    const adapter = this.adapters.get(detectedName);

    if (!adapter) {
      throw new Error(`Detected adapter not found: ${detectedName}`);
    }

    return adapter;
  }
}
