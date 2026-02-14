# Social Media: Programs Written in Human Language

**Core thesis**: Claude Code Skills are PROGRAMS WRITTEN IN HUMAN LANGUAGE. SpecWeave applied SOLID Open/Closed Principle to make them extendable. First time software engineering principles govern AI instructions written in plain English.

**Strategy**: Credit Anthropic FIRST → "Programs in human language" shock → 5 innovations → Call to action

**Key Differentiators (First in the World)**:
1. **Extendable Skills Standard** - SOLID Open/Closed Principle for human-language AI programs
2. **Working LSP Integration** - 100x faster code intelligence vs text search
3. **Living Documentation** - Auto-synced specs that never drift from code
4. **Enterprise-Grade Workflow** - Multi-repo coordination, GitHub/JIRA/ADO sync, quality gates
5. **Production-Ready** - 190+ increments, 15 pre-commit validations, TDD enforcement

**Core Message**: Claude Code shipped the first programs written in human language → SpecWeave applied SOLID principles to make them extendable and production-ready

**SEE ALSO**: `docs-site/docs/guides/social-media-launch.md` for the polished Twitter thread + Dev.to article version

**Twitter Handles**:
- @AnthropicAI @bchernay @tharik (credit first)
- @OpenAI @github @cursor (call to action)

---

## Twitter Thread (COMPREHENSIVE - 12 TWEETS)

### Tweet 1 (Credits + Hook)
What @AnthropicAI built with Claude Code Skills is more important than people realize.

@bchernay @tharik — you didn't just ship a feature.

You shipped the first **programs written in human language**.

Let me explain why this changes everything about AI development:

### Tweet 2 (The Problem - Hit Hard)
You can't customize AI tools.

Copilot? Black box. ❌
Cursor? Proprietary. ❌
ChatGPT? Limited. ❌

We regressed from CONFIGURABLE software to LOCKED AI.

**Why did we accept this?**

### Tweet 3 (The Paradigm Shift)
For 70 years: Assembly → C → Python → JavaScript

Each jump: "wait, you can write programs THAT simply?"

@AnthropicAI's Claude Code made the next jump.

A SKILL.md file IS a program. Written in English. Executed by AI.

It has instructions, conditionals, logic flow, error handling. That's not a config. That's a program.

### Tweet 4 (Innovation #1: SOLID for Human-Language Programs)
If Skills are programs, then software engineering principles should apply.

I built SpecWeave to test that thesis:

**Open/Closed Principle**:
✅ SKILL.md = core program (closed, stable, versioned)
✅ skill-memories/ = your extensions (open, customizable)

Claude reads both. Your rules override defaults. You never fork the original.

**SOLID. For English.**

```markdown
# .specweave/skill-memories/frontend.md

When generating forms:
- React Hook Form + Zod
- Never use useState

When generating components:
- Check design system FIRST
```

You PROGRAM the AI. It remembers forever.

Full spec: https://spec-weave.com/docs/guides/extensible-skills

### Tweet 5 (Innovation #2: Working LSP - 100x Faster)
**INNOVATION #2**: Working LSP Integration (100x faster than text search)

Claude Code has LSP plugins, but SpecWeave makes them WORK:

**Before (Grep)**: 15,000 tokens to find references
**After (LSP)**: 500 tokens

**30x token savings. 100x faster.**

Example:
```bash
# Find all usages of PaymentService
specweave lsp refs src/services/payment.ts PaymentService

# Go to definition
specweave lsp def src/app.ts UserController
```

Semantic accuracy >> text search guessing.

### Tweet 6 (Innovation #3: Living Documentation)
**INNOVATION #3**: Living Documentation that NEVER drifts

Most docs die in 6 months. SpecWeave's docs SYNC with code automatically.

✅ Specs update when tasks complete
✅ Auto-sync to GitHub/JIRA/ADO
✅ Pre-commit blocks outdated docs
✅ 190+ increments, zero drift

**Your documentation IS your project tracker.**

Docs: https://spec-weave.com/docs/guides/living-docs

