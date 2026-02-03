# Cursor Adapter

**Automation Level**: Semi (Good experience with @ shortcuts and Composer)

## Overview

The Cursor adapter provides **semi-automation** for SpecWeave by teaching Cursor's AI how to **behave like** it has Claude Code's skills and agents, even without native support.

## Key Insight: Simulating Anthropic's Standards

**Anthropic Sets Standards** (MCP, Skills, Agents) that provide superior results. For Cursor, we provide **"implementation guides"** that teach the AI how to act like it has these capabilities.

Example:
```markdown
# In .cursorrules:
## What is a SpecWeave Skill?
A skill is a specialized capability that activates automatically when relevant.

**In Claude Code**: Skills are native (.claude/skills/)
**In Cursor**: You simulate by reading relevant workflow instructions

## increment-planner Skill
When user says "create increment":
2. Auto-increment number
3. Create spec.md (act as PM role)
4. Create plan.md (act as Architect role)
5. Create tasks.md
```

This is **meta-documentation** - teaching the AI how to behave!

## What This Adapter Provides

### 🔍 Progressive Disclosure

Cursor can discover SpecWeave skills by scanning SKILL.md frontmatter directly.

**How it works**:
1. Scan `.claude/skills/*/SKILL.md` files for frontmatter (name + description)
2. Match task to activation keywords in description (e.g., "feature planning" → increment-planner)
3. Load specific SKILL.md when relevant
4. Follow proven workflows

**Benefits**:
- ✅ **Token efficient** - Load only matching skills
- ✅ **Full skill access** - All 35+ skills accessible via frontmatter scan
- ✅ **Consistent output** - Follow SpecWeave best practices every time

**Example**:
```markdown
# When user asks: "Plan a new feature for auth"
# 1. Scan .claude/skills/*/SKILL.md frontmatter
# 2. Find "increment-planner" (description contains "Activates for: feature planning")
# 3. Load .claude/skills/increment-planner/SKILL.md
# 4. Follow the increment planning workflow
# Result: Proper spec.md, plan.md, tasks.md creation
```

**Note**: While Claude Code activates skills automatically, Cursor simulates this by scanning SKILL.md frontmatter for activation keywords.

### .cursorrules (Workflow Instructions)
- **What**: Complete workflow guide for SpecWeave
- **How**: Teaches Cursor to act like skills/agents
- **Example**: When to adopt PM vs Architect perspective
- **Benefit**: Semi-automated feature creation

### @ Context Shortcuts
| Shortcut | Loads | Use Case |
|----------|-------|----------|
| `@increments` | Current increment files | "What are we working on?" |
| `@docs` | Architecture documentation | "Show me system design" |
| `@strategy` | Business requirements | "What are the requirements?" |
| `@tests` | Test strategy and cases | "What tests exist?" |

**Usage**: Type `@increments show current tasks` in Cursor chat

### Composer Multi-File Editing
- Edit spec.md, plan.md, tasks.md simultaneously
- Maintain consistency across files
- Fast iteration on designs

## How It Works

### Simulating Skills

**Claude Code (automatic)**:
```typescript
// Skills auto-activate
User: "create increment for auth"
→ specweave-detector activates
→ skill-router routes to increment-planner
→ increment-planner creates increment
```

**Cursor (manual simulation)**:
```typescript
// You follow .cursorrules instructions
User: "create increment for auth"
→ You read .cursorrules
→ Follow workflow: check config → create folders → create files
→ Act like increment-planner by following those steps
```

### Simulating Skills

**Claude Code (automatic)**:
```typescript
Skill({ skill: "sw-frontend:frontend-architect", args: "design components" })
→ Frontend skill activates with specialized guidance
```

**Note**: In Claude Code, PM/Architect are SKILLS that auto-activate on keywords. For explicit invocation, use the Skill tool.

**Cursor (manual adoption)**:
```typescript
User: "act as PM and create spec"
→ You adopt PM perspective:
  - Focus on WHAT/WHY (not HOW)
  - Technology-agnostic requirements
  - User stories + acceptance criteria
→ Create spec.md following PM role
```

**Pro Tip**: .cursorrules defines each role's responsibilities clearly

## Installation

```bash
# Install SpecWeave with Cursor adapter
npx specweave init my-project --adapter cursor

# Files created:
# .cursorrules                  (workflow instructions)
# .cursor/context/*.md          (@ shortcut targets)
```

