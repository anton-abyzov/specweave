---
id: US-006
feature: FS-160
title: "cache-status CLI Command"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-006: cache-status CLI Command

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Command: `specweave cache-status` shows all plugins
- [ ] **AC-US6-02**: Command: `specweave cache-status sw` shows specific plugin
- [ ] **AC-US6-03**: Flag: `--fix` auto-fixes detected issues
- [ ] **AC-US6-04**: Flag: `--verbose` shows detailed diagnostics
- [ ] **AC-US6-05**: Flag: `--check-github` forces GitHub API check (uses rate limit)
- [ ] **AC-US6-06**: Output format: plugin name, version, health status (✅/⚠️/❌), issues list, fix suggestions
- [ ] **AC-US6-07**: Summary line: "X healthy, Y stale, Z critical"

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-022**: Add CLI help documentation
- [ ] **T-024**: Update CLAUDE.md with troubleshooting