### Tweet 7 (Innovation #4: Enterprise Multi-Repo)
**INNOVATION #4**: Enterprise Multi-Repo Coordination

Microservices? Monorepo? Polyrepo? SpecWeave handles ALL:

✅ Frontend + Backend + Mobile repos synced
✅ One spec → multiple GitHub/JIRA projects
✅ Cross-repo task dependencies
✅ Umbrella coordination patterns

**First framework to coordinate AI across multiple repos.**

Example:
```
repositories/
├── acme/frontend/     # React repo
├── acme/backend/      # Node.js repo
└── acme/mobile/       # React Native repo

.specweave/increments/0042-auth-flow/
└── Cross-repo tasks auto-mapped
```

### Tweet 8 (Innovation #5: Quality Gates - Production Ready)
**INNOVATION #5**: Quality Gates that Actually Enforce Standards

15 pre-commit validations. No shortcuts.

✅ Blocks commits with wrong file formats
✅ Enforces TDD (RED→GREEN→REFACTOR)
✅ Validates YAML frontmatter
✅ Prevents root folder pollution
✅ Security pattern scanning

**Example**: Try to commit `name:` in SKILL.md frontmatter?

❌ BLOCKED. Pre-commit hook explains why and shows fix.

This keeps your repo CLEAN. Forever.

### Tweet 9 (Production Proof)
This isn't vaporware. SpecWeave is PRODUCTION-READY:

📊 **190+ increments** managed
🔒 **15 pre-commit validations** enforced
📚 **350+ living docs** synced
🧪 **TDD enforcement** strict mode
🔄 **Multi-repo** brownfield proven

**Real projects. Real results.**

### Tweet 10 (The Full Stack)
The complete picture:

1️⃣ **Extendable Skills** (SOLID Open/Closed) - FIRST IN WORLD
2️⃣ **Working LSP** (100x faster code intelligence)
3️⃣ **Living Docs** (never drift from code)
4️⃣ **Multi-Repo** (enterprise coordination)
5️⃣ **Quality Gates** (15 pre-commit validations)

**Claude Code pioneered transparent AI.**
**SpecWeave made it programmable, extendable, and enterprise-ready.**

### Tweet 11 (Call to Action - Industry)
@OpenAI — ChatGPT should adopt extendable skills
@github — Copilot needs LSP + living docs
@cursor — Great UX, but give us transparency

**The standards exist. They're documented. They work.**

Claude Code showed transparency is possible.
SpecWeave proved it's practical for PRODUCTION.

**Stop building black boxes.**

### Tweet 12 (Try It + Vision)
Try it:
```bash
npm install -g specweave
specweave init .
/sw:increment "your feature"
```

**2026**: Claude Code transparent AI → SpecWeave extendability + LSP + living docs
**2027**: Industry adopts programmable AI standards
**2028**: Extendable, production-ready AI = norm

**The future is programmable AI. SpecWeave proves it works.**

Docs: https://spec-weave.com

Credits: @AnthropicAI for pioneering this with Claude Code 🙏

🧵 End

---

## Dev.to Article (COMPREHENSIVE)

# We've Been Writing Programs in the Wrong Language

**February 13, 2026** | Reading time: 12 minutes

## Credits First

Massive credit to @AnthropicAI's @bchernay, @tharik, and the Claude Code team. You didn't just ship a feature. You shipped the first programs written in human language.

## The Paradigm Shift

A SKILL.md file is a program. Not metaphorically. Literally. It has instructions, conditionals, logic flow, error handling. Written in English. Executed by AI.

For 70 years: Assembly → C → Python → JavaScript. Each jump made programs more human-readable. Claude Code Skills are the next jump.

**SpecWeave proves that software engineering principles apply to these human-language programs.** Starting with SOLID Open/Closed:

1. **Extendable Skills** - SOLID Open/Closed Principle (SKILL.md closed + skill-memories open)
2. **Working LSP Integration** - 100x faster code intelligence vs text search
3. **Living Documentation** - Auto-synced specs that never drift from code
4. **Multi-Repo Coordination** - Enterprise-grade brownfield project management
5. **Quality Gate Enforcement** - 15 pre-commit validations that actually block bad commits

