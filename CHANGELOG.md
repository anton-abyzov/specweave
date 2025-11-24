# Changelog

All notable changes to SpecWeave will be documented in this file.

---

## [0.24.8] - 2025-11-23
- Multi-repo initialization with platform registry improvements
- Git provider abstraction layer for multi-platform support
- Enhanced GitHub multi-repo validation and error handling

---

## [Unreleased]

### ✨ Features
- Judge-Based Marketplace Plugin Validation (LLM scoring system, 40-point threshold)
- Mandatory Post-Closure Quality Assessment (automatic QA after `/specweave:done`)

### 🗑️ Removed
- **Dead Code Cleanup**: Removed unused `PermissionsConfiguration` interface and top-level `permissions` config section
  - Legacy from pre-v0.23 architecture, replaced by `sync.settings.*` three-permission model
  - No impact on existing functionality (0 usage in codebase)
  - See ADR-0047 for three-permission architecture rationale

### 🐛 Fixed
- **Init Command**: Fixed `specweave init` still creating dead `permissions` config block
  - Types were removed in v0.24.12 (ADR-0071) but init.ts wasn't updated
  - Now only creates active `sync.settings.*` permissions (4-gate model)
  - No migration needed (config validator ignores unknown fields)

---

## [0.23.21] - 2025-11-22
- Enhanced marketplace validation with judge-based scoring
- Removed 6 incomplete plugins, achieved 100% health score

## [0.23.18] - 2025-11-22
- ADO auto-discovery improvements

## [0.23.17] - 2025-11-22
- GitHub issue format fixes

## [0.23.16] - 2025-11-22
- Hook performance optimizations

## [0.23.1] - 2025-11-20
- Task-User Story linkage validation
- GitHub sync improvements

## [0.23.0] - 2025-11-20
- Multi-project support
- External tool import (Phase 1)

## [0.22.14] - 2025-11-20
- Status line sync fixes

## [0.22.7] - 2025-11-19
- GitHub duplicate detection

## [0.22.6] - 2025-11-19
- Partial GitHub sync fixes

## [0.22.5] - 2025-11-19
- Yanked (incorrect fix)

---

**Note**: Older versions (0.22.4 and earlier) have been archived for performance. Full history available in git log.
