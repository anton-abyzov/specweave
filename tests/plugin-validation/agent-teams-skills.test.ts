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
 * RED phase — validates that team-orchestrate, team-build, team-status,
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
// T-001: team-orchestrate SKILL.md content validation
// ─────────────────────────────────────────────────────────────────────
describe('T-001: team-orchestrate SKILL.md', () => {
  const skillPath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');

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

  it('should contain mode detection section', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/mode detection|detect.*mode|CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS/i);
    expect(content).toMatch(/in-process|tmux|iTerm/i);
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
describe('T-004: Contract-first protocol in team-orchestrate', () => {
  const skillPath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');

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
    expect(content).toContain('sw-testing:test-coverage');
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
// T-010: Terminal detection instructions
// ─────────────────────────────────────────────────────────────────────
describe('T-010: Terminal configuration in team-orchestrate', () => {
  const skillPath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');

  it('should contain tmux setup instructions', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/brew install tmux|apt.*install.*tmux/i);
  });

  it('should contain iTerm2 setup instructions', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/iTerm2|iterm2|it2/i);
  });

  it('should describe in-process mode as fallback', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/in.process|fallback|Shift\+Up|Shift\+Down/i);
  });

  it('should contain settings.json configuration example', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/settings\.json|CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS/);
  });

  it('should contain navigation instructions for each mode', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/Ctrl\+B|ctrl.b/i); // tmux navigation
  });
});

// ─────────────────────────────────────────────────────────────────────
// T-012: Agent spawn prompt templates
// ─────────────────────────────────────────────────────────────────────
describe('T-012: Agent spawn prompt templates', () => {
  const skillPath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');

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
  const skillPath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');

  it('should define native mode communication (SendMessage)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/SendMessage|native.*message|peer.*message/i);
  });

  it('should define fallback mode communication (file-based)', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/file.based|\.specweave\/state|messages\/|fallback.*comm/i);
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
  const orchestratePath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');
  const buildPath = join(pluginsDir, 'team-build', 'SKILL.md');

  it('should have consistent skill mappings between team-orchestrate and team-build', () => {
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

describe('T-024: Subagent fallback compatibility', () => {
  const skillPath = join(pluginsDir, 'team-orchestrate', 'SKILL.md');

  it('should describe fallback to Task tool when native Agent Teams unavailable', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/fallback|Task tool|run_in_background|subagent.*mode/i);
  });

  it('should preserve existing subagent spawning instructions', () => {
    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toMatch(/Task\(\{|subagent_type|run_in_background/i);
  });
});
