# ADR-0027: .env File Structure

**Status**: Accepted
**Date**: 2025-11-11
**Deciders**: System Architect, Tech Lead
**Technical Story**: Increment 0022 - Multi-Repo Initialization UX Improvements

## Context

SpecWeave integrates with external services (GitHub, JIRA, Azure DevOps) for increment tracking and synchronization. Configuration must be:
- **Secure**: Sensitive tokens not committed to git
- **Portable**: Easy to share configuration (without secrets)
- **Consistent**: Same format across all integrations
- **Discoverable**: New users can easily understand structure

**Current State**: Configuration scattered across multiple files
- `.specweave/config.json` - Project metadata (git-tracked)
- No centralized place for GitHub/JIRA/ADO credentials
- Users confused where to put tokens

**User Feedback**: "think about having .env in the root folder (similar to what we have to JIRA and ADO), it's for github keys, project ids maybe, for sync up"

## Decision

Automatically generate `.env` file in project root during multi-repo setup, following industry-standard dotenv format.

### File Structure

**Generated File**: `.env` (project root)

```bash
# SpecWeave GitHub Integration
# Generated: 2025-11-11T15:30:00Z
# DO NOT commit this file to git (contains secrets!)

# GitHub Authentication
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub Configuration
GITHUB_OWNER=my-org
GITHUB_REPOS=parent,frontend,backend,shared

# Repository Mapping (ID → GitHub repo name)
REPO_PARENT=my-project-parent
REPO_FRONTEND=my-project-frontend
REPO_BACKEND=my-project-backend
REPO_SHARED=my-project-shared

# Sync Configuration
SPECWEAVE_SYNC_ENABLED=true
SPECWEAVE_AUTO_CREATE_ISSUE=true
SPECWEAVE_SYNC_DIRECTION=bidirectional

# Optional: JIRA Integration
# JIRA_API_TOKEN=your_jira_token
# JIRA_DOMAIN=your-company.atlassian.net
# JIRA_PROJECT_KEY=PROJ
# JIRA_EPIC_LINK_FIELD=customfield_10014

# Optional: Azure DevOps Integration
# AZURE_DEVOPS_PAT=your_ado_pat
# AZURE_DEVOPS_ORG=your-org
# AZURE_DEVOPS_PROJECT=YourProject
# AZURE_DEVOPS_AREA=YourArea
```

### Companion File: `.env.example` (Safe to Commit)

```bash
# SpecWeave Configuration Template
# Copy to .env and fill in your values

# GitHub Authentication (required)
GITHUB_TOKEN=your_github_token_here

# GitHub Configuration (required)
GITHUB_OWNER=your_org_or_username
GITHUB_REPOS=parent,frontend,backend

# Repository Mapping (required)
REPO_PARENT=your-parent-repo-name
REPO_FRONTEND=your-frontend-repo-name
REPO_BACKEND=your-backend-repo-name

# Sync Configuration (optional)
SPECWEAVE_SYNC_ENABLED=true
SPECWEAVE_AUTO_CREATE_ISSUE=true
SPECWEAVE_SYNC_DIRECTION=bidirectional
```

### .gitignore Entry (Auto-Added)

```gitignore
# Environment variables (secrets)
.env

# But allow example template
!.env.example
```

### File Permissions

**Security**: Set restrictive permissions on generation

```bash
-rw------- 1 user user  1.2K Nov 11 15:30 .env        # 0600 (owner read/write only)
-rw-r--r-- 1 user user  800B Nov 11 15:30 .env.example # 0644 (world-readable, safe)
```

## Alternatives Considered

### Alternative 1: Store in .specweave/config.json

**Approach**: Add GitHub config to existing `.specweave/config.json`

```json
{
  "project": { "name": "my-project" },
  "github": {
    "token": "ghp_xxx",  // ❌ Would be git-tracked!
    "owner": "my-org",
    "repos": ["frontend", "backend"]
  }
}
```

**Rejected because**:
- **Security risk**: config.json is git-tracked
- **Accidental exposure**: Easy to commit token
- **Not industry standard**: .env is ubiquitous
- **Harder to share**: Can't share config without secrets

### Alternative 2: Separate Token File

**Approach**: Token in `.specweave/.github-token`, config in `config.json`

**Rejected because**:
- **Fragmentation**: Secrets and config split
- **Not standard**: .env is established convention
- **More files**: 2 files instead of 1 (.env + .env.example)
- **Harder discovery**: Users don't know about `.specweave/.github-token`

### Alternative 3: Per-Service .env Files

**Approach**: `.env.github`, `.env.jira`, `.env.ado`

**Rejected because**:
- **Too many files**: 3+ .env files clutters root
- **Confusing**: Which file for which purpose?
- **Not standard**: Single .env is convention
- **Harder tooling**: Must parse multiple files

