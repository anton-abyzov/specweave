---
increment: 0120-ado-jira-feature-parity-analysis
project: specweave
title: ADO vs JIRA Feature Parity Analysis
type: analysis
priority: P2
status: completed
completedAt: 2025-12-07
---

# ADO vs JIRA Feature Parity Analysis

## Overview

This increment identifies and documents gaps between Azure DevOps (ADO) and JIRA integrations in SpecWeave. The goal is to ensure **complete feature parity** - everything supported by ADO should also be supported by JIRA.

## Gap Analysis Summary

### Legend
- ✅ **Parity** - Both ADO and JIRA support this equally
- ⚠️ **Partial** - JIRA has feature but missing some ADO capabilities
- ❌ **Missing** - JIRA lacks this feature entirely (needs implementation)
- 🟡 **ADO Missing** - ADO lacks feature that JIRA has

---

## 1. COMMANDS COMPARISON

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **Sync (two-way)** | `/specweave-ado:sync` | `/specweave-jira:sync` | ✅ | Both support bidirectional |
| **Push** | `/specweave-ado:push` | `/specweave-jira:push` | ✅ | Both support git-like push |
| **Pull** | `/specweave-ado:pull` | `/specweave-jira:pull` | ✅ | Both support git-like pull |
| **Create** | `/specweave-ado:create` | ❌ Missing | ❌ | **GAP: JIRA needs `/specweave-jira:create` command** |
| **Close** | `/specweave-ado:close` | ❌ Missing | ❌ | **GAP: JIRA needs `/specweave-jira:close` command** |
| **Status** | `/specweave-ado:status` | ❌ Missing | ❌ | **GAP: JIRA needs `/specweave-jira:status` command** |
| **Clone Repos** | `/specweave-ado:clone` | N/A | ✅ | N/A for JIRA (no repo concept) |
| **Import Areas** | `/specweave-ado:import-areas` | `/specweave-jira:import-boards` | ✅ | Equivalent concept mapping |
| **Import Projects** | `/specweave-ado:import-projects` | `/specweave-jira:import-projects` | ✅ | Both support post-init import |
| **Reconcile** | ❌ Missing | ❌ Missing | ❌ | **GAP: Both need reconcile (GitHub has it)** |
| **Cleanup Duplicates** | ❌ Missing | ❌ Missing | ❌ | **GAP: Both need duplicate cleanup (GitHub has it)** |

---

## 2. EXTERNAL ITEM IMPORT

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **E-suffix convention** | ✅ Full support | ⚠️ Partial | ⚠️ | JIRA importer may not consistently apply E-suffix |
| **Pagination (large datasets)** | ✅ WIQL date-based | ⚠️ JQL basic | ⚠️ | ADO handles 100K+ items; JIRA pagination less robust |
| **Parent item recovery** | ✅ Auto-fetch missing parents | ❌ No | ❌ | **GAP: JIRA should fetch missing Epic parents after pagination** |
| **Process template detection** | ✅ Agile/Scrum/CMMI/SAFe | ❌ No | ❌ | **GAP: JIRA should detect project template type** |
| **Work item type mapping** | ✅ Comprehensive | ⚠️ Basic | ⚠️ | ADO maps Capability→Epic→Feature→Story→Task chain |
| **Three-tier fetching** | ✅ Count→Paginated→Full | ⚠️ Two-tier | ⚠️ | JIRA lacks optimized count-first approach |
| **Stale item detection** | ✅ 60-day threshold | ✅ Configurable | ✅ | Both support |
| **Tag filtering** | ✅ WIQL tags | ✅ JQL labels | ✅ | Equivalent |
| **Time range filtering** | ✅ Default 3 months | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA has consistent time range defaults** |

---

