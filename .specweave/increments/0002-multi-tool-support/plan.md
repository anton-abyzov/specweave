---
increment: 0002-multi-tool-support
title: "Technical Plan: Multi-Tool Compatibility"
created: 2025-10-27
updated: 2025-10-27
---

# Technical Plan: Multi-Tool Compatibility & Adapter System

## Architecture Overview

### Current Architecture (v0.1.0-beta.1 - Claude-Only)

```
specweave/
├── .claude/                 # ❌ Claude-specific (blocks other tools)
│   ├── skills/
│   ├── agents/
│   ├── hooks/
│   └── commands/
├── .specweave/              # ✅ Could be universal but referenced by Claude code
│   ├── config.yaml
│   ├── increments/
│   └── docs/
└── CLAUDE.md                # ❌ Claude-specific naming
```

**Problem**: Everything designed for Claude Code exclusively.

### Target Architecture (v0.2.0 - Multi-Tool)

```
specweave/
├── .specweave/              # ✅ Universal core (works everywhere)
│   ├── config.yaml          # Tool-agnostic config
│   ├── increments/          # Plain Markdown
│   ├── docs/                # Plain Markdown
│   └── adapters/            # Tool-specific enhancements (OPTIONAL)
│       ├── claude/
│       │   ├── .claude/     # Skills, agents, hooks
│       │   └── README.md
│       ├── cursor/
│       │   ├── .cursorrules
│       │   └── README.md
│       ├── copilot/
│       │   ├── .github/copilot/instructions.md
│       │   └── README.md
│       └── generic/
│           ├── SPECWEAVE.md
│           └── README.md
│
├── SPECWEAVE.md             # ✅ Tool-agnostic guide
└── .claude/                 # Symlink → .specweave/adapters/claude/.claude/
```

**Key Changes**:
1. Core in `.specweave/` (no tool dependencies)
2. Adapters in `.specweave/adapters/` (optional)
3. `CLAUDE.md` renamed to `SPECWEAVE.md`
4. Backward compatibility via symlinks

---

## Component Design

### 1. Adapter Registry

**Location**: `src/adapters/registry.yaml`

**Purpose**: Central registry of all available adapters

**Format**:
```yaml
---
adapters:
  - name: claude
    description: "Full automation with Claude Code (skills, agents, hooks)"
    automation_level: "full"
    requires:
      - claude-code-cli
    files:
      - .claude/skills/
      - .claude/agents/
      - .claude/hooks/
      - .claude/commands/
    status: "stable"

  - name: cursor
    description: "Semi-automation with Cursor (.cursorrules + context shortcuts)"
    automation_level: "semi"
    requires:
      - cursor-editor
    files:
      - .cursorrules
      - .cursor/context/
    status: "stable"

  - name: copilot
    description: "Basic automation with GitHub Copilot (workspace instructions)"
    automation_level: "basic"
    requires:
      - github-copilot
    files:
      - .github/copilot/instructions.md
    status: "stable"

  - name: generic
    description: "Manual workflow (works with ANY AI tool)"
    automation_level: "manual"
    requires: []
    files:
      - SPECWEAVE.md
    status: "stable"
---
```

### 2. Adapter Interface

**Location**: `src/adapters/adapter-interface.ts`

**Purpose**: Define standard interface all adapters must implement

**TypeScript Interface**:
```typescript
interface Adapter {
  name: string;
  description: string;
  automationLevel: 'full' | 'semi' | 'basic' | 'manual';

  // Installation
  install(projectPath: string, options: AdapterOptions): Promise<void>;

  // Detection
  detect(projectPath: string): Promise<boolean>;

  // Requirements check
  checkRequirements(): Promise<RequirementsResult>;

  // Files to install
  getFiles(): AdapterFile[];

  // Post-install instructions
  getInstructions(): string;
}

interface AdapterOptions {
  force?: boolean;           // Overwrite existing files
  preserveExisting?: boolean; // Keep existing adapter files
}

interface RequirementsResult {
  satisfied: boolean;
  missing: string[];
  warnings: string[];
}

interface AdapterFile {
  source: string;            // Path in src/adapters/{name}/
  destination: string;       // Path in user project
  type: 'file' | 'directory' | 'symlink';
  overwrite: boolean;
}
```

