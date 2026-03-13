/**
 * GitHub Copilot Adapter
 *
 * Basic-automation adapter for GitHub Copilot.
 * Uses per-context instruction files in .github/instructions/.
 * GitHub Copilot reads *.instructions.md files for context-specific rules.
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class CopilotAdapter extends AdapterBase {
  name = 'copilot';
  description = 'GitHub Copilot adapter - Basic automation with per-context instruction files';
  automationLevel = 'basic' as const;

  /**
   * Detect if GitHub Copilot is configured
   *
   * Checks for:
   * - .github/copilot-instructions.md (global instructions file)
   * - .github/instructions/ directory (per-context instructions)
   */
  async detect(): Promise<boolean> {
    return (
      (await this.fileExists('.github/copilot-instructions.md')) ||
      (await this.fileExists('.github/instructions'))
    );
  }

  /**
   * Get files to install for Copilot adapter
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Copilot adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing GitHub Copilot Adapter\n');
    const instructionsDir = path.join(options.projectPath, '.github', 'instructions');
    await fs.ensureDir(instructionsDir);
    console.log('\n✨ GitHub Copilot adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  /**
   * Check if Copilot adapter supports plugins
   */
  supportsPlugins(): boolean {
    return true;
  }

  /**
   * Compile and install a plugin for GitHub Copilot
   *
   * Writes skill SKILL.md files as <plugin>-<skill>.instructions.md
   * into .github/instructions/ for per-context rule loading.
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.github/instructions';
    console.log(`\n📦 Installing plugin skills for GitHub Copilot: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir, '.instructions.md');
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for GitHub Copilot!`);
  }

  /**
   * Unload a plugin from GitHub Copilot
   *
   * Removes <pluginName>-*.instructions.md files from .github/instructions/
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from GitHub Copilot: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.github/instructions', '.instructions.md');
    console.log(`   ✓ Removed from .github/instructions/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for GitHub Copilot
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.github/instructions');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for GitHub Copilot adapter
   */
  getInstructions(): string {
    return `
GitHub Copilot Adapter

Skills are installed in .github/instructions/ — Copilot loads *.instructions.md files as per-context rules.

Quick Start:
  Run: specweave refresh-plugins
  Then use GitHub Copilot normally — skills are auto-loaded.
    `;
  }
}
