import { describe, it, expect } from 'vitest';
import {
  detectContradictions,
  type SkillContent,
} from '../../../../src/core/fabric/contradiction-detector.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeSkill(id: string, content: string): SkillContent {
  return { id, name: id, content };
}

// ─── Edge Cases ───────────────────────────────────────────────────────────

describe('detectContradictions edge cases', () => {
  it('returns empty for empty input', () => {
    const result = detectContradictions([]);
    expect(result.contradictions).toHaveLength(0);
    expect(result.analyzedSkills).toHaveLength(0);
  });

  it('returns empty for single skill', () => {
    const result = detectContradictions([
      makeSkill('only-skill', 'Always use TypeScript.'),
    ]);
    expect(result.contradictions).toHaveLength(0);
    expect(result.analyzedSkills).toEqual(['only-skill']);
  });

  it('returns empty for clean pair with no conflicts', () => {
    const result = detectContradictions([
      makeSkill('skill-a', '# Component Generator\n\nGenerate React components with tests.'),
      makeSkill('skill-b', '# Style Guide\n\nUse consistent naming conventions.'),
    ]);
    expect(result.contradictions).toHaveLength(0);
    expect(result.analyzedSkills).toEqual(['skill-a', 'skill-b']);
  });
});

// ─── Behavioral Contradictions ────────────────────────────────────────────

describe('behavioral contradiction detection', () => {
  it('detects "always X" vs "never X" opposition', () => {
    const result = detectContradictions([
      makeSkill('skill-a', 'Always use memoization for callbacks.'),
      makeSkill('skill-b', 'Never use memoization for simple values.'),
    ]);

    const behavioral = result.contradictions.filter(c => c.type === 'behavioral');
    expect(behavioral.length).toBeGreaterThanOrEqual(1);
    expect(behavioral[0].severity).toBe('medium');
    expect(behavioral[0].conflictingSkill).toBeDefined();
  });

  it('detects "prefer X" vs "avoid X" opposition', () => {
    const result = detectContradictions([
      makeSkill('skill-a', 'Prefer functional components over class components.'),
      makeSkill('skill-b', 'Avoid functional components in large forms.'),
    ]);

    const behavioral = result.contradictions.filter(c => c.type === 'behavioral');
    expect(behavioral.length).toBeGreaterThanOrEqual(1);
  });

  it('detects "use X" vs "do not use X" opposition', () => {
    const result = detectContradictions([
      makeSkill('skill-a', 'Use Redux for state management.'),
      makeSkill('skill-b', 'Do not use Redux in new projects.'),
    ]);

    const behavioral = result.contradictions.filter(c => c.type === 'behavioral');
    expect(behavioral.length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag same-skill internal directives as contradictions', () => {
    const result = detectContradictions([
      makeSkill('skill-a', 'Always use TypeScript.\nNever use TypeScript for scripts.'),
      makeSkill('skill-b', 'Write clean code.'),
    ]);

    // Should not flag skill-a's internal contradiction
    const crossSkill = result.contradictions.filter(
      c => c.conflictingSkill !== 'skill-a',
    );
    expect(crossSkill).toHaveLength(0);
  });
});

// ─── Configuration Contradictions ─────────────────────────────────────────

describe('configuration contradiction detection', () => {
  it('detects package manager conflict (npm vs ban-npm)', () => {
    const result = detectContradictions([
      makeSkill('react-skill', 'Run `npm run build` to compile.\nUse `npm install` for dependencies.'),
      makeSkill('bun-skill', 'Bun is the only toolkit.\nNever use npm or yarn.'),
    ]);

    const config = result.contradictions.filter(c => c.type === 'configuration');
    expect(config.length).toBeGreaterThanOrEqual(1);
    expect(config[0].severity).toBe('high');
  });

  it('does not flag when no package manager conflict exists', () => {
    const result = detectContradictions([
      makeSkill('skill-a', 'Use npm install for dependencies.'),
      makeSkill('skill-b', 'Use npm run test for testing.'),
    ]);

    const config = result.contradictions.filter(c => c.type === 'configuration');
    expect(config).toHaveLength(0);
  });

  it('detects yarn vs ban-yarn conflict', () => {
    const result = detectContradictions([
      makeSkill('yarn-skill', 'Run `yarn add` to install packages.'),
      makeSkill('pnpm-skill', 'Avoid yarn in all projects. Use pnpm instead.'),
    ]);

    const config = result.contradictions.filter(c => c.type === 'configuration');
    expect(config.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Result Structure ─────────────────────────────────────────────────────

describe('detection result structure', () => {
  it('includes all analyzed skill IDs', () => {
    const result = detectContradictions([
      makeSkill('alpha', 'Always use hooks.'),
      makeSkill('beta', 'Never use hooks in utilities.'),
      makeSkill('gamma', 'Write clean code.'),
    ]);

    expect(result.analyzedSkills).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('contradiction records have required fields', () => {
    const result = detectContradictions([
      makeSkill('skill-a', 'Always use TypeScript.'),
      makeSkill('skill-b', 'Never use TypeScript for config files.'),
    ]);

    for (const c of result.contradictions) {
      expect(c.type).toBeDefined();
      expect(c.severity).toBeDefined();
      expect(c.conflictingSkill).toBeDefined();
      expect(c.description).toBeDefined();
      expect(c.detectedAt).toBeDefined();
      expect(['behavioral', 'configuration', 'dependency', 'precedence']).toContain(c.type);
      expect(['high', 'medium', 'low']).toContain(c.severity);
    }
  });
});
