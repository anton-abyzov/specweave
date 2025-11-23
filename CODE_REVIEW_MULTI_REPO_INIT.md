# CRITICAL CODE REVIEW: Multi-Repo Initialization Logic

**Reviewer**: Tech Lead (Senior Code Review)
**Date**: 2025-01-22
**Scope**: Repository structure initialization, multi-platform support, conditional prompt logic
**Context**: Bug fix for visibility prompt when `createOnGitHub = false` revealed systematic issues

---

## EXECUTIVE SUMMARY

**Status**: 🔴 **CRITICAL BUGS FOUND**

- **1 P0 Critical Bug**: Monorepo visibility prompt bug (duplicate of fixed issue)
- **17 Platform Hardcoding Issues**: GitHub-specific logic prevents multi-platform support
- **5 Architectural Gaps**: No abstraction for Git providers
- **3 Edge Cases**: SSH URL support missing, mixed-platform repos unsupported

**Recommendation**: Immediate fix for P0 bug. Architectural refactoring needed for platform abstraction.

---

## 🚨 P0 CRITICAL BUGS (Production-Blocking)

### **BUG-001: Monorepo Visibility Prompt Always Shown**

**Severity**: P0 - Same bug as implementation repos (just fixed)
**Impact**: Users asked for visibility even when NOT creating on GitHub
**File**: `src/core/repo-structure/repo-structure-manager.ts`
**Lines**: 920-932

**Current Code** (BROKEN):
```typescript
// ALWAYS prompts for visibility, regardless of createOnGitHub
// Ask about visibility
const visibilityPrompt = getVisibilityPrompt(answers.repo);
const { visibility } = await inquirer.prompt([{
  type: 'list',
  name: 'visibility',
  message: visibilityPrompt.question,
  choices: visibilityPrompt.options.map(opt => ({
    name: `${opt.label}\n${chalk.gray(opt.description)}`,
    value: opt.value,
    short: opt.label
  })),
  default: visibilityPrompt.default
}]);
```

**Required Fix**:
```typescript
// Ask about visibility only if creating a new repository
let visibility: 'private' | 'public' = 'private';
if (answers.createOnGitHub) {
  const visibilityPrompt = getVisibilityPrompt(answers.repo);
  const result = await inquirer.prompt([{
    type: 'list',
    name: 'visibility',
    message: visibilityPrompt.question,
    choices: visibilityPrompt.options.map(opt => ({
      name: `${opt.label}\n${chalk.gray(opt.description)}`,
      value: opt.value,
      short: opt.label
    })),
    default: visibilityPrompt.default
  }]);
  visibility = result.visibility;
}
```

**Why This Matters**:
- Users with existing local repos are confused by irrelevant prompts
- Violates principle of asking only necessary questions
- Same exact bug pattern as implementation repos (suggests systematic issue)

**Testing**:
```bash
# Test case: Monorepo with existing .git
mkdir test-monorepo && cd test-monorepo
git init
specweave init .
# Select "Monorepo" architecture
# Answer "No" to "Create repository on GitHub?"
# BUG: Still asked "Repository visibility for 'test-monorepo'?"
```

**Status**: ❌ **UNFIXED** (same bug pattern as fixed implementation repos)

---

## 🔧 P1 ARCHITECTURAL GAPS (Platform Lock-In)

### **GAP-001: Hardcoded GitHub URLs (17 instances)**

**Severity**: P1 - Prevents multi-platform support
**Impact**: Cannot use with GitLab, Bitbucket, Azure DevOps Repos
**Files**: Multiple

**Hardcoded GitHub References**:

