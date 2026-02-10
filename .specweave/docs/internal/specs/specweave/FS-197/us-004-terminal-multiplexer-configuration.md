---
id: US-004
feature: FS-197
title: "Terminal Multiplexer Configuration"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer who wants visual split-pane monitoring
**I want** clear guidance on setting up tmux or iTerm2 for Agent Teams
**So that** I can see all agents working simultaneously in split panes."
project: specweave
---

# US-004: Terminal Multiplexer Configuration

**Feature**: [FS-197](./FEATURE.md)

**As a** developer who wants visual split-pane monitoring
**I want** clear guidance on setting up tmux or iTerm2 for Agent Teams
**So that** I can see all agents working simultaneously in split panes

---

## Acceptance Criteria

- [x] **AC-US4-01**: SKILL.md detects terminal mode: tmux installed → recommend tmux; macOS + iTerm2 → offer as alternative; neither → default to in-process
- [x] **AC-US4-02**: Setup instructions for tmux (brew install tmux / apt install tmux / WSL setup)
- [x] **AC-US4-03**: Setup instructions for iTerm2 (it2 CLI + Python API)
- [x] **AC-US4-04**: In-process mode works without any terminal multiplexer (Shift+Up/Down to navigate)
- [x] **AC-US4-05**: Navigation guide: tmux (Ctrl+B + arrow), iTerm2 (click pane), in-process (Shift+Up/Down)
- [x] **AC-US4-06**: `settings.json` configuration example for enabling agent teams per-project

---

## Implementation

**Increment**: [0197-native-agent-teams](../../../../increments/0197-native-agent-teams/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
