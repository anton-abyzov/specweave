# Tasks: Multi-Technology Governance Standards Detection

## Overview
- **Increment**: 0122-multi-technology-governance
- **Feature**: FS-122
- **Total Tasks**: 8
- **Estimated Complexity**: Medium

---

## Tasks

### T-001: Create Ecosystem Detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07
**Status**: [x] completed

**Description**: Create `ecosystem-detector.ts` that scans project root for technology markers and returns detected ecosystems with confidence levels.

**Implementation**:
```typescript
// src/core/living-docs/governance/ecosystem-detector.ts

export interface DetectedEcosystem {
  name: 'typescript' | 'python' | 'go' | 'java' | 'dotnet' | 'rust' | 'react' | 'angular' | 'vue';
  confidence: 'high' | 'medium' | 'low';
  detectedFrom: string;
  configFiles: string[];
  version?: string;
}

const ECOSYSTEM_MARKERS: Record<string, { markers: string[]; configFiles: string[] }> = {
  typescript: {
    markers: ['package.json', 'tsconfig.json'],
    configFiles: ['.eslintrc.json', '.eslintrc.js', '.prettierrc', 'tsconfig.json']
  },
  python: {
    markers: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    configFiles: ['pyproject.toml', '.pylintrc', 'setup.cfg', '.flake8', 'ruff.toml', 'mypy.ini']
  },
  go: {
    markers: ['go.mod'],
    configFiles: ['go.mod', '.golangci.yml', 'staticcheck.conf']
  },
  java: {
    markers: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    configFiles: ['checkstyle.xml', 'pmd.xml', 'spotbugs.xml', '.editorconfig']
  },
  dotnet: {
    markers: ['*.csproj', '*.sln'],
    configFiles: ['.editorconfig', 'StyleCop.json', 'Directory.Build.props']
  },
  rust: {
    markers: ['Cargo.toml'],
    configFiles: ['rustfmt.toml', 'clippy.toml', 'Cargo.toml']
  }
};

export async function detectEcosystems(projectPath: string): Promise<DetectedEcosystem[]>;
```

**Files**:
- `src/core/living-docs/governance/ecosystem-detector.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T001-01 | Detect Python from pyproject.toml | Returns python ecosystem |
| T001-02 | Detect Go from go.mod | Returns go ecosystem |
| T001-03 | Detect multiple ecosystems | Returns all detected |
| T001-04 | Empty project returns empty array | Returns [] |

---

### T-002: Create Python Standards Parser
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-04
**Status**: [x] completed

**Description**: Create parser for Python config files (pyproject.toml, .pylintrc, ruff.toml, .flake8, mypy.ini).

**Implementation**:
```typescript
// src/core/living-docs/governance/python-standards-parser.ts

export interface PythonStandards {
  pythonVersion?: string;
  formatter?: { name: string; lineLength?: number; config: Record<string, any> };
  linter?: { name: string; rules: string[]; config: Record<string, any> };
  typeChecker?: { name: string; strict: boolean; config: Record<string, any> };
  importSorter?: { name: string; config: Record<string, any> };
  namingConventions: {
    variables: string;  // snake_case
    classes: string;    // PascalCase
    constants: string;  // UPPER_SNAKE_CASE
  };
}

export async function parsePythonStandards(
  projectPath: string,
  configFiles: string[]
): Promise<PythonStandards>;
```

**Files**:
- `src/core/living-docs/governance/python-standards-parser.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T002-01 | Parse [tool.black] from pyproject.toml | Returns Black formatter config |
| T002-02 | Parse [tool.ruff] from pyproject.toml | Returns Ruff linter config |
| T002-03 | Parse mypy.ini strict mode | Returns strict: true |
| T002-04 | Handle missing config files | Returns defaults with warnings |

---

### T-003: Create Go Standards Parser
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-05
**Status**: [x] completed

**Description**: Create parser for Go config files (go.mod, .golangci.yml).

