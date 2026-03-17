import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('Brainstorm Skill — Integration (US-003: AC-US3-04/05/06)', () => {
  describe('AC-US3-04: Plugin registration in specweave PLUGIN.md', () => {
    const pluginMd = readFile('plugins/specweave/PLUGIN.md');

    it('brainstorm appears in the skills table', () => {
      expect(pluginMd).toMatch(/\|\s*brainstorm\s*\|/);
    });

    it('brainstorm description references cognitive frameworks', () => {
      const brainstormLine = pluginMd
        .split('\n')
        .find((l) => l.match(/\|\s*brainstorm\s*\|/));
      expect(brainstormLine).toBeTruthy();
      expect(brainstormLine!.toLowerCase()).toMatch(
        /cognitive|lense|ideation|perspective/
      );
    });
  });

  describe('AC-US3-05: Brainstorm skill in unified PLUGIN.md', () => {
    const pluginMd = readFile('plugins/specweave/PLUGIN.md');

    it('brainstorm skill is listed in unified plugin', () => {
      const bsRow = pluginMd
        .split('\n')
        .find((l) => l.includes('brainstorm'));
      expect(bsRow).toBeTruthy();
    });

    it('spec-driven-brainstorming is no longer listed (superseded)', () => {
      expect(pluginMd).not.toContain('spec-driven-brainstorming');
    });
  });

  describe('AC-US3-06: Source code references updated', () => {
    describe('claude-md-generator.ts', () => {
      const gen = readFile('src/adapters/claude-md-generator.ts');

      it('filter list contains brainstorm (not spec-driven-brainstorming)', () => {
        expect(gen).toMatch(/'brainstorm'/);
        // Ensure old name is not in the filter list context
        expect(gen).not.toMatch(/'spec-driven-brainstorming'/);
      });

      it('activation map has brainstorm key', () => {
        expect(gen).toMatch(/['"]brainstorm['"]\s*:/);
      });
    });

    describe('agents-md-generator.ts', () => {
      const gen = readFile('src/adapters/agents-md-generator.ts');

      it('activation map has brainstorm key', () => {
        expect(gen).toMatch(/['"]brainstorm['"]\s*:/);
      });

      it('old spec-driven-brainstorming key is removed', () => {
        expect(gen).not.toMatch(/['"]spec-driven-brainstorming['"]/);
      });
    });

    describe('llm-plugin-detector.ts', () => {
      const detector = readFile(
        'src/core/lazy-loading/llm-plugin-detector.ts'
      );

      it('does not contain docs:brainstorming', () => {
        expect(detector).not.toContain('docs:brainstorming');
      });
    });

    describe('generate-skills-index.ts', () => {
      const idx = readFile('src/utils/generate-skills-index.ts');

      it('categorizes brainstorm in ORCHESTRATION', () => {
        expect(idx).toContain("'brainstorm'");
      });
    });
  });
});
