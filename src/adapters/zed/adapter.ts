/**
 * Zed Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class ZedAdapter extends AdapterBase {
  name = 'zed';
  description = 'Zed adapter — skills installed in .rules/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.commandExists('zed') || await this.fileExists('.zed');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Zed Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.rules'));
    console.log('\n✨ Zed adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.rules';
    console.log(`\n📦 Installing plugin skills for Zed: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Zed!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Zed: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.rules');
    console.log(`   ✓ Removed from .rules/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return this.listInstalledPluginsInDir('.rules');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Zed Adapter

Skills installed in .rules/.
Run: specweave refresh-plugins
    `;
  }
}
