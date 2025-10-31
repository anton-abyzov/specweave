/**
 * Claude Code Adapter
 *
 * Full automation adapter for Claude Code.
 * Provides best-in-class experience with native skills, agents, hooks, and slash commands.
 *
 * This is the BASELINE adapter - all other adapters try to approximate this experience
 * within their tool's capabilities.
 */

import * as path from 'path';
import fs from 'fs-extra';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import type { Plugin } from '../../core/types/plugin.js';

export class ClaudeAdapter extends AdapterBase {
  name = 'claude';
  description = 'Claude Code adapter - Full automation with skills, agents, hooks, and slash commands';
  automationLevel = 'full' as const;

  /**
   * Detect if Claude Code is available
   *
   * Checks for:
   * - claude command in PATH
   * - Claude Code CLI installation
   */
  async detect(): Promise<boolean> {
    // Check if claude CLI exists
    const hasClaudeCLI = await this.commandExists('claude');

    // Check if .claude directory exists (already using Claude)
    const hasClaudeDir = await this.fileExists('.claude');

    return hasClaudeCLI || hasClaudeDir;
  }

  /**
   * Get files to install for Claude adapter
   *
   * Claude adapter installs:
   * - Skills to .claude/skills/ (auto-activating capabilities)
   * - Agents to .claude/agents/ (specialized roles)
   * - Commands to .claude/commands/ (slash commands)
   * - Hooks to .claude/hooks/ (auto-update mechanisms)
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: 'README.md',
        targetPath: '.claude/README.md',
        description: 'Claude adapter documentation'
      }
      // Note: Skills, agents, commands, hooks are installed via npm scripts
      // (install:skills, install:agents) - not copied here
    ];
  }

  /**
   * Install Claude adapter
   *
   * Since SpecWeave was originally built for Claude Code, the "installation"
   * is actually just ensuring the existing .claude/ structure is correct.
   *
   * Skills, agents, commands, hooks are installed separately via:
   * - npm run install:skills
   * - npm run install:agents
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Claude Code Adapter (Full Automation)\n');

    // Ensure .claude directory exists
    const claudeDir = path.join(options.projectPath, '.claude');
    await fs.ensureDir(claudeDir);

    // Create subdirectories
    await fs.ensureDir(path.join(claudeDir, 'skills'));
    await fs.ensureDir(path.join(claudeDir, 'agents'));
    await fs.ensureDir(path.join(claudeDir, 'commands'));
    await fs.ensureDir(path.join(claudeDir, 'hooks'));

    // Copy README
    await super.install(options);

    console.log('\n✨ Claude adapter structure created!');
    console.log('\n📋 Next steps:');
    console.log('   1. Install skills: npm run install:skills');
    console.log('   2. Install agents: npm run install:agents');
    console.log('   3. Skills will auto-activate when relevant');
    console.log('   4. Use slash commands: /create-increment, /review-docs, etc.');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Claude adapter
   */
  getInstructions(): string {
    return `

================================================================
      Claude Code Adapter - Full Automation
================================================================

Your project is now configured for Claude Code with FULL automation!

QUICK START:

1. Install components:
   npm run install:skills    # Install all skills
   npm run install:agents    # Install all agents

2. Create your first feature:
   Just ask Claude: "Create increment for user authentication"
   - specweave-detector skill activates automatically
   - skill-router routes to increment-planner
   - PM agent creates spec.md
   - Architect agent creates plan.md

3. Use slash commands:
   /create-increment "payment processing"
   /review-docs
   /sync-github

WHAT THIS PROVIDES:

- Skills (Auto-Activating): specweave-detector, skill-router, context-loader, increment-planner
- Agents (Specialized Roles): PM, Architect, DevOps, QA, Security, and 14 more
- Slash Commands: /specweave inc, /specweave do, /specweave validate, /specweave sync-github
- Hooks (Auto-Update): post-task-completion, pre-implementation, docs-changed

WHY CLAUDE CODE IS BEST:

Anthropic Sets Standards (MCP, Skills, Agents) that provide superior results:
- MCP Protocol: Native context management, efficient, standardized
- Skills + Agents: Proven patterns, auto-activation, role-based, separate contexts
- Native Tools: Direct file access, real-time execution
- Result: Superior accuracy, speed, and developer UX

DOCUMENTATION:

- SPECWEAVE.md: Complete development guide
- .specweave/docs/: Project documentation (5-pillar)
- src/skills/: All available skills
- src/agents/: All available agents

You're ready to build with SpecWeave on Claude Code!

For complete documentation, see: .claude/README.md
    `;
  }

  /**
   * Check if Claude adapter supports plugins
   *
   * Claude Code has FULL plugin support via native .claude/ directory
   *
   * @returns boolean Always true
   */
  supportsPlugins(): boolean {
    return true;
  }

