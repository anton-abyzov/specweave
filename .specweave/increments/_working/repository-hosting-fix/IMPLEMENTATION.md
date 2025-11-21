# Repository Hosting Question - Implementation Complete

## Problem
Before this fix, the init flow asked about issue trackers BEFORE asking about repository hosting, which was backwards because:
- Repository choice is more fundamental than issue tracker choice
- SpecWeave currently supports GitHub repos or local git repos without remote
- Issue tracker options depend on repository choice

## Solution
Reordered init flow to ask about repository hosting FIRST, then filter issue tracker options accordingly.

## Changes Made

### 1. Init Command Flow (src/cli/commands/init.ts)

**Lines 1205-1259**: Added repository hosting question BEFORE issue tracker setup

```typescript
// 10.4 Repository Hosting Setup (FUNDAMENTAL!)
// Ask about repository hosting BEFORE issue tracker
// This determines what issue tracker options are available
console.log('');
console.log(chalk.cyan.bold('📦 Repository Hosting'));
console.log('');

// Detect existing git remote
const gitRemoteDetection = detectGitHubRemote(targetDir);
let repositoryHosting: 'github' | 'local' | 'other' = 'local';

if (!isCI) {
  const { hosting } = await inquirer.prompt([{
    type: 'list',
    name: 'hosting',
    message: 'How do you host your repository?',
    choices: [
      {
        name: `🐙 GitHub ${gitRemoteDetection ? '(detected)' : '(recommended)'}`,
        value: 'github'
      },
      {
        name: '💻 Local git only (no remote sync)',
        value: 'local'
      },
      {
        name: '🔧 Other (GitLab, Bitbucket, etc.)',
        value: 'other'
      }
    ],
    default: gitRemoteDetection ? 'github' : 'local'
  }]);

  repositoryHosting = hosting;

  // Show info for non-GitHub choices
  if (hosting === 'other') {
    console.log('');
    console.log(chalk.yellow('⚠️  Note: SpecWeave currently has best integration with GitHub'));
    console.log(chalk.gray('   • GitHub: Full sync support (issues, milestones, labels)'));
    console.log(chalk.gray('   • GitLab/Bitbucket: Limited support (manual sync)'));
    console.log(chalk.gray('   • You can still use SpecWeave locally and sync manually'));
    console.log('');
  } else if (hosting === 'local') {
    console.log('');
    console.log(chalk.gray('✓ Local-only mode'));
    console.log(chalk.gray('   • All work tracked locally in .specweave/'));
    console.log(chalk.gray('   • No remote sync (you can add GitHub later)'));
    console.log('');
  }
}
```

**Lines 1313, 1330**: Pass `repositoryHosting` to `setupIssueTracker`

```typescript
await setupIssueTracker({
  projectPath: targetDir,
  language: language as SupportedLanguage,
  maxRetries: 3,
  isFrameworkRepo,
  repositoryHosting  // ← NEW: Pass repository choice
});
```

### 2. Issue Tracker Setup (src/cli/helpers/issue-tracker/index.ts)

**Line 67**: Accept `repositoryHosting` parameter

```typescript
export async function setupIssueTracker(options: SetupOptions): Promise<boolean> {
  const { projectPath, language, maxRetries = 3, repositoryHosting = 'github' } = options;
```

**Lines 93-100**: Smart defaults based on repository hosting

```typescript
// Smart default based on repository hosting
let defaultTracker: IssueTracker = detection.tracker;
if (repositoryHosting === 'github') {
  // If hosting on GitHub, strongly suggest GitHub Issues
  defaultTracker = 'github';
} else if (repositoryHosting === 'local') {
  // If local-only, default to skipping
  defaultTracker = 'none';
}
```

**Lines 103-109**: Contextual messages

```typescript
// Show contextual message based on repository hosting
if (repositoryHosting === 'github') {
  console.log(chalk.gray('💡 GitHub hosting detected - GitHub Issues recommended for seamless integration'));
  console.log('');
} else if (repositoryHosting === 'local') {
  console.log(chalk.gray('💡 Local-only repository - you can skip issue tracker or use external tools'));
  console.log('');
}
```

**Lines 111-146**: Filter choices based on repository hosting

