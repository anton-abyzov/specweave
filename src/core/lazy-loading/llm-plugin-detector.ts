/**
 * LLM-Based Plugin Detection
 *
 * Replaces unreliable grep-based keyword matching with Claude LLM calls.
 * Uses Haiku model for fast, accurate intent detection.
 *
 * Key features:
 * - Understands context ("don't use React" → no React plugin)
 * - Cross-platform execution (Windows, macOS, Linux)
 * - Graceful degradation when Claude CLI unavailable
 * - Proper error handling throughout
 *
 * @module core/lazy-loading/llm-plugin-detector
 */

import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';
import { resolveVskillPath as _resolveVskillPath, resolveSpecweaveDir as _resolveSpecweaveDir } from '../../utils/vskill-resolver.js';
import { getProjectRoot } from '../../utils/find-project-root.js';
// IMPORTANT: Use canonical Claude CLI detection from utils (handles shell functions, nvm, etc.)
import { detectClaudeCli, getCleanEnv } from '../../utils/claude-cli-detector.js';
import { getPluginScope, getScopeArgs } from '../types/plugin-scope.js';

// ============================================================
// Prompt safety constants and truncation utilities (v1.0.254)
//
// Prevents "Prompt is too long" errors by enforcing size limits
// on user prompts passed to internal Haiku calls and on the
// additionalContext injected by the UserPromptSubmit hook.
// ============================================================

/** Max chars of user prompt sent to Haiku for intent detection */
export const MAX_DETECTION_USER_PROMPT_LENGTH = 3000;

/** Max chars for the additionalContext returned from the UserPromptSubmit hook.
 * v1.0.260: Synced with hook (was 8000, reduced to 3000 to prevent prompt overflow).
 * Must match MAX_ADDITIONAL_CONTEXT_LENGTH in user-prompt-submit.sh. */
export const MAX_ADDITIONAL_CONTEXT_LENGTH = 3000;

/** Max chars of user prompt embedded in SKILL FIRST args.
 * v1.0.260: Synced with hook (was 2000, reduced to 800).
 * Note: v1.0.260 removed prompt embedding from SKILL FIRST entirely,
 * but this constant is kept for any remaining truncation use. */
export const MAX_SKILL_FIRST_PROMPT_LENGTH = 800;

/**
 * Truncate a user prompt for the detect-intent Haiku call.
 * The first N chars are sufficient for intent classification.
 */
export function truncateForDetection(prompt: string): string {
  if (prompt.length <= MAX_DETECTION_USER_PROMPT_LENGTH) return prompt;
  return prompt.substring(0, MAX_DETECTION_USER_PROMPT_LENGTH) + '... [truncated]';
}

/**
 * Truncate a user prompt for embedding in SKILL FIRST args.
 * The original prompt is already in the user message — no need to duplicate it fully.
 */
export function truncateForSkillFirstArgs(prompt: string): string {
  if (prompt.length <= MAX_SKILL_FIRST_PROMPT_LENGTH) return prompt;
  return prompt.substring(0, MAX_SKILL_FIRST_PROMPT_LENGTH) + '... [truncated — see original prompt above]';
}

/**
 * Truncate the additionalContext output from the UserPromptSubmit hook.
 * Prevents context inflation that can push the main model past limits.
 */
export function truncateAdditionalContext(context: string): string {
  if (context.length <= MAX_ADDITIONAL_CONTEXT_LENGTH) return context;
  return context.substring(0, MAX_ADDITIONAL_CONTEXT_LENGTH) + '... [context truncated for safety]';
}

/**
 * Plugin auto-load configuration from .specweave/config.json
 */
export interface PluginAutoLoadConfig {
  /** Whether auto-loading is enabled at all */
  enabled: boolean;
  /** If true, only suggest plugins without installing them */
  suggestOnly: boolean;
}

/**
 * Read plugin auto-load configuration from .specweave/config.json
 *
 * @returns Config object with enabled/suggestOnly flags
 */
export function readPluginAutoLoadConfig(): PluginAutoLoadConfig {
  // Default: enabled, not suggest-only (original behavior)
  const defaultConfig: PluginAutoLoadConfig = {
    enabled: true,
    suggestOnly: false,
  };

  // Check env var override first
  if (process.env.SPECWEAVE_DISABLE_AUTO_LOAD === '1') {
    logger.debug('[readPluginAutoLoadConfig] Auto-load disabled via SPECWEAVE_DISABLE_AUTO_LOAD=1');
    return { enabled: false, suggestOnly: true };
  }

  // Try to read from config file
  const configPath = path.join(getProjectRoot(), '.specweave', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);

      if (config.pluginAutoLoad) {
        const result = {
          enabled: config.pluginAutoLoad.enabled !== false, // default true
          suggestOnly: config.pluginAutoLoad.suggestOnly === true, // default false
        };
        logger.debug(`[readPluginAutoLoadConfig] Config: enabled=${result.enabled}, suggestOnly=${result.suggestOnly}`);
        return result;
      }
    }
  } catch (error) {
    logger.debug(`[readPluginAutoLoadConfig] Error reading config: ${error}`);
  }

  return defaultConfig;
}

/**
 * Plugins that remain in specweave marketplace (installed locally)
 *
 * IMPORTANT: Plugin names use marketplace short names `sw-*` (not directory names `specweave-*`)
 * This matches the plugin names in marketplace.json and what `claude plugin install` expects.
 *
 * Note: Release, diagrams, and docs are now merged into CORE sw plugin (v1.0.130+)
 * - sw:npm, sw:release skills are built-in
 * - mermaid, c4, architecture diagram skills are built-in
 * - docs-writer, docs-updater skills are built-in
 *
 * v2.1.0: Domain skills live in vskill marketplace as per-category plugins.
 * Only workflow/integration plugins remain here.
 */
export const SPECWEAVE_PLUGINS = [
  'sw',            // Core workflow
  'sw-github',     // GitHub integration
  'sw-jira',       // JIRA integration
  'sw-ado',        // Azure DevOps
  'sw-release',    // Release management
  'sw-diagrams',   // Diagrams
  'sw-docs',       // SpecWeave docs
  'sw-media',      // AI image/video generation
] as const;

/**
 * Domain skill plugins in the vskill marketplace.
 *
 * Each category is a standalone plugin (e.g., `frontend@vskill`, `backend@vskill`).
 * Skills are invoked as `plugin:skill` (e.g., `frontend:nextjs`, `backend:dotnet`).
 *
 * v2.1.0: Split from monolithic `vs` plugin into per-category plugins for granularity.
 */
export const VSKILL_PLUGINS = [
  'frontend',        // React, Vue, Angular, Next.js, UI components
  'backend',         // Node.js, Express, NestJS, APIs, databases
  'testing',         // Jest, Vitest, Playwright, E2E, unit tests
  'mobile',          // React Native, iOS, Android, Expo
  'infra',           // Terraform, AWS, Azure, GCP, Docker, CI/CD
  'k8s',             // K8s, Helm, pods, deployments, EKS/AKS/GKE
  'payments',        // Stripe, PayPal, checkout
  'ml',              // Machine learning, PyTorch, TensorFlow
  'kafka',           // Apache Kafka, event streaming, n8n
  'confluent',       // Confluent Cloud, Schema Registry, ksqlDB
  'cost',            // Cloud cost optimization
  'docs',            // Extended documentation
  'security',        // Security scanning and hardening
  'skills',          // Skill discovery — find and install skills
  'blockchain',      // Web3, Solidity, smart contracts
] as const;

