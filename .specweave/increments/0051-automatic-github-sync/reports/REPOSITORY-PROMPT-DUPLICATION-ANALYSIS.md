# Repository Prompt Duplication Analysis

**Date**: 2025-11-23
**Issue**: Duplicate questions during `specweave init` about repository architecture
**Severity**: High (Poor UX, confusing to users)

---

## 🔴 The Problem

Users are asked THE SAME QUESTION TWICE during initialization:

### Current Flow (DUPLICATED)

```
Step 1 (init.ts:1223):
┌─────────────────────────────────────────┐
│ Q: How do you host your repository?    │
│                                         │
│ Options:                                │
│ • GitHub - Single repository            │
│ • GitHub - Multiple repositories  ← ✓   │
│ • Local git only                        │
│ • Other                                 │
└─────────────────────────────────────────┘
          ↓ User selects "Multiple repositories"
          ↓ Sets: isMultiRepo = true


Step 2 (github-multi-repo.ts:133):
┌─────────────────────────────────────────┐
│ Q: Select your repository setup:       │  ❌ DUPLICATE!
│                                         │
│ Options:                                │
│ • No repository yet                     │
│ • Single repository           ← ❌       │
│ • Multiple repositories       ← ❌       │
│ • Monorepo                              │
└─────────────────────────────────────────┘
          ↓ User has to answer AGAIN!
```

**Why This Happens:**
1. `init.ts` asks first question → sets `isMultiRepo = true`
2. Then calls `configureGitHubRepositories()`
3. Which calls `promptGitHubSetupType()`
4. Which asks the SAME question again!

---

## ✅ The Solution

### Approach 1: **Conditional Flow** (Recommended)

Only ask detailed architecture question IF user selected "Multiple repositories":

```typescript
// Step 1: Hosting question (KEEP)
Q: How do you host your repository?
Options:
  • GitHub - Single repository        → Skip to single repo config
  • GitHub - Multiple repositories    → Ask DETAILED architecture question
  • Local git only                    → Skip repo config
  • Other                             → Skip repo config

// Step 2 (ONLY if "Multiple repositories" selected):
Q: What type of multi-repository setup?
Options:
  • 📚 Monorepo (single repo, multiple projects)
  • 🎯 Multi-repo (separate repos per service)
  • 🔗 Parent repo + nested repos
```

### Approach 2: **Merge Questions** (Alternative)

Replace Step 1 with comprehensive single question:

```typescript
Q: What is your repository architecture?
Options:
  1. 📦 Single repository (all code in one repo)
  2. 📚 Monorepo (multiple projects in one repo, e.g., Nx, Turborepo)
  3. 🎯 Multi-repo (separate repos for each service/component)
  4. 🔗 Parent repo + nested repos (GitHub)
  5. 💻 Local git only (no remote sync)
  6. 🔧 Other (GitLab, Bitbucket, etc.)
```

---

## 📋 Implementation Plan

### Recommended: **Approach 1 (Conditional Flow)**

**Why:**
- ✅ Minimal code changes
- ✅ Preserves existing hosting detection logic
- ✅ Clear separation: hosting vs architecture
- ✅ Natural flow: broad → specific

**Changes Needed:**

#### 1. **init.ts** (Keep as-is, but pass context)

```typescript
// Line 1220-1243: Keep existing question
const { hosting } = await inquirer.prompt([{
  message: 'How do you host your repository?',
  choices: [
    'GitHub - Single repository',
    'GitHub - Multiple repositories',  // ← Keep this
    'Local git only',
    'Other'
  ]
}]);

// Pass the hosting choice to configureGitHubRepositories
const repoConfig = await configureGitHubRepositories(
  projectPath,
  language,
  githubToken,
  hosting  // ← NEW: Pass the choice
);
```

#### 2. **github.ts** (Update signature)

```typescript
export async function configureGitHubRepositories(
  projectPath: string,
  language: SupportedLanguage,
  githubToken?: string,
  hostingChoice?: string  // ← NEW: Accept hosting choice
): Promise<{ profiles: any[]; monorepoProjects?: string[] }> {

  // Pass to promptGitHubSetupType
  const setupResult = await promptGitHubSetupType(
    projectPath,
    githubToken,
    hostingChoice  // ← NEW: Pass it down
  );

  // ... rest unchanged
}
```

#### 3. **github-multi-repo.ts** (Conditional prompt)

