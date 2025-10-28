/**
 * Codex Adapter (OpenAI)
 *
 * Semi-automation adapter for OpenAI Codex (ChatGPT Code Interpreter/Codex CLI).
 * Uses universal AGENTS.md file for instructions.
 *
 * Codex features:
 * - Works in CLI, IDE, web, GitHub, iOS app
 * - GPT-5-Codex optimized for engineering tasks
 * - File read/write operations
 * - Test execution and validation
 * - Task-based isolated environments
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { AdapterBase } from '../adapter-base';
import { AdapterOptions, AdapterFile } from '../adapter-interface';
import { AgentsMdGenerator } from '../agents-md-generator';

export class CodexAdapter extends AdapterBase {
  name = 'codex';
  description = 'OpenAI Codex adapter - Semi-automation with AGENTS.md and task-based execution';
  automationLevel = 'semi' as const;

  /**
   * Detect if Codex is available
   *
   * Checks for:
   * - codex command in PATH (Codex CLI)
   * - .codex/ directory exists
   * - AGENTS.md file exists (previously configured)
   */
  async detect(): Promise<boolean> {
    const hasCodexCLI = await this.commandExists('codex');
    const hasCodexDir = await this.fileExists('.codex');
    const hasAgentsMd = await this.fileExists('AGENTS.md');

    return hasCodexCLI || hasCodexDir || hasAgentsMd;
  }

  /**
   * Get files to install for Codex adapter
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
        targetPath: '.codex/README.md',
        description: 'Codex adapter documentation'
      }
    ];
  }

  /**
   * Install Codex adapter
   */
  async install(options: AdapterOptions): Promise<void> {
    console.log('\n📦 Installing OpenAI Codex Adapter (Semi-Automation)\n');

    // Ensure .codex directory exists
    const codexDir = path.join(options.projectPath, '.codex');
    await fs.ensureDir(codexDir);

    // Generate AGENTS.md
    const agentsMdPath = path.join(options.projectPath, 'AGENTS.md');
    await this.generateAgentsMd(agentsMdPath, options);

    // Copy README
    const readmePath = path.join(__dirname, 'README.md');
    if (await fs.pathExists(readmePath)) {
      await fs.copy(readmePath, path.join(codexDir, 'README.md'));
    }

    console.log('\n✨ Codex adapter installed!');
    console.log('\n📋 Files created:');
    console.log('   - AGENTS.md (universal instructions)');
    console.log('   - .codex/README.md (adapter documentation)');
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
   * Get usage instructions for Codex adapter
   */
  getInstructions(): string {
    return `
================================================================
      OpenAI Codex Adapter - Semi-Automation
================================================================

Your project is now configured for OpenAI Codex with SEMI-automation!

WHAT THIS PROVIDES:

- AGENTS.md (Universal Instructions)
  - Works with Codex CLI, ChatGPT web, and IDEs
  - Auto-generated from actual skills/agents
  - SpecWeave structure and workflows
  - GPT-5-Codex optimized guidance

- Task-Based Execution
  - Isolated environments per task
  - File read/write operations
  - Test execution and validation

QUICK START:

**Option 1: Codex CLI** (Fastest)

1. Install Codex CLI:

   # Included with ChatGPT Plus, Pro, Business, Enterprise
   npm install -g openai-codex-cli

2. Create your first feature:

   codex "Read AGENTS.md and create increment for user authentication"

   Codex will:
   - Read AGENTS.md for SpecWeave context
   - Adopt PM role: Create spec.md (WHAT/WHY)
   - Adopt Architect role: Create plan.md (HOW)
   - Create tasks.md
   - Execute in isolated environment

**Option 2: ChatGPT Web** (Most Accessible)

1. Open ChatGPT (Plus/Pro/Business/Enterprise)

2. Upload AGENTS.md file

3. Say:
   "I'm using SpecWeave framework. Create increment for user authentication."

4. Copy generated content to files:
   - spec.md
   - plan.md
   - tasks.md

**Option 3: IDE Integration** (If available in your IDE)

Use Codex integration in your IDE (VS Code, JetBrains, etc.)
Reference AGENTS.md for SpecWeave structure.

HOW TO USE:

**With Codex CLI**:
\`\`\`bash
# Explicit reference (recommended):
codex "Read AGENTS.md and [your request]"

# Natural language:
codex "Create a new feature following SpecWeave structure"

# With context:
codex "Following the PM role in AGENTS.md, create requirements for payments"
\`\`\`

**With ChatGPT Web**:
1. Upload AGENTS.md at start of conversation
2. Reference it: "Following AGENTS.md, create increment for..."
3. Download or copy-paste generated files

CONTEXT LOADING (70%+ Token Savings):

CRITICAL: Tell Codex to read context-manifest.yaml first!

\`\`\`bash
# CLI:
codex "Read context-manifest.yaml from increment 0001, load only those files, then implement task T001"

# Web:
# 1. Upload context-manifest.yaml
# 2. Upload only files listed in manifest
# 3. Request task implementation
\`\`\`

FEATURES:

✅ GPT-5-Codex Model
   - Optimized for engineering tasks
   - Trained on complex, real-world projects
   - Code generation, debugging, refactoring

✅ Task-Based Execution
   - Each task in isolated environment
   - Real-time progress monitoring
   - Verifiable evidence (citations, logs)

✅ File Operations
   - Read and edit files
   - Run commands (tests, linters, type checkers)
   - Create new files and directories

✅ Multiple Access Points
   - CLI (fastest)
   - Web (most accessible)
   - IDE (most integrated)
   - GitHub (for PRs)
   - iOS app (mobile)

✅ Test Execution
   - Run test harnesses
   - Validate implementations
   - Ensure quality

EXAMPLE WORKFLOWS:

1. **Create Feature (CLI)**:
   \`\`\`bash
   codex "Read AGENTS.md. Create increment 0002 for payment processing with Stripe. Follow SpecWeave structure."
   \`\`\`

2. **Create Feature (Web)**:
   - Upload AGENTS.md
   - Say: "Create increment for payment processing"
   - Download generated files

3. **Implement Task**:
   \`\`\`bash
   codex "Read increment 0002, implement task T001 (Setup Stripe SDK)"
   \`\`\`

4. **Fix Bug**:
   \`\`\`bash
   codex "Read AGENTS.md and increment 0001. Fix authentication bug. Run tests."
   \`\`\`

5. **Code Review**:
   \`\`\`bash
   codex "Adopt Tech Lead role from AGENTS.md. Review src/auth/ code."
   \`\`\`

TIPS & TRICKS:

1. **Always Reference AGENTS.md**
   - CLI: Explicit in command
   - Web: Upload at conversation start

2. **Use Task-Based Approach**
   - Break work into tasks (T001, T002, etc.)
   - Each task runs in isolated environment
   - Easier to track and validate

3. **Monitor Progress**
   - CLI shows real-time progress (1-30 minutes per task)
   - Web shows thinking process
   - Review citations and logs

4. **Leverage Multiple Access Points**
   - CLI for speed
   - Web for accessibility
   - IDE for integration

5. **Validate with Tests**
   - Codex can run tests automatically
   - Verify implementations work

COMPARISON:

| Feature | Claude Code | Codex |
|---------|-------------|-------|
| **Automation** | Full | Semi |
| **Skills** | Native | Via AGENTS.md |
| **Agents** | Native | Via AGENTS.md |
| **Access** | CLI only | CLI + Web + IDE + GitHub + iOS |
| **Model** | Sonnet 4.5 | GPT-5-Codex |
| **Task Isolation** | No | Yes (isolated environments) |

LIMITATIONS:

- No native skills/agents (manual role adoption via AGENTS.md)
- No hooks (can't auto-update docs on events)
- Tasks run 1-30 minutes (not instant)
- Requires ChatGPT Plus/Pro/Business/Enterprise

But very powerful with GPT-5-Codex and multiple access points!

PLANS & PRICING:

- **ChatGPT Plus**: $20/month (includes Codex CLI + Web)
- **ChatGPT Pro**: $200/month (unlimited, faster)
- **Business/Enterprise**: Custom pricing

Free trial may be available - check OpenAI website.

DOCUMENTATION:

- AGENTS.md: Universal SpecWeave instructions (READ THIS!)
- SPECWEAVE.md: Complete framework documentation
- .codex/README.md: Codex adapter guide
- https://openai.com/codex/

You're ready to build with SpecWeave on OpenAI Codex!

Pro tip: Use CLI for speed, Web for accessibility, and always
reference AGENTS.md for SpecWeave structure!
    `;
  }
}
