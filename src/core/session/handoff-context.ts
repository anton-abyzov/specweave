/**
 * Handoff Context Generator
 *
 * Generates context information for session handoff, enabling users
 * to continue their work in a new session after plugin installation.
 *
 * The context includes:
 * - Summary of what was accomplished
 * - Original user intent
 * - List of installed plugins
 * - Available skills from those plugins
 * - Suggested continuation prompt
 *
 * @module core/session/handoff-context
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A skill/command available from an installed plugin
 */
export interface Skill {
  /** Skill name (e.g., "/sw:increment") */
  name: string;
  /** Description of what the skill does */
  description: string;
  /** Category for grouping (e.g., "workflow", "frontend", "sync") */
  category: string;
}

/**
 * Options for generating handoff context
 */
export interface HandoffContextOptions {
  /** List of installed plugins */
  plugins: string[];
  /** Project path where plugins were installed */
  projectPath?: string;
  /** Original user intent/task */
  originalIntent?: string;
  /** User's home directory for path normalization */
  userHome?: string;
}

/**
 * Generated handoff context
 */
export interface HandoffContext {
  /** Summary of session accomplishments */
  summary: string;
  /** Original user intent */
  originalIntent?: string;
  /** List of installed plugins */
  plugins: string[];
  /** Full project path */
  projectPath?: string;
  /** Normalized path (with ~ for home) */
  normalizedPath?: string;
  /** Available skills from installed plugins */
  availableSkills: Skill[];
  /** Suggested prompt to continue in new session */
  continuationPrompt: string;
}

// ============================================================================
// Constants - Formatting
// ============================================================================

/** Width for section separators */
const SEPARATOR_WIDTH = 50;

/** Heavy separator for main sections */
const HEAVY_SEPARATOR = '='.repeat(SEPARATOR_WIDTH);

/** Light separator for subsections */
const LIGHT_SEPARATOR = '-'.repeat(SEPARATOR_WIDTH);

/** Section headers for formatted output */
const SECTION_HEADERS = {
  title: 'SESSION HANDOFF CONTEXT',
  projectPath: 'PROJECT PATH:',
  navigate: 'TO NAVIGATE:',
  originalIntent: 'ORIGINAL TASK/INTENT:',
  plugins: 'INSTALLED PLUGINS:',
  skills: 'AVAILABLE SKILLS/COMMANDS:',
  howToContinue: 'HOW TO CONTINUE:',
  suggestedPrompt: 'SUGGESTED PROMPT TO RESUME:',
} as const;

/** Instructions for continuing in new session */
const CONTINUATION_INSTRUCTIONS = [
  '1. Open a new Claude Code session',
  '2. Navigate to your project directory',
  '3. Paste this context or describe your task',
  '4. The installed plugins are now active!',
] as const;

// ============================================================================
// Constants - Plugin Skills Mapping
// ============================================================================

/**
 * Skills provided by each plugin
 *
 * This mapping provides the key skills/commands available from each
 * plugin for display in the handoff context.
 */
