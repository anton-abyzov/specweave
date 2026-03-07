import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_MD_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/skills/brainstorm/SKILL.md'
);

const content = fs.readFileSync(SKILL_MD_PATH, 'utf-8');

describe('Brainstorm SKILL.md — Lenses & Dispatch (US-002)', () => {
  describe('AC-US2-01: 5 Cognitive Lenses', () => {
    it('defines exactly 5 lenses', () => {
      const lensHeaders = content.match(/### Lens:/g);
      expect(lensHeaders).toBeTruthy();
      expect(lensHeaders!.length).toBe(5);
    });

    it('defines Default lens', () => {
      expect(content).toMatch(/### Lens:\s*Default/i);
    });

    it('defines Six Thinking Hats lens', () => {
      expect(content).toMatch(/### Lens:\s*Six Thinking Hats/i);
    });

    it('defines SCAMPER lens', () => {
      expect(content).toMatch(/### Lens:\s*SCAMPER/i);
    });

    it('defines TRIZ lens', () => {
      expect(content).toMatch(/### Lens:\s*TRIZ/i);
    });

    it('defines Adjacent Possible lens', () => {
      expect(content).toMatch(/### Lens:\s*Adjacent Possible/i);
    });
  });

  describe('AC-US2-01: Facet counts', () => {
    it('Six Hats has 6 facets (White, Red, Black, Yellow, Green, Blue)', () => {
      const hatsSection = content.match(/### Lens:\s*Six Thinking Hats[\s\S]*?(?=### Lens:[^:]|## [^#])/i);
      expect(hatsSection).toBeTruthy();
      const hats = hatsSection![0];
      expect(hats).toContain('White');
      expect(hats).toContain('Red');
      expect(hats).toContain('Black');
      expect(hats).toContain('Yellow');
      expect(hats).toContain('Green');
      expect(hats).toContain('Blue');
    });

    it('SCAMPER has 7 operators', () => {
      const scamperSection = content.match(/### Lens:\s*SCAMPER[\s\S]*?(?=### Lens:[^:]|## [^#])/i);
      expect(scamperSection).toBeTruthy();
      const scamper = scamperSection![0];
      expect(scamper).toContain('Substitute');
      expect(scamper).toContain('Combine');
      expect(scamper).toContain('Adapt');
      expect(scamper).toContain('Modify');
      expect(scamper).toMatch(/Put to other use/i);
      expect(scamper).toContain('Eliminate');
      expect(scamper).toContain('Reverse');
    });

    it('TRIZ has structured analysis components', () => {
      const trizSection = content.match(/### Lens:\s*TRIZ[\s\S]*?(?=### Lens:|---)/i);
      expect(trizSection).toBeTruthy();
      const triz = trizSection![0];
      // TRIZ should reference inventive principles and constraint inversion
      expect(triz).toMatch(/Inventive Principles|Constraint Inversion|assumption/i);
    });

    it('Adjacent Possible is a single-facet lens', () => {
      const adjSection = content.match(/### Lens:\s*Adjacent Possible[\s\S]*?(?=### Lens:|## |---$)/im);
      expect(adjSection).toBeTruthy();
      // Should not have multiple sub-facet dispatch instructions
      const adjText = adjSection![0];
      expect(adjText).not.toMatch(/parallel.*Agent\(\)/i);
    });
  });

  describe('AC-US2-05: Default lens', () => {
    it('default lens is used when no --lens flag provided', () => {
      // Argument table should show default as the default value for --lens
      expect(content).toMatch(/--lens.*\|.*default/i);
    });
  });

  describe('AC-US2-02: Six Hats deep mode dispatch', () => {
    it('deep mode dispatches hat facets as parallel Agent() calls', () => {
      // Should mention 6 parallel Agent() calls for six-hats in deep mode
      expect(content).toMatch(/(?:deep|parallel).*Agent\(\)/is);
    });

    it('specifies merge/collect step after parallel dispatch', () => {
      expect(content).toMatch(/collect|merge|compile/i);
    });

    it('per-facet output is limited', () => {
      expect(content).toMatch(/(?:under|Stay under|max)\s*150\s*lines/i);
    });
  });

  describe('AC-US2-03: SCAMPER deep mode dispatch', () => {
    it('SCAMPER deep mode references 7 parallel Agent() calls', () => {
      const scamperSection = content.match(/### Lens:\s*SCAMPER[\s\S]*?(?=### Lens:[^:]|## [^#])/i);
      expect(scamperSection).toBeTruthy();
      expect(scamperSection![0]).toMatch(/7 parallel.*Agent\(\)/i);
    });
  });

  describe('AC-US2-04: Sequential execution for non-deep modes', () => {
    it('standard mode uses single thread / sequential', () => {
      expect(content).toMatch(/standard.*single.*(?:thread|lens)/is);
    });

    it('quick mode skips Diverge', () => {
      expect(content).toMatch(/quick.*skip.*(?:Diverge|Phase 2)/is);
    });

    it('Agent() calls appear only in deep mode context', () => {
      // Agent() dispatch should be within deep mode sections
      expect(content).toMatch(/deep.*(?:mode|dispatch).*Agent\(\)/is);
    });
  });
});
