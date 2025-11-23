# SpecWeave Init - Complete Scenarios Guide

**Date**: 2025-11-23
**Version**: Post-Git Provider Abstraction (v0.24.6+)
**Status**: Platform-agnostic initialization with GitHub/GitLab/Bitbucket support

---

## Overview

`specweave init` now supports **multi-platform Git hosting** with an intuitive step-by-step workflow. Users can choose their platform, repository architecture, URL format, and create repositories automatically.

**Supported Platforms**:
- ✅ **GitHub** (fully supported)
- ⏳ **GitLab** (coming soon - stub implementation)
- ⏳ **Bitbucket** (coming soon - stub implementation)

---

## Complete Initialization Flow

### Step 1: Architecture Selection

```
🏗️  Repository Architecture Setup

Let's configure your repository structure for optimal organization.

? What repository architecture do you want?

❯ Single Repository
  One repository with all code in one place
  Example: my-project/ (frontend, backend, shared)

  Parent Repository + Nested Implementation Repos
  Parent folder tracks specs/docs, nested folders are separate repos
  Example: my-project-parent/ with nested frontend/, backend/ repos
```

**User chooses**: `single` or `github-parent`

---

### Step 2: Platform Selection (NEW!)

```
🌐 Git Platform Selection

SpecWeave supports multiple Git hosting platforms.
Choose where your repositories will be hosted.

Note: Currently, only GitHub is fully supported.
Other platforms (GitLab, Bitbucket, Azure DevOps) are coming soon!

? Select your Git hosting platform:

❯ GitHub
  Modern, cloud-native development platform

  GitLab
  DevOps platform with built-in CI/CD
  ⚠️  Coming soon! Currently, only GitHub is supported.

  Bitbucket
  Git solution for professional teams
  ⚠️  Coming soon! Currently, only GitHub is supported.
```

**User chooses**: `github` (default)

**What happens**:
- Platform registry loads provider instance
- If GitLab/Bitbucket selected → Shows "coming soon" error with roadmap
- If GitHub → Continues to next step

---

### Step 3: URL Format Selection (NEW!)

```
? Git remote URL format?

❯ SSH (Recommended)
  git@github.com:owner/repo.git - More secure, no password needed

  HTTPS
  https://github.com/owner/repo.git - Works everywhere, uses tokens
```

**User chooses**: `ssh` (default) or `https`

**Why SSH is recommended**:
- More secure (uses SSH keys, not passwords)
- GitHub deprecated password authentication in 2021
- No token needed in git operations
- Faster authentication

---

## Scenario 1: Single Repository (GitHub, SSH)

### User Journey

**Step 1: Architecture** → `Single Repository`
**Step 2: Platform** → `GitHub`
**Step 3: URL Type** → `SSH (Recommended)`

### Questions Asked

```
📦 Single Repository Configuration

? GitHub owner/organization: myorg
? Repository name: my-awesome-project
? Repository description: My SpecWeave project
? Create repository on GitHub? Yes
? Repository visibility for "my-awesome-project"?
  ❯ Private
    Only you and collaborators can see this repository

    Public
    Anyone can see this repository
```

### Expected Answers

```yaml
owner: myorg
repo: my-awesome-project
description: My SpecWeave project
createOnGitHub: true
visibility: private
```

### What Happens

1. **Validation**:
   - Validates `myorg` exists on GitHub via API
   - Validates `my-awesome-project` doesn't already exist

2. **Repository Creation**:
   - Creates `myorg/my-awesome-project` on GitHub (private)
   - Initializes local git repository
   - Adds remote: `git@github.com:myorg/my-awesome-project.git`

3. **Folder Structure**:
   ```
   my-awesome-project/
   ├── .git/                      ← Git repository
   ├── .specweave/                ← SpecWeave structure
   │   ├── increments/
   │   ├── docs/
   │   └── logs/
   ├── src/                       ← Basic structure
   ├── tests/
   └── README.md
   ```

4. **Output**:
   ```
   ✅ Created repositories:
      • myorg/my-awesome-project

   ✓ .env file created
   ⚠️  DO NOT commit .env to git (contains secrets!)

   🎉 Setup Complete!
   ```

---

## Scenario 2: Single Repository (GitHub, SSH, No GitHub Creation)

### User Journey

**Step 1: Architecture** → `Single Repository`
**Step 2: Platform** → `GitHub`
**Step 3: URL Type** → `SSH (Recommended)`

### Questions Asked

```
? GitHub owner/organization: myorg
? Repository name: existing-project
? Repository description: Existing project
? Create repository on GitHub? No  ← User says NO!
```

### Expected Answers

```yaml
owner: myorg
repo: existing-project
description: Existing project
createOnGitHub: false  ← CRITICAL!
```

### What Happens

