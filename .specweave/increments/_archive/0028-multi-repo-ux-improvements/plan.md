# Implementation Plan: Multi-Repository Setup UX Improvements

**Increment**: 0028-multi-repo-ux-improvements
**Created**: 2025-11-11
**Target Completion**: 2025-11-11

## Overview

This plan outlines the implementation steps to fix 4 critical UX issues in the multi-repository GitHub setup flow during `specweave init`.

## Architecture Overview

### Files to Create/Modify

```
src/
├── core/
│   └── repo-structure/
│       ├── repo-structure-manager.ts          # MODIFY: Lines 288-520
│       ├── folder-detector.ts                 # CREATE: Auto-detection
│       └── prompt-consolidator.ts             # MODIFY: Update clarifications
├── cli/
│   └── helpers/
│       └── issue-tracker/
│           ├── github-multi-repo.ts           # MODIFY: Lines 285-300
│           └── github.ts                      # MODIFY: Add validation
└── utils/
    └── project-validator.ts                   # CREATE: Project validation

tests/
├── unit/
│   └── repo-structure/
│       ├── folder-detector.test.ts            # CREATE
│       └── repository-prompts.test.ts         # CREATE
└── integration/
    └── init-multi-repo.test.ts                # MODIFY
```

## Phase 1: Repository Count Clarification (US-001)

### 1.1. Update `repo-structure-manager.ts`

**File**: `src/core/repo-structure/repo-structure-manager.ts`
**Lines**: 288-419

**Changes**:

```typescript
// BEFORE: Lines 288-298 (old code)
private async configureMultiRepo(useParent: boolean = true): Promise<RepoStructureConfig> {
  console.log(chalk.cyan('\n🎯 Multi-Repository Configuration\n'));
  console.log(chalk.gray('This creates separate repositories for each service/component.\n'));

  // Show parent repo benefits if using parent approach
  if (useParent) {
    console.log(chalk.blue(getParentRepoBenefits()));
    console.log('');
  }
  // ... rest
}

// AFTER: Add clarification BEFORE count prompt (new code)
private async configureMultiRepo(useParent: boolean = true): Promise<RepoStructureConfig> {
  console.log(chalk.cyan('\n🎯 Multi-Repository Configuration\n'));
  console.log(chalk.gray('This creates separate repositories for each service/component.\n'));

  // Show parent repo benefits if using parent approach
  if (useParent) {
    console.log(chalk.blue(getParentRepoBenefits()));
    console.log('');
  }

  // ... configure parent repo (lines 316-398)

  // ✅ NEW: Show clarification BEFORE asking for count
  if (useParent && config.parentRepo) {
    console.log(chalk.cyan('\n📊 Repository Count\n'));
    console.log(chalk.gray('You will create:'));
    console.log(chalk.white('  • 1 parent repository (specs, docs, increments)'));
    console.log(chalk.white('  • N implementation repositories (your services/apps)'));
    console.log(chalk.gray('\nNext question asks for: IMPLEMENTATION repositories ONLY (not counting parent)\n'));
  }

  // Ask how many implementation repositories
  const { repoCount } = await inquirer.prompt([{
    type: 'number',
    name: 'repoCount',
    message: useParent
      ? '📦 How many IMPLEMENTATION repositories? (not counting parent)'  // ✅ UPDATED
      : 'How many repositories?',
    default: 2,  // ✅ CHANGED from 3 to 2
    validate: (input: number) => {
      if (input < 1) return 'Need at least 1 implementation repository';  // ✅ UPDATED
      if (input > 10) return 'Maximum 10 implementation repositories';     // ✅ UPDATED
      return true;
    }
  }]);

  // ✅ NEW: Show summary AFTER for confirmation
  if (useParent && config.parentRepo) {
    const totalRepos = 1 + repoCount;
    console.log(chalk.green(`\n✓ Total repositories to create: ${totalRepos} (1 parent + ${repoCount} implementation)\n`));
  }

  // ... rest of function
}
```

**Tests**: Manual testing via `specweave init`

---

## Phase 2: Single-Value Repository ID (US-002)

### 2.1. Update `github-multi-repo.ts`

**File**: `src/cli/helpers/issue-tracker/github-multi-repo.ts`
**Lines**: 285-300

**Changes**:

```typescript
// BEFORE: Lines 285-300 (old code)
{
  type: 'input',
  name: 'id',
  message: 'Repository ID (e.g., frontend, backend, api):',  // ❌ MISLEADING
  validate: (input: string) => {
    if (!input.trim()) {
      return 'ID is required';
    }
    if (!/^[a-z][a-z0-9-]*$/.test(input)) {
      return 'ID must be lowercase letters, numbers, and hyphens';
    }
    if (profiles.some(p => p.id === input)) {
      return 'ID must be unique';
    }
    return true;
  }
}

// AFTER: Update prompt and add comma validation (new code)
{
  type: 'input',
  name: 'id',
  message: 'Repository ID (single identifier, e.g., "frontend" or "backend"):',  // ✅ CLEAR
  validate: (input: string) => {
    if (!input.trim()) {
      return 'ID is required';
    }
    // ✅ NEW: Explicit comma check
    if (input.includes(',')) {
      return 'One ID at a time (no commas)';
    }
    if (!/^[a-z][a-z0-9-]*$/.test(input)) {
      return 'ID must be lowercase letters, numbers, and hyphens';
    }
    if (profiles.some(p => p.id === input)) {
      return 'ID must be unique';
    }
    return true;
  }
}
```

**Tests**: Unit test for comma validation

---

## Phase 3: Project ID Validation (US-003)

### 3.1. Create `project-validator.ts`

**File**: `src/utils/project-validator.ts` (NEW FILE)

```typescript
/**
 * Project Configuration Validator
 *
 * Validates that project contexts are properly configured
 * before GitHub sync setup.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

export interface ProjectValidationResult {
  valid: boolean;
  hasProjects: boolean;
  projectCount: number;
  projects: string[];
}

/**
 * Validate project configuration exists
 *
 * @param projectPath - Path to project directory
 * @returns Validation result
 */
export async function validateProjectConfiguration(
  projectPath: string
): Promise<ProjectValidationResult> {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  // Check config file exists
  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      hasProjects: false,
      projectCount: 0,
      projects: []
    };
  }

  const config = await fs.readJson(configPath);

  // Check if projects are configured
  const hasProjects = !!(config.sync?.projects && Object.keys(config.sync.projects).length > 0);
  const projects = hasProjects ? Object.keys(config.sync.projects) : [];

  return {
    valid: hasProjects,
    hasProjects,
    projectCount: projects.length,
    projects
  };
}

/**
 * Prompt user to create project context if missing
 *
 * @param projectPath - Path to project directory
 * @returns True if user wants to create project now
 */
export async function promptCreateProject(projectPath: string): Promise<boolean> {
  console.log(chalk.yellow('\n⚠️  No projects configured!'));
  console.log(chalk.gray('   Project contexts organize specs and increments by team/service'));
  console.log(chalk.gray('   GitHub sync requires at least one project context\n'));

  const { createProject } = await inquirer.prompt([{
    type: 'confirm',
    name: 'createProject',
    message: 'Create a project context now?',
    default: true
  }]);

  return createProject;
}
```

### 3.2. Update `github.ts`

**File**: `src/cli/helpers/issue-tracker/github.ts`
**Location**: After credential validation, before repository setup

```typescript
import { validateProjectConfiguration, promptCreateProject } from '../../utils/project-validator.js';

// ... existing code ...

export async function setupGitHubIssueTracker(options: {
  projectPath: string;
  language: SupportedLanguage;
  maxRetries?: number;
  isFrameworkRepo?: boolean;
}): Promise<void> {
  // ... existing credential validation ...

  // ✅ NEW: Validate project configuration
  console.log(chalk.cyan('\n🔍 Validating Project Configuration\n'));

  const validation = await validateProjectConfiguration(options.projectPath);

  if (!validation.valid) {
    const shouldCreate = await promptCreateProject(options.projectPath);

    if (shouldCreate) {
      // Import project creation module dynamically
      const { createProjectContext } = await import('../../commands/project-context.js');
      await createProjectContext(options.projectPath);

      console.log(chalk.green('\n✓ Project context created\n'));
    } else {
      console.log(chalk.gray('   → You can create projects later with: /specweave:project create\n'));
    }
  } else {
    console.log(chalk.green(`✓ Found ${validation.projectCount} project context(s): ${validation.projects.join(', ')}\n`));
  }

  // ... rest of GitHub setup ...
}
```

**Tests**: Unit test for validation logic

---

## Phase 4: Auto-Detection (US-004)

### 4.1. Create `folder-detector.ts`

**File**: `src/core/repo-structure/folder-detector.ts` (NEW FILE)

