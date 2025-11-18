# GitHub Issue Created for Increment 0043

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Epic**: FS-043

---

## Summary

Successfully created GitHub issue for increment 0043 (Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools).

**GitHub Issue**: #611
**URL**: https://github.com/anton-abyzov/specweave/issues/611
**State**: OPEN
**Labels**: bug

---

## Issue Details

**Title**: [Increment 0043] Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools

**Priority**: P1 (Critical)
**Type**: Bug
**Epic**: FS-043
**Test Mode**: TDD
**Coverage Target**: 90%

---

## Issue Content

The GitHub issue includes:

1. **Overview**: Two critical sync infrastructure bugs
   - Bug 1: spec.md desync (metadata.json updated but spec.md frontmatter not updated)
   - Bug 2: Living docs sync doesn't trigger external tool updates

2. **Impact Analysis**: HIGH severity (P1)
   - Affects developers, contributors, CI/CD, stakeholders
   - Business value: productivity, data integrity, automation

3. **Root Cause Analysis**: Evidence from increments 0038, 0041
   - MetadataManager.updateStatus() updates metadata.json but not spec.md
   - Violates architectural principle (spec.md = source of truth)

4. **User Stories** (5 total):
   - US-001: Status Line Shows Correct Active Increment (P1)
   - US-002: spec.md and metadata.json Stay in Sync (P1)
   - US-003: Hooks Read Correct Increment Status (P1)
   - US-004: Existing Desyncs Detected and Repaired (P2)
   - US-005: Living Docs Sync Triggers External Tool Updates (P1)

5. **Technical Approach**:
   - Add SpecFrontmatterUpdater class
   - Update MetadataManager.updateStatus()
   - Validation and repair scripts
   - Living docs integration

6. **Test Strategy**: 90% coverage target
   - Unit tests (metadata-manager-spec-sync, spec-frontmatter-updater)
   - Integration tests (increment-status-sync, github-sync-living-docs)
   - E2E tests (increment-closure workflow)

7. **Success Criteria**:
   - Zero desync incidents (30 days post-deployment)
   - 100% status line accuracy
   - All existing desyncs repaired
   - 90%+ test coverage
   - < 10ms performance overhead

8. **Migration Plan**:
   - Phase 1: Repair existing desyncs
   - Phase 2: Deploy fix
   - Phase 3: Monitoring

9. **Related Documentation**: Links to living docs, architecture, implementation

---

## Metadata Update

Updated `.specweave/increments/0043-spec-md-desync-fix/metadata.json` with:

```json
{
  "github": {
    "issue_number": 611,
    "issue_url": "https://github.com/anton-abyzov/specweave/issues/611",
    "created_at": "2025-11-18T05:15:00Z",
    "last_synced_at": "2025-11-18T05:15:00Z"
  }
}
```

---

## Next Steps

1. Monitor GitHub issue for stakeholder feedback
2. Continue with increment planning (plan.md, tasks.md)
3. Update issue as implementation progresses
4. Sync living docs to GitHub after each milestone

---

## Notes

- Issue created without custom label "sync-infrastructure" (label doesn't exist in repository)
- Issue includes comprehensive context for stakeholders
- All 5 user stories with acceptance criteria included
- Technical approach and test strategy provided
- Migration plan outlines 3-phase deployment
- Links to living docs and architecture documentation included

---

**Created by**: SpecWeave GitHub Manager Agent
**Tool**: GitHub CLI (gh)
**Repository**: anton-abyzov/specweave
**Authentication**: GITHUB_TOKEN from .env
