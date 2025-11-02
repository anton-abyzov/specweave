---
name: github-sync
description: Bi-directional synchronization between GitHub and SpecWeave. Maps GitHub Milestones to Release Plans, Issues to RFCs/Tasks. Maintains sync status. Activates for GitHub, sync GitHub, map GitHub to SpecWeave, GitHub issues.
---

# GitHub Sync Skill

**Purpose**: Enable bi-directional synchronization between GitHub and SpecWeave.

**When to Use**: When integrating SpecWeave with GitHub Projects/Issues.

---

## GitHub Concept Mapping

| GitHub Concept | SpecWeave Concept | Location |
|----------------|-------------------|----------|
| **Milestone** | **Release Plan** | `docs/internal/delivery/release-v1.0.md` |
| **Project** | **Increment** or **Release** | Depends on scope |
| **Issue (feature)** | **RFC** | `docs/internal/architecture/rfc/0001-{name}.md` |
| **Issue (bug)** | **Incident** | `docs/internal/operations/incidents/{id}.md` |
| **Issue (task)** | **Task** | `features/{increment}/tasks.md` |
| **Pull Request** | **Implementation** | Code linked to increment |
| **Label** | **Tag** | `metadata.yaml` → tags |

---

## Status Mapping

| GitHub State | SpecWeave Status | Notes |
|--------------|------------------|-------|
| Open | `planned` or `in_progress` | Depends on labels/assignee |
| Closed | `completed` or `cancelled` | Depends on why closed |

---

## Configuration

GitHub sync uses auto-detection - no configuration file needed. Repository and credentials are detected from environment variables or prompted when needed.

---

## Authentication

### Personal Access Token

1. **Generate Token**: GitHub → Settings → Developer Settings → Personal Access Tokens
2. **Scopes**: `repo`, `read:project`
3. **Set Environment Variable**:
   ```bash
   export GITHUB_TOKEN="your_token_here"
   ```

---

## ⚠️ CRITICAL: Secrets Required (MANDATORY CHECK)

**BEFORE attempting GitHub sync, CHECK for GitHub token.**

### Step 1: Check If Token Exists

```bash
# Check .env file
if [ -f .env ] && grep -q "GITHUB_TOKEN" .env; then
  echo "✅ GitHub token found"
else
  # Token NOT found - STOP and prompt user
fi
```

### Step 2: If Token Missing, STOP and Show This Message

```
🔐 **GitHub Personal Access Token Required**

I need your GitHub Personal Access Token to sync with GitHub.

**How to get it**:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name (e.g., "specweave-sync")
4. Select scopes:
   ✅ **repo** (Full control of private repositories)
   ✅ **read:org** (Read org and team membership, read org projects)
   ✅ **workflow** (Update GitHub Action workflows)
5. Click "Generate token"
6. **Copy the token immediately** (you can't see it again!)

**Where I'll save it**:
- File: `.env` (gitignored, secure)
- Format: `GITHUB_TOKEN=ghp_your-token-here`

**Security**:
✅ .env is in .gitignore (never committed to git)
✅ Token format: `ghp_` followed by 40 alphanumeric characters
✅ Stored locally only (not in source code)

Please paste your GitHub Personal Access Token:
```

### Step 3: Validate Token Format

```bash
# GitHub tokens start with ghp_ and are 40 chars after prefix
if [[ ! "$GITHUB_TOKEN" =~ ^ghp_[a-zA-Z0-9]{40}$ ]]; then
  echo "⚠️  Warning: Token format unexpected"
  echo "Expected: ghp_ followed by 40 alphanumeric characters"
  echo "Got: ${#GITHUB_TOKEN} total characters"
  echo ""
  echo "This might not be a valid GitHub Personal Access Token."
  echo "Continue anyway? (yes/no)"
fi
```

### Step 4: Save Token Securely

```bash
# Save to .env
echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> .env

# Ensure .env is gitignored
if ! grep -q "^\\.env$" .gitignore; then
  echo ".env" >> .gitignore
fi

# Create .env.example for team
cat > .env.example << 'EOF'
# GitHub Personal Access Token
# Get from: https://github.com/settings/tokens
# Scopes: repo, read:org, workflow
GITHUB_TOKEN=ghp_your-github-token-here
EOF

echo "✅ Token saved to .env (gitignored)"
echo "✅ Created .env.example for team (commit this)"
```

### Step 5: Use Token in Sync

```bash
# Export for GitHub CLI or API calls
export GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d '=' -f2)

# Use in GitHub API calls
curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/repos/owner/repo/issues
```

### Step 6: Never Log Secrets

```bash
# ❌ WRONG - Logs secret
echo "Using token: $GITHUB_TOKEN"

# ✅ CORRECT - Masks secret
echo "Using GitHub token (token present: ✅)"
```

### Step 7: Error Handling

```bash
# If API call fails with 401 Unauthorized
if [ $? -eq 401 ]; then
  echo "❌ GitHub token invalid or expired"
  echo ""
  echo "Possible causes:"
  echo "1. Token expired (GitHub tokens can expire)"
  echo "2. Token revoked"
  echo "3. Insufficient scopes (need: repo, read:org)"
  echo ""
  echo "Please generate a new token:"
  echo "https://github.com/settings/tokens"
fi
```

### Step 8: Production Recommendations

**For production deployments, use GitHub Apps** instead of Personal Access Tokens:

**Why GitHub Apps?**
- ✅ Fine-grained permissions (repository-level)
- ✅ Higher rate limits (5000 vs 60 per hour)
- ✅ Organization-scoped (not tied to individual user)
- ✅ Automatic token rotation
- ✅ Audit trail in GitHub UI

**How to create GitHub App**:
1. Go to: https://github.com/settings/apps
2. Click "New GitHub App"
3. Configure:
   - Name: "SpecWeave Sync"
   - Permissions: Issues (Read & Write), Projects (Read & Write)
   - Install to your organization
4. Use GitHub App authentication instead of PAT

---

## Sync Commands

```bash
# Sync all
specweave sync --all

# Sync specific increment
specweave sync --increment 0001 --tool github

# Pull from GitHub
specweave sync --increment 0001 --tool github --direction pull
```

---

## Traceability

**Command**: `specweave trace --github-milestone 5`

**Output**:
```
GitHub Milestone: 5 "v1.0 Release"
  URL: https://github.com/company/repo/milestone/5
    ↓
SpecWeave Release Plan: docs/internal/delivery/release-v1.0.md
  Increments Included:
    - 0001-user-authentication
    - 0002-payment-processing
    - 0003-notification-system
```

---

## Related Documentation

- [Tool Concept Mapping](../../../docs/internal/delivery/guides/tool-concept-mapping.md)
- [jira-sync/SKILL.md](../jira-sync/SKILL.md) - Similar sync pattern
