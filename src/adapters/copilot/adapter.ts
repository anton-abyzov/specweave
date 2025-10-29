/**
 * GitHub Copilot Adapter
 *
 * Basic automation adapter for GitHub Copilot.
 * Copilot automatically reads AGENTS.md (universal standard) for context and suggestions.
 *
 * This adapter requires no additional files - Copilot reads AGENTS.md automatically.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';

export class CopilotAdapter extends AdapterBase {
  name = 'copilot';
  description = 'GitHub Copilot adapter - Basic automation with AGENTS.md';
  automationLevel = 'basic' as const;

  /**
   * Detect if GitHub Copilot is available
   *
   * Note: Detection is best-effort since Copilot might be installed
   * but we can't detect it reliably. This adapter is safe to use
   * as a fallback since Copilot reads AGENTS.md (universal standard).
   */
  async detect(): Promise<boolean> {
    // Always return false to make this a manual selection
    // Users can explicitly choose Copilot adapter if they want
    return false;
  }

  /**
   * Get files to install for Copilot adapter
   *
   * Note: Copilot automatically reads AGENTS.md (universal standard).
   * No additional files needed.
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Copilot adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Configuring GitHub Copilot (Basic Automation)\n');

    // No files to install - Copilot reads AGENTS.md automatically
    console.log('✅ Copilot will automatically read AGENTS.md');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Copilot adapter
   */
  getInstructions(): string {
    return `
================================================================
      GitHub Copilot Adapter - Basic Automation
================================================================

Your project is now configured for GitHub Copilot!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Standard)
  - Copilot automatically reads this file
  - Contains all workflow instructions
  - Project structure and templates
  - Following agents.md standard (https://agents.md/)

- Better Code Suggestions
  - Copilot reads AGENTS.md for context
  - Suggests code following SpecWeave patterns
  - Understands project structure

UNDERSTANDING THE DIFFERENCE:

Claude Code (Full Automation):
- Native skills (auto-activate)
- Native agents (separate context windows)
- Native hooks (auto-update docs)
- Slash commands (/inc, /do, /done)

Cursor (Semi-Automation):
- Reads AGENTS.md for workflow
- @ context shortcuts
- Composer multi-file editing

Copilot (Basic Automation - This Adapter):
- Reads AGENTS.md automatically
- Better code suggestions
- No skills, agents, hooks, or commands
- Manual workflow with AI assistance

HOW COPILOT USES AGENTS.MD:

GitHub Copilot automatically reads AGENTS.md to understand:
- SpecWeave structure (.specweave/ folders)
- File naming conventions (spec.md, plan.md, tasks.md)
- Context manifests (what files to reference)
- Best practices (technology-agnostic specs, etc.)

Result: Copilot suggests code that fits SpecWeave patterns!

HOW TO USE SPECWEAVE WITH COPILOT:

1. Copilot reads AGENTS.md automatically
   - No action needed - just open project in VS Code
   - Copilot will suggest code following SpecWeave patterns

2. Create increments manually:
   mkdir -p .specweave/increments/0001-user-auth

3. Reference context manifests:
   Open context-manifest.yaml
   → Copilot sees which files are relevant
   → Provides better suggestions

4. Ask Copilot Chat for guidance:
   "How do I create a spec.md following SpecWeave?"
   "Generate plan.md for user authentication"
   "What should go in context-manifest.yaml?"

5. Use Copilot inline suggestions:
   Start typing in spec.md → Copilot suggests content
   Following SpecWeave patterns from AGENTS.md

WORKFLOW EXAMPLE:

Creating a Feature:

1. Create increment folder:
   mkdir -p .specweave/increments/0002-payments
   cd .specweave/increments/0002-payments

2. Create spec.md:
   - Open file, start typing frontmatter
   - Copilot suggests SpecWeave structure (from AGENTS.md)
   - Fill in user stories, acceptance criteria

3. Create plan.md:
   - Reference spec.md (Copilot reads it)
   - Start typing "# Technical Plan"
   - Copilot suggests architecture sections

4. Create context-manifest.yaml:
   - Copilot suggests relevant files to include
   - Lists spec sections and architecture docs

LIMITATIONS (vs Claude Code & Cursor):

- No auto-activation or workflows
- No skills, agents, hooks
- No slash commands or @ shortcuts
- No role-based assistance (PM, Architect, etc.)
- Completely manual workflow

But Copilot still provides helpful suggestions!
- Understands SpecWeave structure from AGENTS.md
- Suggests code following project patterns

DOCUMENTATION:

- AGENTS.md: Universal workflow instructions (Copilot reads this!)
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave on GitHub Copilot!

Note: For better automation, consider Claude Code (full) or Cursor (semi).
Copilot is best for simple projects or when already using VS Code + Copilot.
    `;
  }
}
