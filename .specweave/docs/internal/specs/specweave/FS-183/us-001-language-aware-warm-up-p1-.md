---
id: US-001
feature: FS-183
title: "Language-Aware Warm-up (P1)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer working on C#/Python/Go/Rust projects
**I want** LSP warm-up to detect my project's language and use appropriate strategy
**So that** semantic code intelligence works on first invocation without manual configuration."
project: specweave
---

# US-001: Language-Aware Warm-up (P1)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer working on C#/Python/Go/Rust projects
**I want** LSP warm-up to detect my project's language and use appropriate strategy
**So that** semantic code intelligence works on first invocation without manual configuration

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Given a project with .sln/.csproj files, when warm-up runs, then C# strategy is used (detect solution, open .cs files)
- [ ] **AC-US1-02**: Given a project with go.mod, when warm-up runs, then Go strategy is used
- [ ] **AC-US1-03**: Given multiple .sln files at root, when warm-up runs, then user is prompted to choose (choice cached)
- [ ] **AC-US1-04**: Given warm-up with `--skip-warmup` flag, when command runs, then warm-up phase is skipped
- [ ] **AC-US1-05**: Given sequential warm-up, when files are opened, then they are opened one-by-one (not parallel)

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: [RED] Write failing tests for WarmupStrategy interface
- [x] **T-006**: [GREEN] Implement WarmupStrategy interface and executor
- [x] **T-009**: [RED] Write failing tests for C# warm-up strategy
- [x] **T-010**: [GREEN] Implement C# warm-up strategy
- [x] **T-011**: [RED] Write failing tests for Go/TypeScript/Python/Rust strategies
- [x] **T-012**: [GREEN] Implement Go/TypeScript/Python/Rust strategies
- [x] **T-013**: [RED] Write failing test for --skip-warmup flag
- [x] **T-014**: [GREEN] Add --skip-warmup CLI flag