/** @deprecated Use VSKILL_PLUGINS */
export const VSKILL_CATEGORIES = VSKILL_PLUGINS;

export type SpecWeavePlugin = (typeof SPECWEAVE_PLUGINS)[number];
export type VskillPlugin = (typeof VSKILL_PLUGINS)[number];
/** @deprecated Use VskillPlugin */
export type VskillCategory = VskillPlugin;

/**
 * Combined list of all known plugins for validation.
 * Includes specweave plugins and vskill marketplace plugins.
 */
export const ALL_KNOWN_PLUGINS = [...SPECWEAVE_PLUGINS, ...VSKILL_PLUGINS] as const;
export type KnownPlugin = SpecWeavePlugin | VskillPlugin;

/**
 * All valid plugins — specweave plugins and vskill plugins.
 */
export const ALL_VALID_PLUGINS = ALL_KNOWN_PLUGINS;
export type ValidPlugin = KnownPlugin;

/**
 * Check if a plugin is a SpecWeave plugin (installed from local specweave marketplace)
 */
export function isSpecWeavePlugin(plugin: string): plugin is SpecWeavePlugin {
  return SPECWEAVE_PLUGINS.includes(plugin as SpecWeavePlugin);
}

/**
 * Check if a plugin is a vskill marketplace plugin.
 */
export function isVskillPlugin(plugin: string): plugin is VskillPlugin {
  return VSKILL_PLUGINS.includes(plugin as VskillPlugin);
}

/**
 * Check if a plugin is any known plugin (specweave or vskill).
 */
export function isKnownPlugin(plugin: string): plugin is KnownPlugin {
  return (ALL_KNOWN_PLUGINS as readonly string[]).includes(plugin);
}

/**
 * Get the marketplace name for a plugin.
 * Returns 'specweave' for sw-* plugins, 'vskill' for domain skills.
 */
export function getPluginMarketplace(plugin: string): string {
  if (isVskillPlugin(plugin)) {
    return 'vskill';
  }
  return 'specweave';
}

/**
 * Result of Claude CLI availability check
 */
export interface ClaudeCliStatus {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
}

/**
 * Increment recommendation action types
 *
 * - 'new': User should create a new increment (feature work, multi-file changes)
 * - 'reopen': User should reopen an existing increment (related fix, continuation)
 * - 'small_fix': No increment needed (typo, config tweak, single-line fix)
 * - 'hotfix': Urgent production bug (creates increment with --type=hotfix)
 * - 'none': No recommendation (question, general chat, unclear intent)
 */
export type IncrementAction = 'new' | 'reopen' | 'small_fix' | 'hotfix' | 'none';

/**
 * Increment recommendation from LLM analysis
 */
export interface IncrementRecommendation {
  /** Recommended action */
  action: IncrementAction;

  /** Confidence score (0-1) for this recommendation */
  confidence: number;

  /** Whether increment creation is MANDATORY (LLM decides, not config) */
  mandatory: boolean;

  /** Suggested increment name (for 'new' action) */
  suggestedName?: string;

  /** Related increment ID pattern (for 'reopen' action, e.g., "login", "auth") */
  relatedKeyword?: string;

  /** Brief explanation of why this action is recommended */
  reasoning: string;
}

/**
 * Context about an active increment for LLM reopen detection
 */
export interface ActiveIncrementContext {
  id: string;
  name: string;
  type: string;
  status: string;
}

/**
 * When to invoke a skill in the workflow
 *
 * - 'immediate': Invoke right away (simple tasks, no increment needed)
 * - 'after_increment': Create increment first, then invoke
 * - 'after_planning': Use plan mode first, get approval, then invoke
 * - 'with_primary': Invoke alongside primary skill (parallel)
 * - 'after_primary': Invoke after primary skill completes (sequential)
 */
export type SkillInvokeTiming =
  | 'immediate'
  | 'after_increment'
  | 'after_planning'
  | 'with_primary'
  | 'after_primary';

/**
 * Priority level for skills
 *
 * - 'primary': Main skill for the task (only one)
 * - 'secondary': Supporting skill (can be multiple)
 */
export type SkillPriority = 'primary' | 'secondary';

/**
 * Information about a skill to invoke
 */
export interface SkillInfo {
  /** Skill name (e.g., "architect", "nextjs") */
  name: string;

  /** Plugin that provides this skill (e.g., "frontend", "backend", "sw-github") */
  plugin: string;

  /** Full qualified name for invocation (e.g., "frontend:architect", "backend:dotnet") */
  fullName: string;

  /** Priority level */
  priority: SkillPriority;

  /** When to invoke this skill in the workflow */
  invokeWhen: SkillInvokeTiming;

  /** Brief reason why this skill is recommended */
  reason: string;
}

/**
 * Workflow information for skill orchestration
 */
export interface WorkflowInfo {
  /** Whether to suggest entering plan mode first */
  suggestPlanMode: boolean;

  /** Ordered phases of the workflow */
  phases: string[];
}

/**
 * Skill routing recommendation from LLM analysis
 */
export interface SkillRouting {
  /** Skills to invoke, in priority order */
  skills: SkillInfo[];

  /** Workflow information */
  workflow: WorkflowInfo;

  /** Confidence score (0-1) for routing decision */
  confidence: number;

  /** Brief explanation of routing decision */
  reasoning: string;
}

/**
 * Skill invocation recommendation from LLM analysis (v1.0.168)
 *
 * Tells Claude which skill to invoke for the task
 * NOTE: LSP plugins (csharp-lsp, typescript-lsp) are NOT skills - they work automatically!
 */
export interface SkillInvocation {
  /** Full skill name (e.g., "ml:engineer", "payments:payment-core") */
  skill: string;

  /** Why this skill should be used */
  reason: string;

  /** Whether Claude MUST use this skill */
  mandatory: boolean;
}

/**
 * LSP operation types for code intelligence
 */
export type LspOperation = 'references' | 'definition' | 'hover' | 'symbols' | null;

/**
 * Supported languages for LSP operations
 */
export type LspLanguage = 'typescript' | 'python' | 'rust' | 'go' | 'csharp' | 'java' | null;

/**
 * LSP recommendation from LLM analysis (v1.0.198+)
 *
 * Part of unified intent detection - LLM decides if LSP operations are needed
 * for the current prompt, eliminating the need for separate LSP detection.
 */
export interface LspRecommendation {
  /** Whether LSP operation is needed for this prompt */
  needed: boolean;

  /** The specific LSP operation to perform */
  operation: LspOperation;

  /** The detected programming language (for server selection) */
  language: LspLanguage;

  /** Whether workspace warm-up is required before the operation */
  warmupRequired: boolean;
}

/**
 * Result of LLM-based plugin detection
 *
 * v1.0.159: plugins now includes both SpecWeave (sw-*) and official plugins
 * v1.0.198: Added lsp field for unified LSP detection
 */
export interface LLMDetectionResult {
  success: boolean;
  plugins: ValidPlugin[];
  confidence: number;
  reasoning?: string;
  error?: string;
  durationMs: number;

  /** Increment recommendation (v1.0.141+) */
  increment?: IncrementRecommendation;

