# 0200: Redesign Init Flow — Two-Phase Project Topology

## Problem

The current `specweave init` is a 1,292-line god function that asks 15-40 questions in a rigid linear sequence. The most fundamental decisions — what kind of project is this? — are never explicitly asked. Instead, topology is discovered piecemeal across scattered steps (repo hosting detects multi-repo, living docs detects brownfield, etc.).

**Current pain points:**
- Too many questions for simple cases (15+ for a typical GitHub project)
- No project topology awareness upfront (greenfield/brownfield, mono/multi-repo)
- Advanced config (deep interview, quality gates, LSP) mixed with essential setup
- Repo hosting and issue tracker are separate flows but often the same system (GitHub, ADO)
- Linear flow — every user walks through every step regardless of context
- `initCommand()` spans ~770 lines — untestable god function

## Solution

Split init into two clear phases driven by project topology, with smart defaults for everything else.

### Phase 1: Project Identity (3 core questions)
1. **Language** — needed for all subsequent translations
2. **Greenfield or Brownfield?** — determines downstream flow
3. **Single-repo or Multi-repo?** — determines hosting/structure complexity

### Phase 2: Platform Setup (derived from Phase 1)
Show only questions relevant to the topology:

| Topology | Questions | Skipped |
|----------|-----------|---------|
| Greenfield + Single | Git provider, issue tracker (~2) | Living docs, external import |
| Greenfield + Multi | Git provider, credentials, repo selection, issue tracker (~5) | Living docs, external import |
| Brownfield + Single | Git provider, issue tracker, "Run Living Docs?" (~3) | External import (auto) |
| Brownfield + Multi | Git provider, credentials, repo selection, issue tracker, living docs (~6) | — |

### Smart Defaults (no questions, configure later)
| Feature | Default | Customize |
|---------|---------|-----------|
| Testing | TDD | `specweave config testing` |
| Quality gates | Standard | `specweave config quality` |
| Deep interview | Off | `specweave config interview` |
| Translation | Based on language choice | `specweave config translation` |
| LSP | Auto-enabled for Claude | `specweave config lsp` |
| Git hooks | Auto-installed | `specweave config hooks` |

**Result**: Typical init drops from 15-20 questions to 5-7.

## User Stories

### US-001: Phase 1 — Project Identity
As a user running `specweave init`, I want to answer 3 core questions (language, greenfield/brownfield, mono/multi-repo) so the wizard adapts to my project topology.

**Acceptance Criteria**:
- [ ] AC-US1-01: Init asks greenfield vs brownfield as explicit first-class question
- [ ] AC-US1-02: Init asks single-repo vs multi-repo as explicit first-class question
- [ ] AC-US1-03: Answers are stored in config.json (`project.topology` field)
- [ ] AC-US1-04: Phase 1 completes in 3 questions max (language + topology)

### US-002: Phase 2 — Topology-Driven Platform Setup
As a user, I want the platform setup questions to adapt based on my Phase 1 answers so I only see relevant questions.

**Acceptance Criteria**:
- [ ] AC-US2-01: Greenfield projects skip living docs and external import steps
- [ ] AC-US2-02: Single-repo projects skip repo selection/cloning steps
- [ ] AC-US2-03: Multi-repo projects get unified provider + repo selection flow
- [ ] AC-US2-04: Issue tracker defaults to git provider when possible (GitHub → GitHub Issues)

### US-003: Smart Defaults for Advanced Config
As a user, I want testing, quality gates, deep interview, and LSP to use sensible defaults without asking, with the ability to customize later.

**Acceptance Criteria**:
- [ ] AC-US3-01: Testing defaults to TDD without prompting
- [ ] AC-US3-02: Quality gates default to "standard" without prompting
- [ ] AC-US3-03: Deep interview defaults to off without prompting
- [ ] AC-US3-04: LSP auto-enabled for Claude without prompting
- [ ] AC-US3-05: Git hooks auto-installed without prompting
- [ ] AC-US3-06: All defaults overridable via `specweave config <section>`

### US-004: Break Up the God Function
As a maintainer, I want `initCommand()` split into composable, testable phase functions so the init flow is maintainable.

**Acceptance Criteria**:
- [ ] AC-US4-01: Phase 1 is a standalone function returning topology config
- [ ] AC-US4-02: Phase 2 is a standalone function accepting topology config
- [ ] AC-US4-03: Smart defaults are applied in a standalone function
- [ ] AC-US4-04: No single function exceeds 200 lines
- [ ] AC-US4-05: Each phase is independently testable
