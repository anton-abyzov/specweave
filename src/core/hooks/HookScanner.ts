/**
 * Hook Scanner
 *
 * Discovers and catalogs all hooks in the project.
 * Scans plugin directories, parses hook metadata, and builds hook registry.
 *
 * Part of increment 0037: Hook Health Check System
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import {
  HookDefinition,
  HookType,
  HookTrigger,
  ScannerConfig
} from './types.js';

/**
 * Hook Scanner - Discovers hooks in project
 */
export class HookScanner {
  private config: ScannerConfig;

  constructor(config: ScannerConfig) {
    this.config = config;
  }

  /**
   * Scan project for all hooks
   */
  async scanHooks(): Promise<HookDefinition[]> {
    const hooks: HookDefinition[] = [];

    for (const pluginDir of this.config.pluginDirs) {
      const hooksDir = path.join(pluginDir, 'hooks');

      if (!fs.existsSync(hooksDir)) {
        continue; // No hooks in this plugin
      }

      const pluginHooks = await this.scanPluginHooks(hooksDir, path.basename(pluginDir));
      hooks.push(...pluginHooks);
    }

    return hooks;
  }

  /**
   * Scan hooks in a specific plugin directory
   *
   * Handles both legacy flat structure and v2 EDA architecture:
   * - Top-level hooks: user-prompt-submit.sh, etc.
   * - v2/dispatchers: session-start.sh, post-tool-use.sh
   * - v2/handlers: status-line-handler.sh, living-specs-handler.sh
   * - v2/detectors: lifecycle-detector.sh, us-completion-detector.sh
   * - v2/guards: metadata-json-guard.sh, etc.
   */
  private async scanPluginHooks(hooksDir: string, pluginName: string): Promise<HookDefinition[]> {
    const hooks: HookDefinition[] = [];
    const files = fs.readdirSync(hooksDir);

    for (const file of files) {
      const filePath = path.join(hooksDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Scan v2 EDA architecture subdirectories
        if (file === 'v2') {
          const v2Hooks = await this.scanV2Hooks(filePath, pluginName);
          hooks.push(...v2Hooks);
        }
        // Skip other subdirectories (lib/, universal/, etc.)
        continue;
      }

      // Only check hook trigger files (.sh or .ts)
      if (!this.isHookFile(file)) {
        continue;
      }

      const hook = await this.parseHookFile(filePath, pluginName);
      if (hook) {
        hooks.push(hook);
      }
    }

    return hooks;
  }

  /**
   * Scan v2 EDA architecture hooks
   * Structure: v2/{dispatchers,handlers,detectors,guards,queue}/*.sh
   */
  private async scanV2Hooks(v2Dir: string, pluginName: string): Promise<HookDefinition[]> {
    const hooks: HookDefinition[] = [];
    const v2Subdirs = ['dispatchers', 'handlers', 'detectors', 'guards', 'queue'];

    for (const subdir of v2Subdirs) {
      const subdirPath = path.join(v2Dir, subdir);
      if (!fs.existsSync(subdirPath)) {
        continue;
      }

      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        if (!file.endsWith('.sh') || file.endsWith('.test.sh')) {
          continue;
        }

        const filePath = path.join(subdirPath, file);
        const hook = await this.parseV2HookFile(filePath, pluginName, subdir);
        if (hook) {
          hooks.push(hook);
        }
      }
    }