  /** Skill routing recommendation (v1.0.150+) */
  routing?: SkillRouting;

  /** Skill invocation recommendation (v1.0.168) */
  skillInvocation?: SkillInvocation;

  /** LSP operation recommendation (v1.0.198+) */
  lsp?: LspRecommendation;
}

/**
 * Result of plugin installation via CLI
 */
export interface PluginInstallResult {
  success: boolean;
  plugin: string;
  error?: string;
  alreadyInstalled?: boolean;
}

// Cache the CLI detection result for performance (detect once per process)
let cachedCliStatus: ReturnType<typeof detectClaudeCli> | null = null;

/**
 * Clear the cached CLI status (useful for testing)
 */
export function clearCliCache(): void {
  cachedCliStatus = null;
}

/**
 * Get the current CLI detection status (for debugging/testing)
 */
export function getCliStatus(): ReturnType<typeof detectClaudeCli> | null {
  return cachedCliStatus;
}

/**
 * Check if Claude CLI is available
 *
 * REFACTORED: Uses canonical implementation from utils/claude-cli-detector.ts
 * which handles all edge cases:
 * - Binary in PATH
 * - Shell functions in .zshrc/.bashrc
 * - Shell aliases
 * - npm global paths (including nvm versions)
 *
 * Also populates the cache for use by executeClaudeCli().
 *
 * @returns Status object with availability and path info
 */
export function isClaudeCliAvailable(): ClaudeCliStatus {
  // Use cached result if available
  if (cachedCliStatus) {
    const result = {
      available: cachedCliStatus.available,
      path: cachedCliStatus.commandPath,
      version: cachedCliStatus.version,
      error: cachedCliStatus.available ? undefined : cachedCliStatus.errorMessage,
    };

    // Log when returning cached unavailable status (helps debug stale cache issues)
    if (!result.available) {
      logger.debug(`[isClaudeCliAvailable] Returning CACHED unavailable status: error=${cachedCliStatus.error}, errorMessage=${cachedCliStatus.errorMessage}, exitCode=${cachedCliStatus.exitCode}, platform=${cachedCliStatus.platform}`);
    }

    return result;
  }

  // Detect and cache
  logger.debug('[isClaudeCliAvailable] Running fresh detection (no cache)...');
  const canonicalStatus = detectClaudeCli();
  cachedCliStatus = canonicalStatus;

  // Log full detection result for debugging
  if (!canonicalStatus.available) {
    const debugInfo = [
      `error=${canonicalStatus.error}`,
      `errorMessage=${canonicalStatus.errorMessage}`,
      `commandExists=${canonicalStatus.commandExists}`,
      `pluginCommandsWork=${canonicalStatus.pluginCommandsWork}`,
      `exitCode=${canonicalStatus.exitCode}`,
      `platform=${canonicalStatus.platform}`,
      `detectionMethod=${canonicalStatus.detectionMethod}`,
      canonicalStatus.debugStdout ? `stdout=${canonicalStatus.debugStdout.substring(0, 100)}` : null,
      canonicalStatus.debugStderr ? `stderr=${canonicalStatus.debugStderr.substring(0, 100)}` : null,
    ].filter(Boolean).join(', ');
    logger.warn(`[isClaudeCliAvailable] Claude CLI NOT available: ${debugInfo}`);
  } else {
    logger.debug(`[isClaudeCliAvailable] Claude CLI available: version=${canonicalStatus.version}, path=${canonicalStatus.commandPath}, method=${canonicalStatus.detectionMethod}`);
  }

  // Map to our simpler interface
  return {
    available: canonicalStatus.available,
    path: canonicalStatus.commandPath,
    version: canonicalStatus.version,
    error: canonicalStatus.available ? undefined : canonicalStatus.errorMessage,
  };
}

/**
 * Build the system prompt for plugin detection, increment recommendation, and skill routing
 *
 * v1.0.155: MINIMAL detection - only detect technologies EXPLICITLY mentioned in the prompt
 */
