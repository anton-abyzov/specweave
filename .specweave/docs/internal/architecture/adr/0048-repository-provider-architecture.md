# ADR-0048: Repository Provider Architecture

**Status**: Accepted
**Date**: 2025-11-20
**Deciders**: SpecWeave Core Team
**Priority**: P0 (Critical - Core init flow redesign)

---

## Context

SpecWeave currently assumes a **single local repository** where `specweave init` is run. This creates limitations:

### Problems with Current Architecture

1. **No Multi-Repo Support**
   - Teams with microservices (backend, frontend, mobile) must run `specweave init` in each repo separately
   - No centralized configuration or cross-repo coordination
   - Cannot clone multiple repos during init

2. **GitHub-Only Assumption**
   - Init flow assumes GitHub for issue tracking
   - No support for Bitbucket, Azure DevOps Repos, GitLab, or generic Git

3. **Manual Cloning Required**
   - Users must manually clone repos before running `specweave init`
   - No automation for organization-wide repo discovery and cloning

4. **No Parent Repo Pattern**
   - Common pattern: Parent repo orchestrates multiple nested repos
   - SpecWeave can't model this relationship

5. **Credential Sprawl**
   - Each repo provider needs different credentials
   - No unified credential management

---

## Decision

We will implement a **Repository Provider Architecture** that supports:

### 1. Supported Repository Providers

| Provider | Discovery | Clone | Credentials |
|----------|-----------|-------|-------------|
| **Local** | N/A (already cloned) | ❌ Skip | N/A |
| **GitHub** | ✅ API-based | ✅ HTTPS/SSH | `GITHUB_TOKEN` |
| **Bitbucket** | ✅ API-based | ✅ HTTPS/SSH | `BITBUCKET_TOKEN` |
| **Azure DevOps** | ✅ API-based | ✅ HTTPS/SSH | `ADO_PAT` |
| **GitLab** | ✅ API-based | ✅ HTTPS/SSH | `GITLAB_TOKEN` |
| **Generic Git** | ❌ Manual list | ✅ HTTPS/SSH | SSH key or credentials |

### 2. Clone Strategies

```
┌─────────────────────────────────────┐
│ Clone Strategy Selection            │
├─────────────────────────────────────┤
│ 1. Single Repo                      │
│    └─ Clone one repository          │
│                                     │
│ 2. Multi-Repo (Manual Selection)    │
│    └─ User selects from list        │
│                                     │
│ 3. Multi-Repo (Organization-wide)   │
│    └─ Clone all repos in org        │
│                                     │
│ 4. Multi-Repo (Pattern-based)       │
│    └─ Clone repos matching pattern  │
│    └─ Example: "myorg/backend-*"    │
│                                     │
│ 5. Parent + Nested Repos            │
│    └─ Clone parent first            │
│    └─ Then clone all nested repos   │
│                                     │
│ 6. File-based Configuration         │
│    └─ Provide repos.json file       │
└─────────────────────────────────────┘
```

### 3. Clone Configuration File Format

**File**: `.specweave/clone-config.json`

```json
{
  "$schema": "https://specweave.dev/schemas/clone-config.json",
  "version": "1.0",
  "provider": "github",
  "strategy": "parent-nested",
  "workspace": {
    "root": "./workspace",
    "structure": "flat"
  },
  "parent": {
    "url": "https://github.com/myorg/platform.git",
    "path": "platform",
    "branch": "main"
  },
  "repos": [
    {
      "name": "backend",
      "url": "https://github.com/myorg/backend.git",
      "path": "backend",
      "branch": "develop",
      "specweaveProject": "backend"
    },
    {
      "name": "frontend",
      "url": "https://github.com/myorg/frontend.git",
      "path": "frontend",
      "branch": "develop",
      "specweaveProject": "frontend"
    },
    {
      "name": "mobile",
      "url": "https://github.com/myorg/mobile.git",
      "path": "mobile",
      "branch": "main",
      "specweaveProject": "mobile"
    }
  ],
  "credentials": {
    "type": "token",
    "envVar": "GITHUB_TOKEN"
  },
  "postClone": {
    "install": true,
    "build": false,
    "initSpecweave": true
  }
}
```

**Schema Explanation**:
- `provider`: Repository hosting provider
- `strategy`: Clone strategy (single, multi-repo, parent-nested, etc.)
- `workspace.root`: Where to clone repos
- `workspace.structure`: `flat` (all repos in root) or `nested` (grouped by team)
- `parent`: Optional parent repository
- `repos`: List of repositories to clone
- `repos[].specweaveProject`: Maps repo to SpecWeave project folder
- `credentials`: How to authenticate (token, SSH key, etc.)
- `postClone`: Actions to run after cloning