## Directory Structure

```
.cursorrules                   # Main workflow instructions
.cursor/
├── README.md                  # This file
└── context/                   # @ shortcut files
    ├── increments-context.md
    ├── docs-context.md
    ├── strategy-context.md
    └── tests-context.md
```

## Usage Examples

### Example 1: Create Feature

**User**: "Create increment for user authentication"

**Cursor** (following .cursorrules):
2. ✅ Find next increment number (0003)
3. ✅ Create folder: `.specweave/increments/0003-user-authentication/`
4. ✅ Act as PM: Create spec.md (WHAT/WHY, user stories, acceptance criteria)
5. ✅ Act as Architect: Create plan.md (HOW, technical design, components)
6. ✅ Create tasks.md (implementation checklist)

**Result**: Complete increment ready for implementation!

### Example 2: Use @ Shortcuts

**User**: "@increments what's the current task?"

**Cursor**:
1. ✅ Loads current increment's spec.md, plan.md, tasks.md
2. ✅ Reads tasks.md → Find first unchecked task
3. ✅ Response: "Currently on T003: Implement OAuth2 authentication flow"

### Example 3: Multi-File Edit with Composer

**User**: *Opens Composer (Cmd+I)*
"Update spec.md and plan.md to add Google OAuth login"

**Cursor**:
1. ✅ Edits spec.md → Add FR-003 (Google OAuth requirement)
2. ✅ Edits plan.md → Add OAuth implementation section
3. ✅ Maintains consistency between both files

### Example 4: Adopt Agent Role

**User**: "Act as DevOps agent and create Terraform for Hetzner"

**Cursor** (adopting DevOps role):
1. ✅ Focus on infrastructure (not application code)
2. ✅ Create Terraform files (provider.tf, main.tf, variables.tf)
3. ✅ Add monitoring, logging, security configs
4. ✅ Document deployment process

## Comparison: Cursor vs Claude Code

| Feature | Claude Code | Cursor |
|---------|-------------|--------|
| **Skills** | Native auto-activation | Simulated via .cursorrules |
| **Agents** | Separate context windows | Manual role adoption |
| **Hooks** | Auto-execute on events | Not available |
| **Commands** | Native slash commands | Workflow instructions |
| **Context** | MCP protocol | Manual loading via @ shortcuts |
| **File Access** | Native tools | Native (Composer) |
| **Automation** | Full | Semi |

**Cursor = Good experience** (70-80% of Claude Code's capabilities)

## Limitations

❌ **No auto-activation** - Must explicitly request workflows
❌ **No separate context windows** - All context shared
❌ **No hooks** - Can't auto-update docs on events (see workaround below)
⚠️ **Manual role adoption** - Must say "act as PM"

✅ **But Composer + @ shortcuts provide great UX!**

### Documentation Update Workaround

Since Cursor doesn't have hooks, you MUST manually update documentation after every task.

**See the comprehensive guide in AGENTS.md** (section: "Documentation Updates - CRITICAL FOR NON-CLAUDE TOOLS")

**Quick checklist after completing any task**:
1. Update `.specweave/increments/{id}/tasks.md` (mark tasks complete)
2. Update `.specweave/docs/internal/architecture/` (HLD/LLD/ADRs)
3. Update `.specweave/docs/internal/strategy/` (PRDs if requirements changed)
4. Update `README.md` (user-facing changes)
5. Update `CHANGELOG.md` (version history)

## Tips & Tricks

### 1. Be Explicit About Roles
"Act as PM agent and create spec" (not just "create spec")

### 3. Use @ Shortcuts
Faster than typing full file paths

### 4. Use Composer for Multi-File Edits
Cmd+I → Edit multiple files at once

### 5. Reference .cursorrules
If Cursor forgets workflow: "Follow the workflow in .cursorrules"

## Related Documentation

- [SPECWEAVE.md](../../SPECWEAVE.md) - Complete development guide
- [.cursorrules](.cursorrules) - Cursor workflow instructions (READ THIS!)
- [Adapter Architecture](../README.md) - Multi-tool design philosophy

---

**Status**: Active (v0.2.0-beta.1+)
**Market Share**: ~30% (Cursor users)
**Priority**: P1 (high impact adapter)