**Implementation**:
```typescript
// src/core/living-docs/governance/go-standards-parser.ts

export interface GoStandards {
  goVersion: string;
  modulePath: string;
  linter?: {
    name: string;           // golangci-lint
    enabledLinters: string[];  // errcheck, gosimple, govet, staticcheck
    config: Record<string, any>;
  };
  namingConventions: {
    packages: string;       // lowercase, single word
    exported: string;       // PascalCase
    unexported: string;     // camelCase
  };
  errorHandling: {
    alwaysCheck: boolean;   // errcheck enabled
    wrapPattern?: string;   // fmt.Errorf("%w", err)
  };
}

export async function parseGoStandards(
  projectPath: string,
  configFiles: string[]
): Promise<GoStandards>;
```

**Files**:
- `src/core/living-docs/governance/go-standards-parser.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T003-01 | Parse go.mod for version | Returns Go version |
| T003-02 | Parse .golangci.yml linters | Returns enabled linters |
| T003-03 | Handle missing .golangci.yml | Returns defaults |

---

### T-004: Create Java Standards Parser
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-06
**Status**: [x] completed

**Description**: Create parser for Java config files (checkstyle.xml, pmd.xml).

**Implementation**:
```typescript
// src/core/living-docs/governance/java-standards-parser.ts

export interface JavaStandards {
  javaVersion?: string;
  buildTool: 'maven' | 'gradle';
  checkstyle?: {
    enabled: boolean;
    config: string;          // Google, Sun, custom
    rules: string[];
  };
  pmd?: {
    enabled: boolean;
    rulesets: string[];
  };
  spotbugs?: {
    enabled: boolean;
    effort: string;
  };
  namingConventions: {
    classes: string;         // PascalCase
    methods: string;         // camelCase
    constants: string;       // UPPER_SNAKE_CASE
    packages: string;        // lowercase.dotted
  };
}

export async function parseJavaStandards(
  projectPath: string,
  configFiles: string[]
): Promise<JavaStandards>;
```

**Files**:
- `src/core/living-docs/governance/java-standards-parser.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T004-01 | Parse checkstyle.xml rules | Returns checkstyle config |
| T004-02 | Parse pmd.xml rulesets | Returns PMD rulesets |
| T004-03 | Detect Maven vs Gradle | Returns correct buildTool |

---

### T-005: Create Frontend Framework Detector
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

**Description**: Create detector for React, Angular, Vue from package.json and config files.

**Implementation**:
```typescript
// src/core/living-docs/governance/frontend-standards-parser.ts

export interface FrontendStandards {
  framework: 'react' | 'angular' | 'vue' | 'none';
  frameworkVersion?: string;
  stateManagement?: string;  // redux, zustand, pinia, ngrx
  cssMethodology?: string;   // tailwind, styled-components, scss, css-modules
  testing?: string[];        // jest, vitest, testing-library, cypress, playwright
  bundler?: string;          // webpack, vite, esbuild
  eslintPlugins: string[];   // react, react-hooks, vue, angular
  componentNaming: string;   // PascalCase or kebab-case
}

export async function detectFrontendFramework(
  projectPath: string
): Promise<FrontendStandards>;
```

**Files**:
- `src/core/living-docs/governance/frontend-standards-parser.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T005-01 | Detect React from package.json | Returns react framework |
| T005-02 | Detect Angular from angular.json | Returns angular framework |
| T005-03 | Detect Vue from package.json | Returns vue framework |
| T005-04 | Detect state management library | Returns correct library |

---

### T-006: Create Standards Markdown Generator
**User Story**: US-002, US-003, US-004
**Satisfies ACs**: AC-US2-04, AC-US2-05, AC-US2-06, AC-US3-04, AC-US3-05, AC-US3-06, AC-US4-01
**Status**: [x] completed

**Description**: Create generator that produces markdown files from parsed standards.

**Implementation**:
```typescript
// src/core/living-docs/governance/standards-generator.ts

export interface GeneratedFile {
  path: string;
  content: string;
}

export async function generateStandardsMarkdown(
  ecosystem: string,
  standards: PythonStandards | GoStandards | JavaStandards | FrontendStandards
): Promise<string>;