### 3. Adapter Base Class

**Location**: `src/adapters/adapter-base.ts`

**Purpose**: Shared implementation for all adapters

**TypeScript Class**:
```typescript
abstract class AdapterBase implements Adapter {
  abstract name: string;
  abstract description: string;
  abstract automationLevel: 'full' | 'semi' | 'basic' | 'manual';

  async install(projectPath: string, options: AdapterOptions): Promise<void> {
    // 1. Check requirements
    const reqResult = await this.checkRequirements();
    if (!reqResult.satisfied) {
      throw new Error(`Requirements not met: ${reqResult.missing.join(', ')}`);
    }

    // 2. Get files to install
    const files = this.getFiles();

    // 3. Copy files
    for (const file of files) {
      await this.copyFile(file, projectPath, options);
    }

    // 4. Run post-install hooks
    await this.postInstall(projectPath);

    // 5. Show instructions
    console.log(this.getInstructions());
  }

  protected abstract postInstall(projectPath: string): Promise<void>;

  // Utility methods
  protected async copyFile(file: AdapterFile, projectPath: string, options: AdapterOptions): Promise<void> {
    // Implementation
  }
}
```

---

## Adapter Implementations

### Adapter 1: Claude (Full Automation)

**Location**: `src/adapters/claude/`

**Structure**:
```
src/adapters/claude/
├── README.md                # Setup instructions
├── adapter.ts               # Claude adapter implementation
├── install.sh               # Installation script
├── .claude/                 # Files to copy
│   ├── skills/              # All SpecWeave skills
│   ├── agents/              # All SpecWeave agents
│   ├── hooks/               # All SpecWeave hooks
│   └── commands/            # All slash commands
└── test-cases/
    ├── test-1-install.yaml
    ├── test-2-detection.yaml
    └── test-3-workflow.yaml
```

**Implementation** (`adapter.ts`):
```typescript
export class ClaudeAdapter extends AdapterBase {
  name = 'claude';
  description = 'Full automation with Claude Code';
  automationLevel: 'full' as const;

  async detect(projectPath: string): Promise<boolean> {
    // Check if Claude Code CLI is available
    const hasClaudeCLI = await commandExists('claude');
    const hasClaudeDir = fs.existsSync(path.join(projectPath, '.claude'));

    return hasClaudeCLI || hasClaudeDir;
  }

  async checkRequirements(): Promise<RequirementsResult> {
    const hasClaudeCLI = await commandExists('claude');

    return {
      satisfied: hasClaudeCLI,
      missing: hasClaudeCLI ? [] : ['Claude Code CLI'],
      warnings: hasClaudeCLI ? [] : ['Install Claude Code for best experience']
    };
  }

  getFiles(): AdapterFile[] {
    return [
      {
        source: 'src/adapters/claude/.claude/',
        destination: '.claude/',
        type: 'directory',
        overwrite: false
      }
    ];
  }

  protected async postInstall(projectPath: string): Promise<void> {
    // Make hooks executable
    const hooksDir = path.join(projectPath, '.claude/hooks');
    if (fs.existsSync(hooksDir)) {
      const hooks = fs.readdirSync(hooksDir);
      for (const hook of hooks) {
        if (hook.endsWith('.sh')) {
          fs.chmodSync(path.join(hooksDir, hook), '755');
        }
      }
    }
  }

  getInstructions(): string {
    return `
✅ Claude adapter installed!

📁 Installed:
   • .claude/skills/ - 24 AI skills
   • .claude/agents/ - 19 specialized agents
   • .claude/hooks/ - Auto-update hooks
   • .claude/commands/ - Slash commands

🚀 Next steps:
   1. Restart Claude Code to load components
   2. Try: /create-increment "your feature"
   3. Claude will auto-activate SpecWeave skills

📖 Docs: https://github.com/specweave/specweave/blob/main/docs/adapters/claude.md
    `;
  }
}
```

### Adapter 2: Cursor (Semi-Automation)

**Location**: `src/adapters/cursor/`