| File | Line | Hardcoded Value | Issue |
|------|------|-----------------|-------|
| `repo-structure-manager.ts` | 189 | `/github\.com[:/]` | Regex only matches GitHub |
| `repo-structure-manager.ts` | 209 | `https://api.github.com/repos/` | API endpoint hardcoded |
| `repo-structure-manager.ts` | 459 | `https://api.github.com/repos/` | Duplicate hardcoding |
| `repo-structure-manager.ts` | 1217 | `https://github.com/${owner}/${name}.git` | Remote URL format |
| `repo-structure-manager.ts` | 1286 | `https://github.com/...` | Parent repo remote |
| `repo-structure-manager.ts` | 1322 | `https://github.com/...` | Implementation repo remote |
| `repo-structure-manager.ts` | 1125-1129 | GitHub API endpoints | Org vs user endpoint |
| `github-validator.ts` | 70 | `https://api.github.com/repos/` | Validation endpoint |
| `github-validator.ts` | 135 | `https://api.github.com/users/` | User validation |
| `github-validator.ts` | 146 | `https://api.github.com/orgs/` | Org validation |
| `github-validator.ts` | 214 | `https://api.github.com/rate_limit` | Rate limit check |
| `env-file-generator.ts` | 86-113 | `GITHUB_TOKEN`, `GITHUB_OWNER`, etc. | All env vars GitHub-only |

**Command Output**:
```bash
$ grep -rn "github\.com\|api\.github\.com" src/core/repo-structure/ --include="*.ts" | wc -l
17
```

**Required Abstraction**:
```typescript
// NEW: Git provider abstraction layer
interface GitProvider {
  readonly name: 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';
  readonly apiBaseUrl: string;

  validateRepository(owner: string, repo: string, token?: string): Promise<ValidationResult>;
  validateOwner(owner: string, token?: string): Promise<OwnerValidationResult>;
  createRepository(config: RepoConfig): Promise<void>;
  getRemoteUrl(owner: string, repo: string, protocol: 'https' | 'ssh'): string;
  parseRemoteUrl(url: string): { owner: string; repo: string } | null;
}

class GitHubProvider implements GitProvider {
  name = 'github' as const;
  apiBaseUrl = 'https://api.github.com';

  getRemoteUrl(owner: string, repo: string, protocol: 'https' | 'ssh'): string {
    return protocol === 'ssh'
      ? `git@github.com:${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`;
  }

  parseRemoteUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    return match ? { owner: match[1], repo: match[2] } : null;
  }
  // ... other methods
}

class GitLabProvider implements GitProvider {
  name = 'gitlab' as const;
  apiBaseUrl: string; // Configurable for self-hosted GitLab

  constructor(domain = 'gitlab.com') {
    this.apiBaseUrl = `https://${domain}/api/v4`;
  }

  getRemoteUrl(owner: string, repo: string, protocol: 'https' | 'ssh'): string {
    return protocol === 'ssh'
      ? `git@gitlab.com:${owner}/${repo}.git`
      : `https://gitlab.com/${owner}/${repo}.git`;
  }
  // ... other methods
}

// Factory pattern
function getGitProvider(name: string, config?: any): GitProvider {
  switch (name) {
    case 'github': return new GitHubProvider();
    case 'gitlab': return new GitLabProvider(config?.domain);
    case 'bitbucket': return new BitbucketProvider();
    case 'azure-devops': return new AzureDevOpsProvider(config);
    default: throw new Error(`Unsupported provider: ${name}`);
  }
}
```

**Usage**:
```typescript
class RepoStructureManager {
  private gitProvider: GitProvider;

  constructor(projectPath: string, provider: GitProvider) {
    this.projectPath = projectPath;
    this.gitProvider = provider;
  }

