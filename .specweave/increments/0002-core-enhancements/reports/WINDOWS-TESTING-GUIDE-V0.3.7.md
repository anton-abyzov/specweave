# Windows Testing Guide for v0.3.7

**Purpose**: Verify that the Windows installation fix works correctly
**Version**: v0.3.7
**Target Testers**: Windows 10/11 users, PowerShell, CMD
**Estimated Time**: 5-10 minutes

---

## What Was Fixed

**Issue**: `specweave init .` created empty `.claude/` directories on Windows
**Root Cause**: Adapter detection defaulted to "generic" instead of "claude"
**Fix**: Changed default adapter to "claude" (the best experience)

---

## Prerequisites

- Windows 10 or Windows 11
- Node.js 18+ installed (`node --version`)
- PowerShell or CMD
- Internet connection (for npm install)

---

## Testing Steps

### Step 1: Install v0.3.7

Open PowerShell or CMD and run:

```powershell
# Uninstall old version (if installed)
npm uninstall -g specweave

# Install v0.3.7
npm install -g specweave@0.3.7

# Verify version
specweave --version
# Should output: 0.3.7
```

**Expected Output**:
```
removed 1 package
added 1 package
specweave@0.3.7
```

**Troubleshooting**:
- If `npm` not found → Install Node.js from https://nodejs.org
- If permission error → Run PowerShell as Administrator
- If version still shows old → Clear npm cache: `npm cache clean --force`

---

### Step 2: Create Test Directory

```powershell
# Create fresh test directory
cd C:\Temp
mkdir specweave-test-v0.3.7
cd specweave-test-v0.3.7
```

**Expected Output**:
```
Directory: C:\Temp

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        10/29/2025  11:30 PM                specweave-test-v0.3.7
```

---

### Step 3: Initialize SpecWeave (NO --adapter flag!)

**IMPORTANT**: Do NOT use `--adapter claude` flag. Let it auto-detect.

```powershell
# Initialize SpecWeave in current directory
specweave init .
```

**Expected Output** (KEY INDICATORS):

```
🚀 SpecWeave Initialization

🔍 Detecting AI coding tool...

✅ Detected: claude (native - full automation)  # ← MUST SAY "claude"!
⠼ Directory structure created...
⠼ Base templates copied...
⠼ Installing Claude Code components...
⠼ Slash commands installed...
   ✓ Copied 13 command files                    # ← MUST SHOW THIS!
⠼ Agents installed...
   ✓ Copied 10 agent directories                # ← MUST SHOW THIS!
⠼ Skills installed...
   ✓ Copied 36 skill directories                # ← MUST SHOW THIS!

✨ Claude Code native installation complete!
   ✅ Native skills, agents, hooks work out of the box

⠼ Git repository initialized...
✔ SpecWeave project created successfully!

🎯 Next steps:

   1. Open Claude Code and describe your project:
      "Build a real estate listing platform"

   2. SpecWeave will:
      • Auto-activate skills and agents
      • Create specifications
      • Build implementation

🚀 Ready to build with SpecWeave!
```

**What to Check**:
1. ✅ Output says "Detected: claude" (NOT "generic")
2. ✅ Output shows "✓ Copied 13 command files"
3. ✅ Output shows "✓ Copied 10 agent directories"
4. ✅ Output shows "✓ Copied 36 skill directories"

