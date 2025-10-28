# Changelog

All notable changes to SpecWeave will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.9] - 2025-10-28

### 🎯 **Smart Workflow: Auto-Resume, Auto-Close, Progress Tracking**

**Major UX improvement**: Eliminated manual tracking and closure with intelligent automation that **suggests, never forces**.

### What Changed

**1. NEW: `/progress` Command**:
```bash
/progress  # Shows task completion %, PM gates, next action
```

Features:
- Task completion percentage (P1 tasks weighted higher)
- PM gate preview (tasks, tests, docs status)
- Next action guidance
- Time tracking & stuck task warnings
- Auto-finds active increment (no ID needed)

**2. SMART: `/build` Auto-Resume**:
```bash
/build     # Auto-resumes from next incomplete task
/build 0001  # Or specify increment explicitly
```

Features:
- Automatically finds next incomplete task
- No manual tracking needed
- Shows resume context (completed vs remaining)
- Seamless continuation after breaks

**3. SMART: `/inc` Suggest-Not-Force Closure**:
```bash
/inc "next feature"  # Smart check of previous increment
```

Behavior:
- **If previous complete** (PM gates pass) → Auto-close, create new (seamless)
- **If previous incomplete** → Present options:
  - Option A: Complete first (recommended)
  - Option B: Move tasks to new increment
  - Option C: Cancel, stay on current
- **NEVER forces closure** - user always in control

**4. Updated npm Description**:
> "Replace vibe coding with spec-driven development. Smart workflow: /inc auto-closes previous, /build auto-resumes, /progress shows status. PM-led planning, 10 agents, 35+ skills. spec-weave.com"

### New Workflow (Natural & Efficient)

```bash
# 1. Plan first increment
/inc "user authentication"
# PM-led: market research → spec → plan → auto-generate tasks

# 2. Build it (smart resume)
/build
# Auto-starts from next incomplete task

# 3. Check progress anytime
/progress
# Shows: 5/12 tasks (42%), next: T006, PM gates status

# 4. Continue building
/build
# Picks up where you left off

# 5. Start next feature (smart closure)
/inc "payment processing"
# If 0001 complete → Auto-closes, creates 0002
# If 0001 incomplete → Suggests options (never forces!)

# 6. Keep building
/build
# Auto-finds active increment 0002

# Repeat: /inc → /build → /progress → /inc...
```

### Benefits

✅ **No manual tracking** - `/build` auto-resumes from next task
✅ **No forced closure** - `/inc` suggests options, user decides
✅ **Progress visibility** - `/progress` shows exactly where you are
✅ **Natural flow** - finish → start next (with user control)
✅ **Seamless happy path** - auto-close when PM gates pass
✅ **User control** - always asked, never surprised

### Files Updated

**New Commands**:
- `src/commands/progress.md` + `.claude/commands/progress.md`

**Updated Commands**:
- `src/commands/build.md` - Smart resume logic
- `src/commands/increment.md` - Suggest-not-force closure
- Synced to `.claude/commands/`

**Removed Commands** (Simplified):
- `/create-project` - Removed (use `specweave init` CLI instead)
- `/generate-docs` - Removed (moved to CLI for rare operations)

**Reason**: Simplification and better tool separation:
- `specweave init` is a CLI command, should remain in CLI (not slash command)
- `/generate-docs` is a rare operation (initial setup only), better as CLI or npm script
- Result: 9 clean slash commands (6 core + 3 supporting)

**Documentation**:
- `package.json` - Updated description
- `README.md` - New workflow examples
- `CLAUDE.md` - Smart workflow documentation, command removals
- `SPECWEAVE.md` - Updated command tables
- `src/commands/README.md` - Complete rewrite for v0.1.9 smart workflow
- `src/skills/specweave-detector/SKILL.md` - Complete rewrite for v0.1.9
- `.specweave/docs/internal/delivery/guides/increment-lifecycle.md` - Added comprehensive backlog management section with 4 workflow examples
- `src/templates/CLAUDE.md.template` - User project template

