---
increment: 0017-sync-architecture-fix
title: Fix Sync Architecture Prompts
status: completed
created: 2025-11-10
---

# Increment 0017: Sync Architecture Fix

## Overview

Fix sync prompts during `specweave init` to correctly ask about "Local (.specweave/) ↔ External (GitHub/Jira)" instead of "External ↔ External" (GitHub PRs ↔ Jira).

## Problem Statement

User reported seeing incorrect prompts during `specweave init`:

```
❌ WRONG:
"What should be the sync behavior between GitHub PRs and Jira?"

→ External ↔ External (INCORRECT!)
→ Asking about Jira even though user only selected GitHub
```

## Root Cause

The increment planning workflow was:
1. ❌ Asking about external-to-external sync (GitHub ↔ Jira)
2. ❌ Not respecting `config.plugins.enabled` array
3. ❌ Showing all provider setup steps regardless of selection

## Correct Architecture

```
✅ CORRECT:
.specweave/  ↔  GitHub Issues       (Local ↔ External)
.specweave/  ↔  Jira Epics          (Local ↔ External)
.specweave/  ↔  Azure DevOps Items  (Local ↔ External)

❌ WRONG:
GitHub  ↔  Jira                     (External ↔ External)
```

## User Stories

### US1: Single Provider Setup (GitHub Only)

**As a** developer setting up SpecWeave with GitHub integration
**I want to** see prompts asking about "Local increments ↔ GitHub Issues"
**So that** I understand SpecWeave is the source of truth, GitHub is the mirror

**Acceptance Criteria**:
- [ ] AC-US1-01: Prompt says "local increments (.specweave/)" not just "LOCAL" (P1, testable)
- [ ] AC-US1-02: Prompt says "GitHub Issues" not "GitHub PRs" (P1, testable)
- [ ] AC-US1-03: Only GitHub is mentioned (no Jira prompt) (P1, testable)
- [ ] AC-US1-04: Clear directionality (→, ↔ symbols shown) (P2, testable)
- [ ] AC-US1-05: Conflict resolution mentioned (P2, testable)
- [ ] AC-US1-06: Sync trigger specified ("on task completion") (P2, testable)
- [ ] AC-US1-07: Examples provided for each option (P2, testable)

### US2: Multi-Provider Setup (GitHub + Jira)

**As a** developer setting up SpecWeave with both GitHub and Jira
**I want to** see separate prompts for "Local ↔ GitHub" and "Local ↔ Jira"
**So that** I can configure each integration independently

**Acceptance Criteria**:
- [ ] AC-US2-01: Two separate prompts (GitHub, then Jira) (P1, testable)
- [ ] AC-US2-02: Both prompts say "Local ↔ External" (P1, testable)
- [ ] AC-US2-03: No GitHub ↔ Jira prompt (external-to-external) (P1, testable)

## Out of Scope

- ❌ Changing actual sync logic (only fixing prompts)
- ❌ Adding new sync providers (only GitHub, Jira, ADO)
- ❌ Changing sync configuration schema

## Success Metrics

- ✅ All sync prompts use correct architecture terminology
- ✅ No external-to-external sync prompts
- ✅ Single provider setup shows only that provider
- ✅ Multi-provider setup shows separate prompts per provider

## External References

- Test Report: `.specweave/increments/0017-sync-architecture-fix/TEST-REPORT-COMPLETE.md`
- GitHub Issue: N/A (internal fix)