  private async configureSingleRepo(): Promise<RepoStructureConfig> {
    // Replace hardcoded GitHub logic:
    const remote = execSync('git remote get-url origin', { cwd: this.projectPath }).trim();

    // OLD: const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    // NEW:
    const parsed = this.gitProvider.parseRemoteUrl(remote);
    if (parsed) {
      const { owner, repo } = parsed;
      // ... rest of logic
    }
  }
}
```

**Migration Path**:
1. Create `src/core/git-providers/` directory
2. Implement `GitProvider` interface + `GitHubProvider` (extract existing logic)
3. Add `GitLabProvider`, `BitbucketProvider`, `AzureDevOpsProvider` (stubs initially)
4. Refactor `RepoStructureManager` to use provider abstraction
5. Update env generator to support multi-provider config

**Effort Estimate**: 3-5 days (includes tests, migration, documentation)

---

### **GAP-002: Environment Variables GitHub-Only**

**Severity**: P1 - Configuration inflexible
**Impact**: Cannot configure GitLab/Bitbucket projects
**File**: `src/utils/env-file-generator.ts`
**Lines**: 86-113, 227-246

**Current Code** (BROKEN):
```bash
# All env vars hardcoded to GITHUB_ prefix
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=myorg
GITHUB_REPOS=parent:my-project-parent,frontend:my-project-frontend
GITHUB_SYNC_ENABLED=true
GITHUB_AUTO_CREATE_ISSUE=true
GITHUB_SYNC_DIRECTION=bidirectional
```

**Required Design**:
```bash
# Provider-agnostic configuration
GIT_PROVIDER=github  # or gitlab, bitbucket, azure-devops

# GitHub-specific
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=myorg

# GitLab-specific (only if GIT_PROVIDER=gitlab)
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_DOMAIN=gitlab.com  # or gitlab.company.com for self-hosted
GITLAB_PROJECT_PATH=mygroup/myproject

# Bitbucket-specific
BITBUCKET_TOKEN=...
BITBUCKET_WORKSPACE=...

# Azure DevOps-specific
AZURE_DEVOPS_PAT=...
AZURE_DEVOPS_ORGANIZATION=...
AZURE_DEVOPS_PROJECT=...

# Common config
GIT_SYNC_ENABLED=true
GIT_AUTO_CREATE_ISSUE=true
GIT_SYNC_DIRECTION=bidirectional
```

**Refactor**:
```typescript
export interface EnvConfig {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';

  // GitHub
  githubToken?: string;
  githubOwner?: string;

  // GitLab
  gitlabToken?: string;
  gitlabDomain?: string;
  gitlabProjectPath?: string;

  // Bitbucket
  bitbucketToken?: string;
  bitbucketWorkspace?: string;

  // Azure DevOps
  azureDevOpsPat?: string;
  azureDevOpsOrganization?: string;
  azureDevOpsProject?: string;

  // Common
  repos?: RepoMapping[];
  syncEnabled?: boolean;
  autoCreateIssue?: boolean;
  syncDirection?: 'bidirectional' | 'export' | 'import';
}

function buildEnvContent(config: EnvConfig): string {
  const lines: string[] = [];

  lines.push(`GIT_PROVIDER=${config.provider}`);
  lines.push('');

  switch (config.provider) {
    case 'github':
      lines.push(`GITHUB_TOKEN=${config.githubToken || 'ghp_xxxxxxxxxxxxxxxxxxxx'}`);
      lines.push(`GITHUB_OWNER=${config.githubOwner || 'myorg'}`);
      break;

    case 'gitlab':
      lines.push(`GITLAB_TOKEN=${config.gitlabToken || 'glpat-xxxxxxxxxxxxxxxxxxxx'}`);
      lines.push(`GITLAB_DOMAIN=${config.gitlabDomain || 'gitlab.com'}`);
      lines.push(`GITLAB_PROJECT_PATH=${config.gitlabProjectPath || 'mygroup/myproject'}`);
      break;

    // ... other providers
  }

  // Common config
  lines.push('');
  lines.push('# Sync Configuration');
  lines.push(`GIT_SYNC_ENABLED=${config.syncEnabled !== false ? 'true' : 'false'}`);
  // ...

  return lines.join('\n') + '\n';
}
```

---

### **GAP-003: GitHub Validator Not Abstracted**

**Severity**: P1 - Duplicate logic across providers
**Impact**: Must rewrite validation for each platform
**File**: `src/core/repo-structure/github-validator.ts`
**Lines**: Entire file (229 lines)

**Issues**:
- File is named `github-validator.ts` (not provider-agnostic)
- Functions are named `validateRepository`, `validateOwner` (should be methods of `GitHubProvider`)
- Logic duplicated for each provider (error-prone)

**Required Refactor**:
```bash
# OLD structure:
src/core/repo-structure/github-validator.ts

