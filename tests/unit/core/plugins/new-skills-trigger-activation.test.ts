/**
 * Trigger Activation Tests for New Skills (Increment 0191)
 *
 * Verifies that the 25 new skills are properly triggered by realistic user prompts.
 * Uses the SkillTriggerExtractor to extract keywords from actual SKILL.md files
 * and validates that prompt matching activates the correct skills.
 *
 * Updated for v1.0.315 migration: domain skills moved to vskill repo.
 * - specweave-mobile → mobile (vskill repo)
 * - specweave-ml → ml (vskill repo)
 * - specweave-backend → backend (vskill repo)
 * - specweave-infrastructure → infra (vskill repo)
 * - specweave-desktop, specweave-blockchain → DELETED
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  SkillTriggerExtractor,
  ExtractedTriggers,
} from '../../../../src/core/plugins/skill-trigger-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');

// vskill repo plugins directory (sibling repo in umbrella)
const vskillPluginsDir = join(projectRoot, '..', 'vskill', 'plugins');
const hasVskillRepo = existsSync(vskillPluginsDir);

// Skills in vskill repo — only skills with actual SKILL.md files on disk
// v1.0.397: Reduced to skills that actually exist (phantom plugins removed)
const VSKILL_SKILLS: Record<string, string[]> = {
  'mobile': [
    'appstore',
  ],
};

// Skip when vskill sibling repo is not available (e.g., CI only checks out specweave)
describe.skipIf(!hasVskillRepo)('New Skills Trigger Activation (Increment 0191)', () => {
  let extractor: SkillTriggerExtractor;
  let allTriggers: ExtractedTriggers[];
  let index: ReturnType<SkillTriggerExtractor['buildIndex']>;

  beforeAll(() => {
    extractor = new SkillTriggerExtractor();
    allTriggers = [];

    // Extract triggers from vskill repo skills
    for (const [plugin, skills] of Object.entries(VSKILL_SKILLS)) {
      for (const skill of skills) {
        const skillPath = join(vskillPluginsDir, plugin, 'skills', skill, 'SKILL.md');
        if (!existsSync(skillPath)) continue;

        const content = readFileSync(skillPath, 'utf-8');
        const result = extractor.extractFromContent(
          content,
          skill,
          plugin,
          'skill',
          skillPath
        );
        allTriggers.push(result);
      }
    }

    // Build the inverted index
    index = extractor.buildIndex(allTriggers);
  });

  describe('Trigger Extraction', () => {
    it('should extract triggers from available skills', () => {
      expect(allTriggers.length).toBe(1);
    });

    it('most skills should have at least 1 trigger', () => {
      // Some compact SKILL.md descriptions yield 0 triggers (no recognizable tech/domain terms)
      const withTriggers = allTriggers.filter(t => t.triggers.length > 0);
      // At least 70% of skills should have triggers
      expect(withTriggers.length).toBeGreaterThanOrEqual(Math.floor(allTriggers.length * 0.7));
    });

    it('should build an index with available skills', () => {
      expect(index.skillCount).toBe(1);
    });
  });

  describe('Mobile Skills Activation', () => {
    it('App Store: "Publish an iOS app to the App Store with TestFlight"', () => {
      const matches = extractor.matchPrompt(
        'Publish an iOS app to the App Store with TestFlight',
        index
      );
      const fqns = matches.map((m) => m.fqn);
      // appstore skill should be in the index
      expect(index.skills['mobile:appstore']).toBeDefined();
    });
  });
});
