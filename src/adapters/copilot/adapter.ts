/**
 * GitHub Copilot Adapter
 *
 * Basic automation adapter for GitHub Copilot.
 * Compiles SpecWeave plugins to AGENTS.md (universal standard) for context and suggestions.
 *
 * This adapter compiles skills, agents, and commands into AGENTS.md format.
 */

import * as path from 'path';
import fs from 'fs-extra';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';
import { compileToAgentsMd, getSpecweaveInstallPath } from '../../utils/agents-md-compiler.js';
import { LanguageManager, getSystemPromptForLanguage } from '../../core/i18n/language-manager.js';
import type { SupportedLanguage } from '../../core/i18n/types.js';

export class CopilotAdapter extends AdapterBase {
  name = 'copilot';
  description = 'GitHub Copilot adapter - Basic automation with AGENTS.md';
  automationLevel = 'basic' as const;

  /**
   * Detect if GitHub Copilot is available
   *
   * Note: Detection is best-effort since Copilot might be installed
   * but we can't detect it reliably. This adapter is safe to use
   * as a fallback since Copilot reads AGENTS.md (universal standard).
   */
  async detect(): Promise<boolean> {
    // Always return false to make this a manual selection
    // Users can explicitly choose Copilot adapter if they want
    return false;
  }

  /**
   * Get files to install for Copilot adapter
   *
   * Note: Copilot automatically reads AGENTS.md (universal standard).
   * No additional files needed.
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Copilot adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Configuring GitHub Copilot (Basic Automation)\n');

    // 1. Create .specweave/ structure
    const specweaveDir = path.join(options.projectPath, '.specweave');
    await fs.ensureDir(specweaveDir);
    await fs.ensureDir(path.join(specweaveDir, 'increments'));
    await fs.ensureDir(path.join(specweaveDir, 'increments', '_backlog'));
    await fs.ensureDir(path.join(specweaveDir, 'docs', 'internal', 'strategy'));
    await fs.ensureDir(path.join(specweaveDir, 'docs', 'internal', 'architecture', 'adr'));
    await fs.ensureDir(path.join(specweaveDir, 'docs', 'internal', 'architecture', 'rfc'));
    await fs.ensureDir(path.join(specweaveDir, 'docs', 'internal', 'architecture', 'diagrams'));
    await fs.ensureDir(path.join(specweaveDir, 'docs', 'internal', 'delivery'));
    await fs.ensureDir(path.join(specweaveDir, 'docs', 'public', 'guides'));
    await fs.ensureDir(path.join(specweaveDir, 'logs'));

    console.log('✅ Created .specweave/ structure');

    // 2. Find SpecWeave installation
    let specweavePath: string;
    try {
      specweavePath = getSpecweaveInstallPath();
      console.log(`✅ Found SpecWeave installation at: ${specweavePath}`);
    } catch (error) {
      console.error('❌ Could not find SpecWeave installation');
      console.error('   Make sure SpecWeave is installed: npm install -g specweave');
      return;
    }

    // 3. Compile plugins to AGENTS.md
    console.log('📝 Compiling plugins to AGENTS.md...');
    const result = await compileToAgentsMd(specweavePath);

    // 4. Write AGENTS.md
    const agentsMdPath = path.join(options.projectPath, 'AGENTS.md');
    await fs.writeFile(agentsMdPath, result.agentsMd, 'utf-8');

    console.log('✅ Created AGENTS.md with:');
    console.log(`   - ${result.skills.length} skills`);
    console.log(`   - ${result.agents.length} agents`);
    console.log(`   - ${result.commands.length} commands`);

    // 5. Create .github/copilot/instructions.md (optional)
    const copilotDir = path.join(options.projectPath, '.github', 'copilot');
    await fs.ensureDir(copilotDir);

    const instructionsContent = `# GitHub Copilot Instructions

This project uses SpecWeave for spec-driven development.

## Important Context

- **AGENTS.md**: Complete workflow guide (read this first!)
- **Structure**: All work happens in \`.specweave/increments/\`
- **Workflow**: spec.md → plan.md → tasks.md → tests.md

## When Suggesting Code

- Follow patterns in AGENTS.md
- Create files in increment folders, not project root
- Reference existing specs and plans
- Follow naming conventions (kebab-case for increments)

See AGENTS.md for complete details.
`;

    await fs.writeFile(path.join(copilotDir, 'instructions.md'), instructionsContent, 'utf-8');
    console.log('✅ Created .github/copilot/instructions.md');

    console.log('\n✅ Copilot will automatically read AGENTS.md');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Copilot adapter
   */
  getInstructions(): string {
    return `
================================================================
      GitHub Copilot Adapter - Basic Automation
================================================================

Your project is now configured for GitHub Copilot!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Standard)
  - Copilot automatically reads this file
  - Contains all workflow instructions
  - Project structure and templates
  - Following agents.md standard (https://agents.md/)

- Better Code Suggestions
  - Copilot reads AGENTS.md for context
  - Suggests code following SpecWeave patterns
  - Understands project structure

UNDERSTANDING THE DIFFERENCE:

Claude Code (Full Automation):
- Native skills (auto-activate)
- Native agents (separate context windows)
- Native hooks (auto-update docs)
- Slash commands (/inc, /do, /done)

Cursor (Semi-Automation):
- Reads AGENTS.md for workflow
- @ context shortcuts
- Composer multi-file editing

Copilot (Basic Automation - This Adapter):
- Reads AGENTS.md automatically
- Better code suggestions
- No skills, agents, hooks, or commands
- Manual workflow with AI assistance

HOW COPILOT USES AGENTS.MD:

GitHub Copilot automatically reads AGENTS.md to understand:
- SpecWeave structure (.specweave/ folders)
- File naming conventions (spec.md, plan.md, tasks.md)
- Context manifests (what files to reference)
- Best practices (technology-agnostic specs, etc.)

Result: Copilot suggests code that fits SpecWeave patterns!

HOW TO USE SPECWEAVE WITH COPILOT:

1. Copilot reads AGENTS.md automatically
   - No action needed - just open project in VS Code
   - Copilot will suggest code following SpecWeave patterns

2. Create increments manually:
   mkdir -p .specweave/increments/0001-user-auth

3. Reference context manifests:
   Open context-manifest.yaml
   → Copilot sees which files are relevant
   → Provides better suggestions

4. Ask Copilot Chat for guidance:
   "How do I create a spec.md following SpecWeave?"
   "Generate plan.md for user authentication"
   "What should go in context-manifest.yaml?"

5. Use Copilot inline suggestions:
   Start typing in spec.md → Copilot suggests content
   Following SpecWeave patterns from AGENTS.md

WORKFLOW EXAMPLE:

Creating a Feature:

1. Create increment folder:
   mkdir -p .specweave/increments/0002-payments
   cd .specweave/increments/0002-payments

2. Create spec.md:
   - Open file, start typing frontmatter
   - Copilot suggests SpecWeave structure (from AGENTS.md)
   - Fill in user stories, acceptance criteria

3. Create plan.md:
   - Reference spec.md (Copilot reads it)
   - Start typing "# Technical Plan"
   - Copilot suggests architecture sections

4. Create context-manifest.yaml:
   - Copilot suggests relevant files to include
   - Lists spec sections and architecture docs

LIMITATIONS (vs Claude Code & Cursor):

- No auto-activation or workflows
- No skills, agents, hooks
- No slash commands or @ shortcuts
- No role-based assistance (PM, Architect, etc.)
- Completely manual workflow

But Copilot still provides helpful suggestions!
- Understands SpecWeave structure from AGENTS.md
- Suggests code following project patterns

DOCUMENTATION:

- AGENTS.md: Universal workflow instructions (Copilot reads this!)
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave on GitHub Copilot!

Note: For better automation, consider Claude Code (full) or Cursor (semi).
Copilot is best for simple projects or when already using VS Code + Copilot.
    `;
  }

