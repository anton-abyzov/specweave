/**
 * Continue.dev Adapter
 *
 * Semi-automation adapter for Continue.dev.
 * Uses skill files in .continue/skills/ for context-specific instructions.
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class ContinueAdapter extends AdapterBase {
  name = 'continue';
  description = 'Continue.dev adapter - Semi-automation with skills in .continue/skills/';
  automationLevel = 'semi' as const;

  /**
   * Detect if Continue.dev is configured
   *
   * Checks for:
   * - .continue/ directory exists
   */
  async detect(): Promise<boolean> {
    return await this.fileExists('.continue');
  }

  /**
   * Get files to install for Continue adapter
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Continue adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Continue.dev Adapter\n');
    const skillsDir = path.join(options.projectPath, '.continue', 'skills');
    await fs.ensureDir(skillsDir);
    console.log('\n✨ Continue.dev adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  /**
   * Check if Continue adapter supports plugins
   */
  supportsPlugins(): boolean {
    return true;
  }

  /**
   * Compile and install a plugin for Continue.dev
   *
   * Writes skill SKILL.md files as <plugin>-<skill>.md
   * into .continue/skills/ for auto-loading by Continue.
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.continue/skills';
    console.log(`\n📦 Installing plugin skills for Continue.dev: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Continue.dev!`);
  }

  /**
   * Unload a plugin from Continue.dev
   *
   * Removes <pluginName>-*.md files from .continue/skills/
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Continue.dev: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.continue/skills');
    console.log(`   ✓ Removed from .continue/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for Continue.dev
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.continue/skills');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Continue.dev adapter
   */
  getInstructions(): string {
    return `
Continue.dev Adapter

Skills are installed in .continue/skills/ — Continue.dev loads *.md skill files automatically.

Quick Start:
  Run: specweave refresh-plugins
  Then use Continue.dev normally — skills are auto-loaded.
    `;
  }
}
