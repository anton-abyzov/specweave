# Multi-Tool Support: SpecWeave vs Spec-Kit vs BMAD-METHOD

**Analysis Date:** 2025-10-28
**Purpose:** Compare how three specification-driven development frameworks handle multi-tool AI support

---

## Executive Summary

### Quick Answers to Your Questions

**Q: Is SpecWeave universal?**
> **A:** Yes and no. SpecWeave has a universal **project structure** (same increments, docs, specs for all tools), but uses **tool-specific installation** with adapters. It's "structurally universal, technically adapted."

**Q: Is CLAUDE.md for Claude and AGENTS.md for others the only difference?**
> **A:** No. There are THREE key differences:
> 1. **CLAUDE.md** lists native components (.claude/skills, .claude/agents) with auto-activation
> 2. **AGENTS.md** provides manual workflow instructions following agents.md standard
> 3. **Tool-specific files** (.cursorrules, .github/copilot/instructions.md, etc.) teach each tool how to simulate Claude's capabilities

**Q: Why do spec-kit and BMAD offer per-tool installation?**
> **A:** They DON'T! This is the key insight:
> - **Spec-Kit**: Single installation, tool selection as runtime parameter
> - **BMAD-METHOD**: Portable agent bundles that work everywhere
> - **SpecWeave**: Only framework with actual per-tool installation (adapters)

---

## Comparison Matrix

