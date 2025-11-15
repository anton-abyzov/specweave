# Bug Fix: False GitHub Detection in Nested Projects

**Date**: 2025-11-05
**Reporter**: User (Anton Abyzov)
**Status**: ✅ Fixed
**Files Modified**:
- `src/cli/helpers/issue-tracker/utils.ts`
- `src/cli/helpers/issue-tracker/index.ts`

---

## The Problem

When running `specweave init .` in a subdirectory of a git repository (e.g., `specweave/sw-prize-calc/`), the CLI incorrectly showed "GitHub Issues (detected)" even though the subdirectory had no git repository.

### Root Cause

The `detectDefaultTracker()` function returned `'github'` in two different scenarios:
1. **Actually detected** - Found `.git/config` with `github.com` remote
2. **Default fallback** - No `.git/config` found, just guessing GitHub as default

But the UI couldn't distinguish between these cases, so it showed "(detected)" for both.

### Example

```bash
# User's directory structure:
/Users/antonabyzov/Projects/github/specweave/     ← HAS .git/ (parent)
└── sw-prize-calc/                                 ← NO .git/ (child)
    └── .specweave/

# Running: specweave init .
# Result: "GitHub Issues (detected)" ❌ (false positive - it's just the default!)
```

**Why This Happened**: The detection logic was correct (only checked project directory), but the return value didn't distinguish between "detected" and "default".

---

## The Solution

### 1. Updated Return Type

Changed `detectDefaultTracker()` to return an object with both tracker and detection status:

**Before**:
```typescript
export function detectDefaultTracker(projectPath: string): IssueTracker {
  // ...
  return 'github'; // Could be detected OR default!
}
```

**After**:
```typescript
export function detectDefaultTracker(projectPath: string): { tracker: IssueTracker; detected: boolean } {
  // Actually detected from .git/config
  if (config.includes('github.com')) return { tracker: 'github', detected: true };

  // No .git/config found - default (NOT detected)
  return { tracker: 'github', detected: false };
}
```

### 2. Updated UI Logic

Changed the CLI prompt to only show "(detected)" when truly detected:

**Before**:
```typescript
name: `🐙 GitHub Issues ${defaultTracker === 'github' ? '(detected)' : ''}`
// Shows "(detected)" for BOTH actual detection AND default!
```

**After**:
```typescript
name: `🐙 GitHub Issues ${detection.tracker === 'github' && detection.detected ? '(detected)' : ''}`
// Only shows "(detected)" when ACTUALLY detected!
```

---

## Testing

### Test Case 1: No Git Repo (Fixed Bug)

```bash
cd ~/Projects/new-project/  # No .git folder
specweave init .

# Expected Output:
? Which issue tracker do you use?
  🐙 GitHub Issues           ← NO "(detected)" text (correct!)
  📋 Jira
  🔷 Azure DevOps
  ⏭️  None (skip)
```

### Test Case 2: GitHub Repo (Actual Detection)

```bash
cd ~/Projects/my-github-project/  # Has .git with github.com remote
specweave init .

# Expected Output:
? Which issue tracker do you use?
  🐙 GitHub Issues (detected)  ← Shows "(detected)" (correct!)
  📋 Jira
  🔷 Azure DevOps
  ⏭️  None (skip)
```

### Test Case 3: Azure DevOps Repo

```bash
cd ~/Projects/my-ado-project/  # Has .git with dev.azure.com remote
specweave init .

# Expected Output:
? Which issue tracker do you use?
  🐙 GitHub Issues
  📋 Jira
  🔷 Azure DevOps (detected)  ← Shows "(detected)" for ADO (correct!)
  ⏭️  None (skip)
```

---

## Files Changed

### `src/cli/helpers/issue-tracker/utils.ts`

```diff
- export function detectDefaultTracker(projectPath: string): IssueTracker {
+ export function detectDefaultTracker(projectPath: string): { tracker: IssueTracker; detected: boolean } {
+   // CRITICAL: Only check project directory, NOT parent directories
    const gitConfigPath = path.join(projectPath, '.git', 'config');

    if (fs.existsSync(gitConfigPath)) {
      try {
        const config = fs.readFileSync(gitConfigPath, 'utf-8');

-       if (config.includes('github.com')) return 'github';
+       // Actually detected from .git/config
+       if (config.includes('github.com')) return { tracker: 'github', detected: true };
-       if (config.includes('dev.azure.com') || config.includes('visualstudio.com')) return 'ado';
+       if (config.includes('dev.azure.com') || config.includes('visualstudio.com')) return { tracker: 'ado', detected: true };
      } catch (error) {
        // Ignore errors, use default
      }
    }

-   return 'github'; // Default to GitHub (most common)
+   // No .git/config found in project directory - return default (NOT detected)
+   return { tracker: 'github', detected: false };
  }
```

### `src/cli/helpers/issue-tracker/index.ts`

```diff
- const defaultTracker = detectDefaultTracker(projectPath);
+ const detection = detectDefaultTracker(projectPath);

  const { tracker } = await inquirer.prompt([{
    type: 'list',
    name: 'tracker',
    message: 'Which issue tracker do you use?',
    choices: [
      {
-       name: `🐙 GitHub Issues ${defaultTracker === 'github' ? '(detected)' : ''}`,
+       name: `🐙 GitHub Issues ${detection.tracker === 'github' && detection.detected ? '(detected)' : ''}`,
        value: 'github'
      },
      {
-       name: `🔷 Azure DevOps ${defaultTracker === 'ado' ? '(detected)' : ''}`,
+       name: `🔷 Azure DevOps ${detection.tracker === 'ado' && detection.detected ? '(detected)' : ''}`,
        value: 'ado'
      },
      // ...
    ],
-   default: defaultTracker
+   default: detection.tracker
  }]);
```

---

## Impact

### Before Fix
- ❌ False "(detected)" messages in nested directories
- ❌ Misleading user experience
- ❌ User might think GitHub integration is set up when it's not

### After Fix
- ✅ Only shows "(detected)" when actually detected
- ✅ Clear distinction between "detected" and "default"
- ✅ Accurate user expectations

---

## Related Issues

- User report: "specweave init shows GitHub detected but I have no git repo"
- Context: User created project in subdirectory of SpecWeave repo itself
- Discovery: Anton spotted the false positive during testing

---

## Lessons Learned

1. **Return Types Matter**: A simple `string` return wasn't sufficient - needed `{ tracker, detected }` to convey full context
2. **UI Messaging**: Be precise about "detected" vs "default" to avoid misleading users
3. **Edge Cases**: Test initialization in nested directories, not just root projects

---

**Commit Message**:
```
fix(init): prevent false GitHub detection in nested projects

When running `specweave init .` in a subdirectory of a git repository,
the CLI incorrectly showed "GitHub Issues (detected)" even though the
subdirectory had no git repo.

Root cause: detectDefaultTracker() returned 'github' for both:
1. Actually detected (found .git/config with github.com)
2. Default fallback (no .git/config, just guessing)

Fix: Change return type to { tracker, detected } to distinguish between
these cases. UI now only shows "(detected)" when truly detected.

Files changed:
- src/cli/helpers/issue-tracker/utils.ts (detection logic)
- src/cli/helpers/issue-tracker/index.ts (UI display)

Co-Authored-By: Claude <noreply@anthropic.com>
```