  /**
   * Compile and install a plugin for Claude Code
   *
   * Claude uses native plugin installation:
   * - Copy skills to .claude/skills/{plugin-name}/{skill-name}/
   * - Copy agents to .claude/agents/{plugin-name}/{agent-name}/
   * - Copy commands to .claude/commands/
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const projectPath = process.cwd();
    const claudeDir = path.join(projectPath, '.claude');

    console.log(`\n📦 Installing plugin: ${plugin.manifest.name}`);

    // Ensure base directories exist
    await fs.ensureDir(path.join(claudeDir, 'skills'));
    await fs.ensureDir(path.join(claudeDir, 'agents'));
    await fs.ensureDir(path.join(claudeDir, 'commands'));

    // Install skills
    for (const skill of plugin.skills) {
      const targetPath = path.join(claudeDir, 'skills', skill.name);
      await fs.ensureDir(targetPath);

      // Copy SKILL.md
      const skillMdPath = path.join(skill.path, 'SKILL.md');
      if (await fs.pathExists(skillMdPath)) {
        await fs.copy(skillMdPath, path.join(targetPath, 'SKILL.md'));
      }

      // Copy test cases if they exist
      const testCasesDir = path.join(skill.path, 'test-cases');
      if (await fs.pathExists(testCasesDir)) {
        await fs.copy(testCasesDir, path.join(targetPath, 'test-cases'));
      }

      console.log(`   ✓ Skill: ${skill.name}`);
    }

    // Install agents
    for (const agent of plugin.agents) {
      const targetPath = path.join(claudeDir, 'agents', agent.name);
      await fs.ensureDir(targetPath);

      // Copy AGENT.md
      const agentMdPath = path.join(agent.path, 'AGENT.md');
      if (await fs.pathExists(agentMdPath)) {
        await fs.copy(agentMdPath, path.join(targetPath, 'AGENT.md'));
      }

      console.log(`   ✓ Agent: ${agent.name}`);
    }

    // Install commands
    for (const command of plugin.commands) {
      // Commands use their full name as filename
      const fileName = command.name.replace(/\./g, '-') + '.md';
      const targetPath = path.join(claudeDir, 'commands', fileName);

      if (await fs.pathExists(command.path)) {
        await fs.copy(command.path, targetPath);
      }

      console.log(`   ✓ Command: /${command.name}`);
    }

    console.log(`\n✅ Plugin ${plugin.manifest.name} installed!`);
  }

  /**
   * Unload a plugin from Claude Code
   *
   * Removes plugin files from .claude/ directory
   *
   * @param pluginName Name of plugin to unload
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const projectPath = process.cwd();
    const claudeDir = path.join(projectPath, '.claude');

    console.log(`\n🗑️  Unloading plugin: ${pluginName}`);

    // Read plugin manifest to know what to remove
    const pluginsDir = path.join(projectPath, 'src', 'plugins');
    const pluginPath = path.join(pluginsDir, pluginName);

    if (!(await fs.pathExists(pluginPath))) {
      console.warn(`⚠️  Plugin ${pluginName} not found`);
      return;
    }

    // Load plugin to get its components
    const { PluginLoader } = await import('../../core/plugin-loader.js');
    const loader = new PluginLoader();
    const plugin = await loader.loadFromDirectory(pluginPath);

    // Remove skills
    for (const skill of plugin.skills) {
      const skillPath = path.join(claudeDir, 'skills', skill.name);
      if (await fs.pathExists(skillPath)) {
        await fs.remove(skillPath);
        console.log(`   ✓ Removed skill: ${skill.name}`);
      }
    }

    // Remove agents
    for (const agent of plugin.agents) {
      const agentPath = path.join(claudeDir, 'agents', agent.name);
      if (await fs.pathExists(agentPath)) {
        await fs.remove(agentPath);
        console.log(`   ✓ Removed agent: ${agent.name}`);
      }
    }

    // Remove commands
    for (const command of plugin.commands) {
      const fileName = command.name.replace(/\./g, '-') + '.md';
      const commandPath = path.join(claudeDir, 'commands', fileName);
      if (await fs.pathExists(commandPath)) {
        await fs.remove(commandPath);
        console.log(`   ✓ Removed command: /${command.name}`);
      }
    }

    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get list of installed plugins
   *
   * Returns plugin names that are currently installed in .claude/
   *
   * @returns Array of installed plugin names
   */
  async getInstalledPlugins(): Promise<string[]> {
    const projectPath = process.cwd();
    const configPath = path.join(projectPath, '.specweave', 'config.yaml');

    if (!(await fs.pathExists(configPath))) {
      return [];
    }

    // Read config to get enabled plugins
    const yaml = await import('js-yaml');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(content) as any;

    return config.plugins?.enabled || [];
  }
}
