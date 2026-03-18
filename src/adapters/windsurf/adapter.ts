/**
 * Windsurf Adapter
 *
 * Semi-automation adapter for Windsurf (by Codeium).
 * Uses skill files in .windsurf/skills/ for context-specific instructions.
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class WindsurfAdapter extends AdapterBase {
  name = 'windsurf';
  description = 'Windsurf adapter - Semi-automation with skills in .windsurf/skills/';
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
    const skillsDir = path.join(options.projectPath, '.windsurf', 'skills');
    await fs.ensureDir(skillsDir);
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
   * Writes skill SKILL.md files into .windsurf/skills/ for auto-loading by Windsurf.
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.windsurf/skills';
    console.log(`\n📦 Installing plugin skills for Windsurf: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Windsurf!`);
  }

  /**
   * Unload a plugin from Windsurf
   *
   * Removes plugin skill files from .windsurf/skills/
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Windsurf: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.windsurf/skills');
    console.log(`   ✓ Removed from .windsurf/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for Windsurf
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.windsurf/skills');
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

Skills are installed in .windsurf/skills/ — Windsurf loads *.md skill files automatically.

Quick Start:
  Run: specweave refresh-plugins
  Then use Windsurf normally — skills are auto-loaded.
    `;
  }
}