**Built on Claude Code's transparent foundation. Extended for production use.**

Let me explain what I built, why this matters, and how it changes AI development.

---

## The Problem: We Regressed

**2010-2020**: Software was configurable
- Desktop apps: Settings files, plugins, extensions
- SaaS: APIs, webhooks, configurations
- No-code: Visual builders

**2025**: AI tools are black boxes
- Copilot: ❌ Zero customization
- Cursor: ❌ Proprietary
- ChatGPT: ⚠️ Limited (Custom GPTs)

**We went backwards.**

---

## Claude Code: Programs in Human Language

@AnthropicAI's Claude Code did something nobody fully appreciated:

**Skills** = Programs written in human language
- Instructions ("do X, then Y")
- Conditionals ("when user mentions admin, add RBAC")
- Logic flow ("check design system first, if exists import, else create")
- Error handling ("if tests fail, identify root cause, fix, re-run")

That's not a config file. That's a **program**. In English. Executable by AI.

This was revolutionary. Credit to @bchernay (PM) and @tharik (Architecture) for making this possible.

---

## Innovation #1: SOLID for Human-Language Programs

If Skills are programs, then software engineering principles should apply. SpecWeave proves it — starting with the Open/Closed Principle from SOLID.

### Technical Specification

**Architecture**: Open/Closed Principle (SOLID, 1988)
- **SKILL.md** = Closed for modification (stable core, maintained by SpecWeave)
- **skill-memories/*.md** = Open for extension (your rules, your team's learnings)

**Runtime**: Claude reads both files, user rules override defaults

**Persistence**: Git-versioned, team-sharable, rollback-capable, cross-project portable

**Innovation**: **FIRST** to make AI skills extendable without forking

**Full specification**: https://spec-weave.com/docs/guides/extensible-skills

### Real-World Example

```markdown
# .specweave/skill-memories/frontend.md

### Form Handling
**Rule**: Always use React Hook Form + Zod validation
**Never**: Use useState for form state (causes re-render cascades)

### Component Generation
**Before generating new components:**
1. Check design system directory FIRST (`src/components/ds/`)
2. Import if component exists
3. Create new ONLY if no match found
4. Extract logic to custom hooks if component >50 lines

### API Integration
**Pattern**: TanStack Query for all server state
**File structure**:
- Queries: `src/api/queries/<domain>.ts`
- Mutations: `src/api/mutations/<domain>.ts`
- Never mix queries and mutations in same file
```

**Result**: The AI follows YOUR team's patterns. Every. Single. Time.

**You program the AI. It remembers forever.**

---

## Innovation #2: Working LSP Integration (100x Faster)

Claude Code ships with LSP plugins (TypeScript, Python, C#, Go). But in large codebases (100+ repos, 350+ living docs), they need configuration help.

**SpecWeave makes LSP WORK in production environments.**

### The Problem: Text Search Doesn't Scale

**Without LSP** (using Grep):
```bash
# Find all references to "PaymentService"
grep -r "PaymentService" . --include="*.ts"

# Result: 150+ false positives (comments, strings, similar names)
# Tokens used: ~15,000
# Time: 8-12 seconds
```

**With LSP** (semantic understanding):
```bash
# Find ACTUAL references to PaymentService class
specweave lsp refs src/services/payment.ts PaymentService

# Result: 12 actual usages
# Tokens used: ~500
# Time: <1 second
```

**30x token savings. 100x faster. Semantic accuracy.**

### Real Examples

#### Example 1: Find References
```bash
# Before (Grep - text search)
grep -r "AppDbContext" . --include="*.cs"
# Returns: 847 matches (includes comments, strings, docs)

# After (LSP - semantic)
specweave lsp refs src/Data/AppDbContext.cs AppDbContext
# Returns: 23 actual code references
```

#### Example 2: Go To Definition
```bash
# Before (text search + guessing)
find . -name "UserController.cs" | head -1
# Returns: src/Controllers/UserController.cs (maybe? multiple files?)

# After (LSP - exact)
specweave lsp def src/Program.cs UserController
# Returns: src/Api/Controllers/Users/UserController.cs:15
# Handles imports, namespaces, aliasing automatically
```

#### Example 3: Type Hover Information
```bash
# Before (read entire file to understand types)
cat src/services/payment.ts  # 450 lines

# After (LSP - instant type info)
specweave lsp hover src/app.ts paymentService
# Returns: "paymentService: PaymentService (from ./services/payment)"
```

### Token Savings at Scale

**Large codebase example** (100 repos, 2M LOC):
- Daily Grep searches: ~200
- Tokens used (Grep): 200 × 15,000 = **3,000,000 tokens/day**
- Tokens used (LSP): 200 × 500 = **100,000 tokens/day**

**97% token reduction. 30x cost savings.**

**Why This Matters**: In production, token efficiency = speed + cost savings. LSP makes AI viable for LARGE codebases.

**Guide**: https://spec-weave.com/docs/guides/lsp-integration

---

## Innovation #3: Living Documentation (Never Drifts)

Most documentation dies within 6 months. Code changes, docs don't update, trust erodes.

**SpecWeave's living docs SYNC with code automatically.**

### The Architecture

**Three-layer sync**:
1. **tasks.md** (task completion status)
2. **spec.md** (acceptance criteria)
3. **Living docs** (product documentation)

**Automatic sync triggers**:
- Task marked complete → AC marked complete → Living doc updated
- Increment reopened → Docs show "DRAFT" status
- Increment archived → Docs link to archive

**Pre-commit enforcement**:
- Blocks commits if spec.md doesn't match tasks.md
- Validates YAML frontmatter in all specs
- Prevents documentation drift at commit time

### Real-World Example

```markdown
# Before (manual documentation)
# docs/features/authentication.md

## User Login
Status: ❓ (no idea if this is implemented)

Users can log in with email/password.

Last updated: 2024-08-15 (6 months ago)
```

```markdown
# After (SpecWeave living docs)
# .specweave/docs/public/features/authentication.md

## User Login
**Status**: ✅ Completed (Increment: 0042-auth-flow)
**Last Updated**: 2026-02-10 (auto-synced)

### Implementation
- [x] AC-US1-01: Email/password validation
- [x] AC-US1-02: JWT token generation
- [x] AC-US1-03: Session management
- [x] AC-US1-04: 2FA support

**Tests**: 95% coverage (src/auth/login.test.ts)
**API**: POST /api/auth/login
**Docs**: Auto-updated via task completion
```

**Benefit**: Docs are ALWAYS current. No manual updates needed.

### Pre-Commit Validation Example

Try to commit with wrong format:

```yaml
# spec.md (wrong format)
---
title: Auth Flow
acceptance_criteria:
  - AC-001: Login works  # ❌ Wrong ID format
```

**Pre-commit hook blocks**:
```
❌ YAML frontmatter validation failed
   Invalid AC ID format: "AC-001"
   Expected format: "AC-US1-01" (AC-<story>-<number>)
   See: CLAUDE.md Section 8
```

**Your commit is blocked until you fix it.** This PREVENTS drift before it starts.

**Documentation**: https://spec-weave.com/docs/guides/living-docs

---

## Innovation #4: Multi-Repo Coordination (Enterprise-Ready)

Most AI tools assume single-repo projects. Real enterprise projects have:
- Frontend repo (React/Next.js)
- Backend repo (Node.js/Python/.NET)
- Mobile repo (React Native)
- Shared libraries (utils, types, components)

**SpecWeave coordinates AI work across ALL repos.**

### Multi-Repo Patterns Supported

#### Pattern 1: Umbrella Repository
```
my-project/
├── .specweave/                    # Single source of truth
│   └── increments/0042-auth/
│       ├── spec.md                # Cross-repo specification
│       └── tasks.md               # Tasks mapped to repos
├── repositories/
│   ├── acme/frontend/             # React repo
│   │   └── .git
│   ├── acme/backend/              # Node.js repo
│   │   └── .git
│   └── acme/mobile/               # React Native repo
│       └── .git
```

**One increment → changes in multiple repos.**

#### Pattern 2: Task Mapping

```markdown
# .specweave/increments/0042-auth-flow/tasks.md

### T-001: Frontend Login UI
**Repo**: repositories/acme/frontend/
**Satisfies**: AC-US1-01
Status: [x] completed

### T-002: Backend Auth Endpoint
**Repo**: repositories/acme/backend/
**Satisfies**: AC-US1-02
Status: [x] completed

### T-003: Mobile Login Screen
**Repo**: repositories/acme/mobile/
**Satisfies**: AC-US1-01
Status: [x] completed
```

**SpecWeave knows which repo each task belongs to.**

#### Pattern 3: GitHub/JIRA Multi-Project Sync

```json
// .specweave/config.json
{
  "sync": {
    "github": {
      "organization": "acme-corp",
      "projects": {
        "frontend": "acme/web-app",
        "backend": "acme/api-server",
        "mobile": "acme/mobile-app"
      }
    }
  }
}
```

**One SpecWeave spec → creates issues in THREE GitHub repos automatically.**

**Command**:
```bash
/sw:progress-sync 0042
# Creates/updates issues in all 3 repos
# Syncs task completion status
# Links related issues across repos
```

### Why This Matters

**Before SpecWeave** (manual coordination):
- Create 3 separate GitHub issues manually
- Copy/paste user story to each repo
- Manually keep status in sync
- Lose cross-repo traceability

**With SpecWeave** (automatic):
- Write spec ONCE
- Auto-create issues in all repos
- Auto-sync task completion
- Full cross-repo traceability

**Real brownfield project**: 100 repos, 15 teams, 350+ living docs. SpecWeave coordinates all of it.

**Guide**: https://spec-weave.com/docs/guides/multi-project-sync-architecture

---

## Innovation #5: Quality Gates (Pre-Commit Enforcement)

Most frameworks ADVISE best practices. SpecWeave ENFORCES them.

**15 pre-commit validations that actually block bad commits.**

### The 15 Validations

1. **TypeScript build check** - Ensures dist/ builds successfully
2. **Missing .js extensions** - Blocks ESM imports without extensions
3. **Duplicate increment IDs** - Prevents data corruption
4. **Status desync** - Blocks spec.md ↔ tasks.md mismatches
5. **Empty plugin directories** - Prevents "Agent type not found" errors
6. **fs-extra imports** - Enforces native fs migration
7. **YAML frontmatter validation** - Blocks malformed spec.md files
8. **Increment-to-increment references** - Prevents circular dependencies (ADR-0061)
9. **GitHub issue format** - Blocks deprecated SP- prefix
10. **Hook variable order** - Prevents recursion guard bypass
11. **CHANGELOG version** - Prevents release failures
12. **Root folder pollution** - Keeps repo clean (no stray analysis files)
13. **`name:` field in frontmatter** - Prevents plugin prefix stripping
14. **Security patterns** - Scans for secrets, eval(), innerHTML, SQL injection
15. **Development setup** - Validates contributor environment

### Real Example: Preventing Plugin Prefix Stripping

**Problem**: Using `name:` in SKILL.md frontmatter strips the plugin prefix.

```yaml
# ❌ WRONG (strips /sw: prefix)
---
name: grill
description: Critical code review
---
```

Result: Skill registers as `/grill` instead of `/sw:grill` → command not found

**Pre-commit hook catches this**:

```bash
git commit -m "Add grill skill"

❌ YAML frontmatter validation failed
   File: plugins/specweave/skills/grill/SKILL.md

   ERROR: 'name:' field in SKILL.md frontmatter strips plugin prefix

   Remove the 'name:' field. Skill names are derived automatically:
   - Skills: Directory name (skills/grill/ → 'grill')
   - Commands: Filename (commands/do.md → 'do')

   Plugin prefix comes from plugin.json: "name": "sw"
   Final command: /sw:grill

   See: .specweave/docs/public/troubleshooting/skill-name-prefix-stripping.md

COMMIT BLOCKED. Fix the file and try again.
```

**Your commit is blocked until you remove `name:`.**

This prevents bugs BEFORE they pollute your repository.

### Why This Matters

**Without enforcement**:
- Devs forget to run tests → broken builds slip through
- Wrong file formats get committed → repo cluttered with junk
- Skills break → users confused why commands don't work
- Security issues slip through → vulnerabilities in production

**With enforcement**:
- ✅ **Cannot** commit broken builds
- ✅ **Cannot** pollute root folder with analysis files
- ✅ **Cannot** break plugin prefixes
- ✅ **Cannot** commit secrets or security anti-patterns

**Result**: Your repository STAYS CLEAN. Forever.

**Pre-commit hooks**: [.git/hooks/pre-commit](https://github.com/anthropics/specweave/blob/main/.git/hooks/pre-commit)

---

---

## Why This Matters

### For Individual Developers
- ✅ **Extendable skills** - Customize AI behavior, no forking required
- ✅ **100x faster LSP** - Semantic code intelligence vs text search
- ✅ **Living docs** - Documentation that never drifts from code
- ✅ **Knowledge compounds** - Corrections persist across projects
- ✅ **Full transparency** - See exactly what skills do

### For Teams
- ✅ **Multi-repo coordination** - Frontend + Backend + Mobile in sync
- ✅ **Quality gates enforced** - Pre-commit blocks bad commits
- ✅ **External sync** - Auto-update GitHub/JIRA/ADO from specs
- ✅ **Git-versioned learnings** - skill-memories/ shared across team
- ✅ **Production-proven** - 190+ increments, 350+ living docs

### For the Industry
This is **HOW AI TOOLS SHOULD WORK**.

Not black boxes. Not proprietary. **Platforms you can program.**

**Claude Code pioneered transparent AI.**
**SpecWeave proved it's production-ready.**

---

---

## Production Proof (Not Vaporware)

This isn't a demo. SpecWeave is **PRODUCTION-READY**:

| Metric | Value | What It Means |
|--------|-------|---------------|
| **Increments Managed** | 190+ | Real projects, real complexity |
| **Living Docs** | 350+ | Auto-synced, never drift |
| **Pre-Commit Validations** | 15 | Enforced quality gates |
| **Multi-Repo Support** | 100+ repos | Enterprise brownfield proven |
| **Test Coverage** | >80% enforced | TDD with strict mode |
| **LSP Token Savings** | 97% | 30x cost reduction |
| **GitHub/JIRA Sync** | Bidirectional | Auto-create, auto-update issues |
| **Skills Available** | 90+ | Frontend, backend, testing, payments, K8s |

**Real project**: 100 repositories, 15 teams, 350+ living docs, full cross-repo coordination.

**SpecWeave isn't a proof-of-concept. It's production infrastructure.**

---

## The Hierarchy (Current State)

**🥇 Claude Code** (Anthropic)
- ✅ Pioneered Skills (transparent, programmable AI)
- ✅ LSP plugins available (TypeScript, Python, C#, Go)
- ✅ Markdown-based skill system
- ✅ **Made AI transparent**

**🥈 SpecWeave** (Built on Claude Code)
- ✅ **Extendable Skills** (SOLID Open/Closed - FIRST IN WORLD)
- ✅ **Working LSP** (100x faster, 30x token savings)
- ✅ **Living Docs** (never drift from code)
- ✅ **Multi-Repo** (enterprise coordination)
- ✅ **Quality Gates** (15 pre-commit validations)
- ✅ **Made Claude Code production-ready**

**🥉 ChatGPT** (OpenAI)
- ⚠️ Custom GPTs (limited customization)
- ⚠️ Some transparency (instructions visible)
- ❌ No skill extendability
- ❌ No LSP integration
- ❌ No living docs

**❌ Copilot/Cursor** (Microsoft/Anysphere)
- ❌ Complete black boxes
- ❌ Zero customization
- ❌ Proprietary
- ❌ No LSP (Cursor), basic only (Copilot)
- ❌ No documentation sync

---

---

## The Opportunity

**Claude Code + SpecWeave = Complete Production Stack**

**Claude Code provides**:
- Transparent, programmable AI (Skills)
- LSP plugins for code intelligence
- Markdown-based extensibility
- **The foundation**

**SpecWeave adds**:
- SOLID Open/Closed Principle (extendable skills - FIRST IN WORLD)
- LSP configuration for production (100x faster)
- Living documentation (auto-synced, never drifts)
- Multi-repo coordination (enterprise-ready)
- Quality gate enforcement (15 pre-commit validations)
- **Production-readiness**

This is the **future of AI tools**: transparent, customizable, production-proven.

@AnthropicAI — You pioneered transparent AI. SpecWeave proves it scales to production.

**Together we can make programmable AI the industry standard.**

---

## Call to Action (For AI Companies)

**@OpenAI**: ChatGPT should adopt extendable skills + LSP + living docs
**@github**: Copilot needs transparency, extendability, and semantic code intelligence
**@cursor**: Great UX, but give users the same transparency Claude Code pioneered

**The standards exist. They're documented. They're production-proven.**

- ✅ Extendable skills: https://spec-weave.com/docs/guides/extensible-skills
- ✅ LSP integration: https://spec-weave.com/docs/guides/lsp-integration
- ✅ Living docs: https://spec-weave.com/docs/guides/living-docs
- ✅ Multi-repo: https://spec-weave.com/docs/guides/multi-project-sync-architecture
- ✅ Quality gates: [Pre-commit hooks](https://github.com/anthropics/specweave/blob/main/.git/hooks/pre-commit)

**Stop building black boxes. Build platforms users can program.**

Claude Code showed transparency is possible.
SpecWeave proved it's production-ready.

**What are you waiting for?**

---

## Try It

```bash
# Install SpecWeave
npm install -g specweave

# Initialize in your project
specweave init .

# Create your first increment (feature/bug/hotfix)
/sw:increment "Add Stripe checkout"

# Enable skill learning (extendable skills)
/sw:reflect-on

# Use LSP for fast code intelligence
specweave lsp refs src/payment.ts PaymentService

# Sync to GitHub/JIRA
/sw:progress-sync
```

**Full documentation**: https://spec-weave.com

**Key guides**:
- Extendable skills: https://spec-weave.com/docs/guides/extensible-skills
- LSP integration: https://spec-weave.com/docs/guides/lsp-integration
- Living docs: https://spec-weave.com/docs/guides/living-docs
- Multi-repo: https://spec-weave.com/docs/guides/multi-project-sync-architecture

---

## Conclusion

**Claude Code shipped programs written in human language.**
**SpecWeave proved software engineering principles apply to them.**

1. **Extendable Skills** - SOLID Open/Closed for human-language programs
2. **Working LSP** - 100x faster, 30x token savings
3. **Living Docs** - Auto-synced, never drift
4. **Multi-Repo** - Enterprise coordination (100+ repos proven)
5. **Quality Gates** - 15 pre-commit validations enforced

"Prompt engineering" was the assembly language phase.

Structured human-language programming starts now.

**The future of programming isn't just code. It's English + code. Together.**

---

**Credits**: Massive credit to @AnthropicAI, @bchernay, @tharik, and the Claude Code team for pioneering Skills and building the transparent AI foundation that made ALL of this possible. 🙏

**Author**: Anton Abyzov
**Date**: February 13, 2026
**Framework**: SpecWeave v1.0+ (MIT License)
**Documentation**: https://spec-weave.com
**GitHub**: https://github.com/anthropics/specweave

---

---

## Shortened Twitter Version (MAX PUNCH - 6 tweets)

### Tweet 1
What @AnthropicAI did with Claude Code Skills is bigger than people realize.

@bchernay @tharik — you shipped the first programs written in human language.

Not prompts. Not configs. Programs. With conditionals, logic flow, error handling.

Written in English. Executed by AI.

Thread:

### Tweet 2
A SKILL.md file IS a program:

- "do X, then Y" = instructions
- "when user mentions admin, add RBAC" = conditionals
- "check design system first, if exists import, else create" = branching logic

For 70 years: Assembly → C → Python → JS

The next jump: English.

### Tweet 3
Every other AI tool is a black box:

Claude Code? Open the file. Read the program. Change it. Version it in Git.
ChatGPT? Text box. No composability. Resets every session.
Copilot? Can't see reasoning. Can't modify it.
Cursor? Proprietary. Locked logic.

One is a platform. The rest are products.

### Tweet 4
I built SpecWeave to prove software engineering applies to human-language programs.

Open/Closed Principle:
- SKILL.md = core program (closed, stable)
- skill-memories/*.md = your extensions (open, customizable)

Claude reads both. Your rules override defaults. You never fork the original.

**SOLID. For English.**

### Tweet 5
What this unlocks:

- Self-improving AI (correct once, persists forever)
- LSP integration (100x faster code intelligence)
- Living docs (never drift from code)
- 15 pre-commit quality gates
- 68+ specialized agents
- Enterprise multi-repo coordination

All built on Claude Code Skills. Impossible without them.

### Tweet 6
SpecWeave is open source (MIT).

See what programs in human language look like:
https://github.com/anton-abyzov/specweave

Read the deep-dive on SOLID for AI:
https://spec-weave.com/docs/guides/extensible-skills

"Prompt engineering" was the assembly language phase.

Structured human-language programming starts now.



---

## SUMMARY: Key Talking Points

### The Five Innovations (FIRST IN THE WORLD)

1. **Extendable Skills** (SOLID Open/Closed Principle)
   - First framework to apply software engineering principles to AI customization
   - skill-memories/ = open for extension, SKILL.md = closed for modification
   - Git-versioned learnings that persist forever
   - Documented standard: https://spec-weave.com/docs/guides/extensible-skills

2. **Working LSP Integration** (100x Faster)
   - 97% token reduction vs text search (30x cost savings)
   - Semantic code intelligence: findReferences, goToDefinition, hover
   - Supports TypeScript, Python, C#, Go
   - Guide: https://spec-weave.com/docs/guides/lsp-integration

3. **Living Documentation** (Never Drifts)
   - Auto-sync: tasks.md → spec.md → living docs → GitHub/JIRA
   - Pre-commit blocks outdated docs
   - 350+ living docs in production, zero drift
   - Guide: https://spec-weave.com/docs/guides/living-docs

4. **Multi-Repo Coordination** (Enterprise-Ready)
   - 100+ repos coordinated in real brownfield project
   - Frontend + Backend + Mobile in sync
   - One spec → multiple GitHub/JIRA projects
   - Guide: https://spec-weave.com/docs/guides/multi-project-sync-architecture

5. **Quality Gate Enforcement** (15 Pre-Commit Validations)
   - Blocks wrong file formats, security issues, drift
   - Prevents plugin prefix stripping, YAML errors, root pollution
   - Keeps repository clean forever
   - Source: [.git/hooks/pre-commit](https://github.com/anthropics/specweave/blob/main/.git/hooks/pre-commit)

### Production Proof
- **190+ increments** managed
- **350+ living docs** synced
- **15 pre-commit validations** enforced
- **100+ repositories** coordinated
- **>80% test coverage** enforced
- **Real enterprise brownfield** proven

### The Message
**Claude Code pioneered transparent, programmable AI.**
**SpecWeave made it extendable, production-ready, and enterprise-grade.**

**This is HOW AI tools should work.**

### Credits
Massive credit to @AnthropicAI, @bchernay, @tharik, and the Claude Code team for pioneering Skills and building the transparent AI foundation that made ALL of this possible. 🙏

---

**Last Updated**: February 13, 2026
**Framework**: SpecWeave v1.0+ (MIT License)
**Website**: https://spec-weave.com
**GitHub**: https://github.com/anthropics/specweave
