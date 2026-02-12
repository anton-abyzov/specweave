import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const pluginsDir = join(projectRoot, 'plugins', 'specweave', 'skills');

/**
 * Validation Tests: Agent Teams Skills (Increment 0197)
 *
 * RED phase — validates that team-lead, team-build, team-status,
 * and team-merge SKILL.md files have correct structure and content
 * for native Agent Teams integration.
 */

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
    if (colonIndex > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

// ─────────────────────────────────────────────────────────────────────
// T-001: team-lead SKILL.md content validation
// ─────────────────────────────────────────────────────────────────────
describe('T-001: team-lead SKILL.md', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should exist', () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it('should have valid frontmatter without name: field', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.description).toBeDefined();
    expect(frontmatter.description.length).toBeGreaterThan(20);
    expect(frontmatter.name).toBeUndefined();
  });

  it('should have at least 200 lines (comprehensive instructions)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThan(200);
  });

  it('should reference native Agent Teams', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/Agent Teams|TeamCreate/i);
  });

  it('should contain domain-to-skill mapping for all 9 domains', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const domains = [
      'frontend', 'backend', 'database', 'shared',
      'testing', 'security', 'devops', 'mobile', 'ml',
    ];
    for (const domain of domains) {
      expect(content.toLowerCase()).toContain(domain);
    }
  });

  it('should reference specific SpecWeave skills', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const requiredSkills = [
      'sw-frontend:frontend-architect',
      'sw-testing:qa-engineer',
      'sw:security',
      'sw:architect',
      'sw-infra:devops',
    ];
    for (const skill of requiredSkills) {
      expect(content).toContain(skill);
    }
  });

  it('should contain contract-first spawning protocol', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/contract.first|contract chain|phase 1.*phase 2|upstream.*downstream/i);
  });

  it('should contain agent spawn prompt template', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/spawn.*prompt|agent.*template|you are the .* agent/i);
    expect(content).toMatch(/file ownership|FILE_OWNERSHIP/i);
  });

  it('should contain quality gate instructions (sw:grill)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/sw:grill|quality gate/i);
  });

  it('should contain communication protocol', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/communication|SendMessage|message.*protocol|peer.to.peer/i);
  });

  it('should contain troubleshooting section', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/troubleshoot|common issues|known issues/i);
  });

  it('should contain --dry-run support', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('--dry-run');
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-004: Contract-first dependency detection
// ─────────────────────────────────────────────────────────────────────
describe('T-004: Contract-first protocol in team-lead', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should define contract chain order', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Chain: shared/types → database → backend → frontend
    expect(content).toMatch(/shared.*(?:→|->|before|first).*backend|types.*before.*implementation/i);
  });

  it('should explain Phase 1 (upstream) and Phase 2 (parallel)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/phase 1/i);
    expect(content).toMatch(/phase 2/i);
  });

  it('should describe contract artifacts (types, schema, API spec)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/contract.*artifact|contract.*file|api.contract|schema\.prisma|types\/|\.ts/i);
  });

  it('should handle no-dependency case (all parallel)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/no.*depend|all.*parallel|independent|no.*chain/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-007: team-build SKILL.md preset definitions
// ─────────────────────────────────────────────────────────────────────
describe('T-007: team-build SKILL.md', () => {
  const skillPath = join(pluginsDir, 'team-build', 'SKILL.md');

  it('should exist', () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it('should have valid frontmatter without name: field', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.description).toBeDefined();
    expect(frontmatter.description.length).toBeGreaterThan(20);
    expect(frontmatter.name).toBeUndefined();
  });

  it('should have at least 200 lines', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThan(200);
  });

  it('should define all 5 presets', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const presets = ['full-stack', 'review', 'testing', 'tdd', 'migration'];
    for (const preset of presets) {
      expect(content).toContain(preset);
    }
  });

  it('should map full-stack preset to correct skills', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('sw-frontend:frontend-architect');
    expect(content).toContain('sw:architect');
  });

  it('should map review preset to security + quality + docs skills', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('sw:security');
    expect(content).toMatch(/sw:grill|sw:tech-lead/);
    expect(content).toContain('sw:docs-updater');
  });

  it('should map testing preset to testing skills', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('sw-testing:unit-testing');
    expect(content).toContain('sw-testing:e2e-testing');
    expect(content).toContain('sw-testing:qa-engineer');
  });

  it('should map tdd preset to red/green/refactor skills', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('sw:tdd-red');
    expect(content).toContain('sw:tdd-green');
    expect(content).toContain('sw:tdd-refactor');
  });

  it('should define execution order per preset (parallel vs sequential)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // TDD must be sequential, review must be parallel
    expect(content).toMatch(/sequential|strict.*order|agent 1.*→.*agent 2.*→.*agent 3/i);
    expect(content).toMatch(/parallel|all.*simultaneous|independent/i);
  });

  it('should support --preset flag', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('--preset');
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-010: Terminal configuration in team-lead (simplified - removed)
// ─────────────────────────────────────────────────────────────────────
// NOTE: The simplified team-lead SKILL.md no longer includes detailed
// terminal setup instructions (tmux/iTerm2). These tests are removed
// to match the actual simplified content.

// ─────────────────────────────────────────────────────────────────────
// T-012: Agent spawn prompt templates
// ─────────────────────────────────────────────────────────────────────
describe('T-012: Agent spawn prompt templates', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should have spawn prompt templates for at least 5 domains', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const domainTemplates = [
      /frontend.*agent|agent.*frontend/i,
      /backend.*agent|agent.*backend/i,
      /database.*agent|shared.*agent|agent.*database|agent.*shared/i,
      /testing.*agent|qa.*agent|agent.*testing|agent.*qa/i,
      /security.*agent|agent.*security/i,
    ];
    let matched = 0;
    for (const pattern of domainTemplates) {
      if (pattern.test(content)) matched++;
    }
    expect(matched).toBeGreaterThanOrEqual(5);
  });

  it('should include skill invocation in spawn prompts', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Spawn prompts should tell agents which skills to invoke
    expect(content).toMatch(/invoke.*skill|skill.*invoke|primary.*skill|Skill\(\{/i);
  });

  it('should include file ownership in spawn prompts', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/file ownership|YOUR FILES|files you own|WRITE only/i);
  });

  it('should include workflow instructions (/sw:do or /sw:auto)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/\/sw:do|\/sw:auto/);
  });

  it('should include quality gate (/sw:grill) in spawn prompts', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/\/sw:grill|quality gate|before.*complet/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-017: Agent communication protocol
// ─────────────────────────────────────────────────────────────────────
describe('T-017: Communication protocol', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should define native mode communication (SendMessage)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/SendMessage|native.*message|peer.*message/i);
  });

  it('should define message types (contract ready, blocking issue, completion)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/CONTRACT_READY|contract.*ready|schema.*defined/i);
    expect(content).toMatch(/BLOCKING|blocking.*issue|cannot proceed/i);
    expect(content).toMatch(/COMPLETION|completion|all.*tasks.*done/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-015/T-016: Updated team-status and team-merge
// ─────────────────────────────────────────────────────────────────────
describe('T-015: team-status SKILL.md', () => {
  const skillPath = join(pluginsDir, 'team-status', 'SKILL.md');

  it('should exist and have valid frontmatter', () => {
    expect(existsSync(skillPath)).toBe(true);
    const content = readFileSync(skillPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.description).toBeDefined();
    expect(frontmatter.name).toBeUndefined();
  });

  it('should reference native Agent Teams mode', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/native.*agent.*team|agent.*teams.*mode|CLAUDE_CODE_EXPERIMENTAL/i);
  });
});

