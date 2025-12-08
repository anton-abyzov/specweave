---
increment: 0122-multi-technology-governance
project: specweave
feature_id: FS-122
title: Multi-Technology Governance Standards Detection
type: feature
priority: P1
status: completed
---

# FS-122: Multi-Technology Governance Standards Detection

## Problem Statement

Enterprise projects often have multiple technology stacks (backend: Node.js + Python + Go; frontend: React + Angular + Vue). The current `code-standards-detective` agent only supports TypeScript/JavaScript, leaving Python, Go, Java, Rust, and frontend framework standards undocumented.

When running living-docs-builder on polyglot codebases, the governance folder only contains TypeScript standards, missing critical standards for other languages that may represent 50%+ of the codebase.

## Goals

- **G1**: Detect ALL technology ecosystems present in a codebase (Python, Go, Java, Rust, .NET, React, Angular, Vue)
- **G2**: Parse technology-specific config files (pyproject.toml, .golangci.yml, checkstyle.xml, etc.)
- **G3**: Generate per-technology standards documents in `governance/standards/`
- **G4**: Create unified summary in `governance/coding-standards.md` referencing all technologies

## Non-Goals

- Implicit pattern detection via static analysis (future enhancement)
- Auto-generating linter configs from detected patterns
- Real-time drift alerts
- AI-powered suggestions from OSS projects

## User Stories

### US-001: Multi-Ecosystem Detection
**As a** tech lead with a polyglot codebase
**I want** SpecWeave to detect all technology ecosystems present
**So that** I know which coding standards documents will be generated

**Acceptance Criteria:**
- [x] **AC-US1-01**: Detect TypeScript/JavaScript via `package.json`
- [x] **AC-US1-02**: Detect Python via `requirements.txt`, `pyproject.toml`, `setup.py`
- [x] **AC-US1-03**: Detect Go via `go.mod`
- [x] **AC-US1-04**: Detect Java/Kotlin via `pom.xml`, `build.gradle`, `build.gradle.kts`
- [x] **AC-US1-05**: Detect C#/.NET via `*.csproj`, `*.sln`
- [x] **AC-US1-06**: Detect Rust via `Cargo.toml`
- [x] **AC-US1-07**: Return list of detected ecosystems with confidence levels

### US-002: Backend Standards Generation
**As a** developer onboarding to a new project
**I want** coding standards documented for each backend technology
**So that** I know the conventions for Python, Go, Java, etc.

**Acceptance Criteria:**
- [x] **AC-US2-01**: Parse Python configs (`pyproject.toml`, `.pylintrc`, `ruff.toml`, `.flake8`, `mypy.ini`)
- [x] **AC-US2-02**: Parse Go configs (`go.mod`, `.golangci.yml`, `staticcheck.conf`)
- [x] **AC-US2-03**: Parse Java configs (`checkstyle.xml`, `pmd.xml`, `spotbugs.xml`)
- [x] **AC-US2-04**: Generate `governance/standards/python.md` with formatter, linter, type checker info
- [x] **AC-US2-05**: Generate `governance/standards/golang.md` with Go version, linter rules
- [x] **AC-US2-06**: Generate `governance/standards/java.md` with style checker rules

### US-003: Frontend Framework Detection
**As a** frontend developer
**I want** coding standards documented for React/Angular/Vue
**So that** I know component naming, state management, and CSS conventions

**Acceptance Criteria:**
- [x] **AC-US3-01**: Detect React via `package.json` dependencies and ESLint `plugin:react/*`
- [x] **AC-US3-02**: Detect Angular via `angular.json`
- [x] **AC-US3-03**: Detect Vue via `package.json` dependencies and ESLint `plugin:vue/*`
- [x] **AC-US3-04**: Generate `governance/standards/react.md` with JSX, hooks, testing conventions
- [x] **AC-US3-05**: Generate `governance/standards/angular.md` with module, component conventions
- [x] **AC-US3-06**: Generate `governance/standards/vue.md` with composition API, SFC conventions

### US-004: Unified Standards Summary
**As an** engineering manager
**I want** a single coding-standards.md that summarizes ALL technologies
**So that** I have one document linking to all technology-specific standards

**Acceptance Criteria:**
- [x] **AC-US4-01**: Generate `governance/coding-standards.md` as entry point
- [x] **AC-US4-02**: Summary includes detected technologies with confidence levels
- [x] **AC-US4-03**: Summary links to each `governance/standards/{tech}.md`
- [x] **AC-US4-04**: Summary includes shared conventions from `.editorconfig`
- [x] **AC-US4-05**: Summary includes generation timestamp and re-run instructions

