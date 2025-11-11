---
increment: 0020
title: "Implementation Plan: Enhanced Multi-Repository GitHub Support"
created: 2025-01-13
status: approved
---

# Implementation Plan: Enhanced Multi-Repository GitHub Support

## Architecture Overview

### Current State
- Single plugin installation flow (causes duplicate attempts)
- Confusing multi-repo strategies
- No "defer setup" option
- Limited brownfield detection

### Target State
- Smart plugin detection (no duplicates)
- Clear repository configuration options
- Support for 0, 1, or N repositories
- Automatic git remote detection
- Profile-based multi-repo management

## Technical Design

### 1. Plugin Installation Fix

**Location**: `src/cli/helpers/issue-tracker/index.ts`

```typescript
async function installPlugin(tracker: IssueTracker, language: string): Promise<void> {
  // NEW: Check if plugin already installed
  if (await isPluginInstalled(`specweave-${tracker}`)) {
    console.log(chalk.green(`✓ ${getTrackerDisplayName(tracker)} plugin already installed`));
    return;
  }

  // Existing installation logic...
}
```

**New Utility**: `src/cli/helpers/issue-tracker/utils.ts`

```typescript
export async function isPluginInstalled(pluginName: string): Promise<boolean> {
  try {
    const result = execSync('claude plugin list --installed --json', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    const plugins = JSON.parse(result);
    return plugins.some(p => p.name === pluginName);
  } catch {
    return false; // Assume not installed if check fails
  }
}
```

### 2. Repository Configuration Redesign

**Location**: `src/cli/helpers/issue-tracker/github.ts`

Replace complex strategies with clear options:

```typescript
export interface GitHubSetupOption {
  type: 'none' | 'single' | 'multiple' | 'monorepo' | 'auto-detect';
  profiles?: GitHubProfile[];
}

export interface GitHubProfile {
  id: string;           // e.g., "frontend", "backend", "main"
  displayName: string;  // e.g., "Frontend App"
  owner: string;        // e.g., "myorg"
  repo: string;         // e.g., "frontend-app"
  isDefault?: boolean;  // Mark primary repo
}
```

### 3. Git Remote Detection

**New Module**: `src/utils/git-detector.ts`

```typescript
export interface GitRemote {
  name: string;        // e.g., "origin", "upstream"
  url: string;         // Full URL
  owner?: string;      // Extracted owner
  repo?: string;       // Extracted repo name
  provider: 'github' | 'gitlab' | 'bitbucket' | 'unknown';
}

export async function detectGitRemotes(projectPath: string): Promise<GitRemote[]> {
  // Parse git remote -v output
  // Extract owner/repo from URLs
  // Return structured data
}
```

### 4. Profile Management Integration

**Update**: `src/cli/helpers/issue-tracker/github.ts`

```typescript
export async function setupGitHubRepository(
  language: SupportedLanguage,
  projectPath: string
): Promise<GitHubProfile[]> {
  // 1. Show setup options
  const setupType = await promptSetupType();

  // 2. Handle each type
  switch (setupType) {
    case 'none':
      return []; // No repos configured

    case 'single':
      return [await configureSingleRepo()];

    case 'multiple':
      return await configureMultipleRepos();

    case 'monorepo':
      return await configureMonorepo();

    case 'auto-detect':
      return await detectAndConfirmRepos();
  }
}
```

### 5. Config Schema Update

**Location**: `src/core/schemas/specweave-config.schema.json`

Add support for multiple GitHub profiles:

```json
{
  "sync": {
    "profiles": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "provider": { "enum": ["github", "jira", "ado"] },
          "displayName": { "type": "string" },
          "config": {
            "type": "object",
            "properties": {
              "owner": { "type": "string" },
              "repo": { "type": "string" }
            }
          },
          "isDefault": { "type": "boolean" }
        }
      }
    },
    "defaultProfile": { "type": "string" }
  }
}
```

## File Changes

### Modified Files
1. `src/cli/helpers/issue-tracker/index.ts` - Fix duplicate installation
2. `src/cli/helpers/issue-tracker/github.ts` - New setup flow
3. `src/cli/helpers/issue-tracker/utils.ts` - Add plugin detection
4. `src/cli/helpers/issue-tracker/types.ts` - New interfaces
5. `src/core/schemas/specweave-config.schema.json` - Profile schema

### New Files
1. `src/utils/git-detector.ts` - Git remote detection
2. `src/cli/helpers/github/profile-manager.ts` - Profile CRUD
3. `tests/unit/github/multi-repo.test.ts` - Unit tests
4. `tests/e2e/github/setup-flow.spec.ts` - E2E tests

## Implementation Steps

### Step 1: Fix Duplicate Installation (2 hours)
1. Add `isPluginInstalled()` utility
2. Update `installPlugin()` to check first
3. Test fix with fresh install

### Step 2: Create Git Detector (2 hours)
1. Implement remote detection
2. Parse GitHub URLs (https/ssh)
3. Handle edge cases

### Step 3: Redesign Setup Flow (4 hours)
1. Create new prompt flow
2. Implement each setup option
3. Update types and interfaces

### Step 4: Profile Management (4 hours)
1. Create profile CRUD operations
2. Update config writing
3. Integrate with increment creation

### Step 5: Testing (2 hours)
1. Unit tests for each component
2. E2E test for full flow
3. Test migration from old format

### Step 6: Documentation (2 hours)
1. Update CLAUDE.md
2. Create migration guide
3. Update user documentation

## Testing Strategy

### Unit Tests
- Git remote detection
- URL parsing
- Profile management
- Config updates

### Integration Tests
- Full setup flow
- Plugin installation check
- Config persistence

### E2E Tests
- Fresh install with each option
- Migration from existing config
- Increment creation with multi-repo

### Manual Testing Scenarios
1. **No Repository**: Skip setup, configure later
2. **Single Repo**: Standard flow
3. **Multi-Repo**: Add 3 repositories
4. **Monorepo**: Configure with projects
5. **Auto-Detect**: With 2 remotes
6. **Migration**: From old strategy format

## Migration Path

### From Old Format
```json
// OLD
{
  "sync": {
    "provider": "github",
    "owner": "myorg",
    "repo": "myrepo",
    "strategy": "repository-per-team"
  }
}

// NEW
{
  "sync": {
    "profiles": {
      "default": {
        "provider": "github",
        "displayName": "Main Repository",
        "config": {
          "owner": "myorg",
          "repo": "myrepo"
        }
      }
    },
    "defaultProfile": "default"
  }
}
```

### Migration Script
- Auto-detect old format
- Convert to new profile format
- Preserve all settings
- Create backup of old config

## Success Metrics

1. **Installation Success**: No duplicate plugin errors
2. **Setup Completion**: 95% users complete setup
3. **Multi-Repo Usage**: 30% configure multiple repos
4. **Auto-Detection**: Works for 90% of git repos
5. **Migration Success**: 100% backward compatibility

## Risk Mitigation

### Risk: Breaking Existing Configs
**Mitigation**:
- Detect old format automatically
- Migrate transparently
- Keep backward compatibility layer

### Risk: Complex UI Flow
**Mitigation**:
- Progressive disclosure (simple → advanced)
- Smart defaults
- Clear help text

### Risk: Git Detection Failures
**Mitigation**:
- Graceful fallback to manual
- Clear error messages
- Allow manual override

## Code Quality Standards

- TypeScript strict mode
- 90% test coverage for new code
- JSDoc comments for public APIs
- No console.log in production
- Proper error handling