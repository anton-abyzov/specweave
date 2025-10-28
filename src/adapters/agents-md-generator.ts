/**
 * AGENTS.md Generator
 *
 * Generates a universal AGENTS.md file for ALL AI coding tools EXCEPT Claude Code.
 * Follows the agents.md standard: https://agents.md/
 *
 * IMPORTANT:
 * - Claude Code does NOT read this file - it only reads CLAUDE.md
 * - This file is for: Cursor, Gemini CLI, Codex, GitHub Copilot, and ANY other AI tool
 *
 * This ONE file replaces:
 * - .cursorrules (Cursor)
 * - .github/copilot/instructions.md (Copilot)
 * - Any other tool-specific configuration files
 */

import { DocGenerator } from './doc-generator';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface AgentsMdOptions {
  projectName: string;
  projectPath: string;
  templatePath?: string;
}

/**
 * Generate universal AGENTS.md file
 */
export class AgentsMdGenerator {
  private docGen: DocGenerator;

  constructor(
    skillsDir?: string,
    agentsDir?: string,
    commandsDir?: string
  ) {
    this.docGen = new DocGenerator(skillsDir, agentsDir, commandsDir);
  }

  /**
   * Generate complete AGENTS.md content
   */
  async generate(options: AgentsMdOptions): Promise<string> {
    // Read template
    const templatePath = options.templatePath ||
      path.join(__dirname, '../templates/AGENTS.md.template');

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`AGENTS.md template not found at: ${templatePath}`);
    }

    let content = await fs.readFile(templatePath, 'utf-8');

    // Extract agents and skills
    const skills = await this.docGen.extractSkills();
    const agents = await this.docGen.extractAgents();

    // Replace placeholders
    content = content.replace(/\{PROJECT_NAME\}/g, options.projectName);
    content = content.replace('{AGENTS_SECTION}', this.generateAgentsSection(agents));
    content = content.replace('{SKILLS_SECTION}', this.generateSkillsSection(skills));
    content = content.replace('{TIMESTAMP}', new Date().toISOString().split('T')[0]);

    return content;
  }

  /**
   * Generate agents section as simple Markdown
   */
  private generateAgentsSection(agents: any[]): string {
    let section = '';

    for (const agent of agents) {
      section += `### ${agent.role}\n`;
      section += `**Purpose**: ${agent.description}\n`;
      section += `**When to use**: ${this.getAgentActivation(agent.name)}\n`;
      section += `**Location**: \`.claude/agents/${agent.name}/AGENT.md\`\n\n`;
    }

    return section;
  }

  /**
   * Get agent activation guidance
   */
  private getAgentActivation(agentName: string): string {
    const activations: Record<string, string> = {
      'pm': 'Creating requirements, user stories, product specs (WHAT/WHY)',
      'architect': 'System design, architecture decisions, technical plans (HOW)',
      'devops': 'Infrastructure, deployment, CI/CD pipelines',
      'qa-lead': 'Test strategy, test cases, quality assurance',
      'security': 'Threat modeling, security review, vulnerability assessment',
      'tech-lead': 'Code review, best practices, refactoring',
      'frontend': 'UI components, React/Vue/Angular implementation',
      'nodejs-backend': 'Node.js/Express/NestJS backend APIs',
      'python-backend': 'FastAPI/Django backend APIs',
      'nextjs': 'Next.js App Router applications',
      'dotnet-backend': 'ASP.NET Core backend APIs',
      'sre': 'Incident response, troubleshooting, runbooks',
      'docs-writer': 'Technical documentation, API docs, guides',
      'performance': 'Performance optimization, profiling, benchmarking'
    };

    return activations[agentName] || 'Specialized tasks requiring this expertise';
  }

  /**
   * Generate skills section as simple Markdown
   */
  private generateSkillsSection(skills: any[]): string {
    let section = '';

    for (const skill of skills) {
      section += `### ${skill.name}\n`;
      section += `**Purpose**: ${skill.description}\n`;
      section += `**When to use**: ${this.getSkillActivation(skill.name)}\n`;
      section += `**Location**: \`.claude/skills/${skill.name}/SKILL.md\`\n\n`;
    }

    return section;
  }

  /**
   * Get skill activation guidance
   */
  private getSkillActivation(skillName: string): string {
    const activations: Record<string, string> = {
      'specweave-detector': 'User asks about SpecWeave commands or workflows',
      'increment-planner': 'Creating new feature increments (/inc command)',
      'context-loader': 'Working on increments, need to load relevant context',
      'skill-router': 'Ambiguous requests that need routing to specific skills',
      'spec-driven-debugging': 'Bug investigation, test failures, unexpected behavior',
      'spec-driven-brainstorming': 'Brainstorming ideas, refining concepts, design thinking',
      'brownfield-analyzer': 'Analyzing existing projects for SpecWeave migration',
      'brownfield-onboarder': 'Onboarding existing projects to SpecWeave',
      'nodejs-backend': 'Node.js/Express/NestJS backend development',
      'python-backend': 'Python/FastAPI/Django backend development',
      'nextjs': 'Next.js App Router application development',
      'frontend': 'React/Vue/Angular frontend development',
      'dotnet-backend': 'ASP.NET Core backend development',
      'e2e-playwright': 'End-to-end testing with Playwright',
      'jira-sync': 'JIRA integration and synchronization',
      'github-sync': 'GitHub issues/milestones synchronization',
      'ado-sync': 'Azure DevOps synchronization',
      'hetzner-provisioner': 'Hetzner Cloud infrastructure provisioning',
      'cost-optimizer': 'Cloud cost optimization and platform comparison',
      'figma-mcp-connector': 'Figma design integration via MCP',
      'design-system-architect': 'Design system and Atomic Design methodology',
      'figma-designer': 'Figma design creation and design tokens',
      'figma-implementer': 'Converting Figma designs to code',
      'figma-to-code': 'Figma to React/Angular code generation',
      'role-orchestrator': 'Multi-agent orchestration for complex tasks',
      'increment-quality-judge': 'AI-powered quality assessment of specs and plans'
    };

    return activations[skillName] || 'Specialized tasks';
  }
}