**Structure**:
```
src/adapters/cursor/
├── README.md
├── adapter.ts
├── .cursorrules             # Main Cursor config
├── .cursor/
│   └── context/
│       ├── increments-context.md    # @ shortcuts
│       ├── docs-context.md
│       └── strategy-context.md
└── test-cases/
    ├── test-1-install.yaml
    ├── test-2-cursorrules.yaml
    └── test-3-context-shortcuts.yaml
```

**`.cursorrules` Content**:
```markdown
# SpecWeave Configuration for Cursor

## Project Type
This is a SpecWeave project using spec-driven development.
Specifications in `.specweave/` are the source of truth.

## Core Workflow

### When user requests a feature:
1. Check if increment exists in `.specweave/increments/####-name/`
2. If not, create:
   - `spec.md` - WHAT and WHY (technology-agnostic)
   - `plan.md` - HOW (technical design with ADRs)
   - `tasks.md` - Implementation checklist
   - `context-manifest.yaml` - Which docs to load

### Context Loading (70%+ Token Reduction)

**CRITICAL**: Always read `context-manifest.yaml` first!

```yaml
# Example: .specweave/increments/0001-auth/context-manifest.yaml
spec_sections:
  - .specweave/docs/internal/strategy/auth/authentication-spec.md
documentation:
  - .specweave/docs/internal/architecture/auth-hld.md
  - SPECWEAVE.md#authentication
max_context_tokens: 10000
```

**Only load files listed in context-manifest.yaml** - DO NOT load all specs!

### Implementation Rules

1. **Follow tasks.md**: Check off tasks with `- [x]` when complete
2. **Reference TC IDs**: Use TC-0001 format in test names
3. **Technology-agnostic specs**: Never mention React/FastAPI in spec.md
4. **Technical in plans**: Put React/FastAPI details in plan.md
5. **Living documentation**: Update docs when code changes

## @ Context Shortcuts

Use Composer with these shortcuts for quick context loading:

### @increments
Loads current increment's:
- spec.md (WHAT/WHY)
- plan.md (HOW)
- tasks.md (TODO)
- context-manifest.yaml (then load referenced docs)

### @docs
Loads architecture documentation:
- .specweave/docs/internal/architecture/system-design.md
- .specweave/docs/internal/architecture/adr/ (relevant ADRs)

### @strategy
Loads business specifications:
- .specweave/docs/internal/strategy/ (relevant modules)

### @tests
Loads test strategy:
- Current increment's tests.md
- Test coverage matrix

## Composer Multi-File Editing

When creating increments, use Composer to:
1. Create all files simultaneously (spec.md + plan.md + tasks.md)
2. Update multiple docs for consistency
3. Generate code across multiple files

## Testing Requirements

When UI exists:
- **MANDATORY**: Create Playwright E2E tests
- **Truth-telling**: Tests must verify actual behavior (no false positives)
- **TC IDs**: Reference acceptance criteria (TC-0001, TC-0002, etc.)

## Example Workflow

```
User: "Create user authentication"

You:
1. Create .specweave/increments/0001-user-authentication/
2. Create spec.md with user stories + TC-0001 acceptance criteria
3. Create plan.md with architecture + ADR references
4. Create tasks.md with implementation checklist
5. Create context-manifest.yaml listing relevant docs
6. Implement following tasks.md
7. Create Playwright tests referencing TC IDs
8. Update documentation
```

## File Naming Conventions

- Increments: `####-short-name` (e.g., `0001-user-authentication`)
- ADRs: `####-decision-title.md` (e.g., `0001-auth-method.md`)
- Test cases: `TC-0001`, `TC-0002` format
- Diagrams: `{type}-{name}.mmd` (e.g., `context-authentication.mmd`)

## Important Reminders

- ✅ Specs are technology-agnostic (WHAT/WHY only)
- ✅ Plans have technical details (HOW with specific tech)
- ✅ Context manifests save 70%+ tokens
- ✅ Load ONLY what manifest specifies
- ✅ E2E tests mandatory for UI
- ✅ Keep docs updated (living documentation)
```

**Implementation** (`adapter.ts`):
```typescript
export class CursorAdapter extends AdapterBase {
  name = 'cursor';
  description = 'Semi-automation with Cursor';
  automationLevel: 'semi' as const;