function buildDetectionPrompt(): string {
  return `You detect which plugins to load based on the user's prompt.
Return specweave (sw-*) or vskill domain plugin names.

DETECTION RULES:
1. EXPLICIT tech - user says "React" → frontend, ".NET" → backend
2. IMPLIED - "dashboard" needs API → backend
3. Questions/discussions → ZERO plugins
4. ONLY suggest @specweave plugins (sw-*) for workflow/integrations, or vskill plugins for domain skills

OUTPUT FORMAT (JSON only):
{"plugins":["frontend"],"confidence":0.9,"reasoning":"one-line"}

═══════════════════════════════════════════════════════════════
PLUGINS - Use specweave (sw-*) or vskill domain plugin names
═══════════════════════════════════════════════════════════════

frontend: React, Vue, Angular, Next.js, Svelte, UI, dashboard, components, Tailwind
backend: API, REST, GraphQL, .NET, C#, Node.js, Express, FastAPI, Django, Spring Boot, Go, PostgreSQL, MongoDB
payments: Stripe, PayPal, checkout, billing, subscriptions
testing: test, testing, unit test, integration test, coverage, TDD, Jest, Vitest, Playwright, Cypress, E2E, QA, test strategy, code coverage, test automation
infra: Terraform, Docker, AWS, CI/CD, CloudFormation (ONLY if explicit)
k8s: Kubernetes, Helm, EKS, AKS, GKE (ONLY if explicit)
mobile: React Native, iOS, Android, Expo, Flutter (ONLY if explicit)
ml: ML, PyTorch, TensorFlow, LLM, MLOps (ONLY if explicit)
kafka: Kafka, event streaming, MSK (ONLY if explicit)
confluent: Confluent Cloud, Schema Registry, ksqlDB (ONLY if explicit)
scout: find skill, discover skill, what skills available, search registry, install a skill, recommend skills, browse skills, vskill, skill for, which skill, explore skills (ONLY if asking about finding/discovering skills — NOT for domain work)
sw-media: AI image generation, AI video generation, Remotion, text-to-image, text-to-video, Imagen, Veo, generate image, generate video, create video, media generation, Pollinations (ONLY if explicit)
sw-github: GitHub issues, PRs, Actions, sync
sw-jira: JIRA, Atlassian (ONLY if explicit)
sw-ado: Azure DevOps, work items (ONLY if explicit)

═══════════════════════════════════════════════════════════════
INCREMENT RECOMMENDATION (v1.0.241 - DEFAULT: create increment)
═══════════════════════════════════════════════════════════════

ALSO analyze if user should create/reopen a SpecWeave increment.

⚠️ CRITICAL PRINCIPLE: Almost ALL implementation work should be tracked in an increment.
The DEFAULT is to recommend an increment (~95% of prompts that involve code changes).
Only skip for pure questions, greetings, exploration, or explicit user opt-out.

"increment" field with:
- action: "new" | "reopen" | "small_fix" | "hotfix" | "none"
- confidence: 0.0-1.0
- mandatory: true/false (YOU decide - not config-based!)
- suggestedName: kebab-case name (for "new" and "small_fix"). MUST be descriptive and actionable.
  For vague prompts, extract the CORE intent: "it's broken" → "fix-[feature]", "not working" → "fix-[feature]",
  "we need to improve X" → "improve-x", "the database is slow" → "fix-database-performance"
- reasoning: brief explanation

WHEN TO USE EACH ACTION:
┌─────────────┬─────────────────────────────────────────────────────────────┐
│ new         │ ANY feature, bug fix, refactoring, enhancement, or         │
│             │ implementation work that changes code behavior              │
│ hotfix      │ "urgent", "production bug", "critical fix"                 │
│ reopen      │ "fix the X feature", work related to recent increment      │
│ small_fix   │ ONLY: literal typo fix, version bump, single config value  │
│             │ change, comment update — truly trivial, <5 min changes     │
│ none        │ ONLY: pure questions ("what is X?"), exploration ("show me"),│
│             │ general chat, greetings, or explicit user opt-out.          │
│             │ NEVER use "none" for: "fix this", "it's broken",           │
│             │ "not working", "improve X", "change Y", "investigate",     │
│             │ "debug", "troubleshoot", "optimize", "secure", "audit",    │
│             │ "why does X fail/break", "think hard on why",              │
│             │ "solve", "resolve", "analyze" — these are work!            │
└─────────────┴─────────────────────────────────────────────────────────────┘

⚠️ IMPORTANT: When in doubt between "new" and "small_fix", ALWAYS choose "new".
Bug fixes, refactoring, adding error handling, improving validation, updating
tests, fixing logic errors — these are ALL "new", NOT "small_fix".
"small_fix" is ONLY for changes where you literally change 1-2 lines with zero
investigation needed (typo, version string, config value).

⚠️ INVESTIGATION/DEBUGGING/ANALYSIS: Prompts containing "investigate", "debug",
"troubleshoot", "diagnose", "trace", "profile", "root cause", "analyze", "audit",
"optimize", "improve", "secure", "harden", "solve", "resolve" are ALWAYS "new"
(NEVER "none"). Investigation across multiple components is implementation work
that needs increment tracking. "why does X fail" = work, NOT a question.

WHEN mandatory: true (Claude MUST create increment before implementing):
- Multi-file feature work (React + API + Database)
- Full-stack implementation requests
- New feature spanning multiple components
- Significant architectural changes
- confidence >= 0.85 AND action = "new"

WHEN mandatory: false (suggestion only, but still SUGGEST increment):
- Bug fixes and refactoring (action: "new", mandatory: false)
- Single-file improvements (action: "new", mandatory: false)
- Small but non-trivial changes (action: "small_fix", mandatory: false)
- Low confidence

EXPLICIT OPT-OUT → action: "none":
- "don't create an increment", "no increment needed", "skip workflow"
- "just a quick fix", "without tracking", "already tracking"

═══════════════════════════════════════════════════════════════
EXAMPLES (one per action type — keep prompt size minimal)
═══════════════════════════════════════════════════════════════

"Create React dashboard with Stripe checkout and .NET backend"
{"plugins":["frontend","backend","payments"],"confidence":0.95,"reasoning":"React→frontend, .NET→backend, Stripe→payments","increment":{"action":"new","confidence":0.95,"mandatory":true,"suggestedName":"react-dashboard-stripe","reasoning":"Multi-component full-stack feature"}}

"The auth feature is broken again"
{"plugins":[],"confidence":0.7,"reasoning":"No specific tech mentioned","increment":{"action":"reopen","confidence":0.8,"mandatory":false,"relatedKeyword":"auth","reasoning":"Related to previous auth work"}}

"Urgent: production checkout is failing"
{"plugins":["payments"],"confidence":0.9,"reasoning":"Payment issue","increment":{"action":"hotfix","confidence":0.95,"mandatory":true,"suggestedName":"checkout-hotfix","reasoning":"Production issue"}}

"Fix typo in README"
{"plugins":[],"confidence":0.9,"reasoning":"Typo fix","increment":{"action":"small_fix","confidence":0.9,"mandatory":false,"suggestedName":"fix-readme-typo","reasoning":"Trivial 1-line change"}}

"How do I use React hooks?"
{"plugins":[],"confidence":0.95,"reasoning":"Question only","increment":{"action":"none","confidence":0.99,"mandatory":false,"reasoning":"Question, no implementation"}}

"Investigate why the API sync keeps failing across multiple services"
{"plugins":[],"confidence":0.8,"reasoning":"Investigation/debugging work","increment":{"action":"new","confidence":0.85,"mandatory":false,"suggestedName":"investigate-api-sync-failure","reasoning":"Multi-component investigation requiring structured tracking"}}

═══════════════════════════════════════════════════════════════
SKILL INVOCATION (v2.1.0 - tell Claude which plugin:skill to use)
═══════════════════════════════════════════════════════════════

ALSO specify which skill Claude SHOULD invoke for this task.
Skills use "plugin:skill" format (e.g., "backend:dotnet", "frontend:nextjs").

"skillInvocation" field with:
- skill: full skill name as plugin:skill (e.g., "ml:engineer", "payments:payment-core")
- reason: why this skill should be used
- mandatory: true if Claude MUST use this skill, false if optional

⚠️ IMPORTANT: DO NOT suggest *-lsp plugins - they are BROKEN in official marketplace!
LSP is handled separately via boostvolt/claude-code-lsps + ENABLE_LSP_TOOL=1 env var.

SKILL CATALOG (use exact plugin:skill names):
frontend: frontend:frontend-core, frontend:architect, frontend:code-explorer, frontend:design, frontend:design-system, frontend:figma, frontend:i18n, frontend:nextjs
backend: backend:db-optimizer, backend:dotnet, backend:go, backend:graphql, backend:java-spring, backend:nodejs, backend:python, backend:rust
testing: testing:accessibility, testing:e2e, testing:mutation, testing:performance, testing:qa, testing:unit
mobile: mobile:appstore, mobile:capacitor, mobile:deep-linking, mobile:expo, mobile:flutter, mobile:jetpack, mobile:react-native, mobile:swiftui, mobile:testing
infra: infra:aws, infra:azure, infra:devops, infra:devsecops, infra:gcp, infra:github-actions, infra:observability, infra:opentelemetry, infra:secrets, infra:terraform
k8s: k8s:gitops, k8s:helm, k8s:manifests, k8s:security
ml: ml:data-scientist, ml:edge, ml:engineer, ml:fine-tuning, ml:huggingface, ml:langchain, ml:mlops, ml:rag, ml:specialist
kafka: kafka:architect, kafka:ops, kafka:streams-topology, kafka:n8n
confluent: confluent:kafka-connect, confluent:ksqldb, confluent:schema-registry
payments: payments:payment-core, payments:billing, payments:pci
docs: docs:brainstorming, docs:docusaurus, docs:technical-writing
cost: cost:aws, cost:cloud-pricing, cost:optimization
security: security:security-core, security:patterns, security:simplifier
blockchain: blockchain:blockchain-core
skills: skills:scout

SKILL INVOCATION RULES (pick the most specific skill):
- .NET/C# → backend:dotnet MANDATORY
- Go/Golang → backend:go MANDATORY
- Python/FastAPI/Django → backend:python MANDATORY
- Java/Spring → backend:java-spring MANDATORY
- Rust → backend:rust MANDATORY
- Node.js/Express/NestJS → backend:nodejs MANDATORY
- GraphQL → backend:graphql MANDATORY
- Next.js → frontend:nextjs MANDATORY
- React/Vue/Angular → frontend:frontend-core MANDATORY
- Figma design → frontend:figma MANDATORY
- ML/AI → ml:engineer MANDATORY
- Stripe/PayPal → payments:payment-core MANDATORY
- Unit testing → testing:unit MANDATORY
- E2E testing → testing:e2e MANDATORY
- React Native → mobile:react-native MANDATORY
- Flutter → mobile:flutter MANDATORY
- SwiftUI/iOS → mobile:swiftui MANDATORY
- Jetpack/Android → mobile:jetpack MANDATORY
- Expo → mobile:expo MANDATORY
- Terraform → infra:terraform MANDATORY
- AWS → infra:aws MANDATORY
- Azure → infra:azure MANDATORY
- GCP → infra:gcp MANDATORY
- GitHub Actions → infra:github-actions MANDATORY
- Kubernetes → k8s:manifests recommended
- Architecture → frontend:architect or relevant architect skill recommended
- DO NOT suggest *-lsp plugins (broken in marketplace)

SKILL EXAMPLES:

"Build .NET API with Entity Framework"
{"plugins":["backend"],"confidence":0.95,"reasoning":".NET→backend","increment":{"action":"new","confidence":0.9,"mandatory":true,"suggestedName":"dotnet-api","reasoning":"New API"},"skillInvocation":{"skill":"backend:dotnet","reason":".NET patterns and EF Core","mandatory":true}}

"Write unit tests for the auth service"
{"plugins":["testing"],"confidence":0.95,"reasoning":"Unit testing","increment":{"action":"small_fix","confidence":0.7,"mandatory":false,"reasoning":"Testing extends existing work"},"skillInvocation":{"skill":"testing:unit","reason":"Vitest/Jest patterns and TDD","mandatory":true}}

═══════════════════════════════════════════════════════════════
LSP OPERATION DETECTION (v1.0.198 - unified detection)
═══════════════════════════════════════════════════════════════

ALSO analyze if the prompt requires LSP (Language Server Protocol) operations.

"lsp" field with:
- needed: true if user wants code intelligence (references, definition, etc.)
- operation: "references" | "definition" | "hover" | "symbols" | null
- language: "typescript" | "python" | "rust" | "go" | "csharp" | "java" | null
- warmupRequired: true (always true - session state unknown)

WHEN lsp.needed = true: "find references"→references, "go to definition"→definition, "show type"→hover, "list symbols"→symbols
WHEN lsp.needed = false (default): building features, general questions, no LSP keywords → omit lsp field

LSP EXAMPLES:

"Find all references to handleRequest"
{"plugins":[],"confidence":0.95,"reasoning":"Code navigation","lsp":{"needed":true,"operation":"references","language":"typescript","warmupRequired":true}}

"Build a React dashboard" (NO LSP needed)
{"plugins":["frontend"],"confidence":0.95,"reasoning":"React development"}`;
}

