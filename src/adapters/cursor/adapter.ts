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
import fs from 'fs-extra';
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
   * Checks for:
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
================================================================
        Cursor Adapter - Semi-Automation
================================================================

Your project is now configured for Cursor with SEMI-automation!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Standard)
  - Cursor automatically reads this file
  - Contains all workflow instructions
  - Defines agent roles (PM, Architect, etc.)
  - Defines skill capabilities (increment-planner, context-loader, etc.)
  - Project structure and templates
  - Following agents.md standard (https://agents.md/)

- @ Context Shortcuts (Quick Access)
  - @increments - Load current increment files
  - @docs - Load architecture documentation
  - @strategy - Load business specifications
  - @tests - Load test strategy and cases

- Composer Multi-File Editing
  - Create multiple files simultaneously
  - Edit across spec.md, plan.md, tasks.md

UNDERSTANDING THE DIFFERENCE:

Claude Code (Full Automation):
- Native skills (auto-activate)
- Native agents (separate context windows)
- Native hooks (auto-update docs)
- Slash commands (/inc, /do, /done)

Cursor (Semi-Automation - This Adapter):
- Reads AGENTS.md for workflow instructions
- Manual role adoption (say "act as PM")
- No hooks (manual doc updates)
- Manual workflows (follow AGENTS.md steps)

HOW CURSOR USES AGENTS.MD:

Cursor automatically reads AGENTS.md to understand:
1. Project structure (.specweave/ folders)
2. How to create increments (spec.md, plan.md, tasks.md)
3. Agent roles (PM defines WHAT/WHY, Architect designs HOW)
4. Skill workflows (increment-planner, context-loader, etc.)
5. Context manifests (70%+ token savings)
6. Templates and examples

When you say "create increment for auth":
→ Cursor reads AGENTS.md
→ Follows the workflow described there
→ Creates spec.md (adopting PM role)
→ Creates plan.md (adopting Architect role)
→ Creates tasks.md

QUICK START:

1. Open project in Cursor

2. Create your first feature:
   "Create increment for user authentication"

   Cursor will:
   - Read AGENTS.md for workflow
   - Ask clarifying questions
   - Create spec.md (acting as PM from AGENTS.md)
   - Create plan.md (acting as Architect from AGENTS.md)
   - Create tasks.md

3. Use @ shortcuts for context:
   "@increments show me the current increment"
   "@docs show me the architecture"
   "@strategy show me the business requirements"

4. Use Composer for multi-file edits:
   Cmd+I → "Update spec.md and plan.md to add OAuth2"

CONTEXT LOADING (70%+ Token Savings):

CRITICAL: Always read context-manifest.yaml first!

AGENTS.md teaches Cursor:
1. Look for .specweave/increments/####/context-manifest.yaml
2. ONLY load files listed in manifest
3. Don't load all specs (wastes tokens)

Example manifest (YAML):

spec_sections:
  - .specweave/docs/internal/strategy/auth/spec.md
documentation:
  - .specweave/docs/internal/architecture/auth-design.md

Cursor: "Only load these 2 files, not entire docs/ folder"

LIMITATIONS (vs Claude Code):

- No auto-activation (must explicitly request workflows)
- No separate context windows (all context shared)
- No hooks (can't auto-update docs on events)
- Requires manual role adoption (say "act as PM")

But still VERY good experience with Composer + @ shortcuts!

DOCUMENTATION:

- AGENTS.md: Universal workflow instructions (Cursor reads this!)
- .cursor/README.md: Cursor-specific documentation
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave on Cursor!

Pro tip: Say "act as [role]" to follow AGENTS.md patterns:
- "act as PM and create spec" (AGENTS.md defines PM role)
- "act as Architect and design system" (AGENTS.md defines Architect role)
- "act as DevOps and create infrastructure" (AGENTS.md defines DevOps role)
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
   * Compile and install a plugin for Cursor
   *
   * Cursor uses AGENTS.md compilation:
   * - Append skills to AGENTS.md
   * - Append agents to AGENTS.md
   * - Append commands to team commands JSON
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const projectPath = process.cwd();
    const agentsMdPath = path.join(projectPath, 'AGENTS.md');

    console.log(`\n📦 Compiling plugin for Cursor: ${plugin.manifest.name}`);

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
        pluginSection += `### ${skill.name}\n\n`;
        pluginSection += `${contentWithoutFrontmatter}\n\n`;
      }
    }

    // Add agents
    if (plugin.agents.length > 0) {
      pluginSection += `## Agents\n\n`;
      for (const agent of plugin.agents) {
        const agentContent = await fs.readFile(path.join(agent.path, 'AGENT.md'), 'utf-8');
        pluginSection += `### ${agent.name}\n\n`;
        pluginSection += `${agentContent}\n\n`;
      }
    }

    // Add commands
    if (plugin.commands.length > 0) {
      pluginSection += `## Commands\n\n`;
      for (const command of plugin.commands) {
        const commandContent = await fs.readFile(command.path, 'utf-8');
        // Remove frontmatter
        const contentWithoutFrontmatter = commandContent.replace(/^---\n[\s\S]+?\n---\n/, '');
        pluginSection += `### /${command.name}\n\n`;
        pluginSection += `${contentWithoutFrontmatter}\n\n`;
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
