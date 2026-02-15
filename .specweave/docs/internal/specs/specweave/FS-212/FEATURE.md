---
id: FS-212
title: "0212: Fix stale .specweave/ folder creation in wrong locations"
type: bug
status: completed
priority: P1
created: 2026-02-15
lastUpdated: 2026-02-15
tldr: Prevent .specweave/ folders from being created in parent/sibling dirs due to hook ordering bug.
complexity: medium
stakeholder_relevant: false
---

# 0212: Fix stale .specweave/ folder creation in wrong locations

## TL;DR

**What**: Prevent .specweave/ folders from being created in parent/sibling dirs. Root cause: user-prompt-submit.sh scope guard runs before project root detection.
**Status**: completed | **Priority**: P1
**User Stories**: 3

## Overview

`.specweave/` folders appeared in wrong locations (parent/sibling directories) because the `user-prompt-submit.sh` hook's SCOPE GUARD section ran BEFORE project root detection, using `${SW_PROJECT_ROOT:-.}` which fell back to CWD. Additionally, `findProjectRoot()` in the utility module only checked for `.specweave/` directory existence without requiring `config.json`, treating stale folders as valid projects.

## Root Cause

1. **Primary**: Hook ordering bug — SCOPE GUARD (line 214) used `${SW_PROJECT_ROOT:-.}` before `SW_PROJECT_ROOT` was set (line 296)
2. **Secondary**: `findProjectRoot()` in `src/utils/find-project-root.ts` only checked for `.specweave/` directory, not `config.json`
3. **Tertiary**: `$HOME/.specweave/` paths hardcoded in hooks for logging/caching

## Changes

| File | Change |
|------|--------|
| `plugins/specweave/hooks/user-prompt-submit.sh` | Moved project root detection before scope guard; check config.json; guard mkdir calls; fix $HOME paths |
| `src/utils/find-project-root.ts` | Require `config.json` in `findProjectRoot()` |
| `src/cli/commands/update.ts` | Added `findStaleSpecweaveFolders()` + orphan cleanup; fixed `isSpecWeaveProject` |
| `tests/unit/utils/find-project-root.test.ts` | Added stale folder and stale parent + valid child tests |
| `tests/unit/cli/commands/update.test.ts` | Updated test expectations for config.json check |

## User Stories

- [US-001: Prevent stale .specweave/ folder creation](us-001-prevent-stale-folder-creation.md)
- [US-002: Clean up existing stale folders](us-002-clean-up-stale-folders.md)
- [US-003: Consistent project root detection](us-003-consistent-project-root-detection.md)