/**
 * Execute Claude CLI command safely
 *
 * Cross-platform safety measures:
 * - Uses spawnSync (not execSync) to avoid shell injection
 * - Proper timeout handling
 * - Buffer size limits
 * - Handles shell functions/aliases on macOS/Linux via interactive shell
 * - Windows-specific shell handling
 *
 * IMPORTANT: On macOS/Linux, if claude is installed as a shell function/alias
 * (defined in .zshrc/.bashrc), we need to use interactive shell to find it.
 * This is detected by detectClaudeCli() which we reuse here.
 *
 * @param args - Arguments to pass to claude command
 * @param timeout - Timeout in milliseconds
 * @returns Spawn result with stdout, stderr, status
 */
function executeClaudeCli(
  args: string[],
  timeout: number = 30000
): SpawnSyncReturns<string> {
  const isWindows = process.platform === 'win32';

  // Get cached CLI status or detect
  if (!cachedCliStatus) {
    cachedCliStatus = detectClaudeCli();
  }

  // CRITICAL FIX: Prefer DIRECT binary path when available.
  //
  // Why? Users often have shell wrapper functions like:
  //   function claude() { command claude --dangerously-skip-permissions "$@" }
  //
  // These wrappers are great for interactive use but can interfere with
  // programmatic access. The `--dangerously-skip-permissions` flag, for example,
  // may cause issues when combined with certain arguments.
  //
  // Strategy:
  // 1. If we have a direct binary path (via `which` or file lookup), use it directly
  // 2. Only use interactive shell if claude was detected purely as a shell function
  //    (i.e., shellWorkaround is true and no direct binary path)

  // Use direct binary path if available (bypasses shell functions)
  if (cachedCliStatus.commandPath && !cachedCliStatus.shellWorkaround) {
    logger.debug(`[executeClaudeCli] Using direct binary: ${cachedCliStatus.commandPath}`);
    // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
    // that would cause Claude CLI to fail silently in test/debug environments
    const cleanEnv = getCleanEnv();
    return spawnSync(cachedCliStatus.commandPath, args, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 1024 * 1024, // 1MB buffer
      windowsHide: true,
      cwd: os.tmpdir(),
      env: {
        ...cleanEnv,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
      },
    });
  }

  // On Unix with no direct binary (shell function only): use interactive shell
  if (!isWindows) {
    logger.debug('[executeClaudeCli] Using interactive shell (no direct binary)');
    return executeViaInteractiveShell(args, timeout);
  }

  // Windows: try with shell for PATH resolution
  // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
  const cleanEnv = getCleanEnv();
  return spawnSync('claude', args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    shell: true,
    cwd: os.tmpdir(),
    env: {
      ...cleanEnv,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    },
  });
}

/**
 * Execute command via interactive shell (for shell functions/aliases)
 *
 * When claude is defined as a shell function or alias in .zshrc/.bashrc,
 * we need to run via interactive shell to have access to it.
 */