## 3. SYNC ARCHITECTURE

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **Bidirectional sync** | ✅ Full | ✅ Full | ✅ | Both support |
| **Conflict resolution** | ✅ External wins | ✅ External wins | ✅ | Same strategy |
| **Living docs sync (--all)** | ✅ Batch fetch | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA supports `--all` flag for full sync** |
| **Project-scoped sync** | ✅ `--project X` | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA supports `--project` flag** |
| **Feature hierarchy sync** | ✅ `--feature FS-042` | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA supports `--feature` flag** |
| **Multi-project routing** | ✅ Area path based | ✅ Board based | ✅ | Different mechanisms, same result |
| **Sync modes** | ✅ two-way/to-ado/from-ado | ✅ two-way/to-jira/from-jira | ✅ | Both support |
| **Rate limiting** | ✅ Implemented | ✅ Implemented | ✅ | Both handle |
| **Sync hooks** | ✅ post-task-completion | ⚠️ Documented but unclear | ⚠️ | **GAP: Verify JIRA has working post-task-completion hook** |

---

## 4. PERMISSION HANDLING

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **canUpdateExternalItems** | ✅ Full gate | ✅ Full gate | ✅ | Both enforce |
| **canUpdateStatus** | ✅ Separate permission | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA respects canUpdateStatus separately** |
| **canUpsertInternalItems** | ✅ Supported | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA supports this permission** |
| **Permission gate library** | ✅ `ado-permission-gate.ts` | ❌ Missing | ❌ | **GAP: JIRA needs dedicated permission gate module** |
| **Helpful error messages** | ✅ Clear guidance | ⚠️ Basic | ⚠️ | ADO provides actionable suggestions |
| **Read-only fallback** | ✅ Auto-suggest | ⚠️ Unclear | ⚠️ | **GAP: JIRA should suggest read-only when write denied** |

---

## 5. INCREMENT GENERATION

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **E-suffix for external** | ✅ Uses `isExternal: true` | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA uses IncrementNumberManager correctly** |
| **Feature ID derivation** | ✅ Auto from increment | ✅ Auto from increment | ✅ | Both use `feature-id-derivation.ts` |
| **Metadata external_sync** | ✅ `external_sync.ado.*` | ✅ `external_ids.jira.*` | ⚠️ | **GAP: Inconsistent naming (external_sync vs external_ids)** |
| **Profile storage** | ✅ `external_sync.ado.profile` | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA stores profile in metadata** |
| **Bidirectional links** | ✅ Stored in metadata | ✅ Stored in metadata | ✅ | Both support |

---

## 6. 2-LEVEL STRUCTURE (Multi-Project)

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **Structure detection** | ✅ `structure-level-detector.ts` | ✅ Same | ✅ | Shared utility |
| **project: field** | ✅ Mandatory | ✅ Mandatory | ✅ | Both enforce |
| **board: field** | ✅ Mandatory for 2-level | ✅ Mandatory for 2-level | ✅ | Both enforce |
| **Area path mapping** | ✅ `areaPathMapping` config | N/A | ✅ | ADO-specific |
| **Board mapping** | N/A | ✅ `boardMapping` config | ✅ | JIRA-specific |
| **Granularity selection** | ✅ top-level/two-level/full-tree | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA supports granularity selection** |
| **Auto-suggest granularity** | ✅ Based on structure | ⚠️ Unclear | ⚠️ | **GAP: JIRA should auto-suggest based on project count** |

---

## 7. PROFILE RESOLUTION

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **Increment-specific profile** | ✅ metadata → profile | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA checks increment metadata first** |
| **Global active profile** | ✅ config → activeProfile | ✅ config → activeProfile | ✅ | Both support |
| **Multi-org PATs** | ✅ `AZURE_DEVOPS_PAT_{ORG}` | ❌ Missing | ❌ | **GAP: JIRA needs `JIRA_API_TOKEN_{DOMAIN}` support** |
| **Profile resolver library** | ✅ `ado-profile-resolver.ts` | ❌ Missing | ❌ | **GAP: JIRA needs dedicated profile resolver** |
| **Error on no profile** | ✅ Clear error + guidance | ⚠️ Unclear | ⚠️ | **GAP: Verify JIRA fails gracefully with guidance** |

---

## 8. AGENTS & SKILLS