### 4. Workspace Structure Options

**Option A: Flat Structure** (All repos in root)
```
workspace/
├── platform/           # Parent repo
├── backend/            # Nested repo 1
├── frontend/           # Nested repo 2
└── mobile/             # Nested repo 3
```

**Option B: Nested Structure** (Grouped by team/component)
```
workspace/
├── platform/           # Parent repo
├── services/
│   ├── backend/
│   └── api-gateway/
├── clients/
│   ├── frontend/
│   └── mobile/
└── infra/
    └── terraform/
```

**Option C: Monorepo-style** (All in parent)
```
platform/
├── packages/
│   ├── backend/
│   ├── frontend/
│   └── mobile/
└── .specweave/
    └── clone-config.json
```

### 5. Credential Management

**Priority Order**:
1. **Environment Variables** (highest priority)
   - `GITHUB_TOKEN`, `BITBUCKET_TOKEN`, `ADO_PAT`, `GITLAB_TOKEN`
2. **SSH Keys** (fallback for HTTPS failures)
   - Detect `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`
   - Try SSH clone if HTTPS fails
3. **Prompted Credentials** (last resort)
   - Prompt user if no credentials found

**Auto-Detection Logic**:
```typescript
async function detectCredentials(provider: string): Promise<Credentials> {
  // 1. Check environment variables
  const envToken = process.env[`${provider.toUpperCase()}_TOKEN`];
  if (envToken) return { type: 'token', value: envToken };

  // 2. Check SSH keys
  const sshKeyPath = await detectSSHKey();
  if (sshKeyPath) return { type: 'ssh', keyPath: sshKeyPath };

  // 3. Prompt user
  return await promptCredentials(provider);
}
```

### 6. Clone Process Flow

```
┌─────────────────────────────────────┐
│ /specweave:clone                    │
└────────────┬────────────────────────┘
             │
             ├─► 1. Load clone-config.json
             │   └─► Validate schema
             │
             ├─► 2. Detect credentials
             │   ├─► Check env vars
             │   ├─► Check SSH keys
             │   └─► Prompt if needed
             │
             ├─► 3. Clone parent repo (if exists)
             │   ├─► git clone <parent-url>
             │   └─► cd <parent-path>
             │
             ├─► 4. Clone nested repos (parallel)
             │   ├─► Clone backend (parallel)
             │   ├─► Clone frontend (parallel)
             │   └─► Clone mobile (parallel)
             │
             ├─► 5. Post-clone actions
             │   ├─► npm install (if enabled)
             │   ├─► npm run build (if enabled)
             │   └─► specweave init (if enabled)
             │
             └─► 6. Summary report
                 ├─► ✅ Cloned: backend, frontend, mobile
                 ├─► ⏭️  Skipped: <none>
                 └─► ❌ Failed: <none>
```

---

## Implementation

### `/specweave:clone` Command

**Location**: `src/cli/commands/clone.ts`

```typescript
export interface CloneConfig {
  $schema?: string;
  version: string;
  provider: 'github' | 'bitbucket' | 'ado' | 'gitlab' | 'generic';
  strategy: 'single' | 'multi-repo' | 'parent-nested' | 'organization' | 'pattern' | 'file';
  workspace: {
    root: string;
    structure: 'flat' | 'nested' | 'monorepo';
  };
  parent?: RepoConfig;
  repos: RepoConfig[];
  credentials: CredentialConfig;
  postClone?: PostCloneActions;
}

export interface RepoConfig {
  name: string;
  url: string;
  path: string;
  branch?: string;
  specweaveProject?: string;  // Maps to .specweave/docs/internal/specs/{project}/
}

export interface CredentialConfig {
  type: 'token' | 'ssh' | 'prompt';
  envVar?: string;
  keyPath?: string;
}

export interface PostCloneActions {
  install?: boolean;
  build?: boolean;
  initSpecweave?: boolean;
}

/**
 * Clone repositories based on configuration
 *
 * Usage:
 *   /specweave:clone                    # Interactive mode
 *   /specweave:clone --config repos.json  # File-based mode
 *   /specweave:clone --org myorg          # Clone all repos in org
 *   /specweave:clone --pattern "backend-*" # Pattern-based
 */
export async function cloneCommand(options: CloneOptions = {}) {
  // 1. Load or create config
  const config = options.config
    ? await loadCloneConfig(options.config)
    : await promptCloneConfig();

  // 2. Validate config
  await validateCloneConfig(config);

  // 3. Detect credentials
  const credentials = await detectCredentials(config.provider);

  // 4. Clone repos
  const results = await cloneRepositories(config, credentials);

  // 5. Post-clone actions
  if (config.postClone?.initSpecweave) {
    await runSpecweaveInit(config);
  }

  // 6. Summary
  displayCloneSummary(results);
}
```