### Alternative 4: System Environment Variables Only

**Approach**: Require users to set system env vars

```bash
export GITHUB_TOKEN=ghp_xxx
export GITHUB_OWNER=my-org
# ... etc
```

**Rejected because**:
- **Not portable**: Different shells, different syntax
- **Not discoverable**: No template/example
- **Harder to manage**: Many variables to set
- **Not project-specific**: System-wide config for project-level settings

## Consequences

### Positive

✅ **Industry standard**
- .env format widely recognized
- Tooling support (IDEs, libraries)
- Familiar to developers from other ecosystems

✅ **Security by default**
- Auto-added to .gitignore
- Restrictive permissions (0600)
- Clear warnings not to commit

✅ **Easy to share configurations**
- .env.example provides template
- Team members copy and fill in their tokens
- Safe to commit example (no secrets)

✅ **Consistent with JIRA/ADO**
- Same format across all integrations
- Single file for all credentials
- Unified configuration experience

✅ **Discoverable**
- .env in project root (easy to find)
- .env.example shows expected structure
- Comments explain each section

### Negative

⚠️ **Risk of accidental commit**
- Users might forget to add .gitignore
- Pre-commit hooks help mitigate
- Clear warnings during generation

⚠️ **Not encrypted at rest**
- Tokens stored in plaintext
- Relies on filesystem permissions
- Alternative: Use system keychain (future enhancement)

⚠️ **Single point of failure**
- All secrets in one file
- If leaked, all integrations compromised
- Mitigation: Regular token rotation

⚠️ **Duplication with config.json**
- Some settings overlap (owner, repos)
- Must keep in sync manually
- Tradeoff: Security over convenience

### Mitigation

**Pre-Commit Hook**: Prevent .env commits

```bash
#!/bin/bash
# .git/hooks/pre-commit

if git diff --cached --name-only | grep -q "^\.env$"; then
  echo "❌ ERROR: Attempting to commit .env file (contains secrets!)"
  echo "   Remove .env from staging: git reset HEAD .env"
  exit 1
fi
```

**Token Rotation Policy**: Recommend 90-day rotation

```bash
# In .env, add expiration comment
# GITHUB_TOKEN expires: 2026-02-11
GITHUB_TOKEN=ghp_xxx
```

**Future: Keychain Integration**

```typescript
// macOS Keychain
import keytar from 'keytar';

await keytar.setPassword('specweave', 'github-token', token);
const token = await keytar.getPassword('specweave', 'github-token');
```

## Implementation

**Files Created**:
- `src/utils/env-file-generator.ts` - Generation logic (150 lines)
- `tests/unit/env-file-generator.test.ts` - Unit tests (120 lines)

**Integration**:
- `src/core/repo-structure/repo-structure-manager.ts:717` - generateEnvFile() method
- `src/core/repo-structure/repo-structure-manager.ts:733` - Call to generateEnvFile()
- `src/core/repo-structure/repo-structure-manager.ts:735` - Success message

**Generated Files**:
- `.env` (0600 permissions, git-ignored)
- `.env.example` (0644 permissions, safe to commit)

**Test Coverage**: 85% (validates file generation, permissions, .gitignore update)

## References

- **Increment 0022 Spec**: `.specweave/increments/0022-multi-repo-init-ux/spec.md`
- **User Story**: US-006 - Create .env File
- **Acceptance Criteria**: AC-US6-01 through AC-US6-06
- **User Feedback**: "think about having .env in the root folder (similar to what we have to JIRA and ADO)"
- **dotenv Specification**: https://github.com/motdotla/dotenv
- **Related ADRs**:
  - ADR-0025: Incremental State Persistence (similar security considerations)
  - ADR-0026: GitHub Validation Strategy (uses GITHUB_TOKEN)

## Notes

**Loading .env in Code**:

```typescript
import dotenv from 'dotenv';
dotenv.config(); // Loads .env into process.env

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
```

**Multi-Environment Support** (Future):

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production

# Local overrides (never commit)
.env.local
```

**Encryption at Rest** (Future Enhancement):

```bash
# Encrypted .env (requires passphrase to decrypt)
.env.encrypted

# Tool to decrypt
specweave decrypt-env --output .env
```

**Example from Real Project**:

```bash
# Real-world example (SpecWeave development)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=anton-abyzov
GITHUB_REPOS=specweave
REPO_SPECWEAVE=specweave
SPECWEAVE_SYNC_ENABLED=true
SPECWEAVE_AUTO_CREATE_ISSUE=true
```

**Future Enhancements**:
- System keychain integration (macOS, Windows, Linux)
- Environment-specific .env files (.env.dev, .env.prod)
- Encrypted .env storage with passphrase
- Vault integration (HashiCorp Vault, AWS Secrets Manager)
- Token expiration warnings (90 days)
