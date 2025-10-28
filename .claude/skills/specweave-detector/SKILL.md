---
name: specweave-detector
description: Documentation skill that explains SpecWeave slash commands. SpecWeave uses EXPLICIT slash commands only - no auto-activation! Use /pi (Plan Product Increment) or /create-increment to start. Other commands /si (start), /at (add tasks), /vi (validate), /done (close), /ls (list). All commands listed in .claude/commands/. Keywords slash commands, /pi, /create-increment, /si, /vi, /done, /ls, /init, specweave commands.
---

# SpecWeave - Slash Command Reference

**CRITICAL**: SpecWeave uses **EXPLICIT SLASH COMMANDS ONLY** - no auto-activation, no proactive detection, no intent-based routing.

## How SpecWeave Works

SpecWeave follows the **spec-kit approach**: You MUST use slash commands explicitly.

**To use SpecWeave**: Type a slash command (e.g., `/pi "Feature description"`)

## Available Slash Commands

### Quick Reference Table

| Alias | Full Command | Purpose | Example |
|-------|--------------|---------|---------|
| `/init` | `/create-project` | Initialize SpecWeave project | `/init my-saas` |
| `/pi` | `/create-increment` | **Plan Product Increment** | `/pi "User auth"` |
| `/ci` | `/create-increment` | Alternative to `/pi` | `/ci "Payment"` |
| `/si` | `/start-increment` | Start working on increment | `/si 0001` |
| `/at` | `/add-tasks` | Add tasks to increment | `/at 0001 "Add tests"` |
| `/vi` | `/validate-increment` | Validate increment quality | `/vi 0001 --quality` |
| `/done` | `/close-increment` | Close increment | `/done 0001` |
| `/ls` | `/list-increments` | List all increments | `/ls` |

### Command Details

#### `/pi` or `/create-increment` - Plan Product Increment

**Most important command!** Creates a new increment with specifications.

```bash
# Short form (recommended)
/pi "User authentication with JWT and RBAC"

# Full form
/create-increment "User authentication with JWT and RBAC"
```

**What happens**:
1. Creates `.specweave/increments/000X-feature-name/` folder
2. PM agent generates `spec.md` (requirements, user stories)
3. Architect agent generates `plan.md` (architecture, design)
4. QA Lead generates `tests.md` (test strategy)
5. Creates `tasks.md` (implementation checklist)

#### `/si` or `/start-increment` - Start Working

Marks an increment as "in-progress".

```bash
/si 0001
```

#### `/at` or `/add-tasks` - Add Tasks

Add additional tasks to an increment.

```bash
/at 0001 "Add password reset functionality"
/at 0001 "Add email verification"
```

#### `/vi` or `/validate-increment` - Validate Quality

Run validation checks on an increment.

```bash
# Rule-based validation only
/vi 0001

# With AI quality assessment
/vi 0001 --quality
```

#### `/done` or `/close-increment` - Close Increment

Mark increment as completed.

```bash
/done 0001
```

#### `/ls` or `/list-increments` - List All

Show all increments with status.

```bash
/ls
```

### Why Slash Commands?

**Problem**: Auto-activation doesn't work reliably in Claude Code.

**Solution**: Explicit slash commands (like spec-kit) ensure SpecWeave ALWAYS activates when you want it.

**Benefits**:
- ✅ **100% reliable** - Always works, no guessing
- ✅ **Clear intent** - You know exactly when SpecWeave is active
- ✅ **Fast** - Short aliases like `/pi` save keystrokes
- ✅ **Memorable** - Domain-specific names (PI = Product Increment from Agile/SAFe)

## Typical Workflow

### 1. Initialize Project

```bash
npx specweave init my-saas
cd my-saas
```

**Creates**:
- `.specweave/` - Framework configuration
- `.claude/agents/` - 10 pre-installed agents
- `.claude/skills/` - 35+ pre-installed skills
- `.claude/commands/` - 10 slash commands
- `CLAUDE.md` - Development guide

### 2. Plan Your First Increment

```bash
# Use short alias (recommended)
/pi "User authentication with JWT and RBAC"
```

**Creates**:
```
.specweave/increments/0001-user-authentication/
├── spec.md           # Requirements (PM agent)
├── plan.md           # Architecture (Architect agent)
├── tasks.md          # Implementation steps
├── tests.md          # Test strategy (QA Lead agent)
└── context-manifest.yaml  # Context loading config
```

### 3. Validate & Start

```bash
# Validate quality
/vi 0001 --quality

# Start working
/si 0001
```

### 4. Add More Tasks (As Needed)

```bash
# As you discover new work
/at 0001 "Add password reset flow"
/at 0001 "Add 2FA support"
```

### 5. Close When Done

```bash
/done 0001
```

## Example Sessions

### Example 1: Real Estate Platform

```bash
# Initialize
$ npx specweave init real-estate-app
$ cd real-estate-app

# Plan increment with slash command
$ /pi "Real estate listing platform with search, images, admin dashboard. Node.js/Express, PostgreSQL, JWT auth"

🔷 SpecWeave Active (/create-increment)

📝 Using increment-planner skill...
🤖 PM agent creating requirements...
🏗️  Architect agent designing system...
🛡️  Security agent reviewing authentication...

✅ Increment created: .specweave/increments/0001-real-estate-platform/
   - spec.md (Requirements & user stories)
   - plan.md (Architecture & design)
   - tasks.md (Implementation checklist)
   - tests.md (Test strategy)

# Validate
$ /vi 0001 --quality
✅ Quality score: 87/100 (GOOD)

# Start working
$ /si 0001
✅ Increment 0001 status → in-progress

# Implement (regular Claude conversation, no slash commands needed here)
User: "Let's implement the backend API for listings"
Claude: [implements based on plan.md and tasks.md]

# Close when done
$ /done 0001
✅ Increment 0001 closed successfully
```

