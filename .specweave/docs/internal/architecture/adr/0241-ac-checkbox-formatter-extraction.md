# ADR-0241: AC Checkbox Formatter Extraction Strategy

**Date**: 2026-02-08
**Status**: Accepted
**Increment**: 0194-provider-agnostic-ac-sync

## Context

Each provider formats AC checkboxes differently:
- **GitHub**: `- [x] AC-ID: description` / `- [ ] AC-ID: description` (Markdown)
- **JIRA**: `(/) AC-ID: description` / `(x) AC-ID: description` (JIRA markup)
- **ADO**: `<li>☑ AC-ID: description</li>` / `<li>☐ AC-ID: description</li>` (HTML)

The JIRA formatter (`buildJiraDescription`) in `jira-spec-content-sync.ts` and the ADO formatter (`generateStoryDescription`) in `ado-spec-sync.ts` are **private functions** — not exported, embedded in larger sync classes. The AC adapters need this formatting logic.

## Decision

**Extract AC-specific formatting into `src/core/ac-checkbox-formatter.ts`** as a shared utility with provider-specific strategies:

```typescript
export type ACCheckboxFormat = 'github' | 'jira' | 'ado';

export function formatACCheckboxes(
  acStates: Array<{ id: string; description: string; completed: boolean }>,
  format: ACCheckboxFormat,
): string;
```

This is **not** refactoring the existing private functions. Instead:
1. Create new focused functions that handle only AC checkbox formatting
2. The existing private functions in `jira-spec-content-sync.ts` and `ado-spec-sync.ts` remain unchanged (they format full issue descriptions, not just ACs)
3. AC adapters use the new shared formatter; existing sync modules keep their private formatters

## Alternatives Considered

1. **Export the private functions**: Breaks encapsulation. Those functions format entire issue descriptions, not just AC checkboxes.
2. **Duplicate formatting in each adapter**: Violates DRY. Format logic would drift between adapters and existing sync modules.
3. **Adapter-internal formatting**: Each adapter owns its format. Simpler but untestable in isolation and prone to format drift.

## Consequences

**Positive**: Single source of truth for AC checkbox format per provider. Testable in isolation. Adapters stay thin.
**Negative**: Parallel formatting code exists (new utility + old private functions). Acceptable because they serve different purposes (AC-only vs full description).
