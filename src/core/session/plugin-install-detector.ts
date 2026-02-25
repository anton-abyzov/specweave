/**
 * Plugin Installation Detector
 *
 * Detects when plugins are installed during a Claude Code session
 * by analyzing hook output for installation success messages.
 *
 * This module is part of the session restart warning feature that
 * notifies users when plugins are installed but not yet loaded.
 *
 * @module core/session/plugin-install-detector
 */

/**
 * Trigger types for plugin installation events
 */
export type PluginInstallTrigger = 'specweave-init' | 'claude-plugin-install' | 'manual';

/**
 * Event data for a plugin installation
 */
export interface PluginInstallEvent {
  /** ISO-8601 timestamp when installation was detected */
  timestamp: string;
  /** List of plugin names that were installed */
  plugins: string[];
  /** What triggered the installation */
  trigger: PluginInstallTrigger;
  /** Project path where plugins were installed (if known) */
  projectPath?: string;
}

/**
 * Result of plugin installation detection
 */
export interface DetectionResult {
  /** Whether plugin installation was detected */
  detected: boolean;
  /** Installation event details (only present if detected is true) */
  event?: PluginInstallEvent;
}

// ============================================================================
// Pattern Constants
// ============================================================================

/**
 * Regex pattern for checkmark-style success messages
 * Matches: "✔ sw installed", "✓ frontend installed", "✅ sw installed"
 */
const CHECKMARK_INSTALL_PATTERN = /[✔✓✅]\s+([\w-]+)\s+installed/g;

/**
 * Regex pattern for "Plugin X installed successfully" messages
 * Matches: "Plugin sw-github installed successfully"
 */
const PLUGIN_SUCCESS_PATTERN = /Plugin\s+([\w-]+)\s+installed\s+successfully/g;

/**
 * Markers that indicate specweave init triggered the installation
 */
const SPECWEAVE_INIT_MARKERS = [
  'SpecWeave Initialization',
  'specweave init',
  '🚀 SpecWeave',
];

/**
 * Markers that indicate plugin install command was used
 * (covers both legacy `claude plugin install` and `vskill install`)
 */
const CLAUDE_PLUGIN_INSTALL_MARKERS = [
  'Plugin',
  'installed successfully',
];

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Detect plugin installation from hook output
 *
 * Analyzes the output from hooks or CLI commands to detect if plugins
 * were installed during the current session.
 *
 * @param hookOutput - Raw output from hook execution or CLI command
 * @returns Detection result with event details if plugins were installed
 *
 * @example
 * ```typescript
 * const result = detectPluginInstallation('✔ sw installed');
 * if (result.detected) {
 *   console.log('Plugins installed:', result.event.plugins);
 * }
 * ```
 */
export function detectPluginInstallation(hookOutput: string): DetectionResult {
  // Handle empty or whitespace-only input
  if (!hookOutput || hookOutput.trim() === '') {
    return { detected: false };
  }

  // Parse all installed plugins from the output
  const plugins = parseInstalledPlugins(hookOutput);

  // No plugins found means no installation detected
  if (plugins.length === 0) {
    return { detected: false };
  }

  // Determine what triggered the installation
  const trigger = detectTriggerType(hookOutput);

  return {
    detected: true,
    event: {
      timestamp: new Date().toISOString(),
      plugins,
      trigger,
    },
  };
}

/**
 * Parse installed plugin names from output text
 *
 * Extracts unique plugin names from various success message formats.
 * Handles multiple checkmark styles and message formats.
 *
 * @param output - Raw output text to parse
 * @returns Array of unique plugin names found
 *
 * @example
 * ```typescript
 * const plugins = parseInstalledPlugins('✔ sw installed\n✔ frontend installed');
 * // Returns: ['sw', 'frontend']
 * ```
 */
export function parseInstalledPlugins(output: string): string[] {
  const plugins: Set<string> = new Set();

  // Extract plugins using checkmark pattern
  extractWithPattern(output, CHECKMARK_INSTALL_PATTERN, plugins);

  // Extract plugins using "Plugin X installed successfully" pattern
  extractWithPattern(output, PLUGIN_SUCCESS_PATTERN, plugins);

  return Array.from(plugins);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine the trigger type from output content
 */
function detectTriggerType(output: string): PluginInstallTrigger {
  // Check for specweave init markers
  for (const marker of SPECWEAVE_INIT_MARKERS) {
    if (output.includes(marker)) {
      return 'specweave-init';
    }
  }

  // Check for plugin install markers (need both markers)
  if (CLAUDE_PLUGIN_INSTALL_MARKERS.every(marker => output.includes(marker))) {
    return 'claude-plugin-install';
  }

  // Default to manual trigger
  return 'manual';
}

/**
 * Extract plugin names using a regex pattern and add to set
 */
function extractWithPattern(output: string, pattern: RegExp, plugins: Set<string>): void {
  // Reset regex lastIndex to ensure fresh matching
  pattern.lastIndex = 0;

  let match;
  while ((match = pattern.exec(output)) !== null) {
    if (match[1]) {
      plugins.add(match[1]);
    }
  }
}
