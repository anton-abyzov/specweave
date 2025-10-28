# Changelog

All notable changes to SpecWeave will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.4] - 2025-10-28

### 🎯 **MAJOR UX IMPROVEMENTS: Clean Project Structure**

**Three critical improvements for a cleaner, simpler init experience:**

---

#### 1. 📝 Minimal README (70% smaller)

**Problem**: v0.1.3 generated a massive 241-line README listing all 17+ skills that weren't installed yet!

**Fixed:**
- ✅ README reduced from 241 lines → 72 lines (70% smaller!)
- ✅ Removed premature skill listings
- ✅ Simple message: "Describe your project, components auto-install"
- ✅ Clear next steps without overwhelming details
- ✅ No confusing references to non-existent components

**Philosophy**: README should be **minimal at init**, then grow as your project grows.

---

#### 2. 🗂️ Proper 5-Pillar Documentation Structure

**Problem**: v0.1.3 created flat docs structure with wrong folders.

**Before (WRONG)**:
```
.specweave/docs/
├── api/
├── architecture/
├── decisions/
├── guides/
└── features/
```

**After (CORRECT)**:
```
.specweave/docs/
├── internal/
│   ├── strategy/      # Business specs (WHAT, WHY)
│   ├── architecture/  # Technical design (HOW)
│   ├── delivery/      # Roadmap, CI/CD, guides
│   ├── operations/    # Runbooks, SLOs
│   └── governance/    # Security, compliance
└── public/            # Published documentation
```

---

#### 3. 🧹 Removed Unused Folders

**Problem**: v0.1.3 created legacy folders that SpecWeave doesn't use.

**Removed**:
- ❌ `.specweave/tests/*` (tests go in increment folders)
- ❌ `.specweave/work/` (not used)
- ❌ `.specweave/cache/` (not used)
- ❌ `.specweave/logs/` (logs go in increment folders)

**Result**: Clean, minimal folder structure with only what's needed!

---

### Summary: What You Get After `specweave init`