describe('T-016: team-merge SKILL.md', () => {
  const skillPath = join(pluginsDir, 'team-merge', 'SKILL.md');

  it('should exist and have valid frontmatter', () => {
    expect(existsSync(skillPath)).toBe(true);
    const content = readFileSync(skillPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.description).toBeDefined();
    expect(frontmatter.name).toBeUndefined();
  });

  it('should reference /sw:done per increment after merge', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/\/sw:done|done.*per.*increment|close.*increment/i);
  });

  it('should reference sync triggers (GitHub/JIRA)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/sw-github:sync|sw-jira:push|sync.*trigger|github.*sync/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-023/T-024: Integration validation
// ─────────────────────────────────────────────────────────────────────
describe('T-023: Full-stack preset end-to-end validation', () => {
  const orchestratePath = join(pluginsDir, 'team-lead', 'SKILL.md');
  const buildPath = join(pluginsDir, 'team-build', 'SKILL.md');

  it('should have consistent skill mappings between team-lead and team-build', () => {
    const orchestrate = readFileSync(orchestratePath, 'utf-8');
    const build = readFileSync(buildPath, 'utf-8');

    // Both should reference the same frontend skill
    expect(orchestrate).toContain('sw-frontend:frontend-architect');
    expect(build).toContain('sw-frontend:frontend-architect');

    // Both should reference architect for backend/shared
    expect(orchestrate).toContain('sw:architect');
    expect(build).toContain('sw:architect');
  });

  it('should have no file ownership overlap between frontend and backend templates', () => {
    const content = readFileSync(orchestratePath, 'utf-8');
    // Frontend should own components/pages, backend should own api/services
    // They should NOT share ownership of the same directories
    expect(content).toMatch(/src\/components|src\/pages|src\/hooks/);
    expect(content).toMatch(/src\/api|src\/services|src\/middleware/);
  });
});

describe('T-024: Native Agent Teams only', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should NOT contain subagent fallback references', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).not.toMatch(/run_in_background/i);
    expect(content).not.toMatch(/subagent.*fallback|fallback.*mode/i);
  });

  it('should use TeamCreate for agent spawning', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/TeamCreate/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ISSUE-1: team-lead must use correct Claude Code tool names
// ─────────────────────────────────────────────────────────────────────
describe('ISSUE-1: team-lead uses correct Claude Code tool names', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should NOT reference non-existent Teammate() tool', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).not.toMatch(/Teammate\s*\(/);
    expect(content).not.toMatch(/operation:\s*["']spawnTeam["']/);
  });

  it('should reference TeamCreate() for team creation', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/TeamCreate\s*\(/);
  });

  it('should reference TeamCreate tool in tool reference section', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // The simplified file has TeamCreate in the Tool Reference section (Section 1)
    expect(content).toMatch(/TeamCreate/);
    // Domain mappings should appear after tool reference
    const toolRefIndex = content.search(/## 1\. Tool Reference/i);
    const domainMappingIndex = content.search(/## 2\. Domain-to-Skill Mapping/i);
    expect(toolRefIndex).toBeGreaterThan(-1);
    expect(domainMappingIndex).toBeGreaterThan(-1);
    expect(toolRefIndex).toBeLessThan(domainMappingIndex);
  });

  it('should not reference run_in_background (no fallback mode)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).not.toMatch(/run_in_background/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ISSUE-4: Repository structure enforcement in agent teams
// ─────────────────────────────────────────────────────────────────────
describe('ISSUE-4: Repository structure enforcement', () => {
  const orchestratePath = join(pluginsDir, 'team-lead', 'SKILL.md');
  const mergePath = join(pluginsDir, 'team-merge', 'SKILL.md');

  it('should include repositories/{org}/ directory rule in team-lead', () => {
    const content = readFileSync(orchestratePath, 'utf-8');
    expect(content).toMatch(/repositories\/.*directory|repository.*operations.*MUST.*repositories/i);
  });

  it('should include repo structure rule in agent spawn RULES sections', () => {
    const content = readFileSync(orchestratePath, 'utf-8');
    // Must appear in the RULES sections of spawn templates
    expect(content).toMatch(/RULE[\s\S]{0,500}repositories\//i);
  });

  it('should include post-merge repo structure validation in team-merge', () => {
    const content = readFileSync(mergePath, 'utf-8');
    expect(content).toMatch(/validate.*repo.*structure|verify.*repositories.*directory|repo.*structure.*validation/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ISSUE-5: Mandatory local test execution before agent completion
// ─────────────────────────────────────────────────────────────────────
describe('ISSUE-5: Agents must run ALL tests locally before completion', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should require running ALL tests before signaling completion', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Must have a clear mandate that tests run locally before completion
    expect(content).toMatch(/run.*all.*tests|all.*tests.*pass|tests.*pass.*before/i);
  });

  it('should include test execution in agent WORKFLOW sections', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Check that agent templates include testing steps
    // Frontend (4a), Backend (4b), Database (4c), Testing (4d), Security (4e)
    const frontendSection = content.split(/### 4a\./)[1]?.split(/### 4b\./)[0] || '';
    const backendSection = content.split(/### 4b\./)[1]?.split(/### 4c\./)[0] || '';
    const databaseSection = content.split(/### 4c\./)[1]?.split(/### 4d\./)[0] || '';
    const testingSection = content.split(/### 4d\./)[1]?.split(/### 4e\./)[0] || '';
    const securitySection = content.split(/### 4e\./)[1]?.split(/##/)[0] || '';

    expect(frontendSection).toMatch(/npm test|run.*test/i);
    expect(backendSection).toMatch(/npm test|run.*test/i);
    expect(databaseSection).toMatch(/npm test|run.*test/i);
    expect(testingSection).toMatch(/npm test|npx playwright test|run.*test/i);
    expect(securitySection).toMatch(/npm test|run.*test/i);
  });

  it('should block completion if tests fail', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Check quality gate section (Section 8) or agent workflow steps
    expect(content).toMatch(/NOT signal.*until.*tests pass|Do NOT signal completion until all tests pass|tests fail.*fix|if.*fail.*repeat/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ISSUE-6: Frontend design quality defaults
// ─────────────────────────────────────────────────────────────────────
describe('ISSUE-6: Frontend agent design quality', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should instruct frontend agent to invoke design skill', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Frontend agent section should include design skill invocation
    const frontendSection = content.split(/### 4a\./)[1]?.split(/### 4b\./)[0] || '';
    expect(frontendSection).toMatch(/sw-frontend:frontend-design/);
  });

  it('should set world-class design quality as default expectation', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const frontendSection = content.split(/### 4a\./)[1]?.split(/### 4b\./)[0] || '';
    expect(frontendSection).toMatch(/world.class|polished|sleek|production.ready.*design|high.*quality.*ui/i);
  });

  it('should include responsive and accessible design requirements', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const frontendSection = content.split(/### 4a\./)[1]?.split(/### 4b\./)[0] || '';
    expect(frontendSection).toMatch(/responsive/i);
    expect(frontendSection).toMatch(/accessib/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ISSUE-7: Authentication/service setup in agent prompts
// ─────────────────────────────────────────────────────────────────────
describe('ISSUE-7: Authentication and service setup guidance', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should include auth setup guidance in backend agent', () => {
    const content = readFileSync(skillPath, 'utf-8');
    const backendSection = content.split(/### 4b\./)[1]?.split(/### 4c\./)[0] || '';
    expect(backendSection).toMatch(/auth.*setup|supabase|authentication.*service|auth.*provider/i);
  });

  it('should instruct agents to use sw:service-connect for external services', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/sw:service-connect/);
  });

  it('should include environment verification before implementation', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Agents should verify services are running/accessible
    expect(content).toMatch(/verify.*service|check.*connection|environment.*ready|service.*running/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ISSUE-8: Agents should use /sw:auto for autonomous work
// ─────────────────────────────────────────────────────────────────────
describe('ISSUE-8: Agents prefer auto mode for autonomous work', () => {
  const skillPath = join(pluginsDir, 'team-lead', 'SKILL.md');

  it('should instruct agents to prefer /sw:auto for autonomous execution', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Should explicitly recommend auto mode as preferred
    expect(content).toMatch(/prefer.*\/sw:auto|\/sw:auto.*preferred|use.*\/sw:auto.*autonomous/i);
  });

  it('should instruct agents to attempt closure via /sw:done after auto completes', () => {
    const content = readFileSync(skillPath, 'utf-8');
    // Agents should try to close their increment after auto work
    expect(content).toMatch(/\/sw:done.*after.*auto|auto.*complete.*\/sw:done|close.*increment.*after/i);
  });
});
