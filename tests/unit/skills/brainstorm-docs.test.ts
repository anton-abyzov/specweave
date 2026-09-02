import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('Brainstorm Skill — Docs & Template (US-003: AC-US3-07/08)', () => {
  describe('AC-US3-08: docs-site skills reference', () => {
    const skillsRef = readFile('docs-site/docs/reference/skills.md');

    it('lists sw:brainstorm in skills table', () => {
      expect(skillsRef).toMatch(/sw:brainstorm/);
    });

    it('has brainstorm usage examples or description', () => {
      // Should have some content beyond just a table row
      const brainstormContent = skillsRef
        .split('\n')
        .filter((l) => l.toLowerCase().includes('brainstorm'));
      expect(brainstormContent.length).toBeGreaterThan(1);
    });

    it('lists at least 3 auto-activation keywords', () => {
      const lower = skillsRef.toLowerCase();
      const keywords = [
        'brainstorm',
        'ideate',
        'explore',
        'what are our options',
        'think about',
        'tree of thought',
        'design thinking',
      ];
      const found = keywords.filter((k) => lower.includes(k));
      expect(found.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('AC-US3-08: docs-site planning workflow', () => {
    const planning = readFile('docs-site/docs/workflows/planning.md');

    it('references brainstorm as pre-increment step', () => {
      expect(planning).toMatch(/brainstorm/i);
    });

    it('brainstorm step is marked as optional or research phase', () => {
      const lower = planning.toLowerCase();
      expect(lower).toMatch(/optional|research|before.*increment|pre.*increment/);
    });
  });
});
