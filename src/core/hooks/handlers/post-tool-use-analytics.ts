/**
 * PostToolUse analytics handler — tracks Skill and Task (subagent) usage.
 *
 * Appends events to `.specweave/state/analytics/events.jsonl`.
 * Non-blocking, never throws.
 *
 * @module core/hooks/handlers/post-tool-use-analytics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookInput } from './types.js';

const CONTINUE = { continue: true as const };

function getToolInput(input: HookInput): Record<string, unknown> {
  return (input.tool_input ?? input.toolInput ?? {}) as Record<string, unknown>;
}

function resolveToolName(input: HookInput): string {
  const explicit = (input.tool_name ?? input.toolName ?? '') as string;
  if (explicit) return explicit;

  // Fallback: detect from input fields
  const ti = getToolInput(input);
  if (ti.skill) return 'Skill';
  if (ti.subagent_type) return 'Task';
  return '';
}

function extractPlugin(skillName: string): string {
  if (!skillName.includes(':')) return 'specweave';
  const prefix = skillName.split(':')[0];
  return prefix === 'sw' ? 'specweave' : prefix;
}

export const handle: HandlerFn = async (input, context) => {
  const toolName = resolveToolName(input);
  const ti = getToolInput(input);

  if (toolName === 'Skill') {
    const skillName = (ti.skill ?? '') as string;
    if (!skillName) return CONTINUE;

    const plugin = extractPlugin(skillName);
    const event = {
      type: 'skill',
      name: skillName,
      plugin,
      timestamp: context.timestamp,
    };

    appendEvent(context.stateDir, event);
    return CONTINUE;
  }

  if (toolName === 'Task') {
    const agentType = ((ti.subagent_type ?? 'general') as string);
    const event = {
      type: 'agent',
      name: agentType,
      plugin: 'specweave',
      timestamp: context.timestamp,
    };

    appendEvent(context.stateDir, event);
    return CONTINUE;
  }

  return CONTINUE;
};

function appendEvent(
  stateDir: string,
  event: Record<string, unknown>,
): void {
  try {
    const analyticsDir = path.join(stateDir, 'analytics');
    fs.mkdirSync(analyticsDir, { recursive: true });
    fs.appendFileSync(
      path.join(analyticsDir, 'events.jsonl'),
      JSON.stringify(event) + '\n',
    );
  } catch {
    // Never throw from analytics
  }
}