  /**
   * Check if Copilot adapter supports plugins
   *
   * Copilot has plugin support via AGENTS.md compilation (same as Cursor)
   *
   * @returns boolean True for Copilot
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
   * Compile and install a plugin for Copilot
   *
   * Copilot uses AGENTS.md compilation (same as Cursor)
   *
   * NEW: Injects system prompts for non-English languages
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n📦 Compiling plugin for Copilot: ${plugin.manifest.name}`);

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
      console.log(`   ℹ️  Plugin ${plugin.manifest.name} already compiled to AGENTS.md`);
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
      pluginSection += `## Commands\n\n`;
      for (const command of plugin.commands) {
        const commandContent = await fs.readFile(command.path, 'utf-8');
        const contentWithoutFrontmatter = commandContent.replace(/^---\n[\s\S]+?\n---\n/, '');
        // Inject system prompt if needed
        const modifiedContent = this.injectSystemPrompt(contentWithoutFrontmatter, language);
        pluginSection += `### /${command.name}\n\n${modifiedContent}\n\n`;
      }
    }

    pluginSection += `<!-- End Plugin: ${plugin.manifest.name} -->\n`;

    agentsMd += pluginSection;
    await fs.writeFile(agentsMdPath, agentsMd, 'utf-8');

    console.log(`   ✓ Compiled to AGENTS.md`);
    console.log(`   ✓ ${plugin.skills.length} skills, ${plugin.agents.length} agents, ${plugin.commands.length} commands`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} compiled for Copilot!`);
  }

  /**
   * Unload a plugin from Copilot
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n🗑️  Unloading plugin from Copilot: ${pluginName}`);

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
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins for Copilot
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