1. **NO visibility prompt** (bug fixed!)
   - Visibility defaults to `private`
   - User is NOT asked about visibility

2. **Repository Setup**:
   - Creates local `.git` folder (if not exists)
   - Adds remote: `git@github.com:myorg/existing-project.git`
   - Does NOT create repository on GitHub

3. **User Workflow**:
   ```bash
   # User manually creates repo on GitHub later
   # Then pushes:
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

4. **Output**:
   ```
   ⚠️  No GitHub token available
      Skipping GitHub repository creation
      You can create repositories manually later

   ✓ Local repositories initialized
   ```

---

## Scenario 3: Parent Repository + Nested Repos (GitHub, SSH)

### User Journey

**Step 1: Architecture** → `Parent Repository + Nested Implementation Repos`
**Step 2: Platform** → `GitHub`
**Step 3: URL Type** → `SSH (Recommended)`

### Questions Asked

```
🎯 Multi-Repository Configuration

This creates separate repositories for each service/component.

💡 Benefits of Parent Repository Approach:

✅ Central Documentation Hub
   • All specs, ADRs, and architecture docs in one place
   • .specweave/ lives in parent repo only
   • Single source of truth for requirements

✅ Simplified Increment Tracking
   • Increments reference multiple implementation repos
   • Tasks map to specific services
   • Clear cross-service dependencies

? Parent repository setup:

  ❯ Create new parent repository
    Create a new GitHub repo for specs, docs, and architecture

    Use existing parent repository
    Connect to an existing GitHub repo that already has .specweave/ structure
```

**User chooses**: `Create new`

```
✨ New Parent Repository

? GitHub owner/organization for ALL repos: myorg
? Parent repository name: my-project-parent
? Parent repository description: SpecWeave parent repository - specs, docs, and architecture
? Create parent repository on GitHub? Yes
? Repository visibility for "my-project-parent"?
  ❯ Private
    Only you and collaborators can see this repository

📊 Repository Count

You will create:
  • 1 parent repository (specs, docs, increments)
  • N implementation repositories (your services/apps)

Next question asks for: IMPLEMENTATION repositories ONLY (not counting parent)

? 📦 How many IMPLEMENTATION repositories? (not counting parent) 2
```

### Implementation Repos Configuration

```
📦 Configure Each Repository:

Repository 1 of 2:

? Repository name: my-project-frontend
? Repository description: Frontend application
? Create this repository on GitHub? Yes
? Repository visibility for "my-project-frontend"?
  ❯ Private

   ✓ Repository ID: frontend (auto-generated)

Repository 2 of 2:

? Repository name: my-project-backend
? Repository description: Backend API
? Create this repository on GitHub? Yes
? Repository visibility for "my-project-backend"?
  ❯ Private

   ✓ Repository ID: backend (auto-generated)
```

### Expected Answers

```yaml
# Parent Repo
parentRepo:
  owner: myorg
  name: my-project-parent
  description: SpecWeave parent repository
  createOnGitHub: true
  visibility: private

# Implementation Repos
repositories:
  - id: frontend
    name: my-project-frontend
    owner: myorg
    description: Frontend application
    createOnGitHub: true
    visibility: private
    isNested: true

  - id: backend
    name: my-project-backend
    owner: myorg
    description: Backend API
    createOnGitHub: true
    visibility: private
    isNested: true
```

### What Happens

1. **Validation**:
   - Validates `myorg` exists on GitHub
   - Validates all 3 repositories don't exist yet

2. **Repository Creation** (in order):
   ```
   🚀 Creating GitHub Repositories

   ✅ Created repositories:
      • myorg/my-project-parent
      • myorg/my-project-frontend
      • myorg/my-project-backend
   ```

3. **Folder Structure**:
   ```
   my-project-parent/               ← Parent repo (ROOT)
   ├── .git/                        ← Parent git
   │   └── config → remote: git@github.com:myorg/my-project-parent.git
   ├── .specweave/                  ← SpecWeave data (ONLY in parent!)
   │   ├── increments/
   │   ├── docs/
   │   │   └── internal/
   │   │       └── specs/
   │   │           ├── frontend/    ← Frontend specs
   │   │           └── backend/     ← Backend specs
   │   └── logs/
   ├── frontend/                    ← Nested implementation repo
   │   ├── .git/                    ← Separate git repo!
   │   │   └── config → remote: git@github.com:myorg/my-project-frontend.git
   │   ├── src/
   │   ├── tests/
   │   └── README.md
   └── backend/                     ← Nested implementation repo
       ├── .git/                    ← Separate git repo!
       │   └── config → remote: git@github.com:myorg/my-project-backend.git
       ├── src/
       ├── tests/
       └── README.md
   ```

4. **Git Configuration**:
   ```bash
   # Parent repo
   cd my-project-parent
   git remote get-url origin
   # → git@github.com:myorg/my-project-parent.git

   # Frontend repo
   cd frontend
   git remote get-url origin
   # → git@github.com:myorg/my-project-frontend.git

   # Backend repo
   cd ../backend
   git remote get-url origin
   # → git@github.com:myorg/my-project-backend.git
   ```

5. **.env File**:
   ```bash
   # .env (parent repo root)
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   GITHUB_OWNER=myorg

   # Repository mapping
   REPO_FRONTEND=my-project-frontend
   REPO_BACKEND=my-project-backend

   # GitHub sync configuration
   GITHUB_SYNC_ENABLED=true
   GITHUB_AUTO_CREATE_ISSUE=true
   GITHUB_SYNC_DIRECTION=bidirectional
   ```

---

## Scenario 4: Parent Repository + Existing Repos (GitHub, SSH)

### User Journey

**Step 1: Architecture** → `Parent Repository + Nested Implementation Repos`
**Step 2: Platform** → `GitHub`
**Step 3: URL Type** → `SSH (Recommended)`

### Questions Asked

```
? Parent repository setup:

    Create new parent repository
    Create a new GitHub repo for specs, docs, and architecture

  ❯ Use existing parent repository
    Connect to an existing GitHub repo that already has .specweave/ structure
