/**
 * AGENTS.md Generator
 *
 * Generates a universal AGENTS.md file that works across ALL AI coding tools.
 * Replaces tool-specific files (.cursorrules, copilot instructions, etc.)
 * Follows the agents.md standard: https://agents.md/
 */

import { DocGenerator } from './doc-generator';
import * as path from 'path';

export interface AgentsMdOptions {
  projectName: string;
  projectPath: string;
  adapterName: string;
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
    const skills = await this.docGen.extractSkills();
    const agents = await this.docGen.extractAgents();
    const commands = await this.docGen.extractCommands();

    let content = this.generateHeader(options);
    content += this.generateProjectOverview(options);
    content += this.generateSpecWeaveStructure();
    content += await this.generateSkillsSection(skills);
    content += await this.generateAgentsSection(agents);
    content += await this.generateWorkflowsSection();
    content += this.generateToolSpecificInstructions(options.adapterName);
    content += this.generateFooter();

    return content;
  }

  /**
   * Generate header section
   */
  private generateHeader(options: AgentsMdOptions): string {
    return `# ${options.projectName} - SpecWeave Project

**Framework**: SpecWeave (Spec-Driven Development)
**Universal Format**: This file works with Claude Code, Cursor, Gemini CLI, Codex, GitHub Copilot, and ANY AI tool
**Standard**: Follows [agents.md](https://agents.md/) specification

---

`;
  }

  /**
   * Generate project overview
   */
  private generateProjectOverview(options: AgentsMdOptions): string {
    return `## 🎯 Project Overview

This is a **SpecWeave project** where **specifications and documentation are the source of truth**.

### Core Principle
Specification Before Implementation - Define WHAT and WHY before HOW

### Key Concepts
- **Increments**: Feature units with spec.md (WHAT/WHY), plan.md (HOW), tasks.md (checklist)
- **Context Manifests**: Load only relevant files (70%+ token reduction)
- **Living Documentation**: Specs evolve with code, never diverge
- **Test-Validated**: Every feature proven through automated tests

---

`;
  }

  /**
   * Generate SpecWeave structure documentation
   */
  private generateSpecWeaveStructure(): string {
    return `## 📁 SpecWeave Structure

\`\`\`
.specweave/
├── increments/              # Feature increments
│   └── 0001-feature-name/
│       ├── spec.md          # WHAT & WHY (< 250 lines)
│       ├── plan.md          # HOW (< 500 lines)
│       ├── tasks.md         # Implementation checklist
│       ├── tests.md         # Test strategy
│       └── context-manifest.yaml  # Files to load (token savings!)
├── docs/
│   └── internal/
│       ├── strategy/        # Business specs (WHAT, WHY)
│       ├── architecture/    # Technical design (HOW)
│       ├── delivery/        # Roadmap, CI/CD
│       ├── operations/      # Runbooks, SLOs
│       └── governance/      # Security, compliance
└── config.yaml              # Project configuration
\`\`\`

**CRITICAL**: Always read \`context-manifest.yaml\` first! Only load files listed there.

---

`;
  }

  /**
   * Generate skills section
   */
  private async generateSkillsSection(skills: any[]): Promise<string> {
    let content = `## 🎯 Available Capabilities (Skills)

SpecWeave has specialized capabilities that activate based on your request:

`;

    for (const skill of skills.slice(0, 15)) { // Top 15 skills
      content += `### ${skill.name}\n`;
      content += `**Description**: ${skill.description}\n`;
      content += `**When to use**: Match your request to this description\n\n`;
    }

    if (skills.length > 15) {
      content += `_...and ${skills.length - 15} more capabilities available_\n\n`;
    }

    content += `---\n\n`;
    return content;
  }

  /**
   * Generate agents section
   */
  private async generateAgentsSection(agents: any[]): Promise<string> {
    let content = `## 🤖 Available Roles (Agents)

SpecWeave uses role-based development. When working on tasks, adopt the appropriate role:

`;

    for (const agent of agents) {
      content += `### ${agent.role}\n`;
      content += `**Description**: ${agent.description}\n`;
      content += `**When to adopt**: `

      + this.getAgentActivation(agent.name) + `\n\n`;
    }

    content += `---\n\n`;
    return content;
  }

  /**
   * Get agent activation guidance
   */
  private getAgentActivation(agentName: string): string {
    const activations: Record<string, string> = {
      'pm': 'Creating requirements, user stories, product specs (WHAT/WHY)',
      'architect': 'System design, architecture decisions, technical design (HOW)',
      'devops': 'Infrastructure, deployment, CI/CD pipelines',
      'qa-lead': 'Test strategy, test cases, quality assurance',
      'security': 'Threat modeling, security review, vulnerability assessment',
      'tech-lead': 'Code review, best practices, refactoring',
      'frontend': 'UI components, React/Vue/Angular implementation',
      'nodejs-backend': 'Node.js/Express/NestJS backend APIs',
      'python-backend': 'FastAPI/Django backend APIs',
      'nextjs': 'Next.js App Router applications'
    };

    return activations[agentName] || 'Specialized tasks requiring this expertise';
  }

  /**
   * Generate workflows section
   */
  private async generateWorkflowsSection(): Promise<string> {
    return `## 🔄 Common Workflows

### Creating a Feature Increment

1. **Create Increment Folder**
   \`\`\`bash
   mkdir -p .specweave/increments/0001-feature-name
   \`\`\`

2. **Create spec.md (Adopt PM Role)**
   - Focus on WHAT and WHY (not HOW)
   - Technology-agnostic requirements
   - User stories with acceptance criteria
   - Template:
   \`\`\`markdown
   ---
   increment: 0001-feature-name
   title: "Feature Title"
   status: planned
   ---

   # Increment 0001: Feature Name

   ## Overview
   [Problem statement and solution]

   ## User Stories
   [US-001, US-002, etc.]
   \`\`\`

3. **Create plan.md (Adopt Architect Role)**
   - Focus on HOW (technical implementation)
   - Technology-specific details
   - Component design, data models, APIs
   - Template:
   \`\`\`markdown
   # Technical Plan: Feature Name

   ## Architecture
   [Component design]

   ## Data Model
   [Database schema]

   ## API Contracts
   [Endpoints, request/response]
   \`\`\`

4. **Create tasks.md**
   \`\`\`markdown
   # Implementation Tasks

   - [ ] T001: Setup database schema
   - [ ] T002: Implement API endpoints
   - [ ] T003: Add authentication
   \`\`\`

5. **Create context-manifest.yaml**
   \`\`\`yaml
   spec_sections:
     - .specweave/docs/internal/strategy/relevant-spec.md
   documentation:
     - .specweave/docs/internal/architecture/relevant-design.md
   max_context_tokens: 10000
   \`\`\`

### Context Loading (70%+ Token Savings)

**CRITICAL RULE**: Always read \`context-manifest.yaml\` first!

**Why?**
- Full specs: 500+ pages (50k tokens) ❌
- Manifest files: 50 pages (5k tokens) ✅
- **Savings: 90% = 45k tokens saved!**

**How:**
1. Navigate to increment: \`cd .specweave/increments/0001-feature-name/\`
2. Read manifest: \`cat context-manifest.yaml\`
3. Load ONLY files listed in manifest
4. Do NOT load entire \`.specweave/docs/\` folder

---

`;
  }

  /**
   * Generate tool-specific instructions
   */
  private generateToolSpecificInstructions(adapterName: string): string {
    let content = `## 🔧 Tool-Specific Instructions

`;

    // Claude Code
    content += `### For Claude Code Users (Full Automation)

**Native Support**: Claude Code has native skills, agents, and slash commands.

**Workflow**:
\`\`\`bash
/inc "user authentication"     # Create increment (PM-led)
/build                          # Execute implementation
/progress                       # Check progress
/validate 0001 --quality        # Validate quality
\`\`\`

**Features**:
- Skills auto-activate based on your request
- Agents invoked automatically (PM, Architect, etc.)
- Hooks auto-update documentation
- Context manifests loaded automatically

---

`;

    // Cursor
    content += `### For Cursor Users (Semi-Automation)

**How It Works**: Cursor reads this AGENTS.md file automatically.

**Workflow**:
\`\`\`bash
# In Cursor chat, say:
"Create increment for user authentication"

# Cursor will:
# 1. Read this AGENTS.md file
# 2. Follow SpecWeave structure
# 3. Create spec.md (acting as PM)
# 4. Create plan.md (acting as Architect)
# 5. Create tasks.md
\`\`\`

**@ Shortcuts** (create these for quick access):
- \`@increments\` - Current increment files
- \`@docs\` - Architecture documentation
- \`@strategy\` - Business specifications

**Composer**: Use Cmd+I to edit multiple files simultaneously

---

`;

    // Gemini CLI
    content += `### For Gemini CLI Users (Semi-Automation)

**How It Works**: Gemini CLI can read this AGENTS.md file and use it as context.

**Workflow**:
\`\`\`bash
# In terminal:
gemini "Read AGENTS.md and create increment for user authentication"

# Gemini will:
# 1. Read this file for context
# 2. Follow SpecWeave structure
# 3. Use Agent Mode for multi-file tasks
# 4. Create spec.md, plan.md, tasks.md
\`\`\`

**Features**:
- 1M token context window (can handle large specs!)
- Built-in file operations
- MCP support for extensibility
- Agent mode for complex tasks

**Pro Tip**: Use \`gemini --help\` to see all available commands

---

`;

    // Codex
    content += `### For Codex Users (Semi-Automation)

**How It Works**: Codex CLI can read this AGENTS.md file and project files.

**Workflow**:
\`\`\`bash
# In terminal:
codex "Read AGENTS.md and create increment for user authentication"

# Or in ChatGPT web:
# 1. Upload AGENTS.md
# 2. Say "Create increment for user authentication following SpecWeave"
# 3. Download generated files
\`\`\`

**Features**:
- GPT-5-Codex optimized for engineering tasks
- File read/write operations
- Test execution and validation
- Available in CLI, IDE, web, GitHub

**Access**: Included with ChatGPT Plus, Pro, Business plans

---

`;

    // GitHub Copilot
    content += `### For GitHub Copilot Users (Basic Automation)

**How It Works**: Copilot reads this AGENTS.md file as workspace context.

**Workflow**:
\`\`\`bash
# Open project in VS Code with Copilot
# Copilot automatically reads AGENTS.md

# Start creating files:
# 1. Create .specweave/increments/0001-auth/spec.md
# 2. Start typing - Copilot suggests content following SpecWeave patterns
\`\`\`

**Copilot Chat**:
\`\`\`
User: "How do I create a spec.md following SpecWeave?"
Copilot: [Reads AGENTS.md and provides guidance]
\`\`\`

**Pro Tip**: Reference specific sections: "Follow the PM role from AGENTS.md"

---

`;

    // Generic (any AI)
    content += `### For Other AI Tools (ChatGPT Web, Gemini Web, Claude Web, etc.)

**Manual Workflow**: Copy-paste approach for ANY AI tool.

**Workflow**:
1. **Copy this AGENTS.md file** to your AI chat
2. **Say**: "I'm using SpecWeave framework. Create increment for user authentication."
3. **AI generates**: spec.md, plan.md, tasks.md content
4. **You save**: Copy AI output to files

**Pro Tip**: Reference specific sections:
- "Act as PM role and create spec.md"
- "Act as Architect role and create plan.md"

---

`;

    return content;
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `## 📚 Additional Resources

- **SPECWEAVE.md**: Complete framework documentation (in project root)
- **spec-weave.com**: Official website with guides and examples
- **.specweave/docs/**: Project-specific documentation

## 🔄 Keep This File Updated

This AGENTS.md file is auto-generated during \`specweave init\`.
If you add custom skills or agents, regenerate by running:

\`\`\`bash
specweave update-agents-md
\`\`\`

---

**Generated by SpecWeave** - Universal spec-driven development framework
**Compatible with**: Claude Code, Cursor, Gemini CLI, Codex, GitHub Copilot, and more
**Version**: 0.2.0
**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;
  }
}
