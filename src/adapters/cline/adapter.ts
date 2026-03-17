/**
 * Cline Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class ClineAdapter extends AdapterBase {
  name = 'cline';
  description = 'Cline adapter — skills installed in .cline/skills/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.fileExists('.clinerules') || await this.fileExists('.cline');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Cline Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.cline/skills'));
    console.log('\n✨ Cline adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.cline/skills';
    console.log(`\n📦 Installing plugin skills for Cline: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Cline!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Cline: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.cline/skills');
    console.log(`   ✓ Removed from .cline/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.cline/skills');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Cline Adapter

Skills installed in .cline/skills/.
Run: specweave refresh-plugins
    `;
  }
}
