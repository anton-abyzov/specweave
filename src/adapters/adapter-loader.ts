/**
 * Adapter Loader
 *
 * Loads adapters from registry, detects tools, and provides API for init command.
 * Enables SpecWeave to work with ANY AI coding tool.
 */

import fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { execSync } from 'child_process';
import { IAdapter } from './adapter-interface.js';
import { CursorAdapter } from './cursor/adapter.js';
import { GeminiAdapter } from './gemini/adapter.js';
import { CodexAdapter } from './codex/adapter.js';
import { GenericAdapter } from './generic/adapter.js';
import { getDirname } from '../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

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
   *
   * NOTE: Claude Code is NOT an adapter - it's the native/default experience!
   * Adapters only exist for tools that need to APPROXIMATE Claude's native capabilities.
   */
  private initializeAdapters(): void {
    // Note: No ClaudeAdapter - Claude is the baseline, not an adaptation!
    this.adapters.set('cursor', new CursorAdapter());
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
   * 1. Claude Code (DEFAULT - best experience, native support)
   * 2. Cursor (if cursor CLI or .cursor/ or .cursorrules exists)
   * 3. Gemini CLI (if gemini CLI found)
   * 4. Codex (if codex CLI found)
   * 5. Generic (only if explicitly requested via --adapter generic)
   *
   * @returns Promise<string> Detected tool name (not adapter - Claude has no adapter!)
   */
  async detectTool(): Promise<string> {
    console.log('🔍 Detecting AI coding tool...\n');

    // Check other tools first (if they have specific indicators)
    const detectionOrder = ['cursor', 'gemini', 'codex'];

    for (const adapterName of detectionOrder) {
      const adapter = this.adapters.get(adapterName);
      if (!adapter) continue;

      const detected = await adapter.detect();
      if (detected) {
        console.log(`✅ Detected: ${adapter.name} (${adapter.automationLevel} automation)`);
        return adapterName;
      }
    }

    // Default to Claude Code (best experience, native support)
    // Users can override with --adapter flag if they want a different tool
    console.log(`✅ Detected: claude (native - full automation)`);
    return 'claude';
  }

  /**
   * Helper: Check if a command exists in PATH
   * Cross-platform: uses 'where' on Windows, 'which' on Unix
   */
  private async commandExists(command: string): Promise<boolean> {
    try {
      const isWindows = process.platform === 'win32';
      const checkCommand = isWindows ? 'where' : 'which';
      execSync(`${checkCommand} ${command}`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
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

    console.log('\n📋 SpecWeave Tool Support:\n');
    console.log('━'.repeat(70));
    console.log('');

    // Show Claude first (baseline, not an adapter)
    const claudeInfo = registry.adapters.find(a => a.name === 'claude');
    if (claudeInfo) {
      console.log(`🚀 CLAUDE CODE (Baseline - No Adapter Needed)`);
      console.log(`   ${claudeInfo.description}`);
      console.log(`   Native: skills, agents, hooks, slash commands | Market: ${claudeInfo.market_share}`);
      console.log('');
    }

    console.log('📦 Adapters (For Other Tools):\n');

    // Show other adapters
    for (const adapterInfo of registry.adapters) {
      if (adapterInfo.name === 'claude') continue; // Skip Claude, already shown

      const adapter = this.adapters.get(adapterInfo.name);
      if (!adapter) continue;

      console.log(`${this.getAutomationIcon(adapter.automationLevel)} ${adapter.name.toUpperCase()}`);
      console.log(`   ${adapter.description}`);
      console.log(`   Automation: ${adapter.automationLevel} | Market: ${adapterInfo.market_share}`);
      console.log('');
    }

    console.log('━'.repeat(70));
    console.log('\nTotal Market Coverage: 100%');
    console.log('SpecWeave works with ANY AI coding tool!');
    console.log('\n💡 Claude Code = Native experience (no adapter)');
    console.log('   Other tools = Adapters approximate Claude\'s capabilities\n');
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
        throw new Error(`Invalid adapter: ${explicitChoice}. Use 'claude', 'cursor', or 'generic'`);
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