function executeViaInteractiveShell(
  args: string[],
  timeout: number
): SpawnSyncReturns<string> {
  const userShell = process.env.SHELL || '/bin/bash';
  const isZsh = userShell.includes('zsh');
  const shell = isZsh ? 'zsh' : 'bash';

  // Build the command string - properly escape arguments
  const escapedArgs = args.map((arg) => {
    // Escape single quotes and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  });
  const command = `claude ${escapedArgs.join(' ')}`;

  // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
  const cleanEnv = getCleanEnv();
  const result = spawnSync(shell, ['-ic', command], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    cwd: os.tmpdir(),
    env: {
      ...cleanEnv,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      BASH_SILENCE_DEPRECATION_WARNING: '1',
    },
  });

  return result;
}

/**
 * Create a failure result when LLM detection fails (v1.0.157)
 *
 * v1.0.157: Keyword fallback REMOVED - if LLM fails, return ZERO plugins.
 * This is safer than guessing wrong (which caused over-detection bugs).
 *
 * @param startTime - Start time for duration calculation
 * @param error - Error message from failed LLM detection
 * @returns Detection result with empty plugins
 */
function createFailureResult(
  startTime: number,
  error?: string
): LLMDetectionResult {
  logger.warn(`LLM detection failed: ${error || 'unknown'} - returning empty plugins (no fallback)`);
  return {
    success: false,
    plugins: [],
    confidence: 0,
    error,
    durationMs: performance.now() - startTime,
  };
}

/**
 * Detect plugins needed for a user prompt using Claude LLM
 *
 * @param userPrompt - The user's prompt to analyze
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns Detection result with plugins to install
 */
export async function detectPluginsViaLLM(
  userPrompt: string,
  timeout: number = 15000, // v1.0.159: Reduced to 15s with --setting-sources "" optimization (CLI starts in <1s)
  activeIncrements: ActiveIncrementContext[] = []
): Promise<LLMDetectionResult> {
  const startTime = performance.now();

  // Check CLI availability first
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    // v1.0.157: No keyword fallback - if CLI unavailable, return empty plugins
    // This is safer than guessing wrong (which caused over-detection bugs)
    logger.warn('Claude CLI not available for LLM detection - returning empty plugins (no fallback)');
    return {
      success: false,
      plugins: [],
      confidence: 0,
      error: cliStatus.error,
      durationMs: performance.now() - startTime,
    };
  }

  // Build the full prompt
  const systemPrompt = buildDetectionPrompt();

  // Inject active increment context for reopen detection
  let incrementContext = '';
  if (activeIncrements.length > 0) {
    const incList = activeIncrements.map(i => `  - ${i.id} (${i.type}, ${i.status}): "${i.name}"`).join('\n');
    incrementContext = `\n\nACTIVE INCREMENTS (consider reopening one of these if the user's request relates to existing work):\n${incList}\n\nIf the user's prompt relates to any of these active increments, use action "reopen" with the relatedKeyword matching the increment name. Only suggest "new" if the work is clearly unrelated to ALL active increments.`;
  }

  // v1.0.254: Truncate user prompt to prevent "Prompt is too long" errors
  // The first 3000 chars are sufficient for intent/plugin detection
  const safePrompt = truncateForDetection(userPrompt);

  const fullPrompt = `${systemPrompt}${incrementContext}

User prompt to analyze:
"${safePrompt.replace(/"/g, '\\"')}"

Which plugins should be loaded?`;

  try {
    // Execute Claude CLI with haiku for fast detection
    // v1.0.159: Use --setting-sources "" (empty) to skip ALL settings loading
    // This reduces startup from ~50s to <1s by avoiding context cache loading
    // The comprehensive prompt already contains all needed plugin knowledge
    const result = executeClaudeCli(['-p', fullPrompt, '--model', 'haiku', '--output-format', 'json', '--setting-sources', ''], timeout);

    // Handle spawn errors - return failure (v1.0.157 - no fallback)
    if (result.error) {
      const errorMsg = result.error.message || String(result.error);

      // Timeout error
      if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('TIMEOUT')) {
        return createFailureResult(startTime, `Detection timed out after ${timeout}ms`);
      }

      return createFailureResult(startTime, `Claude CLI error: ${errorMsg}`);
    }

    // Handle non-zero exit - return failure (v1.0.157 - no fallback)
    if (result.status !== 0) {
      const stderr = result.stderr || '';
      const stdout = result.stdout || '';

      // Check for specific errors
      if (stderr.includes('authentication') || stderr.includes('API key')) {
        return createFailureResult(startTime, 'Claude CLI authentication error. Run: claude login');
      }

      if (stderr.includes('rate limit')) {
        return createFailureResult(startTime, 'Rate limit exceeded. Try again later.');
      }

      // Prompt too long - common with Haiku
      if (stderr.includes('too long') || stdout.includes('too long')) {
        return createFailureResult(startTime, 'Prompt too long for Haiku model');
      }

      return createFailureResult(startTime, `Claude CLI exited with code ${result.status}: ${stderr || stdout}`);
    }

    // Parse the response
    let output = (result.stdout || '').trim();

    if (!output) {
      return createFailureResult(startTime, 'Empty response from Claude CLI');
    }

    // Handle --output-format json wrapper (v1.0.155)
    // The response is wrapped in: {"type":"result","result":"...actual response..."}
    try {
      const wrapper = JSON.parse(output);
      if (wrapper.type === 'result' && wrapper.result) {
        output = wrapper.result;
        logger.debug(`Extracted result from JSON wrapper, duration_ms: ${wrapper.duration_ms}`);
      }
    } catch {
      // Not a JSON wrapper, use raw output
      logger.debug('Output is not JSON wrapper, using raw output');
    }

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = output;

    // Remove markdown code blocks if present
    const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Find JSON object in the string
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    // v1.0.157+: Return failure if no JSON (no keyword fallback - LLM-only detection)
    if (!jsonMatch) {
      logger.debug(`Invalid LLM response format: ${output.slice(0, 200)}`);
      return createFailureResult(startTime, 'Invalid response format (no JSON found)');
    }


    // Parse JSON
    let parsed: {
      plugins?: string[];
      confidence?: number;
      reasoning?: string;
      increment?: {
        action?: string;
        confidence?: number;
        mandatory?: boolean;
        suggestedName?: string;
        relatedKeyword?: string;
        reasoning?: string;
      };
      routing?: {
        skills?: Array<{
          name?: string;
          plugin?: string;
          fullName?: string;
          priority?: string;
          invokeWhen?: string;
          reason?: string;
        }>;
        workflow?: {
          suggestPlanMode?: boolean;
          phases?: string[];
        };
        confidence?: number;
        reasoning?: string;
      };
      skillInvocation?: {
        skill?: string;
        reason?: string;
        mandatory?: boolean;
      };
      lsp?: {
        needed?: boolean;
        operation?: string;
        language?: string;
        warmupRequired?: boolean;
      };
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.debug(`JSON parse error: ${parseError}`);
      return createFailureResult(startTime, 'Failed to parse response JSON');
    }

    // Validate and filter plugins (v1.0.159: accept both SW and official plugins)
    const rawPlugins = parsed.plugins || [];
    let validPlugins = rawPlugins.filter((p): p is ValidPlugin =>
      typeof p === 'string' && (ALL_VALID_PLUGINS as readonly string[]).includes(p)
    );

    // Log if we filtered out invalid plugins
    if (validPlugins.length !== rawPlugins.length) {
      const invalid = rawPlugins.filter((p) => !(ALL_VALID_PLUGINS as readonly string[]).includes(p));
      logger.debug(`Filtered out invalid plugins: ${invalid.join(', ')}`);
    }

    // v1.0.156: Trust Opus model - no arbitrary limits, no keyword fallback
    // Opus understands NECESSARY implications (dashboard → backend) vs OPTIONAL (→ infra)

    // Parse increment recommendation (v1.0.141+, v1.0.168: added mandatory field)
    let incrementRecommendation: IncrementRecommendation | undefined;
    if (parsed.increment) {
      const validActions: IncrementAction[] = ['new', 'reopen', 'small_fix', 'hotfix', 'none'];
      const action = parsed.increment.action as IncrementAction;

      if (validActions.includes(action)) {
        // v1.0.168: LLM decides if increment is mandatory (not config-based)
        const isMandatory = parsed.increment.mandatory === true ||
          (action === 'new' && typeof parsed.increment.confidence === 'number' && parsed.increment.confidence >= 0.85);

        incrementRecommendation = {
          action,
          confidence: typeof parsed.increment.confidence === 'number' ? parsed.increment.confidence : 0.5,
          mandatory: isMandatory,
          suggestedName: parsed.increment.suggestedName,
          relatedKeyword: parsed.increment.relatedKeyword,
          reasoning: parsed.increment.reasoning || 'No reasoning provided',
        };
        logger.debug(`Increment recommendation: ${action} (confidence: ${incrementRecommendation.confidence}, mandatory: ${isMandatory})`);
      } else {
        logger.debug(`Invalid increment action: ${parsed.increment.action}`);
      }
    }

    // Parse skill routing recommendation (v1.0.150+)
    let skillRouting: SkillRouting | undefined;
    if (parsed.routing && parsed.routing.skills) {
      const validTimings: SkillInvokeTiming[] = ['immediate', 'after_increment', 'after_planning', 'with_primary', 'after_primary'];
      const validPriorities: SkillPriority[] = ['primary', 'secondary'];

      // Validate and filter skills
      const validSkills: SkillInfo[] = [];
      for (const skill of parsed.routing.skills) {
        // Validate required fields
        if (!skill.name || !skill.plugin || !skill.fullName) {
          logger.debug(`Skipping skill with missing required fields: ${JSON.stringify(skill)}`);
          continue;
        }

        // Validate plugin name (v2.1.0: accept both specweave and vskill plugins)
        if (!isKnownPlugin(skill.plugin)) {
          logger.debug(`Skipping skill with invalid plugin: ${skill.plugin}`);
          continue;
        }

        // Validate and default timing
        const invokeWhen = validTimings.includes(skill.invokeWhen as SkillInvokeTiming)
          ? (skill.invokeWhen as SkillInvokeTiming)
          : 'after_increment';

        // Validate and default priority
        const priority = validPriorities.includes(skill.priority as SkillPriority)
          ? (skill.priority as SkillPriority)
          : 'secondary';

        validSkills.push({
          name: skill.name,
          plugin: skill.plugin,
          fullName: skill.fullName,
          priority,
          invokeWhen,
          reason: skill.reason || 'No reason provided',
        });
      }

      if (validSkills.length > 0) {
        skillRouting = {
          skills: validSkills,
          workflow: {
            suggestPlanMode: parsed.routing.workflow?.suggestPlanMode ?? false,
            phases: parsed.routing.workflow?.phases ?? [],
          },
          confidence: typeof parsed.routing.confidence === 'number' ? parsed.routing.confidence : 0.5,
          reasoning: parsed.routing.reasoning || 'No reasoning provided',
        };

        // Log routing decision
        const primarySkill = validSkills.find(s => s.priority === 'primary');
        const secondarySkills = validSkills.filter(s => s.priority === 'secondary');
        logger.debug(`Skill routing: primary=${primarySkill?.fullName || 'none'}, secondary=[${secondarySkills.map(s => s.fullName).join(', ')}]`);
      }
    }

    // Parse skill invocation recommendation (v1.0.168)
    let skillInvocation: SkillInvocation | undefined;
    if (parsed.skillInvocation && parsed.skillInvocation.skill) {
      skillInvocation = {
        skill: parsed.skillInvocation.skill,
        reason: parsed.skillInvocation.reason || 'Use this skill for specialized support',
        mandatory: parsed.skillInvocation.mandatory === true,
      };
      logger.debug(`Skill invocation: ${skillInvocation.skill} (mandatory: ${skillInvocation.mandatory})`);
    }

    // Parse LSP recommendation (v1.0.198+)
    let lspRecommendation: LspRecommendation | undefined;
    if (parsed.lsp && parsed.lsp.needed === true) {
      const validOperations: LspOperation[] = ['references', 'definition', 'hover', 'symbols', null];
      const validLanguages: LspLanguage[] = ['typescript', 'python', 'rust', 'go', 'csharp', 'java', null];

      const operation = validOperations.includes(parsed.lsp.operation as LspOperation)
        ? (parsed.lsp.operation as LspOperation)
        : null;

      const language = validLanguages.includes(parsed.lsp.language as LspLanguage)
        ? (parsed.lsp.language as LspLanguage)
        : null;

      lspRecommendation = {
        needed: true,
        operation,
        language,
        warmupRequired: parsed.lsp.warmupRequired !== false, // Default to true
      };

      logger.debug(`LSP recommendation: operation=${operation}, language=${language}, warmupRequired=${lspRecommendation.warmupRequired}`);
    }

    return {
      success: true,
      plugins: validPlugins,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning,
      durationMs: performance.now() - startTime,
      increment: incrementRecommendation,
      routing: skillRouting,
      skillInvocation,
      lsp: lspRecommendation,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`LLM detection failed: ${errorMsg}`);

    // v1.0.157+: Return failure on exception (no keyword fallback - LLM-only detection)
    return createFailureResult(startTime, `Detection failed: ${errorMsg}`);
  }
}

