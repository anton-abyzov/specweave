---
increment: 0103-list-last-commits
title: "List Last 2 Commits"
priority: P2
status: completed
started: 2025-12-04
created: 2025-12-04
type: feature
test_mode: test-after
coverage_target: 80
---

# List Last 2 Commits

## Overview

Add a CLI command to display the last 2 git commits in a concise format.

## User Stories

### US-001: View Recent Commits

**As a** developer using SpecWeave
**I want to** see the last 2 commits quickly
**So that** I can understand recent changes without running git commands manually

#### Acceptance Criteria

- [x] **AC-US1-01**: Command `specweave commits` displays last 2 commits
- [x] **AC-US1-02**: Output shows commit hash (short), author, and message
- [x] **AC-US1-03**: Command fails gracefully if not in a git repository
- [x] **AC-US1-04**: Command works in any subdirectory of a git repo

## Out of Scope

- Configurable number of commits (hardcoded to 2)
- Detailed commit information (diff, files changed)
- Interactive commit selection

## Success Criteria

- Command executes in < 500ms
- Clear error message when not in git repo
