import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_MD_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/skills/brainstorm/SKILL.md'
);

const content = fs.readFileSync(SKILL_MD_PATH, 'utf-8');

function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }
  return fm;
}

describe('Brainstorm SKILL.md — Persistence & Handoff (US-003 partial)', () => {
  describe('AC-US3-01: Output document structure', () => {
    it('specifies save path under .specweave/docs/brainstorms/', () => {
      expect(content).toContain('.specweave/docs/brainstorms/');
    });

    it('filename includes date and slug placeholders', () => {
      expect(content).toMatch(/YYYY-MM-DD/);
      expect(content).toMatch(/slug/i);
    });

    it('output template includes Problem Frame section', () => {
      expect(content).toMatch(/## Problem Frame/);
    });

    it('output template includes Approaches section', () => {
      expect(content).toMatch(/## Approaches/);
    });

    it('output template includes Evaluation Matrix section', () => {
      expect(content).toMatch(/## Evaluation Matrix/);
    });

    it('output template includes Deep Analysis section', () => {
      expect(content).toMatch(/## Deep Analysis/);
    });

    it('output template includes Idea Tree section', () => {
      expect(content).toMatch(/## Idea Tree/);
    });

    it('output template includes Next Steps section', () => {
      expect(content).toMatch(/## Next Steps/);
    });

    it('output template includes ranked ideas with scores', () => {
      // Evaluation matrix should have scoring columns
      expect(content).toMatch(/\|\s*Criterion\s*\|/);
      expect(content).toMatch(/Total/);
    });
  });

  describe('AC-US3-02: State file schema and resumability', () => {
    it('specifies state file path under .specweave/state/brainstorm-', () => {
      expect(content).toContain('.specweave/state/brainstorm-');
    });

    it('state schema includes sessionId or topic field', () => {
      expect(content).toMatch(/"topic"/);
    });

    it('state schema includes lens/depth fields', () => {
      expect(content).toMatch(/"depth"/);
    });

    it('state schema includes startedAt timestamp', () => {
      expect(content).toMatch(/"startedAt"/);
    });

    it('state schema includes phase tracking', () => {
      expect(content).toMatch(/"phase"/);
    });

    it('contains resume instruction (check state file)', () => {
      expect(content).toMatch(/resume|--resume/i);
      // State file should be referenced in resume context
      expect(content).toMatch(/state.*file|find.*state/i);
    });

    it('supports resuming from last completed phase', () => {
      expect(content).toMatch(/resume.*(?:from|last|completed|phase)/i);
    });
  });

  describe('AC-US3-03: Increment handoff protocol', () => {
    it('references sw:increment invocation', () => {
      expect(content).toMatch(/sw:increment/);
    });

    it('contains handoff trigger phrases', () => {
      expect(content).toMatch(/(?:proceed|turn|increment)/i);
    });

    it('passes brainstorm context to increment', () => {
      // Should include problem statement, selected approach, etc. in the handoff
      expect(content).toMatch(/BRAINSTORM CONTEXT|problem|selected approach/i);
    });

    it('documents handoff via Skill() call', () => {
      expect(content).toMatch(/Skill\(\s*\{[\s\S]*?skill.*sw:increment/i);
    });
  });

  describe('AC-US3-09: Auto-activation keywords', () => {
    const fm = parseFrontmatter(content);
    const desc = (fm['description'] || '').toLowerCase();

    it('description contains "brainstorm"', () => {
      expect(desc).toContain('brainstorm');
    });

    it('description contains "explore ideas" or "explore"', () => {
      expect(desc).toMatch(/explore\s+ideas|explore/);
    });

    it('description contains "think" related keyword', () => {
      // "think about approaches" or "think through"
      expect(desc).toMatch(/think/);
    });

    it('description contains "what" related keyword', () => {
      // "what are our options" or "what if"
      expect(desc).toMatch(/what/);
    });

    it('description contains "ideate"', () => {
      expect(desc).toContain('ideate');
    });

    it('description contains exploration keyword', () => {
      // "diverge", "alternatives", "explore alternatives"
      expect(desc).toMatch(/alternative|explore|diverge|options/);
    });
  });
});
