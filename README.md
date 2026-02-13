# SpecWeave

**The spec-driven framework for AI coding agents.** First-class support for Claude Code — compatible with any LLM-powered coding tool.

*Coordinate parallel AI agents. Prevent task overlap. Quality gates. Ship features while you sleep.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)

```bash
npm install -g specweave   # Requires Node.js 20.12.0+
```

---

## Quick Demo

```bash
/sw:increment "User authentication"   # AI creates spec + plan + tasks
/sw:auto                               # Autonomous execution for hours
/sw:grill 0001                         # Senior-level code review
/sw:done 0001                          # Validate and complete
```

**What happens:** Claude creates a full specification, executes tasks autonomously, runs tests, fixes failures, and syncs progress to GitHub/JIRA. You review finished work.

---

## Why SpecWeave?

AI coding agents are powerful individually. Run three of them on the same codebase and you get conflicts, duplicated work, and zero traceability.

SpecWeave solves this with **file-based coordination**:

```
.specweave/increments/0001-oauth/
├── spec.md    ← WHAT: User stories, acceptance criteria
├── plan.md    ← HOW: Architecture decisions, tech choices
└── tasks.md   ← DO: Implementation tasks with tests
```

Each increment is a self-contained scope. Each agent knows exactly what's taken and what's available. No overlap. No conflicts. Six months later, search "OAuth" and find exactly what was decided, who approved it, and why.

### What Makes It Different

- **Plan as source of truth** — spec.md + plan.md + tasks.md drive all implementation. Code is a derivative of the plan, never the other way around. Change your mind mid-build? Update the plan first, then regenerate code.
- **Parallel agent coordination** — multiple Claude Code sessions, OpenClaw instances, or remote agents work on different increments without stepping on each other.
- **Autonomous execution** — runs for hours, not minutes. Write, test, fix, repeat.
- **Persistent memory** — AI learns from corrections. Fix once, remembered permanently.
- **Quality gates** — Code Grill reviews code like a demanding senior engineer before every release.
- **Living documentation** — specs, ADRs, and runbooks sync automatically after every task.
- **100+ specialized skills** — PM, Architect, QA, Security, DevOps, Frontend, Mobile, ML, and more collaborate on deliverables.
- **External sync** — GitHub Issues, JIRA, Azure DevOps — bidirectional, real-time.
- **Self-improving** — captures what works and what doesn't. Gets smarter over time.
- **LSP integration** — semantic code intelligence for TypeScript, Python, Go, Rust, Java, C#.

---

## Programmable Skills (Open/Closed Principle)

**Skills are programs you can customize without forking.**

Unlike traditional tools where behavior is locked, SpecWeave skills follow the **Open/Closed Principle** from SOLID:
- **Closed for modification** — don't edit SKILL.md
- **Open for extension** — customize via `.specweave/skill-memories/*.md`

**Example: Teaching the Frontend Skill**

```bash
# First time
You: "Generate a login form"
Claude: *creates form with useState*
You: "No, we always use React Hook Form + Zod validation"

# SpecWeave learns this → .specweave/skill-memories/frontend.md

# Next session
You: "Generate a signup form"
Claude: *automatically uses React Hook Form + Zod* ✓
```

**Your customizations:**
```markdown
# .specweave/skill-memories/frontend.md

### Form Handling
- Use React Hook Form for all forms
- Combine with Zod for validation schemas
- Never use plain useState for form state

### Component Preferences
- Import from @/components/ui design system
- Tailwind utilities only, no inline styles
```

**Why this matters:**

| Traditional Tools | SpecWeave Skills |
|------------------|------------------|
| Obfuscated behavior | Transparent SKILL.md |
| Can't customize | Extend via skill-memories |
| Vendor lock-in | You control the logic |
| Suggestions only | Programmable reasoning |

**Enable auto-learning:**
```bash
/sw:reflect-on       # Corrections become permanent knowledge
/sw:reflect-status   # See what Claude has learned
```

Every skill (PM, Architect, QA, Security, DevOps, Frontend, Backend) can be customized. You're not using tools — you're **programming them** to match your exact patterns.