```typescript
export async function promptGitHubSetupType(
  projectPath?: string,
  githubToken?: string,
  hostingChoice?: string  // ← NEW: Accept hosting choice
): Promise<GitHubSetupResult> {

  // If user already said "single", don't ask again
  if (hostingChoice === 'github-single') {
    return { setupType: 'single' };
  }

  // If user already said "multiple", only ask about TYPE of multi-repo
  if (hostingChoice === 'github-multi') {
    console.log(chalk.cyan('\n🏗️  Multi-Repository Architecture\n'));

    const { multiType } = await inquirer.prompt([{
      type: 'list',
      name: 'multiType',
      message: 'What type of multi-repository setup?',
      choices: [
        {
          name: '📚 Monorepo (single repo, multiple projects)',
          value: 'monorepo'
        },
        {
          name: '🎯 Multi-repo (separate repos per service)',
          value: 'multiple'
        },
        {
          name: '🔗 Parent repo + nested repos (GitHub)',
          value: 'github-parent'
        }
      ]
    }]);

    return { setupType: multiType };
  }

  // Otherwise, fall back to full prompt (for direct calls)
  // ... existing legacy prompt code ...
}
```

---

## 📊 Impact Assessment

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/cli/commands/init.ts` | Pass `hosting` choice | LOW |
| `src/cli/helpers/issue-tracker/github.ts` | Accept `hostingChoice` param | LOW |
| `src/cli/helpers/issue-tracker/github-multi-repo.ts` | Conditional prompt logic | MEDIUM |
| `src/core/repo-structure/repo-structure-manager.ts` | Handle passed choice | MEDIUM |

### Testing Required

- ✅ Single repository flow (should skip multi-repo prompt)
- ✅ Multiple repositories flow (should only ask architecture type)
- ✅ Local git only flow (should skip all repo prompts)
- ✅ Direct calls to `promptGitHubSetupType()` without `hostingChoice` (legacy support)

---

## 🎯 Expected Outcome

### Before (Current Flow)
```
User answers 9 questions:
1. Language
2. Project structure
3. Hosting (Single vs Multiple)  ← Question
4. Issue tracker
5. External tool sync
6. GitHub instance
7. Auth method
8. Repository setup            ← DUPLICATE QUESTION!
9. Architecture details
```

### After (Fixed Flow)
```
User answers 8 questions:
1. Language
2. Project structure
3. Hosting (Single vs Multiple)  ← Question
4. Issue tracker
5. External tool sync
6. GitHub instance
7. Auth method
8. Architecture type (ONLY if "Multiple" selected)  ← Conditional!
```

**Reduction**: 1 duplicate question removed
**UX Improvement**: Natural flow, no confusion

---

## 🔧 Alternative: Approach 2 (Merged Question)

If we want to be more aggressive, we could merge Step 1 and Step 2 entirely:

### Single Comprehensive Question

```typescript
// In init.ts, replace hosting question with:
const { repoArchitecture } = await inquirer.prompt([{
  type: 'list',
  name: 'repoArchitecture',
  message: 'What is your repository architecture?',
  choices: [
    {
      name: '📦 Single repository (all code in one repo)',
      value: 'single'
    },
    {
      name: '📚 Monorepo (multiple projects in one repo)',
      value: 'monorepo',
      hint: 'Examples: Nx, Turborepo, Lerna'
    },
    {
      name: '🎯 Multi-repo (separate repos for each service)',
      value: 'multi-repo',
      hint: 'Examples: Microservices, polyrepo'
    },
    {
      name: '🔗 Parent repo + nested repos',
      value: 'github-parent',
      hint: 'Parent folder with .specweave/ + implementation repos'
    },
    new inquirer.Separator(),
    {
      name: '💻 Local git only (no remote sync)',
      value: 'local'
    },
    {
      name: '🔧 Other (GitLab, Bitbucket, etc.)',
      value: 'other'
    }
  ]
}]);

// Then derive hosting from architecture:
const repositoryHosting =
  ['single', 'monorepo', 'multi-repo', 'github-parent'].includes(repoArchitecture)
    ? 'github'
    : repoArchitecture;

const isMultiRepo = ['monorepo', 'multi-repo', 'github-parent'].includes(repoArchitecture);
```

**Pros:**
- ✅ One question instead of two
- ✅ Clearer options with examples
- ✅ Fewer decision points

**Cons:**
- ❌ Larger refactor
- ❌ Mixes hosting with architecture
- ❌ Loses GitHub detection hint

---

## 💡 Recommendation

**Use Approach 1 (Conditional Flow)** because:

1. ✅ **Minimal changes**: 3 files, low risk
2. ✅ **Preserves existing logic**: Git remote detection, hosting hints
3. ✅ **Natural UX**: Broad question → specific question
4. ✅ **Backward compatible**: Legacy calls still work
5. ✅ **Easy to test**: Clear conditional paths

**Next Steps:**
1. Implement Approach 1 changes
2. Add unit tests for conditional logic
3. Test all 4 flow paths (single, multiple, local, other)
4. Update documentation

---

## 📝 Notes

- This duplication was introduced when `RepoStructureManager` was added
- Enhanced flow tries to call `promptStructure()` which has its own architecture prompt
- Legacy flow still asks full question as fallback
- **Result**: Users see the question twice if enhanced flow is used

**Root Cause**: Lack of context passing between init.ts and github-multi-repo.ts

**Fix**: Pass `hostingChoice` down the call stack and make prompts conditional
