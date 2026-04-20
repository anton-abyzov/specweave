/**
 * Skill Attribution Heuristics
 *
 * When a closure gate (judge-llm, rubric, code-reviewer) fails, it may or may
 * not be possible to trace the failure to a specific skill's instructions.
 * This module applies the attribution heuristics defined in 0671's plan.md
 * and returns the attributed skill slug (or null when attribution is
 * ambiguous — precision over recall).
 *
 * Priority order (first match wins):
 *   1. direct  — the failing step's originating tool call was made from a
 *                skill's Task() prompt
 *   2. slash   — the increment was initiated with `/sw:<skill>`
 *   3. pattern — the failure evidence text contains a 6+ word phrase from a
 *                skill's SKILL.md (exact-match)
 *   4. none    — no signal is emitted
 *
 * @module core/skill-attribution
 */

import * as fs from 'fs';
import * as path from 'path';

export type AttributionMethod = 'direct' | 'slash' | 'pattern' | 'none';

export interface AttributeSkillInput {
  /**
   * The skill slug that originated the currently-executing Task() prompt,
   * if known. When present, this is the authoritative attribution.
   */
  toolCallOrigin?: string;
  /**
   * The slash command that initiated the increment, e.g. `/sw:architect`.
   * Accepts either `/sw:architect` or `sw:architect`.
   */
  slashCommand?: string;
  /**
   * The failure evidence text (e.g. judge-llm concerns, rubric rationale,
   * code-review finding description) to scan for skill-authored phrases.
   */
  evidenceText?: string;
  /**
   * Directory containing skill plugin folders (each with a `SKILL.md`). Used
   * only for pattern-match attribution. When omitted, pattern-match is
   * skipped.
   */
  skillsRoot?: string;
}

export interface AttributionResult {
  /** Skill slug (e.g. "sw:architect") or null when attribution fails. */
  skill: string | null;
  /** Which heuristic produced the result. */
  method: AttributionMethod;
}

const MIN_PATTERN_WORDS = 6;
const SKILL_SLUG_RE = /\b(sw:[a-z][a-z0-9-]+)\b/i;

/**
 * Attribute a gate failure to a specific skill. Returns `{skill: null,
 * method: "none"}` when no heuristic matches with enough confidence to emit.
 *
 * Attribution is intentionally precision-biased: gates should not emit a
 * refinement signal against a skill that may not have been at fault.
 */
export function attributeSkill(input: AttributeSkillInput): AttributionResult {
  // 1. Direct trace — highest priority.
  if (input.toolCallOrigin && isSkillSlug(input.toolCallOrigin)) {
    return { skill: normalizeSlug(input.toolCallOrigin), method: 'direct' };
  }

  // 2. Slash-command trace.
  const slashSkill = parseSlashCommand(input.slashCommand);
  if (slashSkill) {
    return { skill: slashSkill, method: 'slash' };
  }

  // 3. Evidence pattern match against skills' SKILL.md.
  if (input.evidenceText && input.skillsRoot) {
    const matched = matchEvidenceToSkill(input.evidenceText, input.skillsRoot);
    if (matched) return { skill: matched, method: 'pattern' };
  }

  return { skill: null, method: 'none' };
}

/**
 * Extract a skill slug from a slash command, if one is present. Accepts
 * `/sw:architect`, `sw:architect`, or `/sw:architect some-args`.
 */
export function parseSlashCommand(cmd: string | undefined): string | null {
  if (!cmd) return null;
  const trimmed = cmd.trim().replace(/^\//, '');
  const match = SKILL_SLUG_RE.exec(trimmed);
  if (!match) return null;
  return normalizeSlug(match[1]);
}

function isSkillSlug(value: string): boolean {
  return SKILL_SLUG_RE.test(value);
}

function normalizeSlug(value: string): string {
  const match = SKILL_SLUG_RE.exec(value);
  return match ? match[1].toLowerCase() : value.toLowerCase();
}

/**
 * Extract skill slugs referenced directly in evidence text (e.g. "skill
 * 'sw:architect' advised microservices"). Used as a low-cost fallback before
 * the more expensive SKILL.md pattern scan.
 */
export function extractSlugsFromEvidence(evidenceText: string): string[] {
  const out = new Set<string>();
  const re = /\b(sw:[a-z][a-z0-9-]+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(evidenceText)) !== null) {
    out.add(m[1].toLowerCase());
  }
  return Array.from(out);
}

/**
 * Scan skill plugin directories under `skillsRoot` for SKILL.md files and
 * check whether any contiguous 6-word phrase from a skill's SKILL.md appears
 * verbatim in the evidence text. Returns the first skill slug whose content
 * matches (skills are scanned in alphabetical order for deterministic output).
 *
 * Best-effort: swallows I/O errors and returns null rather than throwing.
 */
export function matchEvidenceToSkill(
  evidenceText: string,
  skillsRoot: string,
): string | null {
  // Cheap path: an explicit mention of a slug in the evidence is already a
  // strong signal. Verify the slug corresponds to a real skill under
  // skillsRoot before returning.
  const mentioned = extractSlugsFromEvidence(evidenceText);
  for (const slug of mentioned) {
    const dir = slugToDirName(slug);
    const candidate = path.join(skillsRoot, dir, 'SKILL.md');
    if (safeExists(candidate)) {
      return slug;
    }
  }

  const normalizedEvidence = normalizeForMatch(evidenceText);

  let entries: string[];
  try {
    entries = fs.readdirSync(skillsRoot).sort();
  } catch {
    return null;
  }

  for (const entry of entries) {
    const skillMd = path.join(skillsRoot, entry, 'SKILL.md');
    if (!safeExists(skillMd)) continue;

    let content: string;
    try {
      content = fs.readFileSync(skillMd, 'utf-8');
    } catch {
      continue;
    }

    if (containsNGramMatch(normalizedEvidence, normalizeForMatch(content))) {
      return `sw:${entry}`;
    }
  }

  return null;
}

function safeExists(file: string): boolean {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function slugToDirName(slug: string): string {
  // `sw:architect` → `architect`; fall back to the raw value when malformed.
  const idx = slug.indexOf(':');
  return idx >= 0 ? slug.slice(idx + 1) : slug;
}

function normalizeForMatch(text: string): string {
  // Lowercase + collapse whitespace. No stemming — we require exact 6-word
  // phrase matches which makes accidental overlap very unlikely.
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * True when `haystack` contains any contiguous N-word window from
 * `needleSource` (N = MIN_PATTERN_WORDS). Linear in the length of
 * `needleSource`.
 */
function containsNGramMatch(haystack: string, needleSource: string): boolean {
  const words = needleSource.split(' ').filter(Boolean);
  if (words.length < MIN_PATTERN_WORDS) return false;

  for (let i = 0; i + MIN_PATTERN_WORDS <= words.length; i++) {
    const phrase = words.slice(i, i + MIN_PATTERN_WORDS).join(' ');
    // Skip phrases that are too generic (all words < 3 chars) — reduces
    // false positives from markdown boilerplate like "## use this tool to".
    if (phrase.replace(/[a-z0-9]/gi, '').length === phrase.length) continue;
    if (phrase.split(' ').every((w) => w.length < 3)) continue;
    if (haystack.includes(phrase)) return true;
  }
  return false;
}
