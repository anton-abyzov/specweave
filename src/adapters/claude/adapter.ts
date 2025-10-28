/**
 * Claude Code Adapter
 *
 * Full automation adapter for Claude Code.
 * Provides best-in-class experience with native skills, agents, hooks, and slash commands.
 *
 * This is the BASELINE adapter - all other adapters try to approximate this experience
 * within their tool's capabilities.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';

export class ClaudeAdapter extends AdapterBase {
  name = 'claude';
  description = 'Claude Code adapter - Full automation with skills, agents, hooks, and slash commands';
  automationLevel = 'full' as const;

  /**
   * Detect if Claude Code is available
   *
   * Checks for:
   * - claude command in PATH
   * - Claude Code CLI installation
   */
  async detect(): Promise<boolean> {
    // Check if claude CLI exists
    const hasClaudeCLI = await this.commandExists('claude');

    // Check if .claude directory exists (already using Claude)
    const hasClaudeDir = await this.fileExists('.claude');

    return hasClaudeCLI || hasClaudeDir;
  }

  /**
   * Get files to install for Claude adapter
   *
   * Claude adapter installs:
   * - Skills to .claude/skills/ (auto-activating capabilities)
   * - Agents to .claude/agents/ (specialized roles)
   * - Commands to .claude/commands/ (slash commands)
   * - Hooks to .claude/hooks/ (auto-update mechanisms)
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: 'README.md',
        targetPath: '.claude/README.md',
        description: 'Claude adapter documentation'
      }
      // Note: Skills, agents, commands, hooks are installed via npm scripts
      // (install:skills, install:agents) - not copied here
    ];
  }

  /**
   * Install Claude adapter
   *
   * Since SpecWeave was originally built for Claude Code, the "installation"
   * is actually just ensuring the existing .claude/ structure is correct.
   *
   * Skills, agents, commands, hooks are installed separately via:
   * - npm run install:skills
   * - npm run install:agents
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Claude Code Adapter (Full Automation)\n');

    // Ensure .claude directory exists
    const claudeDir = path.join(options.projectPath, '.claude');
    await fs.ensureDir(claudeDir);

    // Create subdirectories
    await fs.ensureDir(path.join(claudeDir, 'skills'));
    await fs.ensureDir(path.join(claudeDir, 'agents'));
    await fs.ensureDir(path.join(claudeDir, 'commands'));
    await fs.ensureDir(path.join(claudeDir, 'hooks'));

    // Copy README
    await super.install(options);

    console.log('\n✨ Claude adapter structure created!');
    console.log('\n📋 Next steps:');
    console.log('   1. Install skills: npm run install:skills');
    console.log('   2. Install agents: npm run install:agents');
    console.log('   3. Skills will auto-activate when relevant');
    console.log('   4. Use slash commands: /create-increment, /review-docs, etc.');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Claude adapter
   */
  getInstructions(): string {
    return `

================================================================
      Claude Code Adapter - Full Automation
================================================================

Your project is now configured for Claude Code with FULL automation!

QUICK START:

1. Install components:
   npm run install:skills    # Install all skills
   npm run install:agents    # Install all agents

2. Create your first feature:
   Just ask Claude: "Create increment for user authentication"
   - specweave-detector skill activates automatically
   - skill-router routes to increment-planner
   - PM agent creates spec.md
   - Architect agent creates plan.md

3. Use slash commands:
   /create-increment "payment processing"
   /review-docs
   /sync-github

WHAT THIS PROVIDES:

- Skills (Auto-Activating): specweave-detector, skill-router, context-loader, increment-planner
- Agents (Specialized Roles): PM, Architect, DevOps, QA, Security, and 14 more
- Slash Commands: /create-increment, /review-docs, /sync-github, /create-project
- Hooks (Auto-Update): post-task-completion, pre-implementation, docs-changed

WHY CLAUDE CODE IS BEST:

Anthropic Sets Standards (MCP, Skills, Agents) that provide superior results:
- MCP Protocol: Native context management, efficient, standardized
- Skills + Agents: Proven patterns, auto-activation, role-based, separate contexts
- Native Tools: Direct file access, real-time execution
- Result: Superior accuracy, speed, and developer UX

DOCUMENTATION:

- SPECWEAVE.md: Complete development guide
- .specweave/docs/: Project documentation (5-pillar)
- src/skills/: All available skills
- src/agents/: All available agents

You're ready to build with SpecWeave on Claude Code!

For complete documentation, see: .claude/README.md
    `;
  }
}
