/**
 * Restart Warning Formatter
 *
 * Formats the session restart warning message displayed to users
 * when plugins are installed during a Claude Code session.
 *
 * The warning includes:
 * - A prominent banner indicating restart is required
 * - List of installed plugins with optional descriptions
 * - Project path for reference
 * - Clear step-by-step restart instructions
 * - Optional continuation context for the next session
 *
 * @module core/session/restart-warning
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Options for formatting the restart warning
 */
export interface RestartWarningOptions {
  /** List of plugins that were installed */
  plugins: string[];
  /** Project path where plugins were installed */
  projectPath?: string;
  /** Original user intent to include in handoff context */
  originalIntent?: string;
  /** Whether to include plugin descriptions */
  includeDescriptions?: boolean;
  /** Whether to include list of available skills */
  includeSkillsList?: boolean;
}

/**
 * Formatted restart warning output
 */
export interface RestartWarningOutput {
  /** The formatted warning text */
  text: string;
  /** List of plugins that were installed */
  plugins: string[];
  /** Project path */
  projectPath?: string;
  /** Whether execution should halt */
  shouldHalt: boolean;
}

// ============================================================================
// Constants - Visual Formatting
// ============================================================================

/** Width of banner separators */
const BANNER_WIDTH = 60;

/** Heavy separator for main banner */
const SEPARATOR = '═'.repeat(BANNER_WIDTH);

/** Light separator for subsections */
const THIN_SEPARATOR = '─'.repeat(BANNER_WIDTH);

// ============================================================================
// Constants - Text Templates
// ============================================================================

/** Banner title */
const BANNER_TITLE = '⚠️  SESSION RESTART REQUIRED';

/** Section headers */
const SECTION_HEADERS = {
  plugins: '📦 Installed Plugins:',
  location: '📁 Project Location:',
  nextSteps: '🔄 NEXT STEPS:',
  context: '📋 CONTINUATION CONTEXT (Copy & Paste to New Session)',
} as const;

/** Restart instructions */
const RESTART_INSTRUCTIONS = [
  '1. Exit this session (type "exit" or close terminal)',
  '2. Start a new Claude Code session',
  '3. Navigate to your project directory',
  '4. Continue with your task',
] as const;

// ============================================================================
// Constants - Plugin Metadata
// ============================================================================

/**
 * Known plugin descriptions for display
 */
const PLUGIN_DESCRIPTIONS: Record<string, string> = {
  'sw': 'SpecWeave Core - Spec-driven development framework',
  'frontend': 'Frontend Development - React, Vue, Next.js expertise',
  'backend': 'Backend Development - API, database, microservices',
  'sw-github': 'GitHub Integration - Issues, PRs, sync',
  'sw-jira': 'JIRA Integration - Epics, stories, sync',
  'sw-ado': 'Azure DevOps Integration - Work items, boards',
  'k8s': 'Kubernetes - K8s, Helm, GitOps',
  'infra': 'Infrastructure - Terraform, Docker, CI/CD',
  'testing': 'Testing & QA - E2E, Playwright, Vitest',
  'mobile': 'Mobile Development - React Native, iOS, Android',
  'ml': 'Machine Learning - ML, PyTorch, TensorFlow',
  'payments': 'Payments - Stripe, PayPal, checkout flows',
  'sw-diagrams': 'Diagrams - Mermaid, C4, architecture diagrams',
  'sw-release': 'Release Management - Versioning, changelog',
  'confluent': 'Confluent Cloud - Kafka, Schema Registry, ksqlDB',
  'kafka': 'Apache Kafka - Event streaming, topics',
};

/**
 * Plugin skill summaries for continuation context
 */
const PLUGIN_SKILLS: Record<string, string> = {
  'sw': '/sw:increment, /sw:do, /sw:done - Core workflow',
  'frontend': 'Frontend architecture and React expertise',
  'backend': 'Backend API and database expertise',
  'sw-github': '/sw-github:sync - GitHub issue sync',
  'sw-jira': '/sw-jira:sync - JIRA issue sync',
  'sw-ado': '/sw-ado:sync - Azure DevOps sync',
  'k8s': 'Kubernetes architecture and manifests',
  'infra': 'Infrastructure as Code and DevOps',
  'testing': 'QA strategy and E2E testing',
  'mobile': 'Mobile app development expertise',
  'ml': 'Machine learning and MLOps',
  'payments': 'Payment integration (Stripe, PayPal)',
  'sw-diagrams': 'Architecture diagrams and C4 models',
  'sw-release': 'Release management and versioning',
};

/** Default description for unknown plugins */
const DEFAULT_PLUGIN_DESCRIPTION = 'Custom plugin';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get description for a plugin
 *
 * @param plugin - Plugin name
 * @returns Description string
 */
function getPluginDescription(plugin: string): string {
  return PLUGIN_DESCRIPTIONS[plugin] || DEFAULT_PLUGIN_DESCRIPTION;
}

/**
 * Get skill summary for a plugin
 *
 * @param plugin - Plugin name
 * @returns Skill summary or undefined if not known
 */
