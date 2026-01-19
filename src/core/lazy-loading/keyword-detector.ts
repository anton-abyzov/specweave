/**
 * Keyword Detector for Lazy Plugin Loading
 *
 * Detects development intent from user prompts to trigger on-demand plugin loading.
 * Two-stage detection:
 * 1. SpecWeave-specific keywords (high confidence) - /sw:, increment, spec.md, etc.
 * 2. Domain keywords (medium confidence) - react, kubernetes, ml, etc.
 *
 * When SpecWeave is installed, ANY development task should trigger plugin loading.
 * This enables automatic expertise loading for frontend, backend, ML, infra, etc.
 *
 * Debug logging: Set SPECWEAVE_DEBUG_DETECTION=1 to enable detection logging
 * Log file: .specweave/logs/detection.log
 *
 * @module core/lazy-loading/keyword-detector
 */

import * as fs from 'fs';
import * as path from 'path';
import { trackActivation, inferDomain } from '../skills/activation-tracker.js';

/**
 * Detection logging configuration
 */
const DEBUG_DETECTION = process.env.SPECWEAVE_DEBUG_DETECTION === '1';

/**
 * Log detection event for debugging
 */
function logDetection(
  prompt: string,
  result: DetectionResult,
  details: {
    matchedDomains?: string[];
    rejectedReason?: string;
  }
): void {
  if (!DEBUG_DETECTION) return;

  const timestamp = new Date().toISOString();
  const truncatedPrompt = prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '');

  const logLines: string[] = [
    '',
    `[${timestamp}] Detection Event`,
    `─────────────────────────────────────────────────`,
    `Prompt: "${truncatedPrompt}"`,
    ``,
  ];

  if (details.rejectedReason) {
    logLines.push(`❌ REJECTED: ${details.rejectedReason}`);
  } else if (result.detected) {
    logLines.push(`✅ DETECTED (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    logLines.push(`   Keywords: [${result.matchedKeywords.join(', ')}]`);
    if (details.matchedDomains && details.matchedDomains.length > 0) {
      logLines.push(`   Domains: [${details.matchedDomains.join(', ')}]`);
    }
    if (result.suggestedPlugins.length > 0) {
      logLines.push(`   Plugins: [${result.suggestedPlugins.join(', ')}]`);
    }
  } else {
    logLines.push(`○ NOT DETECTED (confidence: ${(result.confidence * 100).toFixed(0)}%, threshold: 30%)`);
    if (result.matchedKeywords.length > 0) {
      logLines.push(`   Partial keywords: [${result.matchedKeywords.join(', ')}]`);
    }
  }

  logLines.push(`   Latency: ${result.latencyMs?.toFixed(2) || 0}ms`);
  logLines.push(`─────────────────────────────────────────────────`);

  const logEntry = logLines.join('\n');

  // Log to console in debug mode
  console.log(logEntry);

  // Also log to file
  try {
    const projectRoot = findProjectRoot();
    if (projectRoot) {
      const logDir = path.join(projectRoot, '.specweave', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logPath = path.join(logDir, 'detection.log');
      fs.appendFileSync(logPath, logEntry + '\n');
    }
  } catch {
    // Ignore logging errors
  }
}

/**
 * Find project root by looking for .specweave directory
 */
function findProjectRoot(): string | null {
  let current = process.cwd();
  while (current !== '/') {
    if (fs.existsSync(path.join(current, '.specweave'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

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
 *
 * Maps domain names to plugin arrays. Used by determinePlugins() to suggest
 * which plugins to install based on matched keywords.
 */
export const PLUGIN_GROUPS: Record<string, string[]> = {
  // Core (always loaded)
  core: ['specweave'],

  // External tool integrations
  github: ['specweave-github'],
  jira: ['specweave-jira'],
  ado: ['specweave-ado'],

  // Development domains
  frontend: ['specweave-frontend'],
  backend: ['specweave-backend'],
  testing: ['specweave-testing'],
  mobile: ['specweave-mobile'],
  ml: ['specweave-ml'],

  // Infrastructure & DevOps
  infra: ['specweave-infrastructure'],
  kubernetes: ['specweave-kubernetes'],

  // Streaming
  kafka: ['specweave-kafka'],
  confluent: ['specweave-confluent'],

  // Other specialized domains
  payments: ['specweave-payments'],
  // Note: release, diagrams, docs are now in CORE specweave plugin (v1.0.130+)
  // No separate plugins needed - sw:npm, mermaid, docs are built-in
  // Note: UI automation merged into testing plugin (v1.0.130+)
  ui: ['specweave-testing'],
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

  // Release Management - NOW IN CORE (sw:npm, sw:release)
  // No separate plugin needed - these keywords route to core specweave plugin

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

  // Diagrams - NOW IN CORE (mermaid, c4, architecture diagrams)
  // No separate plugin needed - diagram skills are built into specweave core

  // Documentation - NOW IN CORE (docs-writer, docs-updater skills)
  // No separate plugin needed - documentation skills are built into specweave core

  // UI Automation (merged into testing plugin v1.0.130+)
  'visual regression': ['specweave-testing'],
  'browser automation': ['specweave-testing'],
  puppeteer: ['specweave-testing'],
  selenium: ['specweave-testing'],
  screenshot: ['specweave-testing'],
  'ui inspection': ['specweave-testing'],
};

/**
 * Development domain keywords that trigger plugin loading (v1.0.130+)
 *
 * These keywords indicate a development task that should load specialized plugins.
 * When matched, confidence is set to 0.7 (above the 0.6 auto-install threshold).
 *
 * CRITICAL: This is what makes "Build a React dashboard" trigger plugin loading!
 */
export const DEVELOPMENT_KEYWORDS: Record<string, string[]> = {
  // Frontend Development
  frontend: [
    'react',
    'vue',
    'angular',
    'svelte',
    'nextjs',
    'next.js',
    'nuxt',
    'frontend',
    'component',
    'ui',
    'dashboard',
    'landing page',
    'responsive',
    'tailwind',
    'css',
    'styled-components',
    'spa',
    'ssr',
    'ssg',
    'design system',
    'shadcn',
    'radix',
    'chakra',
    'mui',
    'material-ui',
    'ant design',
    'bootstrap',
  ],

  // Backend Development
  backend: [
    'api',
    'rest',
    'graphql',
    'backend',
    'server',
    'database',
    'sql',
    'postgresql',
    'postgres',
    'mysql',
    'mongodb',
    'redis',
    'express',
    'fastapi',
    'django',
    'nestjs',
    'spring boot',
    'springboot',
    'dotnet',
    '.net',
    'orm',
    'prisma',
    'sequelize',
    'typeorm',
    'drizzle',
    'authentication',
    'jwt',
    'oauth',
    'microservice',
  ],

  // Testing & QA
  testing: [
    'test',
    'tests',
    'testing',
    'tdd',
    'test-driven',
    'vitest',
    'jest',
    'playwright',
    'cypress',
    'e2e',
    'end-to-end',
    'unit test',
    'integration test',
    'coverage',
    'qa',
    'quality assurance',
    'bdd',
    'behavior-driven',
    'mock',
    'stub',
    'fixture',
    'snapshot',
  ],

  // Infrastructure & DevOps
  infra: [
    'infrastructure',
    'terraform',
    'pulumi',
    'ansible',
    'docker',
    'dockerfile',
    'aws',
    'azure',
    'gcp',
    'cloud',
    'deploy',
    'deployment',
    'ci/cd',
    'cicd',
    'pipeline',
    'jenkins',
    'prometheus',
    'grafana',
    'jaeger',
    'monitoring',
    'observability',
    'sre',
    'devops',
    'serverless',
    'lambda',
    'cloudflare',
  ],

  // Kubernetes
  kubernetes: [
    'kubernetes',
    'k8s',
    'kubectl',
    'helm',
    'pod',
    'pods',
    'deployment',
    'service',
    'ingress',
    'configmap',
    'secret',
    'namespace',
    'argocd',
    'gitops',
    'flux',
    'eks',
    'aks',
    'gke',
    'minikube',
    'kind',
    'rbac',
    'networkpolicy',
  ],

  // Mobile Development
  mobile: [
    'mobile',
    'react native',
    'expo',
    'ios',
    'android',
    'swift',
    'kotlin',
    'flutter',
    'app',
    'smartphone',
    'tablet',
    'xcode',
    'android studio',
    'metro',
    'native module',
    'deep link',
  ],

  // Machine Learning & AI
  ml: [
    'ml',
    'machine learning',
    'ai',
    'artificial intelligence',
    'model',
    'training',
    'inference',
    'pytorch',
    'tensorflow',
    'keras',
    'scikit-learn',
    'mlops',
    'mlflow',
    'kubeflow',
    'sagemaker',
    'huggingface',
    'llm',
    'nlp',
    'computer vision',
    'neural network',
    'deep learning',
    'prediction',
    'classification',
    'regression',
  ],

  // Payments
  payments: [
    'payment',
    'payments',
    'stripe',
    'paypal',
    'braintree',
    'checkout',
    'billing',
    'subscription',
    'invoice',
    'pricing',
    'pci',
    'credit card',
    'refund',
    'webhook',
  ],

  // Release Management
  release: [
    'release',
    'version',
    'versioning',
    'semver',
    'semantic versioning',
    'changelog',
    'publish',
    'npm publish',
    'tag',
    'release candidate',
    'rc',
    'beta',
    'alpha',
    'stable',
  ],

  // GitHub Integration
  github: [
    'github',
    'repository',
    'repo',
    'issues',
    'issue',
    'pr',
    'pull request',
    'github actions',
    'workflow',
    'ci',
    'gha',
    'git',
    'branch',
    'merge',
    'fork',
  ],

  // Kafka & Event Streaming
  kafka: [
    'kafka',
    'event streaming',
    'messaging',
    'pub/sub',
    'producer',
    'consumer',
    'topic',
    'partition',
    'broker',
    'zookeeper',
    'kraft',
    'event-driven',
    'message queue',
    'rabbitmq',
    'pulsar',
    'confluent',
    'schema registry',
    'ksqldb',
  ],

  // Diagrams & Architecture
  diagrams: [
    'diagram',
    'mermaid',
    'c4',
    'flowchart',
    'sequence diagram',
    'er diagram',
    'architecture diagram',
    'uml',
    'plantuml',
    'd2',
    'excalidraw',
    'draw.io',
  ],

  // Documentation
  docs: [
    'documentation',
    'docusaurus',
    'readme',
    'api docs',
    'technical writing',
    'mdx',
    'storybook',
    'jsdoc',
    'typedoc',
  ],

  // JIRA
  jira: ['jira', 'epic', 'story', 'sprint', 'board', 'atlassian', 'backlog'],

  // Azure DevOps
  ado: ['azure devops', 'ado', 'work item', 'boards', 'pipelines'],
};

/**
 * Detects development intent from a user prompt
 *
 * Two-stage detection (v1.0.130+):
 * 1. SpecWeave-specific keywords (high/medium confidence) - /sw:, increment, etc.
 * 2. Development domain keywords (0.7 confidence) - react, kubernetes, ml, etc.
 *
 * When SpecWeave is installed, ANY development task should trigger plugin loading.
 * This ensures prompts like "Build a React dashboard" or "Create ML pipeline" work.
 *
 * @param prompt - User's input prompt
 * @returns Detection result with confidence and suggested plugins
 *
 * @example
 * ```ts
 * const result = detectSpecWeaveIntent("Build a React dashboard with TDD");
 * // { detected: true, confidence: 0.7, matchedKeywords: ['react', 'dashboard', 'tdd'], ... }
 * ```
 */
export function detectSpecWeaveIntent(prompt: string): DetectionResult {
  const startTime = performance.now();
  const normalized = prompt.toLowerCase();
  const matchedKeywords: string[] = [];
  const matchedDomains: string[] = [];
  let confidence = 0;

  // Check negative patterns first - immediate rejection
  for (const negativePattern of SPECWEAVE_KEYWORDS.negative) {
    if (normalized.includes(negativePattern.toLowerCase())) {
      const result: DetectionResult = {
        detected: false,
        matchedKeywords: [],
        confidence: 0,
        suggestedPlugins: [],
        latencyMs: performance.now() - startTime,
      };
      logDetection(prompt, result, { rejectedReason: `Negative pattern: "${negativePattern}"` });
      return result;
    }
  }

  // STAGE 1: Check SpecWeave-specific keywords (highest priority)

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

  // Check low confidence keywords only if no higher SpecWeave matches
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

  // STAGE 2: Check development domain keywords (v1.0.130+)
  // This is the KEY FIX: Domain keywords should trigger plugin loading!
  // Confidence 0.7 ensures auto-install (threshold is 0.6)

  for (const [domain, keywords] of Object.entries(DEVELOPMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundaries for short keywords to avoid false positives
      // e.g., "ui" shouldn't match "fruit", "ml" shouldn't match "html"
      const needsBoundary = keyword.length <= 3;
      let matched = false;

      if (needsBoundary) {
        const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
        matched = pattern.test(prompt);
      } else {
        matched = normalized.includes(keyword.toLowerCase());
      }

      if (matched) {
        // Only add if not already matched
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
        if (!matchedDomains.includes(domain)) {
          matchedDomains.push(domain);
        }
        // Domain keywords get 0.7 confidence (above 0.6 threshold)
        confidence = Math.max(confidence, 0.7);
      }
    }
  }

  // Boost confidence if multiple domains matched (multi-domain task)
  if (matchedDomains.length >= 2) {
    confidence = Math.min(confidence + 0.1, 1.0);
  }

  // Boost confidence if many keywords matched
  if (matchedKeywords.length >= 3) {
    confidence = Math.min(confidence + 0.1, 1.0);
  }

  // Determine suggested plugins
  // Changed: Now detected if ANY development keywords match (confidence >= 0.3)
  const detected = confidence >= 0.3;
  const suggestedPlugins = detected ? determinePlugins(matchedKeywords, normalized) : [];

  const result: DetectionResult = {
    detected,
    matchedKeywords,
    confidence,
    suggestedPlugins,
    latencyMs: performance.now() - startTime,
  };

  // Log detection for debugging (SPECWEAVE_DEBUG_DETECTION=1)
  logDetection(prompt, result, { matchedDomains });

  // Track activation for stop hook validation (always, not just debug mode)
  if (detected && matchedDomains.length > 0) {
    for (const domain of matchedDomains) {
      try {
        trackActivation({
          type: 'skill',
          fqn: `sw-${domain}:auto-detected`,
          domain: inferDomain(domain),
          trigger: matchedKeywords.slice(0, 3).join(', '),
          confidence,
        });
      } catch {
        // Ignore tracking errors - don't break detection
      }
    }
  }

  return result;
}

/**
 * Determines which plugins to suggest based on matched keywords
 *
 * Uses word boundaries for short patterns (<=3 chars) to avoid false positives
 * like "ai" matching inside "mermaid" or "ui" matching inside "fruit".
 *
 * @param keywords - Keywords matched in the prompt
 * @param normalizedPrompt - Lowercase prompt for additional checks
 * @returns Array of plugin names to suggest
 */
export function determinePlugins(keywords: string[], normalizedPrompt: string): string[] {
  const plugins = new Set<string>(['specweave']); // Always include core

  // Map keywords to plugins
  // Use word boundaries for short patterns to avoid "ai" matching "mermaid"
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [pattern, pluginList] of Object.entries(KEYWORD_PLUGIN_MAP)) {
      const needsBoundary = pattern.length <= 3;
      let matched = false;

      if (needsBoundary) {
        // Use word boundary regex for short patterns
        const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i');
        matched = regex.test(lowerKeyword);
      } else {
        matched = lowerKeyword.includes(pattern);
      }

      if (matched) {
        pluginList.forEach((p) => plugins.add(p));
      }
    }
  }

  // Additional context-based suggestions from prompt
  // Use word boundaries for short patterns to avoid false positives
  for (const [pattern, pluginList] of Object.entries(KEYWORD_PLUGIN_MAP)) {
    const needsBoundary = pattern.length <= 3;
    let matched = false;

    if (needsBoundary) {
      // Use word boundary regex for short patterns
      const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i');
      matched = regex.test(normalizedPrompt);
    } else {
      matched = normalizedPrompt.includes(pattern);
    }

    if (matched) {
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