export async function generateGovernanceDocs(
  projectPath: string,
  ecosystems: DetectedEcosystem[]
): Promise<GeneratedFile[]>;
```

**Files**:
- `src/core/living-docs/governance/standards-generator.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T006-01 | Generate Python standards markdown | Contains formatter, linter sections |
| T006-02 | Generate Go standards markdown | Contains version, linter sections |
| T006-03 | Generate frontend standards markdown | Contains framework, testing sections |

---

### T-007: Create Unified Summary Generator
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05
**Status**: [x] completed

**Description**: Generate `governance/coding-standards.md` that summarizes all technologies and links to specific docs.

**Implementation**:
```typescript
// In standards-generator.ts

export function generateUnifiedSummary(
  ecosystems: DetectedEcosystem[],
  generatedFiles: GeneratedFile[]
): string {
  const lines = [
    '# Coding Standards',
    '',
    `**Auto-Generated**: ${new Date().toISOString().split('T')[0]}`,
    `**Detected Technologies**: ${ecosystems.length}`,
    '',
    '## Detected Technology Stacks',
    '',
    '| Technology | Confidence | Detected From | Standards Doc |',
    '|------------|------------|---------------|---------------|',
    ...ecosystems.map(e =>
      `| ${e.name} | ${e.confidence} | ${e.detectedFrom} | [${e.name}.md](./standards/${e.name}.md) |`
    ),
    '',
    '## Quick Links',
    '',
    ...generatedFiles
      .filter(f => f.path.includes('standards/'))
      .map(f => `- [${extractTechName(f.path)}](${f.path})`),
    '',
    '## Shared Conventions',
    '',
    '// EditorConfig, Git conventions extracted here',
    '',
    '---',
    '*Re-run: `/specweave:analyze-standards` to update*'
  ];
  return lines.join('\n');
}
```

**Files**:
- `src/core/living-docs/governance/standards-generator.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T007-01 | Summary lists all ecosystems | Table has all detected techs |
| T007-02 | Summary links to each standards doc | Links are valid |
| T007-03 | Summary includes timestamp | Contains date |

---

### T-008: Integrate with code-standards-detective Agent
**User Story**: US-004
**Satisfies ACs**: All (integration)
**Status**: [x] completed

**Description**: Update `code-standards-detective` agent to invoke multi-technology analysis when running governance analysis.

**Implementation**:
1. Add import for new governance modules
2. Call `detectEcosystems()` at start of analysis
3. For each detected ecosystem, call appropriate parser
4. Generate all standards docs
5. Update agent documentation with multi-tech support

**Files**:
- `plugins/specweave/agents/code-standards-detective/AGENT.md`
- `plugins/specweave/skills/code-standards-analyzer/SKILL.md`
- Create: `src/core/living-docs/governance/index.ts` (barrel export)

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T008-01 | Agent detects multiple ecosystems | Log shows all detected |
| T008-02 | Agent generates per-tech docs | Files created in governance/standards/ |
| T008-03 | Agent creates unified summary | coding-standards.md exists |

---

## Summary

| Task | User Story | ACs Covered | Status |
|------|------------|-------------|--------|
| T-001 | US-001 | AC-US1-01 to AC-US1-07 | [x] completed |
| T-002 | US-002 | AC-US2-01, AC-US2-04 | [x] completed |
| T-003 | US-002 | AC-US2-02, AC-US2-05 | [x] completed |
| T-004 | US-002 | AC-US2-03, AC-US2-06 | [x] completed |
| T-005 | US-003 | AC-US3-01 to AC-US3-03 | [x] completed |
| T-006 | US-002, US-003, US-004 | AC-US2-04 to AC-US2-06, AC-US3-04 to AC-US3-06, AC-US4-01 | [x] completed |
| T-007 | US-004 | AC-US4-01 to AC-US4-05 | [x] completed |
| T-008 | US-004 | Integration | [x] completed |

## Task Dependencies

```
T-001 (detector) → T-002, T-003, T-004, T-005 (parsers)
                          ↓
                   T-006 (generator)
                          ↓
                   T-007 (summary)
                          ↓
                   T-008 (integration)
```

Recommended execution order: T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008