**Minimal, clean structure**:
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
│   ├── commands/                # 10 slash commands installed
│   ├── agents/                  # Empty (auto-install on-demand)
│   └── skills/                  # Empty (auto-install on-demand)
├── CLAUDE.md                    # 12KB instructions
├── README.md                    # 72 lines (minimal)
└── .gitignore
```

**No clutter. No overwhelming info. Just describe your project and go!** 🚀

---

## [0.1.3] - 2025-10-28

### 🐛 **CRITICAL BUG FIX: `specweave init` Now Works!**

**⚠️ v0.1.2 had a critical bug** - `specweave init` created empty folders instead of copying templates!

**Fixed in v0.1.3:**
- ✅ `CLAUDE.md` is now properly copied from template
- ✅ `.specweave/config.yaml` is now created with project configuration
- ✅ Slash commands (`.claude/commands/*.md`) are now installed
- ✅ `README.md`, `.gitignore` are now copied
- ✅ All templates are populated with actual content

**Root Cause:** Path resolution bug in `init.ts` - was looking for `templates/` at package root, but templates are published to `src/templates/`.

**If you installed 0.1.2**, upgrade immediately:
```bash
npm update -g specweave
specweave --version  # Should show 0.1.3
```

Then re-run `specweave init` in your project folder.

---

## [0.1.2] - 2025-10-28 (⚠️ BROKEN - Use v0.1.3 instead)

### 🚀 **CRITICAL UX FIX**

**⚠️ This version has a bug** - init creates empty folders. Use v0.1.3 instead!

Same as v0.1.0 below, but with the killer feature actually working (when init bug is fixed in 0.1.3)!

---

## [0.1.0] - 2025-10-28 (⚠️ Use v0.1.2 instead)

### 🎉 First Stable Release

The first stable release of **SpecWeave** - a truly intelligent spec-driven development framework!

**Website**: [https://spec-weave.com](https://spec-weave.com)

---

## 🚀 **THE KILLER FEATURE: Just-In-Time Auto-Installation**

**No more manual `specweave install` commands!** SpecWeave is now truly intelligent - it installs components on-demand based on what you're building.

### Before (Manual - ❌ BAD UX):
```bash
specweave init
specweave install pm --local
specweave install architect --local
specweave install nextjs --local
specweave install nodejs-backend --local
specweave install security --local
# ... install 10+ more things manually
```

### After (Automatic - ✅ ZERO FRICTION):
```bash
specweave init
# Just start talking - SpecWeave handles the rest!

User: "Create Next.js authentication with OAuth"

SpecWeave: 🔷 SpecWeave Active
           📦 Installing required components...
              ✅ Installed nextjs skill
              ✅ Installed nodejs-backend skill
              ✅ Installed security agent
              ✅ Installed pm agent
              ✅ Installed architect agent
           🚀 Creating increment 0001-authentication...
```

**How It Works:**
1. **Analyze user intent** - Extract keywords from your request
2. **Map to components** - "Next.js" → nextjs skill, "authentication" → security agent
3. **Auto-install from npm** - Copy components from `node_modules/specweave/` to `.claude/`
4. **Proceed with routing** - All needed components available instantly

**Example Keyword Mappings:**
- "Next.js" → nextjs skill + nodejs-backend skill
- "FastAPI" → python-backend skill
- "authentication" → security agent
- "deploy to Hetzner" → hetzner-provisioner skill + devops agent
- "Figma" → figma-implementer skill + figma-designer skill
- "create" / "build" → pm agent + architect agent (strategic)

**Benefits:**
- ✅ **Zero manual installation** - never run `specweave install` again
- ✅ **Intelligent** - understands intent from natural language
- ✅ **Just-in-time** - only install what's actually needed
- ✅ **Automatic** - completely transparent to users
- ✅ **Efficient** - unused components never installed

**Configuration** (`.specweave/config.yaml`):
```yaml
auto_install: true  # Default: enabled
install_mode: "on-demand"  # or "all-upfront", "manual"
installed_components:
  skills: []  # Auto-populated as you work
  agents: []
```

**Files Added:**
- `src/utils/auto-install.ts` - Auto-installation engine
- Updated `src/skills/specweave-detector/SKILL.md` - Just-in-time installation logic
- Updated `src/cli/commands/init.ts` - Simplified (no pre-installation)
- Updated `src/templates/config.yaml` - Auto-install configuration

---

## 🆚 **Why SpecWeave vs Other Frameworks**

### vs **spec-kit** (GitHub)

| Feature | SpecWeave | spec-kit |
|---------|-----------|----------|
| **Smart Installation** | ✅ Auto-install on-demand | ❌ Manual setup |
| **Context Management** | ✅ 70-80% reduction | ❌ Loads all |
| **Multi-Agent** | ✅ 9 specialized agents | ❌ Commands only |
| **Quality Gates** | ✅ 120 automated rules | ❌ Manual review |
| **Auto-numbering** | ✅ 0001-9999 format | ❌ Manual naming |
| **Multi-tool Support** | ✅ Claude/Cursor/Copilot | ❌ Claude only |

### vs **BMAD-METHOD**

| Feature | SpecWeave | BMAD |
|---------|-----------|------|
| **Smart Installation** | ✅ Auto-install on-demand | ❌ Manual setup |
| **Documentation** | ✅ 5-pillar structure | ❌ Single README |
| **Incremental Planning** | ✅ Auto-numbered increments | ❌ Manual planning |
| **Context Precision** | ✅ Selective loading (70%+) | ❌ Load everything |
| **Test Strategy** | ✅ 4-level testing | ❌ Ad-hoc |
| **Framework Agnostic** | ✅ Any language/stack | ✅ Any stack |

---

## 📦 **Complete Feature List**

### Core Features (NEW - Smart Installation)
- ✅ **Just-in-time component installation** - Zero manual setup
- ✅ **Intent-based routing** - Natural language → components
- ✅ **70-80% token reduction** - Context precision via manifests
- ✅ **9 specialized agents** - PM, Architect, Security, QA, DevOps, SRE, Tech Lead, Docs, Performance
- ✅ **30+ skills** - Technology stacks, integrations, utilities
- ✅ **120 validation rules** - Automated quality gates
- ✅ **Framework-agnostic** - Works with ANY language/framework
- ✅ **Living documentation** - 5-pillar structure that evolves with code

### User Experience
- ✅ Single command setup: `specweave init`
- ✅ Natural language workflow: "Create Next.js authentication"
- ✅ Auto-detection: Tech stack from project files
- ✅ Slash commands for Claude Code: `/create-increment`, `/review-docs`, etc.
- ✅ Zero configuration needed

### Developer Experience
- ✅ 4-digit increment format (0001-9999)
- ✅ Auto-numbered increments (no conflicts)
- ✅ Context manifests for precision loading
- ✅ Test-validated features (4-level testing)
- ✅ Brownfield-ready (analyze, document, modify safely)

---

## 🗺️ **Roadmap**

**v0.2.0** (Q1 2026) - **Focus: Skills, Context, Testing**

**New Skills:**
- Advanced testing (contract, performance, mutation testing)
- Cloud providers (AWS, Azure, DigitalOcean provisioners)
- Additional integrations (Linear, Asana, Notion)

**Context Enhancements:**
- Second-pass context optimization (80%+ total reduction)
- Embedding-based context retrieval
- Multi-repo context management

**Testing Improvements:**
- Visual regression testing
- Cross-browser E2E tests
- Chaos engineering support

**v1.0.0** (Q2 2026) - **Production-Ready**
- Complete documentation
- Enterprise features
- SLA guarantees
- Professional support

---

## 📚 **Documentation**

- **Website**: [https://spec-weave.com](https://spec-weave.com)
- **GitHub**: [https://github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- **npm**: [https://www.npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)

---

## 🙏 **Credits**

Thank you to the early adopters and contributors who helped shape SpecWeave v0.1.0!

---

[0.1.4]: https://github.com/specweave/specweave/releases/tag/v0.1.4
[0.1.3]: https://github.com/specweave/specweave/releases/tag/v0.1.3
[0.1.2]: https://github.com/specweave/specweave/releases/tag/v0.1.2
[0.1.0]: https://github.com/specweave/specweave/releases/tag/v0.1.0
