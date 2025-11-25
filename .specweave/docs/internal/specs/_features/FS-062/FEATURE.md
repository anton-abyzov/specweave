---
feature_id: FS-062
title: Umbrella Multi-Repo Support
status: implemented
created: 2025-11-25
increment: 0062-umbrella-multi-repo-support
---

# FS-062: Umbrella Multi-Repo Support

## Overview

Enables SpecWeave to understand and work with multi-repo architectures where:
- Multiple repos serve different purposes (frontend, backend, shared)
- Each repo should have independent `.specweave/` configuration
- User stories should be project-scoped with prefixes (US-FE-*, US-BE-*)

## Problem Solved

When users describe "3 repos: Frontend, Backend, Shared", SpecWeave now:
1. **Detects** multi-repo intent from the prompt
2. **Generates** project-scoped user stories (US-FE-001, US-BE-001)
3. **Guides** users through proper multi-repo setup
4. **Routes** stories to correct repos for GitHub issues

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Multi-repo detector | `src/utils/multi-repo-detector.ts` | Pattern detection |
| PM agent enhancement | `plugins/specweave/agents/pm/AGENT.md` | Story prefixing |
| Umbrella skill | `plugins/specweave/skills/umbrella-repo-detector/` | User guidance |
| Config schema | `src/core/config/types.ts` | UmbrellaConfig |

## User Story Prefixes

| Repo Type | Prefix | Keywords |
|-----------|--------|----------|
| Frontend | FE | UI, component, form, view |
| Backend | BE | API, endpoint, database |
| Shared | SHARED | schema, validator, types |
| Mobile | MOBILE | iOS, Android, native |
| Infrastructure | INFRA | Terraform, K8s, Docker |

## Architecture Decision

See [ADR-0142](../../architecture/adr/0142-umbrella-multi-repo-support.md)

## Related

- Increment: 0062-umbrella-multi-repo-support
- Previous work: 0022-multi-repo-init-ux
