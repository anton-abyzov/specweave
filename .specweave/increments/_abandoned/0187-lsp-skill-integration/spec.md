---
increment: 0187-lsp-skill-integration
title: "LSP Integration Across Skills and Agents"
priority: P1
status: planned
created: 2026-01-07
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node.js"
  database: "filesystem"
  orm: "none"
platform: "npm-global"
estimated_cost: "$0/month"
---

# LSP Integration Across Skills and Agents

## Problem Statement

ADR-0222 (Smart LSP Integration) was approved on 2025-12-31, stating that LSP operations should be ACTIVELY used across SpecWeave. However, investigation reveals a significant gap:

**Documentation vs Reality:**
- ✅ ADR-0222 approved - "LSP operations EXEMPT from ADR-0140 restrictions"
- ✅ US-006 marked "completed" - "LSP Integration Examples for Skills"
- ✅ `/sw:living-docs` mentions LSP with `--no-lsp` flag
- ❌ **ZERO skills/agents actually INSTRUCT Claude Code to use LSP operations**
- ❌ **162 agent/skill files, NONE mention LSP in their prompts**
- ❌ **No practical examples showing HOW to use LSP in skill instructions**

**Impact:**
- Skills claim semantic code understanding but use regex/grep (100x slower)
- Agents don't leverage Claude Code's built-in LSP capabilities
- Users don't benefit from accurate symbol resolution, type hierarchies, dead code detection
- ADR-0222 implementation checklist items remain unchecked

## Solution

Bridge the gap between LSP documentation and actual usage by adding practical LSP integration patterns directly into skill and agent YAML files. Focus on high-value operations from ADR-0222.

## User Stories

### US-001: LSP Integration Guide for Skill Authors
**Project**: specweave-dev
**As a** skill/agent author
**I want** clear patterns showing HOW to use LSP in skill instructions
**So that** I can leverage semantic code understanding in my skills

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Create `docs/guides/lsp-for-skills.md` with practical examples
- [ ] **AC-US1-02**: Document all 5 high-value LSP operations: goToDefinition, findReferences, documentSymbol, hover, getDiagnostics
- [ ] **AC-US1-03**: Show example skill YAML with LSP instructions
- [ ] **AC-US1-04**: Explain when to use LSP vs grep/glob
- [ ] **AC-US1-05**: Include error handling patterns for LSP failures

### US-002: Update Frontend Architect Agent with LSP
**Project**: specweave-dev
**As a** frontend developer
**I want** the frontend-architect agent to use LSP for component analysis
**So that** I get accurate component structure mapping and type information

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Add `documentSymbol` usage to map React component structure
- [ ] **AC-US2-02**: Add `findReferences` before refactoring component props
- [ ] **AC-US2-03**: Add `hover` to extract TypeScript type signatures
- [ ] **AC-US2-04**: Add example: "Use documentSymbol on src/components/Button.tsx to map exports"
- [ ] **AC-US2-05**: Update AGENT.md with LSP integration section

### US-003: Update Database Optimizer Agent with LSP
**Project**: specweave-dev
**As a** backend developer
**I want** the database-optimizer agent to use LSP for query analysis
**So that** I get accurate impact analysis before schema changes

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Add `findReferences` to find all usages of database functions
- [ ] **AC-US3-02**: Add `goToDefinition` to navigate to query definitions
- [ ] **AC-US3-03**: Add `hover` to extract ORM function signatures
- [ ] **AC-US3-04**: Add example: "Use findReferences on database/models/User.ts:getUserById"
- [ ] **AC-US3-05**: Update AGENT.md with LSP integration section

### US-004: Update Living Docs Command with LSP Instructions
**Project**: specweave-dev
**As a** SpecWeave user
**I want** `/sw:living-docs` to actively use LSP for API extraction
**So that** documentation generation is accurate and semantic

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Add LSP usage instructions to living-docs.md command documentation
- [ ] **AC-US4-02**: Document `documentSymbol` usage for API surface extraction
- [ ] **AC-US4-03**: Document `findReferences` for dead code detection (0 refs = unused)
- [ ] **AC-US4-04**: Add example: "Use documentSymbol to extract all exported functions"
- [ ] **AC-US4-05**: Clarify LSP is default, `--no-lsp` is fallback

### US-005: Update Explore Agent with LSP Navigation
**Project**: specweave-dev
**As a** developer exploring a codebase
**I want** the Explore agent to prefer LSP navigation over grep
**So that** I get semantic navigation instead of text search

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Add instruction: "ALWAYS use goToDefinition instead of grep for symbol navigation"
- [ ] **AC-US5-02**: Add `documentSymbol` to understand file/module structure quickly
- [ ] **AC-US5-03**: Add `getDiagnostics` to assess code quality during exploration
- [ ] **AC-US5-04**: Add hybrid approach: "Use LSP for symbols, grep for text patterns"
- [ ] **AC-US5-05**: Update explore agent documentation with LSP examples

