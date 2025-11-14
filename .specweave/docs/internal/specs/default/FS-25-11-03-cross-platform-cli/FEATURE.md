---
id: FS-25-11-03-cross-platform-cli
title: "Increment Specification: Cross-Platform CLI Support"
type: epic
status: complete
created: 2025-11-14
last_updated: 2025-11-14
external_tools:
  github:
    type: issue
    id: 387
    url: https://github.com/anton-abyzov/specweave/issues/387
---

# FS-25-11-03-cross-platform-cli: Increment Specification: Cross-Platform CLI Support

**What**: Ensure SpecWeave CLI works correctly on Windows, macOS, and Linux by fixing NPM path detection

**Why**: v0.5.0 hardcoded macOS/Linux paths, preventing Windows users from using Copilot adapter

**Scope**: NARROW - Single function fix (`getSpecweaveInstallPath`) with comprehensive platform support

---

## Implementation History

| Increment | User Stories | Status | Completion Date |
|-----------|--------------|--------|----------------|
| [0005-cross-platform-cli](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/0005-cross-platform-cli) | US-001 through US-003 (all) | ✅ Complete | 2025-11-14 |

**Overall Progress**: 3/3 user stories complete (100%)

---

## User Stories

- [US-001: Windows User Installs SpecWeave](us-001-windows-user-installs-specweave.md) - ✅ Complete
- [US-002: macOS User with Apple Silicon](us-002-macos-user-with-apple-silicon.md) - ✅ Complete
- [US-003: Linux User with Custom NPM Prefix](us-003-linux-user-with-custom-npm-prefix.md) - ✅ Complete

---

## External Tool Integration

**GitHub Issue**: [#334 - [FS-25-11-03]](https://github.com/anton-abyzov/specweave/issues/334)
**JIRA Epic**: [SCRUM-26](https://jira.atlassian.com/browse/SCRUM-26)
