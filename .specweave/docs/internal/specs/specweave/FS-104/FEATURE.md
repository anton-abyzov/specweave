---
id: FS-104
title: "Standalone Living Docs Command"
type: feature
status: completed
priority: P1
created: 2025-12-04
lastUpdated: 2025-12-04
---

# Standalone Living Docs Command

## Overview

Currently, the Living Docs Builder can only be launched during `specweave init`. If Claude Code crashes after init completes but before/during the living docs job, users have no way to:
1. Re-launch the living docs builder independently
2. Resume an orphaned job easily
3. Trigger living docs analysis on demand for brownfield projects

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0104-living-docs-command](../../../../increments/0104-living-docs-command/spec.md) | ✅ completed | 2025-12-04 |

## User Stories

- [US-001: Re-launch Living Docs After Crash](../../specweave/FS-104/us-001-re-launch-living-docs-after-crash.md)
- [US-002: Resume Orphaned Jobs](../../specweave/FS-104/us-002-resume-orphaned-jobs.md)
- [US-003: Configure Analysis Depth](../../specweave/FS-104/us-003-configure-analysis-depth.md)
