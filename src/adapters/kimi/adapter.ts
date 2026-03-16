/**
 * Kimi CLI Adapter
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class KimiAdapter extends AdapterBase {
  name = 'kimi';
  description = 'Kimi CLI adapter — skills installed in .kimi/skills/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.commandExists('kimi') || await this.fileExists('.kimi');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Kimi CLI Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.kimi/skills'));
    console.log('\n✨ Kimi CLI adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.kimi/skills';
    console.log(`\n📦 Installing plugin skills for Kimi: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Kimi!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Kimi: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.kimi/skills');
    console.log(`   ✓ Removed from .kimi/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.kimi/skills');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Kimi CLI Adapter

Skills installed in .kimi/skills/.
Run: specweave refresh-plugins
    `;
  }
}
