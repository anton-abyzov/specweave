/**
 * Analytics event writer core module.
 *
 * Extracted from hooks/handlers/post-tool-use-analytics.ts.
 * Appends analytics events to events.jsonl.
 *
 * Never throws.
 *
 * @module core/analytics/event-writer
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AnalyticsEvent } from './types.js';
import { maskCredentialsInData } from '../../utils/credential-masker.js';

export interface WriteResult {
  written: number;
}

/**
 * Extract plugin name from a skill name.
 * "sw:pm" → "specweave", "frontend-design:component" → "frontend-design", "my-skill" → "specweave"
 */
export function extractPlugin(skillName: string): string {
  if (!skillName.includes(':')) return 'specweave';
  const prefix = skillName.split(':')[0];
  return prefix === 'sw' ? 'specweave' : prefix;
}

/**
 * Append an analytics event to events.jsonl.
 * Creates the analytics directory if it does not exist.
 */
export function appendAnalyticsEvent(
  analyticsDir: string,
  event: AnalyticsEvent,
): WriteResult {
  try {
    const safeEvent = maskCredentialsInData(event) as AnalyticsEvent;
    fs.mkdirSync(analyticsDir, { recursive: true });
    fs.appendFileSync(
      path.join(analyticsDir, 'events.jsonl'),
      JSON.stringify(safeEvent) + '\n',
    );
    return { written: 1 };
  } catch {
    return { written: 0 };
  }
}

/**
 * Build and append a skill analytics event.
 */
export function writeSkillEvent(
  analyticsDir: string,
  name: string,
  plugin?: string,
  timestamp?: string,
): WriteResult {
  const event: AnalyticsEvent = {
    timestamp: timestamp ?? new Date().toISOString(),
    type: 'skill',
    name,
    success: true,
    plugin: plugin ?? extractPlugin(name),
  };
  return appendAnalyticsEvent(analyticsDir, event);
}

/**
 * Build and append an agent analytics event.
 */
export function writeAgentEvent(
  analyticsDir: string,
  name: string,
  timestamp?: string,
): WriteResult {
  const event: AnalyticsEvent = {
    timestamp: timestamp ?? new Date().toISOString(),
    type: 'agent',
    name,
    success: true,
    plugin: 'specweave',
  };
  return appendAnalyticsEvent(analyticsDir, event);
}
