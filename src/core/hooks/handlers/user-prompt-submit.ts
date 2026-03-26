/**
 * UserPromptSubmit hook handler.
 *
 * Fires before the user's prompt is processed. Responsibilities:
 * 1. Fast-path approve for built-in Claude Code commands
 * 2. Fast-path approve for /sw: and /sw- commands
 * 3. Block SW skill invocations in non-initialized projects (scope guard)
 * 4. Inject active increment context + TDD mode info
 *
 * @module core/hooks/handlers/user-prompt-submit
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookResult } from './types.js';
import { logHook } from './utils.js';

/** Built-in Claude Code commands that should bypass all SpecWeave processing */
const BUILTIN_COMMANDS = [
  '/help', '/clear', '/config', '/status', '/context', '/compact', '/cost',
  '/memory', '/permissions', '/doctor', '/login', '/logout',
];

/** Strip IDE metadata tags from prompt (VSCode injects these) */
function stripIdeMetadata(prompt: string): string {
  return prompt.replace(/.*<\/ide_[a-z_]*>/g, '').trimStart();
}

/** Check if prompt starts with a built-in Claude Code command */
function isBuiltinCommand(prompt: string): boolean {
  const clean = stripIdeMetadata(prompt).toLowerCase();
  // Match /command at start, followed by end-of-string or whitespace
  const match = clean.match(/^\/([a-z][a-z0-9_-]*)/);
  if (!match) return false;
  const cmd = '/' + match[1];
  // If it's a /sw: or /sw- command, it's NOT a built-in
  if (/^\/sw[-:]/.test(cmd)) return false;
  return BUILTIN_COMMANDS.some((b) => cmd === b) ||
    // Any slash command that isn't /sw: is treated as built-in
    !cmd.startsWith('/sw');
}

/** Check if prompt is a SpecWeave command (/sw: or /sw-*:) */
function isSwCommand(prompt: string): boolean {
  const clean = stripIdeMetadata(prompt).trimStart().toLowerCase();
  return /^\/sw(-[a-z0-9-]+)?:/.test(clean);
}

/** Check if prompt invokes a SpecWeave skill (SW commands + domain plugins) */
function isSwSkillInvocation(prompt: string): boolean {
  const clean = stripIdeMetadata(prompt).trimStart().toLowerCase();
  if (/^\/sw(-[a-z0-9-]+)?:/.test(clean)) return true;
  const DOMAINS = ['frontend', 'backend', 'testing', 'mobile', 'infra', 'k8s', 'ml', 'payments', 'kafka', 'confluent', 'cost', 'docs', 'security', 'skills', 'blockchain'];
  const match = clean.match(/^\/([a-z0-9-]+):/);
  return match !== null && DOMAINS.includes(match[1]);
}

/** Read and parse JSON config file, returns null on any error */
function readJsonSafe(filePath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/** Build context string from active increments */
function buildIncrementContext(projectRoot: string): string {
  const incDir = path.join(projectRoot, '.specweave', 'increments');
  if (!fs.existsSync(incDir)) return '';

  const parts: string[] = [];
  let dirs: string[];
  try {
    dirs = fs.readdirSync(incDir);
  } catch {
    return '';
  }

  for (const dir of dirs) {
    const metaPath = path.join(incDir, dir, 'metadata.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = readJsonSafe(metaPath);
    if (!meta) continue;
    if (meta.status !== 'active' && meta.status !== 'in-progress') continue;

    const tasksPath = path.join(incDir, dir, 'tasks.md');
    let pending = 0;
    let completed = 0;
    try {
      const tasks = fs.readFileSync(tasksPath, 'utf8');
      pending = (tasks.match(/\[ \]/g) || []).length;
      completed = (tasks.match(/\[x\]/g) || []).length;
    } catch {
      // No tasks file
    }

    parts.push(`Active increment: ${dir} (${completed}/${completed + pending} tasks done)`);
  }

  return parts.join('\n');
}

/** Build TDD context string from config */
function buildTddContext(projectRoot: string): string {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  const config = readJsonSafe(configPath);
  if (!config) return '';

  const testMode = config.testing?.defaultTestMode;
  if (!testMode || (testMode !== 'TDD' && testMode !== 'tdd')) return '';

  const enforcement = config.testing?.tddEnforcement ?? 'warn';
  if (enforcement === 'strict') {
    return 'STRICT TDD ACTIVE. RED->GREEN->REFACTOR enforced. No implementation before failing test. Use /sw:tdd-cycle.';
  }
  return 'TDD MODE ACTIVE. RED->GREEN->REFACTOR discipline. Use /sw:tdd-cycle.';
}

/** Create approve result with optional context injection */
function approveWithContext(context?: string): HookResult {
  if (!context) return { decision: 'approve' };
  return {
    decision: 'approve',
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context,
    },
  };
}

export const handle: HandlerFn = async (input, context) => {
  try {
    const prompt = input.prompt ?? '';

    // Empty prompt — approve
    if (!prompt.trim()) {
      return { decision: 'approve' };
    }

    // 1. Built-in command fast-path (no SpecWeave processing)
    if (isBuiltinCommand(prompt)) {
      return { decision: 'approve' };
    }

    // 2. Project scope guard — block SW skills in non-initialized projects
    if (isSwSkillInvocation(prompt)) {
      if (process.env.SPECWEAVE_DISABLE_GUARD !== '1') {
        const configExists = fs.existsSync(context.configPath);
        if (!configExists) {
          logHook(context, 'user-prompt-submit', `Blocked: project not initialized`);
          return {
            decision: 'block',
            reason: 'SpecWeave Not Initialized. Run `specweave init` to initialize this project.',
          };
        }
      }
      // SW commands are approved (SpecWeave handles them via skills)
      return { decision: 'approve' };
    }

    // 3. Context injection for regular prompts
    const contextParts: string[] = [];

    // Active increment context
    const incCtx = buildIncrementContext(context.projectRoot);
    if (incCtx) contextParts.push(incCtx);

    // TDD mode context
    const tddCtx = buildTddContext(context.projectRoot);
    if (tddCtx) contextParts.push(tddCtx);

    const combined = contextParts.join('\n');
    if (combined) {
      logHook(context, 'user-prompt-submit', 'Injecting context');
    }

    return approveWithContext(combined || undefined);
  } catch (err) {
    // Never throw — return safe default
    return { decision: 'approve' };
  }
};
