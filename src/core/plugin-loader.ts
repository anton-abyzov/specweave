/**
 * Plugin Loader - Claude Code Native
 *
 * Reads plugin directories using Claude's official plugin.json format.
 * Discovers components by scanning directory structure (not from manifest).
 *
 * @module core/plugin-loader
 * @version 0.6.1
 * @see https://docs.claude.com/en/docs/claude-code/plugins
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import type {
  Plugin,
  PluginManifest,
  Skill,
  Agent,
  Command,
  TestCase,
  ValidationResult
} from './types/plugin.js';
import {
  ManifestValidationError,
  PluginNotFoundError
} from './types/plugin.js';

/**
 * PluginLoader - Loads Claude Code plugins from filesystem
 */
export class PluginLoader {
  constructor() {
    // No schema validation - Claude's plugin.json is minimal and straightforward
  }

  /**
   * Load a plugin from directory (Claude Code native)
   *
   * @param pluginPath - Absolute path to plugin directory
   * @returns Loaded plugin with all components
   * @throws PluginNotFoundError if directory doesn't exist
   * @throws ManifestValidationError if plugin.json is invalid
   */
  async loadFromDirectory(pluginPath: string): Promise<Plugin> {
    // Verify directory exists
    if (!(await fs.pathExists(pluginPath))) {
      throw new PluginNotFoundError(path.basename(pluginPath));
    }

    // Load Claude's plugin.json
    const manifest = await this.loadManifest(pluginPath);

    // Discover components by scanning directories (NOT from manifest)
    const [skills, agents, commands] = await Promise.all([
      this.discoverSkills(pluginPath),
      this.discoverAgents(pluginPath),
      this.discoverCommands(pluginPath)
    ]);

    return {
      manifest,
      path: pluginPath,
      skills,
      agents,
      commands
    };
  }

  /**
   * Load plugin manifest from .claude-plugin/plugin.json (Claude's official format)
   *
   * @param pluginPath - Path to plugin directory
   * @returns Plugin manifest
   * @throws ManifestValidationError if plugin.json is invalid
   */
  async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const pluginJsonPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');

    // Check if plugin.json exists
    if (!(await fs.pathExists(pluginJsonPath))) {
      throw new ManifestValidationError(
        `plugin.json not found at ${pluginJsonPath}`,
        path.basename(pluginPath)
      );
    }

    // Read and parse plugin.json
    let content: any;
    try {
      content = await fs.readJSON(pluginJsonPath);
    } catch (error: any) {
      throw new ManifestValidationError(
        `Invalid JSON in plugin.json: ${error.message}`,
        path.basename(pluginPath)
      );
    }

    // Basic validation (required fields)
    const validation = this.validateManifest(content);
    if (!validation.valid) {
      throw new ManifestValidationError(
        `plugin.json validation failed:\n${validation.errors.join('\n')}`,
        path.basename(pluginPath)
      );
    }

