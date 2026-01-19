/**
 * Keyword Detector for Lazy Plugin Loading
 *
 * Detects SpecWeave intent from user prompts to trigger on-demand plugin loading.
 * Implements confidence-based detection with negative patterns to avoid false positives.
 *
 * @module core/lazy-loading/keyword-detector
 */

/**
 * Result of keyword detection analysis
 */
export interface DetectionResult {
  /** Whether SpecWeave intent was detected */
  detected: boolean;
  /** Keywords that matched in the prompt */
  matchedKeywords: string[];
  /** Confidence level (0-1) */
  confidence: number;
  /** Plugins suggested based on matched keywords */
  suggestedPlugins: string[];
  /** Detection latency in milliseconds */
  latencyMs?: number;
}

/**
 * Keyword categories for SpecWeave intent detection
 */
export const SPECWEAVE_KEYWORDS = {
  /**
   * High confidence keywords - definitely SpecWeave (confidence >= 0.9)
   */
  high: [
    // Commands
    '/sw:',
    'specweave',
    'increment',
    // Files
    'spec.md',
    'tasks.md',
    'plan.md',
    'metadata.json',
    // Concepts
    'living docs',
    'living documentation',
    'acceptance criteria',
    'user story',
  ],

  /**
   * Medium confidence keywords - likely SpecWeave (confidence >= 0.6)
   */
  medium: [
    'feature planning',
    'sprint planning',
    'jira sync',
    'github sync',
    'ado sync',
    'azure devops sync',
    'auto mode',
    'tdd mode',
    'parallel auto',
    'sw:increment',
    'sw:do',
    'sw:done',
    'sw:progress',
    'sw:validate',
  ],

  /**
   * Low confidence keywords - might be SpecWeave (confidence >= 0.3)
   * Only triggers if no higher confidence matches
   */
  low: ['backlog', 'kanban', 'scrum', 'spec', 'task', 'plan', 'milestone', 'epic', 'feature'],

  /**
   * Negative patterns - definitely NOT SpecWeave intent (T-016 expanded)
   * If matched, detection returns false regardless of other matches
   * Prevents false positives from common development terminology
   */
  negative: [
    // Spec-related (not SpecWeave spec)
    'openapi spec',
    'api spec',
    'test spec',
    'spec file',
    'specification file',
    'swagger spec',
    'json schema',

    // Task-related (not SpecWeave tasks)
    'task runner',
    'gulp task',
    'npm task',
    'gradle task',
    'rake task',
    'cron task',
    'scheduled task',
    'async task',
    'celery task',

    // Plan-related (not SpecWeave plan)
    'build plan',
    'terraform plan',
    'query plan',
    'execution plan',
    'test plan',
    'project plan',
    'marketing plan',
    'business plan',

    // Reading/documentation contexts (not action intent)
    'read the release notes',
    'check the changelog',
    'look at the test',
    'review the pr',
    'read the docs',
    'see the documentation',

    // Model-related (not ML model)
    'data model',
    'database model',
    'domain model',
    'object model',
    'er model',
    'uml model',

    // Version-related (not release versioning)
    'version control',
    'git version',
    'node version',
    'python version',
    'java version',

    // Deployment status checks (not deploy action)
    'deployment status',
    'deploy status',
    'is deployed',
    'was deployed',

    // General reading/inquiry (not action)
    'what is',
    'how does',
    'explain',
    'describe',
    'tell me about',
  ],
} as const;

/**
 * Plugin group definitions for suggestion
 */
export const PLUGIN_GROUPS: Record<string, string[]> = {
  core: ['specweave'],
  github: ['specweave-github'],
  jira: ['specweave-jira'],
  ado: ['specweave-ado'],
  frontend: ['specweave-frontend'],
  backend: ['specweave-backend'],
  infra: ['specweave-infrastructure', 'specweave-k8s'],
  ml: ['specweave-ml'],
  kafka: ['specweave-kafka'],
  confluent: ['specweave-confluent'],
  mobile: ['specweave-mobile'],
  payments: ['specweave-payments'],
  release: ['specweave-release'],
  testing: ['specweave-testing'],
  diagrams: ['specweave-diagrams'],
};

/**
 * Keyword to plugin mapping for intelligent suggestions (T-015 expanded)
 */
