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
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

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

- AGENTS.md (Universal Standard)
  - Works with: GitHub Copilot, ChatGPT, Gemini, Claude web, etc.
  - Contains all workflow instructions and project structure
  - Following agents.md standard (https://agents.md/)

HOW TO USE AGENTS.MD:

Method 1: Auto-Discovery (Copilot - Recommended)
  AI reads AGENTS.md → Ask "create increment for payments" → Done!

Method 2: Copy-Paste (ChatGPT, Claude web, etc.)
  Open AGENTS.md → Copy workflow section → Paste to AI → Save output

Method 3: File System Access (AI with file access)
  AI reads AGENTS.md automatically → Ask "Create increment" → Files created

QUICK START:

1. Open AGENTS.md - read "Common Workflows" section
2. Use your AI tool: ChatGPT, Claude web, Gemini, Copilot, etc.
3. Ask AI to follow the workflow instructions
4. Save generated files to .specweave/increments/

AVAILABLE COMMANDS (in AGENTS.md):
/inc "feature" | /do | /done | /validate | /progress | /sync-docs

DOCUMENTATION:
- AGENTS.md - Workflow instructions (works with any AI!)
- .specweave/docs/ - Project documentation

Ready to build with SpecWeave using ANY AI tool!
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
