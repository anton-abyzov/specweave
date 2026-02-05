---
description: Clone GitHub repositories to local workspace. Use after init if cloning was skipped, to resume interrupted cloning, or to add repos later. Already-cloned repos are automatically skipped.
---

# Clone GitHub Repositories Command

You are a GitHub repository cloning expert. Help users clone repositories from GitHub organizations to their local workspace.

## Purpose

This command clones GitHub repositories **after** initial SpecWeave setup (`specweave init`). Use when:
- User skipped cloning during init
- **Resuming interrupted cloning** (already-cloned repos are skipped!)
- Adding repositories from organization
- Selective cloning with pattern filtering
- Retrying after partial failures

## CRITICAL: NEVER-STOP BEHAVIOR

**This command NEVER stops on individual repo failures!**
- Each repo failure is logged but cloning continues
- Already-cloned repos are automatically skipped (resume = re-run!)
- Final status: `completed` (all success) or `completed_with_warnings` (some failed)
- Failed repos are listed in result.json for easy retry

## Command Syntax

```bash
# Interactive mode (prompts for everything)
/sw-github:clone

# Clone from specific org
/sw-github:clone --org "mycompany"

# With pattern filter (glob)
/sw-github:clone --pattern "api-*"

# Regex pattern
/sw-github:clone --pattern "regex:^frontend-.*$"

# Dry-run (preview only)
/sw-github:clone --dry-run

# Resume/retry - just run again! Already cloned repos are skipped
/sw-github:clone
```

## Your Task

When the user runs this command:

### Step 1: Check Prerequisites

```typescript
import { readEnvFile, parseEnvFile } from '../../../src/utils/env-file.js';
import chalk from 'chalk';

const projectPath = process.cwd();

// Check for GitHub token
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!token) {
  // Try .env file
  const envContent = readEnvFile(projectPath);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    if (parsed.GH_TOKEN || parsed.GITHUB_TOKEN) {
      // Token found in .env
    } else {
      console.log(chalk.red('❌ No GitHub token found.'));
      console.log(chalk.gray('   Set GH_TOKEN or GITHUB_TOKEN environment variable.'));
      console.log(chalk.gray('   Or add to .env file: GH_TOKEN=ghp_xxxx'));
      return;
    }
  } else {
    console.log(chalk.red('❌ No GitHub token found.'));
    console.log(chalk.gray('   Set GH_TOKEN or GITHUB_TOKEN environment variable.'));
    return;
  }
}

console.log(chalk.blue('\n📦 GitHub Repository Cloning\n'));
console.log(chalk.green('   ✓ GitHub token found'));
```

### Step 2: Get Organization

```typescript
import { input } from '@inquirer/prompts';

let org = args.org;

if (!org) {
  // Try to detect from config
  const configPath = path.join(projectPath, '.specweave', 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.github?.org) {
      org = config.github.org;
      console.log(chalk.gray(`   Organization: ${org} (from config)`));
    }
  }

  if (!org) {
    // Try to detect from git remote
    const { execSync } = await import('child_process');
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      const match = remote.match(/github\.com[:/]([^/]+)/);
      if (match) {
        org = match[1];
        console.log(chalk.gray(`   Detected org from git remote: ${org}`));
      }
    } catch {}
  }

  if (!org) {
    org = await input({
      message: 'Enter GitHub organization or username:',
      validate: v => v.trim() ? true : 'Organization required'
    });
  }
}

console.log(chalk.gray(`   Organization: ${org}`));
```

### Step 3: Fetch Repositories

```typescript
console.log(chalk.gray('\n   Fetching repositories...'));

// Fetch repos from GitHub API with pagination
const pat = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const allRepos = [];
let page = 1;
const perPage = 100;

while (true) {
  // Try org repos first, fall back to user repos
  let response = await fetch(
    `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=${perPage}&page=${page}`,
    {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );

  if (response.status === 404) {
    // Try as user
    response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(org)}/repos?per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
  }

  if (!response.ok) {
    console.log(chalk.red(`❌ Failed to fetch repos: ${response.status}`));
    const error = await response.text();
    console.log(chalk.gray(`   ${error}`));
    return;
  }

  const batch = await response.json();
  if (batch.length === 0) break;

  allRepos.push(...batch);

  if (batch.length < perPage) break;
  page++;

  // Progress for large orgs
  if (allRepos.length % 100 === 0) {
    console.log(chalk.gray(`   Fetched ${allRepos.length} repos...`));
  }
}

if (allRepos.length === 0) {
  console.log(chalk.yellow('\n⚠️  No repositories found.'));
  return;
}

console.log(chalk.green(`   ✓ Found ${allRepos.length} repositories in ${org}`));
```

