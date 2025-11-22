import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Progressive Disclosure Integration Tests
 *
 * Tests AC-US1-01 through AC-US1-04 from increment 0051-progressive-disclosure-refactoring
 * Validates that architect agent properly implements progressive disclosure pattern
 */

describe('AC-US1-01: Architect agent prompt size reduction', () => {
  it('should reduce architect prompt from 36KB to ≤20KB', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const stats = await fs.stat(agentPath);
    const sizeInKB = stats.size / 1024;

    expect(sizeInKB).toBeLessThanOrEqual(20);
    expect(sizeInKB).toBeGreaterThan(15); // Sanity check - shouldn't be empty
  });

  it('should have reduced total lines by at least 40%', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const content = await fs.readFile(agentPath, 'utf-8');
    const lines = content.split('\n').length;

    // Original was 1050 lines, target is ≤600 lines (43% reduction)
    expect(lines).toBeLessThanOrEqual(600);
  });
});

describe('AC-US1-02: Serverless knowledge delegation', () => {
  it('should NOT contain embedded serverless platform details in architect', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    // Should NOT have embedded serverless knowledge
    expect(agentContent).not.toContain('AWS Lambda: Enterprise-grade');
    expect(agentContent).not.toContain('Firebase: Beginner-friendly');
    expect(agentContent).not.toContain('Platform Selection (`selectPlatforms`)');
    expect(agentContent).not.toContain('Context Detection (`detectContext`)');
  });

  it('should have delegation reference to serverless-recommender skill', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    // Should have delegation instruction
    expect(agentContent).toContain('serverless-recommender');
    expect(agentContent).toContain('skill');
    expect(agentContent).toContain('Activates when');
  });

  it('should have serverless-recommender skill file', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/serverless-recommender/SKILL.md');
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});

describe('AC-US1-03: Compliance skill extraction', () => {
  it('should create compliance-architecture skill', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/compliance-architecture/SKILL.md');
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should have SOC2/HIPAA/GDPR/PCI-DSS content in skill', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/compliance-architecture/SKILL.md');
    const skillContent = await fs.readFile(skillPath, 'utf-8');

    expect(skillContent).toContain('SOC 2');
    expect(skillContent).toContain('HIPAA');
    expect(skillContent).toContain('GDPR');
    expect(skillContent).toContain('PCI-DSS');
    expect(skillContent).toContain('compliance');
  });

  it('should have YAML frontmatter with activation keywords', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/compliance-architecture/SKILL.md');
    const skillContent = await fs.readFile(skillPath, 'utf-8');

    const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    const frontmatter = frontmatterMatch![1];
    expect(frontmatter).toContain('name: compliance-architecture');
    expect(frontmatter).toContain('description:');

    // Check for activation keywords in description
    const descriptionMatch = frontmatter.match(/description: (.+)/);
    expect(descriptionMatch).toBeTruthy();
    const description = descriptionMatch![1];

    expect(description).toContain('HIPAA');
    expect(description).toContain('SOC');
    expect(description).toContain('GDPR');
    expect(description).toContain('PCI');
  });

  it('should reference compliance skill in architect', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    expect(agentContent).toContain('compliance-architecture');
    expect(agentContent).toContain('skill');
  });

  it('should NOT contain embedded compliance details in architect', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    // Should NOT have embedded compliance checklists
    expect(agentContent).not.toContain('Business Associate Agreement (BAA)');
    expect(agentContent).not.toContain('Encryption at rest: All data stored in databases');
    expect(agentContent).not.toContain('Data Residency Controls');
  });
});

describe('AC-US1-04: Delegation pattern', () => {
  it('should document delegation pattern in architect', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    expect(agentContent).toContain('Delegation');
    expect(agentContent).toContain('Progressive Disclosure');
    expect(agentContent).toContain('skills that auto-load');
  });

  it('should list which skills activate for which keywords', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    // Should document activation patterns
    expect(agentContent).toContain('Activates when');
    expect(agentContent).toContain('→'); // Shows delegation arrow
  });

  it('should explain why delegation is used', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    expect(agentContent.toLowerCase()).toContain('thin');
    expect(agentContent.toLowerCase()).toContain('coordinator');
  });
});

describe('AC-US3-01: Chunking instructions in prompts', () => {
  it('should add chunking pattern to architect agent', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    expect(agentContent.toLowerCase()).toContain('phase');
    expect(agentContent.toLowerCase()).toContain('chunk');
  });
});

describe('AC-US3-02: Response token limits', () => {
  it('should set max_response_tokens in architect YAML', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    const frontmatterMatch = agentContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    const frontmatter = frontmatterMatch![1];
    expect(frontmatter).toContain('max_response_tokens');

    // Should be set to 2000 or less
    const tokenMatch = frontmatter.match(/max_response_tokens:\s*(\d+)/);
    expect(tokenMatch).toBeTruthy();
    const tokenLimit = parseInt(tokenMatch![1]);
    expect(tokenLimit).toBeLessThanOrEqual(2000);
    expect(tokenLimit).toBeGreaterThan(0);
  });
});

