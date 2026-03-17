/**
 * Cursor Adapter
 *
 * Semi-automation adapter for Cursor editor.
 * Provides @ context shortcuts for quick context injection.
 *
 * Cursor automatically reads AGENTS.md (universal standard) for workflow instructions.
 * This adapter only installs Cursor-specific features (@ shortcuts).
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class CursorAdapter extends AdapterBase {
  name = 'cursor';
  description = 'Cursor adapter - Semi-automation with AGENTS.md and @ context shortcuts';
  automationLevel = 'semi' as const;

  /**
   * Detect if Cursor is available
   *
   * NOTE: This detection only runs if Claude CLI is NOT available.
   * Claude is checked FIRST (active indicator) before Cursor (passive indicator).
   * See adapter-loader.ts detectTool() for full priority order.
   *
   * Checks for (passive indicators):
   * - cursor command in PATH
   * - .cursor/ directory exists
   */
  async detect(): Promise<boolean> {
    const hasCursorCLI = await this.commandExists('cursor');
    const hasCursorDir = await this.fileExists('.cursor');

    return hasCursorCLI || hasCursorDir;
  }

  /**
   * Get files to install for Cursor adapter
   *
   * Note: Cursor automatically reads AGENTS.md (universal standard).
   * This adapter only installs Cursor-specific @ context shortcuts.
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: '.cursor/context/increments-context.md',
        targetPath: '.cursor/context/increments-context.md',
        description: '@increments context shortcut'
      },
      {
        sourcePath: '.cursor/context/docs-context.md',
        targetPath: '.cursor/context/docs-context.md',
        description: '@docs context shortcut'
      },
      {
        sourcePath: '.cursor/context/strategy-context.md',
        targetPath: '.cursor/context/strategy-context.md',
        description: '@strategy context shortcut'
      },
      {
        sourcePath: '.cursor/context/tests-context.md',
        targetPath: '.cursor/context/tests-context.md',
        description: '@tests context shortcut'
      },
      {
        sourcePath: 'README.md',
        targetPath: '.cursor/README.md',
        description: 'Cursor adapter documentation'
      }
    ];
  }

  /**
   * Install Cursor adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Cursor Adapter (Semi-Automation)\n');

    // Ensure .cursor directory exists
    const cursorDir = path.join(options.projectPath, '.cursor');
    await fs.ensureDir(cursorDir);
    await fs.ensureDir(path.join(cursorDir, 'context'));
    await fs.ensureDir(path.join(cursorDir, 'skills'));

    // Copy files
    await super.install(options);

    console.log('\n✨ Cursor adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - .cursor/context/ (@ shortcuts for quick context injection)');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Cursor adapter
   */
  getInstructions(): string {
    return `
Cursor Adapter - Semi-Automation

Cursor reads AGENTS.md for workflow instructions.

@ Shortcuts:
  @increments - Current increment files
  @docs       - Architecture docs
  @strategy   - Business specs
  @tests      - Test files

Quick Start:
  1. Open in Cursor
  2. Say: "Create increment for [feature]"
  3. Use Composer (Cmd+I) for multi-file edits

Tip: Say "act as PM/Architect/DevOps" to adopt roles.
Docs: AGENTS.md, .cursor/README.md
    `;
  }

  /**
   * Check if Cursor adapter supports plugins
   *
   * Cursor has plugin support via AGENTS.md compilation
   *
   * @returns boolean True for Cursor
   */
  supportsPlugins(): boolean {
    return true;
  }

  /**
   * Compile and install a plugin for Cursor.
   * Writes each SKILL.md as a separate file in `.cursor/skills/`.
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const skillsDir = '.cursor/skills';
    console.log(`\n📦 Installing plugin skills for Cursor: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, skillsDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${skillsDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Cursor!`);
  }

  /**
   * Unload a plugin from Cursor — removes skill files from `.cursor/skills/`.
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Cursor: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.cursor/skills');
    console.log(`   ✓ Removed from .cursor/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get installed plugins for Cursor by scanning `.cursor/skills/`.
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.cursor/skills');
  }
}