| Feature | ADO | JIRA | Status | Gap Details |
|---------|-----|------|--------|-------------|
| **Manager agent** | ✅ `ado-manager` | ✅ `jira-manager` | ✅ | Both have |
| **Sync judge agent** | ✅ `ado-sync-judge` | ❌ Missing | ❌ | **GAP: JIRA needs sync judge for conflict decisions** |
| **Multi-project mapper** | ✅ `ado-multi-project-mapper` | ❌ Missing | ❌ | **GAP: JIRA needs multi-project mapper agent** |
| **Sync skill** | ✅ `ado-sync` | ✅ `jira-sync` | ✅ | Both have |
| **Resource validator skill** | ✅ `ado-resource-validator` | ✅ `jira-resource-validator` | ✅ | Both have |
| **Mapper skill** | ✅ `specweave-ado-mapper` | ✅ `specweave-jira-mapper` | ✅ | Both have |

---

## 9. UNIQUE ADO FEATURES (JIRA MISSING)

1. **Repository Cloning** (`/specweave-ado:clone`)
   - N/A for JIRA (no repo concept) - Not a gap

2. **Process Template Detection**
   - ADO detects Agile/Scrum/CMMI/Basic/SAFe
   - **GAP: JIRA should detect Scrum vs Kanban vs Company-managed**

3. **Hierarchy Mapping by Template**
   - ADO: SAFe Capability→Epic→Feature→Story→Task
   - **GAP: JIRA needs template-aware hierarchy (Scrum vs Kanban)**

4. **Organization-Specific PATs**
   - ADO: `AZURE_DEVOPS_PAT_{ORG}`
   - **GAP: JIRA needs `JIRA_API_TOKEN_{DOMAIN}`**

5. **Dedicated Permission Gate**
   - ADO: `ado-permission-gate.ts`
   - **GAP: JIRA needs `jira-permission-gate.ts`**

---

## 10. UNIQUE GITHUB FEATURES (BOTH MISSING)

Both ADO and JIRA are missing these GitHub features:

1. **Three-Phase Duplicate Detection**
   - GitHub: Detection → Verification → Reflection
   - **GAP: Both ADO and JIRA need duplicate prevention**

2. **Reconcile Command**
   - GitHub: `/specweave-github:reconcile`
   - **GAP: Both need reconcile for drift detection**

3. **Cleanup Duplicates Command**
   - GitHub: `/specweave-github:cleanup-duplicates`
   - **GAP: Both need cleanup mechanism**

4. **Four Sync Strategies**
   - GitHub: project-per-spec, team-board, centralized, distributed
   - **GAP: ADO and JIRA only support subset**

5. **Cross-Team Detection**
   - GitHub: Auto-detects cross-team specs
   - **GAP: ADO and JIRA lack cross-team awareness**

---

## Acceptance Criteria

- [x] **AC-0120-01**: Document all command gaps between ADO and JIRA
- [x] **AC-0120-02**: Identify missing JIRA commands (create, close, status)
- [x] **AC-0120-03**: Analyze external item import differences
- [x] **AC-0120-04**: Compare permission handling completeness
- [x] **AC-0120-05**: Verify E-suffix consistency across both platforms
- [x] **AC-0120-06**: Document multi-project/2-level structure parity
- [x] **AC-0120-07**: Identify missing JIRA agents (sync-judge, multi-project-mapper)
- [x] **AC-0120-08**: Create prioritized remediation backlog

---

## Implementation Status (v0.33.0)

### P1 Gaps RESOLVED:

| Gap | Solution | File Created |
|-----|----------|--------------|
| GAP-001 | `/specweave-jira:create` command | `plugins/specweave-jira/commands/create.md` |
| GAP-002 | `/specweave-jira:close` command | `plugins/specweave-jira/commands/close.md` |
| GAP-003 | `/specweave-jira:status` command | `plugins/specweave-jira/commands/status.md` |
| GAP-004 | `JiraPermissionGate` class | `plugins/specweave-jira/lib/jira-permission-gate.ts` |
| GAP-005 | `JiraProfileResolver` class | `plugins/specweave-jira/lib/jira-profile-resolver.ts` |

### P2 Gaps RESOLVED:

| Gap | Solution | File Created |
|-----|----------|--------------|
| GAP-008 | Multi-org token support | `src/integrations/jira/jira-token-provider.ts` |
| GAP-010 | Standardized to `external_sync.jira.*` | Updated reference docs |

