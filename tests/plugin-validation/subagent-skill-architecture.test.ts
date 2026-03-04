import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const pluginsDir = join(projectRoot, 'plugins', 'specweave');
const agentsDir = join(pluginsDir, 'agents');
const skillsDir = join(pluginsDir, 'skills');

/**
 * Validation Tests: Subagent + Skill Architecture
 *
 * Validates that the core orchestration agents (PM, Architect, Planner)
 * follow the "subagents preloading skills" pattern:
 * - Subagent owns: isolation, memory, model, resumability
 * - Skill owns: domain logic, supporting files (phases, templates)
 * - skills: field guarantees injection at startup
 */

function parseYamlFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  try {
    return yaml.parse(match[1]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────
// Subagent file validation
// ─────────────────────────────────────────────────────────────────────

describe('Core subagent files exist and have correct structure', () => {
  const subagents = [
    { file: 'sw-pm.md', skill: 'sw:pm', model: 'opus', name: 'sw-pm' },
    { file: 'sw-architect.md', skill: 'sw:architect', model: 'opus', name: 'sw-architect' },
    { file: 'sw-planner.md', skill: 'sw:test-aware-planner', model: 'sonnet', name: 'sw-planner' },
  ];

  for (const agent of subagents) {
    describe(`${agent.file}`, () => {
      const filePath = join(agentsDir, agent.file);

      it('should exist as a flat .md file in agents/', () => {
        expect(existsSync(filePath)).toBe(true);
      });

      it('should have name field in frontmatter', () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.name).toBe(agent.name);
      });

      it('should have description field', () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.description).toBeDefined();
        expect((fm.description as string).length).toBeGreaterThan(20);
      });

      it(`should specify model: ${agent.model}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.model).toBe(agent.model);
      });

      it('should have memory: project for persistent state', () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.memory).toBe('project');
      });

      it(`should preload skill: ${agent.skill} via skills: field`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.skills).toBeDefined();
        expect(Array.isArray(fm.skills)).toBe(true);
        expect(fm.skills).toContain(agent.skill);
      });

      it('should have a slim body (subagent delegates to skill for details)', () => {
        const content = readFileSync(filePath, 'utf-8');
        const lineCount = content.split('\n').length;
        // Subagent body should be concise — domain logic lives in the skill
        expect(lineCount).toBeLessThan(50);
      });

      it('should reference skill-chain marker registration', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toMatch(/skill.chain.*marker|register.*marker|STEP 0/i);
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Corresponding skill files validation
// ─────────────────────────────────────────────────────────────────────

describe('Core skill files exist with domain logic', () => {
  const skills = [
    { dir: 'pm', minLines: 100 },
    { dir: 'architect', minLines: 50 },
    { dir: 'test-aware-planner', minLines: 50 },
  ];

  for (const skill of skills) {
    describe(`skills/${skill.dir}/SKILL.md`, () => {
      const filePath = join(skillsDir, skill.dir, 'SKILL.md');

      it('should exist', () => {
        expect(existsSync(filePath)).toBe(true);
      });

      it('should have description in frontmatter', () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.description).toBeDefined();
        expect((fm.description as string).length).toBeGreaterThan(20);
      });

      it(`should have at least ${skill.minLines} lines of domain logic`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeGreaterThan(skill.minLines);
      });

      it('should contain skill-chain marker registration (STEP 0)', () => {
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toMatch(/STEP 0|skill.chain|marker/i);
      });

      it('should NOT have name: field in frontmatter (skills use directory name)', () => {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseYamlFrontmatter(content);
        expect(fm.name).toBeUndefined();
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Increment skill uses Agent() not Skill() for orchestration
// ─────────────────────────────────────────────────────────────────────

describe('Increment skill orchestrates via Agent() calls', () => {
  const incrementPath = join(skillsDir, 'increment', 'SKILL.md');

  it('should exist', () => {
    expect(existsSync(incrementPath)).toBe(true);
  });

  it('should use Agent() calls for PM, Architect, Planner delegation', () => {
    const content = readFileSync(incrementPath, 'utf-8');
    expect(content).toMatch(/Agent\(\s*\{\s*subagent_type:\s*"sw:sw-pm"/);
    expect(content).toMatch(/Agent\(\s*\{\s*subagent_type:\s*"sw:sw-architect"/);
    expect(content).toMatch(/Agent\(\s*\{\s*subagent_type:\s*"sw:sw-planner"/);
  });

  it('should NOT use Skill() for PM/Architect/Planner (subagents provide memory)', () => {
    const content = readFileSync(incrementPath, 'utf-8');
    // Should not have Skill() calls that invoke PM, Architect, or Planner
    expect(content).not.toMatch(/Skill\(\s*\{\s*skill:\s*"sw:pm"/);
    expect(content).not.toMatch(/Skill\(\s*\{\s*skill:\s*"sw:architect"/);
    expect(content).not.toMatch(/Skill\(\s*\{\s*skill:\s*"sw:test-aware-planner"/);
  });

  it('should NOT reference wrong namespace sw:agents:*', () => {
    const content = readFileSync(incrementPath, 'utf-8');
    expect(content).not.toMatch(/sw:agents:/);
  });

  it('should instruct NEVER to write spec/plan/tasks directly', () => {
    const content = readFileSync(incrementPath, 'utf-8');
    expect(content).toMatch(/NEVER write spec\.md.*directly|NEVER.*write.*directly/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cross-validation: subagent skill references match actual skill dirs
// ─────────────────────────────────────────────────────────────────────

describe('Subagent skill references match actual skill directories', () => {
  const mappings = [
    { agent: 'sw-pm.md', skillRef: 'sw:pm', skillDir: 'pm' },
    { agent: 'sw-architect.md', skillRef: 'sw:architect', skillDir: 'architect' },
    { agent: 'sw-planner.md', skillRef: 'sw:test-aware-planner', skillDir: 'test-aware-planner' },
  ];

  for (const mapping of mappings) {
    it(`${mapping.agent} references ${mapping.skillRef} which maps to skills/${mapping.skillDir}/`, () => {
      // Verify agent file references the skill
      const agentContent = readFileSync(join(agentsDir, mapping.agent), 'utf-8');
      const agentFm = parseYamlFrontmatter(agentContent);
      expect(agentFm.skills).toContain(mapping.skillRef);

      // Verify the corresponding skill directory and SKILL.md exist
      const skillPath = join(skillsDir, mapping.skillDir, 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Documentation consistency
// ─────────────────────────────────────────────────────────────────────

describe('SKILLS-VS-AGENTS.md documentation consistency', () => {
  const docsPath = join(projectRoot, 'plugins', 'SKILLS-VS-AGENTS.md');

  it('should exist', () => {
    expect(existsSync(docsPath)).toBe(true);
  });

  it('should document the subagent + skill pattern', () => {
    const content = readFileSync(docsPath, 'utf-8');
    expect(content).toMatch(/subagent.*preload.*skill|skill.*preload/i);
  });

  it('should document all three core subagents', () => {
    const content = readFileSync(docsPath, 'utf-8');
    expect(content).toContain('sw-pm');
    expect(content).toContain('sw-architect');
    expect(content).toContain('sw-planner');
  });

  it('should document skills: field for preloading', () => {
    const content = readFileSync(docsPath, 'utf-8');
    expect(content).toMatch(/skills:\s*\[|skills:.*field/i);
  });

  it('should document memory: project capability', () => {
    const content = readFileSync(docsPath, 'utf-8');
    expect(content).toMatch(/memory:\s*project|persistent.*memory/i);
  });

  it('should NOT contain outdated patterns', () => {
    const content = readFileSync(docsPath, 'utf-8');
    expect(content).not.toContain('sw:agents:');
    expect(content).not.toContain('Skills only');
  });
});
