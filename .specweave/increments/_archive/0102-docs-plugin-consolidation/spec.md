---
increment: 0102-docs-plugin-consolidation
status: completed
type: refactor
priority: high
---

# Increment 0102: Documentation Plugin Consolidation

## Problem Statement

Documentation tooling is fragmented across two plugins:
- `specweave-docs` - Generation commands (docs-generate, docs-init)
- `specweave-docs-preview` - Preview commands (preview, build)

This causes:
1. **Confusing UX** - Users don't know which plugin has what
2. **Awkward naming** - `/specweave-docs:docs-generate` is redundant
3. **Long prefixes** - `/specweave-docs-preview:preview` is verbose
4. **Scattered features** - `organize-docs` is in core, not with docs tooling

## Solution

Consolidate all documentation commands into single `specweave-docs` plugin:

```
/specweave-docs:preview   # Launch Docusaurus dev server
/specweave-docs:build     # Build static site
/specweave-docs:generate  # Generate docs from code
/specweave-docs:init      # Initialize docs structure
/specweave-docs:organize  # Smart folder organization
/specweave-docs:health    # Documentation health report
```

## User Stories

### US-001: Merge Preview Plugin into Docs Plugin
**Priority**: P0

As a developer, I want all documentation commands under one plugin prefix so I have a clear mental model.

**Acceptance Criteria**:
- [x] **AC-US1-01**: `preview.md` moved to `specweave-docs/commands/preview.md`
- [x] **AC-US1-02**: `build.md` moved to `specweave-docs/commands/build.md`
- [x] **AC-US1-03**: Skills from docs-preview merged into docs plugin
- [x] **AC-US1-04**: `/specweave-docs:preview` works correctly

### US-002: Simplify Command Names
**Priority**: P0

As a user, I want shorter, cleaner command names without redundant prefixes.

**Acceptance Criteria**:
- [x] **AC-US2-01**: `docs-generate` renamed to `generate`
- [x] **AC-US2-02**: `docs-init` renamed to `init`
- [x] **AC-US2-03**: Command frontmatter updated with new names

### US-003: Move Organization Command to Docs Plugin
**Priority**: P1

As a user, I want `/specweave-docs:organize` instead of `/specweave:organize-docs` for consistency.

**Acceptance Criteria**:
- [x] **AC-US3-01**: `organize.md` created in docs plugin
- [x] **AC-US3-02**: Old `organize-docs.md` removed from core
- [x] **AC-US3-03**: Command integrates with SmartDocOrganizer

### US-004: Add Health Command
**Priority**: P1

As a user, I want `/specweave-docs:health` to see documentation health report.

**Acceptance Criteria**:
- [x] **AC-US4-01**: `health.md` created wrapping EnterpriseDocAnalyzer
- [x] **AC-US4-02**: Outputs health score, categories, recommendations

### US-005: Delete Old Preview Plugin
**Priority**: P0

As a maintainer, I want the old plugin removed to avoid confusion.

**Acceptance Criteria**:
- [x] **AC-US5-01**: `plugins/specweave-docs-preview/` folder deleted
- [x] **AC-US5-02**: No broken references remain

## Out of Scope

- Changing the underlying Docusaurus preview logic
- Modifying the SmartDocOrganizer implementation
- Adding new documentation features

## Technical Notes

- Plugin folder: `plugins/specweave-docs/`
- Commands use `.md` format with YAML frontmatter
- Skills remain in `skills/` subfolder