const KEYWORD_PLUGIN_MAP: Record<string, string[]> = {
  // External tool sync
  jira: ['specweave-jira'],
  github: ['specweave-github'],
  'pull request': ['specweave-github'],
  pr: ['specweave-github'],
  'github issue': ['specweave-github'],
  'github actions': ['specweave-github'],
  ado: ['specweave-ado'],
  'azure devops': ['specweave-ado'],
  'work item': ['specweave-ado'],

  // Frontend
  frontend: ['specweave-frontend'],
  react: ['specweave-frontend'],
  vue: ['specweave-frontend'],
  angular: ['specweave-frontend'],
  svelte: ['specweave-frontend'],
  nextjs: ['specweave-frontend'],
  'next.js': ['specweave-frontend'],
  nuxt: ['specweave-frontend'],
  component: ['specweave-frontend'],
  ui: ['specweave-frontend'],
  dashboard: ['specweave-frontend'],
  css: ['specweave-frontend'],
  tailwind: ['specweave-frontend'],
  'styled-components': ['specweave-frontend'],

  // Backend
  backend: ['specweave-backend'],
  api: ['specweave-backend'],
  rest: ['specweave-backend'],
  graphql: ['specweave-backend'],
  database: ['specweave-backend'],
  sql: ['specweave-backend'],
  postgres: ['specweave-backend'],
  mongodb: ['specweave-backend'],
  redis: ['specweave-backend'],
  express: ['specweave-backend'],
  fastapi: ['specweave-backend'],
  django: ['specweave-backend'],
  nestjs: ['specweave-backend'],
  springboot: ['specweave-backend'],
  'spring boot': ['specweave-backend'],

  // Infrastructure & DevOps
  k8s: ['specweave-k8s'],
  kubernetes: ['specweave-k8s'],
  helm: ['specweave-k8s'],
  kubectl: ['specweave-k8s'],
  eks: ['specweave-k8s'],
  aks: ['specweave-k8s'],
  gke: ['specweave-k8s'],
  docker: ['specweave-infrastructure'],
  dockerfile: ['specweave-infrastructure'],
  terraform: ['specweave-infrastructure'],
  pulumi: ['specweave-infrastructure'],
  ansible: ['specweave-infrastructure'],
  deploy: ['specweave-infrastructure'],
  deployment: ['specweave-infrastructure'],
  'ci/cd': ['specweave-infrastructure'],
  cicd: ['specweave-infrastructure'],
  pipeline: ['specweave-infrastructure'],
  aws: ['specweave-infrastructure'],
  azure: ['specweave-infrastructure'],
  gcp: ['specweave-infrastructure'],

  // Messaging & Streaming
  kafka: ['specweave-kafka'],
  confluent: ['specweave-confluent'],
  'schema registry': ['specweave-confluent'],
  ksqldb: ['specweave-confluent'],
  'event streaming': ['specweave-kafka'],

  // ML/AI
  ml: ['specweave-ml'],
  'machine learning': ['specweave-ml'],
  ai: ['specweave-ml'],
  'artificial intelligence': ['specweave-ml'],
  pytorch: ['specweave-ml'],
  tensorflow: ['specweave-ml'],
  model: ['specweave-ml'],
  training: ['specweave-ml'],
  mlops: ['specweave-ml'],

  // Mobile
  mobile: ['specweave-mobile'],
  'react native': ['specweave-mobile'],
  expo: ['specweave-mobile'],
  ios: ['specweave-mobile'],
  android: ['specweave-mobile'],
  swift: ['specweave-mobile'],
  kotlin: ['specweave-mobile'],
  flutter: ['specweave-mobile'],

  // Payments
  payment: ['specweave-payments'],
  stripe: ['specweave-payments'],
  paypal: ['specweave-payments'],
  checkout: ['specweave-payments'],
  billing: ['specweave-payments'],
  subscription: ['specweave-payments'],
  invoice: ['specweave-payments'],

  // Release Management
  release: ['specweave-release'],
  changelog: ['specweave-release'],
  publish: ['specweave-release'],
  'npm publish': ['specweave-release'],
  version: ['specweave-release'],
  semver: ['specweave-release'],
  'semantic versioning': ['specweave-release'],

  // Testing
  test: ['specweave-testing'],
  testing: ['specweave-testing'],
  tdd: ['specweave-testing'],
  'test-driven': ['specweave-testing'],
  e2e: ['specweave-testing'],
  'end-to-end': ['specweave-testing'],
  playwright: ['specweave-testing'],
  cypress: ['specweave-testing'],
  vitest: ['specweave-testing'],
  jest: ['specweave-testing'],
  'unit test': ['specweave-testing'],
  'integration test': ['specweave-testing'],

  // Diagrams
  diagram: ['specweave-diagrams'],
  mermaid: ['specweave-diagrams'],
  c4: ['specweave-diagrams'],
  'architecture diagram': ['specweave-diagrams'],
  flowchart: ['specweave-diagrams'],
  sequence: ['specweave-diagrams'],
};

