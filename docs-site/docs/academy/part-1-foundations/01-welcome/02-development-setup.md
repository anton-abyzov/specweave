---
sidebar_position: 2
title: "01.2 Development Environment Setup"
description: "Setting up the tools every developer needs"
---

# Lesson 01.2: Development Environment Setup

**Duration**: 60 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will have:
- Node.js and npm installed
- A code editor (VS Code) configured
- Git installed and configured
- SpecWeave installed globally
- Claude Code ready to use

---

## Overview

A professional development environment includes:

```
┌─────────────────────────────────────────────────────────┐
│                   Your Computer                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Node.js    │  │   VS Code    │  │     Git      │  │
│  │  (Runtime)   │  │   (Editor)   │  │  (Version)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  SpecWeave   │  │ Claude Code  │                     │
│  │  (Specs)     │  │    (AI)      │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Install Node.js

Node.js is the JavaScript runtime that powers modern web development.

### macOS

```bash
# Using Homebrew (recommended)
brew install node

# Verify installation
node --version  # Should show v18+ or v20+
npm --version   # Should show 9+ or 10+
```

### Windows

1. Download from [nodejs.org](https://nodejs.org)
2. Choose "LTS" (Long Term Support) version
3. Run the installer, accept defaults
4. Open PowerShell and verify:

```powershell
node --version
npm --version
```

### Linux (Ubuntu/Debian)

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

---

## Step 2: Install VS Code

Visual Studio Code is the most popular code editor for modern development.

### All Platforms

1. Download from [code.visualstudio.com](https://code.visualstudio.com)
2. Install and launch

### Essential Extensions

Open VS Code and install these extensions (Cmd/Ctrl + Shift + X):

| Extension | Purpose |
|-----------|---------|
| **ESLint** | Code quality |
| **Prettier** | Code formatting |
| **GitLens** | Git visualization |
| **Error Lens** | Inline error display |

### Recommended Settings

Open Settings (Cmd/Ctrl + ,) and add:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "files.autoSave": "onFocusChange"
}
```

---

## Step 3: Install Git

Git is version control — essential for all software development.

### macOS

```bash
# Usually pre-installed, or:
brew install git

# Verify
git --version
```

### Windows

1. Download from [git-scm.com](https://git-scm.com)
2. Run installer, accept defaults
3. Verify in PowerShell:

```powershell
git --version
```

### Linux

```bash
sudo apt-get install git
git --version
```

### Configure Git

```bash
# Set your identity (required for commits)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Verify
git config --list
```

---

## Step 4: Install SpecWeave

SpecWeave transforms how you build software with AI.

```bash
# Install globally
npm install -g specweave

# Verify installation
specweave --version
```

### What SpecWeave Provides

```
specweave
├── /specweave:increment    → Create new feature specs
├── /specweave:do           → Execute tasks
├── /specweave:done         → Complete with quality gates
├── /specweave:progress     → Check status
├── /specweave:validate     → Validate specs
└── /specweave:qa           → Quality assessment
```

---

## Step 5: Install Claude Code

Claude Code is the AI that powers SpecWeave.

### Installation

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Authenticate (requires Anthropic API key)
claude auth
```

### Verify

```bash
claude --version
```

### First Run

```bash
# Navigate to any project
cd ~/projects/my-project

# Start Claude Code
claude
```

---

## Step 6: Initialize a Test Project

Let's verify everything works:

```bash
# Create a test directory
mkdir ~/academy-test
cd ~/academy-test

# Initialize a Node.js project
npm init -y

# Initialize SpecWeave
specweave init .

# You should see:
# ✅ Created .specweave/ directory
# ✅ Created .specweave/config.json
# ✅ Ready to create increments!
```

### Project Structure After Init

```
~/academy-test/
├── package.json
└── .specweave/
    ├── config.json          ← SpecWeave configuration
    ├── increments/          ← Your specs will live here
    └── docs/                ← Living documentation
```

---

## Troubleshooting

### "npm: command not found"

Node.js isn't installed or not in PATH. Reinstall Node.js.

### "specweave: command not found"

```bash
# Check if npm global bin is in PATH
npm config get prefix

# Add to PATH (macOS/Linux)
export PATH="$PATH:$(npm config get prefix)/bin"
```

### "Permission denied" on npm install -g

```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use a Node version manager (recommended)
# See: https://github.com/nvm-sh/nvm
```

### Git "Author identity unknown"

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Environment Checklist

Before proceeding, verify all tools:

```bash
# Run these commands
node --version      # ✅ v18+ or v20+
npm --version       # ✅ 9+ or 10+
git --version       # ✅ 2.30+
specweave --version # ✅ Latest
claude --version    # ✅ Latest
```

All showing versions? **You're ready!**

---

## Key Takeaways

1. **Node.js** — JavaScript runtime for building applications
2. **VS Code** — Professional code editor with extensions
3. **Git** — Version control for tracking changes
4. **SpecWeave** — Spec-driven development framework
5. **Claude Code** — AI assistant that integrates with SpecWeave

---

## Next Lesson

Now let's learn the command line basics you'll use daily.

→ [Continue to Lesson 01.3: Command Line Essentials](./03-command-line)
