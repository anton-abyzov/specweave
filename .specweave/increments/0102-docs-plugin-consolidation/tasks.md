# Tasks - 0102: Docs Plugin Consolidation

## T-001: Move preview command to docs plugin
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

Copy `plugins/specweave-docs-preview/commands/preview.md` to `plugins/specweave-docs/commands/preview.md` and update frontmatter name from `specweave-docs-preview:preview` to `specweave-docs:preview`.

## T-002: Move build command to docs plugin
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [x] completed

Copy `plugins/specweave-docs-preview/commands/build.md` to `plugins/specweave-docs/commands/build.md` and update frontmatter name.

## T-003: Merge skills from preview plugin
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed

Move `plugins/specweave-docs-preview/skills/docs-preview/` to `plugins/specweave-docs/skills/` and update any references.

## T-004: Rename docs-generate to generate
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

Rename `commands/docs-generate.md` to `commands/generate.md` and update frontmatter name from `specweave-docs:docs-generate` to `specweave-docs:generate`.

## T-005: Rename docs-init to init
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Status**: [x] completed

Rename `commands/docs-init.md` to `commands/init.md` and update frontmatter name.

## T-006: Create organize command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed

Create `commands/organize.md` in docs plugin wrapping SmartDocOrganizer. Remove old `specweave:organize-docs` from core plugin.

## T-007: Create health command
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

Create `commands/health.md` wrapping EnterpriseDocAnalyzer to output health report.

## T-008: Delete old preview plugin
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed

Remove entire `plugins/specweave-docs-preview/` folder after verifying all content migrated.
