/**
 * Aider Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class AiderAdapter extends AdapterBase {
  name = 'aider';
  description = 'Aider adapter — skills installed in .aider/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.commandExists('aider');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Aider Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.aider'));
    console.log('\n✨ Aider adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.aider';
    console.log(`\n📦 Installing plugin skills for Aider: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Aider!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Aider: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.aider');
    console.log(`   ✓ Removed from .aider/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.aider');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Aider Adapter

Skills installed in .aider/.
Run: specweave refresh-plugins
    `;
  }
}
