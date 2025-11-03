/**
 * Plugin System Type Definitions
 *
 * Defines interfaces and types for Claude Code's native plugin architecture.
 * Follows Claude's official plugin.json schema (Anthropic standards).
 *
 * @module core/types/plugin
 * @version 0.6.1
 * @see https://docs.claude.com/en/docs/claude-code/plugins
 */

/**
 * Claude Plugin Manifest - Official plugin.json format
 *
 * Loaded from .claude-plugin/plugin.json in each plugin directory.
 * Follows Claude's official schema (NOT SpecWeave custom format).
 *
 * @see https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json
 */
export interface PluginManifest {
  /** Plugin name (e.g., "specweave-github") */
  name: string;

  /** Human-readable description */
  description: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Plugin author (required by Claude) */
  author: {
    /** Author name */
    name: string;

    /** Author email (optional) */
    email?: string;

    /** Author URL (optional) */
    url?: string;
  };

  /** Plugin homepage (optional) */
  homepage?: string;

  /** Repository info (optional) */
  repository?: {
    /** Repository type (e.g., "git") */
    type: string;

    /** Repository URL */
    url: string;
  };

  /** Keywords for discoverability (optional) */
  keywords?: string[];

  /** Plugin dependencies (SpecWeave format - object with plugins array) */
  dependencies?: {
    /** List of required plugin names */
    plugins?: string[];
  };

  /** License information (SpecWeave extension) */
  license?: string;

  /** Required SpecWeave core version (SpecWeave extension) */
  specweave_core_version?: string;

  /** Components provided by plugin (SpecWeave extension) - arrays of component names */
  provides?: {
    /** List of skill names */
    skills?: string[];
    /** List of agent names */
    agents?: string[];
    /** List of command names */
    commands?: string[];
    /** List of hook names */
    hooks?: string[];
  };

  /** Nested plugins or plugin list (SpecWeave extension) */
  plugins?: string[];

  /** Auto-detection rules (SpecWeave extension) */
  auto_detect?: {
    /** File patterns to detect (e.g., ".git/config") */
    files?: string[];
    /** Package.json dependencies to check */
    packages?: string[];
    /** Environment variables to check (was env_vars) */
    env?: string[];
    /** Legacy name for env */
    env_vars?: string[];
    /** Git remotes to check (e.g., "github.com") */
    git_remotes?: string[];
    /** Legacy name for git_remotes */
    git_remote_pattern?: string;
  };

  /** Plugin triggers (SpecWeave extension) */
  triggers?: string[];

  /** Credits and acknowledgments (SpecWeave extension) */
  credits?: {
    /** Original author (was original_author) */
    author?: string;
    /** Legacy name for author */
    original_author?: string;
    /** Contributors */
    contributors?: string[];
    /** Inspiration or based on (was based_on) */
    inspiration?: string;
    /** Legacy name for inspiration */
    based_on?: string;
  };
}

/**
 * Skill - Auto-activating capability
 */
export interface Skill {
  /** Skill name (unique within plugin) */
  name: string;

  /** Path to SKILL.md file */
  path: string;

  /** Description from SKILL.md frontmatter */
  description: string;

  /** Test cases for this skill */
  testCases?: TestCase[];
}

/**
 * Agent - Specialized role with isolated context
 */
export interface Agent {
  /** Agent name (unique within plugin) */
  name: string;

  /** Path to AGENT.md file */
  path: string;

  /** System prompt from AGENT.md */
  systemPrompt: string;

  /** Agent capabilities */
  capabilities: string[];
}

/**
 * Command - Slash command (e.g., /specweave.github.sync)
 */
export interface Command {
  /** Command name (e.g., "github-sync") */
  name: string;

  /** Path to command.md file */
  path: string;

  /** Description of what the command does */
  description: string;

  /** Command prompt/template */
  prompt: string;
}

/**
 * Test Case - YAML-based test case for skills
 */
export interface TestCase {
  /** Test case ID (e.g., "TC-001") */
  id: string;

  /** Test description */
  description: string;

  /** Input for the skill */
  input: string;

  /** Expected output pattern */
  expected: string;

  /** Path to test case file */
  path: string;
}

/**
 * Plugin - Complete plugin with all components loaded
 */
export interface Plugin {
  /** Plugin manifest (metadata) */
  manifest: PluginManifest;

  /** Absolute path to plugin directory */
  path: string;

  /** Skills provided by this plugin */
  skills: Skill[];

  /** Agents provided by this plugin */
  agents: Agent[];

  /** Commands provided by this plugin */
  commands: Command[];
}

/**
 * Plugin Info - Lightweight plugin metadata (for listing)
 */
export interface PluginInfo {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Description */
  description: string;

  /** Path to plugin directory */
  path: string;

  /** Is this plugin currently enabled? */
  enabled: boolean;

  /** Skill count */
  skillCount: number;

  /** Agent count */
  agentCount: number;

  /** Command count */
  commandCount: number;
}

/**
 * Validation Result - Result of manifest validation
 */
export interface ValidationResult {
  /** Is the manifest valid? */
  valid: boolean;

  /** Validation errors (if any) */
  errors: string[];

  /** Warnings (non-fatal issues) */
  warnings: string[];
}

/**
 * Detection Result - Result of plugin auto-detection
 */
export interface DetectionResult {
  /** Detected plugin name */
  pluginName: string;

  /** Detection confidence (0-1) */
  confidence: number;

  /** Reason for detection */
  reason: string;

  /** What triggered detection (file, package, env var, etc.) */
  trigger: string;
}

/**
 * Plugin Config - User's plugin configuration
 *
 * Stored in .specweave/config.yaml
 */
export interface PluginConfig {
  /** List of enabled plugin names */
  enabled: string[];

  /** Plugin-specific settings */
  settings?: {
    [pluginName: string]: Record<string, any>;
  };
}

/**
 * Plugin Load Options - Options for loading a plugin
 */
export interface PluginLoadOptions {
  /** Force reload even if already loaded */
  force?: boolean;

  /** Skip dependency checking */
  skipDependencies?: boolean;

  /** Validate plugin integrity */
  validate?: boolean;
}

/**
 * Plugin Unload Options - Options for unloading a plugin
 */
export interface PluginUnloadOptions {
  /** Remove plugin files (vs. just marking as disabled) */
  remove?: boolean;

  /** Force unload even if other plugins depend on it */
  force?: boolean;
}

/**
 * Plugin Dependency - Dependency information
 */
export interface PluginDependency {
  /** Plugin name */
  name: string;

  /** Version requirement (e.g., ">=1.0.0") */
  version?: string;

  /** Is this dependency optional? */
  optional?: boolean;
}

/**
 * Plugin Error - Custom error for plugin operations
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public pluginName?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Plugin Manifest Validation Error
 */
export class ManifestValidationError extends PluginError {
  constructor(message: string, pluginName?: string) {
    super(message, pluginName, 'MANIFEST_INVALID');
    this.name = 'ManifestValidationError';
  }
}

/**
 * Plugin Not Found Error
 */
export class PluginNotFoundError extends PluginError {
  constructor(pluginName: string) {
    super(`Plugin '${pluginName}' not found`, pluginName, 'PLUGIN_NOT_FOUND');
    this.name = 'PluginNotFoundError';
  }
}

/**
 * Plugin Dependency Error
 */
export class PluginDependencyError extends PluginError {
  constructor(message: string, pluginName?: string) {
    super(message, pluginName, 'DEPENDENCY_ERROR');
    this.name = 'PluginDependencyError';
  }
}
