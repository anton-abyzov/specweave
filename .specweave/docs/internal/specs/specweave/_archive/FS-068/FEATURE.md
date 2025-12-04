---
id: FS-068
title: "0068 - Fix Multi-Repo ImportFrom Missing Items"
type: feature
status: completed
priority: P1
created: 2025-11-26
lastUpdated: 2025-11-26
---

# 0068 - Fix Multi-Repo ImportFrom Missing Items

## Overview

When using SpecWeave with a multi-repo umbrella setup (4 repositories), the `/specweave:import-external` command fails to import GitHub issues from all configured repositories. Issues are either:
1. Not imported at all from some repos
2. Missing from the specs folder structure

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0068-fix-multi-repo-import-from](../../../../../../increments/_archive/0068-fix-multi-repo-import-from/spec.md) | ✅ completed | 2025-11-26 |

## User Stories

- [US-001: Fix importFrom for Multi-Repo GitHub](./us-001-fix-importfrom-for-multi-repo-github.md)
