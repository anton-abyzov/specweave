---
id: US-003
feature: FS-152
title: "Xcode/iOS Test Support"
status: completed
priority: critical
created: 2026-01-02
project: specweave
---

# US-003: Xcode/iOS Test Support

**Feature**: [FS-152](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: Parse `xcodebuild test` output format ("Executed X tests, with Y failures")
- [x] **AC-US3-02**: Detect Xcode build failures vs test failures (different handling)
- [x] **AC-US3-03**: Extract failure details from Xcode output (file, line, error message)
- [x] **AC-US3-04**: Support Swift Package Manager test format (`swift test`)

---

## Implementation

**Increment**: [0152-auto-mode-reliability-improvements](../../../../increments/0152-auto-mode-reliability-improvements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add Xcode/iOS Test Parsing
- [x] **T-017**: Update Documentation