/**
 * Check if a plugin is already installed via vskill lockfile
 *
 * Reads vskill.lock from cwd and checks if the plugin has an entry.
 * This provides a fast-path to skip installation when plugin is
 * already present with a matching hash.
 *
 * @param pluginName - Name of the plugin to check
 * @returns true if plugin is in the lockfile
 */
function isPluginInVskillLock(pluginName: string): boolean {
  try {
    const lockPath = path.join(getProjectRoot(), 'vskill.lock');
    if (!fs.existsSync(lockPath)) {
      return false;
    }
    const content = fs.readFileSync(lockPath, 'utf-8');
    const lock = JSON.parse(content);
    return lock.skills && pluginName in lock.skills;
  } catch {
    return false;
  }
}

/** Resolve vskill path from this module's location */
function resolveVskillCliPath(): string {
  return _resolveVskillPath(__dirname);
}

/** Resolve specweave source directory */
function resolveSpecweaveDir(): string {
  return _resolveSpecweaveDir(__dirname);
}

/**
 * Install a specweave local plugin via vskill add with --plugin-dir
 *
 * @param pluginName - Name of the sw-* plugin to install
 * @param timeout - Timeout in milliseconds
 * @returns Installation result
 */
async function installSpecweaveLocalPlugin(
  pluginName: string,
  timeout: number
): Promise<PluginInstallResult> {
  try {
    const vskillPath = resolveVskillCliPath();
    const pluginDir = resolveSpecweaveDir();

    const result = spawnSync('node', [
      vskillPath,
      'add',
      pluginDir,
      '--plugin', pluginName,
      '--plugin-dir', pluginDir,
      '--force', // Auto-accept scan results during lazy loading
    ], {
      encoding: 'utf8',
      timeout,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      cwd: process.cwd(),
    });

    if (result.error) {
      return { success: false, plugin: pluginName, error: `Install error: ${result.error.message}` };
    }

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const combined = `${stdout} ${stderr}`.toLowerCase();

    if (combined.includes('already')) {
      return { success: true, plugin: pluginName, alreadyInstalled: true };
    }

    if (result.status === 0) {
      return { success: true, plugin: pluginName };
    }

    return { success: false, plugin: pluginName, error: stderr || stdout || `Exit code ${result.status}` };
  } catch (error) {
    return { success: false, plugin: pluginName, error: `Install failed: ${error}` };
  }
}

/**
 * Install a vskill repo plugin via vskill add --repo
 *
 * v2.1.0: Per-category plugins in vskill marketplace (frontend, backend, etc.).
 * Uses: vskill add dummy --repo anton-abyzov/vskill --plugin <name> --force --yes
 *
 * @param pluginName - Name of the vskill plugin (e.g., "frontend", "backend")
 * @param timeout - Timeout in milliseconds
 * @returns Installation result
 */
