---
id: FS-25-11-03-plugin-architecture
title: "Product Specification: Plugin Architecture"
type: epic
status: complete
created: 2025-11-14
last_updated: 2025-11-14
---

# FS-25-11-03-plugin-architecture: Product Specification: Plugin Architecture

Transform SpecWeave from a monolithic skill/agent bundle into a **modular plugin architecture** that:
- Reduces context usage by 60-80% (only load what you need)
- Enables community contributions (publish to Anthropic's marketplace)
- Maintains multi-tool support (Claude, Cursor 2.0, Copilot, Generic)
- Preserves Claude Code's superiority (native hooks, auto-activation, MCP)

**Core Insight**: SpecWeave currently loads 44 skills + 20 agents + 18 commands for EVERY project, even if they never touch Kubernetes or ML. Plugin architecture makes SpecWeave contextually lightweight while remaining feature-rich.

---

## Implementation History

| Increment | User Stories | Status | Completion Date |
|-----------|--------------|--------|----------------|
| [0004-plugin-architecture](../../../../increments/0004-plugin-architecture/tasks.md) | US-001 through US-015 (all) | ✅ Complete | 2025-11-14 |

**Overall Progress**: 15/15 user stories complete (100%)

---

## User Stories

- [US-001: Core Framework Separation](us-001-core-framework-separation.md) - ✅ Complete
- [US-002: Auto-Detect Plugins from Project](us-002-auto-detect-plugins-from-project.md) - ✅ Complete
- [US-003: Spec-Based Plugin Detection](us-003-spec-based-plugin-detection.md) - ✅ Complete
- [US-004: Manual Plugin Management](us-004-manual-plugin-management.md) - ✅ Complete
- [US-005: Plugin Lifecycle Hooks](us-005-plugin-lifecycle-hooks.md) - ✅ Complete
- [US-006: Claude Code Plugin Installer (Native)](us-006-claude-code-plugin-installer-native.md) - ✅ Complete
- [US-007: Cursor Plugin Compiler](us-007-cursor-plugin-compiler.md) - ✅ Complete
- [US-008: Copilot Plugin Compiler](us-008-copilot-plugin-compiler.md) - ✅ Complete
- [US-009: Generic Plugin Compiler](us-009-generic-plugin-compiler.md) - ✅ Complete
- [US-010: Marketplace Publication](us-010-marketplace-publication.md) - ✅ Complete
- [US-011: Documentation Overhaul - Claude Code Superiority](us-011-documentation-overhaul-claude-code-superiority.md) - ✅ Complete
- [US-012: GitHub Plugin Integration](us-012-github-plugin-integration.md) - ✅ Complete
- [US-013: Attribution for Borrowed Plugins](us-013-attribution-for-borrowed-plugins.md) - ✅ Complete
- [US-014: RFC Folder Consolidation](us-014-rfc-folder-consolidation.md) - ✅ Complete
- [US-015: GitHub-First Task-Level Synchronization](us-015-github-first-task-level-synchronization.md) - ✅ Complete

---

## External Tool Integration

**GitHub Issue**: [#195 - Feature](https://github.com/anton-abyzov/specweave/issues/195)
**JIRA Epic**: [SCRUM-25](https://jira.atlassian.com/browse/SCRUM-25)