    return hooks;
  }

  /**
   * Parse v2 hook file with EDA-aware metadata extraction
   */
  private async parseV2HookFile(
    filePath: string,
    pluginName: string,
    category: string
  ): Promise<HookDefinition | null> {
    const filename = path.basename(filePath);
    const hookName = filename.replace(/\.sh$/, '');
    const trigger = this.extractV2Trigger(hookName, category);

    const fileType = this.getFileType(filename);
    const dependencies = await this.extractDependencies(filePath, fileType);
    const critical = this.isV2CriticalHook(hookName, category);
    const testable = this.isV2TestableHook(hookName, category);

    return {
      name: hookName,
      plugin: pluginName,
      path: filePath,
      type: fileType,
      dependencies,
      trigger: trigger || 'post-tool-use', // Default for handlers
      testable,
      critical,
      expectedDuration: this.getV2ExpectedDuration(hookName, category)
    };
  }

  /**
   * Extract trigger type for v2 hooks based on category
   */
  private extractV2Trigger(hookName: string, category: string): HookTrigger | null {
    // Map v2 categories to triggers
    if (category === 'dispatchers') {
      if (hookName.includes('session-start')) return 'session-start' as HookTrigger;
      if (hookName.includes('post-tool-use')) return 'post-tool-use' as HookTrigger;
    }
    if (category === 'handlers') {
      return 'post-tool-use' as HookTrigger; // Handlers are post-tool-use
    }
    if (category === 'detectors') {
      return 'post-tool-use' as HookTrigger; // Detectors run on file changes
    }
    if (category === 'guards') {
      return 'pre-tool-use' as HookTrigger; // Guards are pre-tool-use
    }
    return null;
  }

  /**
   * Check if v2 hook is critical
   */
  private isV2CriticalHook(hookName: string, category: string): boolean {
    // Dispatchers and key handlers are critical
    if (category === 'dispatchers') return true;
    if (hookName === 'status-line-handler') return true;
    if (hookName === 'living-specs-handler') return true;
    if (hookName === 'lifecycle-detector') return true;
    return false;
  }

  /**
   * Check if v2 hook is testable
   */
  private isV2TestableHook(hookName: string, category: string): boolean {
    // Guards and handlers with .test.sh files are testable
    // Detectors are testable
    return category === 'guards' || category === 'handlers' || category === 'detectors';
  }

  /**
   * Get expected duration for v2 hooks
   */
  private getV2ExpectedDuration(hookName: string, category: string): number {
    // Detectors should be fast (<10ms)
    if (category === 'detectors') return 10;
    // Guards should be fast (<20ms)
    if (category === 'guards') return 20;
    // Handlers can take longer (async)
    if (category === 'handlers') return 100;
    // Dispatchers coordinate - medium
    if (category === 'dispatchers') return 50;
    return 100;
  }

  /**
   * Check if file is a hook trigger file
   */
  private isHookFile(filename: string): boolean {
    // Hook trigger files: *.sh (bash hooks)
    // Exclude lib/ subdirectories
    return filename.endsWith('.sh') && !filename.includes('lib/');
  }

  /**
   * Parse hook file and extract metadata
   */
  private async parseHookFile(filePath: string, pluginName: string): Promise<HookDefinition | null> {
    const filename = path.basename(filePath);
    const hookName = filename.replace(/\.(sh|ts|js)$/, '');
    const trigger = this.extractTrigger(hookName);

    if (!trigger) {
      return null; // Not a recognized hook trigger
    }

    const fileType = this.getFileType(filename);
    const dependencies = await this.extractDependencies(filePath, fileType);
    const critical = this.isCriticalHook(hookName);
    const testable = this.isTestableHook(hookName, fileType);

    return {
      name: hookName,
      plugin: pluginName,
      path: filePath,
      type: fileType,
      dependencies,
      trigger,
      testable,
      critical,
      expectedDuration: this.getExpectedDuration(hookName)
    };
  }

  /**
   * Extract hook trigger from hook name
   */
  private extractTrigger(hookName: string): HookTrigger | null {
    const triggerMap: Record<string, HookTrigger> = {
      'user-prompt-submit': 'user-prompt-submit',
      'post-task-completion': 'post-task-completion',
      'post-increment-change': 'post-increment-change',
      'pre-tool-use': 'pre-tool-use',
      'post-write': 'post-write',
      'post-edit': 'post-edit'
    };

    return triggerMap[hookName] || null;
  }

  /**
   * Get file type from extension
   */
  private getFileType(filename: string): HookType {
    if (filename.endsWith('.sh')) {
      return 'shell';
    } else if (filename.endsWith('.ts')) {
      return 'typescript';
    } else if (filename.endsWith('.js')) {
      return 'javascript';
    }
    return 'shell'; // Default
  }

  /**
   * Extract dependencies from hook file
   */
  private async extractDependencies(filePath: string, fileType: HookType): Promise<string[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const dependencies: string[] = [];

    if (fileType === 'shell') {
      // Extract dependencies from bash script
      // Look for node invocations
      const nodeMatches = Array.from(content.matchAll(/node\s+([^\s]+)/g));
      for (const match of nodeMatches) {
        dependencies.push(match[1]);
      }
    } else {
      // Extract TypeScript/JavaScript imports
      const importMatches = Array.from(content.matchAll(/import\s+.*\s+from\s+['"](.+?)['"]/g));
      for (const match of importMatches) {
        dependencies.push(match[1]);
      }
    }

    return dependencies;
  }

  /**
   * Determine if hook is critical (failure blocks workflow)
   */
  private isCriticalHook(hookName: string): boolean {
    const criticalHooks = [
      'post-task-completion', // AC sync, living docs sync
      'user-prompt-submit'     // Input validation
    ];
    return criticalHooks.includes(hookName);
  }

  /**
   * Determine if hook is testable in isolation
   */
  private isTestableHook(hookName: string, fileType: HookType): boolean {
    // Shell hooks that call Node.js scripts are testable
    // TypeScript/JavaScript hooks are directly testable
    if (fileType === 'typescript' || fileType === 'javascript') {
      return true;
    }

    // Some bash hooks are wrappers that call Node.js - testable
    const testableShellHooks = [
      'post-task-completion',
      'post-increment-change'
    ];

    return testableShellHooks.includes(hookName);
  }

  /**
   * Get expected execution duration for hook (ms)
   */
  private getExpectedDuration(hookName: string): number {
    const durationMap: Record<string, number> = {
      'update-ac-status': 100,           // 100ms
      'auto-transition': 50,              // 50ms
      'sync-living-docs': 200,            // 200ms
      'translate-living-docs': 150,       // 150ms
      'update-tasks-md': 80,              // 80ms
      'update-status-line': 50,           // 50ms
      'prepare-reflection-context': 60,   // 60ms
      'invoke-translator-skill': 40       // 40ms
    };

    return durationMap[hookName] || 100; // Default 100ms
  }

  /**
   * Find all plugin directories in project
   */
  static async findPluginDirectories(projectRoot: string): Promise<string[]> {
    const pluginsDir = path.join(projectRoot, 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      return [];
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const pluginDirs: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        pluginDirs.push(path.join(pluginsDir, entry.name));
      }
    }

    return pluginDirs;
  }

  /**
   * Create default scanner config
   */
  static async createDefaultConfig(projectRoot: string): Promise<ScannerConfig> {
    const pluginDirs = await this.findPluginDirectories(projectRoot);

    return {
      projectRoot,
      pluginDirs,
      includeNonTestable: true
    };
  }
}
