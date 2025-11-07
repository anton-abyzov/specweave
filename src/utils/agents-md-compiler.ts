/**
 * AGENTS.md Compiler (Cross-Platform)
 *
 * Compiles SpecWeave plugins (skills, agents, commands) into unified AGENTS.md format
 * for non-Claude tools (Cursor, Copilot, Generic)
 *
 * Reads from NPM package location (auto-detected):
 * - Windows: %APPDATA%\npm\node_modules\specweave\
 * - macOS: /usr/local/lib/node_modules/specweave/ or /opt/homebrew/lib/node_modules/specweave/
 * - Linux: /usr/local/lib/node_modules/specweave/
 * - Local development: ./skills/, ./agents/, ./commands/
 *
 * Supports: Windows 10+, macOS 10.15+, Linux (Ubuntu, Debian, RHEL, etc.)
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

// ============================================================================
// Types
// ============================================================================

interface SkillFrontmatter {
  name: string;
  description: string;
  'allowed-tools'?: string[];
}

interface Skill {
  name: string;
  description: string;
  content: string;
  activationKeywords?: string[];
}

interface Agent {
  name: string;
  role: string;
  description: string;
  content: string;
  activatesFor?: string[];
  capabilities?: string[];
}

interface Command {
  name: string;
  description: string;
  usage: string;
  content: string;
}

interface CompilationResult {
  agentsMd: string;
  skills: Skill[];
  agents: Agent[];
  commands: Command[];
}

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Find SpecWeave installation path (cross-platform)
 *
 * Supports Windows, macOS, and Linux with all common NPM installation locations.
 * Priority: NPM global → NPM local → local development
 *
 * @returns Absolute path to SpecWeave installation
 * @throws Error if SpecWeave installation not found
 */
export function getSpecweaveInstallPath(): string {
  const platform = process.platform;
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';

  // Build platform-specific paths
  const paths: string[] = [];

  // === Windows Paths ===
  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    paths.push(
      // NPM global (most common on Windows)
      path.join(appData, 'npm', 'node_modules', 'specweave'),
      // NPM global (system install)
      path.join(programFiles, 'nodejs', 'node_modules', 'specweave'),
      path.join(programFilesX86, 'nodejs', 'node_modules', 'specweave'),
      // nvm-windows
      path.join(appData, 'nvm', 'node_modules', 'specweave'),
      // Custom prefix
      path.join(homeDir, '.npm-global', 'node_modules', 'specweave'),
    );
  }

  // === macOS Paths ===
  if (platform === 'darwin') {
    paths.push(
      // NPM global (Intel Macs)
      '/usr/local/lib/node_modules/specweave',
      // NPM global (Apple Silicon - Homebrew)
      '/opt/homebrew/lib/node_modules/specweave',
      // NVM (Node Version Manager)
      path.join(homeDir, '.nvm', 'versions', 'node', 'lib', 'node_modules', 'specweave'),
      // Custom prefix
      path.join(homeDir, '.npm-global', 'lib', 'node_modules', 'specweave'),
    );
  }

  // === Linux Paths ===
  if (platform === 'linux') {
    paths.push(
      // NPM global (common)
      '/usr/local/lib/node_modules/specweave',
      '/usr/lib/node_modules/specweave',
      // NVM
      path.join(homeDir, '.nvm', 'versions', 'node', 'lib', 'node_modules', 'specweave'),
      // Custom prefix
      path.join(homeDir, '.npm-global', 'lib', 'node_modules', 'specweave'),
    );
  }

  // === Universal Paths (all platforms) ===
  paths.push(
    // NPM local (project-specific)
    path.join(process.cwd(), 'node_modules', 'specweave'),
    // Local development (current directory)
    process.cwd(),
  );

  // Search for valid installation
  for (const p of paths) {
    try {
      const skillsPath = path.join(p, 'skills');
      if (fs.existsSync(skillsPath)) {
        // Verify it's a valid SpecWeave installation
        const testSkill = path.join(skillsPath, 'increment-planner', 'SKILL.md');
        if (fs.existsSync(testSkill)) {
          return p;
        }
      }
    } catch (error) {
      // Skip invalid paths
      continue;
    }
  }

  throw new Error(
    'Could not find SpecWeave installation. Ensure SpecWeave is installed:\n' +
    '  npm install -g specweave\n\n' +
    'Searched paths:\n' +
    paths.map(p => `  - ${p}`).join('\n')
  );
}

