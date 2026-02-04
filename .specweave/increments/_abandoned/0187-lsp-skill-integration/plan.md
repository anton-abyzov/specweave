---
increment: 0187-lsp-skill-integration
title: "LSP Integration - Technical Plan"
created: 2026-01-07
---

# Technical Plan: LSP Integration Across Skills and Agents

## Architecture Overview

This plan implements ADR-0222 by adding LSP usage instructions directly into skill and agent YAML files, bridging the gap between documentation and actual usage.

### Core Principle

**LSP operations are INSTRUCTIONS, not implementations**. We're not writing LSP client code - we're telling Claude Code (which already has LSP built-in) HOW and WHEN to use its LSP capabilities.

### Implementation Strategy

```
┌──────────────────────────────────────────────────────────┐
│ Phase 1: Documentation & Patterns                         │
│ ├─ Create LSP integration guide                          │
│ ├─ Document 5 core LSP operations                        │
│ └─ Build reusable pattern library                        │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 2: Agent Updates                                   │
│ ├─ frontend-architect (documentSymbol, findReferences)   │
│ ├─ database-optimizer (findReferences, goToDefinition)   │
│ └─ Explore agent (goToDefinition, documentSymbol)        │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 3: Skill & Command Updates                         │
│ ├─ /sw:living-docs command (documentSymbol for APIs)     │
│ └─ Backend skills (API extraction patterns)              │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 4: Validation & Testing                            │
│ ├─ Integration tests for LSP operations                  │
│ ├─ Verify agent YAML updates                             │
│ └─ Check ADR-0222 implementation checklist               │
└──────────────────────────────────────────────────────────┘
```

## Component Design

### 1. LSP Integration Guide (`docs/guides/lsp-for-skills.md`)

**Purpose**: Central documentation showing skill authors HOW to use LSP in YAML files.

**Structure**:
```markdown
# LSP Integration Guide for Skills

## Quick Start
- When to use LSP vs grep/glob
- LSP operation decision tree

## Core LSP Operations
### goToDefinition
- **Use when**: Navigate to symbol definitions
- **Example YAML**:
  ```
  "Before refactoring function X, use goToDefinition on file.ts:42 to see implementation"
  ```
- **Expected output**: file path + line number

### findReferences
- **Use when**: Impact analysis before changes
- **Example YAML**:
  ```
  "Use findReferences on getUserById function to see all call sites"
  ```
- **Expected output**: List of file:line locations

### documentSymbol
- **Use when**: Map file structure, extract API surface
- **Example YAML**:
  ```
  "Use documentSymbol on Button.tsx to list all exports"
  ```
- **Expected output**: Symbol tree (functions, classes, exports)

### hover
- **Use when**: Extract type signatures, JSDoc
- **Example YAML**:
  ```
  "Use hover on function name to get TypeScript type signature"
  ```
- **Expected output**: Type information, documentation

### getDiagnostics
- **Use when**: Code quality assessment
- **Example YAML**:
  ```
  "Use getDiagnostics on App.tsx to check for errors before changes"
  ```
- **Expected output**: Warnings and errors

## Error Handling
- Fallback to grep if LSP unavailable
- Check for language server installation
```

### 2. LSP Pattern Library (`plugins/specweave/lib/lsp-patterns.md`)

**Purpose**: Reusable snippets for common LSP operations.

**Patterns Included**:

**Pattern 1: Pre-Refactoring Impact Analysis**
```markdown
Before refactoring {function_name}:
1. Use findReferences on {file}:{line} to find all call sites
2. Review each reference to understand usage patterns
3. Ensure changes won't break existing usage
```

**Pattern 2: API Surface Extraction**
```markdown
To extract API surface from {module}:
1. Use documentSymbol on {entrypoint_file}
2. Filter for exported symbols only
3. For each export, use hover to get type signatures
```

**Pattern 3: Dead Code Detection**
```markdown
To detect unused code:
1. Use documentSymbol to list all symbols
2. For each symbol, use findReferences
3. If findReferences returns 0 results → unused code
```

