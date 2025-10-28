/**
 * Cursor Adapter
 *
 * Semi-automation adapter for Cursor editor.
 * Provides workflow instructions via .cursorrules and @ context shortcuts.
 *
 * Since Cursor doesn't natively support Claude Code's skills/agents/hooks,
 * this adapter teaches Cursor HOW TO BEHAVE LIKE it has these capabilities.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';

export class CursorAdapter extends AdapterBase {
  name = 'cursor';
  description = 'Cursor adapter - Semi-automation with .cursorrules and @ context shortcuts';
  automationLevel = 'semi' as const;

  /**
   * Detect if Cursor is available
   *
   * Checks for:
   * - cursor command in PATH
   * - .cursor/ directory exists
   * - .cursorrules file exists
   */
  async detect(): Promise<boolean> {
    const hasCursorCLI = await this.commandExists('cursor');
    const hasCursorDir = await this.fileExists('.cursor');
    const hasCursorRules = await this.fileExists('.cursorrules');

    return hasCursorCLI || hasCursorDir || hasCursorRules;
  }

  /**
   * Get files to install for Cursor adapter
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: '.cursorrules',
        targetPath: '.cursorrules',
        description: 'Cursor workflow instructions (how to act like skills/agents)'
      },
      {
        sourcePath: '.cursor/context/increments-context.md',
        targetPath: '.cursor/context/increments-context.md',
        description: '@increments context shortcut'
      },
      {
        sourcePath: '.cursor/context/docs-context.md',
        targetPath: '.cursor/context/docs-context.md',
        description: '@docs context shortcut'
      },
      {
        sourcePath: '.cursor/context/strategy-context.md',
        targetPath: '.cursor/context/strategy-context.md',
        description: '@strategy context shortcut'
      },
      {
        sourcePath: '.cursor/context/tests-context.md',
        targetPath: '.cursor/context/tests-context.md',
        description: '@tests context shortcut'
      },
      {
        sourcePath: 'README.md',
        targetPath: '.cursor/README.md',
        description: 'Cursor adapter documentation'
      }
    ];
  }

  /**
   * Install Cursor adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Cursor Adapter (Semi-Automation)\n');

    // Ensure .cursor directory exists
    const cursorDir = path.join(options.projectPath, '.cursor');
    await fs.ensureDir(cursorDir);
    await fs.ensureDir(path.join(cursorDir, 'context'));

    // Copy files
    await super.install(options);

    console.log('\n✨ Cursor adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - .cursorrules (workflow instructions)');
    console.log('   - .cursor/context/ (@ shortcuts)');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Cursor adapter
   */
  getInstructions(): string {
    return `
================================================================
        Cursor Adapter - Semi-Automation
================================================================

Your project is now configured for Cursor with SEMI-automation!

WHAT THIS PROVIDES:

- .cursorrules (Workflow Instructions)
  - Teaches Cursor HOW to act like Claude Code skills/agents
  - Step-by-step workflow for creating increments
  - Context loading strategy (70%+ token savings)
  - Increment lifecycle management

- @ Context Shortcuts (Quick Access)
  - @increments - Load current increment files
  - @docs - Load architecture documentation
  - @strategy - Load business specifications
  - @tests - Load test strategy and cases

- Composer Multi-File Editing
  - Create multiple files simultaneously
  - Edit across spec.md, plan.md, tasks.md

UNDERSTANDING THE DIFFERENCE:

Claude Code (Full Automation):
- Native skills (auto-activate)
- Native agents (separate context windows)
- Native hooks (auto-update docs)
- Slash commands (/create-increment)

Cursor (Semi-Automation - This Adapter):
- Simulated skills (via .cursorrules instructions)
- Simulated agents (manual role invocation)
- No hooks (manual doc updates)
- Simulated commands (via workflow instructions)

HOW WE BRIDGE THE GAP:

Anthropic's standards (skills, agents, MCP) provide superior
results. For Cursor, we provide "implementation guides"
that teach Cursor's AI how to BEHAVE LIKE it has these
capabilities, even without native support.

Example: .cursorrules says:
"When user requests feature, act like 'increment-planner' skill:
 1. Read context-manifest.yaml
 2. Load only files listed there
 3. Invoke PM role: Create spec.md
 4. Invoke Architect role: Create plan.md"

HOW TO "IMPLEMENT" SKILLS IN CURSOR:

What is a SpecWeave Skill?
A skill is a specialized capability that activates when needed.

In Claude Code: Skills are native (.claude/skills/)
In Cursor: You simulate by reading relevant files

Example: increment-planner skill

Claude Code (automatic):
  User: "create increment for auth"
  → increment-planner skill activates automatically

Cursor (manual simulation):
  User: "create increment for auth"
  → You read .cursorrules
  → Follow workflow: read config → create spec → create plan
  → Act like increment-planner by following those steps

HOW TO "IMPLEMENT" AGENTS IN CURSOR:

What is a SpecWeave Agent?
An agent is a specialized role (PM, Architect, DevOps, etc.)
with separate context window.

In Claude Code: Agents have separate context windows
In Cursor: You adopt the role's perspective

Example: PM agent

Claude Code (automatic):
  Task({ subagent_type: "pm", prompt: "create spec" })
  → PM agent with separate context window

Cursor (manual simulation):
  User: "act as PM agent and create spec"
  → You adopt PM perspective:
    - Focus on WHAT and WHY (not HOW)
    - Technology-agnostic requirements
    - User stories and acceptance criteria
  → Create spec.md following PM role

Pro Tip: .cursorrules defines each role's responsibilities

QUICK START:

1. Open project in Cursor

2. Create your first feature:
   "Create increment for user authentication"

   Cursor will:
   - Read .cursorrules for workflow
   - Ask clarifying questions
   - Create spec.md (acting as PM)
   - Create plan.md (acting as Architect)
   - Create tasks.md

3. Use @ shortcuts for context:
   "@increments show me the current increment"
   "@docs show me the architecture"
   "@strategy show me the business requirements"

4. Use Composer for multi-file edits:
   Cmd+I → "Update spec.md and plan.md to add OAuth2"

CONTEXT LOADING (70%+ Token Savings):

CRITICAL: Always read context-manifest.yaml first!

.cursorrules teaches Cursor:
1. Look for .specweave/increments/####/context-manifest.yaml
2. ONLY load files listed in manifest
3. Don't load all specs (wastes tokens)

Example manifest (YAML):

spec_sections:
  - .specweave/docs/internal/strategy/auth/spec.md
documentation:
  - .specweave/docs/internal/architecture/auth-design.md

Cursor: "Only load these 2 files, not entire docs/ folder"

LIMITATIONS (vs Claude Code):

- No auto-activation (must explicitly request workflows)
- No separate context windows (all context shared)
- No hooks (can't auto-update docs on events)
- Requires manual role adoption (say "act as PM")

But still VERY good experience with Composer + @ shortcuts!

DOCUMENTATION:

- SPECWEAVE.md: Complete development guide
- .cursorrules: Workflow instructions (READ THIS!)
- .cursor/README.md: Cursor-specific documentation
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave on Cursor!

Pro tip: Say "act as [role]" to simulate agents:
- "act as PM and create spec"
- "act as Architect and design system"
- "act as DevOps and create infrastructure"
    `;
  }
}
