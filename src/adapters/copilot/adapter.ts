/**
 * GitHub Copilot Adapter
 *
 * Basic-automation adapter for GitHub Copilot.
 * Uses per-context skill files in .github/copilot/skills/.
 * GitHub Copilot reads *.instructions.md files for context-specific rules.
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class CopilotAdapter extends AdapterBase {
  name = 'copilot';
  description = 'GitHub Copilot adapter - Basic automation with per-context skill files';
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
    const skillsDir = path.join(options.projectPath, '.github', 'copilot', 'skills');
    await fs.ensureDir(skillsDir);
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
   * Writes skill files into .github/copilot/skills/ for per-context rule loading.
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.github/copilot/skills';
    console.log(`\n📦 Installing plugin skills for GitHub Copilot: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir, '.instructions.md');
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for GitHub Copilot!`);
  }

  /**
   * Unload a plugin from GitHub Copilot
   *
   * Removes plugin skill files from .github/copilot/skills/
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from GitHub Copilot: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.github/copilot/skills', '.instructions.md');
    console.log(`   ✓ Removed from .github/copilot/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for GitHub Copilot
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.github/copilot/skills');
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

Skills are installed in .github/copilot/skills/ — Copilot loads *.instructions.md files as per-context rules.

Quick Start:
  Run: specweave refresh-plugins
  Then use GitHub Copilot normally — skills are auto-loaded.
    `;
  }
}