function getPluginSkills(plugin: string): string | undefined {
  return PLUGIN_SKILLS[plugin];
}

/**
 * Format plugin list for display
 *
 * @param plugins - List of plugin names
 * @param includeDescriptions - Whether to include descriptions
 * @returns Formatted plugin list string
 */
function formatPluginList(
  plugins: string[],
  includeDescriptions: boolean
): string {
  if (plugins.length === 0) {
    return '  (no plugins)';
  }

  return plugins
    .map((plugin) => {
      if (includeDescriptions) {
        const desc = getPluginDescription(plugin);
        return `  • ${plugin} - ${desc}`;
      }
      return `  • ${plugin}`;
    })
    .join('\n');
}

/**
 * Format the continuation context section
 *
 * Creates a copy-paste friendly context block for the next session.
 *
 * @param plugins - Installed plugins
 * @param projectPath - Project path
 * @param originalIntent - Original user intent
 * @param includeSkillsList - Whether to include skills list
 * @returns Formatted context string
 */
function formatContinuationContext(
  plugins: string[],
  projectPath?: string,
  originalIntent?: string,
  includeSkillsList?: boolean
): string {
  const lines: string[] = [];

  lines.push(`\n${SECTION_HEADERS.context}`);
  lines.push(THIN_SEPARATOR);

  if (projectPath) {
    lines.push(`Project: ${projectPath}`);
  }

  if (originalIntent) {
    lines.push(`\nOriginal task: ${originalIntent}`);
  }

  lines.push(`\nPlugins installed: ${plugins.join(', ')}`);

  if (includeSkillsList && plugins.length > 0) {
    lines.push('\nAvailable skills/commands after restart:');
    plugins.forEach((plugin) => {
      const skills = getPluginSkills(plugin);
      if (skills) {
        lines.push(`  • ${skills}`);
      }
    });
  }

  lines.push('\nTo continue, start a new session and paste this context.');

  return lines.join('\n');
}

/**
 * Get the grammatically correct plugin count phrase
 *
 * @param count - Number of plugins
 * @returns Phrase like "1 plugin was" or "3 plugins were"
 */
function getPluginCountPhrase(count: number): string {
  return count === 1 ? '1 plugin was' : `${count} plugins were`;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Format the restart warning message
 *
 * Creates a formatted warning message to display when plugins were
 * installed during the current session, requiring a restart for the
 * plugins to become active.
 *
 * @param options - Formatting options
 * @returns Formatted warning output with text and metadata
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = formatRestartWarning({
 *   plugins: ['sw', 'sw-frontend'],
 *   projectPath: '/path/to/project'
 * });
 * console.log(result.text);
 *
 * // With full context for handoff
 * const detailed = formatRestartWarning({
 *   plugins: ['sw', 'sw-frontend'],
 *   projectPath: '/path/to/project',
 *   originalIntent: 'Create React dashboard with Stripe',
 *   includeDescriptions: true,
 *   includeSkillsList: true
 * });
 * ```
 */
export function formatRestartWarning(
  options: RestartWarningOptions
): RestartWarningOutput {
  const {
    plugins,
    projectPath,
    originalIntent,
    includeDescriptions = false,
    includeSkillsList = false,
  } = options;

  // Handle empty plugins case - no halt needed
  if (plugins.length === 0) {
    return {
      text: 'No plugins were installed.',
      plugins: [],
      projectPath,
      shouldHalt: false,
    };
  }

  const lines: string[] = [];

  // === Banner Section ===
  lines.push('');
  lines.push(SEPARATOR);
  lines.push(BANNER_TITLE);
  lines.push(SEPARATOR);
  lines.push('');

  // === Explanation Section ===
  const pluginPhrase = getPluginCountPhrase(plugins.length);
  lines.push(`${pluginPhrase} installed during this session.`);
  lines.push("These plugins won't be available until you restart.");
  lines.push('');

  // === Plugin List Section ===
  lines.push(SECTION_HEADERS.plugins);
  lines.push(formatPluginList(plugins, includeDescriptions));
  lines.push('');

  // === Project Location Section ===
  if (projectPath) {
    lines.push(SECTION_HEADERS.location);
    lines.push(`  ${projectPath}`);
    lines.push('');
  }

  // === Next Steps Section ===
  lines.push(THIN_SEPARATOR);
  lines.push(SECTION_HEADERS.nextSteps);
  lines.push('');
  RESTART_INSTRUCTIONS.forEach((instruction) => {
    lines.push(`  ${instruction}`);
  });
  lines.push('');

  // === Continuation Context Section (optional) ===
  if (originalIntent || includeSkillsList) {
    lines.push(
      formatContinuationContext(
        plugins,
        projectPath,
        originalIntent,
        includeSkillsList
      )
    );
  }

  // === Footer ===
  lines.push(SEPARATOR);
  lines.push('');

  return {
    text: lines.join('\n'),
    plugins,
    projectPath,
    shouldHalt: true,
  };
}
