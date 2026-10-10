/**
 * Gemini CLI reads only GEMINI.md unless `context.fileName` in
 * `.gemini/settings.json` lists other names. This adds AGENTS.md (and keeps
 * GEMINI.md) so Gemini sees the same instructions as every other tool,
 * including "pick up" and "hand off". Every other key is left as it was.
 *
 * @module adapters/gemini/context-setting
 */

import * as fs from 'fs';
import * as path from 'path';

export type GeminiContextResult = 'added' | 'present' | 'invalid';

export function ensureGeminiReadsAgentsMd(projectPath: string): GeminiContextResult {
  const file = path.join(projectPath, '.gemini', 'settings.json');
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'invalid';
      settings = parsed;
    } catch {
      return 'invalid'; // not ours to repair
    }
  }
  const context = settings.context && typeof settings.context === 'object' && !Array.isArray(settings.context)
    ? settings.context as Record<string, unknown>
    : {};
  const current = context.fileName;
  const names = Array.isArray(current) ? current.filter((n): n is string => typeof n === 'string')
    : typeof current === 'string' ? [current]
    : [];
  if (names.includes('AGENTS.md')) return 'present';
  const next = ['AGENTS.md', ...(names.length ? names : ['GEMINI.md'])];
  settings.context = { ...context, fileName: next };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  return 'added';
}
