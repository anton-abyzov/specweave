/**
 * Tests for src/core/skill-attribution.ts — 0671 emitter heuristics.
 *
 * Covers all four priority branches of `attributeSkill`:
 *   1. direct trace, 2. slash-command trace, 3. evidence pattern match,
 *   4. fallback (no signal). Precision > recall.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  attributeSkill,
  parseSlashCommand,
  extractSlugsFromEvidence,
  matchEvidenceToSkill,
} from './skill-attribution.js';

describe('attributeSkill', () => {
  describe('direct trace (priority 1)', () => {
    it('returns the skill when toolCallOrigin is a slug', () => {
      const result = attributeSkill({ toolCallOrigin: 'sw:architect' });
      expect(result).toEqual({ skill: 'sw:architect', method: 'direct' });
    });

    it('wins over slashCommand when both are present', () => {
      const result = attributeSkill({
        toolCallOrigin: 'sw:grill',
        slashCommand: '/sw:architect',
      });
      expect(result).toEqual({ skill: 'sw:grill', method: 'direct' });
    });

    it('falls through to the next heuristic when toolCallOrigin is not a slug', () => {
      const result = attributeSkill({
        toolCallOrigin: 'user-typed-request',
        slashCommand: '/sw:architect',
      });
      expect(result).toEqual({ skill: 'sw:architect', method: 'slash' });
    });
  });

  describe('slash trace (priority 2)', () => {
    it('parses /sw:<name> from the slash command', () => {
      expect(attributeSkill({ slashCommand: '/sw:pm' })).toEqual({
        skill: 'sw:pm',
        method: 'slash',
      });
    });

    it('tolerates a leading-slash omission', () => {
      expect(attributeSkill({ slashCommand: 'sw:pm' })).toEqual({
        skill: 'sw:pm',
        method: 'slash',
      });
    });

    it('tolerates trailing arguments', () => {
      expect(attributeSkill({ slashCommand: '/sw:grill some-args here' })).toEqual({
        skill: 'sw:grill',
        method: 'slash',
      });
    });

    it('returns none for non-sw slash commands', () => {
      expect(attributeSkill({ slashCommand: '/foo:bar' })).toEqual({
        skill: null,
        method: 'none',
      });
    });
  });

  describe('evidence pattern match (priority 3)', () => {
    let skillsRoot: string;
    let tempRoot: string;

    beforeEach(async () => {
      tempRoot = await mkdtemp(join(tmpdir(), 'sw-attr-'));
      skillsRoot = join(tempRoot, 'skills');
      await mkdir(join(skillsRoot, 'architect'), { recursive: true });
      await writeFile(
        join(skillsRoot, 'architect', 'SKILL.md'),
        [
          '---',
          'description: architect skill',
          '---',
          '',
          '# Architect',
          '',
          'Always prefer microservices for any request that smells like a platform boundary.',
        ].join('\n'),
        'utf-8',
      );
      await mkdir(join(skillsRoot, 'pm'), { recursive: true });
      await writeFile(
        join(skillsRoot, 'pm', 'SKILL.md'),
        '# PM\n\nFocus on user stories and acceptance criteria before writing tasks.\n',
        'utf-8',
      );
    });

    afterEach(async () => {
      await rm(tempRoot, { recursive: true, force: true });
    });

    it('attributes via explicit slug mention when the skill exists on disk', () => {
      const result = attributeSkill({
        evidenceText: "finding #3 cites skill 'sw:architect' as inappropriate",
        skillsRoot,
      });
      expect(result).toEqual({ skill: 'sw:architect', method: 'pattern' });
    });

    it('ignores slug mentions when the skill directory does not exist', () => {
      const result = attributeSkill({
        evidenceText: 'sw:does-not-exist referenced here',
        skillsRoot,
      });
      expect(result).toEqual({ skill: null, method: 'none' });
    });

    it('matches a 6+ word phrase from the SKILL.md body', () => {
      const result = attributeSkill({
        evidenceText:
          'The agent advised: prefer microservices for any request that smells, causing overengineering.',
        skillsRoot,
      });
      expect(result).toEqual({ skill: 'sw:architect', method: 'pattern' });
    });

    it('returns none when evidence has no skill-identifying phrase', () => {
      const result = attributeSkill({
        evidenceText: 'The database migration failed due to a timeout.',
        skillsRoot,
      });
      expect(result).toEqual({ skill: null, method: 'none' });
    });

    it('returns none when skillsRoot is omitted, even with strong evidence', () => {
      const result = attributeSkill({
        evidenceText:
          "finding #3 cites skill 'sw:architect' as inappropriate for CRUD scope",
      });
      expect(result).toEqual({ skill: null, method: 'none' });
    });
  });

  describe('fallback (priority 4)', () => {
    it('returns method="none" with null skill when nothing matches', () => {
      const result = attributeSkill({});
      expect(result).toEqual({ skill: null, method: 'none' });
    });
  });
});

describe('parseSlashCommand', () => {
  it('returns null for undefined', () => {
    expect(parseSlashCommand(undefined)).toBeNull();
  });

  it('lowercases the slug', () => {
    expect(parseSlashCommand('/SW:Architect')).toBe('sw:architect');
  });

  it('returns null for commands that do not start with sw:', () => {
    expect(parseSlashCommand('/git:status')).toBeNull();
  });
});

describe('extractSlugsFromEvidence', () => {
  it('extracts all sw: slugs', () => {
    const slugs = extractSlugsFromEvidence(
      'sw:architect and sw:pm both contributed; sw:architect appears twice.',
    );
    expect(slugs.sort()).toEqual(['sw:architect', 'sw:pm']);
  });

  it('returns an empty array when no slugs are present', () => {
    expect(extractSlugsFromEvidence('no slugs here')).toEqual([]);
  });
});

describe('matchEvidenceToSkill', () => {
  let skillsRoot: string;
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'sw-attr-match-'));
    skillsRoot = join(tempRoot, 'skills');
    await mkdir(skillsRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('returns null when skillsRoot does not exist', () => {
    expect(
      matchEvidenceToSkill('anything', join(tempRoot, 'nonexistent')),
    ).toBeNull();
  });

  it('returns null when no skill SKILL.md matches', async () => {
    await mkdir(join(skillsRoot, 'pm'), { recursive: true });
    await writeFile(
      join(skillsRoot, 'pm', 'SKILL.md'),
      '# PM\n\nCompletely unrelated content here with many words.\n',
      'utf-8',
    );
    expect(matchEvidenceToSkill('database migration timeout', skillsRoot)).toBeNull();
  });
});