**For skill developers:** Design skills with extension points. See [Skill Development Guidelines](#skill-development-guidelines) for SOLID patterns.

---

## Install

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/sw:increment "Add dark mode"   # Describe your feature
/sw:auto                        # Ship while you sleep
```

> **Node.js 20.12.0+** required (22 LTS recommended). Getting `SyntaxError`? [Upgrade instructions](https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error).

---

## Parallel Development

Run multiple AI agents on the same repository — locally, in the cloud, or with [OpenClaw](https://openclaw.ai). SpecWeave's increment files are the coordination layer:

```
Agent 1 (local Claude Code)    Agent 2 (cloud)           Agent 3 (OpenClaw)
working on: 0001-auth          working on: 0002-payments  working on: 0003-notifications
         │                              │                           │
         └──────────────────────────────┼───────────────────────────┘
                                        │
                           .specweave/increments/
                           ├── 0001-auth/tasks.md           ← Agent 1's scope
                           ├── 0002-payments/tasks.md       ← Agent 2's scope
                           └── 0003-notifications/tasks.md  ← Agent 3's scope
```

**How it works:**
1. Create increments for each feature: `/sw:increment "auth"`, `/sw:increment "payments"`
2. Each agent picks an increment and runs `/sw:auto` — tasks.md tracks exactly what's done
3. Agents work in isolated scopes — different files, different specs, different tests
4. Quality gates (`/sw:grill`) ensure consistent standards regardless of which agent built it
5. Progress syncs to GitHub/JIRA so you see everything in one place

**Why this matters:** OpenClaw and Claude Code sessions are stateless by default. SpecWeave's spec/plan/tasks files persist across sessions and agents — your coordination layer survives restarts, crashes, and context window limits.

**Agent team commands:**

| Command | Purpose |
|---------|---------|
| `/sw:team-lead "feature"` | Split feature across parallel agents |
| `/sw:team-status` | Monitor all agent progress |
| `/sw:team-merge` | Merge completed work in dependency order |

**[Full agent teams guide](https://spec-weave.com/docs/guides/agent-teams-and-swarms)**

---

## Core Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "feature"` | Create spec + plan + tasks |
| `/sw:auto` | Autonomous execution |
| `/sw:do` | Execute one task at a time |
| `/sw:grill` | Code review before close |
| `/sw:done` | Close with quality validation |
| `/sw:sync-progress` | Push to GitHub / JIRA / ADO |
| `/sw:next` | Auto-close + suggest next |

**[Full command reference](https://spec-weave.com/docs/commands/overview)**

---

## Integrations

| Platform | What Syncs |
|----------|-----------|
| **GitHub** | Issues, PRs, milestones — bidirectional |
| **JIRA** | Epics, stories, status |
| **Azure DevOps** | Work items, area paths |

When you close an increment, external tools update automatically.

---

## How It Compares

| Capability | SpecWeave | BMAD Method | GitHub SpecKit |
|------------|-----------|-------------|----------------|
| **Parallel agent coordination** | Increment-scoped isolation | No | No |
| **Autonomous execution** | Hours of unattended `/sw:auto` | No | No |
| **Quality gates** | Code Grill before every release | No | No |
| **Living documentation** | Auto-updated after every task | Manual | Manual |
| **Self-improving AI** | Learns from corrections | No | No |
| **External sync** | GitHub / JIRA / ADO bidirectional | No | No |
| **Specialized skills** | 100+ (PM, QA, DevOps, ML...) | 21 agents | None |
| **Works with OpenClaw** | Yes | Partial | Partial |
| **Spec/plan/tasks workflow** | Yes | Yes | Yes |
| **Agent-agnostic** | Claude Code + OpenClaw + Copilot + Codex | Multi-IDE | Multi-IDE |

---

## Built With SpecWeave

> This framework builds itself. Every feature, bug fix, and release is spec-driven.

**[Browse increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)** — see how SpecWeave develops SpecWeave.

---

## Documentation

**[spec-weave.com](https://spec-weave.com)** — guides, examples, and full reference.

## Community

[Discord](https://discord.gg/UYg4BGJ65V) · [YouTube](https://www.youtube.com/@antonabyzov) · [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

## Skill Development Guidelines

**Design skills that users can extend without modification.**

When creating SpecWeave skills, follow the **Open/Closed Principle** (SOLID):

### Structure for Extension

**SKILL.md** (closed for modification)
```markdown
# Your Skill

## Core Behavior
1. Always do X
2. Check for Y
3. Output Z format

## Extension Points
Users can customize:
- Component preferences
- Validation rules
- Output formatting
- Error handling

See `.specweave/skill-memories/{skill-name}.md` for customizations.
```

**skill-memories/{skill-name}.md** (open for extension)
```markdown
### Component Preferences
- Use Material UI instead of Chakra
- Dark mode by default

### Custom Validation
When validating forms:
1. Check email domain against allowlist
2. Require 2FA for admin roles
```

### SOLID Principles for Skills

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | One skill = one domain (Frontend, Backend, Testing, etc.) |
| **Open/Closed** | Core logic in SKILL.md (closed), customizations in skill-memories (open) |
| **Liskov Substitution** | Customizations shouldn't break skill contracts (output format, interface) |
| **Interface Segregation** | Expose clear extension points, don't force users to override large blocks |
| **Dependency Inversion** | Depend on patterns/abstractions, let skill-memories provide concrete implementations |

### Design Patterns

**✓ DO:**
- Expose clear extension points in SKILL.md
- Document what users can customize
- Provide examples in skill-memories templates
- Read skill-memories at runtime before executing logic
- Use conditional logic: "If skill-memories defines X, use X; else default behavior"

**✗ DON'T:**
- Hard-code preferences that vary by project
- Make users fork SKILL.md to customize behavior
- Ignore skill-memories content
- Create monolithic skills that do everything

### Example: Extensible Frontend Skill

```markdown
# SKILL.md (core logic)

## Component Generation

**Default behavior:**
1. Use React functional components
2. TypeScript with Props interface
3. Export as default

**Extension points (check skill-memories/frontend.md):**
- component.framework (React | Vue | Angular)
- component.exportStyle (default | named)
- component.testFramework (Vitest | Jest | Testing Library)
- styling.approach (Tailwind | CSS Modules | Styled Components)

**Logic:**
```typescript
// Read skill-memories first
const userPrefs = readSkillMemories('frontend');

// Apply customizations or use defaults
const framework = userPrefs?.component?.framework || 'React';
const styling = userPrefs?.styling?.approach || 'CSS Modules';
```
```

### Testing Your Skill's Extensibility

1. **Write SKILL.md** with default behavior
2. **Create skill-memories template** showing extension points
3. **Test with customizations** - does the skill respect user preferences?
4. **Document limitations** - what CAN'T be customized?

**Good skill design = Users extend your logic without ever touching your source.**

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
