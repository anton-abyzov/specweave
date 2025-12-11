# Internal Docs Enhancement Analysis

**Generated**: 2025-12-07
**Context**: Analysis of how repo/import data can auto-populate internal docs folders

## Executive Summary

The living-docs-builder collects rich data during repo analysis that could populate **operations/**, **delivery/**, **governance/**, and **strategy/** folders - not just organization/ and modules/.

## Information Flow Opportunities

### 1. Operations Folder Enhancement

| Data Source | Extract | Output File |
|-------------|---------|-------------|
| Error handling patterns (`try/catch`, error types) | Error categories, retry logic | `operations/error-handling-patterns.md` |
| Logging calls (winston, pino, console) | Log levels, what's logged | `operations/logging-guide.md` |
| Health check endpoints | Available health checks | `operations/health-checks.md` |
| Environment variables (`.env.example`) | Required config | `operations/configuration-reference.md` |
| ADO/JIRA incident-tagged issues | P0/P1 bug patterns | `operations/incident-patterns.md` |
| Circuit breaker patterns | Fault tolerance | `operations/resilience-patterns.md` |

**Implementation Approach:**
- Add pattern detection in `module-analyzer.ts` for error/logging/health patterns
- Output to `operations/` folder alongside modules/

### 2. Delivery Folder Enhancement

| Data Source | Extract | Output File |
|-------------|---------|-------------|
| Git commit history | Commit frequency by author | `delivery/metrics/commit-patterns.md` |
| Git tags/releases | Version timeline | `delivery/release-history.md` |
| CI config (`.github/workflows/`, `azure-pipelines.yml`) | Pipeline stages | `delivery/ci-cd-overview.md` |
| Package.json scripts | Build/test commands | `delivery/npm-scripts-reference.md` |
| Completed SpecWeave increments | Feature timeline | `delivery/feature-timeline.md` |
| PR templates | Review process | `delivery/pr-guidelines.md` |

**Implementation Approach:**
- Parse CI configs during discovery phase
- Aggregate completed increment metadata for timeline
- Add git analysis for DORA-style metrics

### 3. Governance Folder Enhancement (MULTI-TECHNOLOGY!)

**CRITICAL**: Enterprise projects often have multiple technology stacks (backend: Node.js + Python + Go; frontend: React + Angular). The governance folder MUST document ALL detected coding standards across ALL technologies.

#### Technology-Specific Config Files to Parse

| Technology | Config Files | Extract | Output |
|------------|--------------|---------|--------|
| **TypeScript/JS** | `.eslintrc.*`, `.prettierrc`, `tsconfig.json` | Rules, strictness | `governance/standards/typescript.md` |
| **Python** | `.pylintrc`, `pyproject.toml`, `setup.cfg`, `.flake8`, `ruff.toml` | PEP8 compliance, linting rules | `governance/standards/python.md` |
| **Go** | `go.mod`, `.golangci.yml`, `staticcheck.conf` | Module versions, lint rules | `governance/standards/golang.md` |
| **Java** | `checkstyle.xml`, `pmd.xml`, `spotbugs.xml`, `.editorconfig` | Code style, static analysis | `governance/standards/java.md` |
| **C#/.NET** | `.editorconfig`, `StyleCop.json`, `Directory.Build.props` | Analyzer rules, formatting | `governance/standards/dotnet.md` |
| **Rust** | `rustfmt.toml`, `clippy.toml`, `Cargo.toml` | Formatting, lints | `governance/standards/rust.md` |
| **React/Frontend** | `eslint-config-*`, `stylelint.*`, `.browserslistrc`, `babel.config.*` | JSX rules, CSS linting | `governance/standards/react.md` |
| **Angular** | `angular.json`, `tslint.json` (legacy), `.eslintrc` | Angular-specific rules | `governance/standards/angular.md` |
| **Vue** | `.eslintrc.*` with `plugin:vue/*`, `vite.config.*` | Vue-specific rules | `governance/standards/vue.md` |
| **General** | `.editorconfig`, `.gitattributes`, `.gitignore` | Cross-language formatting | `governance/shared-conventions.md` |

#### Detection Strategy (Multi-Technology)

```
Repo Discovery Phase:
├── Detect package.json → TypeScript/JavaScript ecosystem
├── Detect requirements.txt / pyproject.toml → Python ecosystem
├── Detect go.mod → Go ecosystem
├── Detect pom.xml / build.gradle → Java/Kotlin ecosystem
├── Detect *.csproj / *.sln → .NET ecosystem
├── Detect Cargo.toml → Rust ecosystem
└── For each detected ecosystem:
    ├── Find config files (lint, format, test)
    ├── Parse and extract rules
    ├── Detect implicit patterns via static analysis
    └── Generate technology-specific standards doc
```

#### Governance Folder Structure (Enhanced)

```
.specweave/docs/internal/governance/
├── coding-standards.md          # Summary of ALL technologies
├── shared-conventions.md        # Cross-language (EditorConfig, Git)
├── standards/                   # Per-technology standards
│   ├── typescript.md            # TypeScript/JavaScript
│   ├── python.md                # Python (PEP8, Black, Ruff)
│   ├── golang.md                # Go (gofmt, golangci-lint)
│   ├── java.md                  # Java (Checkstyle, PMD)
│   ├── dotnet.md                # C#/.NET (StyleCop, Roslyn)
│   ├── rust.md                  # Rust (rustfmt, Clippy)
│   ├── react.md                 # React-specific
│   ├── angular.md               # Angular-specific
│   └── vue.md                   # Vue-specific
├── security-patterns.md         # Cross-language security
└── git-hooks.md                 # Pre-commit, Husky, etc.
```

#### Python Standards Detection

| Config File | Rules to Extract |
|-------------|------------------|
| `pyproject.toml` | `[tool.black]`, `[tool.ruff]`, `[tool.pylint]`, `[tool.mypy]` |
| `.pylintrc` | Max line length, naming conventions, disabled warnings |
| `setup.cfg` | `[flake8]`, `[mypy]`, `[isort]` sections |
| `.flake8` | Error codes to ignore, max complexity |
| `ruff.toml` | Rules selected, line length, target Python version |
| `mypy.ini` | Type checking strictness, plugins |

**Example Python Standards Output:**
```markdown
# Python Coding Standards

**Detected**: Python 3.11+ (from pyproject.toml)
**Formatter**: Black (line-length=88)
**Linter**: Ruff (rules: E, F, W, I, N, UP, B)
**Type Checker**: MyPy (strict=true)

## Naming Conventions
- Variables: snake_case (PEP8 compliant)
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Modules: snake_case

## Import Ordering (isort)
1. Standard library
2. Third-party
3. Local modules

## Type Hints
- Required for public functions
- MyPy strict mode enabled
```

#### Go Standards Detection

| Config File | Rules to Extract |
|-------------|------------------|
| `go.mod` | Go version, module path |
| `.golangci.yml` | Enabled linters, excluded patterns |
| `staticcheck.conf` | Checks to disable |
| `Makefile` | Build/lint/test commands |

**Example Go Standards Output:**
```markdown
# Go Coding Standards

**Go Version**: 1.21+ (from go.mod)
**Formatter**: gofmt (standard)
**Linter**: golangci-lint (enabled: errcheck, gosimple, govet, staticcheck)

## Package Naming
- Short, lowercase, no underscores
- Single-word preferred

## Error Handling
- Always check errors (errcheck enabled)
- Wrap errors with fmt.Errorf("%w", err)

## Code Organization
- One package per directory
- Internal packages for private code
```

#### Frontend (React/Angular/Vue) Detection

| Framework | Detection | Config Files |
|-----------|-----------|--------------|
| React | `package.json` has `react` | `.eslintrc` with `plugin:react/*`, `next.config.js` |
| Angular | `angular.json` exists | `angular.json`, `tslint.json`/`.eslintrc` |
| Vue | `package.json` has `vue` | `.eslintrc` with `plugin:vue/*`, `vite.config.*` |

**Frontend-Specific Patterns to Detect:**
- Component naming (PascalCase vs kebab-case)
- State management patterns (Redux, Zustand, Pinia, NgRx)
- CSS methodology (CSS Modules, Tailwind, styled-components, SCSS)
- Testing framework (Jest, Vitest, Testing Library, Cypress, Playwright)
- File structure (feature-based, type-based, atomic design)

**Implementation Approach (Enhanced):**
1. **Discovery**: Detect ALL technology ecosystems in codebase
2. **Config Parsing**: For each ecosystem, find and parse config files
3. **Implicit Detection**: Run static analysis to detect naming patterns
4. **Output Generation**: Create technology-specific standards docs
5. **Summary**: Generate unified `coding-standards.md` referencing all
6. **Use existing `code-standards-detective` agent** as foundation
7. **Extend agent to support Python/Go/Java detection patterns**

### 4. Strategy Folder Enhancement

| Data Source | Extract | Output File |
|-------------|---------|-------------|
| ADO/JIRA Epics | High-level initiatives | `strategy/initiatives/` |
| Increment "Problem Statement" sections | Feature rationale | `strategy/feature-rationale.md` |
| Imported PRD documents | Business requirements | `strategy/imported-prds/` |
| README "Why" sections | Project purpose | `strategy/project-purpose.md` |

**Implementation Approach:**
- Extract problem statements from spec.md files
- Import epic descriptions from ADO/JIRA
- Parse README for business context

## Recommended Implementation Order

### Phase 1: Config-Based Documentation (Low LLM cost)
1. Parse ESLint/Prettier/TSConfig → governance/
2. Parse CI configs → delivery/
3. Parse package.json scripts → delivery/

### Phase 2: Pattern-Based Documentation (Existing analysis)
4. Error handling patterns → operations/
5. Naming conventions → governance/
6. Security patterns → governance/

### Phase 3: External Tool Integration (Requires API calls)
7. ADO/JIRA epic summaries → strategy/
8. Incident patterns → operations/
9. Release timeline from tags → delivery/

## Architecture Consideration

### Current Flow:
```
Repo Discovery → Deep Analysis → Organization Synthesis → Output
                      ↓
               [modules/ only]
```

### Enhanced Flow:
```
Repo Discovery → Deep Analysis → Multi-Output Synthesis
                      ↓                    ↓
               [modules/]           [operations/]
                                    [delivery/]
                                    [governance/]
```

### Key Files to Modify:

| File | Change |
|------|--------|
| `living-docs-builder.ts` | Add output phase for each folder |
| `module-analyzer.ts` | Extract operational patterns |
| `architecture-generator.ts` | Already enhanced in 0121 |
| `organization-synthesizer.ts` | Already enhanced in 0121 |
| NEW: `governance-generator.ts` | Parse lint/format configs |
| NEW: `delivery-generator.ts` | Parse CI, generate timeline |
| NEW: `operations-generator.ts` | Generate runbook stubs |

## Scope for Future Increment

### Option A: 0122-multi-technology-governance (FOCUSED - Recommended)

**Focus**: Comprehensive multi-technology coding standards detection for governance folder.

**User Stories:**
- **US-001**: Multi-ecosystem detection (detect Python, Go, Java, Rust, .NET alongside TypeScript)
- **US-002**: Backend standards generation (TypeScript, Python, Go config parsing)
- **US-003**: Frontend standards generation (React, Angular, Vue config parsing)
- **US-004**: Unified standards summary (cross-technology `coding-standards.md`)

**Tasks (~6-8):**
1. T-001: Add ecosystem detector (`detectEcosystems()` → returns list of detected tech stacks)
2. T-002: Create Python config parser (`pyproject.toml`, `.pylintrc`, `ruff.toml`)
3. T-003: Create Go config parser (`go.mod`, `.golangci.yml`)
4. T-004: Create Java/Kotlin config parser (`checkstyle.xml`, `pmd.xml`)
5. T-005: Create frontend framework detector (React vs Angular vs Vue)
6. T-006: Generate technology-specific standards files (`governance/standards/*.md`)
7. T-007: Generate unified summary (`governance/coding-standards.md`)
8. T-008: Update `code-standards-detective` agent to invoke multi-tech analysis

**Files to Create:**
- `src/core/living-docs/governance/ecosystem-detector.ts`
- `src/core/living-docs/governance/python-standards-parser.ts`
- `src/core/living-docs/governance/go-standards-parser.ts`
- `src/core/living-docs/governance/java-standards-parser.ts`
- `src/core/living-docs/governance/frontend-standards-parser.ts`
- `src/core/living-docs/governance/standards-generator.ts`

**Benefits:**
- Most valuable for enterprise multi-stack projects
- Standalone value without other folder enhancements
- Builds on existing `code-standards-detective` foundation
- Each technology parser is isolated (testable)

---

### Option B: 0122-multi-folder-living-docs (BROADER)

**Focus**: Populate ALL internal docs folders (governance + operations + delivery + strategy).

**User Stories:**
- US-001: Config-based governance docs (ESLint, Prettier, TSConfig + multi-tech)
- US-002: CI/CD-based delivery docs (pipeline overview)
- US-003: Pattern-based operations docs (error handling, health checks)
- US-004: Timeline-based delivery docs (release history, feature timeline)

**Task count**: ~6-8 tasks (within limit)

**Trade-off**: Broader but shallower coverage of multi-technology standards.

---

### Recommendation: Option A First

**Rationale:**
1. Multi-technology governance is the most immediately valuable
2. Enterprise customers with Python/Go/Java backends need this ASAP
3. Operations/delivery/strategy can follow in 0123
4. Focused scope = higher quality output

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too much auto-generated content | Medium | Provide "stubs" users can enhance |
| Stale documentation | Medium | Include generation timestamp, re-run flag |
| Config format variations | Low | Handle common formats, skip unknown |
| Overwhelming first-time output | Medium | Progressive disclosure, minimal by default |

## Success Metrics

- Governance folder has detected conventions (not empty)
- Delivery folder has CI overview (if CI config exists)
- Operations folder has error pattern summary
- 80% of auto-generated content is "useful enough to keep"
