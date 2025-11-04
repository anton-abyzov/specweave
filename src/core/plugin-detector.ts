/**
 * Plugin Detector
 *
 * Automatically detects which plugins should be enabled based on:
 * 1. Project structure (package.json, directories, env vars, git remote)
 * 2. Spec content (keywords, domain analysis)
 * 3. Task descriptions (pre-task hook)
 * 4. Git changes (post-increment hook)
 *
 * @module core/plugin-detector
 * @version 0.4.0
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import type { Plugin, DetectionResult } from './types/plugin.js';
import { PluginLoader } from './plugin-loader.js';

/**
 * PluginDetector - Auto-detects relevant plugins for a project
 */
export class PluginDetector {
  private loader: PluginLoader;
  private availablePlugins: Plugin[] = [];
  private pluginsDir: string;

  /**
   * Create a new PluginDetector
   *
   * @param pluginsDir - Path to plugins directory (default: src/plugins)
   */
  constructor(pluginsDir?: string) {
    this.loader = new PluginLoader();
    this.pluginsDir = pluginsDir || path.join(process.cwd(), 'src', 'plugins');
  }

  /**
   * Load available plugins for detection
   *
   * Scans plugins directory and loads all plugin manifests
   */
  async loadAvailablePlugins(): Promise<void> {
    this.availablePlugins = [];

    if (!(await fs.pathExists(this.pluginsDir))) {
      return; // No plugins available
    }

    const dirs = await fs.readdir(this.pluginsDir);

    for (const dir of dirs) {
      const pluginPath = path.join(this.pluginsDir, dir);
      const stat = await fs.stat(pluginPath);

      if (stat.isDirectory()) {
        try {
          const plugin = await this.loader.loadFromDirectory(pluginPath);
          this.availablePlugins.push(plugin);
        } catch (error: any) {
          console.warn(`⚠️  Failed to load plugin ${dir}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Phase 1: Init-time detection
   *
   * Detects plugins based on project structure during `specweave init`
   * NOW uses the new plugin-detection.ts utility for comprehensive scanning
   *
   * @param projectPath - Path to project root
   * @returns Array of detection results with confidence scores
   */
  async detectFromProject(projectPath: string): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // NEW: Use plugin-detection.ts utility for comprehensive scanning
    try {
      const { scanProjectStructure, detectPlugins } = await import('../utils/plugin-detection.js');

      const signals = await scanProjectStructure(projectPath);
      const detected = detectPlugins(signals);

      // Convert to DetectionResult format
      for (const plugin of detected) {
        // Map confidence levels to scores
        const confidenceMap = { high: 0.9, medium: 0.6, low: 0.3 };
        const confidence = confidenceMap[plugin.confidence];

        results.push({
          pluginName: plugin.name,
          confidence,
          reason: plugin.reason,
          trigger: plugin.signals.join(', '), // Join array into string
        });
      }

      return results;
    } catch (error) {
      // Fallback to old detection method if new utility fails
      console.warn('⚠️  New plugin detection failed, falling back to legacy method');
    }

    // LEGACY: Old detection method (fallback)
    // Ensure plugins are loaded
    if (this.availablePlugins.length === 0) {
      await this.loadAvailablePlugins();
    }

    // Check each plugin's auto_detect rules
    for (const plugin of this.availablePlugins) {
      const { auto_detect } = plugin.manifest;
      if (!auto_detect) continue;

      let confidence = 0;
      const reasons: string[] = [];

      // Check files/directories
      if (auto_detect.files) {
        for (const pattern of auto_detect.files) {
          const filePath = path.join(projectPath, pattern);
          if (await fs.pathExists(filePath)) {
            confidence += 0.3;
            reasons.push(`Found ${pattern}`);
          }
        }
      }

      // Check package.json dependencies
      if (auto_detect.packages) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJSON(packageJsonPath);
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          for (const pkg of auto_detect.packages) {
            if (allDeps[pkg]) {
              confidence += 0.25;
              reasons.push(`Uses ${pkg}`);
            }
          }
        }
      }

      // Check environment variables
      if (auto_detect.env_vars) {
        for (const envVar of auto_detect.env_vars) {
          if (process.env[envVar]) {
            confidence += 0.2;
            reasons.push(`Env var ${envVar} set`);
          }
        }
      }

      // Check git remote pattern
      if (auto_detect.git_remote_pattern) {
        const gitConfigPath = path.join(projectPath, '.git', 'config');
        if (await fs.pathExists(gitConfigPath)) {
          const gitConfig = await fs.readFile(gitConfigPath, 'utf-8');
          const regex = new RegExp(auto_detect.git_remote_pattern);
          if (regex.test(gitConfig)) {
            confidence += 0.25;
            reasons.push(`Git remote matches ${auto_detect.git_remote_pattern}`);
          }
        }
      }

      // Add to results if confidence > 0
      if (confidence > 0) {
        results.push({
          pluginName: plugin.manifest.name,
          confidence: Math.min(confidence, 1.0), // Cap at 1.0
          reason: reasons.join(', '),
          trigger: 'project-structure'
        });
      }
    }

    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Phase 2: Spec-based detection
   *
   * Detects plugins based on increment spec content during `/specweave.inc`
   *
   * @param specContent - Content of spec.md
   * @returns Array of detection results
   */
  async detectFromSpec(specContent: string): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Ensure plugins are loaded
    if (this.availablePlugins.length === 0) {
      await this.loadAvailablePlugins();
    }

    const normalizedContent = specContent.toLowerCase();

    // Check each plugin's trigger keywords
    for (const plugin of this.availablePlugins) {
      const { triggers } = plugin.manifest;
      if (!triggers || triggers.length === 0) continue;

      let matchCount = 0;
      const matchedTriggers: string[] = [];

      for (const trigger of triggers) {
        const regex = new RegExp(`\\b${trigger.toLowerCase()}\\b`, 'gi');
        const matches = normalizedContent.match(regex);
        if (matches) {
          matchCount += matches.length;
          matchedTriggers.push(trigger);
        }
      }

      if (matchCount > 0) {
        // Confidence based on frequency (capped at 1.0)
        const confidence = Math.min(matchCount * 0.1, 1.0);

        results.push({
          pluginName: plugin.manifest.name,
          confidence,
          reason: `Spec mentions: ${matchedTriggers.join(', ')}`,
          trigger: 'spec-keywords'
        });
      }
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Phase 3: Task-based detection
   *
   * Detects plugins based on task description (pre-task hook)
   *
   * @param taskContent - Content of task description
   * @returns Array of detection results
   */
  async detectFromTask(taskContent: string): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Ensure plugins are loaded
    if (this.availablePlugins.length === 0) {
      await this.loadAvailablePlugins();
    }

    const normalizedContent = taskContent.toLowerCase();

    // Check each plugin's trigger keywords
    for (const plugin of this.availablePlugins) {
      const { triggers } = plugin.manifest;
      if (!triggers || triggers.length === 0) continue;

      const matchedTriggers: string[] = [];

      for (const trigger of triggers) {
        const regex = new RegExp(`\\b${trigger.toLowerCase()}\\b`, 'i');
        if (regex.test(normalizedContent)) {
          matchedTriggers.push(trigger);
        }
      }

      if (matchedTriggers.length > 0) {
        // Task-based detection has moderate confidence
        const confidence = 0.6;

        results.push({
          pluginName: plugin.manifest.name,
          confidence,
          reason: `Task mentions: ${matchedTriggers.join(', ')}`,
          trigger: 'task-keywords'
        });
      }
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Phase 4: Git diff detection
   *
   * Detects plugins based on recent git changes (post-increment hook)
   *
   * @param diff - Git diff output
   * @returns Array of detection results
   */
  async detectFromChanges(diff: string): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Ensure plugins are loaded
    if (this.availablePlugins.length === 0) {
      await this.loadAvailablePlugins();
    }

    const normalizedDiff = diff.toLowerCase();

    // Check for new file patterns
    for (const plugin of this.availablePlugins) {
      const { auto_detect } = plugin.manifest;
      if (!auto_detect?.files) continue;

      const matchedFiles: string[] = [];

      for (const pattern of auto_detect.files) {
        // Check if diff contains new files matching pattern
        const regex = new RegExp(`\\+\\+\\+.*${pattern}`, 'i');
        if (regex.test(normalizedDiff)) {
          matchedFiles.push(pattern);
        }
      }

      if (matchedFiles.length > 0) {
        results.push({
          pluginName: plugin.manifest.name,
          confidence: 0.7,
          reason: `Added files: ${matchedFiles.join(', ')}`,
          trigger: 'git-changes'
        });
      }
    }

    // Check for new package.json dependencies
    const packageJsonMatch = diff.match(/\+\+\+ b\/package\.json([\s\S]+?)(?=\+\+\+|$)/);
    if (packageJsonMatch) {
      const addedLines = packageJsonMatch[1]
        .split('\n')
        .filter(line => line.startsWith('+') && !line.startsWith('+++'));

      for (const plugin of this.availablePlugins) {
        const { auto_detect } = plugin.manifest;
        if (!auto_detect?.packages) continue;

        const matchedPackages: string[] = [];

        for (const pkg of auto_detect.packages) {
          if (addedLines.some(line => line.includes(`"${pkg}"`))) {
            matchedPackages.push(pkg);
          }
        }

        if (matchedPackages.length > 0) {
          results.push({
            pluginName: plugin.manifest.name,
            confidence: 0.8,
            reason: `Added dependencies: ${matchedPackages.join(', ')}`,
            trigger: 'package-json-changes'
          });
        }
      }
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Combine detection results from multiple sources
   *
   * Merges results and adjusts confidence scores
   *
   * @param results - Array of detection result arrays
   * @returns Merged and deduplicated results
   */
  combineResults(...results: DetectionResult[][]): DetectionResult[] {
    const combined = new Map<string, DetectionResult>();

    for (const resultArray of results) {
      for (const result of resultArray) {
        const existing = combined.get(result.pluginName);

        if (existing) {
          // Boost confidence if detected from multiple sources
          existing.confidence = Math.min(
            existing.confidence + result.confidence * 0.3,
            1.0
          );
          existing.reason += `; ${result.reason}`;
        } else {
          combined.set(result.pluginName, { ...result });
        }
      }
    }

    // Convert to array and sort
    return Array.from(combined.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get high-confidence suggestions
   *
   * Filters detection results by confidence threshold
   *
   * @param results - Detection results
   * @param threshold - Minimum confidence (default: 0.6)
   * @returns High-confidence plugin suggestions
   */
  getHighConfidenceSuggestions(
    results: DetectionResult[],
    threshold: number = 0.6
  ): string[] {
    return results
      .filter(r => r.confidence >= threshold)
      .map(r => r.pluginName);
  }

  /**
   * Format detection results for display
   *
   * @param results - Detection results
   * @returns Formatted string for CLI output
   */
  formatResults(results: DetectionResult[]): string {
    if (results.length === 0) {
      return 'No plugins detected for this project.';
    }

    let output = '\n📦 Detected plugins:\n\n';

    for (const result of results) {
      const confidenceBar = '█'.repeat(Math.floor(result.confidence * 10));
      const confidencePercent = Math.floor(result.confidence * 100);

      output += `  ${result.pluginName}\n`;
      output += `    Confidence: ${confidenceBar} ${confidencePercent}%\n`;
      output += `    Reason: ${result.reason}\n\n`;
    }

    return output;
  }
}
