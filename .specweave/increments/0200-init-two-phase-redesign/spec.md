# 0200: Redesign Init Flow — Streamlined Auto-Detection

## Problem

The current `specweave init` is a ~770-line god function that asks 15-40 questions in a rigid linear sequence. Advanced config (deep interview, quality gates, LSP) is mixed with essential setup. The flow is so long that users abandon it before completing.

**Current pain points:**
- Too many questions for simple cases (15+ for a typical GitHub project)
- Greenfield/brownfield asked as jargon question instead of auto-detected
- Mono/multi-repo asked upfront as taxonomy instead of emerging from repo setup
- Advanced config (deep interview, quality gates, LSP, git hooks) asked one by one
- Repo hosting and issue tracker are separate flows but often the same system (GitHub, ADO)
- Placeholder repos (empty, just `npm init`) falsely detected as brownfield
- `initCommand()` spans ~770 lines — untestable god function

## Solution

Auto-detect everything possible, ask only essential questions (provider + tracker + credentials), auto-provision advanced features, display summary banner at the end.

### Init Flow

```
1. Language selection                               ← 1 question
2. Git provider auto-detect from .git/config        ← 0-1 questions (confirm if detected)
3. Credentials auto-detect (gh auth → .env → ask)   ← 0-1 questions
4. Multi-repo: "Add more repos from {org}?"         ← 0-1 questions (only if org detected)
   └─ If yes: repo selection                        ← 1 question
5. Issue tracker (auto-suggest from provider)        ← 1 question (confirm)
   └─ If different system (e.g. Jira): credentials  ← 1-3 questions
6. Brownfield auto-detect (scoring heuristic)        ← 0 questions
7. Apply smart defaults + display summary banner     ← 0 questions
```

### Auto-Detection

| Signal | Source | Action |
|--------|--------|--------|
| Git provider | `.git/config` remote URL | Auto-select, confirm |
| Credentials | `gh auth token` → `.env` → env vars | Skip prompt if found |
| Multi-repo | Org detected in remote | Ask "add more repos?" (not upfront taxonomy) |
| Issue tracker | Same as git provider | Auto-suggest, confirm |
| Brownfield | Scoring heuristic (see below) | Mention living docs in summary |

### Brownfield Detection Heuristic

**Default assumption: brownfield.** Most users adopting SpecWeave have existing code.
Only classify as greenfield when we're **sure** the repo is empty/placeholder.

Checking emptiness is fast — just scan for source files. No source files = greenfield.

**Greenfield = TRUE only when ALL of these hold:**
- Zero source files found (*.ts, *.js, *.py, *.java, *.go, *.rs, *.cs, *.rb — excluding node_modules, .git, dist, build)
- No real dependencies (package.json with 0 deps, or no package manager file at all)
- Only boilerplate files present (README, LICENSE, .gitignore, empty configs)

**Brownfield = default** whenever any source files or real dependencies exist.

**Multi-repo:** Quick scan after cloning completes. If **any** repo has source files → brownfield. Only if **all** repos are empty → greenfield. Empty repo detection is fast, so this doesn't slow init down.

### N:1 Issue Tracker Mapping

| Provider | Single Repo | Multi-Repo | Init Behavior |
|----------|-------------|------------|---------------|
| **GitHub** | 1:1 per repo (natural) | 1:1 per repo (auto-create profiles) | No mapping question |
| **Jira** | Pick project (1 question) | Pick ONE default project for all repos (N:1) | "Which Jira project?" |
| **ADO** | Reuse from repo setup | Reuse ADO projects from repo setup (already selected) | 0-1 questions |

**Why N:1 default for Jira/ADO multi-repo:** Most teams use a single Jira/ADO project for related repos. Per-repo mapping is an advanced config that can be done post-init via `specweave config sync`.

### Smart Defaults (no questions asked)

| Feature | Default | Customize later |
|---------|---------|-----------------|
| Testing | TDD | `specweave config testing` |
| Quality gates | Standard | `specweave config quality` |
| Deep interview | Off | `specweave config interview` |
| Translation | Based on language choice | `specweave config translation` |
| LSP | Auto-enabled (Claude) | `specweave config lsp` |
| Git hooks | Auto-installed | `specweave config hooks` |

### Summary Banner (displayed at end of init)

