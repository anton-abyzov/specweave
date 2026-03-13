/**
 * Amazon Q Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class AmazonQAdapter extends AdapterBase {
  name = 'amazonq';
  description = 'Amazon Q adapter — skills installed in .amazonq/rules/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.fileExists('.amazonq') || await this.commandExists('q');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Amazon Q Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.amazonq/rules'));
    console.log('\n✨ Amazon Q adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.amazonq/rules';
    console.log(`\n📦 Installing plugin skills for Amazon Q: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Amazon Q!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Amazon Q: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.amazonq/rules');
    console.log(`   ✓ Removed from .amazonq/rules/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return this.listInstalledPluginsInDir('.amazonq/rules');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Amazon Q Adapter

Skills installed in .amazonq/rules/.
Run: specweave refresh-plugins
    `;
  }
}
