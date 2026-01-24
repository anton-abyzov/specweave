---
id: terminal-empowerment
title: Terminal Empowerment - Your Superpower
sidebar_label: Terminal Basics
description: Why terminal gives you full control and simplifies everything - don't be afraid of it!
keywords: [terminal, command line, CLI, claude code, bash, developer tools]
---

# Terminal Empowerment - Your Superpower

## Don't Fear the Terminal!

The terminal is not scary. It's your **superpower**. While GUIs hide complexity behind buttons, the terminal gives you:

- **Full control** over exactly what happens
- **Reproducibility** - commands can be saved and repeated
- **Speed** - no clicking through menus
- **Composability** - chain commands together
- **Transparency** - see exactly what's happening

---

## Terminal is Simpler Than You Think

### GUI Way (Hidden Complexity)
```
1. Open app
2. Navigate menus
3. Find setting
4. Click buttons
5. Hope it worked
6. Where did it go?
```

### Terminal Way (Direct Control)
```bash
claude plugin install sw-frontend@specweave
# Done. You know exactly what happened.
```

---

## Claude Code CLI Basics

### Start a Session
```bash
claude                      # Interactive mode
claude -p "fix the bug"     # Run with prompt
```

### Use Skills
```bash
# Inside Claude Code session:
/sw:status                  # Check increment status
/sw:do                      # Execute tasks
/sw:progress                # See progress
```

### Install Plugins
```bash
claude plugin install sw@specweave
claude plugin list
```

---

## Why Terminal + AI = Perfect Match

1. **AI understands terminal** - Claude can write and run commands
2. **Commands are explicit** - No ambiguity about what to do
3. **History is preserved** - Every command logged
4. **Scriptable** - Automate repeated tasks

---

## Getting Started

### macOS/Linux
Terminal is built-in! Press `Cmd+Space`, type "Terminal", hit Enter.

### Windows
Use Windows Terminal (modern) or PowerShell:
```powershell
winget install Microsoft.WindowsTerminal
```

---

## Essential Commands for SpecWeave

```bash
# Navigation
cd my-project              # Change directory
ls                         # List files
pwd                        # Show current path

# SpecWeave
specweave init .           # Initialize project
specweave refresh-marketplace

# Claude Code
claude                     # Start session
claude plugin list         # Show plugins
claude mcp                 # Check MCP servers

# Git (works inside Claude too!)
git status
git add .
git commit -m "message"
```

---

## Pro Tips

1. **Tab completion** - Press Tab to auto-complete commands
2. **Command history** - Press Up/Down arrows to cycle through previous commands
3. **Copy/paste works** - Cmd+C/Cmd+V (or Ctrl on Windows)
4. **Exit** - Type `exit` or press Ctrl+D

---

## Remember

> "The terminal doesn't make things complicated. It makes the complexity visible. And visible complexity is manageable complexity."

The GUI hides what's happening. The terminal shows you. That's not harder - that's **empowering**.

---

## Learn More

- [Claude Code Hooks](https://code.claude.com/docs/en/hooks) - Official documentation on Claude Code's hook system for automation
- [Claude Code Skills](https://docs.anthropic.com/en/docs/claude-code/skills) - Skills and commands reference