**Pattern 4: Type Hierarchy Navigation**
```markdown
To understand type relationships:
1. Use goToDefinition on type name
2. Use findReferences to see all usages
3. Use hover to get full type definition
```

### 3. Agent YAML Updates

**Frontend Architect** (`plugins/specweave-frontend/agents/frontend-architect/AGENT.md`):

```yaml
---
name: frontend-architect
description: |
  Expert frontend architect for React, Next.js, Vue, Angular.
  **LSP-Enhanced Analysis**: Uses semantic code understanding for accuracy.
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - LSP  # ← NEW
---

# Frontend Architect Agent

## LSP Integration (Claude Code 2.0.74+)

**ALWAYS use LSP for semantic code understanding when available.**

### Component Structure Analysis
```
Before designing component architecture:
1. Use documentSymbol on src/components/*.tsx to map existing structure
2. Use findReferences on shared components to understand dependencies
3. Use hover to extract prop type definitions
```

### Pre-Refactoring Checks
```
Before refactoring component props:
1. Use findReferences on component name to find all usages
2. Review each usage site for compatibility
3. Plan gradual migration if needed
```

### Type Extraction
```
When documenting components:
1. Use hover on component name to get TypeScript signature
2. Extract prop types, return types
3. Include in documentation
```

**Fallback**: If LSP unavailable, use Grep with caution (less accurate).
```

**Database Optimizer** (`plugins/specweave-backend/agents/database-optimizer/AGENT.md`):

```yaml
---
name: database-optimizer
description: |
  Expert database optimizer for query performance and schema design.
  **LSP-Enhanced Analysis**: Uses semantic code understanding for query tracking.
---

# Database Optimizer Agent

## LSP Integration

### Query Usage Analysis
```
Before schema changes:
1. Use findReferences on table/model name to find all queries
2. Use goToDefinition to navigate to ORM model definitions
3. Assess impact of schema changes on existing queries
```

### Dead Query Detection
```
To find unused database functions:
1. Use documentSymbol on models/ folder
2. For each function, use findReferences
3. Functions with 0 references can be removed
```

### Type-Safe Migration
```
When planning migrations:
1. Use hover on ORM functions to get type signatures
2. Ensure new schema maintains type safety
3. Update types first, then migrate data
```
```

### 4. Living Docs Command Update

**File**: `plugins/specweave/commands/living-docs.md`

**Add LSP Usage Section**:

```markdown
## LSP-Enhanced Analysis (DEFAULT - Claude Code 2.0.74+)

**LSP is ENABLED BY DEFAULT** for all living docs operations.

### API Surface Extraction (Semantic)

**With LSP (DEFAULT)**:
```
1. Use documentSymbol on src/index.ts
2. Filter for exported symbols (isExported: true)
3. For each export, use hover to get type signature
4. Build API documentation with actual types
```

**Expected Output**:
- Accurate list of all public APIs
- Full type signatures (not guessed)
- JSDoc extracted automatically
- Dead code identified (0 references)

**Without LSP (--no-lsp fallback)**:
- Text-based pattern matching
- May miss indirect exports
- Limited type inference

**When to use --no-lsp**:
- Language server not installed
- Large codebase (>10,000 files) - performance
- LSP server errors (rare)
```

### 5. Integration Tests

**File**: `tests/integration/lsp/lsp-operations.test.ts`

**Test Strategy**:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('LSP Operations Integration', () => {
  const testFixture = path.join(__dirname, 'fixtures/sample.ts');

  beforeAll(() => {
    // Create test TypeScript file
    fs.writeFileSync(testFixture, `
export function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}

export class UserService {
  async getUser(id: string): Promise<User> {
    return fetchUser(id);
  }
}
    `);
  });

  describe('documentSymbol', () => {
    it('should extract all exported symbols', () => {
      // Invoke documentSymbol via CLI or API
      const result = execSync(
        `claude-code lsp documentSymbol ${testFixture}`,
        { encoding: 'utf8' }
      );

      const symbols = JSON.parse(result);

      expect(symbols).toHaveLength(2); // calculateTotal, UserService
      expect(symbols[0].name).toBe('calculateTotal');
      expect(symbols[0].kind).toBe('Function');
      expect(symbols[1].name).toBe('UserService');
      expect(symbols[1].kind).toBe('Class');
    });
  });

  describe('findReferences', () => {
    it('should find all usages of a function', () => {
      const result = execSync(
        `claude-code lsp findReferences ${testFixture}:2:16`, // calculateTotal location
        { encoding: 'utf8' }
      );

      const references = JSON.parse(result);
      expect(references.length).toBeGreaterThanOrEqual(1); // At least definition
    });
  });

  describe('goToDefinition', () => {
    it('should navigate to function definition', () => {
      const result = execSync(
        `claude-code lsp goToDefinition ${testFixture}:2:16`,
        { encoding: 'utf8' }
      );

      const location = JSON.parse(result);
      expect(location.uri).toContain('sample.ts');
      expect(location.range.start.line).toBe(1); // 0-indexed
    });
  });

  describe('hover', () => {
    it('should extract type information', () => {
      const result = execSync(
        `claude-code lsp hover ${testFixture}:2:16`,
        { encoding: 'utf8' }
      );

      const hoverInfo = JSON.parse(result);
      expect(hoverInfo.contents).toContain('(items: number[]): number');
    });
  });

  describe('getDiagnostics', () => {
    it('should detect TypeScript errors', () => {
      // Create file with error
      const errorFile = path.join(__dirname, 'fixtures/error.ts');
      fs.writeFileSync(errorFile, `
const x: number = "string"; // Type error
      `);

      const result = execSync(
        `claude-code lsp getDiagnostics ${errorFile}`,
        { encoding: 'utf8' }
      );

      const diagnostics = JSON.parse(result);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('Type');
    });
  });
});
```

## Testing Strategy

### TDD Mode (Required for SpecWeave Core)

This increment uses TDD mode (from config):
1. Write integration tests first (LSP operations)
2. Update agent YAML files to pass tests
3. Verify with manual testing in Claude Code

### Coverage Targets

- Integration tests: >80% coverage
- All 5 LSP operations tested
- Fallback behavior tested (LSP unavailable)

### Manual Testing Checklist

- [ ] Frontend architect uses documentSymbol on React component
- [ ] Database optimizer uses findReferences on ORM function
- [ ] Explore agent prefers goToDefinition over grep
- [ ] Living docs uses documentSymbol for API extraction
- [ ] All agents handle LSP unavailable gracefully

## Rollout Plan

### Phase 1: Documentation (Week 1)
- Create LSP guide
- Create pattern library
- Update CLAUDE.md with LSP section

### Phase 2: Core Agents (Week 1-2)
- Update frontend-architect AGENT.md
- Update database-optimizer AGENT.md
- Update Explore agent docs

### Phase 3: Commands & Skills (Week 2)
- Update /sw:living-docs command
- Update backend skills
- Add LSP examples to skill templates

### Phase 4: Validation (Week 2-3)
- Write integration tests
- Manual testing in real projects
- Update ADR-0222 checklist

## Risk Mitigation

### Risk 1: LSP Not Available
**Mitigation**: All skills include fallback to grep/glob with warning.

### Risk 2: Language Server Not Installed
**Mitigation**: Skills check for language server before using LSP, provide install instructions.

### Risk 3: Performance Issues
**Mitigation**: Use LSP only for surgical operations (symbol resolution), not bulk processing.

### Risk 4: Breaking Changes to Agents
**Mitigation**: LSP instructions are ADDITIVE only - existing functionality unchanged.

## Success Criteria

- [ ] All 8 user stories implemented
- [ ] Integration tests passing (5 LSP operations)
- [ ] ADR-0222 checklist items checked
- [ ] No regressions in existing agent behavior
- [ ] At least 5 agents/skills using LSP actively

## References

- [ADR-0222: Smart LSP Integration](../../docs/internal/architecture/adr/0222-smart-lsp-integration.md)
- [Claude Code LSP Documentation](https://docs.anthropic.com/en/docs/claude-code/lsp)
- [SpecWeave Living Docs](../../docs/internal/)
