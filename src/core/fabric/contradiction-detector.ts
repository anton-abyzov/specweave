/**
 * Contradiction Detection System
 *
 * Detects contradictions between installed AI agent skills by analyzing
 * their SKILL.md content for opposing directives, conflicting configuration,
 * incompatible dependencies, and precedence ambiguity.
 */

import type {
  ContradictionRecord,
  ContradictionType,
  ContradictionSeverity,
} from './registry-schema.js';

/** Content extracted from a skill for contradiction analysis. */
export interface SkillContent {
  id: string;
  name: string;
  content: string;
  installPath?: string;
}

/** Result of running contradiction detection across a set of skills. */
export interface ContradictionDetectionResult {
  contradictions: ContradictionRecord[];
  analyzedSkills: string[];
}

// ─── Opposition Vocabulary ────────────────────────────────────────────────

const AFFIRMATIVE_VERBS = [
  'always', 'must', 'should', 'prefer', 'use', 'recommend', 'require', 'implement',
];

const NEGATIVE_VERBS = [
  'never use', 'must not use', 'should not use', 'do not use', "don't use",
  'never', 'must not', 'should not', 'avoid', 'do not', "don't", 'prohibit', 'deprecate', 'discourage',
];

const PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm', 'bun', 'deno'];

// ─── Directive Extraction ─────────────────────────────────────────────────

interface ExtractedDirective {
  verb: string;
  polarity: 'affirmative' | 'negative';
  subject: string;
  line: number;
  raw: string;
  skillId: string;
}

function extractDirectives(content: string, skillId: string): ExtractedDirective[] {
  const directives: ExtractedDirective[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();
    if (!line || line.startsWith('#') || line.startsWith('```')) continue;

    for (const verb of NEGATIVE_VERBS) {
      const idx = line.indexOf(verb + ' ');
      if (idx !== -1) {
        const subject = line.slice(idx + verb.length + 1).trim().split(/[.,;!?]/)[0].trim();
        if (subject.length > 2 && subject.length < 80) {
          directives.push({
            verb,
            polarity: 'negative',
            subject: normalizeSubject(subject),
            line: i + 1,
            raw: lines[i].trim(),
            skillId,
          });
        }
      }
    }

    for (const verb of AFFIRMATIVE_VERBS) {
      const idx = line.indexOf(verb + ' ');
      if (idx !== -1) {
        const subject = line.slice(idx + verb.length + 1).trim().split(/[.,;!?]/)[0].trim();
        if (subject.length > 2 && subject.length < 80) {
          directives.push({
            verb,
            polarity: 'affirmative',
            subject: normalizeSubject(subject),
            line: i + 1,
            raw: lines[i].trim(),
            skillId,
          });
        }
      }
    }
  }

  return directives;
}

function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(a|an|the|to)\s+/i, '')
    .replace(/['""`]/g, '')
    // Strip qualifiers to extract core topic
    .replace(/\s+(for|in|when|over|with|on|at|from|into|about)\s+.*$/i, '')
    .trim()
    .toLowerCase();
}

// ─── Behavioral Contradiction Detection ───────────────────────────────────

function detectBehavioralContradictions(skills: SkillContent[]): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];
  const allDirectives: ExtractedDirective[] = [];

  for (const skill of skills) {
    allDirectives.push(...extractDirectives(skill.content, skill.id));
  }

  // Group by subject
  const bySubject = new Map<string, ExtractedDirective[]>();
  for (const d of allDirectives) {
    const existing = bySubject.get(d.subject) ?? [];
    existing.push(d);
    bySubject.set(d.subject, existing);
  }

  for (const [subject, directives] of bySubject) {
    const skillIds = new Set(directives.map(d => d.skillId));
    if (skillIds.size < 2) continue;

    const affirmatives = directives.filter(d => d.polarity === 'affirmative');
    const negatives = directives.filter(d => d.polarity === 'negative');

    for (const aff of affirmatives) {
      for (const neg of negatives) {
        if (aff.skillId === neg.skillId) continue;

        contradictions.push({
          type: 'behavioral',
          severity: 'medium',
          conflictingSkill: neg.skillId,
          description: `Opposing directives on "${subject}": "${aff.raw}" vs "${neg.raw}"`,
          thisInstruction: aff.raw,
          otherInstruction: neg.raw,
          resolution: 'user-choice',
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  return contradictions;
}

// ─── Configuration Contradiction Detection ────────────────────────────────

function extractPackageManagers(content: string): string[] {
  const found = new Set<string>();
  const lower = content.toLowerCase();
  for (const pm of PACKAGE_MANAGERS) {
    if (lower.includes(pm + ' ') || lower.includes(pm + '\n') ||
        lower.includes('`' + pm) || lower.includes(pm + '`')) {
      found.add(pm);
    }
  }
  return [...found];
}

function detectConfigContradictions(skills: SkillContent[]): ContradictionRecord[] {
  const contradictions: ContradictionRecord[] = [];

  // Check for package manager conflicts
  const skillPMs = new Map<string, string[]>();
  const pmBans = new Map<string, Set<string>>();

  for (const skill of skills) {
    const pms = extractPackageManagers(skill.content);
    if (pms.length > 0) {
      skillPMs.set(skill.id, pms);
    }

    // Check for "never use X" patterns for package managers
    const lower = skill.content.toLowerCase();
    const bans = new Set<string>();
    for (const pm of PACKAGE_MANAGERS) {
      if (lower.includes('never use ' + pm) || lower.includes("don't use " + pm) ||
          lower.includes('do not use ' + pm) || lower.includes('avoid ' + pm)) {
        bans.add(pm);
      }
    }
    if (bans.size > 0) {
      pmBans.set(skill.id, bans);
    }
  }

  // Cross-compare: skill A uses npm, skill B bans npm
  for (const [skillA, pms] of skillPMs) {
    for (const [skillB, bans] of pmBans) {
      if (skillA === skillB) continue;
      for (const pm of pms) {
        if (bans.has(pm)) {
          contradictions.push({
            type: 'configuration',
            severity: 'high',
            conflictingSkill: skillB,
            description: `Package manager conflict: "${skillA}" uses ${pm}, but "${skillB}" bans it`,
            thisInstruction: `Uses ${pm}`,
            otherInstruction: `Bans ${pm}`,
            resolution: 'user-choice',
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return contradictions;
}

// ─── Dependency Contradiction Detection (stub) ────────────────────────────

function detectDependencyContradictions(_skills: SkillContent[]): ContradictionRecord[] {
  // Stub: full implementation requires API version table and project context
  return [];
}

// ─── Precedence Contradiction Detection (stub) ────────────────────────────

function detectPrecedenceContradictions(_skills: SkillContent[]): ContradictionRecord[] {
  // Stub: full implementation requires scope/tier metadata
  return [];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────

/**
 * Detects contradictions across a set of installed skills.
 *
 * Runs behavioral and configuration heuristics to find opposing
 * directives and incompatible tool preferences between skills.
 *
 * @param skills - Array of skill content to analyze
 * @returns Detection result with all found contradictions
 */
export function detectContradictions(
  skills: SkillContent[],
): ContradictionDetectionResult {
  if (skills.length < 2) {
    return {
      contradictions: [],
      analyzedSkills: skills.map(s => s.id),
    };
  }

  const contradictions: ContradictionRecord[] = [
    ...detectBehavioralContradictions(skills),
    ...detectConfigContradictions(skills),
    ...detectDependencyContradictions(skills),
    ...detectPrecedenceContradictions(skills),
  ];

  return {
    contradictions,
    analyzedSkills: skills.map(s => s.id),
  };
}