```
✅ SpecWeave initialized for {project-name}!

  Provider:  GitHub (github.com/{org}/{repo})
  Tracker:   GitHub Issues
  Repos:     1 (single repo)

  Enabled by default:
    • TDD mode (testing)
    • Standard quality gates
    • LSP code intelligence
    • Git pre-commit hooks

  Customize anytime: specweave config <section>
  {if brownfield}: Existing code detected → run /sw:living-docs to generate documentation
  {if multi-repo}: After repos are cloned → run /sw:living-docs to scan for existing code
```

### Realistic Question Counts

| Scenario | Questions | What's asked |
|----------|-----------|-------------|
| GitHub single repo (`gh auth` exists) | **2** | Language, confirm tracker |
| GitHub single repo (no `gh auth`) | **3** | Language, PAT, confirm tracker |
| GitHub multi-repo | **4-5** | + "add repos?", repo selection |
| GitHub + Jira (single repo) | **6** | Language, confirm provider, Jira domain/email/token, project |
| Multi-repo + Jira | **7** | + "add repos?", repo selection |
| ADO single repo | **4** | Language, org, PAT, confirm tracker |
| ADO multi-repo | **5-6** | + project selection, repo selection |

Down from 15-20 in the current flow. Worst case (multi-repo + different tracker) stays under 8.

### Re-Init Behavior

When `.specweave/` already exists:
1. "SpecWeave already initialized. Reconfigure?" [Y/n]
2. If yes → run streamlined flow, preserve existing config values as defaults
3. If no → exit

## User Stories

### US-001: Minimal Questions Init
As a user running `specweave init`, I want to answer only essential questions (provider, tracker, credentials) so I can start working in under 2 minutes.

**Acceptance Criteria**:
- [x] AC-US1-01: Git provider auto-detected from .git/config remote URL (GitHub, ADO, Bitbucket)
- [x] AC-US1-02: Credentials auto-detected from gh auth → .env → env vars before prompting
- [x] AC-US1-03: Issue tracker auto-suggested based on git provider (GitHub → GitHub Issues)
- [x] AC-US1-04: Multi-repo emerges from "add more repos from {org}?" prompt when org detected
- [x] AC-US1-05: Single-repo GitHub with existing gh auth completes in ≤2 interactive questions
- [x] AC-US1-06: No explicit greenfield/brownfield question asked
- [x] AC-US1-07: No explicit mono/multi-repo taxonomy question asked
- [x] AC-US1-08: Re-init preserves existing config values as defaults when .specweave/ exists

### US-002: Brownfield Auto-Detection
As a user with existing code, I want init to detect my project maturity automatically so placeholder repos aren't misidentified as brownfield projects.

**Acceptance Criteria**:
- [x] AC-US2-01: Default assumption is brownfield; only greenfield when repo is provably empty
- [x] AC-US2-02: Empty/placeholder repos (no source files, 0 deps) correctly identified as greenfield
- [x] AC-US2-03: Any repo with source files or real dependencies defaults to brownfield
- [x] AC-US2-04: Brownfield status shown in summary banner with `/sw:living-docs` suggestion
- [x] AC-US2-05: Multi-repo: any repo with code → brownfield; all empty → greenfield (fast scan after cloning)

### US-003: Smart Defaults with Summary Banner
As a user, I want advanced features auto-provisioned with a summary showing what was enabled, so I know what's configured without answering questions about each one.

**Acceptance Criteria**:
- [x] AC-US3-01: Testing defaults to TDD without prompting
- [x] AC-US3-02: Quality gates default to "standard" without prompting
- [x] AC-US3-03: Deep interview defaults to off without prompting
- [x] AC-US3-04: LSP auto-enabled for Claude without prompting
- [x] AC-US3-05: Git hooks auto-installed without prompting
- [x] AC-US3-06: Summary banner displayed after init listing all auto-provisioned features
- [x] AC-US3-07: Summary includes customization instructions (`specweave config <section>`)

### US-004: Break Up the God Function
As a maintainer, I want `initCommand()` split into composable, testable functions so the init flow is maintainable.

**Acceptance Criteria**:
- [x] AC-US4-01: Provider detection is a standalone testable function
- [x] AC-US4-02: Credential detection is a standalone testable function
- [x] AC-US4-03: Brownfield detection is a standalone testable function
- [x] AC-US4-04: Smart defaults application is a standalone function
- [x] AC-US4-05: No single function exceeds 200 lines
- [x] AC-US4-06: Each function is independently testable

## Out of Scope
- `specweave config` interactive subcommand (separate increment — users can edit config.json directly)
- Parent/umbrella repo concept
- Board mapping / area path configuration during init
- Per-repo Jira/ADO project mapping during init (N:1 default, refine later via config)
