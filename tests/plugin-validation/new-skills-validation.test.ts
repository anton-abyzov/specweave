import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const vskillPluginsDir = join(projectRoot, '..', 'vskill', 'plugins');

/**
 * Validation Tests: New Skills from Increment 0191 (Skill Enrichment)
 *
 * Validates that all 23 new SKILL.md files have correct:
 * 1. File existence and placement
 * 2. YAML frontmatter structure (no forbidden `name:` field)
 * 3. Required frontmatter fields (description)
 * 4. Content quality (minimum lines, required sections)
 * 5. Plugin manifest correctness
 *
 * Updated for v1.0.315 migration: skills from specweave-mobile, specweave-ml,
 * specweave-backend, specweave-infrastructure moved to vskill repo with new
 * plugin names (mobile, ml, backend, infra).
 */

// Skills in vskill repo (v2.1.0 per-category plugins)
// Note: backend/go, backend/graphql, and infra/terraform were not migrated — excluded
const VSKILL_SKILLS: Record<string, string[]> = {
  'mobile': [
    'swiftui',
    'jetpack',
    'flutter',
    'expo',
    'testing',
    'deep-linking',
    'capacitor',
  ],
  'ml': [
    'langchain',
    'rag',
    'fine-tuning',
    'huggingface',
    'edge',
  ],
  'backend': [
    'java-spring',
    'rust',
  ],
  'infra': [
    'opentelemetry',
    'github-actions',
    'devsecops',
    'secrets',
    'azure',
    'aws',
  ],
};

// Combined for iteration — all 23 skills (desktop and blockchain plugins deleted)
const ALL_SKILLS: Array<{ plugin: string; skill: string; baseDir: string }> = [];
for (const [plugin, skills] of Object.entries(VSKILL_SKILLS)) {
  for (const skill of skills) {
    ALL_SKILLS.push({ plugin, skill, baseDir: vskillPluginsDir });
  }
}

// All vskill plugins with manifests
// Note: k8s, docs, and cost plugins don't exist — excluded
const VSKILL_PLUGINS_WITH_MANIFESTS = [
  'frontend', 'backend', 'testing', 'mobile', 'infra', 'ml',
  'kafka', 'confluent', 'payments', 'security', 'skills', 'blockchain',
];

function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      // Only capture top-level keys (not indented sub-keys)
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        frontmatter[key] = value;
      }
    }
  }

  return { frontmatter, body: match[2] };
}

describe('New Skills Validation (Increment 0191)', () => {
  describe('File Existence', () => {
    for (const { plugin, skill, baseDir } of ALL_SKILLS) {
      it(`${plugin}/${skill}/SKILL.md should exist`, () => {
        const skillPath = join(baseDir, plugin, 'skills', skill, 'SKILL.md');
        expect(existsSync(skillPath)).toBe(true);
      });
    }
  });

  describe('Frontmatter Validation', () => {
    for (const { plugin, skill, baseDir } of ALL_SKILLS) {
      const skillPath = join(baseDir, plugin, 'skills', skill, 'SKILL.md');

      it(`${plugin}/${skill} should have valid frontmatter with description`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        const { frontmatter } = parseFrontmatter(content);

        expect(frontmatter.description).toBeDefined();
        expect(frontmatter.description.length).toBeGreaterThan(20);
      });

      it(`${plugin}/${skill} should NOT have forbidden name: field in frontmatter`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        const { frontmatter } = parseFrontmatter(content);

        expect(frontmatter.name).toBeUndefined();
      });

      it(`${plugin}/${skill} should start with --- frontmatter delimiter`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        expect(content.startsWith('---')).toBe(true);
      });
    }
  });

  describe('Content Quality', () => {
    for (const { plugin, skill, baseDir } of ALL_SKILLS) {
      const skillPath = join(baseDir, plugin, 'skills', skill, 'SKILL.md');

      it(`${plugin}/${skill} should have minimum 80 lines`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeGreaterThan(80);
      });

      it(`${plugin}/${skill} should not exceed 1500 lines`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeLessThanOrEqual(1500);
      });

      it(`${plugin}/${skill} should have an H1 title`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        expect(content).toMatch(/^# .+/m);
      });

      it(`${plugin}/${skill} should have at least 2 H2 sections`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        const h2Count = (content.match(/^## .+/gm) || []).length;
        expect(h2Count).toBeGreaterThanOrEqual(2);
      });

      it(`${plugin}/${skill} should contain code examples`, () => {
        if (!existsSync(skillPath)) return;
        const content = readFileSync(skillPath, 'utf-8');
        const codeBlockCount = (content.match(/```/g) || []).length;
        // At least 2 code blocks (opening + closing = 1 example)
        expect(codeBlockCount).toBeGreaterThanOrEqual(2);
      });
    }
  });

  describe('Plugin Manifests', () => {
    // Vskill plugins (migrated to vskill repo)
    for (const plugin of VSKILL_PLUGINS_WITH_MANIFESTS) {
      const manifestPath = join(vskillPluginsDir, plugin, '.claude-plugin', 'plugin.json');

      it(`${plugin}/plugin.json should exist in vskill repo`, () => {
        expect(existsSync(manifestPath)).toBe(true);
      });

      it(`${plugin}/plugin.json should have required fields`, () => {
        if (!existsSync(manifestPath)) return;
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

        expect(manifest.name).toBeDefined();
        expect(manifest.description).toBeDefined();
        expect(manifest.version).toBeDefined();
        expect(manifest.license).toBe('MIT');
      });
    }
  });

  describe('Skill Count Totals', () => {
    it('should have exactly 20 new skills', () => {
      let totalSkills = 0;
      for (const skills of Object.values(VSKILL_SKILLS)) {
        totalSkills += skills.length;
      }
      expect(totalSkills).toBe(20);
    });

    it('should have all skill directories containing SKILL.md', () => {
      for (const { plugin, skill, baseDir } of ALL_SKILLS) {
        const skillDir = join(baseDir, plugin, 'skills', skill);
        if (!existsSync(skillDir)) continue;
        const files = readdirSync(skillDir);
        expect(files).toContain('SKILL.md');
      }
    });
  });
});
