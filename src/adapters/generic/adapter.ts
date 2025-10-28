/**
 * Generic Adapter
 *
 * Manual workflow adapter that works with ANY AI tool.
 * Provides step-by-step instructions for using SpecWeave without tool-specific features.
 *
 * This adapter ensures 100% compatibility - works with ChatGPT web, Claude web,
 * Gemini, or literally ANY AI that can read markdown and follow instructions.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';

export class GenericAdapter extends AdapterBase {
  name = 'generic';
  description = 'Generic adapter - Manual workflow for ANY AI tool (ChatGPT, Gemini, etc.)';
  automationLevel = 'manual' as const;

  /**
   * Detect if generic adapter should be used
   *
   * This adapter is the universal fallback - always returns true
   * since it works with literally any AI tool.
   */
  async detect(): Promise<boolean> {
    // Generic adapter works with ANY tool - always available
    return true;
  }

  /**
   * Get files to install for Generic adapter
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: 'SPECWEAVE-MANUAL.md',
        targetPath: 'SPECWEAVE-MANUAL.md',
        description: 'Complete manual workflow guide for ANY AI tool'
      },
      {
        sourcePath: 'README.md',
        targetPath: '.specweave/adapters/generic/README.md',
        description: 'Generic adapter documentation'
      }
    ];
  }

  /**
   * Install Generic adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Generic Adapter (Manual Workflow)\n');

    // Generic adapter is simple - just copy manual guide
    await super.install(options);

    console.log('\n✨ Generic adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - SPECWEAVE-MANUAL.md (complete manual workflow guide)');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Get usage instructions for Generic adapter
   */
  getInstructions(): string {
    return `
================================================================
        Generic Adapter - Manual Workflow
================================================================

Your project is now configured for ANY AI tool!

WHAT THIS PROVIDES:

- SPECWEAVE-MANUAL.md (Complete Manual Guide)
  - Step-by-step instructions for creating increments
  - Templates you can copy-paste to any AI
  - Workflow guidance (no tool dependencies)
  - Works with LITERALLY any AI

- 100% Compatibility
  - ChatGPT (web), Claude (web), Gemini
  - Any AI that can read text

UNDERSTANDING "MANUAL":

Manual = You Orchestrate, AI Executes

Example workflow:
1. You read SPECWEAVE-MANUAL.md (Step 1: Create Folder)
2. You run: mkdir -p .specweave/increments/0001-auth
3. You read Step 2: Create spec.md
4. You copy template from manual, paste to AI (ChatGPT)
5. AI generates spec.md content
6. You copy AI's response, save to spec.md file
7. Repeat for plan.md, tasks.md, etc.

Manual does not mean harder - just means YOU control each step (no automation).
Benefit: Works with ANY AI tool!

COMPARISON:

Claude Code (Full): "create increment" -> Done in 30 seconds (auto)
Cursor (Semi): "create increment" -> Done in 5 minutes (.cursorrules)
Copilot (Basic): Create files manually, Copilot suggests content
Generic (Manual): Follow SPECWEAVE-MANUAL.md step-by-step (30-60 min)

Trade-off: Speed vs Compatibility
- Claude Code: Fast, but only works with Claude Code
- Generic: Slower, but works with EVERY AI tool!

WHEN TO USE:

Use Generic adapter if:
- You use ChatGPT web, Claude web, Gemini, or other AI
- You don't have access to Claude Code or Cursor
- You want maximum compatibility (works with ANYTHING)
- Simple projects where automation isn't critical

Consider alternatives if:
- You want automation -> Use Claude Code (full) or Cursor (semi)
- You have file system access -> Use Copilot at minimum
- Large projects -> Manual workflow becomes tedious

QUICK START:

1. Open SPECWEAVE-MANUAL.md
   Read the complete manual workflow guide

2. Follow step-by-step for your first feature
   - Step 1: Create increment folder
   - Step 2: Create spec.md (copy template, paste to AI, save)
   - Step 3: Create plan.md (copy template, paste to AI, save)
   - Step 4: Create tasks.md (copy template, paste to AI, save)

3. Use any AI tool you prefer
   ChatGPT, Claude web, Gemini, Perplexity, etc.

DOCUMENTATION:

- SPECWEAVE-MANUAL.md: Complete step-by-step guide (READ THIS FIRST!)
- SPECWEAVE.md: Complete technical documentation
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave using ANY AI tool!

Remember: Generic = Manual = Copy-paste workflow, but 100% compatible!
    `;
  }
}