## Technical Approach

### Ecosystem Detection

**New File**: `src/core/living-docs/governance/ecosystem-detector.ts`

```typescript
export interface DetectedEcosystem {
  name: string;          // e.g., "python", "typescript", "go"
  confidence: 'high' | 'medium' | 'low';
  detectedFrom: string;  // e.g., "pyproject.toml"
  configFiles: string[]; // All config files found for this ecosystem
}

export async function detectEcosystems(projectPath: string): Promise<DetectedEcosystem[]> {
  const ecosystems: DetectedEcosystem[] = [];

  // Python detection
  const pythonMarkers = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
  const pythonFound = await findAny(projectPath, pythonMarkers);
  if (pythonFound) {
    ecosystems.push({
      name: 'python',
      confidence: 'high',
      detectedFrom: pythonFound,
      configFiles: await findAll(projectPath, [
        'pyproject.toml', '.pylintrc', 'setup.cfg', '.flake8', 'ruff.toml', 'mypy.ini'
      ])
    });
  }

  // Similar for Go, Java, Rust, etc.
  return ecosystems;
}
```

### Config Parsers (Per Technology)

**Python Parser**: `src/core/living-docs/governance/python-standards-parser.ts`
- Parse `[tool.black]`, `[tool.ruff]`, `[tool.pylint]` from `pyproject.toml`
- Parse `.pylintrc` for naming conventions
- Parse `mypy.ini` for type checking strictness

**Go Parser**: `src/core/living-docs/governance/go-standards-parser.ts`
- Parse `go.mod` for Go version
- Parse `.golangci.yml` for enabled linters

**Java Parser**: `src/core/living-docs/governance/java-standards-parser.ts`
- Parse `checkstyle.xml` for code style rules
- Parse `pmd.xml` for static analysis rules

**Frontend Parser**: `src/core/living-docs/governance/frontend-standards-parser.ts`
- Detect framework from `package.json` dependencies
- Parse framework-specific ESLint rules

### Standards Generator

**File**: `src/core/living-docs/governance/standards-generator.ts`

```typescript
export async function generateGovernanceDocs(
  projectPath: string,
  ecosystems: DetectedEcosystem[]
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  for (const ecosystem of ecosystems) {
    const parser = getParserForEcosystem(ecosystem.name);
    const standards = await parser.parse(projectPath, ecosystem.configFiles);
    const markdown = generateMarkdown(ecosystem.name, standards);
    files.push({
      path: `governance/standards/${ecosystem.name}.md`,
      content: markdown
    });
  }

  // Generate unified summary
  files.push({
    path: 'governance/coding-standards.md',
    content: generateUnifiedSummary(ecosystems, files)
  });

  return files;
}
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/living-docs/governance/ecosystem-detector.ts` | Detect all technology ecosystems |
| `src/core/living-docs/governance/python-standards-parser.ts` | Parse Python config files |
| `src/core/living-docs/governance/go-standards-parser.ts` | Parse Go config files |
| `src/core/living-docs/governance/java-standards-parser.ts` | Parse Java config files |
| `src/core/living-docs/governance/frontend-standards-parser.ts` | Parse React/Angular/Vue configs |
| `src/core/living-docs/governance/standards-generator.ts` | Generate markdown from parsed standards |
| `src/core/living-docs/governance/index.ts` | Export barrel file |

## Output Structure

```
.specweave/docs/internal/governance/
├── coding-standards.md          # Unified summary of ALL technologies
├── shared-conventions.md        # EditorConfig, Git conventions
└── standards/
    ├── typescript.md            # TypeScript/JavaScript (existing)
    ├── python.md                # Python (NEW)
    ├── golang.md                # Go (NEW)
    ├── java.md                  # Java (NEW)
    ├── react.md                 # React (NEW)
    ├── angular.md               # Angular (NEW)
    └── vue.md                   # Vue (NEW)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Config format variations | Medium | Support common formats, log warnings for unknown |
| Missing config files | Low | Generate minimal standards with "no config found" note |
| Large polyglot codebases | Medium | Process ecosystems in parallel |
| False positive detection | Low | Use confidence levels, require marker files |

## Success Metrics

- Detect 90%+ of technology ecosystems in polyglot projects
- Generate standards docs for each detected ecosystem
- Unified summary links to all technology-specific docs
- code-standards-detective agent invokes multi-tech analysis

## Dependencies

- Existing `code-standards-detective` agent (foundation)
- Existing `coding-standards.md.template` (extend for multi-tech)
- Living docs builder infrastructure