  async detect(projectPath: string): Promise<boolean> {
    return fs.existsSync(path.join(projectPath, '.cursorrules'));
  }

  async checkRequirements(): Promise<RequirementsResult> {
    // Cursor doesn't have CLI to detect, just recommend
    return {
      satisfied: true,
      missing: [],
      warnings: ['Install Cursor editor for best experience: https://cursor.sh']
    };
  }

  getFiles(): AdapterFile[] {
    return [
      {
        source: 'src/adapters/cursor/.cursorrules',
        destination: '.cursorrules',
        type: 'file',
        overwrite: true
      },
      {
        source: 'src/adapters/cursor/.cursor/',
        destination: '.cursor/',
        type: 'directory',
        overwrite: false
      }
    ];
  }

  protected async postInstall(projectPath: string): Promise<void> {
    // No post-install actions needed
  }

  getInstructions(): string {
    return `
✅ Cursor adapter installed!

📁 Installed:
   • .cursorrules - SpecWeave workflow configuration
   • .cursor/context/ - @ shortcuts for quick context

🚀 Next steps:
   1. Open project in Cursor
   2. Use Composer with @ shortcuts:
      • @increments - Load current increment
      • @docs - Load architecture docs
      • @strategy - Load specifications
   3. Create features with Composer multi-file editing

💡 Tips:
   - Always read context-manifest.yaml first
   - Use Composer for creating increment structure
   - @ shortcuts save 70%+ tokens

📖 Docs: https://github.com/specweave/specweave/blob/main/docs/adapters/cursor.md
    `;
  }
}
```

### Adapter 3: Copilot (Basic Automation)

**Location**: `src/adapters/copilot/`

**Structure**:
```
src/adapters/copilot/
├── README.md
├── adapter.ts
├── .github/
│   └── copilot/
│       └── instructions.md     # Workspace instructions
└── test-cases/
    ├── test-1-install.yaml
    ├── test-2-instructions.yaml
    └── test-3-suggestions.yaml
```

**`.github/copilot/instructions.md` Content**:
```markdown
# SpecWeave Workspace Instructions

## Project Overview

This project uses **SpecWeave** for spec-driven development.

**Key Principle**: Specifications are the source of truth. Code expresses specifications in a particular language.

## Directory Structure

```
.specweave/
├── config.yaml               # Project configuration
├── increments/               # Auto-numbered features
│   └── ####-feature-name/
│       ├── spec.md           # WHAT and WHY (technology-agnostic)
│       ├── plan.md           # HOW (technical design)
│       ├── tasks.md          # Implementation checklist
│       ├── tests.md          # Test strategy
│       └── context-manifest.yaml  # Context loading (70%+ token reduction)
└── docs/
    ├── internal/strategy/    # Business specifications
    └── internal/architecture/ # Technical documentation
```

## Workflow: Creating Features

When user requests a feature:

1. **Create increment folder**:
   ```
   .specweave/increments/####-short-name/
   ```
   Auto-increment the number (e.g., 0001, 0002, 0003)

2. **Create spec.md** (WHAT and WHY):
   - Overview (what this feature does and why it matters)
   - User stories (As a..., I want..., So that...)
   - Acceptance criteria (TC-0001 format, testable conditions)
   - Success criteria (metrics, KPIs)
   - **Technology-agnostic**: No mentions of React, FastAPI, etc.

3. **Create plan.md** (HOW):
   - Architecture decisions (with ADR references)
   - Component design (modules, services, APIs)
   - Data models (database schema, entities)
   - Integration points (external systems)
   - **Technology-specific**: React, FastAPI, PostgreSQL details here

4. **Create tasks.md** (Implementation):
   - Checklist format: `- [ ] Task description`
   - Mark complete: `- [x] Task description`
   - Priorities: P1 (critical), P2 (important), P3 (nice-to-have)
   - Dependencies noted

5. **Create context-manifest.yaml** (Context loading):
   ```yaml
   spec_sections:
     - .specweave/docs/internal/strategy/auth/authentication-spec.md
   documentation:
     - .specweave/docs/internal/architecture/auth-hld.md
   max_context_tokens: 10000
   ```
   **IMPORTANT**: Only load files listed in context-manifest.yaml (saves 70%+ tokens)

