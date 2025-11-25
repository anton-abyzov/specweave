---
sidebar_position: 3
title: "01.3 Command Line Essentials"
description: "Terminal commands every developer needs to know"
---

# Lesson 01.3: Command Line Essentials

**Duration**: 30 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Navigate the file system confidently
- Create, move, and delete files/folders
- Understand paths (absolute vs relative)
- Know essential commands for daily use

---

## Why Command Line?

GUI (graphical interfaces) are convenient, but the command line is:

| Command Line | GUI |
|--------------|-----|
| Scriptable & automatable | Manual clicks |
| Works over SSH (remote servers) | Requires desktop access |
| Precise control | Limited options |
| Same everywhere | Different per OS |
| **Required for development** | Optional |

Every professional developer uses the terminal daily.

---

## Opening the Terminal

### macOS
- Press `Cmd + Space`, type "Terminal", Enter
- Or: Applications → Utilities → Terminal

### Windows
- Press `Win + X`, select "Windows Terminal" or "PowerShell"
- Or: Search for "PowerShell"

### Linux
- Press `Ctrl + Alt + T`
- Or: Search for "Terminal"

---

## Essential Commands

### Navigation

```bash
# Where am I?
pwd                     # Print Working Directory
# Output: /Users/yourname

# What's here?
ls                      # List files
ls -la                  # List ALL files with details

# Go somewhere
cd Documents           # Change Directory (relative)
cd /Users/yourname     # Change Directory (absolute)
cd ..                  # Go up one level
cd ~                   # Go to home directory
cd -                   # Go to previous directory
```

### File Operations

```bash
# Create
touch file.txt          # Create empty file
mkdir my-folder         # Create directory
mkdir -p a/b/c          # Create nested directories

# Copy
cp file.txt backup.txt  # Copy file
cp -r folder/ backup/   # Copy directory (recursive)

# Move/Rename
mv file.txt new.txt     # Rename file
mv file.txt folder/     # Move file to folder

# Delete (careful!)
rm file.txt             # Delete file
rm -r folder/           # Delete directory
rm -rf folder/          # Force delete (DANGEROUS)
```

### Viewing Content

```bash
# View file
cat file.txt            # Print entire file
head file.txt           # First 10 lines
tail file.txt           # Last 10 lines
less file.txt           # Scrollable viewer (q to quit)

# Search
grep "pattern" file.txt        # Find text in file
grep -r "pattern" folder/      # Find in all files
```

---

## Paths Explained

### Absolute Paths

Start from root (`/` on Mac/Linux, `C:\` on Windows):

```bash
/Users/yourname/Documents/project/src/index.ts
```

### Relative Paths

Start from current directory:

```bash
# If you're in /Users/yourname/Documents/project/
./src/index.ts          # Same as src/index.ts
../other-project/       # Sibling directory
../../                  # Two levels up
```

### Special Symbols

| Symbol | Meaning |
|--------|---------|
| `.` | Current directory |
| `..` | Parent directory |
| `~` | Home directory |
| `/` | Root directory |

---

## Commands for Development

### npm Commands

```bash
npm init -y              # Initialize package.json
npm install              # Install dependencies
npm install package      # Install specific package
npm run build            # Run build script
npm test                 # Run tests
```

### Git Commands (preview)

```bash
git status               # Check current state
git add .                # Stage all changes
git commit -m "message"  # Create commit
git push                 # Push to remote
git pull                 # Pull from remote
```

### SpecWeave Commands

```bash
specweave init .         # Initialize in current directory
specweave status         # Check increment status
```

---

## Useful Shortcuts

### Terminal Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Autocomplete paths/commands |
| `Ctrl + C` | Cancel current command |
| `Ctrl + L` | Clear screen |
| `Ctrl + A` | Go to line start |
| `Ctrl + E` | Go to line end |
| `↑` / `↓` | Previous/next command |
| `Ctrl + R` | Search command history |

### Example: Tab Completion

```bash
# Type partial path, press Tab
cd Doc[Tab]
# Completes to:
cd Documents/

# Multiple matches? Press Tab twice
cd D[Tab][Tab]
# Shows: Desktop/ Documents/ Downloads/
```

---

## Practice Exercises

### Exercise 1: Navigation

```bash
# 1. Go to home directory
cd ~

# 2. Create a practice folder
mkdir cli-practice

# 3. Enter it
cd cli-practice

# 4. Verify location
pwd
# Expected: /Users/yourname/cli-practice
```

### Exercise 2: File Operations

```bash
# 1. Create files
touch file1.txt file2.txt file3.txt

# 2. Create a subfolder
mkdir subfolder

# 3. Move a file
mv file1.txt subfolder/

# 4. Copy a file
cp file2.txt file2-backup.txt

# 5. List everything
ls -la

# 6. See what's in subfolder
ls subfolder/
```

### Exercise 3: Project Setup

```bash
# 1. Create project structure
mkdir -p my-project/src
mkdir -p my-project/tests

# 2. Create initial files
touch my-project/src/index.ts
touch my-project/tests/index.test.ts
touch my-project/README.md

# 3. View structure
ls -la my-project/
ls -la my-project/src/
```

---

## Common Mistakes to Avoid

### 1. Running rm -rf Carelessly

```bash
# DANGEROUS - can delete everything
rm -rf /          # NEVER DO THIS
rm -rf ~          # Deletes your home directory!

# SAFE - be specific
rm -rf ./node_modules/   # Delete node_modules in current dir
```

### 2. Forgetting Where You Are

```bash
# Always check before destructive operations
pwd
ls

# Then proceed with confidence
rm -r old-folder/
```

### 3. Spaces in File Names

```bash
# Wrong - thinks these are separate files
cd My Documents

# Right - quote it
cd "My Documents"
# Or escape
cd My\ Documents
```

---

## Quick Reference Card

```
NAVIGATION
  pwd           Where am I?
  ls            What's here?
  cd <dir>      Go to directory
  cd ..         Go up one level
  cd ~          Go home

FILES
  touch <file>  Create file
  mkdir <dir>   Create directory
  cp <a> <b>    Copy a to b
  mv <a> <b>    Move/rename
  rm <file>     Delete file
  rm -r <dir>   Delete directory

VIEWING
  cat <file>    Print file
  less <file>   Scrollable view
  head <file>   First 10 lines
  tail <file>   Last 10 lines

SEARCHING
  grep "x" file    Find "x" in file
  grep -r "x" dir  Find in all files
```

---

## Key Takeaways

1. **The terminal is essential** — every developer uses it
2. **Navigation is fundamental** — `pwd`, `ls`, `cd`
3. **File operations are powerful** — be careful with `rm`
4. **Tab completion saves time** — use it constantly
5. **Practice makes permanent** — use terminal daily

---

## Module 01 Complete!

Congratulations! You've completed the Welcome module. You now have:
- ✅ Understanding of software engineering
- ✅ Development environment set up
- ✅ Command line skills

---

## Next Module

Ready to learn version control with Git?

→ [Continue to Module 02: Version Control](../02-version-control/)
