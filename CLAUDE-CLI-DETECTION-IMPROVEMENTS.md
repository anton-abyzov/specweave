# Claude CLI Detection Improvements

**Problem**: SpecWeave's Claude CLI detection was finding a `claude` command in PATH, but it wasn't the actual Claude Code CLI. The error messages were vague ("Issue: unknown") and didn't provide actionable diagnostics.

**Root Cause**: User has a DIFFERENT tool/command named `claude` in their PATH that responds to `which claude` but doesn't respond correctly to `claude --version`.

## What Was Fixed

### 1. Enhanced Detection Logic (`src/utils/claude-cli-detector.ts`)

**Before**:
- Basic checks (exists, version, plugin)
- Vague error messages
- No diagnostic data capture
- Classified all failures as "unknown"

**After**:
- ✅ Comprehensive diagnostics with full error context
- ✅ Captures: command path, exit codes, stdout, stderr
- ✅ Platform-aware detection
- ✅ DEBUG mode for verbose output
- ✅ Specific error classification:
  - `command_not_found` - No `claude` in PATH
  - `permission_denied` - Permission issues
  - `version_check_failed` - Command exists but isn't Claude CLI (NEW!)
  - `plugin_commands_not_supported` - Outdated version
  - `unknown` - Truly unexpected errors

**New Interface**:
```typescript
export interface ClaudeCliStatus {
  available: boolean;
  commandExists: boolean;
  pluginCommandsWork: boolean;
  version?: string;
  error?: 'command_not_found' | 'version_check_failed' | ...;
  errorMessage?: string;
  commandPath?: string;        // NEW: Full path to command
  exitCode?: number;            // NEW: Exit code from failed command
  debugStdout?: string;         // NEW: Stdout for debugging
  debugStderr?: string;         // NEW: Stderr for debugging
  platform: NodeJS.Platform;    // NEW: Platform info
}
```

### 2. Consolidated Duplicate Detection (`src/cli/helpers/issue-tracker/utils.ts`)

**Before**:
- Separate `isClaudeCliAvailable()` implementation
- Simple `claude --version` check
- Inconsistent with main detector

**After**:
- ✅ Uses central `claude-cli-detector.ts`
- ✅ Consistent detection across entire codebase
- ✅ Single source of truth

### 3. Improved Error Messages (`src/cli/commands/init.ts`)

**Before**:
```
⚠️  Claude command found but not fully functional
   Issue: unknown
   Will still use Claude (may need manual plugin install)
```

**After**:
```
⚠️  Claude Code CLI Issue Detected

Found command in PATH, but verification failed:

   Path: /usr/local/bin/claude
   Exit code: 1
   Issue: version_check_failed

⚠️  This likely means:
   • You have a DIFFERENT tool named "claude" in PATH
   • It's not the Claude Code CLI from Anthropic
   • The command exists but doesn't respond to --version

💡 How to fix:

   The command exists but is not responding correctly.

   Try these troubleshooting steps:
     1. Check what 'claude' actually is: file "/usr/local/bin/claude"
     2. Try running manually: claude --version
     3. Check if it's a different tool named "claude"

   If it's NOT the Claude Code CLI:
     → Rename or remove the conflicting command
     → Install Claude Code CLI: npm install -g @anthropic-ai/claude-code

   Enable debug mode for more details:
     → DEBUG=true specweave init .
```

### 4. DEBUG Mode

**Enable verbose diagnostics**:
```bash
DEBUG=true specweave init .
# or
SPECWEAVE_DEBUG=true specweave init .
```

**Output example**:
```
[DEBUG] Claude CLI Detection:
  Platform: darwin
  Which command: which
  Which result: found
  Path: /usr/local/bin/claude

  Version check (claude --version):
    Success: false
    Exit code: 1
    Stdout: ""
    Stderr: "Unknown command"
    Error code: ENOENT
    Error message: Command failed: claude --version

  ✅ All checks passed! Claude CLI is ready.
```

## How To Use (For Users)

### Step 1: Run Init with DEBUG Mode

```bash
cd your-project
DEBUG=true specweave init .
```

This will show:
- Exactly which `claude` command was found
- Full path to the command
- What stdout/stderr it produced
- Exit codes
- Why each check failed

### Step 2: Identify the Conflicting Command

```bash
# Check what 'claude' actually is
which claude
# Output: /usr/local/bin/claude

# Check if it's a script, binary, or symlink
file /usr/local/bin/claude
# Examples:
#   - Bash script: "Bourne-Again shell script, ASCII text executable"
#   - Symlink: "symbolic link to /some/other/path"
#   - Binary: "Mach-O 64-bit executable arm64"

# Try running it manually
claude --version
# If this produces no output or errors → NOT Claude Code CLI!
```