/**
 * Detects SpecWeave intent from a user prompt
 *
 * @param prompt - User's input prompt
 * @returns Detection result with confidence and suggested plugins
 *
 * @example
 * ```ts
 * const result = detectSpecWeaveIntent("Let's create an increment for auth");
 * // { detected: true, confidence: 0.9, matchedKeywords: ['increment'], ... }
 * ```
 */
export function detectSpecWeaveIntent(prompt: string): DetectionResult {
  const startTime = performance.now();
  const normalized = prompt.toLowerCase();
  const matchedKeywords: string[] = [];
  let confidence = 0;

  // Check negative patterns first - immediate rejection
  for (const negativePattern of SPECWEAVE_KEYWORDS.negative) {
    if (normalized.includes(negativePattern.toLowerCase())) {
      return {
        detected: false,
        matchedKeywords: [],
        confidence: 0,
        suggestedPlugins: [],
        latencyMs: performance.now() - startTime,
      };
    }
  }

  // Check high confidence keywords
  for (const keyword of SPECWEAVE_KEYWORDS.high) {
    if (normalized.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      confidence = Math.max(confidence, 0.9);
    }
  }

  // Check medium confidence keywords
  for (const keyword of SPECWEAVE_KEYWORDS.medium) {
    if (normalized.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      confidence = Math.max(confidence, 0.6);
    }
  }

  // Check low confidence keywords only if no higher matches
  if (matchedKeywords.length === 0) {
    for (const keyword of SPECWEAVE_KEYWORDS.low) {
      // For single-word low confidence keywords, ensure word boundaries
      const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      if (pattern.test(prompt)) {
        matchedKeywords.push(keyword);
        confidence = Math.max(confidence, 0.3);
      }
    }
  }

  // Boost confidence if multiple keywords matched
  if (matchedKeywords.length >= 3) {
    confidence = Math.min(confidence + 0.1, 1.0);
  }

  // Determine suggested plugins (only if detected)
  const detected = confidence >= 0.3;
  const suggestedPlugins = detected ? determinePlugins(matchedKeywords, normalized) : [];

  return {
    detected,
    matchedKeywords,
    confidence,
    suggestedPlugins,
    latencyMs: performance.now() - startTime,
  };
}

/**
 * Determines which plugins to suggest based on matched keywords
 *
 * @param keywords - Keywords matched in the prompt
 * @param normalizedPrompt - Lowercase prompt for additional checks
 * @returns Array of plugin names to suggest
 */
export function determinePlugins(keywords: string[], normalizedPrompt: string): string[] {
  const plugins = new Set<string>(['specweave']); // Always include core

  // Map keywords to plugins
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [pattern, pluginList] of Object.entries(KEYWORD_PLUGIN_MAP)) {
      if (lowerKeyword.includes(pattern)) {
        pluginList.forEach((p) => plugins.add(p));
      }
    }
  }

  // Additional context-based suggestions from prompt
  for (const [pattern, pluginList] of Object.entries(KEYWORD_PLUGIN_MAP)) {
    if (normalizedPrompt.includes(pattern)) {
      pluginList.forEach((p) => plugins.add(p));
    }
  }

  return Array.from(plugins);
}

/**
 * Gets all available plugin groups
 *
 * @returns Record of group names to plugin arrays (deep copy)
 */
export function getPluginGroups(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(PLUGIN_GROUPS)) {
    result[key] = [...value];
  }
  return result;
}

/**
 * Gets plugins for a specific group
 *
 * @param group - Group name (core, github, jira, etc.)
 * @returns Array of plugin names or empty array if group not found
 */
export function getPluginsForGroup(group: string): string[] {
  return PLUGIN_GROUPS[group.toLowerCase()] || [];
}

/**
 * Gets all available plugins across all groups
 *
 * @returns Array of all unique plugin names
 */
export function getAllPlugins(): string[] {
  const allPlugins = new Set<string>();
  for (const plugins of Object.values(PLUGIN_GROUPS)) {
    plugins.forEach((p) => allPlugins.add(p));
  }
  return Array.from(allPlugins);
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
