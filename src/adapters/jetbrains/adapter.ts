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
  description = 'JetBrains adapter — skills installed in .junie/skills/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    return await this.fileExists('.junie') || await this.fileExists('.aiassistant') || await this.commandExists('idea');
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing JetBrains Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.junie/skills'));
    console.log('\n✨ JetBrains adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.junie/skills';
    console.log(`\n📦 Installing plugin skills for JetBrains: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for JetBrains!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from JetBrains: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.junie/skills');
    console.log(`   ✓ Removed from .junie/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.junie/skills');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
JetBrains Adapter

Skills installed in .junie/skills/.
Run: specweave refresh-plugins
    `;
  }
}
