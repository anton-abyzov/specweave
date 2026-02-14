import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const pluginsDir = join(projectRoot, 'plugins', 'specweave');

/**
 * Validation Tests: Judge LLM Skill Conversion
 *
 * Ensures judge-llm exists as an invocable skill (not just a command),
 * follows the correct frontmatter conventions, and is integrated into
 * the /sw:done closure flow alongside grill.
 */

// ─────────────────────────────────────────────────────────────────────
// Part 1: judge-llm exists as a proper skill
// ─────────────────────────────────────────────────────────────────────
describe('Judge LLM: skill registration', () => {
  const skillPath = join(pluginsDir, 'skills', 'judge-llm', 'SKILL.md');

  it('should exist as skills/judge-llm/SKILL.md (not just commands/)', () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it('should NOT have a name: field in frontmatter (prevents prefix stripping)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();
    const frontmatter = frontmatterMatch![1];
    // name: field must NOT appear in frontmatter
    expect(frontmatter).not.toMatch(/^name:/m);
  });

  it('should have a description in frontmatter', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();
    const frontmatter = frontmatterMatch![1];
    expect(frontmatter).toMatch(/^description:/m);
  });

  it('should reference Opus model for deep analysis', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/opus/i);
  });

  it('should reference extended thinking / ultrathink', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/ultrathink|extended thinking/i);
  });

  it('should define verdict levels (APPROVED/CONCERNS/REJECTED)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/APPROVED/);
    expect(content).toMatch(/CONCERNS/);
    expect(content).toMatch(/REJECTED/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Part 2: judge-llm integrated into /sw:done closure flow
// ─────────────────────────────────────────────────────────────────────
describe('Judge LLM: integration in /sw:done', () => {
  const donePath = join(pluginsDir, 'skills', 'done', 'SKILL.md');

  it('should reference judge-llm in the done skill', () => {
    const content = readFileSync(donePath, 'utf-8');
    expect(content).toMatch(/judge-llm|judge.llm|Judge LLM/i);
  });

  it('should run judge-llm AFTER grill passes', () => {
    const content = readFileSync(donePath, 'utf-8');
    const grillIndex = content.search(/Step 2.*Grill/i);
    const judgeLlmIndex = content.search(/Judge.LLM|judge-llm/i);
    expect(grillIndex).toBeGreaterThan(-1);
    expect(judgeLlmIndex).toBeGreaterThan(-1);
    expect(judgeLlmIndex).toBeGreaterThan(grillIndex);
  });

  it('should invoke judge-llm via Skill tool or /sw:judge-llm', () => {
    const content = readFileSync(donePath, 'utf-8');
    expect(content).toMatch(/\/sw:judge-llm|Skill\(.*judge-llm/i);
  });

  it('should block closure on REJECTED verdict from judge-llm', () => {
    const content = readFileSync(donePath, 'utf-8');
    expect(content).toMatch(/REJECTED.*stop|REJECTED.*block|reject.*halt.*closure/i);
  });
});
