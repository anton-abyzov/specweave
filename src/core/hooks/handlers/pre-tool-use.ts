/**
 * PreToolUse hook handler — inlines all guard logic:
 * 1. Status Completion Guard (Edit metadata.json → "completed")
 * 2. Interview Enforcement Guard (Write spec.md with strict interview)
 * 3. Increment Existence Guard (TeamCreate without valid spec)
 *
 * @module core/hooks/handlers/pre-tool-use
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookContext, HookInput } from './types.js';
import { logHook } from './utils.js';

const ALLOW = { decision: 'allow' as const };

const TEMPLATE_MARKERS = [
  '[Story Title]',
  '[user type]',
  '[goal]',
  '[benefit]',
  '[Specific, testable criterion]',
  '[Component 1]',
  '[High-level description',
  '{{RESOLVED_PROJECT}}',
  'TEMPLATE FILE',
];

const DEFAULT_INTERVIEW_CATEGORIES = [
  'architecture',
  'integrations',
  'ui-ux',
  'performance',
  'security',
  'edge-cases',
];

const NON_IMPL_PREFIXES = [
  'review-',
  'brainstorm-',
  'analysis-',
  'audit-',
  'explore-',
  'ideate-',
  'research-',
  'plan-',
  'test-',
  'debug-',
  'investigate-',
  'verify-',
  'qa-',
];

const NON_IMPL_KEYWORDS = [
  'review',
  'brainstorm',
  'analyze',
  'audit',
  'explore',
  'ideate',
  'pull request',
  'pr #',
  'pr review',
  'code review',
  'architecture review',
  'security audit',
  'performance audit',
  'code audit',
  'ideation',
  'exploration',
  'research',
  'planning',
  'perspectives',
  "devil's advocate",
  'pros and cons',
  'test',
  'testing',
  'verify',
  'verification',
  'debug',
  'investigate',
  'diagnose',
  'troubleshoot',
  'qa',
  'quality',
];

function getToolName(input: HookInput): string {
  return (input.tool_name ?? input.toolName ?? '') as string;
}

function getToolInput(input: HookInput): Record<string, unknown> {
  return (input.tool_input ?? input.toolInput ?? {}) as Record<string, unknown>;
}

function getFilePath(input: HookInput): string {
  const ti = getToolInput(input);
  return (ti.file_path ?? '') as string;
}

function isIncrementFile(filePath: string): boolean {
  return filePath.includes('.specweave/increments/');
}

function extractIncrementId(filePath: string): string {
  const match = filePath.match(/(\d{4}[E]?-[^/]+)/);
  return match ? match[1] : 'unknown';
}

function readJsonSafe(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Guard: Status Completion (Edit metadata.json → "completed")
// ---------------------------------------------------------------------------

function checkStatusCompletionGuard(
  input: HookInput,
  context: HookContext,
): { decision: 'allow' | 'block'; reason?: string } {
  const ti = getToolInput(input);
  const filePath = getFilePath(input);
  const newString = (ti.new_string ?? '') as string;

  // Only care about metadata.json in increments
  if (!filePath.match(/\.specweave\/increments\/.*\/metadata\.json$/)) {
    return ALLOW;
  }

  // Check if setting status to "completed"
  if (!/"status"\s*:\s*"completed"/.test(newString)) {
    return ALLOW;
  }

  // Allow if sw-done marker exists
  const doneMarker = path.join(context.stateDir, '.sw-done-in-progress');
  if (fs.existsSync(doneMarker)) {
    return ALLOW;
  }

  // Allow if auto-mode active with testsVerified
  const autoSession = path.join(context.stateDir, 'auto', 'session.json');
  if (fs.existsSync(autoSession)) {
    const session = readJsonSafe(autoSession);
    if (session.status === 'active' && session.testsVerified === true) {
      return ALLOW;
    }
  }

  const incrementId = extractIncrementId(filePath);
  return {
    decision: 'block',
    reason: `Direct status change to 'completed' is blocked for ${incrementId}. Use /sw:done or /sw:auto instead.`,
  };
}

// ---------------------------------------------------------------------------
// Guard: Interview Enforcement (Write spec.md with strict interview)
// ---------------------------------------------------------------------------

function checkInterviewGuard(
  input: HookInput,
  context: HookContext,
): { decision: 'allow' | 'block'; reason?: string } {
  const filePath = getFilePath(input);
  const ti = getToolInput(input);
  const content = (ti.content ?? '') as string;

  // Only care about spec.md in increments
  if (!filePath.match(/\.specweave\/increments\/\d{4}-[^/]+\/spec\.md$/)) {
    return ALLOW;
  }

  // Allow template writes through
  for (const marker of TEMPLATE_MARKERS) {
    if (content.includes(marker)) {
      return ALLOW;
    }
  }

  // Read config to check if strict interview enabled
  const config = readJsonSafe(context.configPath);
  const planning = (config.planning ?? {}) as Record<string, unknown>;
  const di = (planning.deepInterview ?? {}) as Record<string, unknown>;

  if (di.enabled !== true || di.enforcement !== 'strict') {
    return ALLOW;
  }

  const incrementId = extractIncrementId(filePath);
  const categories = (di.categories as string[]) ?? DEFAULT_INTERVIEW_CATEGORIES;

  // Check interview state file
  const interviewState = path.join(
    context.stateDir,
    `interview-${incrementId}.json`,
  );

  if (!fs.existsSync(interviewState)) {
    return {
      decision: 'block',
      reason: `Strict Interview Enforcement: Interview Required. Deep Interview has not been started for ${incrementId}. Start and cover all categories before writing spec.md.`,
    };
  }

  // Check covered categories
  const state = readJsonSafe(interviewState);
  const covered = state.coveredCategories as Record<string, unknown> | undefined;
  const coveredKeys = covered ? Object.keys(covered) : [];
  const missing = categories.filter((c) => !coveredKeys.includes(c));

  if (missing.length > 0) {
    return {
      decision: 'block',
      reason: `Strict Interview Enforcement: Incomplete Interview for ${incrementId}. Missing categories: ${missing.join(', ')}`,
    };
  }

  return ALLOW;
}

// ---------------------------------------------------------------------------
// Guard: Increment Existence (TeamCreate without valid spec)
// ---------------------------------------------------------------------------

function isNonImplTeam(input: HookInput): boolean {
  const ti = getToolInput(input);
  const teamName = ((ti.team_name ?? '') as string).toLowerCase();
  const description = ((ti.description ?? '') as string).toLowerCase();

  // Check team name prefix
  for (const prefix of NON_IMPL_PREFIXES) {
    if (teamName.startsWith(prefix)) return true;
  }

  // Check description keywords
  for (const keyword of NON_IMPL_KEYWORDS) {
    if (description.includes(keyword)) return true;
  }

  return false;
}

function hasValidSpec(specPath: string): boolean {
  try {
    if (!fs.existsSync(specPath)) return false;
    const content = fs.readFileSync(specPath, 'utf-8');

    // Min 500 bytes
    if (Buffer.byteLength(content) <= 500) return false;

    // No template markers
    for (const marker of TEMPLATE_MARKERS) {
      if (content.includes(marker)) return false;
    }

    // No {{UPPERCASE}} mustache placeholders
    if (/\{\{[A-Z_]+\}\}/.test(content)) return false;

    // Must have at least one acceptance criterion
    if (!/AC-US\d+-\d+|AC-\d+/.test(content)) return false;

    return true;
  } catch {
    return false;
  }
}

function checkIncrementExistenceGuard(
  _input: HookInput,
  context: HookContext,
): { decision: 'allow' | 'block'; reason?: string } {
  // Env var bypass
  if (process.env.SPECWEAVE_NO_INCREMENT === '1') {
    return ALLOW;
  }

  // Scan increments for valid specs with active/in-progress status
  const incDir = path.join(context.projectRoot, '.specweave', 'increments');
  if (fs.existsSync(incDir)) {
    try {
      const entries = fs.readdirSync(incDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const specPath = path.join(incDir, entry.name, 'spec.md');
          if (!hasValidSpec(specPath)) continue;
          // Check metadata.json for qualifying status
          const metaPath = path.join(incDir, entry.name, 'metadata.json');
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              const status = meta?.status ?? '';
              const qualifying = ['active', 'in-progress', 'ready_for_review', 'planned'];
              if (qualifying.includes(status)) return ALLOW;
            } catch {
              // Unreadable metadata — skip this increment
            }
          } else {
            // No metadata.json but valid spec — allow (legacy increments)
            return ALLOW;
          }
        }
      }
    } catch {
      // scan failure — don't block
    }
  }

  // Scan multi-repo increments
  const reposDir = path.join(context.projectRoot, 'repositories');
  if (fs.existsSync(reposDir)) {
    try {
      const orgs = fs.readdirSync(reposDir, { withFileTypes: true });
      for (const org of orgs) {
        if (!org.isDirectory()) continue;
        const orgPath = path.join(reposDir, org.name);
        const repos = fs.readdirSync(orgPath, { withFileTypes: true });
        for (const repo of repos) {
          if (!repo.isDirectory()) continue;
          const repoIncDir = path.join(
            orgPath,
            repo.name,
            '.specweave',
            'increments',
          );
          if (!fs.existsSync(repoIncDir)) continue;
          const incs = fs.readdirSync(repoIncDir, { withFileTypes: true });
          for (const inc of incs) {
            if (inc.isDirectory()) {
              const specPath = path.join(repoIncDir, inc.name, 'spec.md');
              if (!hasValidSpec(specPath)) continue;
              // Check metadata.json for qualifying status (consistent with single-repo scan)
              const metaPath = path.join(repoIncDir, inc.name, 'metadata.json');
              if (fs.existsSync(metaPath)) {
                try {
                  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                  const status = meta?.status ?? '';
                  const qualifying = ['active', 'in-progress', 'ready_for_review', 'planned'];
                  if (qualifying.includes(status)) return ALLOW;
                } catch {
                  // Unreadable metadata — skip this increment
                }
              } else {
                // No metadata.json but valid spec — allow (legacy increments)
                return ALLOW;
              }
            }
          }
        }
      }
    } catch {
      // scan failure — don't block
    }
  }

  return {
    decision: 'block',
    reason:
      'Increment Required Before Team Creation. No qualifying increment with a valid spec.md found. Run /sw:increment first, or use a mode-prefixed team name (review-*, brainstorm-*, research-*, test-*, debug-*, verify-*, qa-*) for non-implementation work.',
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handle: HandlerFn = async (input, context) => {
  const toolName = getToolName(input);
  const filePath = getFilePath(input);

  // Fast path: not targeting increment files AND not TeamCreate
  if (!isIncrementFile(filePath) && toolName !== 'TeamCreate') {
    return ALLOW;
  }

  // Edit guard: status completion
  if (toolName === 'Edit') {
    return checkStatusCompletionGuard(input, context);
  }

  // Write guard: interview enforcement
  if (toolName === 'Write') {
    return checkInterviewGuard(input, context);
  }

  // TeamCreate guard: increment existence
  if (toolName === 'TeamCreate') {
    if (isNonImplTeam(input)) {
      logHook(context, 'pre-tool-use', `TeamCreate allowed: non-impl team`);
      return ALLOW;
    }
    const result = checkIncrementExistenceGuard(input, context);
    if (result.decision === 'block') {
      const ti = getToolInput(input);
      logHook(context, 'pre-tool-use', `TeamCreate blocked: team_name="${ti.team_name}", description="${ti.description}"`);
    }
    return result;
  }

  return ALLOW;
};
