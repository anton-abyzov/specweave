/**
 * Skill catalog: which SpecWeave skills a project gets.
 *
 * `skills/catalog.json` (copied to `plugins/specweave/skills-catalog.json` by
 * scripts/build/generate-skills.mjs) lists the core skills every project gets,
 * the optional ones, and the retired ones `update` removes. An optional skill is
 * on when `.specweave/config.json` lists it under `skills.enabled`, or when its
 * detect rule matches and it is not under `skills.disabled`.
 *
 * @module core/skills/catalog
 */

import * as fs from 'fs';
import * as path from 'path';

export type DetectRule = 'deep-interview' | 'glossary-file' | 'tracker' | 'hub' | 'jev';

export interface OptionalSkill {
  name: string;
  summary: string;
  detect?: DetectRule;
}

export interface SkillCatalog {
  core: string[];
  optional: OptionalSkill[];
  retired: string[];
}

export interface SkillsConfig {
  /** Optional skills to install even when nothing detects them. */
  enabled?: string[];
  /** Optional skills to leave out even when detected. */
  disabled?: string[];
}

export type SkillState =
  | { name: string; tier: 'core'; on: true; reason: 'core' }
  | { name: string; tier: 'optional'; on: boolean; reason: 'enabled' | 'disabled' | 'detected' | 'off'; detail?: string; summary: string };

export function readSkillCatalog(pluginRoot: string): SkillCatalog {
  const file = path.join(pluginRoot, 'skills-catalog.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<SkillCatalog>;
  if (!Array.isArray(raw.core) || !Array.isArray(raw.optional)) {
    throw new Error(`${file}: needs "core" and "optional" arrays`);
  }
  return { core: raw.core, optional: raw.optional, retired: raw.retired ?? [] };
}

function readConfig(projectRoot: string): Record<string, any> | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf8')) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Short names from a config list; tolerates `sw-` prefixes and non-arrays. */
function names(list: unknown): Set<string> {
  if (!Array.isArray(list)) return new Set();
  return new Set(list.filter((n): n is string => typeof n === 'string').map((n) => n.replace(/^sw-/, '')));
}

function trackerConfigured(config: Record<string, any> | undefined): string | undefined {
  const sync = config?.sync;
  for (const provider of ['github', 'jira', 'ado']) {
    if (sync?.[provider]?.enabled === true) return `sync.${provider}.enabled`;
  }
  if (sync?.profiles && typeof sync.profiles === 'object' && Object.keys(sync.profiles).length > 0) return 'sync.profiles';
  if (sync?.enabled === true) return 'sync.enabled';
  const tracker = config?.issueTracker?.provider;
  if (typeof tracker === 'string' && tracker !== '' && tracker !== 'none') return `issueTracker.provider: ${tracker}`;
  return undefined;
}

/** Why a detect rule matches in this project, or undefined when it does not. */
export function detectSkill(rule: DetectRule | undefined, projectRoot: string, config: Record<string, any> | undefined): string | undefined {
  switch (rule) {
    case 'deep-interview':
      return config?.planning?.deepInterview === 'deep' ? 'planning.deepInterview: deep' : undefined;
    case 'glossary-file':
      for (const f of ['GLOSSARY.md', 'GLOSSARY-MAP.md']) if (fs.existsSync(path.join(projectRoot, f))) return f;
      return undefined;
    case 'tracker':
      return trackerConfigured(config);
    case 'hub':
      return fs.existsSync(path.join(projectRoot, '.specweave', 'project', 'hub.json')) ? '.specweave/project/hub.json' : undefined;
    case 'jev':
      return config?.jev?.enabled === true ? 'jev.enabled' : undefined;
    default:
      return undefined;
  }
}

/** Every catalog skill with its state in this project, core first. */
export function resolveSkills(projectRoot: string, catalog: SkillCatalog, config = readConfig(projectRoot)): SkillState[] {
  const skills = (config?.skills ?? {}) as SkillsConfig;
  const enabled = names(skills.enabled);
  const disabled = names(skills.disabled);
  const out: SkillState[] = catalog.core.map((name) => ({ name, tier: 'core', on: true, reason: 'core' }));
  for (const s of catalog.optional) {
    const base = { name: s.name, tier: 'optional' as const, summary: s.summary };
    if (enabled.has(s.name)) out.push({ ...base, on: true, reason: 'enabled' });
    else if (disabled.has(s.name)) out.push({ ...base, on: false, reason: 'disabled' });
    else {
      const why = detectSkill(s.detect, projectRoot, config);
      out.push(why ? { ...base, on: true, reason: 'detected', detail: why } : { ...base, on: false, reason: 'off' });
    }
  }
  return out;
}

/** Names in a config list that are not optional skills (typos, core skills). */
export function unknownSkillNames(list: unknown, catalog: SkillCatalog): string[] {
  const optional = new Set(catalog.optional.map((s) => s.name));
  return [...names(list)].filter((n) => !optional.has(n));
}
