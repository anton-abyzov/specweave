---
id: US-001
feature: FS-099
title: "Deep Analysis with MAX Subscription"
status: completed
priority: P1
created: 2025-12-04
---

**Origin**: 🏠 **Internal**


# US-001: Deep Analysis with MAX Subscription

**Feature**: [FS-099](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Claude Code provider exists and spawns `claude --print` subprocesses
- [x] **AC-US1-02**: Default model is Opus 4.5 (not Sonnet)
- [x] **AC-US1-03**: Living docs worker uses ClaudeCodeProvider when depth === 'deep-native'
- [x] **AC-US1-04**: Background worker correctly processes analysis requests
- [x] **AC-US1-05**: Provider returns structured JSON with token usage

---

## Implementation

**Increment**: [0099-claude-code-native-background](../../../../increments/0099-claude-code-native-background/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0099-claude-code-native-background/tasks.md#T-001): Create LLM Provider Types
- [x] [T-002](../../../../increments/0099-claude-code-native-background/tasks.md#T-002): Create Claude Code Provider
- [x] [T-003](../../../../increments/0099-claude-code-native-background/tasks.md#T-003): Update Default Model to Opus 4.5
- [x] [T-004](../../../../increments/0099-claude-code-native-background/tasks.md#T-004): Create Proof of Concept
- [x] [T-005](../../../../increments/0099-claude-code-native-background/tasks.md#T-005): Wire Living Docs Worker to ClaudeCodeProvider
- [x] [T-006](../../../../increments/0099-claude-code-native-background/tasks.md#T-006): Build and Verify Compilation
- [x] [T-007](../../../../increments/0099-claude-code-native-background/tasks.md#T-007): Cross-Platform Support
- [x] [T-008](../../../../increments/0099-claude-code-native-background/tasks.md#T-008): Add --dangerously-skip-permissions Flag
- [x] [T-009](../../../../increments/0099-claude-code-native-background/tasks.md#T-009): Non-Claude Fallback Detection
- [x] [T-010](../../../../increments/0099-claude-code-native-background/tasks.md#T-010): Fix Node.js Spawn stdin Handling
- [x] [T-011](../../../../increments/0099-claude-code-native-background/tasks.md#T-011): Integrate AI Analysis into Living Docs Worker