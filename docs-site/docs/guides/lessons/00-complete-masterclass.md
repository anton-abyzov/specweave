---
sidebar_position: 0
title: "🎬 Complete Masterclass"
description: "61-minute video covering everything from installation to enterprise integrations"
---

# Complete Masterclass

**Finally: A Framework That Works on Legacy, Startup, AND Enterprise**

:::tip 📺 Video Tutorial
This 61-minute masterclass covers EVERYTHING you need to know about SpecWeave.
:::

## Watch the Video

<!-- Replace YOUTUBE_VIDEO_ID with your actual YouTube video ID after publishing -->
<!-- Example: If your YouTube URL is https://youtube.com/watch?v=ABC123, the ID is ABC123 -->

<div style={{position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%'}}>
  <iframe
    style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
    src="https://www.youtube.com/embed/YOUTUBE_VIDEO_ID"
    title="SpecWeave Complete Masterclass"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen>
  </iframe>
</div>

---

## What's Covered

| Timestamp | Section | Duration |
|-----------|---------|----------|
| 0:00 | Hook (The Pain → The Solution) | 1.5 min |
| 1:30 | The Problem (BMAD, SpecKit, chaos) | 5 min |
| 6:30 | What is SpecWeave? (15 agents, quick wins) | 4 min |
| 10:30 | Enterprise Engineering 101 + Hierarchy Mapping | 6 min |
| 16:30 | Project-Aware Sync & The /next Flow | 4 min |
| 20:30 | Plugins & Skills System | 4 min |
| 24:30 | Installation Mac & Windows | 5 min |
| 29:30 | VS Code + 4-Terminal Setup | 3 min |
| 32:30 | DEMO 1: Greenfield Project | 4 min |
| 36:30 | DEMO 2: Translation Feature | 3 min |
| 39:30 | DEMO 3: Brownfield (EasyChamp) — DEEP DIVE | 8 min |
| 47:30 | DEMO 4: GitHub Sync | 3 min |
| 50:30 | DEMO 5: JIRA Sync | 3 min |
| 53:30 | DEMO 6: Azure DevOps Sync | 3 min |
| 56:30 | AGENT.md for Non-Claude Tools | 2 min |
| 58:30 | Academy + Resources | 1.5 min |
| 60:00 | Outro (This was HUGE work!) | 1 min |

---

## Quick Start Commands

After watching, use these commands daily:

```bash
# Plan work
/specweave:increment "feature name"

# Execute tasks
/specweave:do

# Check progress
/specweave:progress

# Sync to GitHub/JIRA/ADO
/specweave:sync-progress

# Close when done
/specweave:done 0001
```

---

## VS Code Auto-Launch Setup

**Mac** (`settings.json`):
```json
{
    "terminal.integrated.profiles.osx": {
        "zsh": {
            "path": "zsh",
            "args": ["-i", "-c", "claude && exec zsh"]
        }
    },
    "terminal.integrated.defaultProfile.osx": "zsh"
}
```

**Windows** (`settings.json`):
```json
{
    "terminal.integrated.profiles.windows": {
        "PowerShell": {
            "source": "PowerShell",
            "args": ["-NoExit", "-Command", "claude"]
        }
    },
    "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

---

## Skip Permissions Function

Add to `~/.zshrc` (Mac) or PowerShell profile (Windows):

```bash
function claude() {
    command claude --dangerously-skip-permissions "$@"
}
```

Then run: `source ~/.zshrc`

:::warning
Only use `--dangerously-skip-permissions` on your OWN projects in trusted environments.
:::

---

## Full Script

The complete video script with all details is available in the repository:

📄 [View Full Script on GitHub](https://github.com/anthropics/specweave/blob/main/.specweave/docs/public/academy/videos/001-specweave-complete-masterclass.md)

---

## Next Steps

After watching the masterclass:

1. **Try it yourself** → [Lesson 1: Getting Started](./01-getting-started)
2. **Understand the structure** → [Lesson 2: Three-File Structure](./02-three-file-structure)
3. **Build something real** → [Lesson 3: Your First Increment](./03-your-first-increment)

---

## Resources

- ⭐ [Star on GitHub](https://github.com/anthropics/specweave) — helps others find SpecWeave!
- 📖 [Full Documentation](/docs)
- 💬 [Report Issues](https://github.com/anthropics/specweave/issues)