```

**User chooses**: `Use existing`

```
📋 Existing Parent Repository

? GitHub owner/organization: myorg
? Existing parent repository name: my-project-parent

✓ Using existing repository: myorg/my-project-parent
```

### What Happens

1. **Validation**:
   - Validates `myorg/my-project-parent` EXISTS on GitHub
   - Fetches existing repository metadata (description, visibility)

2. **No Parent Repo Creation**:
   - Skips GitHub API call to create parent
   - Uses existing repository's visibility (fetched from API)

3. **Implementation Repos**:
   - Asks for implementation repos (same as Scenario 3)
   - Creates only implementation repos on GitHub

4. **Cloning Behavior**:
   ```bash
   # If parent repo exists remotely:
   → Cloning existing repository from GitHub...
   ✓ Cloned myorg/my-project-parent

   # Creates nested repos as before
   ```

---

## Scenario 5: GitLab Platform Selection (Coming Soon)

### User Journey

**Step 1: Architecture** → `Single Repository`
**Step 2: Platform** → `GitLab` ← User selects GitLab!
**Step 3: URL Type** → (never reached)

### What Happens

**Immediate Error Message**:
```
❌ GitLab Support Coming Soon!

GitLab integration is not yet implemented.
Currently, only GitHub is fully supported.

🔜 What's coming:
   • GitLab.com and self-hosted GitLab support
   • Project validation and creation
   • Group/namespace support
   • SSH and HTTPS remote URLs

For now, please use GitHub or wait for the next SpecWeave release.

📖 Track progress: https://github.com/anton-abyzov/specweave/issues
```

**User Action**:
- Re-run `specweave init` and select GitHub
- Wait for GitLab implementation in future release

---

## Scenario 6: Bitbucket Platform Selection (Coming Soon)

### User Journey

**Step 1: Architecture** → `Single Repository`
**Step 2: Platform** → `Bitbucket` ← User selects Bitbucket!
**Step 3: URL Type** → (never reached)

### What Happens

**Immediate Error Message**:
```
❌ Bitbucket Support Coming Soon!

Bitbucket integration is not yet implemented.
Currently, only GitHub is fully supported.

🔜 What's coming:
   • Bitbucket.org and Bitbucket Server/Data Center support
   • Repository validation and creation
   • Workspace support
   • SSH and HTTPS remote URLs

For now, please use GitHub or wait for the next SpecWeave release.

📖 Track progress: https://github.com/anton-abyzov/specweave/issues
```

**User Action**:
- Re-run `specweave init` and select GitHub
- Wait for Bitbucket implementation in future release

---

## Scenario 7: HTTPS URL Format (GitHub)

### User Journey

**Step 1: Architecture** → `Single Repository`
**Step 2: Platform** → `GitHub`
**Step 3: URL Type** → `HTTPS` ← User chooses HTTPS instead of SSH

### Questions Asked

(Same as Scenario 1, but with HTTPS remote)

### What Happens

**Remote URL uses HTTPS format**:
```bash
cd my-awesome-project
git remote get-url origin
# → https://github.com/myorg/my-awesome-project.git
```

**When to use HTTPS**:
- Corporate firewalls block SSH (port 22)
- CI/CD environments without SSH keys
- Temporary/shared machines
- Personal preference

**Token Authentication**:
```bash
# First push requires token
git push -u origin main
# Username: myorg
# Password: ghp_xxxxxxxxxxxx (GitHub token, not password!)
```

---

## Platform-Specific Behaviors

### GitHub (Fully Supported)

**API Endpoints**:
- Validation: `https://api.github.com/repos/{owner}/{repo}`
- Creation (User): `https://api.github.com/user/repos`
- Creation (Org): `https://api.github.com/orgs/{org}/repos`