### Example 2: Next.js Authentication

```bash
# Short alias for speed
$ /pi "Next.js authentication with JWT, OAuth, RBAC"

🔷 SpecWeave Active (/create-increment)

📝 Using increment-planner + nextjs skill...
🤖 PM agent creating requirements...
🏗️  Architect agent designing Next.js App Router flow...
🔒 Security agent reviewing auth patterns...

✅ Increment 0002-nextjs-authentication created

# Add forgotten tasks later
$ /at 0002 "Add password reset flow"
$ /at 0002 "Add 2FA with TOTP"
✅ Added 2 tasks to increment 0002

# List all increments
$ /ls

Increments:
  0001 real-estate-platform    [completed]  ✅
  0002 nextjs-authentication   [in-progress] 🚧
```

### Example 3: Multi-Increment Project

```bash
# Create multiple increments
$ /pi "User authentication"
✅ Increment 0001 created

$ /pi "Real estate listings with search"
✅ Increment 0002 created

$ /pi "Admin dashboard"
✅ Increment 0003 created

# Work on them in order
$ /si 0001
$ [implement authentication]
$ /done 0001

$ /si 0002
$ [implement listings]
$ /done 0002

$ /si 0003
$ [implement admin]
$ /done 0003

# Review what's been done
$ /ls

Increments:
  0001 user-authentication         [completed]  ✅
  0002 real-estate-listings        [completed]  ✅
  0003 admin-dashboard             [completed]  ✅
```

## Pre-Installed Components

After `specweave init`, ALL components are in `.claude/`:

**10 Agents** (all ready to use):
- `pm` - Product Manager (requirements, user stories)
- `architect` - System Architect (design, ADRs)
- `security` - Security Engineer (threat modeling)
- `qa-lead` - QA Lead (test strategy)
- `devops` - DevOps Engineer (deployment)
- `tech-lead` - Technical Lead (code review)
- `sre` - SRE (incident response)
- `docs-writer` - Documentation writer
- `performance` - Performance optimization
- `diagrams-architect` - Diagram generation (C4 Model)

**35+ Skills** (all ready to use):
- Framework skills: `nextjs`, `nodejs-backend`, `python-backend`, `dotnet-backend`, `frontend`
- Integration skills: `jira-sync`, `ado-sync`, `github-sync`
- Utility skills: `diagrams-generator`, `figma-implementer`, `hetzner-provisioner`
- Quality skills: `increment-quality-judge`, `context-optimizer`
- ... and 25+ more!

## FAQ

### Q: Why don't I see ⏺ Skill(...) in the console?

**A**: SpecWeave skills don't activate proactively. You MUST use slash commands.

**Correct**: `/pi "Feature description"` → ⏺ Skill(increment-planner)

**Incorrect**: "Build a feature" → No skill activation

### Q: When do I use slash commands vs regular conversation?

**Slash commands for SpecWeave operations**:
- Creating increments: `/pi`
- Managing increments: `/si`, `/done`, `/ls`
- Adding tasks: `/at`
- Validation: `/vi`

**Regular conversation for implementation**:
- Asking Claude to implement code
- Discussing architecture
- Debugging issues
- Reviewing code

**Example**:
```bash
# Use slash command to plan
$ /pi "Payment processing with Stripe"
✅ Increment 0003 created

# Then regular conversation to implement
User: "Let's implement the Stripe integration from plan.md"
Claude: [implements based on specifications]
```

### Q: What if I forget to use a slash command?

**A**: Claude will implement directly without SpecWeave structure. Your project won't have:
- ❌ No increment folder
- ❌ No spec.md (requirements)
- ❌ No plan.md (architecture)
- ❌ No tests.md (test strategy)
- ❌ No traceability

**Solution**: Use `/pi` first, THEN implement.

### Q: Can I still use SpecWeave if I already started implementing?

**A**: Yes! Use brownfield workflow:

```bash
# Create increment retroactively
$ /pi "Document existing authentication implementation"

# Claude will analyze existing code and create specs
✅ Increment 0001 created with retroactive documentation
```

## Testing

### TC-001: Slash Command Creates Increment
- Given: User types `/pi "User authentication"`
- When: Slash command executes
- Then: increment-planner skill activates
- And: Creates `.specweave/increments/0001-user-authentication/`
- And: spec.md, plan.md, tasks.md, tests.md generated

### TC-002: No Slash Command = No Activation
- Given: User types "Build user authentication"
- When: Claude processes request
- Then: No SpecWeave skills activate
- And: Claude implements directly (no specs generated)

### TC-003: List Increments
- Given: Multiple increments exist
- When: User types `/ls`
- Then: Shows all increments with status
- And: Shows completion status (completed, in-progress, planned)

---

## Summary

**SpecWeave uses EXPLICIT SLASH COMMANDS** - no auto-activation!

**Essential commands**:
- `/pi` - Plan Product Increment (most important!)
- `/si` - Start increment
- `/done` - Close increment
- `/ls` - List increments

**Workflow**:
1. Init: `npx specweave init`
2. Plan: `/pi "Feature"`
3. Validate: `/vi 0001 --quality`
4. Start: `/si 0001`
5. Implement: Regular conversation
6. Close: `/done 0001`

**Remember**: Type `/pi` first, THEN implement! Otherwise you lose all SpecWeave benefits (specs, architecture, test strategy).