```typescript
/**
 * Folder Detector
 *
 * Auto-detects repository structure from existing folders
 * to suggest repository count during multi-repo setup.
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface RepositoryHints {
  suggestedCount: number;
  detectedFolders: string[];
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Common repository patterns
 */
const COMMON_PATTERNS = [
  // Direct folders (highest confidence)
  'frontend',
  'backend',
  'api',
  'mobile',
  'web',
  'admin',
  'client',
  'server',
  'ui',

  // Service patterns (medium confidence)
  'services/*',
  'apps/*',
  'packages/*',

  // Microservice patterns (medium confidence)
  '*-service',
  '*-api',
  '*-app'
];

/**
 * Detect repository hints from existing folder structure
 *
 * @param projectPath - Path to project directory
 * @returns Repository hints with suggested count
 */
export async function detectRepositoryHints(
  projectPath: string
): Promise<RepositoryHints> {
  const detected: string[] = [];

  for (const pattern of COMMON_PATTERNS) {
    if (pattern.includes('*')) {
      // Glob pattern
      try {
        const matches = await glob(pattern, {
          cwd: projectPath,
          absolute: false,
          nodir: false
        });

        // Filter to directories only
        const dirs = matches.filter(m => {
          const fullPath = path.join(projectPath, m);
          return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
        });

        detected.push(...dirs);
      } catch (error) {
        // Ignore glob errors
      }
    } else {
      // Direct folder check
      const folderPath = path.join(projectPath, pattern);
      if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
        detected.push(pattern);
      }
    }
  }

  // Deduplicate
  const uniqueFolders = [...new Set(detected)];

  // Calculate confidence
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (uniqueFolders.length >= 3) {
    confidence = 'high';
  } else if (uniqueFolders.length >= 2) {
    confidence = 'medium';
  }

  // Suggest count (at least 2 for multi-repo)
  const suggestedCount = Math.max(2, uniqueFolders.length);

  return {
    suggestedCount,
    detectedFolders: uniqueFolders,
    confidence
  };
}
```

### 4.2. Update `repo-structure-manager.ts` (Use Auto-Detection)

**File**: `src/core/repo-structure/repo-structure-manager.ts`
**Location**: Before asking for repository count

```typescript
import { detectRepositoryHints } from './folder-detector.js';

// ... inside configureMultiRepo() method ...

// ✅ NEW: Auto-detect existing folders
const hints = await detectRepositoryHints(this.projectPath);

if (hints.detectedFolders.length > 0) {
  console.log(chalk.green(`\n✓ Detected ${hints.detectedFolders.length} service folder(s):`));
  hints.detectedFolders.forEach(f => console.log(chalk.gray(`  • ${f}`)));
  console.log('');
}

// Ask how many implementation repositories
const { repoCount } = await inquirer.prompt([{
  type: 'number',
  name: 'repoCount',
  message: useParent
    ? '📦 How many IMPLEMENTATION repositories? (not counting parent)'
    : 'How many repositories?',
  default: hints.suggestedCount,  // ✅ Use auto-detected count as default
  validate: (input: number) => {
    if (input < 1) return 'Need at least 1 implementation repository';
    if (input > 10) return 'Maximum 10 implementation repositories';
    return true;
  }
}]);
```

**Tests**: Unit test for folder detection logic

---

## Testing Strategy

### Unit Tests

1. **`tests/unit/repo-structure/folder-detector.test.ts`**
   - Test detection of common patterns
   - Test confidence calculation
   - Test suggested count logic

2. **`tests/unit/utils/project-validator.test.ts`**
   - Test validation with/without projects
   - Test project count calculation

3. **`tests/unit/cli/helpers/repository-id-validation.test.ts`**
   - Test comma rejection
   - Test single-value acceptance

### Integration Tests

1. **Manual Testing** (`specweave init`)
   - Run with multi-repo + parent
   - Verify all prompts show correct text
   - Verify auto-detection works
   - Verify validation catches missing projects

2. **Automated E2E** (if time permits)
   - Mock folder structure
   - Run init command
   - Assert correct defaults shown

---

## Rollout Plan

### Phase 1: Implementation (2 hours)
- Implement all 4 user stories
- Create new files (folder-detector.ts, project-validator.ts)
- Modify existing files (repo-structure-manager.ts, github-multi-repo.ts, github.ts)

### Phase 2: Testing (1 hour)
- Write unit tests
- Manual testing with `specweave init`
- Fix any bugs found

### Phase 3: Documentation (0.5 hours)
- Update CLAUDE.md if needed
- Create COMPLETION-REPORT.md

### Phase 4: Review & Merge (0.5 hours)
- Code review
- Final testing
- Close increment

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing flow | Careful refactoring, preserve all logic |
| Auto-detection false positives | Make suggestions, don't enforce (user can override) |
| Project validation too strict | Make optional (prompt), don't block setup |

---

## Definition of Done

- [x] All 4 user stories implemented
- [x] All acceptance criteria met
- [x] Unit tests written and passing
- [x] Manual testing completed
- [x] No regressions in existing flow
- [x] Documentation updated
- [x] COMPLETION-REPORT.md created

---

**Estimated Time**: 4 hours
**Target Completion**: 2025-11-11
