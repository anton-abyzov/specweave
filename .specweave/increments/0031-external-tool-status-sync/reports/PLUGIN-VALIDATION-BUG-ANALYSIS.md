# Plugin Validation Bug - Root Cause Analysis

**Date**: 2025-11-12
**Issue**: False positive "Core plugin (specweave) not installed" error
**Status**: **CRITICAL BUG - Blocks all `/specweave:*` commands**
**Impact**: Users cannot use any SpecWeave workflow commands

---

## 🔥 Executive Summary

The plugin validation system has a **fundamental architecture bug** that causes false positive errors. The validation script attempts to detect installed plugins using a **non-existent CLI command**, fails to detect them, and blocks all workflow operations.

**Reality**: Plugins ARE installed (verified via `~/.claude/plugins/installed_plugins.json`)
**Problem**: Detection logic uses wrong command (`claude plugin list --installed` doesn't exist)
**Result**: Validation fails, blocks `/specweave:do` and all workflow commands

---

## 🎯 The Bug (5-Layer Analysis)

### Layer 1: Symptom

```
User runs: /specweave:do
Error: "❌ Missing components detected: Core plugin (specweave) not installed"
Reality: Plugin IS installed (proof below)
```

### Layer 2: Detection Logic Bug

**File**: `src/utils/plugin-validator.ts:486-490`

```typescript
// ❌ WRONG - This command doesn't exist!
async checkPlugin(pluginName: string) {
  const { stdout } = await execAsync(
    `claude plugin list --installed 2>/dev/null | grep -i "${pluginName}"`
  );
  // ... detection logic
}
```

**Proof the command fails**:
```bash
$ claude plugin list --installed
error: unknown command 'list'
```

**Available commands** (from `claude plugin --help`):
```
Commands:
  validate <path>
  marketplace
  install|i <plugin>
  uninstall|remove <plugin>
  enable <plugin>
  disable <plugin>

# ❌ NO "list" command!
```

### Layer 3: The Proof (Plugins ARE Installed)

**File**: `~/.claude/plugins/installed_plugins.json`

```json
{
  "version": 1,
  "plugins": {
    "specweave@specweave": {
      "version": "0.8.0",
      "installedAt": "2025-11-11T16:39:51.366Z",
      "lastUpdated": "2025-11-11T16:39:51.366Z",
      "installPath": "/Users/antonabyzov/.claude/plugins/...",
      "isLocal": true
    },
    "specweave-jira@specweave": { "version": "1.0.0", ... },
    "specweave-docs-preview@specweave": { "version": "1.0.0", ... },
    "specweave-github@specweave": { "version": "1.0.0", ... },
    ... (21 total plugins)
  }
}
```

✅ **ALL 21 plugins are installed** according to Claude Code's internal registry!

### Layer 4: The Cascade Failure

```
1. User runs: /specweave:do
   ↓
2. plugin-validator skill auto-activates (SKILL.md line 3 keywords)
   ↓
3. Runs: npx specweave validate-plugins --auto-install
   ↓
4. validate() → checkCorePlugin() → checkPlugin('specweave')
   ↓
5. Executes: claude plugin list --installed | grep "specweave"
   ↓
6. Command fails: "unknown command 'list'"
   ↓
7. catch block: if (error.code === 1) → return { installed: false }
   ↓
8. validate() sees: missing.corePlugin = true
   ↓
9. Tries auto-install: claude plugin install specweave
   ↓
10. Installation succeeds (no-op, already installed)
    ↓
11. Runs checkPlugin('specweave') AGAIN
    ↓
12. SAME BUG: claude plugin list fails again
    ↓
13. Returns: { installed: false } (FALSE NEGATIVE!)
    ↓
14. Error: "Failed to install core plugin: Installation completed but plugin not detected"
    ↓
15. CLI exits with code 1, blocks workflow
```

### Layer 5: Why It Was Designed This Way

Looking at `plugins/specweave/skills/plugin-validator/SKILL.md:64-65`:

```markdown
### Phase 2: Core Plugin Check

**Command**: `/plugin list --installed | grep "specweave"`
```

**The skill documentation assumes** Claude Code has a `/plugin list` command, but:
- ✅ `/plugin` commands work IN Claude Code UI (interactive)
- ❌ `claude plugin list` does NOT work in shell (non-existent)

The validator script tries to use the CLI, but the CLI doesn't have the expected command.

---

## ✅ The Correct Detection Method

Plugins are tracked in a **JSON registry**, not via CLI:

**File**: `~/.claude/plugins/installed_plugins.json`

**Structure**:
```json
{
  "version": 1,
  "plugins": {
    "pluginName@marketplace": {
      "version": "X.Y.Z",
      "installedAt": "ISO-8601",
      "installPath": "/path/to/plugin",
      "isLocal": true/false
    }
  }
}
```

**Detection should**:
1. Read `~/.claude/plugins/installed_plugins.json`
2. Parse JSON
3. Check if `specweave@specweave` key exists
4. Extract version from `plugins['specweave@specweave'].version`

---

## 🔧 The Fix (3 Approaches)

### **Fix 1: Use Correct Detection Method** (Required)

**Replace** `src/utils/plugin-validator.ts:482-520`:

```typescript
/**
 * Check if a specific plugin is installed
 *
 * FIXED: Read from Claude's installed_plugins.json instead of non-existent CLI command
 */
async checkPlugin(
  pluginName: string
): Promise<{ installed: boolean; version?: string }> {
  try {
    // ✅ CORRECT - Read Claude's plugin registry
    const pluginRegistryPath = path.join(
      os.homedir(),
      '.claude',
      'plugins',
      'installed_plugins.json'
    );

    // Check if registry exists
    if (!(await fs.pathExists(pluginRegistryPath))) {
      this.log('Plugin registry not found');
      return { installed: false };
    }

    // Read registry
    const registry = await fs.readJson(pluginRegistryPath);

    // Check for plugin (format: "pluginName@marketplace")
    const pluginKey = Object.keys(registry.plugins || {}).find(
      (key) => key.startsWith(`${pluginName}@`)
    );

    if (pluginKey) {
      const pluginInfo = registry.plugins[pluginKey];
      this.log(`Plugin ${pluginName} found (version: ${pluginInfo.version})`);
      return { installed: true, version: pluginInfo.version };
    }

    this.log(`Plugin ${pluginName} not found in registry`);
    return { installed: false };
  } catch (error: any) {
    this.log(`Error checking plugin ${pluginName}: ${error.message}`);
    return { installed: false };
  }
}
```

### **Fix 2: Graceful Degradation** (Recommended)

**Don't block workflows** when detection fails:

```typescript
// In validate() method:
async validate(options: ValidationOptions = {}): Promise<ValidationResult> {
  // ... existing validation logic

  // ✅ If plugin check fails, check for dev mode
  if (!corePluginInfo.installed) {
    const isDevMode = await fs.pathExists(
      path.join(process.cwd(), 'plugins', 'specweave')
    );

    if (isDevMode) {
      this.log('Development mode detected - skipping validation');
      result.installed.corePlugin = true;
      result.installed.corePluginVersion = 'dev';
    } else {
      // ✅ Warn, don't block
      console.warn('⚠️  Plugin validation failed (detection issue), proceeding anyway...');
      result.valid = false; // Mark invalid but don't throw
      result.missing.corePlugin = true;
    }
  }

  return result; // ✅ Always return result, never throw
}
```

### **Fix 3: Disable Proactive Validation** (Critical)

**The plugin-validator skill auto-activates on EVERY `/specweave:*` command**, causing false positives.

**Edit**: `plugins/specweave/skills/plugin-validator/SKILL.md:3`

**Before**:
```yaml
description: ... Auto-activates when /specweave:* commands detected. ... Activates for plugin validation, environment setup, missing plugins, specweave commands, marketplace registration, plugin installation, environment migration, fresh setup.
```

**After** (remove auto-activation for workflow commands):
```yaml
description: ... Auto-activates when EXPLICITLY requested for plugin validation. ... Activates ONLY for: plugin validation, environment setup, validate plugins, check plugins, specweave init, fresh setup.
```

**Remove keywords**: `specweave commands`, `/specweave:*`, `missing plugins`

---

## 🚨 IMMEDIATE WORKAROUND

**For users experiencing this bug** (temporary workaround until fixed):

### Option 1: Disable Validation in Config

**Edit**: `.specweave/config.json`

```json
{
  "pluginValidation": {
    "enabled": false
  }
}
```

**Note**: The validation script **doesn't currently check this config**, so this won't work until Fix 1 is implemented. Use Option 2 instead.

### Option 2: Skip Validation Skill

**Create**: `.claude/settings.json` (in your project directory)

```json
{
  "disabledSkills": ["plugin-validator"]
}
```

This disables the skill from auto-activating.

### Option 3: Run Commands Without Validation

**Instead of**:
```bash
/specweave:do
```

**Use** (bypass validation):
```bash
# Set environment variable to skip validation
export SPECWEAVE_SKIP_VALIDATION=true
/specweave:do
```

**Note**: This requires implementing environment variable check in `validate-plugins.ts`.

---

## 📊 Impact Assessment

**Severity**: **CRITICAL** (blocks all workflow commands)

**Affected Users**:
- ✅ **All SpecWeave users** (validation auto-runs on every command)
- ✅ **Fresh installations** (validation runs during `specweave init`)
- ✅ **CI/CD pipelines** (validation blocks automated workflows)
- ✅ **New environments** (VM, Cloud IDE, Docker)

**Workaround Availability**: **None** (validation is hardcoded, can't be disabled)

**User Experience**:
- ❌ Users see cryptic error: "Installation completed but plugin not detected"
- ❌ Plugins ARE installed, but validation doesn't see them
- ❌ No way to bypass validation (even with flags)
- ❌ All `/specweave:*` commands blocked (can't work at all)

**Business Impact**:
- ❌ Users abandon SpecWeave (can't use it)
- ❌ Bad reviews/reputation (looks broken)
- ❌ Support burden (users report same bug repeatedly)

---

## 🧪 Test Cases (Reproduction)

### Test 1: Verify Bug Exists

```bash
# Run validation
npx specweave validate-plugins --verbose

# Expected (current broken behavior):
# [PluginValidator] Checking core plugin (specweave)...
# [PluginValidator] Error checking plugin specweave: Command failed
# ❌ Missing components detected:
#    • Core plugin (specweave) not installed

# Verify plugin IS installed
cat ~/.claude/plugins/installed_plugins.json | grep "specweave@specweave"
# Output: "specweave@specweave": { "version": "0.8.0", ... }
# ✅ Plugin IS installed!
```

### Test 2: Verify CLI Command Fails

```bash
# Try the command the validation script uses
claude plugin list --installed 2>&1

# Expected output:
# error: unknown command 'list'
```

### Test 3: Verify Fix Works

After implementing Fix 1:

```bash
# Run validation
npx specweave validate-plugins --verbose

# Expected (fixed behavior):
# [PluginValidator] Checking core plugin (specweave)...
# [PluginValidator] Plugin specweave found (version: 0.8.0)
# ✅ All plugins validated!
#    • Core plugin: installed (v0.8.0)
```

---

## 📝 Recommended Changes

### Files to Modify

1. **`src/utils/plugin-validator.ts`** (Fix 1 - REQUIRED)
   - Replace `checkPlugin()` method (lines 482-520)
   - Read from `~/.claude/plugins/installed_plugins.json`
   - Remove CLI command dependency

2. **`src/utils/plugin-validator.ts`** (Fix 2 - RECOMMENDED)
   - Update `validate()` method (lines 277-413)
   - Add graceful degradation (warn, don't block)
   - Add development mode detection

3. **`plugins/specweave/skills/plugin-validator/SKILL.md`** (Fix 3 - CRITICAL)
   - Update description (line 3)
   - Remove auto-activation keywords
   - Only activate when explicitly requested

4. **`src/cli/commands/validate-plugins.ts`** (Enhancement)
   - Add config file reading
   - Respect `pluginValidation.enabled` flag
   - Add `--force` flag to bypass validation

5. **`.specweave/config.json`** (Schema update)
   - Document `pluginValidation` config section
   - Add to JSON schema validation

### Testing Requirements

1. **Unit tests** for `checkPlugin()` method
   - Test with valid `installed_plugins.json`
   - Test with missing registry file
   - Test with malformed JSON
   - Test plugin name matching logic

2. **Integration tests** for validation flow
   - Test full validation pass
   - Test graceful degradation
   - Test dev mode detection
   - Test config flag (when implemented)

3. **E2E tests** for workflow commands
   - Test `/specweave:increment` with validation
   - Test `/specweave:do` with validation
   - Test validation errors don't block workflow

---

## 🎯 Success Criteria

**Fix is complete when**:
1. ✅ Plugin detection reads from `installed_plugins.json` (not CLI)
2. ✅ Validation passes when plugins ARE installed
3. ✅ Validation doesn't block workflows (graceful degradation)
4. ✅ Config flag `pluginValidation.enabled` works
5. ✅ Auto-activation disabled for workflow commands
6. ✅ All tests pass (unit + integration + E2E)
7. ✅ Users can use `/specweave:do` without errors

---

## 🔄 Related Issues

- **Increment 0014**: Proactive Plugin Validation (introduced the bug)
- **ADR-0018**: Plugin Validation Architecture
- **SKILL.md**: plugin-validator skill documentation

---

## 📚 References

- Claude Code Plugin Documentation: https://docs.claude.com/en/docs/claude-code/plugins
- Plugin Marketplace Docs: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- SpecWeave CLAUDE.md: See "Plugin Architecture" section

---

**Author**: Root Cause Analysis
**Date**: 2025-11-12
**Version**: 1.0
**Status**: Ready for Implementation
