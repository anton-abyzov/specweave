/**
 * Trae Adapter (ByteDance)
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class TraeAdapter extends AdapterBase {
  name = 'trae';
  description = 'Trae adapter — skills installed in .trae/skills/';
  automationLevel = 'semi' as const;

  async detect(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('which trae', { stdio: 'ignore' });
      return true;
    } catch {
      return await this.fileExists('.trae');
    }
  }

  getFiles(): AdapterFile[] {
    return [];
  }

  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Trae Adapter\n');
    await fs.ensureDir(path.join(options.projectPath, '.trae/skills'));
    console.log('\n✨ Trae adapter installed!');
    console.log('   Run `specweave refresh-plugins` to install skills.');
  }

  supportsPlugins(): boolean {
    return true;
  }

  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.trae/skills';
    console.log(`\n📦 Installing plugin skills for Trae: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Trae!`);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Trae: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.trae/skills');
    console.log(`   ✓ Removed from .trae/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.trae/skills');
  }

  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  getInstructions(): string {
    return `
Trae Adapter

Skills installed in .trae/skills/.
Run: specweave refresh-plugins
    `;
  }
}