## Context Loading (CRITICAL)

**Always read context-manifest.yaml first!**

Instead of loading all specs:
- ❌ Don't load: All files in `.specweave/docs/`
- ✅ Do load: Only files listed in `context-manifest.yaml`

This achieves **70%+ token reduction** and faster responses.

## Code Suggestions

When suggesting code:
- Read the increment's spec.md and plan.md
- Follow the architecture defined in plan.md
- Reference TC-0001 IDs in test names
- Follow technology choices from plan.md
- Check tasks.md for what's already done

## Testing

When UI exists:
- Create Playwright E2E tests (MANDATORY)
- Reference TC-0001 IDs from spec.md in test names
- Tests must verify actual behavior (truth-telling requirement)

Example:
```typescript
// tests/e2e/login.spec.ts
test('TC-0001: Valid Login Flow', async ({ page }) => {
  // Given: User has account
  // When: User enters valid credentials
  // Then: Redirect to dashboard
});
```

## Documentation

SpecWeave uses 5-pillar documentation:
1. **Strategy** (.specweave/docs/internal/strategy/) - Business specifications
2. **Architecture** (.specweave/docs/internal/architecture/) - Technical design
3. **Delivery** (.specweave/docs/internal/delivery/) - Roadmap, CI/CD
4. **Operations** (.specweave/docs/internal/operations/) - Runbooks, SLOs
5. **Public** (.specweave/docs/public/) - Published documentation

## File Naming Conventions

- Increments: `####-short-name` (e.g., `0001-user-authentication`)
- ADRs: `####-decision-title.md` (e.g., `0001-auth-method.md`)
- Test cases: `TC-0001`, `TC-0002` format
- Diagrams: `{type}-{name}.mmd` (e.g., `context-authentication.mmd`)

## Important Principles

