# Plan: Multi-Technology Governance Standards Detection

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Tech Governance Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ ecosystem-       │   Scan for: package.json, go.mod,         │
│  │ detector.ts      │   pyproject.toml, pom.xml, etc.           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Per-Technology Parsers                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ python-standards-parser.ts  │ Parse pyproject.toml, etc. │   │
│  │ go-standards-parser.ts      │ Parse go.mod, golangci.yml │   │
│  │ java-standards-parser.ts    │ Parse checkstyle.xml, pmd  │   │
│  │ frontend-standards-parser.ts│ Detect React/Angular/Vue   │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │ standards-       │   Generate markdown for each ecosystem    │
│  │ generator.ts     │   + unified coding-standards.md           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Output Files                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ governance/coding-standards.md    (unified summary)       │   │
│  │ governance/standards/typescript.md                        │   │
│  │ governance/standards/python.md                            │   │
│  │ governance/standards/golang.md                            │   │
│  │ governance/standards/java.md                              │   │
│  │ governance/standards/react.md                             │   │
│  │ governance/standards/angular.md                           │   │
│  │ governance/standards/vue.md                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/core/living-docs/governance/
├── index.ts                      # Barrel exports
├── ecosystem-detector.ts         # T-001: Multi-ecosystem detection
├── python-standards-parser.ts    # T-002: Python config parsing
├── go-standards-parser.ts        # T-003: Go config parsing
├── java-standards-parser.ts      # T-004: Java config parsing
├── frontend-standards-parser.ts  # T-005: React/Angular/Vue detection
├── standards-generator.ts        # T-006, T-007: Markdown generation
└── types.ts                      # Shared interfaces
```

## Implementation Details

### Phase 1: Ecosystem Detection (T-001)

**File**: `ecosystem-detector.ts`

Key design decisions:
1. **Confidence levels**: high (marker + config), medium (marker only), low (single file)
2. **No false positives**: Require specific marker files, not just file extensions
3. **Return all configs**: Parser can use full list of found config files

```typescript
// Detection order (priority)
const DETECTION_ORDER = [
  'typescript',  // Most common, check first
  'python',
  'go',
  'java',
  'dotnet',
  'rust',
  'react',       // Frontend frameworks after languages
  'angular',
  'vue'
];
```

### Phase 2: Backend Parsers (T-002, T-003, T-004)

**Design principle**: Each parser is independent and handles its own config formats.

#### Python Parser (T-002)

Supports TOML, INI, and YAML formats:
- `pyproject.toml`: TOML with `[tool.*]` sections
- `.pylintrc`, `setup.cfg`: INI format
- `ruff.toml`: TOML format
- `mypy.ini`: INI format

**Dependencies**: Use built-in `fs` + simple TOML/INI parsing (no heavy deps)

#### Go Parser (T-003)

Supports:
- `go.mod`: Custom format (regex parsing)
- `.golangci.yml`: YAML format

#### Java Parser (T-004)

Supports:
- `checkstyle.xml`: XML format
- `pmd.xml`: XML format
- `pom.xml` / `build.gradle`: Build tool detection

### Phase 3: Frontend Detection (T-005)

**Detection logic**:
```typescript
// 1. Check package.json dependencies
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

if (deps['react'] || deps['react-dom']) return 'react';
if (deps['@angular/core']) return 'angular';
if (deps['vue']) return 'vue';

// 2. Check for framework-specific files
if (fs.existsSync('angular.json')) return 'angular';
if (fs.existsSync('next.config.js')) return 'react';  // Next.js = React
if (fs.existsSync('nuxt.config.js')) return 'vue';    // Nuxt = Vue
```

### Phase 4: Markdown Generation (T-006, T-007)

**Template-based generation**:
- Each ecosystem has a template structure
- Fill in detected values
- Mark unknown/missing as "Not configured"

**Unified summary structure**:
```markdown
# Coding Standards

## Detected Technologies (N)

| Technology | Confidence | Standards Doc |
|------------|------------|---------------|
| Python | high | [python.md](./standards/python.md) |
| Go | high | [golang.md](./standards/golang.md) |

## Shared Conventions

- EditorConfig settings
- Git conventions

## Quick Links

- [Python](./standards/python.md)
- [Go](./standards/golang.md)
```

### Phase 5: Agent Integration (T-008)

Update `code-standards-detective` agent to:
1. Call `detectEcosystems()` at start
2. Log detected ecosystems
3. For each ecosystem, run appropriate parser
4. Generate all markdown files
5. Report summary to user

## Testing Strategy

### Unit Tests

Each parser has isolated tests with fixture config files:

```
tests/fixtures/governance/
├── python/
│   ├── pyproject.toml
│   ├── .pylintrc
│   └── ruff.toml
├── go/
│   ├── go.mod
│   └── .golangci.yml
├── java/
│   ├── checkstyle.xml
│   └── pmd.xml
└── frontend/
    ├── package-react.json
    ├── package-angular.json
    └── package-vue.json
```

### Integration Tests

Full flow test:
1. Create temp directory with polyglot project
2. Run `detectEcosystems()`
3. Run all parsers
4. Generate markdown
5. Verify all files created correctly

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| TOML parsing complexity | Use simple regex for `[tool.*]` sections, not full TOML parser |
| XML parsing for Java | Use Node.js built-in XML parser |
| Config format variations | Support common formats, log warnings for unknown |
| False positives | Require marker files, not just extensions |

## Dependencies

**External packages**: None required (use built-in Node.js APIs)

**Internal dependencies**:
- `src/utils/logger.js` - Logging
- `src/utils/fs-native.js` - File operations
- Existing `code-standards-detective` agent infrastructure

## Success Criteria

1. Run on SpecWeave itself (TypeScript only) - generates typescript.md
2. Run on hypothetical Python project - generates python.md
3. Run on polyglot project - generates all detected standards
4. Unified summary links to all generated docs
5. code-standards-detective agent works with multi-tech flow
