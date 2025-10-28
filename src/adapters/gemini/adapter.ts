/**
 * Gemini CLI Adapter
 *
 * Semi-automation adapter for Google Gemini CLI.
 * Uses universal AGENTS.md file for instructions.
 *
 * Gemini CLI features:
 * - Open-source AI agent (Apache 2.0)
 * - 1M token context window
 * - ReAct loop with built-in tools
 * - MCP (Model Context Protocol) support
 * - Agent mode for multi-file tasks
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';
import { AgentsMdGenerator } from '../agents-md-generator';

export class GeminiAdapter extends AdapterBase {
  name = 'gemini';
  description = 'Gemini CLI adapter - Semi-automation with AGENTS.md and agent mode';
  automationLevel = 'semi' as const;

  /**
   * Detect if Gemini CLI is available
   *
   * Checks for:
   * - gemini command in PATH
   * - .gemini/ directory exists
   * - AGENTS.md file exists (previously configured)
   */
  async detect(): Promise<boolean> {
    const hasGeminiCLI = await this.commandExists('gemini');
    const hasGeminiDir = await this.fileExists('.gemini');
    const hasAgentsMd = await this.fileExists('AGENTS.md');

    return hasGeminiCLI || hasGeminiDir || hasAgentsMd;
  }

  /**
   * Get files to install for Gemini adapter
   */
  getFiles(): AdapterFile[] {
    return [
      {
        sourcePath: 'AGENTS.md',
        targetPath: 'AGENTS.md',
        description: 'Universal SpecWeave instructions (works with all AI tools)'
      },
      {
        sourcePath: 'README.md',
        targetPath: '.gemini/README.md',
        description: 'Gemini adapter documentation'
      }
    ];
  }

  /**
   * Install Gemini adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing Gemini CLI Adapter (Semi-Automation)\n');

    // Ensure .gemini directory exists
    const geminiDir = path.join(options.projectPath, '.gemini');
    await fs.ensureDir(geminiDir);

    // Generate AGENTS.md
    const agentsMdPath = path.join(options.projectPath, 'AGENTS.md');
    await this.generateAgentsMd(agentsMdPath, options);

    // Copy README
    const readmePath = path.join(__dirname, 'README.md');
    if (await fs.pathExists(readmePath)) {
      await fs.copy(readmePath, path.join(geminiDir, 'README.md'));
    }

    console.log('\n✨ Gemini adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - AGENTS.md (universal instructions)');
    console.log('   - .gemini/README.md (adapter documentation)');
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
      projectPath: options.projectPath,
      adapterName: this.name
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
   * Get usage instructions for Gemini adapter
   */
  getInstructions(): string {
    return `
================================================================
      Gemini CLI Adapter - Semi-Automation
================================================================

Your project is now configured for Gemini CLI with SEMI-automation!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Instructions)
  - Works with Gemini CLI AND other tools
  - Auto-generated from actual skills/agents
  - SpecWeave structure and workflows
  - 1M token context window support

- Agent Mode Integration
  - Multi-file task handling
  - ReAct loop with built-in tools
  - MCP support for extensibility

QUICK START:

1. Install Gemini CLI (if not already installed):

   npm install -g @google-cloud/gemini-cli

2. Authenticate:

   gemini auth

3. Create your first feature:

   gemini "Read AGENTS.md and create increment for user authentication"

   Gemini will:
   - Read AGENTS.md for SpecWeave context
   - Adopt PM role: Create spec.md (WHAT/WHY)
   - Adopt Architect role: Create plan.md (HOW)
   - Create tasks.md
   - Use agent mode for multi-file operations

4. Continue development:

   gemini "Implement task T001 from increment 0001"
   gemini "Run tests for increment 0001"
   gemini "Review and fix any issues"

HOW TO USE:

Gemini CLI reads AGENTS.md automatically when you reference it:

\`\`\`bash
# Explicit reference (recommended):
gemini "Read AGENTS.md and [your request]"

# Natural language:
gemini "Create a new feature following SpecWeave structure"

# With context:
gemini "Following the PM role in AGENTS.md, create requirements for payments"
\`\`\`

CONTEXT LOADING (70%+ Token Savings):

CRITICAL: Tell Gemini to read context-manifest.yaml first!

\`\`\`bash
gemini "Read context-manifest.yaml from increment 0001, load only those files, then implement task T001"
\`\`\`

**Why this matters**:
- Gemini has 1M token context window
- But loading everything wastes tokens
- Context manifests = precise, efficient loading

FEATURES:

✅ 1M Token Context Window
   - Can handle large specifications
   - Read entire codebase if needed

✅ Agent Mode
   - Multi-file task completion
   - Automatic planning and execution
   - Interactive approval before changes

✅ Built-in Tools
   - File operations
   - Shell commands
   - Google Search grounding
   - Web fetching

✅ MCP Support
   - Extend with custom integrations
   - Local or remote MCP servers

✅ Free Tier
   - Gemini 2.5 Pro included
   - 60 requests/minute
   - 1,000 requests/day

EXAMPLE WORKFLOWS:

1. **Create Feature**:
   \`\`\`bash
   gemini "Read AGENTS.md. Create increment 0002 for payment processing with Stripe. Follow SpecWeave structure: spec.md (PM role), plan.md (Architect role), tasks.md"
   \`\`\`

2. **Implement Task**:
   \`\`\`bash
   gemini "Read increment 0002, implement task T001 (Setup Stripe SDK)"
   \`\`\`

3. **Fix Bug**:
   \`\`\`bash
   gemini "Read AGENTS.md and increment 0001. Fix authentication bug in login endpoint. Update tests."
   \`\`\`

4. **Review Code**:
   \`\`\`bash
   gemini "Adopt Tech Lead role from AGENTS.md. Review code in src/auth/ and provide feedback"
   \`\`\`

TIPS & TRICKS:

1. **Always Reference AGENTS.md**
   - Ensures Gemini understands SpecWeave structure
   - Provides role definitions (PM, Architect, etc.)

2. **Use Agent Mode**
   - For complex, multi-file tasks
   - Gemini proposes plan before execution
   - You approve changes

3. **Leverage 1M Context Window**
   - Can load large specs
   - But still use context manifests for efficiency

4. **MCP Integration**
   - Connect to your tools (JIRA, GitHub, etc.)
   - See: https://modelcontextprotocol.io/

5. **Check Gemini Documentation**
   - \`gemini --help\`
   - https://developers.google.com/gemini-code-assist/docs/gemini-cli

COMPARISON:

| Feature | Claude Code | Gemini CLI |
|---------|-------------|------------|
| **Automation** | Full | Semi |
| **Skills** | Native | Via AGENTS.md |
| **Agents** | Native | Via AGENTS.md |
| **Context Window** | 200k | 1M (5x larger!) |
| **Cost** | Paid | Free tier available |
| **Open Source** | No | Yes (Apache 2.0) |

LIMITATIONS:

- No native skills/agents (manual role adoption via AGENTS.md)
- No hooks (can't auto-update docs on events)
- Requires explicit instruction referencing
- CLI-only (no IDE integration yet)

But still VERY powerful with 1M context and agent mode!

DOCUMENTATION:

- AGENTS.md: Universal SpecWeave instructions (READ THIS!)
- SPECWEAVE.md: Complete framework documentation
- .gemini/README.md: Gemini adapter guide
- https://developers.google.com/gemini-code-assist/docs/gemini-cli

You're ready to build with SpecWeave on Gemini CLI!

Pro tip: Leverage the 1M token context window for large specifications,
but always use context manifests for efficiency!
    `;
  }
}