// ============================================================================
// Parsers
// ============================================================================

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  try {
    const frontmatter = yaml.load(match[1]) as any;
    const body = match[2].trim();
    return { frontmatter, body };
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error);
    return { frontmatter: {}, body: content };
  }
}

/**
 * Read all skills from skills/ directory
 */
export async function readSkills(basePath: string): Promise<Skill[]> {
  const skillsDir = path.join(basePath, 'skills');
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const skillFolders = fs.readdirSync(skillsDir).filter((f) => {
    const stat = fs.statSync(path.join(skillsDir, f));
    return stat.isDirectory();
  });

  const skills: Skill[] = [];

  for (const folder of skillFolders) {
    const skillFile = path.join(skillsDir, folder, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      continue;
    }

    const content = fs.readFileSync(skillFile, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    const skill: Skill = {
      name: frontmatter.name || folder,
      description: frontmatter.description || 'No description',
      content: body,
      activationKeywords: frontmatter.description
        ? extractKeywords(frontmatter.description)
        : [],
    };

    skills.push(skill);
  }

  return skills;
}

/**
 * Read all agents from agents/ directory
 */
export async function readAgents(basePath: string): Promise<Agent[]> {
  const agentsDir = path.join(basePath, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return [];
  }

  const agentFolders = fs.readdirSync(agentsDir).filter((f) => {
    const stat = fs.statSync(path.join(agentsDir, f));
    return stat.isDirectory();
  });

  const agents: Agent[] = [];

  for (const folder of agentFolders) {
    const agentFile = path.join(agentsDir, folder, 'AGENT.md');
    if (!fs.existsSync(agentFile)) {
      continue;
    }

    const content = fs.readFileSync(agentFile, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    const agent: Agent = {
      name: frontmatter.name || folder,
      role: frontmatter.role || 'Agent',
      description: frontmatter.description || 'No description',
      content: body,
      activatesFor: frontmatter['activates-for'] || [],
      capabilities: frontmatter.capabilities || [],
    };

    agents.push(agent);
  }

  return agents;
}

/**
 * Read all commands from commands/ directory
 */
export async function readCommands(basePath: string): Promise<Command[]> {
  const commandsDir = path.join(basePath, 'commands');
  if (!fs.existsSync(commandsDir)) {
    return [];
  }

  const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md'));

  const commands: Command[] = [];

  for (const file of commandFiles) {
    const commandFile = path.join(commandsDir, file);
    const content = fs.readFileSync(commandFile, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    const commandName = frontmatter.name || file.replace('.md', '');

    const command: Command = {
      name: commandName,
      description: frontmatter.description || 'No description',
      usage: `/${commandName}`,
      content: body,
    };

    commands.push(command);
  }

  return commands;
}

/**
 * Extract keywords from description
 */
function extractKeywords(description: string): string[] {
  const words = description.toLowerCase().split(/[,\s]+/);
  return words.filter((w) => w.length > 3);
}

// ============================================================================
// AGENTS.MD Compiler
// ============================================================================

/**
 * Compile plugins to AGENTS.md format
 */
export async function compileToAgentsMd(basePath: string): Promise<CompilationResult> {
  const skills = await readSkills(basePath);
  const agents = await readAgents(basePath);
  const commands = await readCommands(basePath);

  const agentsMd = generateAgentsMd(skills, agents, commands);

  return {
    agentsMd,
    skills,
    agents,
    commands,
  };
}

/**
 * Generate AGENTS.md content
 */
function generateAgentsMd(skills: Skill[], agents: Agent[], commands: Command[]): string {
  const sections: string[] = [];

  // Header
  sections.push(`# SpecWeave Development Guide

**Version**: 0.5.0
**Plugin System**: Claude Code Native + Multi-Tool Support

This project uses SpecWeave for spec-driven development. SpecWeave provides specialized agents, skills, and commands to guide the development workflow.

---

## Quick Start

### For Claude Code Users

\`\`\`bash
# Add SpecWeave marketplace
/plugin marketplace add anton-abyzov/specweave

# Install core framework
/plugin install specweave

# Install GitHub plugin (optional)
/plugin install specweave-github
\`\`\`

### For Other Tools (Cursor, Copilot, etc.)

This AGENTS.md file contains all necessary context. Your AI assistant will automatically read it.

---
`);

  // Agents section
  sections.push(`## Available Agents\n`);

  for (const agent of agents) {
    const emoji = getAgentEmoji(agent.name);
    sections.push(`### ${emoji} ${capitalize(agent.name)} (${agent.role})\n`);
    sections.push(`**Description**: ${agent.description}\n`);

    if (agent.activatesFor && agent.activatesFor.length > 0) {
      sections.push(`**Activates for**: ${agent.activatesFor.join(', ')}\n`);
    }

    if (agent.capabilities && agent.capabilities.length > 0) {
      sections.push(`**Capabilities**:\n`);
      for (const cap of agent.capabilities) {
        sections.push(`- ${cap}\n`);
      }
    }

    sections.push(`\n---\n\n`);
  }

  // Skills section
  sections.push(`## Available Skills\n`);

  for (const skill of skills) {
    sections.push(`### ${skill.name}\n`);
    sections.push(`**Description**: ${skill.description}\n`);

    if (skill.activationKeywords && skill.activationKeywords.length > 0) {
      sections.push(`**Activates for**: ${skill.activationKeywords.slice(0, 5).join(', ')}\n`);
    }

    sections.push(`\n---\n\n`);
  }

  // Commands section
  sections.push(`## Available Commands\n`);

  for (const command of commands) {
    sections.push(`### ${command.usage}\n`);
    sections.push(`**Description**: ${command.description}\n`);
    sections.push(`\n---\n\n`);
  }

  // Project structure
  sections.push(`## Project Structure

\`\`\`
.specweave/
├── increments/              # Feature development
│   ├── 0001-feature-name/
│   │   ├── spec.md          # Product specification
│   │   ├── plan.md          # Technical implementation
│   │   ├── tasks.md         # Actionable tasks
│   │   ├── tests.md         # Test strategy
│   │   ├── logs/            # Execution logs
│   │   ├── reports/         # Analysis files
│   │   └── scripts/         # Helper scripts
│   └── _backlog/            # Planned future work
│
├── docs/
│   ├── internal/            # Strategic docs (NEVER published)
│   │   ├── strategy/        # Business strategy, market analysis
│   │   ├── architecture/    # Technical architecture
│   │   │   ├── adr/         # Architecture Decision Records
│   │   │   ├── rfc/         # Request for Comments
│   │   │   ├── diagrams/    # Mermaid + SVG diagrams
│   │   │   └── hld-*.md     # High-Level Design
│   │   └── delivery/        # Implementation notes, runbooks
│   │
│   └── public/              # User-facing docs (can publish)
│       ├── guides/
│       └── api/
│
└── logs/                    # Framework logs (gitignored)
\`\`\`

---

## Typical Workflow

### 1. Plan New Increment

\`\`\`bash
/specweave.inc "user authentication with OAuth"
\`\`\`

Creates:
- \`.specweave/increments/0001-user-authentication/spec.md\`
- \`.specweave/increments/0001-user-authentication/plan.md\`
- \`.specweave/increments/0001-user-authentication/tasks.md\`
- \`.specweave/increments/0001-user-authentication/tests.md\`

### 2. Execute Tasks

\`\`\`bash
/specweave.do
\`\`\`

- Executes tasks sequentially
- Hooks fire after EVERY task
- Living docs update automatically

### 3. Check Progress

\`\`\`bash
/specweave.progress
\`\`\`

Shows completion percentage and next action.

### 4. Close Increment

\`\`\`bash
/specweave.done 0001
\`\`\`

PM validation, updates status.

---

## Best Practices

### DO:
- ✅ Always start with \`/specweave.inc\` for new features
- ✅ Review specs before implementation
- ✅ Execute tasks via \`/specweave.do\` (hooks fire automatically)
- ✅ Validate before closing: \`/specweave.validate\`

### DON'T:
- ❌ Skip spec creation (no "cowboy coding")
- ❌ Create files in project root (use increment folders)
- ❌ Ignore PM gate validation

---

**Last Updated**: 2025-11-02 (v0.5.0)
`);

  return sections.join('');
}

/**
 * Get emoji for agent type
 */
function getAgentEmoji(name: string): string {
  const emojiMap: Record<string, string> = {
    pm: '🎯',
    architect: '🏗️',
    'tech-lead': '👨‍💻',
    'github-manager': '🐙',
  };
  return emojiMap[name.toLowerCase()] || '🤖';
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Export Main Function
// ============================================================================

export { CompilationResult };
