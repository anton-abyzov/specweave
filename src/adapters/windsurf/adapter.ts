/**
 * Windsurf Adapter
 *
 * Semi-automation adapter for Windsurf (by Codeium).
 * Uses rule files in .windsurf/rules/ for context-specific instructions.
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class WindsurfAdapter extends AdapterBase {
  name = 'windsurf';
  description = 'Windsurf adapter - Semi-automation with rules in .windsurf/rules/';
  automationLevel = 'semi' as const;

  /**
   * Detect if Windsurf is available
   *
   * Checks for:
   * - windsurf command in PATH
   * - .windsurf/ directory exists
   */
  async detect(): Promise<boolean> {
    const hasCLI = await this.commandExists('windsurf');
    const hasDir = await this.fileExists('.windsurf');
    return hasCLI || hasDir;
  }

  /**
   * Get files to install for Windsurf adapter
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Windsurf adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Windsurf Adapter\n');
    const rulesDir = path.join(options.projectPath, '.windsurf', 'rules');
    await fs.ensureDir(rulesDir);
    console.log('\n✨ Windsurf adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  /**
   * Check if Windsurf adapter supports plugins
   */
  supportsPlugins(): boolean {
    return true;
  }

  /**
   * Compile and install a plugin for Windsurf
   *
   * Writes skill SKILL.md files as <plugin>-<skill>.md
   * into .windsurf/rules/ for auto-loading by Windsurf.
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.windsurf/rules';
    console.log(`\n📦 Installing plugin skills for Windsurf: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir, '.md');
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Windsurf!`);
  }

  /**
   * Unload a plugin from Windsurf
   *
   * Removes <pluginName>-*.md files from .windsurf/rules/
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Windsurf: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.windsurf/rules', '.md');
    console.log(`   ✓ Removed from .windsurf/rules/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for Windsurf
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.windsurf/rules');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Windsurf adapter
   */
  getInstructions(): string {
    return `
Windsurf Adapter

Skills are installed in .windsurf/rules/ — Windsurf loads *.md rule files automatically.

Quick Start:
  Run: specweave refresh-plugins
  Then use Windsurf normally — skills are auto-loaded.
    `;
  }
}
