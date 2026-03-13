/**
 * JetBrains Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class JetBrainsAdapter extends AdapterBase {
  name = 'jetbrains';
  description = 'JetBrains adapter — skills installed in .aiassistant/rules/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.fileExists('.aiassistant') || await this.commandExists('idea');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing JetBrains Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.aiassistant/rules'));
    console.log('\n✨ JetBrains adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.aiassistant/rules';
    console.log(`\n📦 Installing plugin skills for JetBrains: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for JetBrains!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from JetBrains: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.aiassistant/rules');
    console.log(`   ✓ Removed from .aiassistant/rules/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.aiassistant/rules');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
JetBrains Adapter

Skills installed in .aiassistant/rules/.
Run: specweave refresh-plugins
    `;
  }
}