**❌ BAD OUTPUT** (if you see this, the fix didn't work):
```
✅ Detected: generic (manual automation)  # ← BAD!
📦 Configuring for Universal AI Tool Compatibility
✅ AGENTS.md works with any AI tool
# No file copy messages!
```

---

### Step 4: Verify .claude/ Directories Are Populated

```powershell
# Check commands directory
cd .claude\commands
dir

# Should see .md files
ls *.md

# Go back
cd ..\..

# Check agents directory
cd .claude\agents
dir

# Should see subdirectories (pm, architect, devops, etc.)
ls -Directory

# Go back
cd ..\..

# Check skills directory
cd .claude\skills
dir

# Should see subdirectories (increment-planner, context-loader, etc.)
ls -Directory

# Go back
cd ..\..
```

**Expected Output**:

**Commands** (should have 13+ files):
```
    Directory: C:\Temp\specweave-test-v0.3.7\.claude\commands

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/29/2025   3:40 PM          13988 specweave.do.md
-a----        10/29/2025   3:40 PM          16507 specweave.done.md
-a----        10/29/2025   3:40 PM           1869 specweave.inc.md
-a----        10/29/2025   3:40 PM          11846 specweave.increment.md
-a----        10/29/2025   3:40 PM           5311 specweave.list-increments.md
... (8 more files)
```

**Agents** (should have 10 directories):
```
    Directory: C:\Temp\specweave-test-v0.3.7\.claude\agents

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        10/29/2025   3:40 PM                architect
d-----        10/29/2025   3:40 PM                devops
d-----        10/29/2025   3:40 PM                diagrams-architect
d-----        10/29/2025   3:40 PM                docs-writer
d-----        10/29/2025   3:40 PM                performance
d-----        10/29/2025   3:40 PM                pm
d-----        10/29/2025   3:40 PM                qa-lead
d-----        10/29/2025   3:40 PM                security
d-----        10/29/2025   3:40 PM                sre
d-----        10/29/2025   3:40 PM                tech-lead
```

**Skills** (should have 35+ directories):
```
    Directory: C:\Temp\specweave-test-v0.3.7\.claude\skills

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        10/29/2025   3:40 PM                ado-sync
d-----        10/29/2025   3:40 PM                bmad-method-expert
d-----        10/29/2025   3:40 PM                brownfield-analyzer
d-----        10/29/2025   3:40 PM                context-loader
d-----        10/29/2025   3:40 PM                increment-planner
... (30+ more directories)
```

**❌ BAD OUTPUT** (if directories are empty):
```
PS C:\Temp\specweave-test-v0.3.7\.claude\commands> dir
# (No files) ← BAD! Fix didn't work!
```

---

### Step 5: Verify SKILL.md Files Exist

```powershell
# Check a specific skill has SKILL.md
cd .claude\skills\increment-planner
dir

# Should see SKILL.md
cat SKILL.md | Select-Object -First 10

# Go back
cd ..\..\..
```

**Expected Output**:
```
    Directory: C:\Temp\specweave-test-v0.3.7\.claude\skills\increment-planner

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/29/2025   3:40 PM           8234 SKILL.md
d-----        10/29/2025   3:40 PM                test-cases

---
name: increment-planner
description: Creates comprehensive implementation plans for SpecWeave increments...
---
```

---

### Step 6: Verify AGENT.md Files Exist

```powershell
# Check a specific agent has AGENT.md
cd .claude\agents\pm
dir

# Should see AGENT.md
cat AGENT.md | Select-Object -First 10

# Go back
cd ..\..\..
```

**Expected Output**:
```
    Directory: C:\Temp\specweave-test-v0.3.7\.claude\agents\pm

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/29/2025   3:40 PM          12456 AGENT.md

# Product Manager Agent

You are a Product Manager agent specializing in product strategy...
```

---

### Step 7: Verify Project Structure

```powershell
# List all top-level directories
tree /F /A | Select-Object -First 50
```

**Expected Output**:
```
C:\TEMP\SPECWEAVE-TEST-V0.3.7
|   .gitignore
|   AGENTS.md
|   CLAUDE.md
|   README.md
|
+---.claude
|   +---agents
|   |   +---architect
|   |   |       AGENT.md
|   |   +---devops
|   |   |       AGENT.md
|   |   ... (8 more agents)
|   +---commands
|   |       specweave.do.md
|   |       specweave.inc.md
|   |       ... (11 more commands)
|   +---skills
|       +---increment-planner
|       |   |   SKILL.md
|       |   \---test-cases
|       ... (35 more skills)
+---.specweave
    +---docs
    |   +---internal
    |   |   +---architecture
    |   |   +---delivery
    |   |   +---governance
    |   |   +---operations
    |   |   +---strategy
    |   \---public
    \---increments
```

---

## Testing Checklist

Use this checklist to verify the fix:

- [ ] **Step 1**: Installed v0.3.7 successfully (`specweave --version` shows 0.3.7)
- [ ] **Step 2**: Created test directory (`C:\Temp\specweave-test-v0.3.7`)
- [ ] **Step 3**: Ran `specweave init .` WITHOUT `--adapter` flag
- [ ] **Verification 1**: Output showed "Detected: claude" (NOT "generic")
- [ ] **Verification 2**: Output showed "✓ Copied 13 command files"
- [ ] **Verification 3**: Output showed "✓ Copied 10 agent directories"
- [ ] **Verification 4**: Output showed "✓ Copied 36 skill directories"
- [ ] **Step 4**: `.claude/commands` contains 13+ .md files
- [ ] **Step 5**: `.claude/agents` contains 10 directories with AGENT.md
- [ ] **Step 6**: `.claude/skills` contains 35+ directories with SKILL.md
- [ ] **Step 7**: `.specweave/` structure created correctly

---

## Expected vs Actual Results

### ✅ PASS Criteria

All of the following MUST be true:
1. ✅ Detected "claude" (not "generic")
2. ✅ 13 command files copied
3. ✅ 10 agent directories copied
4. ✅ 36 skill directories copied
5. ✅ `.claude/commands/*.md` files exist
6. ✅ `.claude/agents/*/AGENT.md` files exist
7. ✅ `.claude/skills/*/SKILL.md` files exist

### ❌ FAIL Criteria

If ANY of the following are true:
1. ❌ Detected "generic" (not "claude")
2. ❌ No "✓ Copied X files" messages
3. ❌ Empty `.claude/commands` directory
4. ❌ Empty `.claude/agents` directory
5. ❌ Empty `.claude/skills` directory

---

## Reporting Results

### If Test PASSED ✅

Please report success by commenting on GitHub issue:

**Template**:
```
✅ **TESTED ON WINDOWS - WORKS!**

**Environment**:
- OS: Windows 11 Pro (build 22621)
- Node: v18.18.0
- npm: 9.8.1
- SpecWeave: v0.3.7

**Results**:
- ✅ Detected "claude" correctly
- ✅ 13 command files copied
- ✅ 10 agent directories copied
- ✅ 36 skill directories copied
- ✅ All files present and valid

**Screenshot**: [attach screenshot of `dir .claude\commands`]

The fix works perfectly! 🎉
```

### If Test FAILED ❌

Please report failure by commenting on GitHub issue:

**Template**:
```
❌ **TESTED ON WINDOWS - STILL BROKEN**

**Environment**:
- OS: Windows 11 Pro (build 22621)
- Node: v18.18.0
- npm: 9.8.1
- SpecWeave: v0.3.7

**What Failed**:
- [ ] Detected "generic" (should be "claude")
- [ ] No file copy messages
- [ ] Empty `.claude/commands` directory
- [ ] Empty `.claude/agents` directory
- [ ] Empty `.claude/skills` directory

**Output**: [paste full output of `specweave init .`]

**Screenshot**: [attach screenshot of `dir .claude\commands`]

Still doesn't work. 😞
```

---

## Troubleshooting

### Problem: Still detecting "generic"

**Solution**: Try explicit adapter flag:
```powershell
specweave init . --adapter claude
```

If this works, it means detection is still broken but can be worked around.

### Problem: Permission denied errors

**Solution**: Run PowerShell as Administrator:
1. Right-click PowerShell
2. Select "Run as Administrator"
3. Try again

### Problem: npm cache issues

**Solution**: Clear npm cache:
```powershell
npm cache clean --force
npm uninstall -g specweave
npm install -g specweave@0.3.7
```

### Problem: Node.js version too old

**Solution**: Update Node.js:
```powershell
node --version  # Should be 18+
# If < 18, download from https://nodejs.org
```

---

## Advanced Testing (Optional)

### Test with Different Directories

```powershell
# Test in C:\Projects
cd C:\Projects
mkdir specweave-test-2
cd specweave-test-2
specweave init .

# Test in home directory
cd %USERPROFILE%
mkdir specweave-test-3
cd specweave-test-3
specweave init .
```

### Test with Explicit Generic Adapter

```powershell
# Verify generic adapter still works
cd C:\Temp
mkdir specweave-generic-test
cd specweave-generic-test
specweave init . --adapter generic

# Should say "Detected: generic" and NOT copy files
# This is expected behavior for generic adapter
```

---

## Cleanup

After testing, clean up test directories:

```powershell
# Remove test directories
cd C:\Temp
Remove-Item -Recurse -Force specweave-test-v0.3.7
Remove-Item -Recurse -Force specweave-test-2
Remove-Item -Recurse -Force specweave-test-3
Remove-Item -Recurse -Force specweave-generic-test
```

---

## Questions?

If you have questions or issues:

1. **GitHub Issue**: Comment on the Windows installation bug issue
2. **Documentation**: https://spec-weave.com
3. **Repository**: https://github.com/anton-abyzov/specweave

---

**Thank you for testing!** Your feedback helps make SpecWeave better for everyone! 🙏
