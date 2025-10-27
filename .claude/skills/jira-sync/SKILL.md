---
name: jira-sync
description: Sync SpecWeave increments with JIRA epics/stories. Activates for JIRA sync, create JIRA issue, import from JIRA, sync to JIRA. Coordinates with specweave-jira-mapper agent.
allowed-tools: Read, Write, Edit, Task, Bash
---

# JIRA Sync Skill

Coordinates JIRA synchronization by delegating to `specweave-jira-mapper` agent.

## Responsibilities

1. Detect sync requests (export, import, bidirectional)
2. Validate prerequisites (JIRA credentials, increment structure)
3. Invoke `specweave-jira-mapper` agent
4. Handle errors gracefully

---

## ⚠️ CRITICAL: Secrets Required (MANDATORY CHECK)

**BEFORE attempting JIRA sync, CHECK for JIRA credentials.**

### Step 1: Check If Credentials Exist

```bash
# Check .env file for both required credentials
if [ -f .env ] && grep -q "JIRA_API_TOKEN" .env && grep -q "JIRA_EMAIL" .env; then
  echo "✅ JIRA credentials found"
else
  # Credentials NOT found - STOP and prompt user
fi
```

### Step 2: If Credentials Missing, STOP and Show This Message

```
🔐 **JIRA API Token and Email Required**

I need your JIRA API token and email to sync with JIRA.

**How to get it**:
1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Log in with your Atlassian account
3. Click "Create API token"
4. Give it a label (e.g., "specweave-sync")
5. Click "Create"
6. **Copy the token immediately** (you can't see it again!)

**Where I'll save it**:
- File: `.env` (gitignored, secure)
- Format:
  ```
  JIRA_API_TOKEN=your-jira-api-token-here
  JIRA_EMAIL=your-email@example.com
  JIRA_DOMAIN=your-domain.atlassian.net
  ```

**Security**:
✅ .env is in .gitignore (never committed to git)
✅ Token is random alphanumeric string (variable length)
✅ Stored locally only (not in source code)

Please provide:
1. Your JIRA API token:
2. Your JIRA email:
3. Your JIRA domain (e.g., company.atlassian.net):
```

### Step 3: Validate Credentials Format

```bash
# Validate email format
if [[ ! "$JIRA_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  echo "⚠️  Warning: Email format unexpected"
  echo "Expected: valid email address"
  echo "Got: $JIRA_EMAIL"
fi

# Validate domain format
if [[ ! "$JIRA_DOMAIN" =~ \.atlassian\.net$ ]]; then
  echo "⚠️  Warning: Domain format unexpected"
  echo "Expected: *.atlassian.net"
  echo "Got: $JIRA_DOMAIN"
  echo "Note: Self-hosted JIRA may have different domain format"
fi

# Token validation (just check it's not empty)
if [ -z "$JIRA_API_TOKEN" ]; then
  echo "❌ Error: JIRA API token is empty"
  exit 1
fi
```

### Step 4: Save Credentials Securely

```bash
# Save to .env
cat >> .env << EOF
JIRA_API_TOKEN=$JIRA_API_TOKEN
JIRA_EMAIL=$JIRA_EMAIL
JIRA_DOMAIN=$JIRA_DOMAIN
EOF

# Ensure .env is gitignored
if ! grep -q "^\\.env$" .gitignore; then
  echo ".env" >> .gitignore
fi

# Create .env.example for team
cat > .env.example << 'EOF'
# JIRA API Token
# Get from: https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_API_TOKEN=your-jira-api-token
JIRA_EMAIL=your-email@example.com
JIRA_DOMAIN=your-domain.atlassian.net
EOF

echo "✅ Credentials saved to .env (gitignored)"
echo "✅ Created .env.example for team (commit this)"
```

### Step 5: Use Credentials in Sync

```bash
# Export for JIRA API calls
export JIRA_API_TOKEN=$(grep JIRA_API_TOKEN .env | cut -d '=' -f2)
export JIRA_EMAIL=$(grep JIRA_EMAIL .env | cut -d '=' -f2)
export JIRA_DOMAIN=$(grep JIRA_DOMAIN .env | cut -d '=' -f2)

# Create Basic Auth header (JIRA uses email:token)
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

# Use in JIRA API calls
curl -H "Authorization: Basic $AUTH" \
     -H "Content-Type: application/json" \
     https://$JIRA_DOMAIN/rest/api/3/issue/PROJ-123
```

### Step 6: Never Log Secrets

```bash
# ❌ WRONG - Logs secret
echo "Using token: $JIRA_API_TOKEN"

# ✅ CORRECT - Masks secret
echo "Using JIRA credentials (token present: ✅, email: $JIRA_EMAIL)"
```

### Step 7: Error Handling

```bash
# If API call fails with 401 Unauthorized
if [ $? -eq 401 ]; then
  echo "❌ JIRA credentials invalid"
  echo ""
  echo "Possible causes:"
  echo "1. API token expired or revoked"
  echo "2. Email address incorrect"
  echo "3. Domain incorrect (check: $JIRA_DOMAIN)"
  echo "4. Account lacks permissions (need: project admin or issue create/edit)"
  echo ""
  echo "Please verify credentials:"
  echo "https://id.atlassian.com/manage-profile/security/api-tokens"
fi

# If API call fails with 403 Forbidden
if [ $? -eq 403 ]; then
  echo "❌ JIRA permission denied"
  echo ""
  echo "Your account lacks permissions for this operation."
  echo "Required permissions:"
  echo "- Browse projects"
  echo "- Create issues"
  echo "- Edit issues"
  echo "- Administer projects (for Epic creation)"
  echo ""
  echo "Contact your JIRA administrator."
fi
```

### Step 8: Production Recommendations

**For production deployments, use OAuth 2.0** instead of API tokens:

**Why OAuth 2.0?**
- ✅ More secure (no long-lived credentials)
- ✅ Fine-grained permissions (scopes)
- ✅ Automatic token refresh
- ✅ Audit trail in JIRA

**How to set up OAuth 2.0**:
1. Go to: https://developer.atlassian.com/console/myapps/
2. Create a new app
3. Configure OAuth 2.0 credentials
4. Add required scopes (read:jira-work, write:jira-work)
5. Use OAuth flow instead of API token

**For self-hosted JIRA**: Use Personal Access Tokens (PAT) instead of API tokens.

---

## Usage

**Export**: `/sync-jira export 0001`
**Import**: `/sync-jira import PROJ-123`
**Sync**: `/sync-jira sync 0001`

All conversion logic is handled by the `specweave-jira-mapper` agent.
