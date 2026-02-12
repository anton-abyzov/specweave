---
title: Agent Teams Setup Guide
description: Get Agent Teams running in 5 minutes with SpecWeave
---

# Agent Teams Setup Guide

Quick setup for parallel multi-agent development with SpecWeave.

## Prerequisites

- Claude Code CLI installed
- SpecWeave initialized in your project (`specweave init`)
- Terminal: tmux (recommended) or iTerm2 (macOS)

## Step 1: Install Terminal Multiplexer

### tmux (Recommended — Cross-Platform)
```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt install tmux

# Windows (WSL)
sudo apt install tmux
```

### iTerm2 (macOS Alternative)
- Install from iterm2.com
- Enable Shell Integration: iTerm2 → Install Shell Integration
- Enable Python API: Settings → General → Magic → Enable Python API

## Step 2: Enable Agent Teams

Add to your `.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Restart Claude Code after changing settings.

## Step 3: Run Your First Team

### Quick Start with Presets
```bash
/sw:team-build --preset full-stack "Build user authentication"
```

### Custom Orchestration
```bash
/sw:team-lead "Build checkout with Stripe payments, React frontend, and Node.js backend"
```

## Step 4: Monitor Progress

```bash
/sw:team-status          # One-time check
/sw:team-status --watch  # Auto-refresh
```

## Step 5: Merge Results

```bash
/sw:team-merge           # Merge all agent work
```

## Available Presets

| Preset | Agents | Use When |
|--------|--------|----------|
| `full-stack` | 3 (shared → backend + frontend) | Building features across stack |
| `review` | 3 (security + quality + docs) | Code review before release |
| `testing` | 3 (unit + e2e + coverage) | Comprehensive test generation |
| `tdd` | 3 (red → green → refactor) | Test-driven development |
| `migration` | 3 (schema → backend + frontend) | Database or API migrations |

## Terminal Navigation

| Mode | How to Switch Panes |
|------|-------------------|
| tmux | `Ctrl+B` then arrow keys |
| iTerm2 | Click on pane |
| In-process | `Shift+Up` / `Shift+Down` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Agents not spawning | Verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set. Restart Claude Code. |
| tmux panes freeze | `tmux kill-server` and retry. Use in-process mode as fallback. |
| File conflicts between agents | Check file ownership with `--dry-run` flag before launching. |
| Token costs too high | Use smaller presets or `--max-agents 2`. |

## Further Reading

- [Agent Teams & Swarms Guide](./agent-teams-and-swarms.md) — Architecture and concepts
- `/sw:team-lead` — Custom team formation
- `/sw:team-build` — Preset-based team launch
