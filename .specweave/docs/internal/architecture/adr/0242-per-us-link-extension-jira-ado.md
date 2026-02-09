# ADR-0242: Per-User-Story Link Extension for JIRA and ADO

**Date**: 2026-02-08
**Status**: Accepted
**Increment**: 0194-provider-agnostic-ac-sync

## Context

GitHub's frontmatter already supports per-User-Story links via `externalLinks.github.userStories[US-XXX].issueNumber`. The AC sync adapters need to resolve a provider-specific issue/work-item reference per user story. JIRA currently stores only `epicKey` (feature-level) and ADO stores only `featureId` (feature-level) — neither has per-US tracking.

## Decision

Extend JIRA and ADO frontmatter types to include per-US links, mirroring GitHub's pattern:

```yaml
externalLinks:
  jira:
    epicKey: "PROJ-100"
    userStories:
      US-001:
        issueKey: "PROJ-101"
        issueUrl: "https://company.atlassian.net/browse/PROJ-101"
        syncedAt: "2026-02-08T00:00:00Z"
  ado:
    featureId: 12345
    userStories:
      US-001:
        workItemId: 12346
        workItemUrl: "https://dev.azure.com/org/project/_workitems/edit/12346"
        syncedAt: "2026-02-08T00:00:00Z"
```

New types added to `src/core/types/sync-profile.ts`:

```typescript
export interface JiraUserStoryLink {
  issueKey: string;
  issueUrl: string;
  syncedAt: string;
}

export interface AdoUserStoryLink {
  workItemId: number;
  workItemUrl: string;
  syncedAt: string;
}
```

**Backward compatible**: If `userStories` is absent, adapters skip per-US operations with `reason: 'no-issue-link'`. Existing JIRA/ADO sync that uses `epicKey`/`featureId` is unaffected.

## Alternatives Considered

1. **Derive per-US links at runtime from JIRA/ADO API**: Requires extra API calls every sync. Slow and fragile.
2. **Store in metadata.json instead of frontmatter**: Breaks the spec.md-as-truth pattern. All external links live in spec frontmatter.
3. **Flat key format (jiraIssueKey_US001)**: Non-standard, harder to parse, inconsistent with GitHub's nested structure.

## Consequences

**Positive**: Uniform per-US link resolution across all 3 providers. Adapters use identical pattern: `externalLinks.{provider}.userStories[usId]`.
**Negative**: JIRA/ADO push-sync commands must populate these links when creating per-US issues. This is a prerequisite for AC sync to work (out of scope for this increment — links are populated by existing sync commands).