### Step 4: Check Already Cloned (Resume Detection)

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Check which repos already exist
const alreadyCloned = [];
const needsCloning = [];

for (const repo of allRepos) {
  const repoPath = path.join(projectPath, repo.name, '.git');
  if (fs.existsSync(repoPath)) {
    alreadyCloned.push(repo);
  } else {
    needsCloning.push(repo);
  }
}

if (alreadyCloned.length > 0) {
  console.log(chalk.cyan(`\n   📂 Already cloned: ${alreadyCloned.length} repos (will be skipped)`));
  if (alreadyCloned.length <= 5) {
    alreadyCloned.forEach(r => console.log(chalk.gray(`      ✓ ${r.name}`)));
  } else {
    alreadyCloned.slice(0, 3).forEach(r => console.log(chalk.gray(`      ✓ ${r.name}`)));
    console.log(chalk.gray(`      ... and ${alreadyCloned.length - 3} more`));
  }
}

console.log(chalk.blue(`\n   📦 Need to clone: ${needsCloning.length} repos`));
```

### Step 5: Apply Pattern Filter

```typescript
import { filterRepositoriesByPattern } from '../../../src/cli/helpers/selection-strategy.js';
import { select, input } from '@inquirer/prompts';

let filteredRepos = needsCloning;
let patternDescription = 'all';

if (args.pattern) {
  const isRegex = args.pattern.startsWith('regex:');
  const pattern = isRegex ? args.pattern.slice(6) : args.pattern;

  const clonePattern = {
    strategy: isRegex ? 'pattern-regex' : 'pattern-glob',
    pattern: pattern,
    isRegex
  };

  filteredRepos = filterRepositoriesByPattern(needsCloning, clonePattern);
  patternDescription = `matching "${pattern}"`;

  console.log(chalk.gray(`   Pattern: ${args.pattern}`));
  console.log(chalk.gray(`   Matched: ${filteredRepos.length} of ${needsCloning.length} repos\n`));
} else if (needsCloning.length > 0) {
  const strategy = await select({
    message: 'How do you want to select repositories?',
    choices: [
      { name: 'All - Clone all repositories', value: 'all' },
      { name: 'Pattern (glob) - e.g., "api-*", "*-backend"', value: 'pattern-glob' },
      { name: 'Pattern (regex) - e.g., "^api-.*$"', value: 'pattern-regex' }
    ]
  });

  if (strategy !== 'all') {
    const pattern = await input({
      message: 'Enter pattern:',
      validate: v => v.trim() ? true : 'Pattern required'
    });

    const clonePattern = {
      strategy,
      pattern: pattern.trim(),
      isRegex: strategy === 'pattern-regex'
    };

    filteredRepos = filterRepositoriesByPattern(needsCloning, clonePattern);
    patternDescription = `matching "${pattern.trim()}"`;
  }
}

if (filteredRepos.length === 0) {
  if (alreadyCloned.length > 0) {
    console.log(chalk.green(`\n✅ All ${alreadyCloned.length} repos already cloned. Nothing to do!`));
  } else {
    console.log(chalk.yellow(`\n⚠️  No repositories ${patternDescription}.`));
  }
  return;
}
```

### Step 6: Preview and Confirm

```typescript
import { confirm } from '@inquirer/prompts';

console.log(chalk.blue(`\n📦 Repositories to clone (${filteredRepos.length}):\n`));

// Show preview (max 20)
filteredRepos.slice(0, 20).forEach(repo => {
  console.log(chalk.gray(`   • ${repo.name}`));
});

if (filteredRepos.length > 20) {
  console.log(chalk.gray(`   ... and ${filteredRepos.length - 20} more\n`));
}

if (args.dryRun) {
  console.log(chalk.cyan('\n🔎 DRY RUN: No repositories will be cloned.\n'));
  console.log(chalk.gray('   Remove --dry-run to actually clone.'));
  return;
}

const confirmed = await confirm({
  message: `Clone ${filteredRepos.length} repositories to current directory?`,
  default: true
});

if (!confirmed) {
  console.log(chalk.gray('\n⏭️  Cloning cancelled.\n'));
  return;
}
```

### Step 7: Start Background Cloning

```typescript
import { triggerGitHubRepoCloning } from '../../../src/cli/helpers/init/github-repo-cloning.js';

// Build selection
const githubRepoSelection = {
  org,
  pat: process.env.GH_TOKEN || process.env.GITHUB_TOKEN
};

// Build clonePattern
const clonePatternResult = args.pattern
  ? {
      strategy: args.pattern.startsWith('regex:') ? 'pattern-regex' : 'pattern-glob',
      pattern: args.pattern.startsWith('regex:') ? args.pattern.slice(6) : args.pattern
    }
  : { strategy: 'all' };