# NEW structure:
src/core/git-providers/
├── base-provider.ts          # Abstract base class with shared logic
├── github-provider.ts        # GitHub implementation
├── gitlab-provider.ts        # GitLab implementation
├── bitbucket-provider.ts     # Bitbucket implementation
├── azure-devops-provider.ts  # Azure DevOps implementation
└── index.ts                  # Factory + exports
```

**Example**:
```typescript
// base-provider.ts
export abstract class BaseGitProvider implements GitProvider {
  abstract name: string;
  abstract apiBaseUrl: string;

  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3
  ): Promise<Response> {
    // Shared retry logic
    for (let i = 0; i < retries; i++) {
      try {
        return await fetch(url, options);
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.sleep(1000 * Math.pow(2, i));
      }
    }
    throw new Error('Unreachable');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abstract validateRepository(owner: string, repo: string, token?: string): Promise<ValidationResult>;
  abstract validateOwner(owner: string, token?: string): Promise<OwnerValidationResult>;
  // ...
}

// github-provider.ts
export class GitHubProvider extends BaseGitProvider {
  name = 'github' as const;
  apiBaseUrl = 'https://api.github.com';

  async validateRepository(owner: string, repo: string, token?: string): Promise<ValidationResult> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await this.fetchWithRetry(
      `${this.apiBaseUrl}/repos/${owner}/${repo}`,
      { headers }
    );

    // ... rest of validation logic
  }

  // ... other methods
}
```

**Benefits**:
- Shared retry logic, error handling, rate limiting
- Easy to add new providers
- Clear separation of concerns
- Testable (mock providers easily)

---

### **GAP-004: No SSH URL Support**

**Severity**: P1 - User workflow limitation
**Impact**: Users who prefer SSH must manually edit remotes
**Files**: `repo-structure-manager.ts` (lines 1217, 1286, 1322)

**Current Code** (BROKEN):
```typescript
// Hardcoded HTTPS format
const remoteUrl = `https://github.com/${owner}/${name}.git`;
```

**User Impact**:
```bash
# User workflow (BROKEN):
$ specweave init .
# Creates HTTPS remote: https://github.com/myorg/myrepo.git

$ git push origin main
# ERROR: Username/password authentication deprecated!
# Must manually edit: git remote set-url origin git@github.com:myorg/myrepo.git
```

**Required Fix**:
```typescript
interface RemoteConfig {
  protocol: 'https' | 'ssh';
}

// Prompt user for preference
const { protocol } = await inquirer.prompt([{
  type: 'list',
  name: 'protocol',
  message: 'Git remote protocol?',
  choices: [
    {
      name: 'SSH (Recommended for daily use)',
      value: 'ssh',
      short: 'SSH'
    },
    {
      name: 'HTTPS (Requires token authentication)',
      value: 'https',
      short: 'HTTPS'
    }
  ],
  default: 'ssh'
}]);

// Use provider to generate URL
const remoteUrl = this.gitProvider.getRemoteUrl(owner, name, protocol);
// SSH: git@github.com:myorg/myrepo.git
// HTTPS: https://github.com/myorg/myrepo.git
```

**Edge Case**: Detect existing remote protocol and use same format:
```typescript
try {
  const existingRemote = execSync('git remote get-url origin', { cwd: this.projectPath }).trim();
  const detectedProtocol = existingRemote.startsWith('git@') ? 'ssh' : 'https';

  // Use detected protocol for new repos (consistency)
  protocol = detectedProtocol;
} catch {
  // No existing remote, prompt user
}
```

---

### **GAP-005: Method Naming Implies GitHub-Only**

**Severity**: P2 - Code readability and maintenance
**Impact**: Misleading method names, hard to refactor
**File**: `repo-structure-manager.ts`

**Misleading Names**:
| Current Name | Better Name | Line | Why Change? |
|--------------|-------------|------|-------------|
| `createGitHubRepositories()` | `createRemoteRepositories()` | 955 | Method should work for any provider |
| `createGitHubRepo()` | `createRemoteRepo()` | 1123 | Provider-agnostic name |
| `isGitHubOrganization()` | `isOrganization()` | 1161 | Concept exists in GitLab (groups), Bitbucket (workspaces) |
| `repositoryExistsOnGitHub()` | `repositoryExists()` | 1183 | Provider-agnostic check |

**Refactor**:
```typescript
// OLD (GitHub-specific):
async createGitHubRepositories(config: RepoStructureConfig): Promise<void> {
  // ...
  await this.createGitHubRepo(owner, name, description, visibility);
  // ...
}

