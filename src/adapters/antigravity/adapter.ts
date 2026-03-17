/**
 * Antigravity Adapter (Google)
 *
 * Semi-automation adapter for Google Antigravity code agent.
 * Uses universal AGENTS.md file for instructions.
 *
 * Antigravity features:
 * - Google's AI code agent (Gemini-powered)
 * - Agentic coding with file operations
 * - Built-in tool use and code execution
 * - MCP (Model Context Protocol) support
 * - Integrates with Google Cloud ecosystem
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { AdapterBase } from '../adapter-base.js';
import { AdapterOptions, AdapterFile } from '../adapter-interface.js';
import { AgentsMdGenerator } from '../agents-md-generator.js';
import { getDirname } from '../../utils/esm-helpers.js';
import type { Plugin } from '../../core/types/plugin.js';

const __dirname = getDirname(import.meta.url);

export class AntigravityAdapter extends AdapterBase {
  name = 'antigravity';
  description = 'Antigravity adapter - Semi-automation with AGENTS.md and agentic coding';
  automationLevel = 'semi' as const;

  /**
   * Detect if Antigravity is available
   *
   * Checks for:
   * - antigravity command in PATH
   * - .agent/ directory exists (Antigravity's local config)
   * - AGENTS.md file exists (previously configured)
   */
  async detect(): Promise<boolean> {
    const hasAntigravityCLI = await this.commandExists('antigravity');
    const hasAgentDir = await this.fileExists('.agent');
    const hasAgentsMd = await this.fileExists('AGENTS.md');

    return hasAntigravityCLI || hasAgentDir || hasAgentsMd;
  }

  /**
   * Get files to install for Antigravity adapter
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: 'AGENTS.md',
        targetPath: 'AGENTS.md',
        description: 'Universal SpecWeave instructions (works with all AI tools)'
      }
    ];
  }

  /**
   * Install Antigravity adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Antigravity Adapter (Semi-Automation)\n');

    // Ensure .agent directory exists
    const agentDir = path.join(options.projectPath, '.agent');
    await fs.ensureDir(agentDir);
    await fs.ensureDir(path.join(agentDir, 'skills'));

    // Generate AGENTS.md
    const agentsMdPath = path.join(options.projectPath, 'AGENTS.md');
    await this.generateAgentsMd(agentsMdPath, options);

    console.log('\n✨ Antigravity adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - AGENTS.md (universal instructions)');
    console.log('   - .agent/skills/ (skills directory)');
  }

  /**
   * Generate AGENTS.md file
   */
  private async generateAgentsMd(targetPath: string, options: AdapterOptions): Promise<void> {
    const generator = new AgentsMdGenerator(
      path.join(__dirname, '../../skills'),
      path.join(__dirname, '../../agents'),
      path.join(__dirname, '../../commands')
    );

    const content = await generator.generate({
      projectName: options.projectName,
      projectPath: options.projectPath
    });

    await fs.writeFile(targetPath, content);
    console.log('  ✅ AGENTS.md - Universal SpecWeave instructions');
  }

  /**
   * Post-installation instructions
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    console.log(this.getInstructions());
  }

  /**
   * Check if Antigravity adapter supports plugins
   */
  supportsPlugins(): boolean {
    return true;
  }

  /**
   * Compile and install a plugin for Antigravity.
   * Writes each SKILL.md as a separate file in `.agent/skills/`.
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    const rulesDir = '.agent/skills';
    console.log(`\n📦 Installing plugin skills for Antigravity: ${plugin.manifest.name}`);
    await this.writeSkillFiles(plugin, rulesDir);
    console.log(`   ✓ ${plugin.skills.length} skill(s) written to ${rulesDir}/`);
    console.log(`\n✅ Plugin ${plugin.manifest.name} installed for Antigravity!`);
  }

  /**
   * Unload a plugin from Antigravity — removes skill files from `.agent/skills/`.
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    console.log(`\n🗑️  Unloading plugin from Antigravity: ${pluginName}`);
    await this.removeSkillFiles(pluginName, '.agent/skills');
    console.log(`   ✓ Removed from .agent/skills/`);
    console.log(`\n✅ Plugin ${pluginName} unloaded!`);
  }

  /**
   * Get installed plugins for Antigravity by scanning `.agent/skills/`.
   */
  async getInstalledPlugins(): Promise<string[]> {
    return await this.listInstalledPluginsInDir('.agent/skills');
  }

  /**
   * Get usage instructions for Antigravity adapter
   */
  getInstructions(): string {
    return `
================================================================
      Antigravity Adapter - Semi-Automation
================================================================

Your project is now configured for Antigravity with SEMI-automation!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Instructions)
  - Works with Antigravity AND other tools
  - Auto-generated from actual skills/agents
  - SpecWeave structure and workflows

- Agentic Coding
  - Multi-file task handling
  - Built-in tool use and code execution
  - MCP support for extensibility

QUICK START:

1. Install Antigravity (if not already installed):

   npm install -g @anthropic-ai/antigravity

2. Create your first feature:

   antigravity "Read AGENTS.md and create increment for user authentication"

   Antigravity will:
   - Read AGENTS.md for SpecWeave context
   - Adopt PM role: Create spec.md (WHAT/WHY)
   - Adopt Architect role: Create plan.md (HOW)
   - Create tasks.md
   - Use agentic mode for multi-file operations

3. Continue development:

   antigravity "Implement task T001 from increment 0001"
   antigravity "Run tests for increment 0001"

HOW TO USE:

\`\`\`bash
# Explicit reference (recommended):
antigravity "Read AGENTS.md and [your request]"

# Natural language:
antigravity "Create a new feature following SpecWeave structure"

# With context:
antigravity "Following the PM role in AGENTS.md, create requirements for payments"
\`\`\`

FEATURES:

✅ Gemini-Powered
   - Google's latest AI models
   - Optimized for code generation

✅ Agentic Coding
   - Multi-file task completion
   - Automatic planning and execution
   - File read/write operations

✅ Built-in Tools
   - File operations
   - Shell commands
   - Code execution

✅ MCP Support
   - Extend with custom integrations
   - Local or remote MCP servers

✅ Google Cloud Integration
   - Works with Google Cloud services
   - Enterprise-ready

COMPARISON:

| Feature | Claude Code | Antigravity |
|---------|-------------|-------------|
| **Automation** | Full | Semi |
| **Skills** | Native | Via AGENTS.md |
| **Agents** | Native | Via AGENTS.md |
| **Model** | Opus 4.6 | Gemini |
| **MCP** | Yes | Yes |

LIMITATIONS:

- No native skills/agents (manual role adoption via AGENTS.md)
- No hooks (can't auto-update docs on events)
- Requires explicit instruction referencing

DOCUMENTATION:

- AGENTS.md: Universal SpecWeave instructions (READ THIS!)
- SPECWEAVE.md: Complete framework documentation

You're ready to build with SpecWeave on Antigravity!
    `;
  }
}
