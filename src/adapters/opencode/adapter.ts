/**
 * OpenCode Adapter
 *
 * Adapter for OpenCode AI coding tool.
 * Writes skills to .opencode/skills/ for AI discovery.
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class OpenCodeAdapter extends AdapterBase {
  name = 'opencode';
  description = 'OpenCode adapter — skills installed in .opencode/skills/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.commandExists('opencode') || await this.fileExists('.opencode');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing OpenCode Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.opencode/skills'));
    console.log('\n✨ OpenCode adapter installed!');
    console.log('   Skills will be written to .opencode/skills/');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.opencode/skills';
    console.log(`\n📦 Installing plugin skills for OpenCode: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for OpenCode!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from OpenCode: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.opencode/skills');
    console.log(`   ✓ Removed from .opencode/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.opencode/skills');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
OpenCode Adapter

Skills installed in .opencode/skills/.
AGENTS.md contains workflow reference.

Quick Start:
  1. Open your project in OpenCode
  2. Say: "Create increment for [feature]"
  3. Use specweave CLI commands for workflow automation

Available CLI commands:
  specweave create-increment  Create a new increment
  specweave status            Check progress
  specweave validate          Run quality checks
  specweave complete          Close an increment
    `;
  }
}
