/**
 * Generic Adapter
 *
 * Universal adapter that works with ANY AI tool.
 * All AI tools can read AGENTS.md (universal standard) for workflow instructions.
 *
 * This adapter ensures 100% compatibility - works with GitHub Copilot, ChatGPT web,
 * Claude web, Gemini, or literally ANY AI that can read markdown and follow instructions.
 */

import * as path from 'path';
import fs from 'fs-extra';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';
import { LanguageManager, getSystemPromptForLanguage } from '../../core/i18n/language-manager.js';
import type { SupportedLanguage } from '../../core/i18n/types.js';

export class GenericAdapter extends AdapterBase {
  name = 'generic';
  description = 'Generic adapter - AGENTS.md works with ANY AI tool (Copilot, ChatGPT, Gemini, etc.)';
  automationLevel = 'manual' as const;

  /**
   * Detect if generic adapter should be used
   *
   * This adapter is the universal fallback - always returns true
   * since it works with literally any AI tool.
   */
  async detect(): Promise<boolean> {
    // Generic adapter works with ANY tool - always available
    return true;
  }

  /**
   * Get files to install for Generic adapter
   *
   * Note: Any AI tool can read AGENTS.md (universal standard).
   * No additional files needed.
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Generic adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Configuring for Universal AI Tool Compatibility\n');

    // No files to install - any AI can read AGENTS.md
    console.log('✅ AGENTS.md works with any AI tool (Copilot, ChatGPT, Gemini, Claude web, etc.)');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Generic adapter
   */
  getInstructions(): string {
    return `
================================================================
        Generic Adapter - Universal Compatibility
================================================================

Your project is now configured for ANY AI tool!

WHAT THIS PROVIDES:

- AGENTS.MD (Universal Standard)
  - GitHub Copilot automatically reads this file
  - ChatGPT, Gemini, Claude web can also use it
  - Contains all workflow instructions
  - Project structure and templates
  - Following agents.md standard (https://agents.md/)

- 100% Compatibility
  - GitHub Copilot (best experience with AGENTS.md)
  - ChatGPT (web), Claude (web), Gemini
  - Any AI that can read markdown

HOW TO USE AGENTS.MD WITH ANY AI:

Method 1: Command Discovery (GitHub Copilot - Recommended!)
1. AI reads AGENTS.md automatically (Copilot scans project files)
2. AGENTS.md contains "SpecWeave Commands" section with all 17 commands
3. Ask: "create increment for payments" or "run /inc payments"
4. AI reads plugins/specweave/commands/inc.md
5. AI executes PM-led workflow (market research, spec.md, plan.md, tasks.md)
6. Increment created - same result as Claude Code!

Available commands AI can execute:
- /inc "feature" - Plan new increment
- /do - Execute implementation tasks
- /done 0001 - Close increment
- /validate 0001 - Quality validation
- /progress - Check status
- /sync-docs - Sync living documentation
... and 11 more commands!

Method 2: Copy-Paste Workflow (ChatGPT web, Claude web, etc.)
1. Open AGENTS.md in your browser/editor
2. Copy relevant section (e.g., "Creating a Feature Increment")
3. Paste into AI chat (ChatGPT, Claude web, Gemini, etc.)
4. Ask AI to follow the instructions
5. AI generates content (spec.md, plan.md, etc.)
6. Copy AI's response, save to files

Method 3: File System Access (AI with file access)
1. AI automatically reads AGENTS.md
2. Ask: "Create increment for user authentication"
3. AI follows AGENTS.md workflow and command execution instructions
4. AI creates files directly

UNDERSTANDING "MANUAL":

Manual = You Orchestrate, AI Executes

Example workflow:
1. Read AGENTS.md section "Creating a Feature Increment"
2. Copy instructions to ChatGPT
3. ChatGPT generates spec.md content
4. Save content to .specweave/increments/0001-auth/spec.md
5. Repeat for plan.md, tasks.md

Manual does not mean harder - just means YOU control each step (no automation).
Benefit: Works with ANY AI tool!

COMPARISON:

Claude Code (Full): "create increment" -> Done in 30 seconds (auto)
Cursor (Semi): "create increment" -> Done in 5 minutes (reads AGENTS.md)
Copilot (Basic): Reads AGENTS.md, suggests content as you type
Generic (Manual): Copy AGENTS.md instructions to any AI (10-30 min)

Trade-off: Speed vs Compatibility
- Claude Code: Fast, but requires Claude Code CLI
- Generic: Slower, but works with EVERY AI tool (even web-based)!

WHEN TO USE:

Use Generic adapter if:
- You use ChatGPT web, Claude web, Gemini, or other AI
- You don't have access to Claude Code or Cursor
- You want maximum compatibility (works with ANYTHING)
- Simple projects where automation isn't critical

Consider alternatives if:
- You want automation -> Use Claude Code (full)
- You have CLI access -> Use Cursor (semi) or Copilot (basic)
- Large projects -> Manual workflow becomes tedious

QUICK START:

1. Open AGENTS.md
   Read the "Common Workflows" section

2. Copy workflow to your AI tool:
   - "Creating a Feature Increment" section
   - Paste into ChatGPT/Claude/Gemini

3. Follow AI's guidance:
   - AI generates spec.md content (copy & save)
   - AI generates plan.md content (copy & save)
   - AI generates tasks.md content (copy & save)

4. Use any AI tool you prefer:
   ChatGPT, Claude web, Gemini, Perplexity, etc.

DOCUMENTATION:

- AGENTS.md: Universal workflow instructions (works with any AI!)
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave using ANY AI tool!

Remember: AGENTS.md is the universal standard - it works everywhere!
    `;
  }

