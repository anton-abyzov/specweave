---
id: US-001
feature: FS-122
title: Multi-Ecosystem Detection
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 858
    url: https://github.com/anton-abyzov/specweave/issues/858
---

# US-001: Multi-Ecosystem Detection

**Feature**: [FS-122](./FEATURE.md)

**As a** tech lead with a polyglot codebase
**I want** SpecWeave to detect all technology ecosystems present
**So that** I know which coding standards documents will be generated

---

## Acceptance Criteria

- [x] **AC-US1-01**: Detect TypeScript/JavaScript via `package.json`
- [x] **AC-US1-02**: Detect Python via `requirements.txt`, `pyproject.toml`, `setup.py`
- [x] **AC-US1-03**: Detect Go via `go.mod`
- [x] **AC-US1-04**: Detect Java/Kotlin via `pom.xml`, `build.gradle`, `build.gradle.kts`
- [x] **AC-US1-05**: Detect C#/.NET via `*.csproj`, `*.sln`
- [x] **AC-US1-06**: Detect Rust via `Cargo.toml`
- [x] **AC-US1-07**: Return list of detected ecosystems with confidence levels

---

## Implementation

**Increment**: [0122-multi-technology-governance](../../../../increments/0122-multi-technology-governance/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Ecosystem Detector