// NEW (Provider-agnostic):
async createRemoteRepositories(config: RepoStructureConfig): Promise<void> {
  // ...
  await this.gitProvider.createRepository({
    owner,
    name,
    description,
    visibility
  });
  // ...
}
```

---

## 🧪 P2 EDGE CASES (Less Common Scenarios)

### **EDGE-001: Mixed Platform Repositories**

**Severity**: P2 - Niche use case
**Impact**: Cannot mix GitHub parent + GitLab implementations
**Example**: Parent repo on GitHub, frontend on GitLab, backend on GitHub

**Current Limitation**:
```typescript
// Assumes all repos on same platform
const owner = config.parentRepo?.owner || config.repositories[0]?.owner;
// Uses same owner for ALL repos!
```

**Required Support**:
```typescript
interface Repository {
  id: string;
  name: string;
  owner: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure-devops'; // NEW!
  // ...
}

// Per-repo provider configuration
config.repositories.push({
  id: 'frontend',
  name: 'my-frontend',
  owner: 'gitlab-org',
  provider: 'gitlab', // Different from parent!
  // ...
});
```

**Use Case**:
- Company migrating from GitHub to GitLab
- Multi-cloud strategy (GitHub + Azure DevOps)
- Open-source project (GitHub) + private services (GitLab self-hosted)

---

### **EDGE-002: Self-Hosted Git Platforms**

**Severity**: P2 - Enterprise requirement
**Impact**: Cannot use with GitHub Enterprise, GitLab self-hosted, Bitbucket Server
**Example**: `git.company.com` instead of `github.com`

**Current Limitation**:
```typescript
// Hardcoded to public GitHub.com
const match = remote.match(/github\.com[:/]/);
```

**Required Support**:
```typescript
interface ProviderConfig {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';
  domain?: string; // For self-hosted instances
  apiBaseUrl?: string; // Custom API endpoint
}

// Example: GitHub Enterprise
const githubProvider = new GitHubProvider({
  domain: 'github.company.com',
  apiBaseUrl: 'https://github.company.com/api/v3'
});

// Example: GitLab self-hosted
const gitlabProvider = new GitLabProvider({
  domain: 'gitlab.company.com',
  apiBaseUrl: 'https://gitlab.company.com/api/v4'
});
```

**Prompt**:
```typescript
const { isEnterpriseGitHub } = await inquirer.prompt([{
  type: 'confirm',
  name: 'isEnterpriseGitHub',
  message: 'Using GitHub Enterprise (self-hosted)?',
  default: false
}]);

if (isEnterpriseGitHub) {
  const { githubDomain, githubApiUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'githubDomain',
      message: 'GitHub Enterprise domain:',
      default: 'github.company.com'
    },
    {
      type: 'input',
      name: 'githubApiUrl',
      message: 'GitHub Enterprise API URL:',
      default: (answers: any) => `https://${answers.githubDomain}/api/v3`
    }
  ]);

  this.gitProvider = new GitHubProvider({ domain: githubDomain, apiBaseUrl: githubApiUrl });
}
```

---

### **EDGE-003: Token Permissions Vary by Platform**

**Severity**: P2 - User onboarding friction
**Impact**: Unclear what token permissions are needed
**Example**: GitHub needs `repo` scope, GitLab needs `api` scope

**Current Code** (BROKEN):
```typescript
// No guidance on required token permissions
{
  type: 'password',
  name: 'githubToken',
  message: 'GitHub personal access token:',
  // No help text!
}
```

**Required Improvement**:
```typescript
console.log(chalk.cyan('\n🔑 GitHub Personal Access Token'));
console.log(chalk.gray('  Required scopes: repo, workflow, admin:org (if creating in org)'));
console.log(chalk.gray('  Create token: https://github.com/settings/tokens/new\n'));