- ✅ Specifications before implementation (define WHAT/WHY before HOW)
- ✅ Technology-agnostic specs (keep spec.md free of tech details)
- ✅ Technical in plans (put React/FastAPI in plan.md)
- ✅ Context manifests (load only what's needed, save 70%+ tokens)
- ✅ Living documentation (docs evolve with code)
- ✅ Test-validated (E2E tests mandatory for UI)
- ✅ Regression prevention (document before modifying existing code)

## Example: User Authentication Feature

```
.specweave/increments/0001-user-authentication/
├── spec.md
│   # Overview: User authentication system
│   # User Story: As a user, I want to log in...
│   # TC-0001: Valid credentials → dashboard
│   # TC-0002: Invalid password → error message
│
├── plan.md
│   # Architecture: JWT-based authentication
│   # ADR-0001: Chose JWT over sessions
│   # Components: AuthService, TokenManager, UserRepository
│   # Tech stack: FastAPI + PostgreSQL
│
├── tasks.md
│   # - [ ] Create AuthService class
│   # - [ ] Implement JWT token generation
│   # - [ ] Create login endpoint
│
├── tests.md
│   # Test coverage matrix mapping TC-0001 to tests
│
└── context-manifest.yaml
    # Lists only authentication-related docs to load
```

---

**For More Information**: See `SPECWEAVE.md` in project root
```

**Implementation** (`adapter.ts`):
```typescript
export class CopilotAdapter extends AdapterBase {
  name = 'copilot';
  description = 'Basic automation with GitHub Copilot';
  automationLevel: 'basic' as const;

  async detect(projectPath: string): Promise<boolean> {
    return fs.existsSync(path.join(projectPath, '.github/copilot/instructions.md'));
  }

  async checkRequirements(): Promise<RequirementsResult> {
    // Can't detect Copilot easily, just recommend
    return {
      satisfied: true,
      missing: [],
      warnings: ['Install GitHub Copilot extension for VS Code: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot']
    };
  }

  getFiles(): AdapterFile[] {
    return [
      {
        source: 'src/adapters/copilot/.github/copilot/instructions.md',
        destination: '.github/copilot/instructions.md',
        type: 'file',
        overwrite: true
      }
    ];
  }

  protected async postInstall(projectPath: string): Promise<void> {
    // No post-install actions needed
  }

  getInstructions(): string {
    return `
✅ Copilot adapter installed!

📁 Installed:
   • .github/copilot/instructions.md - SpecWeave workspace guidance

🚀 Next steps:
   1. Ensure GitHub Copilot extension is installed in VS Code
   2. Copilot will automatically read workspace instructions
   3. Start creating features - Copilot suggests based on specs

💡 Tips:
   - Copilot reads context manifests for better suggestions
   - Reference spec.md and plan.md in comments for better suggestions
   - Copilot understands SpecWeave structure and conventions

📖 Docs: https://github.com/specweave/specweave/blob/main/docs/adapters/copilot.md
    `;
  }
}
```

### Adapter 4: Generic (Manual Workflow)

**Location**: `src/adapters/generic/`

**Structure**:
```
src/adapters/generic/
├── README.md
├── adapter.ts
├── SPECWEAVE.md             # Manual workflow guide
└── test-cases/
    ├── test-1-install.yaml
    ├── test-2-manual-workflow.yaml
    └── test-3-any-ai.yaml
```

**`SPECWEAVE.md` Content** (abbreviated, full version in code):
```markdown
# SpecWeave Manual Workflow Guide

Welcome to SpecWeave! This guide shows you how to use SpecWeave with **ANY AI tool** (ChatGPT, Gemini, Claude web, etc.).

## What is SpecWeave?

A spec-driven development framework where specifications are the source of truth.

**Benefits even without automation**:
- ✅ Structured approach (specs → plans → tasks)
- ✅ Context precision (70%+ token reduction via manifests)
- ✅ Living documentation (you update it)
- ✅ 4-level testing (specs → features → components → tests)

## Directory Structure

[... full structure explanation ...]

## Creating a Feature (Step-by-Step)

### Step 1: Create Increment Folder

**Your command**:
```bash
mkdir -p .specweave/increments/0001-user-authentication
```

### Step 2: Create Specification

**Ask your AI**:
```
Create a specification in .specweave/increments/0001-user-authentication/spec.md
following this format:
- Overview (what and why)
- User stories (As a..., I want..., So that...)
- Acceptance criteria (TC-0001 format)
- Success criteria (measurable metrics)

Make it technology-agnostic (no mentions of React, FastAPI, etc.).
```

[... complete step-by-step instructions ...]

## Works With

- ChatGPT (web or API)
- Claude (web interface)
- Gemini
- Any AI assistant

[... full guide continues ...]
```

---

## CLI Integration

### Updated CLI Commands

**New flag: --adapter**

```bash
# Auto-detect adapter
specweave init my-project

# Specific adapter
specweave init my-project --adapter claude
specweave init my-project --adapter cursor
specweave init my-project --adapter copilot
specweave init my-project --adapter generic

# List available adapters
specweave list-adapters

# Add adapter to existing project
specweave add-adapter cursor
```

### CLI Implementation

**File**: `src/cli/commands/init.ts` (updated)

```typescript
export async function initCommand(
  projectName?: string,
  options: InitOptions = {}
): Promise<void> {
  // ...existing code...

  // Detect or select adapter
  let adapter: Adapter;
  if (options.adapter) {
    adapter = getAdapter(options.adapter);
  } else {
    adapter = await detectAdapter() || await selectAdapter();
  }

  // Install adapter
  await adapter.install(targetDir, options);

  // ...existing code...
}
```

---

## Backward Compatibility

### Handling Existing beta.1 Projects

**Scenario**: User has SpecWeave v0.1.0-beta.1 (Claude-only) and upgrades.

**Solution**:
1. Detect `.claude/` directory → assume Claude adapter
2. Keep `.claude/` working (don't break existing users)
3. Rename `CLAUDE.md` → `SPECWEAVE.md` (with symlink for backward compat)
4. Add `.specweave/adapters/` directory
5. Allow adding additional adapters (e.g., add Cursor while keeping Claude)

**Implementation**:

```bash
# User upgrades
npm install -g specweave@latest

# SpecWeave detects existing project
cd my-beta1-project
specweave upgrade

# Output:
# 🔍 Detected: SpecWeave v0.1.0-beta.1 project (Claude adapter)
#
# ✅ Backward compatibility maintained:
#    • .claude/ directory preserved
#    • CLAUDE.md → SPECWEAVE.md (symlink created for backward compat)
#    • Claude adapter registered in .specweave/adapters/
#
# 🎉 Your project now supports multi-tool adapters!
#
# Want to add another adapter?
# $ specweave add-adapter cursor
```

---

## Migration Path

### From beta.1 (Claude-only) to beta.2 (Multi-tool)

**Changes**:
1. ✅ `CLAUDE.md` → `SPECWEAVE.md` (symlink for backward compat)
2. ✅ `.claude/` → works as before (now recognized as "Claude adapter")
3. ✅ New: `.specweave/adapters/` directory
4. ✅ New: Can add Cursor, Copilot, Generic adapters
5. ✅ No breaking changes

**User Experience**:
- Existing users: Everything works exactly the same
- New users: Get to choose their adapter
- Flexibility: Can use multiple adapters simultaneously

---

## Testing Strategy

### Test Adapters with Real Tools

**Claude Adapter**:
1. Install Claude Code CLI
2. Run `specweave init test-claude --adapter claude`
3. Verify `.claude/` created with skills, agents, hooks
4. Test slash commands (/create-increment)
5. Verify skills auto-activate

**Cursor Adapter**:
1. Open project in Cursor editor
2. Run `specweave init test-cursor --adapter cursor`
3. Verify `.cursorrules` created
4. Test @ shortcuts (@increments, @docs)
5. Use Composer to create increment

**Copilot Adapter**:
1. Open project in VS Code with Copilot
2. Run `specweave init test-copilot --adapter copilot`
3. Verify `.github/copilot/instructions.md` created
4. Test Copilot suggestions based on specs
5. Verify Copilot reads context manifests

**Generic Adapter**:
1. Use ChatGPT (web interface)
2. Run `specweave init test-generic --adapter generic`
3. Verify `SPECWEAVE.md` created
4. Follow manual workflow guide
5. Test with any AI (Gemini, Claude web, etc.)

---

## Documentation Updates

### Public Docs to Update

1. **Main README.md**:
   - Update installation section (mention adapters)
   - Add "Works with ALL AI tools" badge
   - Show adapter comparison table

2. **INSTALL.md**:
   - Add adapter selection guide
   - Document each adapter's requirements
   - Add troubleshooting per adapter

3. **New: docs/adapters/**:
   - `claude.md` - Complete Claude adapter guide
   - `cursor.md` - Complete Cursor adapter guide
   - `copilot.md` - Complete Copilot adapter guide
   - `generic.md` - Complete generic adapter guide
   - `comparison.md` - Adapter comparison table

4. **CHANGELOG.md**:
   - Document v0.2.0 multi-tool support
   - Explain adapter system
   - Migration guide from beta.1

---

## Success Metrics

### Technical Metrics

- ✅ 4 adapters implemented and tested
- ✅ 100% backward compatibility (beta.1 projects work)
- ✅ CLI supports --adapter flag
- ✅ Each adapter has ≥3 test cases
- ✅ Documentation complete for all adapters

### User Metrics

- ✅ Users can switch AI tools without losing SpecWeave benefits
- ✅ 100% market coverage (works with ANY AI)
- ✅ No vendor lock-in

### Adoption Metrics

- 📊 Track GitHub issues mentioning Cursor/Copilot/Generic
- 📊 Track adapter usage in `specweave init` (telemetry opt-in)
- 📊 Track GitHub stars/forks growth after multi-tool release

---

## Timeline

**Day 1**: Core refactor + Claude adapter (baseline)
**Day 2**: Cursor adapter implementation
**Day 3**: Copilot + Generic adapters
**Day 4**: Testing all adapters
**Day 5**: Documentation updates + PR

**Total**: 5 days to multi-tool compatibility

---

## References

- [spec-kit](https://github.com/github/spec-kit) - Agent-agnostic patterns
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Prompt portability
- [Cursor .cursorrules docs](https://cursor.sh/docs) - Cursor configuration
- [GitHub Copilot workspace instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) - Copilot config

---

**Status**: Ready for implementation
**Next**: Create tasks.md with actionable checklist
