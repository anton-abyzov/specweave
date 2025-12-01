---
name: specweave-ado:clone-repos
description: Clone Azure DevOps repositories to local workspace. Use after init if cloning was skipped, or to add repos later.
---

# Clone Azure DevOps Repositories Command

You are an Azure DevOps repository cloning expert. Help users clone repositories from ADO projects to their local workspace.

## Purpose

This command clones Azure DevOps repositories **after** initial SpecWeave setup (`specweave init`). Use when:
- User skipped cloning during init
- Adding repositories from additional projects
- Re-cloning after cleanup
- Selective cloning with pattern filtering

## Command Syntax

```bash
# Interactive mode (prompts for everything)
/specweave-ado:clone-repos

# With pattern filter
/specweave-ado:clone-repos --pattern "sw-*"

# Regex pattern
/specweave-ado:clone-repos --pattern "regex:^api-.*$"

# Specific project only
/specweave-ado:clone-repos --project "MyProject"

# Dry-run (preview only)
/specweave-ado:clone-repos --dry-run
```

## Your Task

When the user runs this command:

### Step 1: Check Prerequisites

```typescript
import { readEnvFile, parseEnvFile } from '../../../src/utils/env-file.js';
import chalk from 'chalk';

const projectPath = process.cwd();
const envContent = readEnvFile(projectPath);

if (!envContent) {
  console.log(chalk.red('❌ No .env file found. Run `specweave init` first.'));
  return;
}

const parsed = parseEnvFile(envContent);

if (!parsed.AZURE_DEVOPS_PAT || !parsed.AZURE_DEVOPS_ORG) {
  console.log(chalk.red('❌ Missing Azure DevOps credentials.'));
  console.log(chalk.gray('   Run `specweave init` with Azure DevOps provider.'));
  return;
}

const org = parsed.AZURE_DEVOPS_ORG;
const pat = parsed.AZURE_DEVOPS_PAT;

console.log(chalk.blue('\n📦 ADO Repository Cloning\n'));
console.log(chalk.gray(`   Organization: ${org}`));
```

### Step 2: Get Project Selection

```typescript
import { AzureDevOpsProvider } from '../../../src/core/repo-structure/providers/azure-devops-provider.js';

const provider = new AzureDevOpsProvider();

// If project specified via CLI, use it
let selectedProjects: string[] = [];

if (args.project) {
  selectedProjects = [args.project];
  console.log(chalk.gray(`   Project: ${args.project} (from CLI)`));
} else {
  // Fetch available projects
  console.log(chalk.gray('\n   Fetching projects...'));

  const response = await fetch(
    `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`,
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(':' + pat).toString('base64')}`,
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    console.log(chalk.red(`❌ Failed to fetch projects: ${response.status}`));
    return;
  }

  const data = await response.json();
  const projects = data.value || [];

  if (projects.length === 0) {
    console.log(chalk.yellow('⚠️  No projects found in organization.'));
    return;
  }

  // Prompt for project selection
  const { checkbox } = await import('@inquirer/prompts');

  selectedProjects = await checkbox({
    message: 'Select project(s) to clone repositories from:',
    choices: projects.map(p => ({ name: p.name, value: p.name })),
    required: true
  });

  console.log(chalk.green(`   ✓ ${selectedProjects.length} project(s) selected`));
}
```

### Step 3: Fetch Repositories

```typescript
const allRepos = [];

for (const project of selectedProjects) {
  console.log(chalk.gray(`\n   Fetching repos from ${project}...`));

  try {
    const repos = await provider.listRepositories(org, project, pat);
    const reposWithProject = repos.map(r => ({ ...r, project }));
    allRepos.push(...reposWithProject);
    console.log(chalk.green(`   ✓ Found ${repos.length} repositories`));
  } catch (error) {
    console.log(chalk.yellow(`   ⚠️ Failed: ${error.message}`));
  }
}

if (allRepos.length === 0) {
  console.log(chalk.yellow('\n⚠️  No repositories found.'));
  return;
}

console.log(chalk.blue(`\n📋 Total: ${allRepos.length} repositories available\n`));
```

### Step 4: Apply Pattern Filter

```typescript
import { filterRepositoriesByPattern } from '../../../src/cli/helpers/selection-strategy.js';

let filteredRepos = allRepos;
let patternDescription = 'all';

