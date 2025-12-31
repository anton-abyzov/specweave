# Runbook: Node.js Version Management (nvm)

**Category**: Development Environment
**Audience**: Developers, Contributors, End Users
**Last Updated**: 2025-12-31
**Related**: [Installation Guide](../../public/guides/getting-started/installation.md)

## Overview

This runbook covers Node.js version management using nvm (Node Version Manager), including the critical issue of global packages being lost when switching Node versions.

### Purpose

- Manage multiple Node.js versions on the same machine
- Switch between Node versions for different projects
- Understand and solve global package loss when upgrading Node
- Maintain consistent development environments

### When to Use This Guide

- ✅ Upgrading from Node 18 to Node 20/22
- ✅ Switching Node versions for different projects
- ✅ Fixing "command not found" errors after Node upgrade
- ✅ Setting up development environment on new machine
- ✅ Troubleshooting nvm-related issues

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Common Operations](#common-operations)
4. [Global Packages Issue (CRITICAL)](#global-packages-issue-critical)
5. [Project-Specific Node Versions](#project-specific-node-versions)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [CI/CD Considerations](#cicd-considerations)

---

## Prerequisites

### Check Current Setup

```bash
# Check if nvm is installed
command -v nvm

# Check current Node version
node --version

# Check npm version
npm --version

# Check global packages (before switching)
npm list -g --depth=0
```

### System Requirements

| Platform | Requirements |
|----------|-------------|
| **macOS** | bash/zsh shell, Xcode Command Line Tools |
| **Linux** | bash/zsh shell, build-essential (Ubuntu/Debian) |
| **Windows** | WSL2 (recommended) or nvm-windows |

---

## Installation

### macOS/Linux

```bash
# Download and install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Or using wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Add to shell profile (if not auto-added)
# For bash (~/.bashrc or ~/.bash_profile):
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# For zsh (~/.zshrc):
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Verify installation
nvm --version
```

### Windows (WSL2 Recommended)

**Option 1: WSL2 (Best compatibility)**
```bash
# Install WSL2 first, then use Linux instructions above
wsl --install
```

**Option 2: nvm-windows (Native)**
```powershell
# Download installer from:
# https://github.com/coreybutler/nvm-windows/releases

# After install, verify:
nvm version
```

---

## Common Operations

### Installing Node Versions

```bash
# Install latest LTS version (recommended)
nvm install --lts

# Install specific version
nvm install 18
nvm install 20
nvm install 22

# Install latest version
nvm install node

# List available versions (remote)
nvm ls-available

# List installed versions (local)
nvm ls
```

### Switching Node Versions

```bash
# Use specific version
nvm use 18
nvm use 20
nvm use 22

# Use latest LTS
nvm use --lts

# Use version from .nvmrc file
nvm use

# Verify current version
node --version
```

### Setting Default Version

```bash
# Set default Node version (used in new shells)
nvm alias default 22

# Set default to LTS
nvm alias default node

# Verify default
nvm alias default
```

### Uninstalling Node Versions

```bash
# Uninstall specific version
nvm uninstall 18

# Cannot uninstall currently active version
# Switch first: nvm use 20
```

---

## Global Packages Issue (CRITICAL)

### The Problem

**CRITICAL: When you switch Node versions using nvm, all global npm packages are LOST!**

```bash
# You're on Node 18 with global packages
$ node --version
v18.x.x

$ npm list -g --depth=0
├── specweave@1.0.65
├── claude@2.0.0
├── typescript@5.3.3
└── ... (other global packages)

# Switch to Node 22
$ nvm install 22
$ nvm use 22

# All global packages are GONE!
$ specweave --version
bash: specweave: command not found

$ claude --version
bash: claude: command not found
```

### Why This Happens

Each Node version managed by nvm has **its own separate global node_modules directory**:

```
~/.nvm/versions/node/
├── v18.20.0/
│   └── lib/node_modules/        ← Node 18 globals here
│       ├── specweave/
│       ├── claude/
│       └── typescript/
├── v20.11.0/
│   └── lib/node_modules/        ← Node 20 globals here (empty!)
└── v22.0.0/
    └── lib/node_modules/        ← Node 22 globals here (empty!)
```

When you switch to Node 22, you're looking at an **empty global node_modules**.

### Solution 1: Manual Reinstall (Quick Fix)

```bash
# After switching to Node 22
nvm use 22

# Reinstall essential global packages
npm install -g specweave
npm install -g @anthropic-ai/claude-code
npm install -g typescript

# Verify
specweave --version
claude --version
tsc --version
```

### Solution 2: Auto-Copy Packages (Recommended)

**Copy ALL global packages from old version to new version:**

```bash
# Method A: During install
nvm install 22 --reinstall-packages-from=18

# Method B: After install
nvm use 22
nvm reinstall-packages 18

# This copies ALL global packages from Node 18 to Node 22
```

### Solution 3: Package List Backup/Restore (Best Practice)

**Before switching, save your global packages:**

```bash
# 1. List current global packages
npm list -g --depth=0 --json > ~/nvm-globals-backup.json

# Or simpler format:
npm list -g --depth=0 > ~/nvm-globals.txt

# 2. Switch Node version
nvm install 22
nvm use 22

# 3. Reinstall from list
cat ~/nvm-globals.txt | grep -E "├──|└──" | sed 's/[├└]── //g' | sed 's/@.*//g' | xargs -n1 npm install -g
```

### Solution 4: Shell Script (Automated)

Create `~/.nvm-backup-globals.sh`:

```bash
#!/bin/bash
# Backup and restore global npm packages when switching Node versions

# Usage:
#   ./nvm-backup-globals.sh backup    # Save current globals
#   ./nvm-backup-globals.sh restore   # Reinstall from backup

BACKUP_FILE="$HOME/.nvm-global-packages.txt"

case "$1" in
  backup)
    echo "Backing up global packages..."
    npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > "$BACKUP_FILE"
    echo "Saved to $BACKUP_FILE"
    cat "$BACKUP_FILE"
    ;;
  restore)
    if [ ! -f "$BACKUP_FILE" ]; then
      echo "No backup found at $BACKUP_FILE"
      exit 1
    fi
    echo "Restoring global packages..."
    cat "$BACKUP_FILE" | xargs npm install -g
    echo "Done!"
    ;;
  *)
    echo "Usage: $0 {backup|restore}"
    exit 1
    ;;
esac
```

**Usage:**

```bash
# Before switching (on Node 18)
chmod +x ~/.nvm-backup-globals.sh
~/.nvm-backup-globals.sh backup

# After switching (on Node 22)
nvm use 22
~/.nvm-backup-globals.sh restore
```

---

## Project-Specific Node Versions

### Using .nvmrc

Create `.nvmrc` file in project root:

```bash
# In your project directory
echo "22" > .nvmrc

# Or specific version
echo "22.0.0" > .nvmrc

# Or LTS
echo "lts/*" > .nvmrc
```

**Auto-switch on cd:**

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Auto-load .nvmrc
autoload -U add-zsh-hook
load-nvmrc() {
  if [[ -f .nvmrc && -r .nvmrc ]]; then
    nvm use
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

### Using package.json engines

Specify Node version in `package.json`:

```json
{
  "name": "your-project",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**Enforce version:**

Add to `.npmrc`:

```
engine-strict=true
```

---

## Troubleshooting

### Issue: nvm command not found

**Symptoms:**
```bash
$ nvm --version
bash: nvm: command not found
```

**Solution:**

```bash
# Check if nvm is installed
ls -la ~/.nvm

# If installed, reload shell profile
source ~/.bashrc  # or ~/.zshrc

# If not installed, install nvm first
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
```

### Issue: Wrong Node version after restart

**Symptoms:**
```bash
# Set nvm use 22, but after terminal restart:
$ node --version
v18.x.x  # Wrong version!
```

**Solution:**

```bash
# Set default version
nvm alias default 22

# Or use .nvmrc in project
echo "22" > .nvmrc
nvm use
```

### Issue: npm install fails after Node upgrade

**Symptoms:**
```bash
$ npm install
npm ERR! Unsupported engine
```

**Solution:**

```bash
# Check Node version
node --version

# Check package.json engines
cat package.json | grep -A3 engines

# Use correct Node version
nvm use 18  # or whatever package.json requires
```

### Issue: Global package installed but command not found

**Symptoms:**
```bash
$ npm install -g specweave
# Success

$ specweave --version
bash: specweave: command not found
```

**Solution:**

```bash
# Check npm global bin path
npm bin -g
# Example output: /Users/you/.nvm/versions/node/v22.0.0/bin

# Check if it's in PATH
echo $PATH | grep -o '/Users/you/.nvm/versions/node/v22.0.0/bin'

# If not in PATH, reload nvm
source ~/.bashrc  # or ~/.zshrc

# Or add manually to PATH
export PATH="$(npm bin -g):$PATH"
```

### Issue: Conflicting Node installations

**Symptoms:**
```bash
$ which node
/usr/local/bin/node  # System Node, not nvm

$ nvm use 22
# But still using system Node
```

**Solution:**

```bash
# Uninstall system Node (macOS)
brew uninstall node

# Or remove from PATH
# Edit ~/.bashrc or ~/.zshrc and ensure nvm is FIRST in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Reload
source ~/.bashrc
```

---

## Best Practices

### 1. Always Use .nvmrc in Projects

```bash
# In project root
echo "22" > .nvmrc

# Commit to git
git add .nvmrc
git commit -m "Add .nvmrc for Node version consistency"
```

### 2. Document Node Requirements

In `README.md`:

```markdown
## Prerequisites

- Node.js 18+ (22 recommended)
- npm 9+

**Using nvm (recommended):**

\`\`\`bash
nvm install
nvm use
\`\`\`
```

### 3. Use LTS Versions in Production

```bash
# Install latest LTS
nvm install --lts

# Set as default
nvm alias default lts/*
```

### 4. Keep a Global Packages List

Create `~/.global-npm-packages.txt`:

```
specweave
@anthropic-ai/claude-code
typescript
ts-node
nodemon
prettier
eslint
```

**Restore script:**

```bash
cat ~/.global-npm-packages.txt | xargs npm install -g
```

### 5. Test Before Major Node Upgrades

```bash
# Install new version without switching
nvm install 22

# Test in new version
nvm use 22
npm test

# If fails, revert
nvm use 18
```

---

## CI/CD Considerations

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### Docker

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

CMD ["npm", "start"]
```

### .nvmrc in CI

```yaml
# Use .nvmrc automatically
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
```

---

## Quick Reference Card

### Essential Commands

| Command | Description |
|---------|-------------|
| `nvm install 22` | Install Node 22 |
| `nvm use 22` | Switch to Node 22 |
| `nvm alias default 22` | Set Node 22 as default |
| `nvm ls` | List installed versions |
| `nvm current` | Show current version |
| `nvm install 22 --reinstall-packages-from=18` | Copy globals from 18 to 22 |
| `nvm reinstall-packages 18` | Copy globals to current version |

### Global Package Management

| Command | Description |
|---------|-------------|
| `npm list -g --depth=0` | List global packages |
| `npm install -g <package>` | Install global package |
| `npm uninstall -g <package>` | Uninstall global package |
| `npm update -g` | Update all global packages |
| `npm outdated -g` | Check outdated globals |

### Troubleshooting Commands

| Command | Description |
|---------|-------------|
| `which node` | Find Node binary location |
| `npm bin -g` | Find global bin directory |
| `nvm which current` | Path to current Node binary |
| `nvm cache clear` | Clear nvm download cache |
| `nvm deactivate` | Stop using nvm in current shell |

---

## Related Documentation

- [Installation Guide](../../public/guides/getting-started/installation.md)
- [Troubleshooting Guide](../troubleshooting/)
- [SpecWeave Requirements](../../public/guides/getting-started/quickstart.md)

---

## Escalation & Ownership

**Primary Contact**: Development Team
**Secondary**: DevOps Team
**Escalation Path**: GitHub Issues → Discord Support

---

**Last Reviewed**: 2025-12-31
**Next Review**: 2026-06-30