    return content as PluginManifest;
  }

  /**
   * Validate plugin.json (simple validation, no JSON Schema)
   *
   * @param manifest - Manifest object to validate
   * @returns Validation result with errors/warnings
   */
  validateManifest(manifest: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields (Claude's official schema)
    if (!manifest.name) {
      errors.push('Missing required field: name');
    } else {
      // Validate name format (lowercase-with-hyphens)
      const validNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!validNamePattern.test(manifest.name)) {
        errors.push('Invalid plugin name format. Must be lowercase letters, numbers, and hyphens (e.g., "my-plugin")');
      }
    }
    if (!manifest.description) errors.push('Missing required field: description');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.author) errors.push('Missing required field: author');
    if (manifest.author && !manifest.author.name) {
      errors.push('Missing required field: author.name');
    }

    // Warn about old SpecWeave fields
    if (manifest.specweave_core_version) {
      warnings.push('Deprecated field: specweave_core_version (no longer used)');
    }
    if (manifest.provides) {
      warnings.push('Deprecated field: provides (components discovered by scanning)');
    }
    if (manifest.auto_detect) {
      warnings.push('Deprecated field: auto_detect (no longer used)');
    }
    if (manifest.triggers) {
      warnings.push('Deprecated field: triggers (use keywords instead)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plugin manifest (public API alias for validateManifest)
   *
   * @param manifest - Manifest object to validate
   * @returns Validation result with errors/warnings
   */
  async validate(manifest: any): Promise<ValidationResult> {
    return this.validateManifest(manifest);
  }

  /**
   * Discover skills by scanning skills/ directory
   *
   * @param pluginPath - Path to plugin directory
   * @returns Array of discovered skills
   */
  private async discoverSkills(pluginPath: string): Promise<Skill[]> {
    const skillsDir = path.join(pluginPath, 'skills');
    if (!(await fs.pathExists(skillsDir))) {
      return [];
    }

    const skills: Skill[] = [];
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (await fs.pathExists(skillMdPath)) {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const description = this.extractDescription(content);
          const testCases = await this.loadTestCases(skillPath);

          skills.push({
            name: entry.name,
            path: skillPath,
            description,
            testCases
          });
        }
      }
    }

    return skills;
  }

  /**
   * Discover agents by scanning agents/ directory
   *
   * @param pluginPath - Path to plugin directory
   * @returns Array of discovered agents
   */
  private async discoverAgents(pluginPath: string): Promise<Agent[]> {
    const agentsDir = path.join(pluginPath, 'agents');
    if (!(await fs.pathExists(agentsDir))) {
      return [];
    }

    const agents: Agent[] = [];
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const agentPath = path.join(agentsDir, entry.name);
        const agentMdPath = path.join(agentPath, 'AGENT.md');

        if (await fs.pathExists(agentMdPath)) {
          const content = await fs.readFile(agentMdPath, 'utf-8');
          const capabilities = this.extractCapabilities(content);

          agents.push({
            name: entry.name,
            path: agentPath,
            systemPrompt: content,
            capabilities
          });
        }
      }
    }

    return agents;
  }

  /**
   * Discover commands by scanning commands/ directory
   *
   * @param pluginPath - Path to plugin directory
   * @returns Array of discovered commands
   */
  private async discoverCommands(pluginPath: string): Promise<Command[]> {
    const commandsDir = path.join(pluginPath, 'commands');
    if (!(await fs.pathExists(commandsDir))) {
      return [];
    }

    const commands: Command[] = [];
    const files = await fs.readdir(commandsDir);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const commandPath = path.join(commandsDir, file);
        const content = await fs.readFile(commandPath, 'utf-8');
        const name = path.basename(file, '.md');
        const description = this.extractDescription(content);

        commands.push({
          name,
          path: commandPath,
          description,
          prompt: content
        });
      }
    }

    return commands;
  }

  /**
   * Load skills from plugin
   *
   * @param pluginPath - Path to plugin directory
   * @param skillNames - Skill names from manifest
   * @returns Array of loaded skills
   */
  private async loadSkills(pluginPath: string, skillNames: string[]): Promise<Skill[]> {
    const skills: Skill[] = [];
    const skillsDir = path.join(pluginPath, 'skills');

    for (const skillName of skillNames) {
      const skillPath = path.join(skillsDir, skillName);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      if (await fs.pathExists(skillMdPath)) {
        const content = await fs.readFile(skillMdPath, 'utf-8');
        const description = this.extractDescription(content);

        // Load test cases if they exist
        const testCases = await this.loadTestCases(skillPath);

        skills.push({
          name: skillName,
          path: skillPath,
          description,
          testCases
        });
      } else {
        console.warn(`Skill ${skillName} not found at ${skillMdPath}`);
      }
    }

    return skills;
  }

  /**
   * Load agents from plugin
   *
   * @param pluginPath - Path to plugin directory
   * @param agentNames - Agent names from manifest
   * @returns Array of loaded agents
   */
  private async loadAgents(pluginPath: string, agentNames: string[]): Promise<Agent[]> {
    const agents: Agent[] = [];
    const agentsDir = path.join(pluginPath, 'agents');

    for (const agentName of agentNames) {
      const agentPath = path.join(agentsDir, agentName);
      const agentMdPath = path.join(agentPath, 'AGENT.md');

      if (await fs.pathExists(agentMdPath)) {
        const content = await fs.readFile(agentMdPath, 'utf-8');
        const systemPrompt = content; // Full content is the system prompt
        const capabilities = this.extractCapabilities(content);

        agents.push({
          name: agentName,
          path: agentPath,
          systemPrompt,
          capabilities
        });
      } else {
        console.warn(`Agent ${agentName} not found at ${agentMdPath}`);
      }
    }

    return agents;
  }

  /**
   * Load commands from plugin
   *
   * @param pluginPath - Path to plugin directory
   * @param commandNames - Command names from manifest
   * @returns Array of loaded commands
   */
  private async loadCommands(pluginPath: string, commandNames: string[]): Promise<Command[]> {
    const commands: Command[] = [];
    const commandsDir = path.join(pluginPath, 'commands');

    for (const commandName of commandNames) {
      // Convert specweave.github.sync → github-sync.md
      const fileName = commandName.replace('specweave.', '').replace(/\./g, '-') + '.md';
      const commandPath = path.join(commandsDir, fileName);

      if (await fs.pathExists(commandPath)) {
        const content = await fs.readFile(commandPath, 'utf-8');
        const description = this.extractDescription(content);

        commands.push({
          name: commandName,
          path: commandPath,
          description,
          prompt: content
        });
      } else {
        console.warn(`Command ${commandName} not found at ${commandPath}`);
      }
    }

    return commands;
  }

  /**
   * Load test cases from skill directory
   *
   * @param skillPath - Path to skill directory
   * @returns Array of test cases
   */
  private async loadTestCases(skillPath: string): Promise<TestCase[]> {
    const testCases: TestCase[] = [];
    const testCasesDir = path.join(skillPath, 'test-cases');

    if (!(await fs.pathExists(testCasesDir))) {
      return testCases;
    }

    const files = await fs.readdir(testCasesDir);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const testCasePath = path.join(testCasesDir, file);
        // TODO: Parse YAML test case
        // For now, just record the path
        testCases.push({
          id: file.replace(/\.(yaml|yml)$/, ''),
          description: `Test case from ${file}`,
          input: '',
          expected: '',
          path: testCasePath
        });
      }
    }

    return testCases;
  }

  /**
   * Extract description from SKILL.md or AGENT.md frontmatter
   *
   * @param content - File content
   * @returns Extracted description
   */
  private extractDescription(content: string): string {
    // Extract from YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (frontmatterMatch) {
      const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
      if (descMatch) {
        return descMatch[1].trim();
      }
    }

    // Fallback: first non-empty line after frontmatter
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
        return trimmed.substring(0, 200); // Max 200 chars
      }
    }

    return 'No description available';
  }

  /**
   * Extract capabilities from agent content
   *
   * @param content - Agent file content
   * @returns Array of capability strings
   */
  private extractCapabilities(content: string): string[] {
    const capabilities: string[] = [];

    // Look for "Capabilities" or "Can do" section
    const capabilitiesMatch = content.match(/##\s*Capabilities\s*\n([\s\S]+?)(?=\n##|$)/i);
    if (capabilitiesMatch) {
      const lines = capabilitiesMatch[1].split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          capabilities.push(trimmed.substring(1).trim());
        }
      }
    }

    return capabilities;
  }

  /**
   * Verify plugin integrity
   *
   * Checks that all declared skills/agents/commands exist
   *
   * @param plugin - Plugin to verify
   * @returns True if plugin is intact
   */
  async verifyPlugin(plugin: Plugin): Promise<boolean> {
    const { manifest, skills, agents, commands } = plugin;

    // Check skills
    if (skills.length !== manifest.provides.skills.length) {
      console.warn(`Plugin ${manifest.name}: Expected ${manifest.provides.skills.length} skills, found ${skills.length}`);
      return false;
    }

    // Check agents
    if (agents.length !== manifest.provides.agents.length) {
      console.warn(`Plugin ${manifest.name}: Expected ${manifest.provides.agents.length} agents, found ${agents.length}`);
      return false;
    }

    // Check commands
    if (commands.length !== manifest.provides.commands.length) {
      console.warn(`Plugin ${manifest.name}: Expected ${manifest.provides.commands.length} commands, found ${commands.length}`);
      return false;
    }

    return true;
  }

  /**
   * Get plugin metadata (lightweight, without loading full plugin)
   *
   * @param pluginPath - Path to plugin directory
   * @returns Plugin metadata
   */
  async getMetadata(pluginPath: string): Promise<{
    name: string;
    version: string;
    description: string;
    skillCount: number;
    agentCount: number;
    commandCount: number;
  }> {
    const manifest = await this.loadManifest(pluginPath);

    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      skillCount: manifest.provides.skills.length,
      agentCount: manifest.provides.agents.length,
      commandCount: manifest.provides.commands.length
    };
  }
}
