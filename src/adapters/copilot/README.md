# GitHub Copilot Adapter

**Automation Level**: Basic (Code suggestions with workspace context)

## Overview

The GitHub Copilot adapter provides **basic automation** for SpecWeave by configuring workspace instructions that Copilot reads to provide better code suggestions.

## Key Limitation: No Custom Commands

Unlike Claude Code (native skills/agents/commands) and Cursor (simulated via .cursorrules), GitHub Copilot does NOT support:
- Custom slash commands
- Workflow automation
- Role-based assistance
- Auto-activation

**What it DOES support**:
- Workspace instructions (.github/copilot/instructions.md)
- Better code suggestions based on project context
- Copilot Chat for Q&A

## What This Adapter Provides

### .github/copilot/instructions.md
- **What**: Workspace guidance that Copilot reads automatically
- **Contains**: Project structure, workflows, best practices
- **Benefit**: Copilot suggests code following SpecWeave patterns

**Example**:
```markdown
# In instructions.md:
## Workflow: Creating Features

1. Create increment folder: .specweave/increments/####-feature-name/
2. Create spec.md (WHAT & WHY - technology-agnostic)
3. Create plan.md (HOW - technology-specific)
4. Create tasks.md (implementation checklist)
5. Create context-manifest.yaml (context loading - 70%+ token savings)
```

When you start typing in spec.md, Copilot suggests content following this structure!

## Installation

```bash
# Install SpecWeave with Copilot adapter
npx specweave init my-project --adapter copilot

# Files created:
# .github/copilot/instructions.md    (workspace instructions)
```

## Directory Structure

```
.github/copilot/
├── instructions.md    # Workspace instructions (Copilot reads this)
└── README.md          # This file
```

## Usage Examples

### Example 1: Creating spec.md

**You**:
1. Create file: `.specweave/increments/0001-auth/spec.md`
2. Start typing YAML frontmatter: `---`

**Copilot** (based on instructions.md):
```markdown
---
increment: 0001-auth
title: "User Authentication"
priority: P1
status: planned
---

# Increment 0001: User Authentication

## Overview
...
```

Copilot suggests the complete structure!

### Example 2: Copilot Chat Q&A

**You**: "How do I create a plan.md following SpecWeave?"

**Copilot** (reads instructions.md):
```
Based on SpecWeave guidelines, plan.md should contain:

1. Architecture section (components, data model, APIs)
2. Technology-specific details (unlike spec.md which is tech-agnostic)
3. References to ADRs (Architecture Decision Records)
4. Implementation strategy

Example structure:
...
```

### Example 3: Context Manifest

**You**: Start typing in `context-manifest.yaml`

**Copilot** (based on patterns in instructions.md):
```yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/auth/spec.md
documentation:
  - .specweave/docs/internal/architecture/auth/design.md
max_context_tokens: 10000
---
```

## Comparison with Other Adapters

| Feature | Claude Code | Cursor | Copilot | Generic |
|---------|-------------|--------|---------|---------|
| **Automation** | Full | Semi | Basic | Manual |
| **Skills** | Native | Simulated | N/A | N/A |
| **Agents** | Native | Manual roles | N/A | N/A |
| **Commands** | Slash commands | Workflow instructions | N/A | Step-by-step guide |
| **Context Shortcuts** | Native | @ shortcuts | N/A | Manual copy-paste |
| **Code Suggestions** | ✅ | ✅ | ✅ | ❌ |
| **Workflow Automation** | ✅ | ⚙️ | ❌ | ❌ |

**Copilot = Basic but useful** (better than nothing!)

## Limitations

❌ **No workflow automation** - Must create folders/files manually
❌ **No skills/agents** - Can't simulate roles like Cursor
❌ **No commands** - No slash commands or @ shortcuts
❌ **No hooks** - Can't auto-update docs
⚠️ **Completely manual workflow** - Just better code suggestions

✅ **But still helpful for**:
- Code completion following SpecWeave patterns
- Suggesting file structures
- Copilot Chat Q&A about project

## When to Use This Adapter

✅ **Use Copilot adapter if**:
- You already use VS Code + GitHub Copilot
- You want better code suggestions
- You don't mind manual workflows
- Simple projects

⚠️ **Consider alternatives if**:
- You want automation → Use Claude Code (full) or Cursor (semi)
- You need skills/agents → Use Claude Code
- You want role-based assistance → Use Claude Code or Cursor

## How Copilot Uses Workspace Instructions

**Automatic (no action needed)**:
1. You open project in VS Code with Copilot
2. Copilot reads `.github/copilot/instructions.md` automatically
3. Copilot understands:
   - SpecWeave structure (.specweave/ folders)
   - File naming (spec.md, plan.md, tasks.md)
   - Patterns (context manifests, test IDs)
   - Best practices (tech-agnostic specs, etc.)

**Result**: Better code suggestions that fit SpecWeave!

**Example**:
- Type `# Increment` → Copilot suggests increment structure
- Type `TC-0001` → Copilot suggests test case format
- Type `context-manifest.yaml` → Copilot suggests manifest structure

## Tips & Tricks

### 1. Reference instructions.md
If Copilot suggests wrong patterns: "Follow .github/copilot/instructions.md"

### 2. Use Copilot Chat
Ask: "How does SpecWeave work?" → Copilot explains from instructions

### 3. Start Typing, Let Copilot Complete
Begin with YAML frontmatter or headers → Copilot fills in rest

### 4. Check Context Manifests
Open context-manifest.yaml → Copilot sees relevant files

## Related Documentation

- [SPECWEAVE.md](../../SPECWEAVE.md) - Complete development guide
- [.github/copilot/instructions.md](.github/copilot/instructions.md) - Workspace instructions
- [Adapter Architecture](../README.md) - Multi-tool design philosophy

---

**Status**: Active (v0.2.0-beta.1+)
**Market Share**: ~40% (GitHub Copilot users)
**Priority**: P1 (large market, even with basic automation)
