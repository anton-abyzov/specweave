---
id: US-006
feature: FS-148
title: "Human-Gated Sensitive Operations"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-006: Human-Gated Sensitive Operations

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US6-01**: Define sensitive operation patterns in `.specweave/config.json` under `auto.humanGated`
- [x] **AC-US6-02**: Default gates: `deploy`, `migrate`, `publish`, `push --force`, `rm -rf`, API key requests
- [x] **AC-US6-03**: When gate triggered, auto pauses and outputs clear approval request
- [x] **AC-US6-04**: User must explicitly type "yes" or approve via UI to continue
- [x] **AC-US6-05**: Timeout for human response: configurable (default: 30 minutes), then pause session
- [x] **AC-US6-06**: All gated operations logged with timestamps and approval status
- [x] **AC-US6-07**: Option `--skip-gates <gate1,gate2>` to pre-approve specific operations
- [x] **AC-US6-08**: Never auto-approve: `push --force`, `rm -rf /`, production deployments

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-029**: Create human gate detector
- [x] **T-030**: Implement approval request flow
- [x] **T-031**: Implement approval timeout
- [x] **T-032**: Implement --skip-gates option
- [x] **T-033**: Add never-auto-approve rules
