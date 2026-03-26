/**
 * Pre-compact hook handler — context pressure signal.
 *
 * Fires when Claude Code approaches context limits (before compaction).
 * Tracks compaction count, escalates pressure level, writes health alerts.
 *
 * Escalation: 1st=elevated, 2nd=critical, 3+=emergency
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn } from './types.js';

interface PressureState {
  level: string;
  compactionCount: number;
  lastCompaction: string;
}

function readPressure(filePath: string): number {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as PressureState;
    return typeof data.compactionCount === 'number' ? data.compactionCount : 0;
  } catch {
    return 0;
  }
}

function getLevel(count: number): string {
  if (count >= 3) return 'emergency';
  if (count >= 2) return 'critical';
  return 'elevated';
}

function getAdvice(level: string): string {
  switch (level) {
    case 'elevated':
      return 'Context budget reduced to compact. Session is running long.';
    case 'critical':
      return 'Context budget at minimal. Consider starting a new session or setting contextBudget.level to off.';
    case 'emergency':
      return 'Context budget stripped to off (3+ compactions). Strongly recommend starting a new session.';
    default:
      return '';
  }
}

export const handle: HandlerFn = async (_input, context) => {
  if (process.env.SPECWEAVE_DISABLE_HOOKS === '1') {
    return { continue: true };
  }

  const { stateDir, logsDir, timestamp } = context;

  fs.mkdirSync(stateDir, { recursive: true });

  const pressurePath = path.join(stateDir, 'context-pressure.json');
  const prevCount = readPressure(pressurePath);
  const newCount = prevCount + 1;
  const level = getLevel(newCount);
  const advice = getAdvice(level);

  // Write context-pressure.json
  const pressure: PressureState = {
    level,
    compactionCount: newCount,
    lastCompaction: timestamp,
  };
  fs.writeFileSync(pressurePath, JSON.stringify(pressure));

  // Write prompt-health-alert.json
  const alertPath = path.join(stateDir, 'prompt-health-alert.json');
  fs.writeFileSync(alertPath, JSON.stringify({
    level,
    compactionCount: newCount,
    advice,
    timestamp,
  }));

  // Log compaction event
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    const logEntry = `[${timestamp}] COMPACTION #${newCount} | level=${level} | ${advice}\n`;
    fs.appendFileSync(path.join(logsDir, 'prompt-health.log'), logEntry);
  } catch {
    // Never throw from logging
  }

  return { continue: true };
};