### P2 Gaps REMAINING:

| Gap | Status | Notes |
|-----|--------|-------|
| GAP-006 | Pending | JIRA sync-judge agent (future increment) |
| GAP-007 | Pending | JIRA multi-project-mapper agent (future increment) |
| GAP-009 | Pending | Parent item recovery in importer (future increment) |

### P3 Gaps (Future Work):

All P3 gaps require separate increments for GitHub-style features.

---

## Priority Remediation Backlog

### P1 - Critical (Missing Core Features)

| ID | Gap | Impact | Effort |
|----|-----|--------|--------|
| GAP-001 | JIRA missing `/specweave-jira:create` | Cannot create JIRA issues from SpecWeave | Medium |
| GAP-002 | JIRA missing `/specweave-jira:close` | Cannot close JIRA issues on completion | Medium |
| GAP-003 | JIRA missing `/specweave-jira:status` | No quick status check | Low |
| GAP-004 | JIRA missing permission gate module | Inconsistent permission handling | Medium |
| GAP-005 | JIRA missing profile resolver module | May pick wrong profile | Medium |

### P2 - Important (Feature Gaps)

| ID | Gap | Impact | Effort |
|----|-----|--------|--------|
| GAP-006 | JIRA missing sync-judge agent | No automated conflict decisions | High |
| GAP-007 | JIRA missing multi-project-mapper agent | Manual multi-project routing | High |
| GAP-008 | JIRA needs multi-org token support | Can't work with multiple JIRA instances | Low |
| GAP-009 | JIRA missing parent item recovery | May miss parent Epics in import | Medium |
| GAP-010 | Inconsistent metadata naming | Confusion between `external_sync` vs `external_ids` | Low |

### P3 - Enhancement (From GitHub)

| ID | Gap | Impact | Effort |
|----|-----|--------|--------|
| GAP-011 | Both missing duplicate detection | Risk of duplicate issues | High |
| GAP-012 | Both missing reconcile command | No drift detection | Medium |
| GAP-013 | Both missing cleanup-duplicates | Manual duplicate cleanup | Medium |
| GAP-014 | JIRA missing process template detection | No template-aware behavior | Medium |
| GAP-015 | Both lack cross-team detection | Manual cross-team coordination | High |

---

## Implementation Notes

### For JIRA Create Command
```typescript
// plugins/specweave-jira/commands/create.md
// Mirror ADO create command structure:
// 1. Check canUpdateExternalItems permission
// 2. Resolve profile (increment-specific or global)
// 3. Read spec.md for title/description
// 4. Create Epic via JIRA API
// 5. Store Epic key in metadata.json
// 6. Add initial comment with spec summary
```

### For JIRA Permission Gate
```typescript
// plugins/specweave-jira/lib/jira-permission-gate.ts
// Mirror ado-permission-gate.ts:
// - validateSyncPermissions(operation: 'push' | 'pull' | 'create' | 'close')
// - Return { allowed: boolean, reason?: string, suggestion?: string }
// - Suggest read-only alternative when write denied
```

### For Multi-Org Token Support
```bash
# .env support for multiple JIRA instances:
JIRA_API_TOKEN_ACME=xyz...
JIRA_API_TOKEN_CORP=abc...
JIRA_API_TOKEN=default...  # Fallback

# Resolution priority:
# 1. JIRA_API_TOKEN_{DOMAIN} (normalized, e.g., ACME for acme.atlassian.net)
# 2. JIRA_API_TOKEN (default)
```

---

## Related Increments

- 0081-ado-repo-cloning (reference for clone command)
- 0032-github-sync-architecture (reference for sync strategies)
- 0060-external-item-import (original import design)

## References

- [ADO Plugin](../../../plugins/specweave-ado/)
- [JIRA Plugin](../../../plugins/specweave-jira/)
- [GitHub Plugin](../../../plugins/specweave-github/)
- [Feature ID Derivation](../../../src/utils/feature-id-derivation.ts)
- [Structure Level Detector](../../../src/utils/structure-level-detector.ts)
