/**
 * Generic Adapter
 *
 * Universal adapter that works with ANY AI tool.
 * All AI tools can read AGENTS.md (universal standard) for workflow instructions.
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
  description = 'Generic adapter - AGENTS.md works with ANY AI tool (ChatGPT, Gemini, etc.)';
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
   *
   * Note: Any AI tool can read AGENTS.md (universal standard).
   * No additional files needed.
   */
  getFiles(): AdapterFile[] {
    return [];
  }

  /**
   * Install Generic adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Configuring for Universal AI Tool Compatibility\n');

    // No files to install - any AI can read AGENTS.md
    console.log('✅ AGENTS.md works with any AI tool (ChatGPT, Gemini, Claude web, etc.)');
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
        Generic Adapter - Universal Compatibility
================================================================

Your project is now configured for ANY AI tool!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Standard)
  - Any AI tool can read this file
  - Contains all workflow instructions
  - Project structure and templates
  - Following agents.md standard (https://agents.md/)

- 100% Compatibility
  - ChatGPT (web), Claude (web), Gemini
  - Any AI that can read markdown

HOW TO USE AGENTS.MD WITH ANY AI:

Method 1: Copy-Paste Workflow (ChatGPT web, Claude web, etc.)
1. Open AGENTS.md in your browser/editor
2. Copy relevant section (e.g., "Creating a Feature Increment")
3. Paste into AI chat (ChatGPT, Claude web, Gemini, etc.)
4. Ask AI to follow the instructions
5. AI generates content (spec.md, plan.md, etc.)
6. Copy AI's response, save to files

Method 2: File System Access (AI with file access)
1. AI automatically reads AGENTS.md
2. Ask: "Create increment for user authentication"
3. AI follows AGENTS.md workflow
4. AI creates files directly

UNDERSTANDING "MANUAL":

Manual = You Orchestrate, AI Executes

Example workflow:
1. Read AGENTS.md section "Creating a Feature Increment"
2. Copy instructions to ChatGPT
3. ChatGPT generates spec.md content
4. Save content to .specweave/increments/0001-auth/spec.md
5. Repeat for plan.md, tasks.md

Manual does not mean harder - just means YOU control each step (no automation).
Benefit: Works with ANY AI tool!

COMPARISON:

Claude Code (Full): "create increment" -> Done in 30 seconds (auto)
Cursor (Semi): "create increment" -> Done in 5 minutes (reads AGENTS.md)
Copilot (Basic): Reads AGENTS.md, suggests content as you type
Generic (Manual): Copy AGENTS.md instructions to any AI (10-30 min)

Trade-off: Speed vs Compatibility
- Claude Code: Fast, but requires Claude Code CLI
- Generic: Slower, but works with EVERY AI tool (even web-based)!

WHEN TO USE:

Use Generic adapter if:
- You use ChatGPT web, Claude web, Gemini, or other AI
- You don't have access to Claude Code or Cursor
- You want maximum compatibility (works with ANYTHING)
- Simple projects where automation isn't critical

Consider alternatives if:
- You want automation -> Use Claude Code (full)
- You have CLI access -> Use Cursor (semi) or Copilot (basic)
- Large projects -> Manual workflow becomes tedious

QUICK START:

1. Open AGENTS.md
   Read the "Common Workflows" section

2. Copy workflow to your AI tool:
   - "Creating a Feature Increment" section
   - Paste into ChatGPT/Claude/Gemini

3. Follow AI's guidance:
   - AI generates spec.md content (copy & save)
   - AI generates plan.md content (copy & save)
   - AI generates tasks.md content (copy & save)

4. Use any AI tool you prefer:
   ChatGPT, Claude web, Gemini, Perplexity, etc.

DOCUMENTATION:

- AGENTS.md: Universal workflow instructions (works with any AI!)
- .specweave/docs/: Project documentation

You're ready to build with SpecWeave using ANY AI tool!

Remember: AGENTS.md is the universal standard - it works everywhere!
    `;
  }
}
