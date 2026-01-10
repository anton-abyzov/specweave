/**
 * Documentation Generator for Adapters
 *
 * Generates markdown documentation from actual skills/agents/commands
 * for use in adapter instruction files (.cursorrules, instructions.md, etc.)
 */

import * as fs from '../utils/fs-native.js';
import * as path from 'path';
import * as YAML from 'yaml';
import { getDirname } from '../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

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