```typescript
// Build choices based on repository hosting
const choices: Array<{ name: string; value: IssueTracker }> = [];

// GitHub Issues - only show if GitHub or local repo (local can add GitHub remote later)
if (repositoryHosting === 'github' || repositoryHosting === 'local') {
  choices.push({
    name: `🐙 GitHub Issues ${repositoryHosting === 'github' ? '(recommended)' : detection.tracker === 'github' && detection.detected ? '(detected)' : ''}`,
    value: 'github'
  });
}

// Jira - available for all repository types
choices.push({
  name: `📋 Jira`,
  value: 'jira'
});

// Azure DevOps - available for all repository types
choices.push({
  name: `🔷 Azure DevOps ${detection.tracker === 'ado' && detection.detected ? '(detected)' : ''}`,
  value: 'ado'
});

// None - always available
choices.push({
  name: `⏭️  None (skip)${repositoryHosting === 'local' ? ' - recommended for local-only' : ''}`,
  value: 'none'
});

const { tracker } = await inquirer.prompt([{
  type: 'list',
  name: 'tracker',
  message: 'Which issue tracker do you use?',
  choices,
  default: defaultTracker
}]);
```

### 3. Type Definitions (src/cli/helpers/issue-tracker/types.ts)

**Lines 130, 140**: Added types for repository hosting

```typescript
/**
 * Repository hosting types
 */
export type RepositoryHosting = 'github' | 'local' | 'other';

/**
 * Setup options
 */
export interface SetupOptions {
  projectPath: string;
  language: SupportedLanguage;
  maxRetries?: number;
  isFrameworkRepo?: boolean;
  repositoryHosting?: RepositoryHosting; // ← NEW: Repository hosting choice
}
```

## User Experience

### Before Fix
1. ❌ Ask about issue tracker (GitHub/Jira/ADO/None)
2. Then deal with repository setup

### After Fix
1. ✅ Ask about repository hosting (GitHub/local/other)
2. Then ask about issue tracker (filtered based on repo choice)

## Flow Examples

### Example 1: GitHub Repository
```
📦 Repository Hosting

? How do you host your repository?
  🐙 GitHub (detected)
❯ 💻 Local git only (no remote sync)
  🔧 Other (GitLab, Bitbucket, etc.)

[User selects GitHub]

✅ GitHub repository selected
   • Remote: anton-abyzov/specweave

🎯 Issue Tracker Integration

💡 GitHub hosting detected - GitHub Issues recommended for seamless integration

? Which issue tracker do you use?
❯ 🐙 GitHub Issues (recommended)  ← Default!
  📋 Jira
  🔷 Azure DevOps
  ⏭️  None (skip)
```

### Example 2: Local-Only Repository
```
📦 Repository Hosting

? How do you host your repository?
  🐙 GitHub (recommended)
❯ 💻 Local git only (no remote sync)
  🔧 Other (GitLab, Bitbucket, etc.)

[User selects Local]

✓ Local-only mode
   • All work tracked locally in .specweave/
   • No remote sync (you can add GitHub later)

🎯 Issue Tracker Integration

💡 Local-only repository - you can skip issue tracker or use external tools

? Which issue tracker do you use?
  🐙 GitHub Issues
  📋 Jira
  🔷 Azure DevOps
❯ ⏭️  None (skip) - recommended for local-only  ← Default!
```

### Example 3: Other Repository (GitLab, Bitbucket)
```
📦 Repository Hosting

? How do you host your repository?
  🐙 GitHub (recommended)
  💻 Local git only (no remote sync)
❯ 🔧 Other (GitLab, Bitbucket, etc.)

[User selects Other]

⚠️  Note: SpecWeave currently has best integration with GitHub
   • GitHub: Full sync support (issues, milestones, labels)
   • GitLab/Bitbucket: Limited support (manual sync)
   • You can still use SpecWeave locally and sync manually

🎯 Issue Tracker Integration

? Which issue tracker do you use?
  (GitHub Issues NOT shown - no GitHub repo!)
❯ 📋 Jira
  🔷 Azure DevOps
  ⏭️  None (skip)
```

## Key Benefits

1. **Logical Flow**: Repository choice comes before issue tracker (more fundamental)
2. **Smart Defaults**: GitHub hosting → GitHub Issues recommended
3. **Filtered Choices**: GitHub Issues hidden if no GitHub repo
4. **Contextual Guidance**: Clear messages about what each choice means
5. **User Clarity**: Users understand SpecWeave's GitHub-first approach early

## Testing

Build successful:
```bash
npm run rebuild
✓ TypeScript compiled successfully
✓ All hook dependencies copied
```

## Files Changed

1. `src/cli/commands/init.ts` - Added repository hosting question, pass to setupIssueTracker
2. `src/cli/helpers/issue-tracker/index.ts` - Accept repositoryHosting, filter choices, smart defaults
3. `src/cli/helpers/issue-tracker/types.ts` - Added RepositoryHosting type and SetupOptions field

## Next Steps

- [x] Implementation complete
- [x] Build verified
- [ ] End-to-end testing (manual)
- [ ] Update documentation (if needed)
- [ ] Commit changes

## Related

- User request: "Repository hosting question should come before issue tracker"
- Architecture: GitHub-first design (other repos have limited support)
- Future: Could add full GitLab/Bitbucket support later