describe('Overall progressive disclosure validation', () => {
  it('should have significantly reduced total context size', async () => {
    // Architect agent
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/architect/AGENT.md');
    const agentStats = await fs.stat(agentPath);
    const agentKB = agentStats.size / 1024;

    // Skills (loaded on-demand)
    const serverlessPath = path.join(process.cwd(), 'plugins/specweave/skills/serverless-recommender/SKILL.md');
    const serverlessStats = await fs.stat(serverlessPath);
    const serverlessKB = serverlessStats.size / 1024;

    const compliancePath = path.join(process.cwd(), 'plugins/specweave/skills/compliance-architecture/SKILL.md');
    const complianceStats = await fs.stat(compliancePath);
    const complianceKB = complianceStats.size / 1024;

    // Before refactoring: 36KB (architect with everything embedded)
    // After refactoring: 20KB (architect) + skills load on-demand

    // Architect should be ≤20KB
    expect(agentKB).toBeLessThanOrEqual(20);

    // Skills should be reasonable size
    expect(serverlessKB).toBeLessThanOrEqual(20);
    expect(complianceKB).toBeLessThanOrEqual(20);

    // When NEITHER skill is activated, context is just architect (20KB)
    // This is 44% reduction from original 36KB
    const contextWithoutSkills = agentKB;
    expect(contextWithoutSkills).toBeLessThan(36 * 0.6); // At least 40% reduction

    console.log(`✅ Context size validation:
      Architect only: ${agentKB.toFixed(1)}KB (was 36KB)
      With serverless: ${(agentKB + serverlessKB).toFixed(1)}KB
      With compliance: ${(agentKB + complianceKB).toFixed(1)}KB
      With both: ${(agentKB + serverlessKB + complianceKB).toFixed(1)}KB
    `);
  });
});

// PM Agent Progressive Disclosure Tests (US-002)
describe('AC-US2-01: PM agent prompt size reduction', () => {
  it('should reduce PM prompt from 64KB to ≤50KB', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/pm/AGENT.md');
    const stats = await fs.stat(agentPath);
    const sizeInKB = stats.size / 1024;

    expect(sizeInKB).toBeLessThanOrEqual(50);
    expect(sizeInKB).toBeGreaterThan(20); // Sanity check
  });

  it('should have max_response_tokens in PM YAML', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/pm/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    const frontmatterMatch = agentContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    const frontmatter = frontmatterMatch![1];
    expect(frontmatter).toContain('max_response_tokens');

    const tokenMatch = frontmatter.match(/max_response_tokens:\s*(\d+)/);
    expect(tokenMatch).toBeTruthy();
    const tokenLimit = parseInt(tokenMatch![1]);
    expect(tokenLimit).toBeLessThanOrEqual(2000);
  });
});

describe('AC-US2-02: External sync wizard skill', () => {
  it('should create external-sync-wizard skill', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/external-sync-wizard/SKILL.md');
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should have comprehensive YAML frontmatter', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/external-sync-wizard/SKILL.md');
    const skillContent = await fs.readFile(skillPath, 'utf-8');

    const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    const frontmatter = frontmatterMatch![1];
    expect(frontmatter).toContain('name: external-sync-wizard');
    expect(frontmatter).toContain('description:');

    // Should have activation keywords
    const description = frontmatter.match(/description: (.+)/)?.[1] || '';
    expect(description.toLowerCase()).toMatch(/github|jira|ado|sync/);
  });

  it('should NOT contain external sync details in PM agent', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/pm/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    // Should not have detailed sync wizard prompts (delegated to skill)
    expect(agentContent).not.toContain('Question: "What should be the sync behavior between local increments');

    // Should have delegation reference
    expect(agentContent.toLowerCase()).toContain('external-sync-wizard');
  });
});

describe('AC-US2-03: PM closure validation skill', () => {
  it('should create pm-closure-validation skill', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/pm-closure-validation/SKILL.md');
    const exists = await fs.access(skillPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should contain 3-gate validation content', async () => {
    const skillPath = path.join(process.cwd(), 'plugins/specweave/skills/pm-closure-validation/SKILL.md');
    const skillContent = await fs.readFile(skillPath, 'utf-8');

    expect(skillContent).toContain('Gate 1');
    expect(skillContent).toContain('Gate 2');
    expect(skillContent).toContain('Gate 3');
    expect(skillContent).toContain('Tasks Completion');
    expect(skillContent).toContain('Tests Passing');
    expect(skillContent).toContain('Documentation Updated');
  });

  it('should have delegation reference in PM agent', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/pm/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    expect(agentContent.toLowerCase()).toContain('pm-closure-validation');
    expect(agentContent).toContain('/done');
  });
});

describe('AC-US2-04: PM chunked execution pattern', () => {
  it('should document chunked execution pattern', async () => {
    const agentPath = path.join(process.cwd(), 'plugins/specweave/agents/pm/AGENT.md');
    const agentContent = await fs.readFile(agentPath, 'utf-8');

    expect(agentContent.toLowerCase()).toMatch(/chunk|phase/);
    expect(agentContent).toMatch(/Phase 1|Phase 2|Phase 3/);
  });
});