### Integration with Init Flow

**Updated**: `src/cli/commands/init.ts`

```typescript
async function runInit(projectPath: string, options: InitOptions = {}) {
  // ... existing code ...

  // NEW: Repository Setup
  console.log(chalk.cyan.bold('\n🔧 Repository Setup\n'));

  const { repoProvider } = await inquirer.prompt([{
    type: 'list',
    name: 'repoProvider',
    message: 'Repository hosting provider:',
    choices: [
      { name: 'Local (already cloned)', value: 'local' },
      { name: 'GitHub', value: 'github' },
      { name: 'Bitbucket', value: 'bitbucket' },
      { name: 'Azure DevOps Repos', value: 'ado' },
      { name: 'GitLab', value: 'gitlab' },
      { name: 'Other (generic Git)', value: 'generic' }
    ]
  }]);

  if (repoProvider !== 'local') {
    const { cloneNow } = await inquirer.prompt([{
      type: 'confirm',
      name: 'cloneNow',
      message: 'Clone repositories now?',
      default: true
    }]);

    if (cloneNow) {
      // Run clone workflow
      await cloneWorkflow(repoProvider);
    } else {
      console.log(chalk.yellow('⏭️  Skipped cloning. Run /specweave:clone later.\n'));
    }
  }

  // ... rest of init flow ...
}

async function cloneWorkflow(provider: string) {
  // 1. Prompt for credentials
  const credentials = await promptProviderCredentials(provider);

  // 2. Auto-discover repos (if supported)
  const repos = await discoverRepos(provider, credentials);

  // 3. Multi-select repos to clone
  const { selectedRepos } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedRepos',
    message: 'Select repositories to clone:',
    choices: repos.map(r => ({
      name: `${r.name} - ${r.description || 'No description'}`,
      value: r,
      checked: false
    }))
  }]);

  // 4. Detect parent repo (if multi-repo)
  const { hasParent } = await inquirer.prompt([{
    type: 'confirm',
    name: 'hasParent',
    message: 'Is there a parent repository?',
    default: false
  }]);

  let parentRepo = null;
  if (hasParent) {
    const { parent } = await inquirer.prompt([{
      type: 'list',
      name: 'parent',
      message: 'Select parent repository:',
      choices: selectedRepos.map(r => ({ name: r.name, value: r }))
    }]);
    parentRepo = parent;
  }

  // 5. Clone repos
  const config: CloneConfig = {
    version: '1.0',
    provider,
    strategy: parentRepo ? 'parent-nested' : 'multi-repo',
    workspace: {
      root: './workspace',
      structure: 'flat'
    },
    parent: parentRepo,
    repos: selectedRepos.filter(r => r !== parentRepo),
    credentials: {
      type: 'token',
      envVar: `${provider.toUpperCase()}_TOKEN`
    },
    postClone: {
      install: false,
      build: false,
      initSpecweave: false
    }
  };

  // Save config
  await saveCloneConfig(config);

  // Clone
  await cloneRepositories(config, credentials);
}
```

---

## Provider-Specific Implementation

### GitHub Provider

```typescript
export class GitHubRepoProvider implements RepoProvider {
  async discoverRepos(credentials: Credentials): Promise<Repository[]> {
    const octokit = new Octokit({ auth: credentials.token });

    // Fetch all repos user has access to
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });

    return repos.map(r => ({
      name: r.name,
      fullName: r.full_name,
      url: r.clone_url,
      sshUrl: r.ssh_url,
      description: r.description,
      defaultBranch: r.default_branch
    }));
  }

  async cloneRepo(repo: RepoConfig, credentials: Credentials): Promise<void> {
    const cloneUrl = credentials.type === 'ssh'
      ? repo.sshUrl
      : repo.url;

    await execAsync(`git clone ${cloneUrl} ${repo.path}`);

    if (repo.branch && repo.branch !== repo.defaultBranch) {
      await execAsync(`cd ${repo.path} && git checkout ${repo.branch}`);
    }
  }
}
```

