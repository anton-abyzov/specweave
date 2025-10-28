/**
 * Documentation Generator for Adapters
 *
 * Generates markdown documentation from actual skills/agents/commands
 * for use in adapter instruction files (.cursorrules, instructions.md, etc.)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';

interface SkillMetadata {
  name: string;
  description: string;
  location: string;
}

interface AgentMetadata {
  name: string;
  role: string;
  description: string;
  location: string;
}

interface CommandMetadata {
  name: string;
  description: string;
  location: string;
}

/**
 * Documentation Generator
 */
export class DocGenerator {
  private skillsDir: string;
  private agentsDir: string;
  private commandsDir: string;

  constructor(
    skillsDir: string = path.join(__dirname, '../skills'),
    agentsDir: string = path.join(__dirname, '../agents'),
    commandsDir: string = path.join(__dirname, '../commands')
  ) {
    this.skillsDir = skillsDir;
    this.agentsDir = agentsDir;
    this.commandsDir = commandsDir;
  }

  /**
   * Extract skills metadata from SKILL.md files
   */
  async extractSkills(): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = [];

    if (!await fs.pathExists(this.skillsDir)) {
      return skills;
    }

    const skillFolders = await fs.readdir(this.skillsDir);

    for (const folder of skillFolders) {
      const skillPath = path.join(this.skillsDir, folder);
      const skillFile = path.join(skillPath, 'SKILL.md');

      if (await fs.pathExists(skillFile)) {
        const content = await fs.readFile(skillFile, 'utf-8');
        const metadata = this.extractYAMLFrontmatter(content);

        if (metadata && metadata.name && metadata.description) {
          skills.push({
            name: metadata.name,
            description: metadata.description,
            location: `.claude/skills/${folder}/SKILL.md`
          });
        }
      }
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extract agents metadata from AGENT.md files
   */
  async extractAgents(): Promise<AgentMetadata[]> {
    const agents: AgentMetadata[] = [];

    if (!await fs.pathExists(this.agentsDir)) {
      return agents;
    }

    const agentFolders = await fs.readdir(this.agentsDir);

    for (const folder of agentFolders) {
      const agentPath = path.join(this.agentsDir, folder);
      const agentFile = path.join(agentPath, 'AGENT.md');

      if (await fs.pathExists(agentFile)) {
        const content = await fs.readFile(agentFile, 'utf-8');

        // Extract role from content (look for "# [Role]" heading)
        const roleMatch = content.match(/^#\s+(.+?)$/m);
        const role = roleMatch ? roleMatch[1].trim() : folder;

        // Extract description (first paragraph after frontmatter)
        const descriptionMatch = content.match(/---\n[\s\S]*?---\n\n(.+?)(?:\n\n|$)/);
        const description = descriptionMatch ? descriptionMatch[1].trim() : `${role} agent`;

        agents.push({
          name: folder,
          role: role,
          description: description,
          location: `.claude/agents/${folder}/AGENT.md`
        });
      }
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extract commands metadata from .md files
   */
  async extractCommands(): Promise<CommandMetadata[]> {
    const commands: CommandMetadata[] = [];

    if (!await fs.pathExists(this.commandsDir)) {
      return commands;
    }

    const commandFiles = await fs.readdir(this.commandsDir);

    for (const file of commandFiles) {
      if (file.endsWith('.md') && file !== 'README.md') {
        const commandPath = path.join(this.commandsDir, file);
        const content = await fs.readFile(commandPath, 'utf-8');

        // Extract description from first paragraph
        const descriptionMatch = content.match(/^(.+?)(?:\n\n|$)/);
        const description = descriptionMatch ? descriptionMatch[1].trim() : '';

        const commandName = file.replace('.md', '');

        commands.push({
          name: commandName,
          description: description,
          location: `.claude/commands/${file}`
        });
      }
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Generate skills documentation for Cursor .cursorrules
   */
  async generateSkillsDocForCursor(): Promise<string> {
    const skills = await this.extractSkills();

    let doc = '## Available Skills (Read SKILL.md when task matches)\n\n';
    doc += 'SpecWeave skills are specialized capabilities. In Claude Code, they auto-activate.\n';
    doc += 'In Cursor, you simulate by reading the skill file and following its workflow.\n\n';

    for (const skill of skills) {
      doc += `### ${skill.name}\n`;
      doc += `**File**: \`${skill.location}\`\n`;
      doc += `**Description**: ${skill.description}\n`;
      doc += `**How to use**: Read the SKILL.md file and follow the workflow described\n\n`;
    }

    return doc;
  }

  /**
   * Generate agents documentation for Cursor .cursorrules
   */
  async generateAgentsDocForCursor(): Promise<string> {
    const agents = await this.extractAgents();

    let doc = '## Agent Roles (Adopt role when specialized expertise needed)\n\n';
    doc += 'SpecWeave agents are specialized roles. In Claude Code, they have separate contexts.\n';
    doc += 'In Cursor, you adopt the role\'s perspective and responsibilities.\n\n';

    for (const agent of agents) {
      doc += `### ${agent.role}\n`;
      doc += `**File**: \`${agent.location}\`\n`;
      doc += `**Description**: ${agent.description}\n`;
      doc += `**When to adopt**: Say "Adopting ${agent.role} role..." and follow AGENT.md guidance\n\n`;
    }

    return doc;
  }

  /**
   * Generate skills documentation for Copilot instructions.md
   */
  async generateSkillsDocForCopilot(): Promise<string> {
    const skills = await this.extractSkills();

    let doc = '## Available Capabilities (SpecWeave Skills)\n\n';
    doc += 'The project uses these specialized capabilities:\n\n';

    for (const skill of skills) {
      doc += `- **${skill.name}**: ${skill.description}\n`;
    }

    doc += '\n_Note: These are defined in `.claude/skills/` but work as documentation for code suggestions._\n\n';

    return doc;
  }

  /**
   * Generate agents documentation for Copilot instructions.md
   */
  async generateAgentsDocForCopilot(): Promise<string> {
    const agents = await this.extractAgents();

    let doc = '## Project Roles (SpecWeave Agents)\n\n';
    doc += 'Code in this project follows these role-based patterns:\n\n';

    for (const agent of agents) {
      doc += `- **${agent.role}**: ${agent.description}\n`;
    }

    doc += '\n_Note: These are defined in `.claude/agents/` but inform code patterns and suggestions._\n\n';

    return doc;
  }

  /**
   * Generate complete manual workflow for generic adapter
   */
  async generateManualWorkflow(): Promise<string> {
    const skills = await this.extractSkills();
    const agents = await this.extractAgents();
    const commands = await this.extractCommands();

    let doc = '# SpecWeave Manual Workflow Guide\n\n';
    doc += '_For use with ANY AI tool (ChatGPT, Claude web, Gemini, etc.)_\n\n';
    doc += '---\n\n';

    doc += '## What is SpecWeave?\n\n';
    doc += 'SpecWeave is a spec-driven development framework where specifications are the source of truth.\n';
    doc += 'This manual shows you how to use SpecWeave WITHOUT specialized tools (works with ANY AI).\n\n';

    doc += '## Available Capabilities\n\n';
    doc += 'While you can\'t auto-activate these like Claude Code, you can reference them:\n\n';

    doc += '### Skills\n\n';
    for (const skill of skills.slice(0, 10)) { // Top 10 skills
      doc += `- **${skill.name}**: ${skill.description}\n`;
    }
    doc += `\n_...and ${skills.length - 10} more in \`.claude/skills/\`_\n\n`;

    doc += '### Roles\n\n';
    for (const agent of agents) {
      doc += `- **${agent.role}**: ${agent.description}\n`;
    }
    doc += '\n';

    doc += '## Step-by-Step: Creating a Feature\n\n';
    doc += '### Step 1: Create Increment Folder\n\n';
    doc += '```bash\n';
    doc += 'mkdir -p .specweave/increments/0001-feature-name\n';
    doc += '```\n\n';

    doc += '### Step 2: Create spec.md (Act as Product Manager)\n\n';
    doc += '_Copy this template to your AI and ask it to fill it out:_\n\n';
    doc += '```markdown\n';
    doc += '---\n';
    doc += 'increment: 0001-feature-name\n';
    doc += 'title: "Feature Title"\n';
    doc += 'priority: P1\n';
    doc += 'status: planned\n';
    doc += '---\n\n';
    doc += '# Increment 0001: Feature Name\n\n';
    doc += '## Overview\n';
    doc += '[Problem and solution]\n\n';
    doc += '## User Stories\n';
    doc += '[User stories with acceptance criteria]\n';
    doc += '```\n\n';

    doc += '### Step 3: Create plan.md (Act as Architect)\n\n';
    doc += '_Copy this template to your AI:_\n\n';
    doc += '```markdown\n';
    doc += '# Technical Plan: Feature Name\n\n';
    doc += '## Architecture\n';
    doc += '[Component design]\n\n';
    doc += '## Data Model\n';
    doc += '[Database schema]\n';
    doc += '```\n\n';

    doc += '### Step 4: Create tasks.md\n\n';
    doc += '```markdown\n';
    doc += '# Implementation Tasks\n\n';
    doc += '- [ ] T001: Task 1\n';
    doc += '- [ ] T002: Task 2\n';
    doc += '```\n\n';

    doc += '### Step 5: Create context-manifest.yaml\n\n';
    doc += '```yaml\n';
    doc += 'spec_sections:\n';
    doc += '  - .specweave/docs/internal/strategy/relevant-spec.md\n';
    doc += 'documentation:\n';
    doc += '  - .specweave/docs/internal/architecture/relevant-design.md\n';
    doc += '```\n\n';

    doc += '## Complete Workflow Reference\n\n';
    doc += 'For detailed guidance, see SPECWEAVE.md in the project root.\n\n';

    return doc;
  }

  /**
   * Extract YAML frontmatter from markdown content
   */
  private extractYAMLFrontmatter(content: string): any {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    try {
      return YAML.parse(match[1]);
    } catch (error) {
      return null;
    }
  }
}
