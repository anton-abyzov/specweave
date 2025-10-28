/**
 * GitHub Copilot Adapter
 *
 * Basic automation adapter for GitHub Copilot.
 * Provides workspace instructions that Copilot reads for context and suggestions.
 *
 * Since GitHub Copilot has limited configuration (workspace instructions only),
 * this adapter focuses on clear, structured guidance that Copilot can use
 * to provide better code suggestions and completions.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';

export class CopilotAdapter extends AdapterBase {
  name = 'copilot';
  description = 'GitHub Copilot adapter - Basic automation with workspace instructions';
  automationLevel = 'basic' as const;

  /**
   * Detect if GitHub Copilot is available
   *
   * Checks for:
   * - .github/copilot/instructions.md exists
   * - VS Code with Copilot extension
   */
  async detect(): Promise<boolean> {
    const hasInstructions = await this.fileExists('.github/copilot/instructions.md');
    const hasGitHubDir = await this.fileExists('.github');

    // Check for VS Code Copilot extension (best effort)
    // This is approximate - Copilot might be installed but we can't detect reliably
    return hasInstructions || hasGitHubDir;
  }

  /**
   * Get files to install for Copilot adapter
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: '.github/copilot/instructions.md',
        targetPath: '.github/copilot/instructions.md',
        description: 'GitHub Copilot workspace instructions'
      },
      {
        sourcePath: 'README.md',
        targetPath: '.github/copilot/README.md',
        description: 'Copilot adapter documentation'
      }
    ];
  }

  /**
   * Install Copilot adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing GitHub Copilot Adapter (Basic Automation)\n');

    // Ensure .github/copilot directory exists
    const copilotDir = path.join(options.projectPath, '.github', 'copilot');
    await fs.ensureDir(copilotDir);

    // Copy files
    await super.install(options);

    console.log('\n✨ Copilot adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - .github/copilot/instructions.md (workspace guidance)');
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

- Workspace Instructions (.github/copilot/instructions.md)
  - Project overview (SpecWeave framework)
  - Workflow guidance (creating increments)
  - Context manifest explanation
  - File structure reference

- Better Code Suggestions
  - Copilot reads workspace instructions
  - Suggests code following SpecWeave patterns
  - Understands project structure

UNDERSTANDING THE DIFFERENCE:

Claude Code (Full Automation):
- Native skills (auto-activate)
- Native agents (separate context windows)
- Native hooks (auto-update docs)
- Slash commands

Cursor (Semi-Automation):
- Simulated skills (.cursorrules)
- Simulated agents (manual roles)
- @ context shortcuts

Copilot (Basic Automation - This Adapter):
- Workspace instructions only
- Better code suggestions
- No skills, agents, hooks, or commands
- Manual workflow with AI assistance

HOW WE BRIDGE THE GAP:

GitHub Copilot doesn't support custom commands or complex
workflows. But it DOES read workspace instructions to provide
better code suggestions.

We provide clear instructions that teach Copilot about:
- SpecWeave structure (.specweave/ folders)
- File naming conventions (spec.md, plan.md, tasks.md)
- Context manifests (what files to reference)
- Best practices (technology-agnostic specs, etc.)

Result: Copilot suggests code that fits SpecWeave patterns!

HOW TO USE SPECWEAVE WITH COPILOT:

1. Copilot reads workspace instructions automatically
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
   Following SpecWeave patterns from instructions.md

WORKFLOW EXAMPLE:

Creating a Feature:

1. Create increment folder:

   mkdir -p .specweave/increments/0002-payments
   cd .specweave/increments/0002-payments

2. Create spec.md:
   - Open file, start typing frontmatter
   - Copilot suggests SpecWeave structure
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
- Understands SpecWeave structure from instructions
- Suggests code following project patterns

DOCUMENTATION:

- SPECWEAVE.md: Complete development guide
- .github/copilot/instructions.md: Workspace instructions
- .github/copilot/README.md: Copilot adapter guide
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave on GitHub Copilot!

Note: For better automation, consider Claude Code (full) or Cursor (semi).
Copilot is best for simple projects or when already using VS Code + Copilot.
    `;
  }
}