### Bitbucket Provider

```typescript
export class BitbucketRepoProvider implements RepoProvider {
  async discoverRepos(credentials: Credentials): Promise<Repository[]> {
    const response = await fetch('https://api.bitbucket.org/2.0/repositories', {
      headers: {
        'Authorization': `Bearer ${credentials.token}`
      }
    });

    const data = await response.json();
    return data.values.map(r => ({
      name: r.name,
      fullName: r.full_name,
      url: r.links.clone.find(l => l.name === 'https').href,
      sshUrl: r.links.clone.find(l => l.name === 'ssh').href,
      description: r.description,
      defaultBranch: r.mainbranch?.name || 'main'
    }));
  }
}
```

### Azure DevOps Provider

```typescript
export class AzureDevOpsRepoProvider implements RepoProvider {
  async discoverRepos(credentials: Credentials): Promise<Repository[]> {
    const { organization, project } = await this.promptOrgAndProject();

    const response = await fetch(
      `https://dev.azure.com/${organization}/${project}/_apis/git/repositories?api-version=6.0`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${credentials.token}`).toString('base64')}`
        }
      }
    );

    const data = await response.json();
    return data.value.map(r => ({
      name: r.name,
      fullName: `${organization}/${project}/${r.name}`,
      url: r.remoteUrl,
      sshUrl: r.sshUrl,
      description: r.project?.description,
      defaultBranch: r.defaultBranch?.replace('refs/heads/', '')
    }));
  }
}
```

---

## Integration with Issue Tracker Setup

### GitHub Repos + GitHub Issues (Reuse Credentials)

```typescript
async function setupGitHubIssueTracker(githubCredentials: Credentials) {
  console.log(chalk.cyan('\n📋 GitHub Issues Integration\n'));

  // Reuse credentials from repo setup!
  console.log(chalk.gray('✓ Reusing GitHub credentials from repository setup\n'));

  // Auto-discover repos (already fetched during clone)
  const repos = await getCachedGitHubRepos();

  // Multi-select repos for issue tracking
  const { selectedRepos } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedRepos',
    message: 'Select repositories for issue tracking:',
    choices: repos.map(r => ({
      name: `${r.fullName} - ${r.description || 'No description'}`,
      value: r,
      checked: true  // Default: all repos selected
    }))
  }]);

  // Map SpecWeave projects to GitHub repos
  const mapping = await mapProjectsToRepos(selectedRepos);

  // Save to .env
  await saveGitHubIssueConfig(githubCredentials, mapping);
}
```

---

## Consequences

### Positive

1. **Unified Cloning**: One command to clone multiple repos
2. **Provider Flexibility**: Support for GitHub, Bitbucket, ADO, GitLab, generic Git
3. **Parent Repo Pattern**: Model parent + nested repo relationships
4. **Credential Reuse**: GitHub credentials reused for repos + issues
5. **Auto-Discovery**: API-based repo discovery (no manual typing!)
6. **File-Based Config**: Reproducible cloning via `clone-config.json`

### Negative

1. **Increased Complexity**: More providers = more code to maintain
2. **Credential Management**: Must handle 5+ different auth mechanisms
3. **Error Handling**: Network failures, SSH key issues, rate limits
4. **Migration Required**: Must update init flow significantly

### Neutral

1. **Optional Feature**: Users can skip cloning (use local repos)
2. **Config File**: Users can manually edit `clone-config.json`

---

## Success Criteria

1. ✅ **Clone single repo**: `specweave init` + clone GitHub repo
2. ✅ **Clone multi-repo**: Select 3 repos, clone in parallel
3. ✅ **Parent + nested**: Clone parent, then 5 nested repos
4. ✅ **Credential reuse**: GitHub credentials used for both repos + issues
5. ✅ **SSH fallback**: HTTPS fails → auto-retry with SSH
6. ✅ **Provider support**: GitHub, Bitbucket, ADO working
7. ✅ **File-based**: Load `repos.json`, clone all listed repos

---

## References

- **ADR-0032**: Universal Hierarchy Mapping
- **GitHub API**: https://docs.github.com/en/rest/repos
- **Bitbucket API**: https://developer.atlassian.com/cloud/bitbucket/rest/
- **Azure DevOps API**: https://learn.microsoft.com/en-us/rest/api/azure/devops/git/

---

**Decision Date**: 2025-11-20
**Review Date**: 2025-12-01 (after implementation)