### Migration from 0.1.8

**No breaking changes** - all old commands still work!

New features are additive:
- `/build 0001` still works (just try `/build` for smart resume)
- `/done 0001` still works (just use `/inc` for auto-close)
- New `/progress` command available

Try it:
1. Update: `npm update -g specweave`
2. Use `/progress` to see current status
3. Use `/build` without ID for smart resume
4. Use `/inc` for smart closure suggestions

---

## [0.1.8] - 2025-10-28

### 🎯 **Command Simplification: 4-Command Append-Only Workflow**

**Major UX improvement**: Simplified command structure from 18+ commands to **4 core commands** for a clear append-only increment workflow.

### Why This Change?

**Problem**: Too many commands with multiple aliases created confusion and cognitive overhead.

**Solution**: Streamlined to 4 essential commands that mirror the natural feature development lifecycle:
1. **Plan** → 2. **Build** → 3. **Validate** → 4. **Done**

### What Changed

**1. Command Renaming (Clear and Descriptive)**:
```bash
# Old (0.1.7)              # New (0.1.8)
/create-increment    →     /increment
/start-increment     →     /build
/validate-increment  →     /validate
/close-increment     →     /done (unchanged)
```

**2. Removed ALL Short Aliases (Except ONE)**:
```bash
# Removed aliases:
❌ /pi, /si, /vi, /at, /ls, /init

# ONE alias remains (most frequently used):
✅ /inc → /increment
```

**Rationale**: `/inc` is used constantly (every new feature), other commands used once per increment.

**3. PM-Led Planning Process**:
- `/increment` now emphasizes **PM-led workflow**
- Auto-generates `tasks.md` from `plan.md`
- Manual task additions still supported

**4. Post-Task Completion Hooks**:
- `/build` now runs hooks **after EVERY task**
- Auto-updates: `CLAUDE.md`, `README.md`, `CHANGELOG.md`
- Documentation stays in sync automatically

**5. PM 3-Gate Validation**:
- `/done` now requires PM validation before closing:
  - **Gate 1**: Tasks completed (P1 required)
  - **Gate 2**: Tests passing (>80% coverage)
  - **Gate 3**: Documentation updated
- PM provides detailed feedback if gates fail

### New Workflow (Append-Only Increments: 0001 → 0002 → 0003)

```bash
# 1. Plan increment (use /inc - the ONLY alias!)
/inc "User authentication with JWT"
# PM-led: Market research → spec.md → plan.md → auto-generate tasks.md

# 2. Review generated docs
# spec.md, plan.md, tasks.md (auto-generated!), tests.md

# 3. Build it (hooks run after EVERY task)
/build 0001

# 4. Validate quality (optional)
/validate 0001 --quality

# 5. Close when done (PM validates 3 gates)
/done 0001
```

### Benefits

✅ **Simpler** - 4 commands instead of 18+
✅ **Clearer** - Descriptive names, no cryptic abbreviations (except `/inc`)
✅ **Explicit** - One alias only, full names for everything else
✅ **Append-only** - Natural workflow progression (0001 → 0002 → 0003)
✅ **Validated** - PM ensures quality before closure
✅ **Auto-documented** - Hooks update docs after every task

### Files Updated

**Commands** (renamed and rewritten):
- `.claude/commands/increment.md` (renamed from `create-increment.md`)
- `.claude/commands/build.md` (renamed from `start-increment.md`)
- `.claude/commands/validate.md` (renamed from `validate-increment.md`)
- `.claude/commands/inc.md` (NEW - only alias)
- `.claude/commands/done.md` (rewritten with 3-gate validation)

**Commands removed**:
- `pi.md`, `si.md`, `vi.md`, `at.md`, `ls.md`, `init.md` (aliases removed)
- `add-tasks.md` (tasks now auto-generated)
- `close-increment.md` (done.md is primary)

**Agents**:
- `src/agents/pm/AGENT.md` - Added comprehensive 3-gate validation logic