// Trigger background cloning
const jobId = await triggerGitHubRepoCloning(projectPath, githubRepoSelection, clonePatternResult);

if (jobId) {
  console.log(chalk.green('\n✅ Clone job started successfully!\n'));
  console.log(chalk.blue('📋 Key Points:'));
  console.log(chalk.gray('   • Cloning runs in background - you can continue working'));
  console.log(chalk.gray('   • Already-cloned repos are automatically skipped'));
  console.log(chalk.gray('   • Individual failures do NOT stop the job'));
  console.log(chalk.gray('   • To resume after interruption: just run /sw-github:clone again!\n'));

  console.log(chalk.blue('🔧 Commands:'));
  console.log(chalk.cyan(`   /sw:jobs                    → Check progress`));
  console.log(chalk.cyan(`   /sw:jobs --follow ${jobId.slice(0, 8)} → Follow live`));
  console.log(chalk.cyan(`   /sw:jobs --logs ${jobId.slice(0, 8)}   → View logs`));
}
```

## Examples

### Example 1: Fresh Clone
**User**: `/sw-github:clone --org olympusnova`

**Output**:
```
📦 GitHub Repository Cloning

   ✓ GitHub token found
   Organization: olympusnova

   Fetching repositories...
   ✓ Found 512 repositories in olympusnova

   📦 Need to clone: 512 repos

How do you want to select repositories?
> All - Clone all repositories

📦 Repositories to clone (512):

   • api-gateway
   • frontend-web
   • mobile-app
   ... and 509 more

Clone 512 repositories to current directory? (Y/n)

🔄 Starting background clone for 512 repositories...

   ✓ Clone job started in background (PID: 12345)

✅ Clone job started successfully!

📋 Key Points:
   • Cloning runs in background - you can continue working
   • Already-cloned repos are automatically skipped
   • Individual failures do NOT stop the job
   • To resume after interruption: just run /sw-github:clone again!

🔧 Commands:
   /sw:jobs                    → Check progress
   /sw:jobs --follow abc12345  → Follow live
   /sw:jobs --logs abc12345    → View logs
```

### Example 2: Resume After Interruption
**User**: `/sw-github:clone` (after previous job was interrupted at 87/512)

**Output**:
```
📦 GitHub Repository Cloning

   ✓ GitHub token found
   Organization: olympusnova (from config)

   Fetching repositories...
   ✓ Found 512 repositories in olympusnova

   📂 Already cloned: 87 repos (will be skipped)
      ✓ api-gateway
      ✓ frontend-web
      ✓ mobile-app
      ... and 84 more

   📦 Need to clone: 425 repos

Clone 425 repositories to current directory? (Y/n)

🔄 Resuming clone for 425 remaining repositories...
```

### Example 3: Pattern Filter
**User**: `/sw-github:clone --pattern "api-*"`

**Output**:
```
📦 GitHub Repository Cloning

   Pattern: api-*
   Matched: 45 of 512 repos

📦 Repositories to clone (45):

   • api-gateway
   • api-auth
   • api-payments
   ...
```

### Example 4: Dry Run
**User**: `/sw-github:clone --dry-run`

**Output**:
```
📦 Repositories to clone (512):

   • api-gateway
   • frontend-web
   ...

🔎 DRY RUN: No repositories will be cloned.
   Remove --dry-run to actually clone.
```

## Important Notes

### Resume = Just Re-run!
**There's no special resume command.** Just run `/sw-github:clone` again:
- Already-cloned repos are detected via `.git` folder
- They're automatically skipped (instant, no API calls)
- Only remaining repos are queued for cloning

### Never Stops on Failure
- Each repo cloned independently
- Failures logged but don't stop the job
- Final status: `completed_with_warnings` if any failed
- Failed repo list saved to `result.json`

### Retry Failed Repos
After job completes with warnings:
```bash
# Check which repos failed
cat .specweave/state/jobs/<jobId>/result.json

# Just run clone again - it skips successful ones!
/sw-github:clone
```

## Related Commands

- `/sw:init` - Initial SpecWeave setup (includes repo cloning option)
- `/sw:jobs` - Monitor background jobs
- `/sw:jobs --follow <id>` - Watch progress live
- `/sw-github:sync` - Sync with GitHub Issues

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| No GitHub token | Missing env var | Set `GH_TOKEN` or `GITHUB_TOKEN` |
| 401 Unauthorized | Invalid token | Check token has `repo` scope |
| 404 Not Found | Wrong org name | Verify organization/username |
| Rate limit | Too many API calls | Wait and retry, or use pagination |
| Clone failure | Permission/network | Job continues, repo listed in failures |

---

**Multi-Repo Support**: Perfect for microservices architectures with many GitHub repositories.