if (args.pattern) {
  // Determine pattern type
  const isRegex = args.pattern.startsWith('regex:');
  const pattern = isRegex ? args.pattern.slice(6) : args.pattern;

  const clonePattern = {
    strategy: isRegex ? 'pattern-regex' : 'pattern-glob',
    pattern: pattern,
    isRegex
  };

  filteredRepos = filterRepositoriesByPattern(allRepos, clonePattern);
  patternDescription = `matching "${pattern}"`;

  console.log(chalk.gray(`   Pattern: ${args.pattern}`));
  console.log(chalk.gray(`   Matched: ${filteredRepos.length} of ${allRepos.length} repos\n`));
} else {
  // Prompt for pattern selection
  const { select, input } = await import('@inquirer/prompts');

  const strategy = await select({
    message: 'How do you want to select repositories?',
    choices: [
      { name: 'All - Clone all repositories', value: 'all' },
      { name: 'Pattern (glob) - e.g., "sw-*", "*-backend"', value: 'pattern-glob' },
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

    filteredRepos = filterRepositoriesByPattern(allRepos, clonePattern);
    patternDescription = `matching "${pattern.trim()}"`;
  }
}

if (filteredRepos.length === 0) {
  console.log(chalk.yellow(`⚠️  No repositories ${patternDescription}.`));
  return;
}
```

### Step 5: Preview and Confirm

```typescript
console.log(chalk.blue(`\n📦 Repositories to clone (${filteredRepos.length}):\n`));

// Show preview (max 20)
filteredRepos.slice(0, 20).forEach(repo => {
  console.log(chalk.gray(`   • ${repo.name} (${repo.project})`));
});

if (filteredRepos.length > 20) {
  console.log(chalk.gray(`   ... and ${filteredRepos.length - 20} more\n`));
}

if (args.dryRun) {
  console.log(chalk.cyan('\n🔎 DRY RUN: No repositories will be cloned.\n'));
  return;
}

const { confirm } = await import('@inquirer/prompts');

const confirmed = await confirm({
  message: `Clone ${filteredRepos.length} repositories to current directory?`,
  default: true
});

if (!confirmed) {
  console.log(chalk.gray('\n⏭️  Cloning cancelled.\n'));
  return;
}
```

### Step 6: Start Background Cloning

```typescript
import { triggerAdoRepoCloning } from '../../../src/cli/helpers/init/ado-repo-cloning.js';

// Build adoProjectSelection
const adoProjectSelection = {
  org,
  pat,
  projects: selectedProjects
};

// Build clonePattern
const clonePatternResult = args.pattern
  ? {
      strategy: args.pattern.startsWith('regex:') ? 'pattern-regex' : 'pattern-glob',
      pattern: args.pattern.startsWith('regex:') ? args.pattern.slice(6) : args.pattern
    }
  : { strategy: 'all' };

// Trigger background cloning
await triggerAdoRepoCloning(projectPath, adoProjectSelection, clonePatternResult);
```

## Examples

### Example 1: Interactive Clone
**User**: `/specweave-ado:clone-repos`

**Output**:
```
📦 ADO Repository Cloning

   Organization: mycompany

   Fetching projects...
   ✓ 3 projects found

Select project(s) to clone repositories from:
> [x] Platform
  [x] Shared
  [ ] Legacy

   ✓ 2 project(s) selected

   Fetching repos from Platform...
   ✓ Found 12 repositories
   Fetching repos from Shared...
   ✓ Found 4 repositories

📋 Total: 16 repositories available

How do you want to select repositories?
> All - Clone all repositories

📦 Repositories to clone (16):

   • sw-frontend (Platform)
   • sw-backend (Platform)
   • sw-shared-lib (Shared)
   ... and 13 more

Clone 16 repositories to current directory? (Y/n)

📦 Fetching ADO Repositories

   Fetching from mycompany/Platform...
   ✓ Found 12 repositories in Platform
   Fetching from mycompany/Shared...
   ✓ Found 4 repositories in Shared

🔄 Cloning 16 repositories in background...

   Repositories will be cloned to: ./ (root folder)
   Job ID: abc12345

   Check progress: /specweave:jobs
   Resume if interrupted: /specweave:jobs --resume abc12345
```

### Example 2: Pattern Filter
**User**: `/specweave-ado:clone-repos --pattern "sw-*"`

**Output**:
```
📦 ADO Repository Cloning

   Organization: mycompany
   Pattern: sw-*
   Matched: 8 of 16 repos

📦 Repositories to clone (8):

   • sw-frontend (Platform)
   • sw-backend (Platform)
   • sw-shared-lib (Shared)
   ...

Clone 8 repositories to current directory? (Y/n)
```

### Example 3: Dry Run
**User**: `/specweave-ado:clone-repos --dry-run`

**Output**:
```
📦 Repositories to clone (16):

   • sw-frontend (Platform)
   • sw-backend (Platform)
   ...

🔎 DRY RUN: No repositories will be cloned.
```

## Important Notes

- **Background Cloning**: Repositories clone in background (non-blocking)
- **Progress Tracking**: Check progress with `/specweave:jobs`
- **Resumable**: Interrupted clones can resume with `/specweave:jobs --resume <id>`
- **Auth via PAT**: Uses HTTPS clone URLs with PAT authentication
- **Target Directory**: Repos are cloned directly to `./<repo-name>/` (root folder)

## Related Commands

- `/specweave:init` - Initial SpecWeave setup (includes repo cloning option)
- `/specweave:jobs` - Monitor background jobs
- `/specweave-ado:import-projects` - Import ADO projects with area path mapping

## Error Handling

- **Missing Credentials**: Prompt to run `specweave init` first
- **Auth Failures**: Check PAT permissions (vso.code_read scope required)
- **Clone Failures**: Individual repo failures logged, others continue
- **Network Errors**: Job pauses, resume with `/specweave:jobs --resume`

---

**Multi-Repo Support**: Perfect for microservices architectures with many ADO repositories.
