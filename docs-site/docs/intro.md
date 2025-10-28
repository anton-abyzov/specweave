---
sidebar_position: 1
---

# Welcome to SpecWeave

**Spec-Driven Development Framework with AI-Powered Autonomous Agents**

SpecWeave is a specification-first AI development framework where specifications and documentation are the SOURCE OF TRUTH. Code is the expression of these specifications.

## Why SpecWeave?

- **70-80% Token Reduction** - Context precision with selective loading
- **9 Specialized Agents** - PM, Architect, DevOps, QA, Security, SRE, Tech Lead, Docs, Performance
- **30+ Skills** - Technology stacks, integrations, utilities
- **120 Validation Rules** - Automated quality gates
- **Framework-Agnostic** - Works with ANY language/framework
- **Living Documentation** - Specs evolve with code, never diverge

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

#### **For Claude Code Users** (Slash Commands)

```bash
# Create your first feature
/create-increment "user authentication with email and OAuth"

# Review the generated specs
/review-docs

# Start implementation
/start-increment 0001

# Validate increment quality
/validate-increment 0001
```

**Available Slash Commands**:
- `/create-increment` - Create new feature with specs
- `/start-increment` - Begin working on a feature
- `/review-docs` - Review strategic docs vs code
- `/validate-increment` - Run 120 validation rules
- `/sync-github` - Sync increment to GitHub issues

#### **For Other AI Tools** (Natural Language)

Tell your AI assistant what you want to build:

```
"Create authentication feature with email and OAuth"
    ↓
✅ Increment: .specweave/increments/0001-user-authentication/
   ├── spec.md (WHAT & WHY)
   ├── plan.md (HOW)
   ├── tasks.md (Implementation checklist)
   └── context-manifest.yaml (70%+ token reduction)
```

The AI will automatically:
1. Route to appropriate agents (PM → Architect → Implementation)
2. Generate specifications following SpecWeave conventions
3. Create validated, tested implementation
4. Maintain living documentation

## What You Get

### Directory Structure
```
your-project/
├── .specweave/                     # Framework internals
│   ├── config.yaml                 # Project configuration
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
| **Context Management** | ✅ 70-80% reduction | ❌ Loads all |
| **Multi-Agent** | ✅ 9 agents | ❌ Commands only |
| **Quality Gates** | ✅ 120 rules | ❌ Manual |
| **Auto-numbering** | ✅ 0001-9999 | ❌ Manual |
| **Multi-tool Support** | ✅ Claude/Cursor/Copilot | ❌ Claude only |

### vs **BMAD-METHOD**

| Feature | SpecWeave | BMAD |
|---------|-----------|------|
| **Documentation** | ✅ 5 pillars | ❌ Single README |
| **Incremental Planning** | ✅ Auto-numbered | ❌ Manual |
| **Context Precision** | ✅ Selective loading | ❌ Load all |
| **Test Strategy** | ✅ 4 levels | ❌ Ad-hoc |
| **Framework Agnostic** | ✅ Any stack | ✅ Any stack |

---

**Get Started Now**: `npm install -g specweave && specweave init`
