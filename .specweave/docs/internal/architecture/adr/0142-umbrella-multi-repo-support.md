# ADR-0142: Umbrella Multi-Repo Support

**Status**: Accepted
**Date**: 2025-11-25
**Decision Makers**: @anton-abyzov

## Context

Users frequently describe multi-repo architectures when starting new projects:
- "Build platform with 3 repos: Frontend, Backend, Shared"
- Multiple GitHub URLs for related services
- Microservices or multi-package setups

Current SpecWeave behavior:
1. Creates single `.specweave/` at root
2. Generates generic user stories (`US-001`, `US-002`)
3. Syncs to single external tool (GitHub/JIRA)

This causes problems:
- All issues end up in one repo
- No clarity which team/service owns what
- User stories aren't routed correctly

## Decision

Implement **umbrella multi-repo support** with three key changes:

### 1. Project-Scoped User Stories

When multi-repo architecture detected, PM agent generates prefixed user stories:

| Repo Type | Prefix | Example |
|-----------|--------|---------|
| Frontend | FE | US-FE-001 |
| Backend | BE | US-BE-001 |
| Shared | SHARED | US-SHARED-001 |
| Mobile | MOBILE | US-MOBILE-001 |
| Infrastructure | INFRA | US-INFRA-001 |

### 2. Multi-Repo Intent Detection

New utility `src/utils/multi-repo-detector.ts` detects patterns:
- "3 repos", "multiple repos", "separate repos"
- "Frontend repo", "Backend API repo"
- GitHub URLs for multiple repositories
- Microservices keywords

### 3. Independent Repo Configuration

Each child repo has its own:
- `.specweave/config.json`
- `.specweave/increments/` folder
- External tool sync (own GitHub issues)

## Config Schema

```typescript
interface UmbrellaConfig {
  enabled: boolean;
  parentRepo?: string;
  childRepos: Array<{
    id: string;           // 'fe', 'be', 'shared'
    path: string;         // './my-app-fe'
    prefix: string;       // 'FE', 'BE', 'SHARED'
    githubUrl?: string;   // For sync routing
    techStack?: string[]; // For story routing
  }>;
  storyRouting?: {
    enabled: boolean;
    defaultRepo: string;
  };
}
```

## Consequences

### Positive
- Clear ownership per team/service
- GitHub issues created in correct repo
- User stories automatically routed by keywords
- Supports real-world multi-repo patterns

### Negative
- More complex configuration
- PM agent needs to understand multi-repo context
- Init flow has additional prompts

### Neutral
- Single-repo projects work unchanged (backward compatible)
- Optional feature (not forced on users)

## Implementation

- `src/utils/multi-repo-detector.ts` - Detection logic
- `plugins/specweave/skills/umbrella-repo-detector/SKILL.md` - User guidance
- `plugins/specweave/agents/pm/AGENT.md` - Project-scoped stories section
- `src/core/config/types.ts` - UmbrellaConfig interface

## References

- Increment: 0062-umbrella-multi-repo-support
- Related: ADR-0024 (Root-level repository structure)
- Related: ADR-0027 (Multi-project sync architecture)
