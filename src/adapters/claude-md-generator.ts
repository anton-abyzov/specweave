/**
 * CLAUDE.md Generator
 *
 * Generates CLAUDE.md - the PRIMARY instruction file for Claude Code.
 *
 * CRITICAL:
 * - Claude Code ONLY reads CLAUDE.md (NOT AGENTS.md)
 * - This is the native/baseline implementation (skills, agents, hooks, slash commands)
 * - Claude Code is NOT an adapter - it's the gold standard that others try to approximate
 *
 * This generator creates a quick reference that lists what's actually installed,
 * so when we add new agents/skills, CLAUDE.md stays in sync automatically.
 */

import { DocGenerator } from './doc-generator';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface ClaudeMdOptions {
  projectName: string;
  projectPath: string;
  templatePath?: string;
}

/**
 * Generate CLAUDE.md with dynamic agent/skill sections
 */
export class ClaudeMdGenerator {
  private docGen: DocGenerator;

  constructor(
    skillsDir?: string,
    agentsDir?: string,
    commandsDir?: string
  ) {
    this.docGen = new DocGenerator(skillsDir, agentsDir, commandsDir);
  }

  /**
   * Generate complete CLAUDE.md content
   */
  async generate(options: ClaudeMdOptions): Promise<string> {
    // Read template
    const templatePath = options.templatePath ||
      path.join(__dirname, '../templates/CLAUDE.md.template');

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`CLAUDE.md template not found at: ${templatePath}`);
    }

    let content = await fs.readFile(templatePath, 'utf-8');

    // Replace placeholders
    content = content.replace(/\{PROJECT_NAME\}/g, options.projectName);

    // Replace dynamic sections
    content = await this.replaceDynamicSections(content);

    return content;
  }

  /**
   * Replace dynamic sections in template
   */
  private async replaceDynamicSections(content: string): Promise<string> {
    // Extract actual skills and agents
    const skills = await this.docGen.extractSkills();
    const agents = await this.docGen.extractAgents();
    const commands = await this.docGen.extractCommands();

    // Replace agents section (lines 226-243 in template)
    content = this.replaceAgentsSection(content, agents);

    // Replace skills section (lines 248-278 in template)
    content = this.replaceSkillsSection(content, skills);

    // Replace commands section if needed
    content = this.replaceCommandsSection(content, commands);

    return content;
  }

  /**
   * Generate dynamic agents section
   */
  private replaceAgentsSection(content: string, agents: any[]): string {
    const agentsTable = this.generateAgentsTable(agents);

    // Find the agents section and replace it
    // Look for "## Agents (Activate Automatically)" section
    const agentsSectionRegex = /## Agents \(Activate Automatically\)[\s\S]*?(?=\n## |$)/;

    const agentsSection = `## Agents (Activate Automatically)

**Strategic Agents** (pre-installed & ready to use):

${agentsTable}

**All ${agents.length} agents are pre-installed** - Claude uses the right one based on your request!

**See**: \`.claude/agents/\` for complete list

---
`;

    if (agentsSectionRegex.test(content)) {
      return content.replace(agentsSectionRegex, agentsSection);
    }

    return content;
  }

  /**
   * Generate agents table
   */
  private generateAgentsTable(agents: any[]): string {
    let table = '| Agent | Purpose | Activates When |\n';
    table += '|-------|---------|----------------|\n';

    for (const agent of agents) {
      const activation = this.getAgentActivation(agent.name);
      table += `| \`${agent.name}\` | ${agent.description} | ${activation} |\n`;
    }

    return table;
  }

  /**
   * Get agent activation guidance
   */
  private getAgentActivation(agentName: string): string {
    const activations: Record<string, string> = {
      'pm': 'Planning features',
      'architect': 'Technical design',
      'security': 'Security review',
      'qa-lead': 'Testing',
      'devops': 'Deployment needed',
      'tech-lead': 'Code review',
      'sre': 'Troubleshooting',
      'docs-writer': 'Writing docs',
      'performance': 'Optimization needed',
      'frontend': 'Frontend development',
      'nodejs-backend': 'Node.js backend',
      'python-backend': 'Python backend',
      'nextjs': 'Next.js development',
      'dotnet-backend': '.NET development'
    };

    return activations[agentName] || 'Specialized tasks';
  }

  /**
   * Generate dynamic skills section
   */
  private replaceSkillsSection(content: string, skills: any[]): string {
    const skillsTable = this.generateSkillsTable(skills);

    // Find the skills section and replace it
    const skillsSectionRegex = /## Skills \(Activate Automatically\)[\s\S]*?(?=\n## |$)/;

    const skillsSection = `## Skills (Activate Automatically)

**Framework Skills** (always available):

${this.generateFrameworkSkillsTable(skills)}

**Technology Skills** (all pre-installed):

${this.generateTechSkillsTable(skills)}

**Integration Skills** (all pre-installed):

${this.generateIntegrationSkillsTable(skills)}

**See**: \`.claude/skills/\` for complete list of ${skills.length}+ skills!

---
`;

    if (skillsSectionRegex.test(content)) {
      return content.replace(skillsSectionRegex, skillsSection);
    }

    return content;
  }

  /**
   * Generate framework skills table
   */
  private generateFrameworkSkillsTable(skills: any[]): string {
    const frameworkSkills = skills.filter(s =>
      ['specweave-detector', 'increment-planner', 'context-loader', 'skill-router',
       'spec-driven-debugging', 'spec-driven-brainstorming', 'brownfield-analyzer'].includes(s.name)
    );

    let table = '| Skill | Purpose | Activates When |\n';
    table += '|-------|---------|----------------|\n';

    for (const skill of frameworkSkills) {
      const activation = this.getSkillActivation(skill.name);
      table += `| \`${skill.name}\` | ${this.truncate(skill.description, 60)} | ${activation} |\n`;
    }

    return table;
  }

  /**
   * Generate tech skills table
   */
  private generateTechSkillsTable(skills: any[]): string {
    const techSkills = skills.filter(s =>
      ['nodejs-backend', 'python-backend', 'nextjs', 'frontend', 'dotnet-backend',
       'e2e-playwright'].includes(s.name)
    );

    let table = '| Skill | Purpose | Activates When |\n';
    table += '|-------|---------|----------------|\n';

    for (const skill of techSkills) {
      const activation = this.getSkillActivation(skill.name);
      table += `| \`${skill.name}\` | ${this.truncate(skill.description, 60)} | ${activation} |\n`;
    }

    return table;
  }

  /**
   * Generate integration skills table
   */
  private generateIntegrationSkillsTable(skills: any[]): string {
    const integrationSkills = skills.filter(s =>
      ['jira-sync', 'github-sync', 'ado-sync', 'hetzner-provisioner',
       'cost-optimizer', 'figma-mcp-connector'].includes(s.name)
    );

    let table = '| Skill | Purpose | Activates When |\n';
    table += '|-------|---------|----------------|\n';

    for (const skill of integrationSkills) {
      const activation = this.getSkillActivation(skill.name);
      table += `| \`${skill.name}\` | ${this.truncate(skill.description, 60)} | ${activation} |\n`;
    }

    return table;
  }

  /**
   * Get skill activation guidance
   */
  private getSkillActivation(skillName: string): string {
    const activations: Record<string, string> = {
      'specweave-detector': 'User asks about SpecWeave',
      'increment-planner': '/pi or feature planning',
      'context-loader': 'Working on increments',
      'skill-router': 'Ambiguous requests',
      'spec-driven-debugging': 'Bug or test failure',
      'spec-driven-brainstorming': 'Brainstorm or refine idea',
      'nodejs-backend': 'Node.js backend',
      'python-backend': 'Python backend',
      'nextjs': 'Next.js',
      'frontend': 'Frontend',
      'dotnet-backend': '.NET',
      'jira-sync': 'JIRA integration',
      'github-sync': 'GitHub integration',
      'ado-sync': 'Azure DevOps sync',
      'hetzner-provisioner': 'Hetzner deployment',
      'cost-optimizer': 'Cost optimization',
      'e2e-playwright': 'E2E testing'
    };

    return activations[skillName] || 'Specialized tasks';
  }

  /**
   * Generate skills table
   */
  private generateSkillsTable(skills: any[]): string {
    let table = '| Skill | Description |\n';
    table += '|-------|-------------|\n';

    for (const skill of skills.slice(0, 20)) { // Top 20 skills
      table += `| \`${skill.name}\` | ${this.truncate(skill.description, 80)} |\n`;
    }

    if (skills.length > 20) {
      table += `| _...and ${skills.length - 20} more_ | See \`.claude/skills/\` |\n`;
    }

    return table;
  }

  /**
   * Replace commands section
   */
  private replaceCommandsSection(content: string, commands: any[]): string {
    // Commands are already listed in the template, but we could make them dynamic too
    // For now, we'll skip this since commands are explicitly documented
    return content;
  }

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
