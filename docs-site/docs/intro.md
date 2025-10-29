---
sidebar_position: 1
---

# Welcome to SpecWeave

**Spec-Driven Development Framework with AI-Powered Autonomous Agents**

SpecWeave is a specification-first AI development framework where specifications and documentation are the SOURCE OF TRUTH. Code is the expression of these specifications.

## Why SpecWeave?

- **🤖 Just Works** - Autonomous agents ask clarifying questions, review output, validate quality—minimal interaction required
- **⚡ Smart Workflow** - Auto-resume, auto-close, progress tracking—natural flow without overhead
- **🎯 10 Agents + 35+ Skills** - PM, Architect, DevOps, QA, Security work in parallel (minimizes context usage). Easily extensible!
- **📝 Specification-First** - Define WHAT and WHY before HOW—specifications are the source of truth
- **🧪 Complete Testing** - 4-level strategy covering specs to integration tests (APIs, UIs, CLIs, libraries)
- **🌐 Universal** - Works with ANY tech stack AND ANY AI tool (Claude, Cursor, Copilot, Gemini, ChatGPT)
- **📚 Living Docs** - Specs auto-update after every operation and test—always in sync with code

## 🚀 Quickstart

### 1. Install SpecWeave

```bash
npm install -g specweave
```

### 2. Initialize Your Project

```bash
mkdir my-project && cd my-project
specweave init
```

This creates the `.specweave/` structure with:
- 5-pillar documentation framework
- Increment-based feature planning
- Context manifests for precision loading
- Test strategy templates

### 3. Start Building

**IMPORTANT**: SpecWeave uses **EXPLICIT SLASH COMMANDS** - type them to activate the framework!

#### **Slash Commands (100% Reliable)**

```bash
# Create your first feature (use slash command!)
/pi "user authentication with email and OAuth"
# PI = Plan Product Increment (Agile terminology)

# SpecWeave creates:
✅ .specweave/increments/0001-user-authentication/
   ├── spec.md (requirements from PM agent)
   ├── plan.md (architecture from Architect agent)
   ├── tasks.md (implementation steps)
   ├── tests.md (test strategy from QA Lead agent)
   └── context-manifest.yaml (selective loading)

# Start working on the increment
/si 0001

# Implement with regular conversation (no slash command needed)
"Implement the authentication backend based on plan.md"

# Validate quality
/vi 0001 --quality

# Close when done
/done 0001
```

**Available Slash Commands** (with short aliases):
- `/pi` or `/create-increment` - **Plan Product Increment** (most important!)
- `/si` or `/start-increment` - Start working on increment
- `/at` or `/add-tasks` - Add tasks to increment
- `/vi` or `/validate-increment` - Run validation + quality check
- `/done` or `/close-increment` - Close increment
- `/ls` or `/list-increments` - List all increments
- `/sync-github` - Sync increment to GitHub issues

**Why slash commands?**
- ✅ **100% reliable** - Always works, no guessing
- ✅ **Clear intent** - You know exactly when SpecWeave is active
- ✅ **Fast** - Short aliases like `/pi` save keystrokes

**Remember**: Type `/pi` first, THEN implement! Otherwise you lose all SpecWeave benefits (specs, architecture, test strategy).

## What You Get

### Directory Structure
```
your-project/
├── .specweave/                     # Framework internals
│   ├── docs/                       # 5-pillar documentation
│   │   ├── internal/
│   │   │   ├── strategy/           # Business specs (WHAT, WHY)
│   │   │   ├── architecture/       # Technical design (HOW)
│   │   │   ├── delivery/           # Roadmap, CI/CD, guides
│   │   │   ├── operations/         # Runbooks, SLOs
│   │   │   └── governance/         # Security, compliance
│   │   └── public/                 # Published docs
│   ├── increments/                 # Features (auto-numbered)
│   │   └── 0001-feature-name/
│   │       ├── spec.md             # WHAT & WHY
│   │       ├── plan.md             # HOW
│   │       ├── tasks.md            # Implementation checklist
│   │       ├── tests.md            # Test strategy
│   │       └── context-manifest.yaml  # What to load
│   └── tests/                      # Centralized test repository
│
├── .claude/                        # Installed components
│   ├── agents/                     # Installed agents (selective)
│   ├── skills/                     # Installed skills (selective)
│   └── commands/                   # Slash commands
│
├── CLAUDE.md                       # Quick reference (ONLY file we add)
└── src/                            # Your source code (unchanged)
```

## Next Steps

- **[Core Concepts](./tutorial-basics/core-concepts)** - Understand the 5-pillar framework
- **[Agents & Skills](./tutorial-basics/agents-skills)** - Learn about specialized agents
- **[Increment Lifecycle](./tutorial-basics/increment-lifecycle)** - Feature planning workflow
- **[Context Precision](./tutorial-basics/context-precision)** - 70-80% token reduction
- **[Validation](./tutorial-basics/validation)** - 120 automated quality rules

## Resources

- **Website**: [https://spec-weave.com](https://spec-weave.com)
- **GitHub**: [https://github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- **npm**: [https://www.npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)

## Comparison to Other Frameworks

### vs **spec-kit** (GitHub)

| Feature | SpecWeave | spec-kit |
|---------|-----------|----------|
| **Slash Commands** | ✅ `/pi`, `/si`, `/done` | ✅ Similar approach |
| **Multi-Agent** | ✅ 10 agents | ❌ Commands only |
| **Pre-Installed** | ✅ All ready | ❌ Manual setup |
| **Quality Gates** | ✅ 120 rules | ❌ Manual |
| **Auto-numbering** | ✅ 0001-9999 | ❌ Manual |

### vs **BMAD-METHOD**

| Feature | SpecWeave | BMAD |
|---------|-----------|------|
| **Documentation** | ✅ 5 pillars | ❌ Single README |
| **Incremental Planning** | ✅ Auto-numbered | ❌ Manual |
| **Context Precision** | ✅ Selective loading | ❌ Load all |
| **Test Strategy** | ✅ 4 levels | ❌ Ad-hoc |
| **Framework Agnostic** | ✅ Any stack | ✅ Any stack |

---

**Get Started Now**:
```bash
npm install -g specweave && specweave init my-project
cd my-project
# Then use slash commands: /pi "your first feature"
```
