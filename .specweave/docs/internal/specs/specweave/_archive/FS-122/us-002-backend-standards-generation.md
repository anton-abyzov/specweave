---
id: US-002
feature: FS-122
title: Backend Standards Generation
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 859
    url: https://github.com/anton-abyzov/specweave/issues/859
---

# US-002: Backend Standards Generation

**Feature**: [FS-122](./FEATURE.md)

**As a** developer onboarding to a new project
**I want** coding standards documented for each backend technology
**So that** I know the conventions for Python, Go, Java, etc.

---

## Acceptance Criteria

- [x] **AC-US2-01**: Parse Python configs (`pyproject.toml`, `.pylintrc`, `ruff.toml`, `.flake8`, `mypy.ini`)
- [x] **AC-US2-02**: Parse Go configs (`go.mod`, `.golangci.yml`, `staticcheck.conf`)
- [x] **AC-US2-03**: Parse Java configs (`checkstyle.xml`, `pmd.xml`, `spotbugs.xml`)
- [x] **AC-US2-04**: Generate `governance/standards/python.md` with formatter, linter, type checker info
- [x] **AC-US2-05**: Generate `governance/standards/golang.md` with Go version, linter rules
- [x] **AC-US2-06**: Generate `governance/standards/java.md` with style checker rules

---

## Implementation

**Increment**: [0122-multi-technology-governance](../../../../increments/0122-multi-technology-governance/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Create Python Standards Parser
- [x] **T-003**: Create Go Standards Parser
- [x] **T-004**: Create Java Standards Parser
- [x] **T-006**: Create Standards Markdown Generator
