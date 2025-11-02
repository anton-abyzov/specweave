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
   * Claude Code v0.5.0+ uses native plugin loading via marketplace.
   * No file copying needed!
   */
  getFiles(): AdapterFile[] {
    return []; // No files to copy - native loading!
  }

  /**
   * Install Claude adapter
   *
   * Claude Code v0.5.0+ uses native plugin system with marketplace.
   * Installation steps:
   * 1. Create .specweave/ structure (project data)
   * 2. Show marketplace installation instructions
   * 3. User adds marketplace: /plugin marketplace add anton-abyzov/specweave
   * 4. User installs plugins: /plugin install specweave-core@specweave
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Claude Code Adapter (Native Plugin System)\n');

    // Create .specweave/ structure (project data only)
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

    console.log('\n✅ Created .specweave/ structure');
    console.log('\n📋 Next steps - Install SpecWeave plugins:');
    console.log('\n  1️⃣  Add SpecWeave marketplace:');
    console.log('     /plugin marketplace add anton-abyzov/specweave');
    console.log('\n  2️⃣  Install SpecWeave core:');
    console.log('     /plugin install specweave-core@specweave');
    console.log('\n  3️⃣  (Optional) Install GitHub plugin:');
    console.log('     /plugin install specweave-github@specweave');
    console.log('\n  4️⃣  Start using SpecWeave:');
    console.log('     /specweave.inc "create a todo app"');
    console.log('\n💡 Tip: Plugins load natively - no file copying needed!');
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
   * Check if Claude Code native plugin system is available
   *
   * Detects if /plugin commands are supported in current Claude Code version
   *
   * @returns boolean True if native plugin commands available
   */
  async supportsNativePlugins(): Promise<boolean> {
    // Check if .claude/plugins directory exists (indicates native plugin support)
    const projectPath = process.cwd();
    const nativePluginsDir = path.join(projectPath, '.claude', 'plugins');

    if (await fs.pathExists(nativePluginsDir)) {
      return true;
    }

    // Check if plugin.json format is present in any installed plugins
    const claudeDir = path.join(projectPath, '.claude');
    if (await fs.pathExists(claudeDir)) {
      const entries = await fs.readdir(claudeDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginJsonPath = path.join(claudeDir, entry.name, '.claude-plugin', 'plugin.json');
          if (await fs.pathExists(pluginJsonPath)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get installation instructions based on available plugin system
   *
   * Returns instructions for either:
   * - Native /plugin commands (if supported)
   * - SpecWeave CLI fallback (always available)
   *
   * @param pluginName Name of plugin to install
   * @returns Installation instructions
   */
  async getPluginInstallInstructions(pluginName: string): Promise<string> {
    const hasNativePlugins = await this.supportsNativePlugins();

    if (hasNativePlugins) {
      return `
Installation Options:

Option 1 (Recommended): Native Claude Code
  /plugin marketplace add specweave/marketplace
  /plugin install ${pluginName}@specweave

Option 2: SpecWeave CLI
  specweave plugin install ${pluginName}

Both methods install the same plugin - choose based on preference!
      `.trim();
    }

    return `
Installation:
  specweave plugin install ${pluginName}

Note: Native /plugin commands not detected in your Claude Code version.
Using SpecWeave CLI for plugin management.
    `.trim();
  }

  /**
   * Compile and install a plugin for Claude Code
   *
   * Claude uses native plugin installation:
   * - Copy skills to .claude/skills/{plugin-name}/{skill-name}/
   * - Copy agents to .claude/agents/{plugin-name}/{agent-name}/
   * - Copy commands to .claude/commands/
   *
   * Supports both:
   * - Native /plugin install (if Claude Code supports it)
   * - SpecWeave CLI fallback (always available)
   *
   * @param plugin Plugin to install
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const projectPath = process.cwd();
    const claudeDir = path.join(projectPath, '.claude');

    console.log(`\n📦 Installing plugin: ${plugin.manifest.name}`);

    // Check for native plugin support
    const hasNativePlugins = await this.supportsNativePlugins();
    if (hasNativePlugins) {
      console.log('   💡 Tip: You can also use native /plugin commands:');
      console.log(`      /plugin marketplace add specweave/marketplace`);
      console.log(`      /plugin install ${plugin.manifest.name.replace('specweave-', '')}@specweave`);
      console.log('');
    }

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