  /**
   * Check if Generic adapter supports plugins
   *
   * Generic has manual plugin support via AGENTS.md
   *
   * @returns boolean True
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
   * Compile and install a plugin for Generic adapter
   *
   * Appends plugin content to AGENTS.md for manual copy-paste workflows
   *
   * NEW: Injects system prompts for non-English languages
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n📦 Adding plugin to AGENTS.md: ${plugin.manifest.name}`);

    // Get language configuration for system prompt injection
    const language = await this.getLanguageConfig();
    if (language !== 'en') {
      console.log(`   🌐 Language: ${language} (system prompts will be injected)`);
    }

    if (!(await fs.pathExists(agentsMdPath))) {
      throw new Error('AGENTS.md not found. Run specweave init first.');
    }

    let agentsMd = await fs.readFile(agentsMdPath, 'utf-8');

    const pluginMarker = `<!-- Plugin: ${plugin.manifest.name} -->`;
    if (agentsMd.includes(pluginMarker)) {
      console.log(`   ℹ️  Plugin ${plugin.manifest.name} already in AGENTS.md`);
      return;
    }

    let pluginSection = `\n\n${pluginMarker}\n\n`;
    pluginSection += `# Plugin: ${plugin.manifest.name}\n\n`;
    pluginSection += `${plugin.manifest.description}\n\n`;

    if (plugin.skills.length > 0) {
      pluginSection += `## Skills\n\n`;
      for (const skill of plugin.skills) {
        const skillContent = await fs.readFile(path.join(skill.path, 'SKILL.md'), 'utf-8');
        const contentWithoutFrontmatter = skillContent.replace(/^---\n[\s\S]+?\n---\n/, '');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(contentWithoutFrontmatter, language);
        pluginSection += `### ${skill.name}\n\n${modifiedContent}\n\n`;
      }
    }

    if (plugin.agents.length > 0) {
      pluginSection += `## Agents\n\n`;
      for (const agent of plugin.agents) {
        const agentContent = await fs.readFile(path.join(agent.path, 'AGENT.md'), 'utf-8');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(agentContent, language);
        pluginSection += `### ${agent.name}\n\n${modifiedContent}\n\n`;
      }
    }

    if (plugin.commands.length > 0) {
      pluginSection += `## Workflows (Manual)\n\n`;
      for (const command of plugin.commands) {
        const commandContent = await fs.readFile(command.path, 'utf-8');
        const contentWithoutFrontmatter = commandContent.replace(/^---\n[\s\S]+?\n---\n/, '');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(contentWithoutFrontmatter, language);
        pluginSection += `### ${command.name.replace('specweave.', '')}\n\n${modifiedContent}\n\n`;
      }
    }

    pluginSection += `<!-- End Plugin: ${plugin.manifest.name} -->\n`;

    agentsMd += pluginSection;
    await fs.writeFile(agentsMdPath, agentsMd, 'utf-8');

    console.log(`   ✓ Added to AGENTS.md (copy-paste workflows)`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} available for manual use!`);
  }

  /**
   * Unload a plugin from Generic adapter
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n🗑️  Removing plugin from AGENTS.md: ${pluginName}`);

    if (!(await fs.pathExists(agentsMdPath))) {
      console.warn(`⚠️  AGENTS.md not found`);
      return;
    }

    let agentsMd = await fs.readFile(agentsMdPath, 'utf-8');

    const startMarker = `<!-- Plugin: ${pluginName} -->`;
    const endMarker = `<!-- End Plugin: ${pluginName} -->`;

    const startIndex = agentsMd.indexOf(startMarker);
    if (startIndex === -1) {
      console.warn(`⚠️  Plugin ${pluginName} not found in AGENTS.md`);
      return;
    }

    const endIndex = agentsMd.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      console.warn(`⚠️  Plugin ${pluginName} section malformed`);
      return;
    }

    agentsMd = agentsMd.slice(0, startIndex) + agentsMd.slice(endIndex + endMarker.length);
    await fs.writeFile(agentsMdPath, agentsMd, 'utf-8');

    console.log(`   ✓ Removed from AGENTS.md`);
    console.log(`\n✅ Plugin ${pluginName} removed!`);
  }

  /**
   * Get list of installed plugins for Generic adapter
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