const { githubToken } = await inquirer.prompt([{
  type: 'password',
  name: 'githubToken',
  message: 'GitHub personal access token:',
  validate: async (input: string) => {
    if (!input.trim()) return 'Token is required';
    if (!input.startsWith('ghp_')) return 'Invalid token format (should start with ghp_)';

    // Validate token has required scopes
    const scopes = await this.gitProvider.getTokenScopes(input);
    const requiredScopes = ['repo'];
    const missingScopes = requiredScopes.filter(s => !scopes.includes(s));

    if (missingScopes.length > 0) {
      return `Token missing required scopes: ${missingScopes.join(', ')}`;
    }

    return true;
  }
}]);
```

**Per-Provider Scope Requirements**:
| Provider | Required Scopes | Create Token URL |
|----------|----------------|------------------|
| GitHub | `repo`, `workflow`, `admin:org` (if org) | `https://github.com/settings/tokens/new` |
| GitLab | `api`, `read_repository`, `write_repository` | `https://gitlab.com/-/profile/personal_access_tokens` |
| Bitbucket | `repository:write`, `account:read` | `https://bitbucket.org/account/settings/app-passwords/new` |
| Azure DevOps | `Code (Read & Write)`, `Work Items (Read & Write)` | `https://dev.azure.com/{org}/_usersSettings/tokens` |

---

## 📊 SUMMARY OF ISSUES

### By Severity

| Severity | Count | Issues |
|----------|-------|--------|
| P0 (Critical) | 1 | Monorepo visibility prompt bug |
| P1 (High) | 5 | Platform hardcoding, no abstraction, env vars, validator, SSH support |
| P2 (Medium) | 3 | Mixed platforms, self-hosted, token permissions |
| **Total** | **9** | |

### By Category

| Category | Count | Issues |
|----------|-------|--------|
| Conditional Logic Bugs | 1 | Monorepo visibility |
| Platform Lock-In | 4 | Hardcoded GitHub, env vars, validator, method names |
| User Workflow | 2 | SSH support, token permissions |
| Edge Cases | 2 | Mixed platforms, self-hosted |
| **Total** | **9** | |

### By File

| File | Issues | Lines Affected |
|------|--------|----------------|
| `repo-structure-manager.ts` | 5 | 189, 209, 459, 920-932, 1217, 1286, 1322 |
| `github-validator.ts` | 1 | Entire file (229 lines) |
| `env-file-generator.ts` | 1 | 86-113, 227-246 |
| `prompt-consolidator.ts` | 0 | ✅ Clean (no issues) |

---

## 🎯 RECOMMENDED FIXES (Priority Order)

### Phase 1: Critical Bugs (Immediate - 1 day)

1. **Fix monorepo visibility prompt bug** (BUG-001)
   - File: `repo-structure-manager.ts`, lines 920-932
   - Effort: 15 minutes
   - Test: Create test case for monorepo with `createOnGitHub = false`

### Phase 2: Quick Wins (Short-term - 1 week)

2. **Add SSH URL support** (GAP-004)
   - Prompt user for protocol preference
   - Detect existing remote protocol
   - Effort: 2-3 hours

3. **Add token permission guidance** (EDGE-003)
   - Help text with required scopes
   - Token validation with scope check
   - Effort: 2-3 hours

### Phase 3: Architectural Refactor (Medium-term - 2 weeks)

4. **Create Git provider abstraction** (GAP-001, GAP-003, GAP-005)
   - Design `GitProvider` interface
   - Implement `GitHubProvider` (extract existing logic)
   - Refactor `RepoStructureManager` to use provider
   - Update tests
   - Effort: 5 days

