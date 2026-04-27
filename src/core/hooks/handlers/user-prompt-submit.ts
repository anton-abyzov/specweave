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
import type { HandlerFn, HookContext, HookResult } from './types.js';
import { logHook } from './utils.js';
import { checkBanner } from './banner-check.js';

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
function readJsonSafe(filePath: string, context?: HookContext): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (context) {
      logHook(context, 'user-prompt-submit', `readJsonSafe error (${filePath}): ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
  }
}

/** Build context string from active increments */
function buildIncrementContext(context: HookContext): string {
  const incDir = path.join(context.projectRoot, '.specweave', 'increments');
  if (!fs.existsSync(incDir)) return '';

  const parts: string[] = [];
  let dirs: string[];
  try {
    dirs = fs.readdirSync(incDir);
  } catch (err) {
    logHook(context, 'user-prompt-submit', `readdirSync error (${incDir}): ${err instanceof Error ? err.message : String(err)}`);
    return '';
  }

  for (const dir of dirs) {
    const metaPath = path.join(incDir, dir, 'metadata.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = readJsonSafe(metaPath, context);
    if (!meta) continue;
    if (meta.status !== 'active' && meta.status !== 'in-progress') continue;

    const tasksPath = path.join(incDir, dir, 'tasks.md');
    let pending = 0;
    let completed = 0;
    try {
      const tasks = fs.readFileSync(tasksPath, 'utf8');
      pending = (tasks.match(/\[ \]/g) || []).length;
      completed = (tasks.match(/\[x\]/g) || []).length;
    } catch (err) {
      logHook(context, 'user-prompt-submit', `tasks.md read error (${tasksPath}): ${err instanceof Error ? err.message : String(err)}`);
    }

    parts.push(`Active increment: ${dir} (${completed}/${completed + pending} tasks done)`);
  }

  return parts.join('\n');
}

/** Build TDD context string from config */
function buildTddContext(context: HookContext): string {
  const config = readJsonSafe(context.configPath, context);
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
    const incCtx = buildIncrementContext(context);
    if (incCtx) contextParts.push(incCtx);

    // TDD mode context
    const tddCtx = buildTddContext(context);
    if (tddCtx) contextParts.push(tddCtx);

    // 0796 / T-005 — session-start banner for plugin/skill updates.
    // Throttled, opt-out via hooks.banner.disabled. Errors NEVER block
    // the prompt: any exception inside checkBanner is caught and logged.
    try {
      const cfg = readJsonSafe(context.configPath, context);
      const bannerCfg = cfg?.hooks?.banner;
      if (bannerCfg?.disabled !== true) {
        const banner = await checkBanner(context, bannerCfg ?? {});
        if (banner) contextParts.push(banner);
      }
    } catch (err) {
      logHook(context, 'user-prompt-submit', `banner check error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const combined = contextParts.join('\n');
    if (combined) {
      logHook(context, 'user-prompt-submit', 'Injecting context');
    }

    return approveWithContext(combined || undefined);
  } catch (err) {
    // Never throw — log and return safe default
    try {
      logHook(context, 'user-prompt-submit', `handler error: ${err instanceof Error ? err.message : String(err)}`);
    } catch { /* logging failure — swallow */ }
    return { decision: 'approve' };
  }
};