### US-006: Create LSP Example Patterns Library
**Project**: specweave-dev
**As a** skill author
**I want** a reusable library of LSP usage patterns
**So that** I can copy-paste proven LSP integration examples

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Create `plugins/specweave/lib/lsp-patterns.md` with common patterns
- [ ] **AC-US6-02**: Pattern: "Find all references to a function before refactoring"
- [ ] **AC-US6-03**: Pattern: "Extract API surface from a module"
- [ ] **AC-US6-04**: Pattern: "Detect dead code (0 references)"
- [ ] **AC-US6-05**: Pattern: "Navigate type hierarchies with goToDefinition"
- [ ] **AC-US6-06**: Pattern: "Get type info on hover for JSDoc extraction"
- [ ] **AC-US6-07**: Each pattern includes: Use case, LSP operation, Expected output

### US-007: Update Backend Skills with LSP
**Project**: specweave-dev
**As a** backend developer
**I want** backend-focused skills to use LSP for API analysis
**So that** I get accurate endpoint mapping and dependency analysis

**Acceptance Criteria**:
- [ ] **AC-US7-01**: Update API development skills with `documentSymbol` for endpoint extraction
- [ ] **AC-US7-02**: Add `findReferences` for dependency impact analysis
- [ ] **AC-US7-03**: Add examples for Express, FastAPI, NestJS, Spring Boot
- [ ] **AC-US7-04**: Document how to extract API routes semantically
- [ ] **AC-US7-05**: Update relevant SKILL.md files in backend plugins

### US-008: Integration Tests for LSP Usage
**Project**: specweave-dev
**As a** SpecWeave maintainer
**I want** integration tests that verify LSP operations work
**So that** we catch LSP regressions early

**Acceptance Criteria**:
- [ ] **AC-US8-01**: Create `tests/integration/lsp/lsp-operations.test.ts`
- [ ] **AC-US8-02**: Test `documentSymbol` on sample TypeScript file
- [ ] **AC-US8-03**: Test `findReferences` on sample function
- [ ] **AC-US8-04**: Test `goToDefinition` navigation
- [ ] **AC-US8-05**: Test `hover` type information extraction
- [ ] **AC-US8-06**: Test `getDiagnostics` on file with errors
- [ ] **AC-US8-07**: All tests use real typescript-language-server

## Technical Notes

### LSP Operations from ADR-0222

| Operation | Use Case | Expected Response Size |
|-----------|----------|----------------------|
| `goToDefinition` | Navigate to implementations | ~100 bytes (file:line) |
| `findReferences` | Impact analysis before refactoring | ~1KB (list of locations) |
| `documentSymbol` | Map file/module structure | ~5KB (symbol tree) |
| `hover` | Extract type signatures, JSDoc | ~500 bytes (type info) |
| `getDiagnostics` | Code quality assessment | ~2KB (warnings/errors) |

### Integration Points (from ADR-0222)

```
SpecWeave Operations Using LSP:
├─ specweave init → LSP for API extraction
├─ /sw:living-docs → LSP for type hierarchies
├─ /sw:do (refactoring) → findReferences before changes
├─ Explore agent → goToDefinition for navigation
└─ Code review → getDiagnostics for quality
```

### Hybrid Approach (Code + LSP)

From ADR-0222: "Code First, Tools Second" principle is PRESERVED for large data processing, but LSP is PREFERRED when:
- Precise symbol resolution needed
- Cross-file reference tracking required
- Type information extraction needed
- Semantic accuracy matters more than speed

### Language Server Requirements

Skills should check for language servers before using LSP:
```bash
# TypeScript/JavaScript
which tsserver || echo "Install: npm install -g typescript-language-server typescript"

# Python
which pylsp || echo "Install: pip install python-lsp-server"

# Go
which gopls || echo "Install: go install golang.org/x/tools/gopls@latest"
```

## Success Metrics

- [ ] At least 5 skills/agents updated with LSP instructions
- [ ] LSP usage documented in all agent AGENT.md files
- [ ] Integration tests passing for all 5 LSP operations
- [ ] No regressions in existing functionality
- [ ] ADR-0222 implementation checklist items checked

## Out of Scope

- Implementing new LSP operations beyond the 5 core ones
- Creating custom language servers (use existing)
- LSP for non-code files (Markdown, JSON)
- Real-time LSP in Claude Code sessions (not in our control)
- LSP performance optimization (handled by language servers)

## Dependencies

- ADR-0222: Smart LSP Integration (approved)
- US-006 from increment 0156 (LSP Integration Examples - documentation only)
- Claude Code 2.0.74+ (LSP operations available)

## References

- [ADR-0222](.specweave/docs/internal/architecture/adr/0222-smart-lsp-integration.md)
- [US-006](spec/weave/docs/internal/specs/specweave/FS-156/us-006-lsp-integration-examples-for-skills.md)
- [Living Docs Command](../../plugins/specweave/commands/living-docs.md)
- [Claude Code LSP Docs](https://docs.anthropic.com/en/docs/claude-code/lsp)