5. **Multi-provider env configuration** (GAP-002)
   - Support `GIT_PROVIDER` env var
   - Provider-specific token/config vars
   - Update env generator
   - Effort: 2 days

### Phase 4: Advanced Features (Long-term - 1 month)

6. **Add GitLab provider** (GAP-001)
   - Implement `GitLabProvider`
   - Support self-hosted GitLab
   - Test with gitlab.com
   - Effort: 3 days

7. **Add Bitbucket provider** (GAP-001)
   - Implement `BitbucketProvider`
   - Support workspaces
   - Effort: 3 days

8. **Add Azure DevOps provider** (GAP-001)
   - Implement `AzureDevOpsProvider`
   - Support organizations/projects
   - Effort: 3 days

9. **Support mixed-platform repos** (EDGE-001)
   - Per-repo provider configuration
   - Update data models
   - Effort: 2 days

---

## 🧪 TESTING PLAN

### Unit Tests (New)

```typescript
// src/core/git-providers/github-provider.test.ts
describe('GitHubProvider', () => {
  it('should parse GitHub HTTPS URLs', () => {
    const provider = new GitHubProvider();
    const result = provider.parseRemoteUrl('https://github.com/myorg/myrepo.git');
    expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
  });

  it('should parse GitHub SSH URLs', () => {
    const provider = new GitHubProvider();
    const result = provider.parseRemoteUrl('git@github.com:myorg/myrepo.git');
    expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
  });

  it('should generate SSH remote URLs', () => {
    const provider = new GitHubProvider();
    const url = provider.getRemoteUrl('myorg', 'myrepo', 'ssh');
    expect(url).toBe('git@github.com:myorg/myrepo.git');
  });

  it('should generate HTTPS remote URLs', () => {
    const provider = new GitHubProvider();
    const url = provider.getRemoteUrl('myorg', 'myrepo', 'https');
    expect(url).toBe('https://github.com/myorg/myrepo.git');
  });
});
```

### Integration Tests (Updated)

```bash
# Test monorepo visibility bug fix
npm run test:integration -- --grep "monorepo.*createOnGitHub=false"

# Test SSH URL support
npm run test:integration -- --grep "SSH protocol"

# Test multi-provider support
npm run test:integration -- --grep "GitLab provider"
```

### Manual Testing Checklist

- [ ] Monorepo with `createOnGitHub = false` → no visibility prompt
- [ ] Single repo with SSH protocol → correct remote format
- [ ] Parent repo with GitLab → correct API calls
- [ ] Self-hosted GitHub Enterprise → custom domain works
- [ ] Mixed platforms (GitHub parent + GitLab frontend) → correct remotes

---

## 📚 REFERENCES

**Related ADRs** (to be created):
- ADR-00XX: Git Provider Abstraction Layer
- ADR-00XX: Multi-Platform Repository Support
- ADR-00XX: SSH vs HTTPS Remote URL Configuration

**Related Issues**:
- Visibility prompt bug fix (implementation repos) - just fixed
- GitHub-only limitation - reported by users

**Related Code**:
- `src/cli/commands/init.ts` - Calls `RepoStructureManager`
- `src/core/config/config-manager.ts` - Stores provider config
- `plugins/specweave-github/` - GitHub-specific sync logic

---

## 💬 NEXT STEPS

**Immediate Actions** (Today):
1. Fix monorepo visibility bug (15 minutes)
2. Write test case for bug fix
3. Create GitHub issue tracking architectural refactor

**This Week**:
1. Add SSH URL support
2. Add token permission guidance
3. Design `GitProvider` interface (ADR + RFC)

**This Month**:
1. Implement provider abstraction
2. Refactor existing GitHub logic
3. Add GitLab provider support
4. Update documentation

**Questions for Team**:
1. Which Git platforms should we prioritize? (GitLab, Bitbucket, Azure DevOps?)
2. Should we support mixed-platform repos in v1 or defer to v2?
3. Do we need self-hosted platform support immediately or can it wait?

---

**Reviewed by**: Tech Lead
**Status**: Ready for Engineering Manager Review
**Next Reviewer**: @engineering-manager