### Step 3: Fix the Issue

**Option A: Remove/Rename Conflicting Command**
```bash
# If it's a different tool you don't need
sudo mv /usr/local/bin/claude /usr/local/bin/claude-old

# Or rename it
sudo mv /usr/local/bin/claude /usr/local/bin/some-other-name
```

**Option B: Install Real Claude Code CLI**
```bash
npm install -g @anthropic-ai/claude-code

# Verify it's correct
claude --version
# Should output: "2.0.x (Claude Code)"

claude plugin --help
# Should output: "Usage: claude plugin [options] [command]..."
```

**Option C: Fix PATH Order** (if both are needed)
```bash
# Check PATH order
echo $PATH

# Ensure Claude Code CLI directory comes BEFORE conflicting command
export PATH="/path/to/claude-code:$PATH"

# Make it permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export PATH="/path/to/claude-code:$PATH"' >> ~/.zshrc
```

### Step 4: Verify and Retry

```bash
# Test detection
node test-cli-detection.js

# If successful, run init again
specweave init .
```

## Testing

A test script is included to verify detection:

```bash
# Basic test
node test-cli-detection.js

# With debug output
DEBUG=true node test-cli-detection.js
```

**Expected output (working CLI)**:
```
🔍 Claude CLI Detection Test

Detection Results:
  Available: true
  Command exists: true
  Plugin commands work: true
  Version: 2.0.34 (Claude Code)
  Path: /Users/you/.nvm/versions/node/v22.20.0/bin/claude

✅ Claude CLI is ready to use!
```

**Expected output (conflicting command)**:
```
🔍 Claude CLI Detection Test

Detection Results:
  Available: false
  Command exists: true
  Plugin commands work: false
  Path: /usr/local/bin/claude
  Error: version_check_failed
  Exit code: 1

⚠️  Issue Detected

Diagnostic:
  Claude CLI found but version check failed (exit code: 1) - produced no output

💡 Suggestions:
   The command exists but is not responding correctly.

   Try these troubleshooting steps:
     1. Check what 'claude' actually is: file "/usr/local/bin/claude"
     2. Try running manually: claude --version
     3. Check if it's a different tool named "claude"
   ...
```

## Files Changed

1. **`src/utils/claude-cli-detector.ts`** - Enhanced detection logic
   - Added comprehensive diagnostic fields
   - Increased timeout from 5s to 10s
   - Added DEBUG mode support
   - Better error classification

2. **`src/cli/helpers/issue-tracker/utils.ts`** - Consolidated detection
   - Replaced duplicate implementation
   - Now uses central detector

3. **`src/cli/commands/init.ts`** - Improved error messages
   - Shows command path, exit code, error type
   - Explains what the error likely means
   - Provides actionable troubleshooting steps
   - Only shows alternatives when appropriate

4. **`test-cli-detection.js`** (NEW) - Test script
   - Standalone test for detection
   - Works with DEBUG mode
   - Easy to share with users for diagnostics

## Key Improvements

1. **Unified Detection**: All Claude CLI checks use ONE central utility
2. **Actionable Diagnostics**: Error messages explain WHAT failed and WHY
3. **DEBUG Mode**: Verbose output for troubleshooting
4. **Better Classification**: Distinguishes "not found" from "wrong tool"
5. **Platform Aware**: Works correctly on Windows/macOS/Linux
6. **Longer Timeout**: 10 seconds instead of 5 (for slow systems)
7. **Full Context**: Captures all diagnostic data for debugging

## Common Scenarios

### Scenario 1: No `claude` command
**Detection**: `error: 'command_not_found'`
**Message**: "Claude CLI not found in PATH"
**Fix**: Install via `npm install -g @anthropic-ai/claude-code`

### Scenario 2: Different tool named `claude`
**Detection**: `error: 'version_check_failed'`
**Message**: "Command exists but version check failed"
**Fix**: Rename conflicting command, install real Claude CLI

### Scenario 3: Outdated Claude CLI
**Detection**: `error: 'plugin_commands_not_supported'`
**Message**: "Claude CLI found but plugin commands not working"
**Fix**: Update via `npm update -g @anthropic-ai/claude-code`

### Scenario 4: Permission issues
**Detection**: `error: 'permission_denied'`
**Message**: "Permission denied when running Claude CLI"
**Fix**: Check file permissions or reinstall

## Summary

**Before**: Vague "unknown" errors, no diagnostic data, hard to troubleshoot
**After**: Specific error types, full diagnostic context, DEBUG mode, actionable fixes

**For Users**: Run `DEBUG=true specweave init .` to see exactly what's happening and follow the detailed troubleshooting steps.
