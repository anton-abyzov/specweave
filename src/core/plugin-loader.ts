/**
 * Plugin Loader
 *
 * Reads plugin directories, validates manifests, and loads skills/agents/commands.
 * Provides plugin discovery and integrity checking.
 *
 * @module core/plugin-loader
 * @version 0.4.0
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import Ajv from 'ajv';
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

// Import JSON schema for validation
import pluginManifestSchema from './schemas/plugin-manifest.schema.json';

/**
 * PluginLoader - Loads and validates plugins from filesystem
 */
export class PluginLoader {
  private ajv: Ajv;
  private validateManifestSchema: any;

  constructor() {
    // Initialize JSON schema validator
    this.ajv = new Ajv({ allErrors: true });
    this.validateManifestSchema = this.ajv.compile(pluginManifestSchema);
  }

  /**
   * Load a plugin from directory
   *
   * @param pluginPath - Absolute path to plugin directory
   * @returns Loaded plugin with all components
   * @throws PluginNotFoundError if directory doesn't exist
   * @throws ManifestValidationError if manifest is invalid
   */
  async loadFromDirectory(pluginPath: string): Promise<Plugin> {
    // Verify directory exists
    if (!(await fs.pathExists(pluginPath))) {
      throw new PluginNotFoundError(path.basename(pluginPath));
    }

    // Load and validate manifest
    const manifest = await this.loadManifest(pluginPath);

    // Load components
    const [skills, agents, commands] = await Promise.all([
      this.loadSkills(pluginPath, manifest.provides.skills),
      this.loadAgents(pluginPath, manifest.provides.agents),
      this.loadCommands(pluginPath, manifest.provides.commands)
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
   * Load plugin manifest from .claude-plugin/manifest.json
   *
   * @param pluginPath - Path to plugin directory
   * @returns Validated plugin manifest
   * @throws ManifestValidationError if manifest is invalid
   */
  async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'manifest.json');

    // Check if manifest exists
    if (!(await fs.pathExists(manifestPath))) {
      throw new ManifestValidationError(
        `Manifest not found at ${manifestPath}`,
        path.basename(pluginPath)
      );
    }

    // Read and parse manifest
    let content: any;
    try {
      content = await fs.readJSON(manifestPath);
    } catch (error: any) {
      throw new ManifestValidationError(
        `Invalid JSON in manifest: ${error.message}`,
        path.basename(pluginPath)
      );
    }

    // Validate against schema
    const validation = this.validateManifest(content);
    if (!validation.valid) {
      throw new ManifestValidationError(
        `Manifest validation failed:\n${validation.errors.join('\n')}`,
        path.basename(pluginPath)
      );
    }

    return content as PluginManifest;
  }

  /**
   * Validate manifest against JSON schema
   *
   * @param manifest - Manifest object to validate
   * @returns Validation result with errors/warnings
   */
  validateManifest(manifest: any): ValidationResult {
    const valid = this.validateManifestSchema(manifest);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!valid && this.validateManifestSchema.errors) {
      for (const error of this.validateManifestSchema.errors) {
        errors.push(`${error.instancePath} ${error.message}`);
      }
    }

    // Additional semantic validation
    if (manifest.provides) {
      // Warn if no skills, agents, or commands provided
      if (manifest.provides.skills.length === 0 &&
          manifest.provides.agents.length === 0 &&
          manifest.provides.commands.length === 0) {
        warnings.push('Plugin provides no skills, agents, or commands');
      }
    }

    return { valid, errors, warnings };
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
