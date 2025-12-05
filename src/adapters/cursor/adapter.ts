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
import { LanguageManager, getSystemPromptForLanguage } from '../../core/i18n/language-manager.js';
import type { SupportedLanguage } from '../../core/i18n/types.js';

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
   * Read language configuration from project config
   *
   * @returns Language setting from config, defaults to 'en'
   */
  private async getLanguageConfig(): Promise<SupportedLanguage> {
    const projectPath = process.cwd();
    const configPath = path.join(projectPath, '.specweave', 'config.json');

    if (!(await fs.pathExists(configPath))) {
      return 'en'; // Default to English if no config
    }

    try {
      const config = await fs.readJson(configPath);
      return (config.language as SupportedLanguage) || 'en';
    } catch (error) {
      console.warn('⚠️  Could not read language from config, defaulting to English');
      return 'en';
    }
  }

  /**
   * Inject system prompt for non-English languages
   *
   * Prepends language instruction to markdown content if language !== 'en'
   *
   * @param content Original markdown content
   * @param language Target language
   * @returns Modified content with system prompt (or unchanged if English)
   */
  private injectSystemPrompt(content: string, language: SupportedLanguage): string {
    if (language === 'en') {
      return content; // No changes for English - preserve default behavior
    }

    // Get system prompt for target language
    const systemPrompt = getSystemPromptForLanguage(language);

    // For AGENTS.md compilation, inject at the beginning of the content
    return `${systemPrompt}\n\n${content}`;
  }

  /**
   * Compile and install a plugin for Cursor
   *
   * Cursor uses AGENTS.md compilation:
   * - Append skills to AGENTS.md
   * - Append agents to AGENTS.md
   * - Append commands to team commands JSON
   *
   * NEW: Injects system prompts for non-English languages
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n📦 Compiling plugin for Cursor: ${plugin.manifest.name}`);

    // Get language configuration for system prompt injection
    const language = await this.getLanguageConfig();
    if (language !== 'en') {
      console.log(`   🌐 Language: ${language} (system prompts will be injected)`);
    }

    // Ensure AGENTS.md exists
    if (!(await fs.pathExists(agentsMdPath))) {
      throw new Error('AGENTS.md not found. Run specweave init first.');
    }

    // Read current AGENTS.md
    let agentsMd = await fs.readFile(agentsMdPath, 'utf-8');

    // Check if plugin already compiled
    const pluginMarker = `<!-- Plugin: ${plugin.manifest.name} -->`;
    if (agentsMd.includes(pluginMarker)) {
      console.log(`   ℹ️  Plugin ${plugin.manifest.name} already compiled to AGENTS.md`);
      return;
    }

    // Generate plugin section for AGENTS.md
    let pluginSection = `\n\n${pluginMarker}\n\n`;
    pluginSection += `# Plugin: ${plugin.manifest.name}\n\n`;
    pluginSection += `${plugin.manifest.description}\n\n`;

    // Add skills
    if (plugin.skills.length > 0) {
      pluginSection += `## Skills\n\n`;
      for (const skill of plugin.skills) {
        const skillContent = await fs.readFile(path.join(skill.path, 'SKILL.md'), 'utf-8');
        // Remove frontmatter for AGENTS.md
        const contentWithoutFrontmatter = skillContent.replace(/^---\n[\s\S]+?\n---\n/, '');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(contentWithoutFrontmatter, language);
        pluginSection += `### ${skill.name}\n\n`;
        pluginSection += `${modifiedContent}\n\n`;
      }
    }

    // Add agents
    if (plugin.agents.length > 0) {
      pluginSection += `## Agents\n\n`;
      for (const agent of plugin.agents) {
        const agentContent = await fs.readFile(path.join(agent.path, 'AGENT.md'), 'utf-8');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(agentContent, language);
        pluginSection += `### ${agent.name}\n\n`;
        pluginSection += `${modifiedContent}\n\n`;
      }
    }

    // Add commands
    if (plugin.commands.length > 0) {
      pluginSection += `## Commands\n\n`;
      for (const command of plugin.commands) {
        const commandContent = await fs.readFile(command.path, 'utf-8');
        // Remove frontmatter
        const contentWithoutFrontmatter = commandContent.replace(/^---\n[\s\S]+?\n---\n/, '');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(contentWithoutFrontmatter, language);
        pluginSection += `### /${command.name}\n\n`;
        pluginSection += `${modifiedContent}\n\n`;
      }
    }

    pluginSection += `<!-- End Plugin: ${plugin.manifest.name} -->\n`;

    // Append to AGENTS.md
    agentsMd += pluginSection;
    await fs.writeFile(agentsMdPath, agentsMd, 'utf-8');

    console.log(`   ✓ Compiled to AGENTS.md`);
    console.log(`   ✓ ${plugin.skills.length} skills added`);
    console.log(`   ✓ ${plugin.agents.length} agents added`);
    console.log(`   ✓ ${plugin.commands.length} commands added`);

    console.log(`\n✅ Plugin ${plugin.manifest.name} compiled for Cursor!`);
  }

  /**
   * Unload a plugin from Cursor
   *
   * Removes plugin section from AGENTS.md
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n🗑️  Unloading plugin from Cursor: ${pluginName}`);

    if (!(await fs.pathExists(agentsMdPath))) {
      console.warn(`⚠️  AGENTS.md not found`);
      return;
    }

    // Read AGENTS.md
    let agentsMd = await fs.readFile(agentsMdPath, 'utf-8');

    // Find plugin section
    const startMarker = `<!-- Plugin: ${pluginName} -->`;
    const endMarker = `<!-- End Plugin: ${pluginName} -->`;

    const startIndex = agentsMd.indexOf(startMarker);
    if (startIndex === -1) {
      console.warn(`⚠️  Plugin ${pluginName} not found in AGENTS.md`);
      return;
    }

    const endIndex = agentsMd.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      console.warn(`⚠️  Plugin ${pluginName} section malformed in AGENTS.md`);
      return;
    }

    // Remove plugin section
    agentsMd = agentsMd.slice(0, startIndex) + agentsMd.slice(endIndex + endMarker.length);

    // Write back
    await fs.writeFile(agentsMdPath, agentsMd, 'utf-8');

    console.log(`   ✓ Removed from AGENTS.md`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for Cursor
   *
   * Parses AGENTS.md for plugin markers
   *
   * @returns Array of installed plugin names
   */
  async getInstalledPlugins(): Promise<string[]> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    if (!(await fs.pathExists(agentsMdPath))) {
      return [];
    }

    const agentsMd = await fs.readFile(agentsMdPath, 'utf-8');
    const pluginMarkerRegex = /<!-- Plugin: (specweave-[a-z0-9-]+) -->/g;
    const matches = agentsMd.matchAll(pluginMarkerRegex);

    const plugins: string[] = [];
    for (const match of matches) {
      plugins.push(match[1]);
    }

    return plugins;
  }
}