**Token Requirements**:
- `repo` scope (full control of private repositories)
- `admin:org` scope (if creating in organization)

**Remote URLs**:
- SSH: `git@github.com:owner/repo.git`
- HTTPS: `https://github.com/owner/repo.git`

**Error Handling**:
- 401 Unauthorized → "Check your GitHub token"
- 403 Forbidden → "Token lacks required permissions (repo, admin:org)"
- 404 Not Found → "Repository or owner not found"
- 422 Unprocessable → "Repository name already exists or invalid"

---

### GitLab (Coming Soon)

**Planned Support**:
- GitLab.com (SaaS)
- Self-hosted GitLab instances

**API Endpoints** (planned):
- Validation: `https://gitlab.com/api/v4/projects/{namespace}%2F{project}`
- Creation: `https://gitlab.com/api/v4/projects`

**Token Requirements**:
- `api` scope (full API access)
- `read_repository`, `write_repository` scopes

**Remote URLs**:
- SSH: `git@gitlab.com:namespace/project.git`
- HTTPS: `https://gitlab.com/namespace/project.git`

**Namespace Support**:
- User projects: `username/project`
- Group projects: `group/project`
- Subgroups: `parent-group/subgroup/project`

---

### Bitbucket (Coming Soon)

**Planned Support**:
- Bitbucket.org (Cloud)
- Bitbucket Server/Data Center (self-hosted)

**API Endpoints** (planned):
- Validation: `https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}`
- Creation: `https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}`

**Token Requirements**:
- App passwords with `repository:read`, `repository:write`, `repository:admin`

**Remote URLs**:
- SSH: `git@bitbucket.org:workspace/repo.git`
- HTTPS: `https://bitbucket.org/workspace/repo.git`

**Workspace Support**:
- Personal workspaces
- Team workspaces

---

## Key Implementation Details

### 1. Provider Abstraction Layer

All platform-specific logic is isolated in provider classes:

```typescript
// Platform-agnostic code
const provider = registry.getProvider('github');
await provider.validateRepository(owner, repo, token);
const remoteUrl = provider.getRemoteUrl(owner, repo, 'ssh');
```

### 2. Error Message Consistency

All providers use the same error handler for consistent UX:

```typescript
const apiError: GitApiError = {
  status: 404,
  message: 'Not Found',
  platform: 'github',  // or 'gitlab', 'bitbucket'
  operation: 'validate_repo',
  resourceType: 'repository',
  resourceName: `${owner}/${repo}`
};

const actionable = getActionableError(apiError);
// → Returns platform-specific troubleshooting steps
```

### 3. Stub Implementation Pattern

Unsupported platforms throw helpful errors:

```typescript
class GitLabProvider extends BaseGitProvider {
  async validateRepository() {
    throw new Error(`
❌ GitLab Support Coming Soon!
...roadmap details...
📖 Track progress: https://github.com/anton-abyzov/specweave/issues
    `);
  }
}
```

---

## Troubleshooting

### "Platform github is not available"

**Cause**: Provider registry not initialized

**Fix**: Ensure `initializeProviders()` is called in constructor:
```typescript
constructor() {
  initializeProviders();  // Must be called first!
}
```

---

### "Repository already exists" error

**Cause**: Repository name conflict

**Fix**:
1. Choose "Use existing parent repository" instead
2. Or pick a different repository name

---

### "Permission Denied (403)"

**Cause**: GitHub token lacks required scopes

**Fix**:
1. Go to: https://github.com/settings/tokens/new
2. Select scopes: `repo`, `admin:org` (if organization)
3. Update `GITHUB_TOKEN` in `.env`

---

### SSH clone fails: "Permission denied (publickey)"

**Cause**: SSH key not configured

**Fix**:
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your@email.com"

# Add to GitHub
cat ~/.ssh/id_ed25519.pub
# → Copy and paste to https://github.com/settings/keys

# Test connection
ssh -T git@github.com
```

---

## Summary

**Current State** (v0.24.6+):
- ✅ Multi-platform architecture complete
- ✅ GitHub fully supported (SSH + HTTPS)
- ✅ GitLab/Bitbucket stubs with roadmap
- ✅ Platform-agnostic error handling
- ✅ 100% abstraction (0 hardcoded GitHub references)

**Future Roadmap**:
- 📅 Q1 2026: GitLab full implementation
- 📅 Q2 2026: Bitbucket full implementation
- 📅 Future: Azure DevOps Repos, self-hosted Git

**Migration Path for Users**:
- Existing projects: No changes needed (backward compatible)
- New projects: Choose platform during init
- Future: Migrate between platforms with provider swap
