/**
 * Adapter Interface for Multi-Tool Support
 *
 * Defines the contract that all SpecWeave adapters must implement.
 * Enables SpecWeave to work with ANY AI coding tool (Claude, Cursor, Copilot, etc.)
 */

import type { Plugin } from '../core/types/plugin.js';

export interface AdapterOptions {
  projectPath: string;
  projectName: string;
  techStack?: {
    language: string;
    framework?: string;
  };
  docsApproach?: 'comprehensive' | 'incremental';
}

export interface RequirementsResult {
  met: boolean;
  missing: string[];
  warnings: string[];
}

export interface AdapterFile {
  sourcePath: string;      // Path in src/adapters/{adapter-name}/
  targetPath: string;       // Path in user's project (relative to project root)
  description: string;      // What this file does
}

export type AutomationLevel = 'full' | 'semi' | 'basic' | 'manual';

/**
 * Base Adapter Interface
 *
 * All adapters (Claude, Cursor, Copilot, Generic) must implement this interface.
 */
export interface IAdapter {
  /**
   * Adapter name (e.g., 'claude', 'cursor', 'copilot', 'generic')
   */
  name: string;

  /**
   * Human-readable description of what this adapter provides
   */
  description: string;

  /**
   * Automation level this adapter provides
   * - full: Complete automation (skills, agents, hooks auto-activate)
   * - semi: Semi-automated (context shortcuts, multi-file editing)
   * - basic: Basic automation (workspace instructions, suggestions)
   * - manual: Manual workflow (step-by-step guide)
   */
  automationLevel: AutomationLevel;

  /**
   * Detect if this adapter's tool is present in the environment
   *
   * Examples:
   * - Claude: Check for Claude Code CLI
   * - Cursor: Check for .cursor/ directory or Cursor process
   * - Copilot: Check for .github/copilot/ or Copilot extension
   *
   * @returns Promise<boolean> True if tool detected
   */
  detect(): Promise<boolean>;

  /**
   * Check if system requirements are met for this adapter
   *
   * Examples:
   * - Node.js version >= 18
   * - Git installed
   * - Tool-specific requirements
   *
   * @returns Promise<RequirementsResult> Requirements check result
   */
  checkRequirements(): Promise<RequirementsResult>;

  /**
   * Get list of files this adapter will install
   *
   * @returns AdapterFile[] Array of files to install
   */
  getFiles(): AdapterFile[];

  /**
   * Install this adapter to a project
   *
   * Creates tool-specific files (e.g., .cursorrules, .github/copilot/instructions.md)
   * Installs relevant skills/agents if applicable
   *
   * @param options Installation options
   * @returns Promise<void>
   */
  install(options: AdapterOptions): Promise<void>;

  /**
   * Post-installation actions
   *
   * Examples:
   * - Create symlinks
   * - Update config files
   * - Display setup instructions to user
   *
   * @param options Installation options
   * @returns Promise<void>
   */
  postInstall(options: AdapterOptions): Promise<void>;

  /**
   * Get human-readable instructions for using this adapter
   *
   * Displayed to user after installation
   *
   * @returns string Markdown-formatted instructions
   */
  getInstructions(): string;

  /**
   * Check if this adapter supports plugins
   *
   * Returns true if the adapter can install and compile plugins
   * (Claude native, Cursor AGENTS.md, Copilot instructions.md)
   * Returns false for generic/manual adapters
   *
   * @returns boolean True if plugins are supported
   */
  supportsPlugins(): boolean;

  /**
   * Compile and install a plugin for this adapter
   *
   * Transforms plugin content (skills/agents/commands) to tool-specific format:
   * - Claude: Copy to .claude/skills/, .claude/agents/, .claude/commands/
   * - Cursor: Compile to AGENTS.md + team commands JSON
   * - Copilot: Compile to .github/copilot/instructions.md
   * - Generic: Generate manual copy-paste instructions
   *
   * @param plugin Plugin to compile and install
   * @returns Promise<void>
   */
  compilePlugin(plugin: Plugin): Promise<void>;

  /**
   * Unload (disable) a plugin for this adapter
   *
   * Removes plugin-specific files and restores previous state
   *
   * @param pluginName Name of plugin to unload
   * @returns Promise<void>
   */
  unloadPlugin(pluginName: string): Promise<void>;

  /**
   * Get plugin installation status
   *
   * Returns information about which plugins are currently installed
   *
   * @returns Promise<string[]> Array of installed plugin names
   */
  getInstalledPlugins(): Promise<string[]>;
}