const PLUGIN_SKILLS: Record<string, Skill[]> = {
  'sw': [
    {
      name: '/sw:increment',
      description: 'Plan a new product increment',
      category: 'workflow',
    },
    {
      name: '/sw:do',
      description: 'Execute tasks from the current increment',
      category: 'workflow',
    },
    {
      name: '/sw:done',
      description: 'Close an increment after completion',
      category: 'workflow',
    },
    {
      name: '/sw:status',
      description: 'View all increment statuses',
      category: 'workflow',
    },
    {
      name: '/sw:progress',
      description: 'Show progress for active increments',
      category: 'workflow',
    },
  ],
  'sw-frontend': [
    {
      name: 'sw-frontend:frontend-architect',
      description: 'Frontend architecture expertise',
      category: 'frontend',
    },
    {
      name: 'sw-frontend:design-system-architect',
      description: 'Design system and component library expertise',
      category: 'frontend',
    },
    {
      name: 'sw-frontend:nextjs',
      description: 'Next.js App Router and Server Components expertise',
      category: 'frontend',
    },
  ],
  'sw-backend': [
    {
      name: 'sw-backend:database-optimizer',
      description: 'Database optimization and query tuning',
      category: 'backend',
    },
    {
      name: 'sw-backend:dotnet-backend',
      description: '.NET/C# backend development',
      category: 'backend',
    },
  ],
  'sw-github': [
    {
      name: '/sw-github:sync',
      description: 'Sync increments with GitHub issues',
      category: 'sync',
    },
  ],
  'sw-jira': [
    {
      name: '/sw-jira:sync',
      description: 'Sync increments with JIRA issues',
      category: 'sync',
    },
  ],
  'sw-ado': [
    {
      name: '/sw-ado:sync',
      description: 'Sync increments with Azure DevOps',
      category: 'sync',
    },
  ],
  'sw-payments': [
    {
      name: 'sw-payments:stripe-integration',
      description: 'Stripe payment integration',
      category: 'payments',
    },
    {
      name: 'sw-payments:paypal-integration',
      description: 'PayPal payment integration',
      category: 'payments',
    },
  ],
  'sw-k8s': [
    {
      name: 'sw-k8s:kubernetes-architect',
      description: 'Kubernetes architecture and manifests',
      category: 'infrastructure',
    },
  ],
  'sw-infra': [
    {
      name: 'sw-infra:devops',
      description: 'DevOps and infrastructure automation',
      category: 'infrastructure',
    },
    {
      name: 'sw-infra:infrastructure',
      description: 'Infrastructure as Code expertise',
      category: 'infrastructure',
    },
  ],
  'sw-testing': [
    {
      name: 'sw-testing:qa-engineer',
      description: 'QA strategy and E2E testing',
      category: 'testing',
    },
  ],
  'sw-mobile': [
    {
      name: 'sw-mobile:mobile-architect',
      description: 'Mobile app architecture',
      category: 'mobile',
    },
  ],
  'sw-ml': [
    {
      name: 'sw-ml:ml-engineer',
      description: 'Machine learning and MLOps',
      category: 'ml',
    },
    {
      name: 'sw-ml:data-scientist',
      description: 'Data analysis and notebooks',
      category: 'ml',
    },
  ],
  'sw-diagrams': [
    {
      name: 'sw-diagrams:diagrams-architect',
      description: 'Architecture diagrams with Mermaid and C4',
      category: 'documentation',
    },
  ],
  'sw-release': [
    {
      name: 'sw-release:release-manager',
      description: 'Release management and versioning',
      category: 'release',
    },
  ],
  'sw-confluent': [
    {
      name: 'sw-confluent:confluent-architect',
      description: 'Confluent Cloud and Schema Registry',
      category: 'streaming',
    },
  ],
  'sw-kafka': [
    {
      name: 'sw-kafka:kafka-architect',
      description: 'Apache Kafka event streaming',
      category: 'streaming',
    },
  ],
  'sw-router': [
    {
      name: 'sw-router',
      description: 'Smart plugin detection and routing',
      category: 'core',
    },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize a path by replacing home directory with ~
 *
 * @param projectPath - Full project path
 * @param userHome - User's home directory
 * @returns Normalized path with ~ for home
 */
function normalizePath(projectPath: string, userHome?: string): string {
  if (!userHome) {
    return projectPath;
  }
  if (projectPath.startsWith(userHome)) {
    return '~' + projectPath.slice(userHome.length);
  }
  return projectPath;
}

/**
 * Get all skills for a list of plugins
 *
 * @param plugins - List of plugin names
 * @returns Array of skills from all plugins
 */
function getSkillsForPlugins(plugins: string[]): Skill[] {
  const skills: Skill[] = [];
  for (const plugin of plugins) {
    const pluginSkills = PLUGIN_SKILLS[plugin];
    if (pluginSkills) {
      skills.push(...pluginSkills);
    }
  }
  return skills;
}

/**
 * Generate a summary based on installed plugins
 *
 * @param plugins - Installed plugins
 * @returns Summary string
 */
function generateSummary(plugins: string[]): string {
  if (plugins.length === 0) {
    return 'Session completed with no plugins installed.';
  }

  const pluginCount = plugins.length;
  const pluginWord = pluginCount === 1 ? 'plugin' : 'plugins';
  return `Installed ${pluginCount} ${pluginWord} (${plugins.join(', ')}) to enable new capabilities.`;
}

/**
 * Generate a continuation prompt based on context
 *
 * @param originalIntent - Original user intent
 * @param plugins - Installed plugins
 * @param projectPath - Project path
 * @returns Suggested continuation prompt
 */
function generateContinuationPrompt(
  originalIntent?: string,
  plugins?: string[],
  projectPath?: string
): string {
  const parts: string[] = [];

  parts.push('I want to continue working on my project.');

  if (projectPath) {
    parts.push(`The project is at: ${projectPath}`);
  }

  if (originalIntent) {
    parts.push(`My original task was: ${originalIntent}`);
  }

  if (plugins && plugins.length > 0) {
    parts.push(`I now have these plugins installed: ${plugins.join(', ')}`);
  }

  parts.push('Please help me proceed.');

  return parts.join(' ');
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate handoff context for session continuation
 *
 * Creates a structured context object containing all the information
 * needed to continue work in a new session.
 *
 * @param options - Context generation options
 * @returns Generated handoff context
 *
 * @example
 * ```typescript
 * const context = generateHandoffContext({
 *   plugins: ['sw', 'sw-frontend'],
 *   projectPath: '/path/to/project',
 *   originalIntent: 'Create React dashboard'
 * });
 * console.log(context.continuationPrompt);
 * ```
 */
export function generateHandoffContext(
  options: HandoffContextOptions
): HandoffContext {
  const { plugins, projectPath, originalIntent, userHome } = options;

  const normalizedPath = projectPath
    ? normalizePath(projectPath, userHome)
    : undefined;

  const availableSkills = getSkillsForPlugins(plugins);
  const summary = generateSummary(plugins);
  const continuationPrompt = generateContinuationPrompt(
    originalIntent,
    plugins,
    projectPath
  );

  return {
    summary,
    originalIntent,
    plugins,
    projectPath,
    normalizedPath,
    availableSkills,
    continuationPrompt,
  };
}

/**
 * Format handoff context as copy-paste ready text
 *
 * Creates a formatted text block that users can copy and paste
 * into a new session to provide context.
 *
 * @param options - Context generation options
 * @returns Formatted text ready for copy-paste
 *
 * @example
 * ```typescript
 * const text = formatHandoffText({
 *   plugins: ['sw', 'sw-frontend'],
 *   projectPath: '/path/to/project',
 *   originalIntent: 'Create React dashboard'
 * });
 * console.log(text); // Copy-paste ready context
 * ```
 */
export function formatHandoffText(options: HandoffContextOptions): string {
  const context = generateHandoffContext(options);
  const lines: string[] = [];

  // === Header ===
  lines.push(HEAVY_SEPARATOR);
  lines.push(SECTION_HEADERS.title);
  lines.push(HEAVY_SEPARATOR);
  lines.push('');

  // === Project Section ===
  if (context.projectPath) {
    lines.push(SECTION_HEADERS.projectPath);
    lines.push(`  ${context.projectPath}`);
    if (context.normalizedPath && context.normalizedPath !== context.projectPath) {
      lines.push(`  (or: ${context.normalizedPath})`);
    }
    lines.push('');
    lines.push(SECTION_HEADERS.navigate);
    lines.push(`  cd ${context.projectPath}`);
    lines.push('');
  }

  // === Original Intent Section ===
  if (context.originalIntent) {
    lines.push(SECTION_HEADERS.originalIntent);
    lines.push(`  ${context.originalIntent}`);
    lines.push('');
  }

  // === Plugins Section ===
  if (context.plugins.length > 0) {
    lines.push(SECTION_HEADERS.plugins);
    for (const plugin of context.plugins) {
      lines.push(`  - ${plugin}`);
    }
    lines.push('');
  }

  // === Available Skills Section ===
  if (context.availableSkills.length > 0) {
    lines.push(SECTION_HEADERS.skills);
    for (const skill of context.availableSkills) {
      lines.push(`  - ${skill.name}: ${skill.description}`);
    }
    lines.push('');
  }

  // === Instructions Section ===
  lines.push(LIGHT_SEPARATOR);
  lines.push(SECTION_HEADERS.howToContinue);
  CONTINUATION_INSTRUCTIONS.forEach((instruction) => {
    lines.push(`  ${instruction}`);
  });
  lines.push('');

  // === Continuation Prompt Section ===
  lines.push(SECTION_HEADERS.suggestedPrompt);
  lines.push(`  "${context.continuationPrompt}"`);
  lines.push('');

  // === Footer ===
  lines.push(HEAVY_SEPARATOR);

  return lines.join('\n');
}