async function installVskillRepoPlugin(
  pluginName: string,
  timeout: number
): Promise<PluginInstallResult> {
  try {
    const vskillPath = resolveVskillCliPath();

    const result = spawnSync('node', [
      vskillPath,
      'add',
      'dummy',          // source arg (required but unused for --repo)
      '--repo', 'anton-abyzov/vskill',
      '--plugin', pluginName,
      '--force',
      '--yes',
    ], {
      encoding: 'utf8',
      timeout,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      cwd: process.cwd(),
    });

    if (result.error) {
      return { success: false, plugin: pluginName, error: `Install error: ${result.error.message}` };
    }

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const combined = `${stdout} ${stderr}`.toLowerCase();

    if (combined.includes('already')) {
      return { success: true, plugin: pluginName, alreadyInstalled: true };
    }

    if (result.status === 0) {
      return { success: true, plugin: pluginName };
    }

    return { success: false, plugin: pluginName, error: stderr || stdout || `Exit code ${result.status}` };
  } catch (error) {
    return { success: false, plugin: pluginName, error: `Install failed: ${error}` };
  }
}

/**
 * Install a plugin using vskill (routes to correct installer)
 *
 * v2.1.0: Routes to installSpecweaveLocalPlugin for sw-* plugins,
 * or installVskillRepoPlugin for vskill domain plugins.
 *
 * Fast-path: If plugin is already in vskill.lock, skip installation.
 *
 * @param pluginName - Name of the plugin to install
 * @param timeout - Timeout in milliseconds
 * @returns Installation result
 */
export async function installPluginViaCli(
  pluginName: string,
  timeout: number = 30000
): Promise<PluginInstallResult> {
  // v2.1.0: Accept both specweave and vskill plugins
  if (!isKnownPlugin(pluginName)) {
    return {
      success: false,
      plugin: pluginName,
      error: `Unknown plugin: ${pluginName}. Only @specweave or vskill repo plugins are allowed.`,
    };
  }

  // Check CLI availability (still needed for detect-intent etc.)
  const cliStatus = isClaudeCliAvailable();
  if (!cliStatus.available) {
    return {
      success: false,
      plugin: pluginName,
      error: cliStatus.error,
    };
  }

  // Fast-path: Check vskill.lock - skip if already installed (works for both sources)
  if (isPluginInVskillLock(pluginName)) {
    logger.debug(`Plugin ${pluginName} already in vskill.lock, skipping installation`);
    return {
      success: true,
      plugin: pluginName,
      alreadyInstalled: true,
    };
  }

  // Route to correct installer based on plugin source
  if (isVskillPlugin(pluginName)) {
    return installVskillRepoPlugin(pluginName, timeout);
  }

  return installSpecweaveLocalPlugin(pluginName, timeout);
}

/**
 * Install multiple plugins via CLI
 *
 * @param plugins - Array of plugin names to install
 * @returns Array of installation results
 */
export async function installPluginsViaCli(
  plugins: string[]
): Promise<PluginInstallResult[]> {
  const results: PluginInstallResult[] = [];

  for (const plugin of plugins) {
    const result = await installPluginViaCli(plugin);
    results.push(result);

    // Log progress
    if (result.success) {
      if (result.alreadyInstalled) {
        logger.debug(`Plugin ${plugin} already installed`);
      } else {
        logger.info(`Installed plugin: ${plugin}`);
      }
    } else {
      logger.warn(`Failed to install ${plugin}: ${result.error}`);
    }
  }

  return results;
}

/**
 * Full pipeline: detect plugins from prompt and optionally install them
 *
 * Respects .specweave/config.json pluginAutoLoad settings:
 * - enabled: false → skip detection entirely
 * - suggestOnly: true → detect but don't install, return suggestions
 *
 * @param userPrompt - The user's prompt
 * @returns Detection and installation results
 */
export async function detectAndInstallPlugins(userPrompt: string): Promise<{
  detection: LLMDetectionResult;
  installations: PluginInstallResult[];
  suggestOnly?: boolean;
}> {
  // Check config first
  const config = readPluginAutoLoadConfig();

  // If auto-load is completely disabled, skip detection
  if (!config.enabled) {
    logger.debug('[detectAndInstallPlugins] Auto-load disabled in config, skipping detection');
    return {
      detection: {
        success: true,
        plugins: [],
        confidence: 1.0,
        reasoning: 'Plugin auto-load disabled in config',
        durationMs: 0,
      },
      installations: [],
    };
  }

  // Step 1: Detect needed plugins
  const detection = await detectPluginsViaLLM(userPrompt);

  if (!detection.success || detection.plugins.length === 0) {
    return {
      detection,
      installations: [],
    };
  }

  // Step 2: If suggestOnly mode, DON'T install - just return suggestions
  if (config.suggestOnly) {
    logger.info(`[detectAndInstallPlugins] Suggest-only mode: detected ${detection.plugins.join(', ')}`);
    return {
      detection,
      installations: [],
      suggestOnly: true,
    };
  }

  // Step 3: Install detected plugins (original behavior)
  const installations = await installPluginsViaCli(detection.plugins);

  return {
    detection,
    installations,
  };
}

/**
 * Format hook output for Claude Code
 *
 * @param result - Detection/installation result
 * @returns JSON string for hook output
 */
export function formatHookOutput(result: {
  detection: LLMDetectionResult;
  installations: PluginInstallResult[];
  suggestOnly?: boolean;
}): string {
  const { detection, installations, suggestOnly } = result;

  // Always continue (don't block Claude Code)
  const output: { continue: boolean; systemMessage?: string } = {
    continue: true,
  };

  // Build system message based on results
  if (!detection.success) {
    if (detection.error?.includes('not found')) {
      output.systemMessage = `SpecWeave: Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code

Plugin auto-loading is disabled. Install Claude CLI to enable automatic plugin detection.`;
    } else if (detection.error?.includes('authentication')) {
      output.systemMessage = `SpecWeave: Claude CLI authentication required. Run: claude login`;
    }
    // Don't show message for other errors (silent degradation)
  } else if (detection.plugins.length > 0) {
    // SUGGEST-ONLY MODE: Show which plugins would help, but don't install
    if (suggestOnly) {
      const pluginList = detection.plugins.join(', ');
      output.systemMessage = `SpecWeave: Plugins that may help: ${pluginList}

To install: claude plugin install <plugin>@vskill
After installing, restart Claude Code session to use new plugins.`;
      return JSON.stringify(output);
    }

    // NORMAL MODE: Show what was installed
    const installed = installations.filter((i) => i.success && !i.alreadyInstalled);
    const alreadyInstalled = installations.filter((i) => i.alreadyInstalled);
    const failed = installations.filter((i) => !i.success);

    const parts: string[] = [];

    if (installed.length > 0) {
      parts.push(`Loaded: ${installed.map((i) => i.plugin).join(', ')}`);
    }

    if (alreadyInstalled.length > 0 && installed.length === 0) {
      // Only mention already installed if nothing new was loaded
      parts.push(`Using: ${alreadyInstalled.map((i) => i.plugin).join(', ')}`);
    }

    if (failed.length > 0) {
      parts.push(`Failed: ${failed.map((i) => i.plugin).join(', ')}`);
    }

    if (parts.length > 0) {
      output.systemMessage = `SpecWeave: ${parts.join(' | ')}`;
    }
  }

  return JSON.stringify(output);
}
