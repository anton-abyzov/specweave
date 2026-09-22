/**
 * Codex Adapter (OpenAI)
 *
 * OpenAI Codex adapter with native skills and portable project instructions.
 * Uses universal AGENTS.md file for instructions.
 *
 * Codex features:
 * - Native skills and project instructions
 * - File read/write operations
 * - Test execution and validation
 * - Task-based isolated environments
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import { applyInstructionTemplate } from '../../cli/helpers/init/instruction-file-writer.js';
import { findSourceDir } from '../../cli/helpers/init/path-utils.js';
import { getDirname } from '../../utils/esm-helpers.js';
import { installNativeSkills } from '../../utils/native-skill-installer.js';
import { normalizeSkillFrontmatter } from '../../utils/plugin-copier.js';
import type { Plugin } from '../../core/types/plugin.js';

const __dirname = getDirname(import.meta.url);

export class CodexAdapter extends AdapterBase {
  name = 'codex';
  description = 'OpenAI Codex adapter - native skills, AGENTS.md and portable project coordination';
  automationLevel = 'semi' as const;

  /**
   * Detect if Codex is available
   *
   * Checks for:
   * - codex command in PATH (Codex CLI)
   * - .codex/ directory exists
   * - AGENTS.md file exists (previously configured)
   */
  async detect(): Promise<boolean> {
    const hasCodexCLI = await this.commandExists('codex');
    const hasCodexDir = await this.fileExists('.codex');
    const hasAgentsMd = await this.fileExists('AGENTS.md');

    return hasCodexCLI || hasCodexDir || hasAgentsMd;
  }

  /**
   * Get files to install for Codex adapter
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: 'AGENTS.md',
        targetPath: 'AGENTS.md',
        description: 'Universal SpecWeave instructions (works with all AI tools)'
      },
      {
        sourcePath: 'README.md',
        targetPath: '.codex/README.md',
        description: 'Codex adapter documentation'
      }
    ];
  }

  /**
   * Install Codex adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing OpenAI Codex Adapter\n');

    // Ensure .codex directory exists
    const codexDir = path.join(options.projectPath, '.codex');
    await fs.ensureDir(codexDir);
    await fs.ensureDir(path.join(options.projectPath, '.agents', 'skills'));

    // Generate AGENTS.md
    const agentsMdPath = path.join(options.projectPath, 'AGENTS.md');
    await this.generateAgentsMd(agentsMdPath, options);

    // Copy README
    const readmePath = path.join(__dirname, 'README.md');
    if (await fs.pathExists(readmePath)) {
      await fs.copy(readmePath, path.join(codexDir, 'README.md'));
    }

    console.log('\n✨ Codex adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - AGENTS.md (universal instructions)');
    console.log('   - .codex/README.md (adapter documentation)');
  }

  /**
   * Generate AGENTS.md file
   */
  private async generateAgentsMd(_targetPath: string, options: AdapterOptions): Promise<void> {
    const result = applyInstructionTemplate({
      projectPath: options.projectPath,
      templatesDir: findSourceDir('templates', __dirname),
      filename: 'AGENTS.md',
      projectName: options.projectName,
    });
    if (result.action === 'skipped') {
      console.log('  ⚠ AGENTS.md - template not found, skipped');
      return;
    }
    console.log(`  ✅ AGENTS.md - Universal SpecWeave instructions (${result.action})`);
    result.warnings.forEach(w => console.log('     ⚠ ' + w));
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Check if Codex adapter supports plugins
   */
  supportsPlugins(): boolean {
    return true;
  }

  getSkillsDirectory(): string {
    return '.agents/skills';
  }

  /**
   * Compile and install a plugin for OpenAI Codex.
   * Writes each SKILL.md as a separate file in `.agents/skills/`.
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.agents/skills';
    console.log(`\n📦 Installing plugin skills for Codex: ${plugin.manifest.name}`);
    const result = installNativeSkills(plugin.skills.map(skill => ({
      name: `${plugin.manifest.name}-${skill.name}`, sourceDir: skill.path,
    })), process.cwd(), normalizeSkillFrontmatter);
    for (const backup of result.backups) console.log(`   Previous skill preserved: ${backup}`);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Codex!`);
  }

  /**
   * Unload a plugin from Codex — removes skill files from `.agents/skills/`.
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Codex: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.agents/skills');
    console.log(`   ✓ Removed from .agents/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get installed plugins for Codex by scanning `.agents/skills/`.
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.agents/skills');
  }

  /**
   * Get usage instructions for Codex adapter
   */
  getInstructions(): string {
    return `
OpenAI Codex adapter

AGENTS.md carries durable project instructions. Native skills live in .agents/skills.
Codex supports native skills and task/subagent capabilities; availability depends on
its surface and configuration. SpecWeave state remains in portable local files.

Quick start:
  specweave project init --name "My project" --goal "Describe the outcome"
  specweave project show
  specweave project brief --harness codex
  specweave refresh-plugins

Use the same intent board, task ledger and verification commands in any harness.
Managed native skills use the sw- prefix. Changed files are backed up under
.specweave/state/skill-backups. Existing .codex/skills files remain untouched.
Hooks require the host's supported events and trust review; this adapter does not
silently install or approve hooks. The project brief works without hooks.

Official setup: https://learn.chatgpt.com/docs/build-skills
`;
  }
}
