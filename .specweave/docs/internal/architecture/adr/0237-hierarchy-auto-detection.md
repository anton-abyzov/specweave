# ADR-0237: Hierarchy Auto-Detection

**Date**: 2026-02-06
**Status**: Accepted
**Increment**: 0190-sync-architecture-redesign

## Context

The current hierarchy mapping is rigid: Feature → US → AC → Task. This fails for flat JIRA teams (Tasks only), SAFe orgs (5 levels), and teams that skip Story level. Users must manually configure `HierarchyMappingConfig`.

## Decision

Implement auto-detection with user confirmation. Core principle: **User Story and Task are FIXED; container levels are FLEXIBLE.**

### Collapsing Rules

| External Structure | SpecWeave Mapping |
|-------------------|-------------------|
| Flat Tasks only | Task → US (each task becomes a User Story) |
| Epic → Task | Epic → Feature, Task → US |
| Epic → Story → Sub-task | Epic → Feature, Story → US, Sub-task → Task |
| Initiative → Epic → Story | Initiative → (skip), Epic → Feature, Story → US |
| SAFe 5-level | Top 2 → (skip/container), Feature-level → Feature, Story → US |

### AC Auto-Extraction (for flat Task → US mapping)

When a flat Task maps to a User Story, ACs are extracted from the task description:
1. Parse markdown checklists (`- [ ] item`) → each becomes an AC
2. Parse numbered lists (`1. item`) → each becomes an AC
3. Parse bullet points (`- item`) → each becomes an AC
4. If none found → single default AC: `AC-USX-01: Task completed as described`

### Detection Algorithm

```typescript
async detectHierarchy(): Promise<DetectedHierarchy> {
  // 1. Query work item types from project
  // 2. Count items per type (sample last 50 items)
  // 3. Detect parent-child relationships
  // 4. Match to known patterns (flat, standard, SAFe)
  // 5. Return proposed mapping for confirmation
}
```

## Consequences

**Positive**: Works with any team structure, reduces setup friction
**Negative**: Auto-detection may misclassify, needs user confirmation step
