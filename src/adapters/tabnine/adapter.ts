/**
 * Tabnine Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class TabnineAdapter extends AdapterBase {
  name = 'tabnine';
  description = 'Tabnine adapter — skills installed in .tabnine/guidelines/';
  automationLevel = 'basic' as const;

  async detect(): Promise<boolean> {
    return this.fileExists('.tabnine');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Tabnine Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.tabnine/guidelines'));
    console.log('\n✨ Tabnine adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.tabnine/guidelines';
    console.log(`\n📦 Installing plugin skills for Tabnine: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Tabnine!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Tabnine: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.tabnine/guidelines');
    console.log(`   ✓ Removed from .tabnine/guidelines/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return this.listInstalledPluginsInDir('.tabnine/guidelines');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Tabnine Adapter

Skills installed in .tabnine/guidelines/.
Run: specweave refresh-plugins
    `;
  }
}