**Documentation**:
- `CLAUDE.md` - Updated with new command structure
- `README.md` - Updated workflow examples
- `CHANGELOG.md` - This file

### Migration from 0.1.7

**No breaking changes** to existing increments or project structure.

If you have existing projects:
1. Update to 0.1.8: `npm update -g specweave`
2. Re-install components: `npm run install:skills && npm run install:agents`
3. **Start using new commands**:
   - Use `/inc` instead of `/pi`
   - Use `/build` instead of `/si`
   - Use `/validate` instead of `/vi`
   - Use `/done` (unchanged)

### User Impact

⚠️ **BREAKING CHANGE**: Old command aliases removed. Use new commands:
- `/pi` → `/inc` or `/increment`
- `/si` → `/build`
- `/vi` → `/validate`
- Other commands use full names only

---

## [0.1.7] - 2025-10-28

### 🔄 **CRITICAL: Slash Commands Only (Architectural Pivot)**

**Major UX change**: SpecWeave now uses **EXPLICIT SLASH COMMANDS** instead of auto-activation.

### Why This Change?

**Problem discovered**: Auto-activation/proactive detection doesn't work reliably in Claude Code. Users reported that SpecWeave wasn't activating when expected, causing confusion and broken workflows.

**Solution**: Explicit slash commands (like spec-kit approach) ensure SpecWeave ALWAYS activates when you want it.

### What Changed

**1. Slash Command Workflow (NEW!)**:
```bash
# Old approach (0.1.6 and earlier) - DIDN'T WORK:
User: "Create authentication feature"
❌ SpecWeave might not activate

# New approach (0.1.7+) - ALWAYS WORKS:
User: /pi "Create authentication feature"
✅ SpecWeave ALWAYS activates
```

**2. Updated `specweave-detector` skill**:
- ❌ Removed `proactive: true` flag
- ❌ Removed auto-activation logic
- ❌ Removed intent-based routing
- ✅ Changed to documentation skill
- ✅ Explains slash commands clearly
- ✅ Updated description with all command keywords

**3. Updated ALL documentation**:
- ✅ `CLAUDE.md` template - Slash commands first approach
- ✅ `SPECWEAVE.md` - Document slash commands
- ✅ `README.md` - Show slash command workflow
- ✅ `specweave-detector` skill - Complete rewrite

**4. Command aliases remain unchanged**:
- `/pi` = `/create-increment` (Plan Product Increment)
- `/si` = `/start-increment`
- `/at` = `/add-tasks`
- `/vi` = `/validate-increment`
- `/done` = `/close-increment`
- `/ls` = `/list-increments`

### Typical Workflow (Updated)

```bash
# 1. Initialize project
npx specweave init my-saas

# 2. Plan increment (MUST use slash command!)
/pi "User authentication with JWT and RBAC"

# SpecWeave creates:
# ✅ spec.md (requirements)
# ✅ plan.md (architecture)
# ✅ tasks.md (implementation steps)
# ✅ tests.md (test strategy)

# 3. Implement (regular conversation, no slash command)
User: "Implement the authentication backend"
Claude: [implements based on plan.md]

# 4. Close increment (slash command)
/done 0001
```

### Benefits

✅ **100% reliable** - Always works, no guessing
✅ **Clear intent** - You know exactly when SpecWeave is active
✅ **Fast** - Short aliases like `/pi` save keystrokes
✅ **Memorable** - Domain-specific names (PI = Product Increment from Agile/SAFe)
✅ **No confusion** - Explicit is better than implicit

### Migration from 0.1.6

**No breaking changes to project structure** - only activation mechanism changed.

If you have existing projects:
1. Update to 0.1.7: `npm update -g specweave`
2. Re-install components: `npm run install:skills`
3. **Start using slash commands**: Type `/pi "feature"` instead of "Create feature"

### User Impact

⚠️ **BREAKING CHANGE**: You MUST now use slash commands to activate SpecWeave.

