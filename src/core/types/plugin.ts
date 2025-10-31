/**
 * Plugin System Type Definitions
 *
 * Defines interfaces and types for the SpecWeave plugin architecture.
 * Plugins are modular, domain-specific extensions that enhance SpecWeave's capabilities.
 *
 * @module core/types/plugin
 * @version 0.4.0
 */

/**
 * Plugin Manifest - Metadata describing a plugin
 *
 * Loaded from .claude-plugin/manifest.json in each plugin directory.
 * Follows JSON Schema defined in src/core/schemas/plugin-manifest.schema.json
 */
export interface PluginManifest {
  /** Unique plugin name (must start with 'specweave-') */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Human-readable description (max 1024 chars) */
  description: string;

  /** Plugin author */
  author?: string;

  /** License identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;

  /** Required SpecWeave core version (e.g., ">=0.4.0") */
  specweave_core_version: string;

  /** Plugin dependencies */
  dependencies?: {
    /** Other plugins this plugin requires */
    plugins?: string[];
  };

  /** Auto-detection rules for suggesting this plugin */
  auto_detect?: {
    /** File/directory patterns to detect (e.g., "kubernetes/", ".git/") */
    files?: string[];

    /** NPM package dependencies to detect */
    packages?: string[];

    /** Environment variables to detect */
    env_vars?: string[];

    /** Git remote pattern (e.g., "github\\.com") */
    git_remote_pattern?: string;
  };

  /** What this plugin provides */
  provides: {
    /** Skill names provided by this plugin */
    skills: string[];

    /** Agent names provided by this plugin */
    agents: string[];

    /** Command names provided by this plugin */
    commands: string[];
  };

  /** Keywords that trigger plugin suggestions in specs/tasks */
  triggers?: string[];

  /** Attribution for forked/borrowed plugins */
  credits?: {
    /** Upstream source URL if forked */
    based_on?: string | null;

    /** Original author name */
    original_author?: string;

    /** List of contributors */
    contributors?: string[];

    /** Modifications made for SpecWeave */
    modifications?: string[];
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