| Aspect | SpecWeave | Spec-Kit | BMAD-METHOD |
|--------|-----------|----------|-------------|
| **Philosophy** | Tiered approximation (native + adapters) | Universal templates | Portable agent framework |
| **Installation** | `specweave init` → auto-detects tool → installs adapter | `specify init --ai <tool>` → same templates | `npx bmad-method install` → universal bundles |
| **Per-Tool Customization?** | YES (adapters create tool-specific files) | NO (tool param only affects registration) | NO (text bundles work everywhere) |
| **Primary Instruction File** | CLAUDE.md (Claude) / AGENTS.md (others) | constitution.md (universal) | Team bundles (universal) |
| **Tool-Specific Files** | .cursorrules, .github/copilot/*, etc. | None (same .specify/ for all) | None (same bundles for all) |
| **Automation Tiers** | Full (Claude) → Semi (Cursor) → Basic (Copilot) → Manual (Generic) | Same workflow for all tools | Same agent framework for all |
| **Native vs Simulated** | Native for Claude, simulated for others | All tools equal (no native) | All tools equal (no native) |
| **Market Coverage** | 100% (adapters for 6+ tools) | 100% (supports 15+ tools) | 100% (works anywhere) |
| **Configuration Complexity** | High (different adapters, different files) | Low (single template set) | Medium (agent bundles + domain packs) |
| **Onboarding** | Tool-dependent (different instructions) | Consistent (same commands) | Consistent (upload bundle + follow) |

---

## Deep Dive: Three Philosophies

### 1. SpecWeave: Tiered Approximation Model

#### Architecture
```
Claude Code (Native)
    ↓ (baseline experience)
    ├── Skills: Auto-activate based on keywords
    ├── Agents: Separate context windows
    ├── Hooks: Auto-update docs after tasks
    ├── Commands: /inc, /do, /progress, /done
    └── CLAUDE.md: References native components

Other Tools (Adapters)
    ↓ (approximation of native)
    ├── AGENTS.md: Manual workflow instructions
    ├── Tool-specific files: Teach tool how to behave
    │   ├── Cursor: .cursorrules + @context shortcuts
    │   ├── Copilot: .github/copilot/instructions.md
    │   ├── Gemini: Custom instructions
    │   └── Generic: SPECWEAVE.md step-by-step
    └── Adapters: Bridge between native and tool capabilities
```

#### Strategy
- **Start from native excellence** (Claude Code's skills/agents/hooks)
- **Approximate down** to each tool's capabilities
- **Adapter pattern**: Each tool gets custom integration layer

#### Why This Approach?
1. **Maximizes Claude Code capabilities**: Takes full advantage of native features
2. **Graceful degradation**: Other tools get best possible approximation
3. **Centralized source**: Agents/skills defined once in .claude/, then adapted
4. **Tool evolution**: When tools add features, adapters can upgrade

#### Tradeoffs
✅ **Pros:**
- Best experience on Claude Code (full automation)
- Adapters can leverage each tool's unique features (Cursor's @shortcuts, Copilot's workspace context)
- New tools can be added via new adapters

❌ **Cons:**
- Complex: Different files for different tools
- Inconsistent UX: Claude users get automation, others get manual workflows
- Maintenance: Each adapter needs updates when SpecWeave evolves
- Onboarding: Tool-dependent instructions

---

### 2. Spec-Kit: Runtime Parameterization

#### Architecture
```
Single Installation (uv tool install)
    ↓
specify init my-project --ai claude    # Same templates
specify init my-project --ai copilot   # Same templates
specify init my-project --ai cursor    # Same templates
    ↓
.specify/
    ├── constitution.md          # Universal principles
    ├── memory/                  # Shared context
    ├── commands/
    │   ├── /speckit.specify    # Same for all tools
    │   ├── /speckit.plan       # Same for all tools
    │   ├── /speckit.tasks      # Same for all tools
    │   └── /speckit.implement  # Same for all tools
    └── scripts/                # bash/PowerShell variants
```

#### Strategy
- **Technology independence**: Methodology transcends specific tools
- **Command unification**: All tools use same slash commands
- **Agent selection as runtime parameter**: Tool choice doesn't change workflow
- **Zero customization**: Same constitution.md, memory/, commands for everyone

#### Why This Approach?
1. **Consistency**: Users get identical experience on any tool
2. **Simplicity**: One template set, one set of instructions
3. **Philosophy over tooling**: Spec-driven development is the value, not tool integration
4. **Lower maintenance**: No per-tool code to maintain

#### Tradeoffs
✅ **Pros:**
- Consistent UX across all tools
- Simple maintenance (one codebase)
- Easy onboarding (same workflow everywhere)
- New tools supported automatically (no adapter needed)
- Lower cognitive load for teams switching tools

❌ **Cons:**
- Can't leverage tool-specific features (no Cursor @shortcuts, no Claude native agents)
- Lowest common denominator approach
- May underutilize advanced tool capabilities
- Same workflow regardless of tool strengths/weaknesses

---

### 3. BMAD-METHOD: Portable Agent Bundles

#### Architecture
```
Universal Framework
    ↓
npx bmad-method install    # Creates universal structure
    ↓
├── PRD + Architecture (Planning Phase)
│   └── Analyst, PM, Architect agents
├── Story Files (Development Phase)
│   └── Scrum Master, Developer, QA agents
├── Team Bundles (.txt files)
│   ├── team-fullstack.txt
│   ├── team-devops.txt
│   └── team-creative.txt
└── Expansion Packs
    ├── game-dev
    ├── creative-writing
    └── wellness

Deployment:
    ├── Web UI: Upload bundle to Gemini Gems/CustomGPT
    ├── IDE: Execute locally with any AI
    └── CLI: Run via BMAD CLI wrapper
```

#### Strategy
- **Agent framework over tool integration**: Focus on agent roles, collaboration patterns
- **Natural language encoding**: Bundles are text files with agent instructions
- **Platform-agnostic by design**: If tool can read text, it can run BMAD
- **Human-in-the-loop**: Emphasizes refinement over automation

#### Why This Approach?
1. **Maximum portability**: Text bundles work anywhere
2. **Domain expansion**: Framework extends beyond code (writing, business, wellness)
3. **Agent methodology**: Solves context loss and planning inconsistency
4. **Future-proof**: New tools emerge, bundles still work

#### Tradeoffs
✅ **Pros:**
- True universality (works on web, IDE, CLI, anywhere)
- Domain-agnostic (not just software development)
- No installation dependencies (upload and go)
- Future-proof (text always readable)
- Expansion packs for specialization

❌ **Cons:**
- No automation (always manual workflow)
- Can't leverage native tool features
- Relies on user following agent instructions correctly
- No validation/enforcement (bundles are suggestions, not code)
- Steeper learning curve (understand agent roles + framework)

---

## Key Architectural Differences

### CLAUDE.md vs AGENTS.md (SpecWeave)

**CLAUDE.md** (Native Claude Code):
```markdown
## Available Skills

| Skill | Purpose | Activates When |
|-------|---------|----------------|
| increment-planner | Create specs/plans | User says "plan feature" OR /inc |
| context-loader | Precision loading | Working on increment |
| spec-driven-debugging | Bug resolution | Test failure OR debug request |

When user says "create feature for auth", increment-planner auto-activates.
```

**AGENTS.md** (All Other Tools):
```markdown
## Available Skills

### increment-planner
**Purpose:** Create increment specifications and implementation plans
**Location:** .claude/skills/increment-planner/SKILL.md
**How to use:** Manually say "Act as the increment planner. Follow .claude/skills/increment-planner/SKILL.md instructions to create a spec.md and plan.md"

### context-loader
**Purpose:** Selectively load only relevant context
**Location:** .claude/skills/context-loader/SKILL.md
**How to use:** Before working on increment, say "Load context for increment-003-auth using context-loader skill workflow"
```

**Critical Difference:**
- CLAUDE.md → AI auto-activates based on keywords
- AGENTS.md → User manually invokes and guides

### Constitution vs CLAUDE.md (Spec-Kit vs SpecWeave)

**Spec-Kit's constitution.md:**
```markdown
# Project Constitution

## Development Principles
1. Specifications drive implementation
2. Scenarios define requirements
3. Gradual refinement (specify → plan → implement)

## Commands
- /speckit.specify: Create executable specifications
- /speckit.plan: Generate technical plans
- /speckit.implement: Execute implementation

Same file for Claude, Cursor, Copilot, all tools.
```

**SpecWeave's CLAUDE.md:**
```markdown
# SpecWeave Project Guide (Claude Code Native)

## Slash Commands
- /inc: Create new increment (calls increment-planner skill)
- /do: Execute increment (calls spec-driven-builder agent)

## Auto-Activation
increment-planner skill activates when you detect feature planning context.

Different file from AGENTS.md (for other tools).
```

**Critical Difference:**
- Spec-Kit: One universal instruction file
- SpecWeave: Separate files optimized per tool

---

## Analytics: Pros & Cons

### SpecWeave's Approach

#### Strengths
1. **Native excellence**: Claude Code users get best-in-class experience
   - Auto-activation saves tokens (no need to describe workflows)
   - Hooks auto-update docs (no manual sync)
   - Separate agent contexts (parallel work)

2. **Tool-specific optimization**: Each adapter leverages unique features
   - Cursor: @shortcuts for fast context injection
   - Copilot: Workspace instructions for project-wide awareness
   - Generic: Step-by-step guide for any AI

3. **Graceful degradation**: Tools get best approximation of native
   - Semi-automation where possible (Cursor's Composer)
   - Basic automation where limited (Copilot chat)
   - Manual fallback (ChatGPT/Claude web)

4. **Centralized definitions**: Agents/skills defined once, adapted many times
   - .claude/skills/increment-planner/SKILL.md is source of truth
   - CLAUDE.md references it directly
   - AGENTS.md provides manual equivalent
   - Adapters teach tools to follow it

#### Weaknesses
1. **Complexity**: Different files for different tools
   - Claude: CLAUDE.md + .claude/* native components
   - Cursor: AGENTS.md + .cursorrules + .cursor/context/*
   - Copilot: AGENTS.md + .github/copilot/instructions.md
   - Generic: AGENTS.md + SPECWEAVE.md

2. **Inconsistent UX**: Learning curve varies by tool
   - Claude: "Just describe your feature" (auto-activation)
   - Cursor: "Say 'create increment for X' and follow prompts"
   - Copilot: "Ask Copilot Chat 'How do I create spec.md?'"
   - Generic: "Read SPECWEAVE.md step 1-20"

3. **Maintenance burden**: Each adapter needs updates
   - New SpecWeave feature → Update all adapters
   - New tool emerges → Create new adapter
   - Tool updates capabilities → Adapter needs enhancement

4. **Onboarding variability**: Tool-dependent instructions
   - `specweave init` shows different next steps based on detected tool
   - Users switching tools need to re-learn workflow

#### When This Approach Wins
- **Claude Code users** get unparalleled automation
- **Teams with tool diversity** get functional approximations for each
- **Projects prioritizing Claude Code** while supporting others
- **Scenarios where tool-specific features matter** (Cursor's multi-file editing, Copilot's IDE integration)

---

### Spec-Kit's Approach

#### Strengths
1. **Consistency**: Same experience on all tools
   - Same commands (/speckit.specify, /speckit.plan)
   - Same workflow (specify → plan → tasks → implement)
   - Same instructions (read constitution.md)

2. **Simplicity**: One template set
   - Single .specify/ directory structure
   - One constitution.md for all tools
   - No tool-specific configuration files

3. **Low maintenance**: One codebase
   - Updates apply to all tools automatically
   - No adapters to maintain
   - New tools supported without code changes

4. **Easy onboarding**: Learn once, use everywhere
   - Switch from Claude to Cursor? Same workflow
   - Team uses mixed tools? Same methodology

5. **Technology independence**: Philosophy over tooling
   - Spec-driven development is tool-agnostic
   - Focus on methodology, not tool integration

#### Weaknesses
1. **Can't leverage native features**: Lowest common denominator
   - No Claude skills auto-activation
   - No Cursor @shortcuts
   - No Copilot workspace context
   - No tool-specific optimizations

2. **Missed optimization opportunities**:
   - Claude Code could auto-activate spec steps
   - Cursor could inject context via @increments shortcut
   - Copilot could suggest relevant docs

3. **Same limitations everywhere**:
   - Even on Claude Code, users manually invoke commands
   - Advanced tool capabilities go unused

#### When This Approach Wins
- **Teams with mixed tools** need consistent workflow
- **Organizations prioritizing consistency** over optimization
- **Projects where methodology matters more than tooling**
- **Scenarios with frequent tool switching**

---

### BMAD-METHOD's Approach

#### Strengths
1. **True universality**: Works anywhere
   - Web UI (Gemini Gems, CustomGPT)
   - IDEs (Claude Code, Cursor, VS Code)
   - CLI (any terminal with AI)
   - Even chat interfaces (ChatGPT web)

2. **Domain-agnostic**: Beyond software
   - Creative writing (team-creative.txt)
   - Business strategy
   - Wellness planning
   - Game development

3. **No dependencies**: Upload and go
   - No CLI to install
   - No configuration files
   - Just upload bundle + follow instructions

4. **Future-proof**: Text always works
   - New tools emerge? Upload bundle
   - Tool APIs change? Doesn't matter
   - Platform shut down? Move bundle elsewhere

5. **Agent methodology**: Solves root problems
   - Context loss between planning and implementation
   - Planning inconsistency
   - Human-in-the-loop refinement

#### Weaknesses
1. **No automation**: Always manual
   - User must tell AI which agent to adopt
   - No auto-activation of agents
   - No automatic task progression

2. **No validation**: Bundles are guidance
   - Can't enforce workflow
   - User might skip steps
   - No automated checks

3. **Can't leverage tool features**: Portable = generic
   - No native integrations
   - No tool-specific optimizations
   - No IDE features (file tree, git, terminal)

4. **Steeper learning curve**: Understand framework
   - Learn agent roles (Analyst, PM, Architect, Developer, QA)
   - Understand two-phase process (planning → development)
   - Follow "passing notes through story files" pattern

5. **Relies on discipline**: User must follow correctly
   - Skipping planning phase = context loss
   - Not adopting correct agent = inconsistent results

#### When This Approach Wins
- **Maximum portability** is priority
- **Domain expansion** beyond code (writing, business)
- **No tool installation** allowed/possible
- **Web UI usage** (Gemini Gems, CustomGPT)
- **Framework methodology** is the value (not tool integration)

---

## Why Per-Tool Installation Matters (Or Doesn't)

### Spec-Kit & BMAD: No Per-Tool Installation

**Spec-Kit:**
```bash
# Same installation for everyone
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Tool selection is just a parameter
specify init my-project --ai claude    # Creates same .specify/ directory
specify init my-project --ai cursor    # Creates same .specify/ directory
```

The `--ai` flag only affects:
- Command registration (how CLI hooks into tool)
- Script syntax (bash vs PowerShell)
- Validation (check if tool is installed)

**BMAD-METHOD:**
```bash
# Universal installation
npx bmad-method install

# Or just download team-fullstack.txt and upload anywhere
# No tool-specific setup needed
```

**Why they avoid per-tool installation:**
- **Philosophical commitment**: Methodology transcends tooling
- **Maintenance reduction**: One codebase, not N adapters
- **Consistency priority**: Same experience everywhere
- **Lowest common denominator**: Can't assume any tool features

### SpecWeave: Per-Tool Installation Required

```bash
# Auto-detects tool and installs adapter
specweave init my-project

# Detects Claude Code:
#   → Installs .claude/skills, .claude/agents, .claude/commands
#   → Creates CLAUDE.md with native references
#   → Full automation setup

# Detects Cursor:
#   → Installs .cursorrules with workflow instructions
#   → Creates .cursor/context/*.md for @shortcuts
#   → Creates AGENTS.md with manual workflows
#   → Semi-automation setup
```

**Why SpecWeave needs per-tool installation:**
- **Native optimization**: Claude Code gets full automation (skills, agents, hooks)
- **Tool-specific features**: Cursor gets @shortcuts, Copilot gets workspace instructions
- **Tiered approximation**: Each tool gets best possible experience
- **Different files per tool**: .cursorrules ≠ .github/copilot/instructions.md ≠ native .claude/*

**The tradeoff:**
- More complexity → Better optimization
- More maintenance → Better experience per tool
- More files → More capabilities

---

## Comparative Scenarios

### Scenario 1: Team Uses Only Claude Code

| Framework | Experience |
|-----------|-----------|
| **SpecWeave** | ⭐⭐⭐⭐⭐ Full automation (skills, agents, hooks, commands) |
| **Spec-Kit** | ⭐⭐⭐ Manual commands (/speckit.specify, /speckit.plan) |
| **BMAD** | ⭐⭐ Upload bundle, manually adopt agent roles |

**Winner:** SpecWeave (native excellence)

---

### Scenario 2: Team Uses Mixed Tools (Claude + Cursor + Copilot)

| Framework | Experience |
|-----------|-----------|
| **SpecWeave** | ⭐⭐⭐⭐ Each tool gets optimized adapter, but different workflows |
| **Spec-Kit** | ⭐⭐⭐⭐⭐ Same workflow everywhere, easy tool switching |
| **BMAD** | ⭐⭐⭐ Same bundles everywhere, but all manual |

**Winner:** Spec-Kit (consistency wins when team diversity high)

---

### Scenario 3: Team Frequently Switches Tools

| Framework | Experience |
|-----------|-----------|
| **SpecWeave** | ⭐⭐ Re-learn workflow per tool, different files |
| **Spec-Kit** | ⭐⭐⭐⭐⭐ Zero re-learning, same commands |
| **BMAD** | ⭐⭐⭐⭐ Same bundles, but manual everywhere |

**Winner:** Spec-Kit (consistency eliminates re-learning)

---

### Scenario 4: Need Maximum Portability (Web + IDE + CLI)

| Framework | Experience |
|-----------|-----------|
| **SpecWeave** | ⭐⭐ Requires CLI installation, limited to supported tools |
| **Spec-Kit** | ⭐⭐⭐ Requires CLI installation, works in 15+ tools |
| **BMAD** | ⭐⭐⭐⭐⭐ Text bundles work anywhere, no installation |

**Winner:** BMAD (true universality, works even in web UIs)

---

### Scenario 5: Domain Expansion (Non-Code Projects)

| Framework | Experience |
|-----------|-----------|
| **SpecWeave** | ⭐ Software development only |
| **Spec-Kit** | ⭐⭐ Primarily software specs |
| **BMAD** | ⭐⭐⭐⭐⭐ Expansion packs: writing, business, wellness, game dev |

**Winner:** BMAD (domain-agnostic by design)

---

### Scenario 6: Onboarding New Team Members

| Framework | Experience |
|-----------|-----------|
| **SpecWeave** | ⭐⭐ Tool-dependent instructions, adapter complexity |
| **Spec-Kit** | ⭐⭐⭐⭐⭐ Same instructions for everyone |
| **BMAD** | ⭐⭐⭐ Agent framework learning curve |

**Winner:** Spec-Kit (simplest onboarding)

---

## Recommendations

### Choose SpecWeave If:
✅ Your team primarily uses Claude Code
✅ You want maximum automation for Claude users
✅ You're okay with different experiences per tool
✅ You value tool-specific optimizations (Cursor @shortcuts, Copilot workspace context)
✅ You need graceful degradation (best approximation per tool)

### Choose Spec-Kit If:
✅ Your team uses mixed tools
✅ Consistency across tools is critical
✅ You want simple onboarding (learn once, use everywhere)
✅ You prioritize methodology over tool integration
✅ You want low maintenance (one codebase)

### Choose BMAD-METHOD If:
✅ You need maximum portability (web + IDE + CLI)
✅ You're expanding beyond software (writing, business, wellness)
✅ You can't install CLIs (restricted environments)
✅ You value agent methodology over automation
✅ You're okay with manual workflows

---

## SpecWeave's Path Forward

### Current State Assessment

**Strengths:**
- Native Claude Code integration is best-in-class
- Adapter system provides tool coverage
- Two-file strategy (CLAUDE.md + AGENTS.md) balances native vs universal

**Weaknesses:**
- Complexity higher than competitors
- Inconsistent UX across tools
- Maintenance burden (adapters need updates)

### Potential Improvements

#### Option 1: Hybrid Model (Keep Tiered, Simplify Adapters)
```
Claude Code: Native (no change)
    ↓
All Others: Single universal adapter + AGENTS.md
    ↓
Remove tool-specific adapters (Cursor, Copilot, etc.)
Use single generic adapter that writes AGENTS.md + basic instructions
```

**Pros:**
- Keep native excellence for Claude
- Reduce adapter maintenance (1 universal adapter vs 5+ tool-specific)
- Simplify onboarding (Claude = native, everything else = AGENTS.md)

**Cons:**
- Lose tool-specific optimizations (Cursor @shortcuts, Copilot workspace context)

#### Option 2: Feature Flags (Dynamic Adaptation)
```
specweave init --features=auto-activation,hooks,context-shortcuts

Claude Code → Enables all features
Cursor → Enables context-shortcuts only
Copilot → Enables basic instructions only
Generic → Enables nothing (manual only)
```

**Pros:**
- Adapters become feature composers
- Easy to add new features incrementally
- Clear capability matrix per tool

**Cons:**
- Added complexity in feature detection/enablement

#### Option 3: Convergence Model (Move Toward Spec-Kit Approach)
```
Make SpecWeave work same way on all tools:
- Keep native .claude/* for Claude users who want it
- But default experience is universal (like Spec-Kit)
- Adapters become optional "power-ups" instead of mandatory
```

**Pros:**
- Consistent UX for most users
- Optional native mode for power users
- Simpler onboarding

**Cons:**
- Underutilizes Claude Code's native capabilities by default

---

## Conclusion

### The Core Question: Universality vs Optimization

**Spec-Kit & BMAD:** Prioritize universality
- Same experience everywhere
- Can't leverage tool-specific features
- Simple, consistent, maintainable

**SpecWeave:** Prioritizes optimization
- Best experience per tool
- Complex, inconsistent, higher maintenance
- Native excellence (Claude) + graceful degradation (others)

### The Answer to "Why Per-Tool Installation?"

**They don't!** Spec-Kit and BMAD prove per-tool installation isn't necessary:
- Spec-Kit: Tool selection is runtime parameter
- BMAD: Text bundles work everywhere
- SpecWeave: Only framework with actual per-tool installation

### Why SpecWeave's Approach Might Be Right

**If native excellence matters:**
- Claude Code users get unparalleled automation
- Skills auto-activate based on keywords
- Agents run in separate contexts
- Hooks auto-update docs

**SpecWeave bet:** Native > Universal
- Better to have 10/10 experience on Claude and 7/10 on others
- Than 6/10 consistent experience everywhere

### Why Spec-Kit/BMAD Approach Might Be Right

**If consistency matters:**
- Team uses mixed tools → Same workflow
- Onboarding → Learn once
- Maintenance → One codebase

**Their bet:** Consistency > Optimization
- Better to have 6/10 everywhere
- Than 10/10 on one tool, 7/10 on others

---

## Final Verdict

**SpecWeave is not truly universal** in the Spec-Kit/BMAD sense:
- Spec-Kit: Universal templates, tool-agnostic commands
- BMAD: Portable bundles, works anywhere
- **SpecWeave: Structurally universal (same increments/docs), technically adapted (different files per tool)**

**Is CLAUDE.md vs AGENTS.md the only difference?**
No. Three differences:
1. CLAUDE.md (native references) vs AGENTS.md (manual workflows)
2. Native components (.claude/*) vs tool-specific files (.cursorrules, .github/copilot/*)
3. Auto-activation vs manual invocation

**Why do others offer per-tool installation?**
They don't. SpecWeave is the only one with actual per-tool installation (adapters).

**Which approach is better?**
Depends on priorities:
- **Native excellence** → SpecWeave
- **Consistency** → Spec-Kit
- **Portability** → BMAD

SpecWeave trades complexity for optimization. Spec-Kit and BMAD trade optimization for simplicity.

---

**Recommendation for SpecWeave:**

Consider **hybrid model**:
- Keep native Claude Code integration (unique differentiator)
- Simplify all other tools into single universal adapter
- Reduce from 5+ adapters to: Native (Claude) + Universal (everyone else)
- This gives: 10/10 on Claude, 7/10 consistent everywhere else

Best of both worlds: Native excellence where it matters + universal consistency for the rest.