**Before (0.1.6 - DIDN'T WORK)**:
- "Create authentication" → ❌ Might not activate

**After (0.1.7 - ALWAYS WORKS)**:
- `/pi "authentication"` → ✅ Always activates

**Remember**: Type `/pi` first, THEN implement! Otherwise you lose all SpecWeave benefits (specs, architecture, test strategy).

---

## [0.1.6] - 2025-10-28

### ✨ **Command Aliases & Roadmap Improvements**

Major UX improvement: Short, memorable command aliases based on Agile terminology.

### 🚀 **NEW: Command Aliases**

**Problem**: Typing `/create-increment` repeatedly during development is tedious.

**Solution**: Short, domain-specific aliases!

| Full Command | Alias | Meaning |
|--------------|-------|---------|
| `/create-project` | `/init` | Initialize project |
| `/create-increment` | `/pi` | **Plan Product Increment** |
| `/start-increment` | `/si` | Start increment |
| `/add-tasks` | `/at` | Add tasks |
| `/validate-increment` | `/vi` | Validate increment |
| `/close-increment` | `/done` | Close increment |
| `/list-increments` | `/ls` | List increments |

**Why `/pi`?**
- **PI = Product Increment** (standard Agile/Scrum terminology)
- Aligns with PI Planning (Program Increment in SAFe framework)
- Domain-specific and memorable
- Avoids confusion with CI/CD

**Typical workflow**:
```bash
/init my-saas              # Initialize
/pi "User authentication"  # Plan Product Increment
/si 0001                   # Start
/at 0001 "Add tests"       # Add tasks
/vi 0001 --quality         # Validate
/done 0001                 # Close
```

**Benefits**:
- 🚀 **50-70% fewer keystrokes** for common commands
- 💪 **Memorable aliases** based on Agile terminology
- 📖 **Full commands still work** for scripts and documentation

### 📋 **Roadmap Policy Update**

**NEW RULE: Never plan more than 1 version ahead!**

**Why?**
- ✅ Prevents over-commitment and disappointment
- ✅ Allows flexibility based on user feedback
- ✅ Focuses team on immediate next milestone
- ✅ Avoids obsolete promises as product evolves

**Updated Roadmap**:
- ✅ **Current**: v0.1.6 (this release)
- ✅ **Next**: v0.2.0 (Q2 2025) - Quality, Testing, Context
- ❌ **Removed**: v0.3.0, v1.0.0, and all far-future versions

**After v0.2.0 ships** → Define v0.3.0 (not before!)

### 🐛 **Bug Fixes**

#### What's Fixed

**1. `specweave-detector` skill - Major cleanup**:
- ❌ Removed outdated auto-installation references (lines 36-175)
- ❌ Removed "Just-In-Time Component Installation" section
- ❌ Removed auto-installation component mapping
- ❌ Removed installation commands: `npx specweave install spec-author`
- ✅ Updated all examples to show pre-installed components
- ✅ Enhanced YAML description with activation keywords
- ✅ Updated Skill Discovery section (comprehensive pre-installed list)
- ✅ Fixed all path references: `features/` → `.specweave/increments/`
- ✅ Fixed all naming: "Feature 00X" → "Increment 000X"
- ✅ Updated config example (removed `auto_install` setting)

**2. README.md - npm package documentation**:
- ✅ Updated version badge: `0.1.0-beta.1` → `0.1.5`
- ✅ Added spec-weave.com website links throughout
- ✅ Removed ALL auto-installation and dynamic loading references
- ✅ Updated component counts: 19 agents → 10 agents, 24 skills → 35+ skills
- ✅ Updated Quick Example to emphasize pre-installation
- ✅ Removed entire "Context Precision (70%+ reduction)" section
- ✅ Updated comparisons to BMAD-METHOD and spec-kit
- ✅ Updated all GitHub URLs: `specweave/specweave` → `anton-abyzov/specweave`
- ✅ Simplified documentation section with spec-weave.com links

#### Why This Matters

These fixes ensure **complete consistency** with the 0.1.5 pre-installation approach:
- No confusing references to auto-installation
- Accurate activation triggers for skills
- Clear examples showing pre-installed components
- Professional npm package documentation

#### User Impact

✅ **SpecWeave activation now works correctly** - `specweave-detector` has proper keywords
✅ **npm package page is accurate** - shows correct features and approach
✅ **No more confusion** - all documentation aligned with pre-installation

---

## [0.1.5] - 2025-10-28

### 🔥 **MAJOR CHANGE: All Components Pre-Installed!**

**Strategic reversal**: We're pre-installing ALL agents and skills instead of auto-installing on-demand.

#### Why This Change?

**OLD approach (0.1.0-0.1.4)**: "Just-in-time auto-installation"
- Empty `.claude/agents/` and `.claude/skills/` folders
- Components install automatically when you describe your project
- Marketed as "killer feature"

**Problems discovered**:
- User confusion: "Why are folders empty?"
- Unclear UX: "Do I need to install something?"
- Unnecessary complexity for a simple use case

**NEW approach (0.1.5+)**: "Everything ready out of the box"
- ALL 10 agents pre-installed
- ALL 35+ skills pre-installed
- Ready to use immediately
- No auto-installation logic needed

#### What's Changed

**1. `specweave init` now copies ALL components**:

```bash
specweave init my-project

# Creates:
.claude/
├── agents/      # 10 agents copied (PM, Architect, Security, QA, DevOps, Tech Lead, SRE, Docs Writer, Performance, Diagrams Architect)
├── skills/      # 35+ skills copied (Node.js, Python, Next.js, React, etc.)
└── commands/    # 10 slash commands copied
```

**2. Updated all documentation**:
- ✅ README.md: "All components pre-installed"
- ✅ CLAUDE.md: Removed auto-install references
- ✅ CLI output: Shows pre-installed component counts

**3. Simplified mental model**:
- **Before**: "Describe project → Components auto-install → Start building"
- **After**: "Run init → All ready → Describe project → Start building"

#### Benefits

✅ **Clearer UX**: No confusion about empty folders
✅ **Faster starts**: No installation wait time
✅ **Simpler architecture**: No auto-install detection logic
✅ **Predictable**: Same components every time
✅ **Offline-friendly**: All components local after init

#### Trade-offs

⚠️ **Larger package**: ~1.7MB (includes all agents/skills)
⚠️ **More disk usage**: ~5-10MB per project (vs empty folders)

But these trade-offs are acceptable for the dramatically improved UX!

---

### What You Get After `specweave init`

```
your-project/
├── .specweave/
│   ├── config.yaml
│   ├── increments/              # Empty (created as you build)
│   └── docs/internal/           # 5-pillar structure
│       ├── strategy/
│       ├── architecture/
│       ├── delivery/
│       ├── operations/
│       └── governance/
├── .claude/
│   ├── commands/                # ✅ 10 slash commands (pre-installed)
│   ├── agents/                  # ✅ 10 agents (pre-installed)
│   └── skills/                  # ✅ 35+ skills (pre-installed)
├── CLAUDE.md                    # Instructions for Claude
├── README.md                    # Minimal project readme
└── .gitignore
```

**All ready to go! Just describe your project.** 🚀

---

### Migration from 0.1.4

If you're on 0.1.4 with empty folders:

```bash
# Upgrade
npm update -g specweave

# Re-run init to populate folders
cd your-project
rm -rf .claude
specweave init --skip-existing
```

---

### Summary

- 🔄 **Strategic reversal**: From auto-install to pre-install
- ✅ **10 agents** ready immediately
- ✅ **35+ skills** ready immediately
- ✅ **Clearer UX** for users
- ✅ **Simpler architecture** for maintainers

**This is the right approach for SpecWeave moving forward!**

---

[0.1.5]: https://github.com/specweave/specweave/releases/tag/v0.1.5
