import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_MD_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/skills/brainstorm/SKILL.md'
);

function readSkillMd(): string {
  return fs.readFileSync(SKILL_MD_PATH, 'utf-8');
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      fm[key] = value;
    }
  }
  return fm;
}

describe('Brainstorm SKILL.md — Core (US-001)', () => {
  const content = readSkillMd();
  const fm = parseFrontmatter(content);

  describe('AC-US1-01: Frontmatter', () => {
    it('has context: fork', () => {
      expect(fm['context']).toBe('fork');
    });

    it('has model: opus', () => {
      expect(fm['model']).toBe('opus');
    });

    it('description contains auto-activation keywords', () => {
      const desc = fm['description'].toLowerCase();
      expect(desc).toContain('brainstorm');
      expect(desc).toContain('ideate');
      expect(desc).toContain('explore');
    });

    it('argument-hint contains --depth and --lens', () => {
      const hint = fm['argument-hint'];
      expect(hint).toContain('--depth');
      expect(hint).toContain('--lens');
    });
  });

  describe('AC-US1-02: 5-Phase Flow', () => {
    it('defines all 5 phases in order', () => {
      const phasePatterns = [
        /Phase 1[:\s]*Frame/i,
        /Phase 2[:\s]*Diverge/i,
        /Phase 3[:\s]*Evaluate/i,
        /Phase 4[:\s]*Deepen/i,
        /Phase 5[:\s]*Output/i,
      ];
      const positions = phasePatterns.map((p) => {
        const m = content.match(p);
        expect(m, `Phase pattern ${p} not found`).toBeTruthy();
        return content.indexOf(m![0]);
      });
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
    });

    it('each phase has a description block', () => {
      const phases = ['Frame', 'Diverge', 'Evaluate', 'Deepen', 'Output'];
      for (const phase of phases) {
        const regex = new RegExp(`## Phase \\d+[:\\s]*${phase}[\\s\\S]*?(?=## Phase|## (?!Phase)|$)`, 'i');
        const match = content.match(regex);
        expect(match, `Phase ${phase} section missing`).toBeTruthy();
        expect(match![0].length).toBeGreaterThan(50);
      }
    });
  });

  describe('AC-US1-03: Depth Modes', () => {
    it('quick mode references Frame and Evaluate (skips Diverge and Deepen)', () => {
      // Quick mode should go Frame -> Evaluate -> Output
      expect(content).toMatch(/quick.*Frame.*Evaluate/is);
    });

    it('standard mode references Frame, Diverge, Evaluate, Output', () => {
      expect(content).toMatch(/standard.*Frame.*Diverge.*Evaluate.*Output/is);
    });

    it('deep mode references all 5 phases', () => {
      expect(content).toMatch(/deep.*Frame.*Diverge.*Evaluate.*Deepen.*Output/is);
    });

    it('standard is the default depth', () => {
      // Should specify standard as default
      expect(content).toMatch(/--depth.*\|.*standard/i);
    });
  });

  describe('AC-US1-04: DOT Process Flow Graph', () => {
    it('contains a digraph brainstorm block', () => {
      expect(content).toMatch(/digraph brainstorm\s*\{/);
    });

    it('contains key phase nodes', () => {
      const requiredNodes = ['frame', 'diverge', 'evaluate', 'deepen', 'output'];
      for (const node of requiredNodes) {
        expect(content).toMatch(new RegExp(`${node}\\s*\\[`, 'i'));
      }
    });

    it('contains depth-mode edge labels', () => {
      expect(content).toMatch(/quick/);
      expect(content).toMatch(/standard/);
      expect(content).toMatch(/deep/);
    });
  });

  describe('AC-US1-05: Token Budgets', () => {
    it('Frame has a token budget', () => {
      // Frame budget should be specified (around 400-500)
      expect(content).toMatch(/Frame.*(?:400|500).*token/is);
    });

    it('Diverge has a token budget', () => {
      expect(content).toMatch(/Diverge.*(?:600|800).*token/is);
    });

    it('Evaluate has a token budget', () => {
      expect(content).toMatch(/Evaluate.*(?:500|600).*token/is);
    });

    it('Deepen has a token budget', () => {
      expect(content).toMatch(/Deepen.*(?:500|1000).*token/is);
    });

    it('Output has a token budget', () => {
      expect(content).toMatch(/Output.*(?:400).*token/is);
    });

    it('token budget table exists', () => {
      expect(content).toMatch(/Token Budget/i);
      expect(content).toMatch(/\| Phase\s*\|.*Target/i);
    });
  });

  describe('Line count constraint', () => {
    it('SKILL.md is at most 600 lines', () => {
      const lines = content.split('\n');
      expect(lines.length).toBeLessThanOrEqual(600);
    });
  });
});
