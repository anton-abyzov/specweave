# Plan: Fix External Sync Tags, Status, and Types

## Implementation Phases

### Phase 1: ADO Fixes
1. Fix ADO status tags application (T-001)
2. Add ADO native priority field (T-003)
3. Add ADO Bug work item type support (T-005)

### Phase 2: JIRA Fixes
1. Add JIRA native priority field (T-002)
2. Add JIRA Bug issue type support (T-004)
3. Add graceful transition handling (T-009)

### Phase 3: GitHub Fixes
1. Fix GitHub label preservation (T-007)
2. Add priority to increment issues (T-008)
3. Add bug label support (T-006)

### Phase 4: Validation
1. Run tests (T-010)
2. Build verification
3. Manual testing if needed

## Files to Modify

| File | Changes |
|------|---------|
| `plugins/specweave-ado/lib/ado-status-sync.ts` | Add tag sync |
| `plugins/specweave-ado/lib/ado-spec-sync.ts` | Priority field, Bug type |
| `plugins/specweave-jira/lib/jira-spec-sync.ts` | Priority field, Bug type |
| `plugins/specweave-jira/lib/jira-status-sync.ts` | Graceful transitions |
| `plugins/specweave-github/lib/github-status-sync.ts` | Label preservation |
| `plugins/specweave-github/lib/increment-issue-builder.ts` | Priority labels, bug type |

## Risk Assessment

- **Low risk**: Changes are additive, existing functionality preserved
- **Medium risk**: ADO/JIRA API field names may vary by configuration
- **Mitigation**: Use optional field updates, graceful error handling
