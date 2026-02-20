---
description: Sync guidance for SpecWeave increments with JIRA epics/stories (content SpecWeave→JIRA, status JIRA→SpecWeave). Use when asking about JIRA integration setup or troubleshooting sync. For actual syncing, use /sw-jira:sync command instead.
allowed-tools: Read, Write, Edit, Task, Bash
---

# JIRA Sync Skill

Coordinates JIRA synchronization by delegating to `jira-mapper` agent.

**Sync Behavior**: Content (specs, tasks) syncs SpecWeave → JIRA. Status (open/closed) syncs JIRA → SpecWeave.

**⚠️ IMPORTANT**: This skill provides HELP and GUIDANCE about JIRA sync. For actual syncing, users should use the `/sw-jira:sync` command directly. This skill should NOT auto-activate when the command is being invoked.

## When to Activate

✅ **Do activate when**:
- User asks: "How do I set up JIRA sync?"
- User asks: "What JIRA credentials do I need?"
- User asks: "How does JIRA sync work?"
- User needs help configuring JIRA integration

❌ **Do NOT activate when**:
- User invokes `/sw-jira:sync` command (command handles it)
- Command is already running (avoid duplicate invocation)
- Task completion hook is syncing (automatic process)

## Responsibilities

1. Answer questions about JIRA sync configuration
2. Help validate prerequisites (JIRA credentials, increment structure)
3. Explain sync directions: content (SpecWeave→JIRA), status (JIRA→SpecWeave)
4. Provide troubleshooting guidance

---

## CRITICAL: Secrets Required (MANDATORY CHECK)

**BEFORE attempting JIRA sync, CHECK for JIRA credentials.**

**SECURITY RULE**: This skill MUST NOT collect, write, or store credentials. The user configures their own `.env` file. The skill only validates that credentials exist.

### Step 1: Check If Credentials Exist

```bash
# Check .env file for required credentials (existence only — never read values)
if [ -f .env ] && grep -q "^JIRA_API_TOKEN=" .env && grep -q "^JIRA_EMAIL=" .env && grep -q "^JIRA_DOMAIN=" .env; then
  echo "JIRA credentials found in .env"
else
  echo "JIRA credentials missing — see setup instructions below"
  # STOP HERE — do NOT prompt user for secrets
fi
```

### Step 2: If Credentials Missing, Show Setup Instructions

Do NOT ask the user to paste credentials into the chat. Instead, show self-service setup:

```
JIRA credentials are required but not configured.

**Setup (do this yourself — the agent should NOT handle your secrets):**

1. Create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens
2. Add these lines to your project `.env` file:

   JIRA_API_TOKEN=<your-token>
   JIRA_EMAIL=<your-email>
   JIRA_DOMAIN=<your-company>.atlassian.net

3. Ensure `.env` is in `.gitignore`
4. Re-run the sync command

For self-hosted JIRA: Use a Personal Access Token (PAT) and your server's hostname.
```

**IMPORTANT**: After showing instructions, STOP. Do not continue until credentials are configured by the user.

### Step 3: Validate Credential Presence (Not Values)

```bash
# Validate that required keys exist and are non-empty (never echo values)
MISSING=()
for KEY in JIRA_API_TOKEN JIRA_EMAIL JIRA_DOMAIN; do
  VAL=$(grep "^${KEY}=" .env | cut -d '=' -f2-)
  if [ -z "$VAL" ]; then
    MISSING+=("$KEY")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "Missing or empty credentials: ${MISSING[*]}"
  exit 1
fi
echo "All required credentials present"
```

### Step 4: Domain Validation (Strict)

```bash
# Read domain safely — quote all variable expansions
JIRA_DOMAIN="$(grep '^JIRA_DOMAIN=' .env | cut -d '=' -f2-)"

# Reject empty
if [ -z "$JIRA_DOMAIN" ]; then
  echo "Error: JIRA_DOMAIN is empty"
  exit 1
fi

# Must be a valid hostname (letters, digits, hyphens, dots only)
if [[ ! "$JIRA_DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]]; then
  echo "Error: JIRA_DOMAIN contains invalid characters"
  exit 1
fi

# Must end with .atlassian.net for cloud JIRA
if [[ ! "$JIRA_DOMAIN" =~ ^[a-zA-Z0-9-]+\.atlassian\.net$ ]]; then
  echo "Warning: Domain does not match <subdomain>.atlassian.net pattern"
  echo "If using self-hosted JIRA, confirm the domain is correct before proceeding"
  # Require explicit user confirmation for non-standard domains
fi

# Reject IP addresses (prevent SSRF)
if [[ "$JIRA_DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  echo "Error: IP addresses not allowed — use a hostname"
  exit 1
fi

# Reject localhost and internal hostnames
if [[ "$JIRA_DOMAIN" =~ ^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.) ]]; then
  echo "Error: Internal/localhost addresses not allowed"
  exit 1
fi
```

### Step 5: Use Credentials in Sync

```bash
# Load credentials from .env (never display values)
JIRA_API_TOKEN="$(grep '^JIRA_API_TOKEN=' .env | cut -d '=' -f2-)"
JIRA_EMAIL="$(grep '^JIRA_EMAIL=' .env | cut -d '=' -f2-)"
JIRA_DOMAIN="$(grep '^JIRA_DOMAIN=' .env | cut -d '=' -f2-)"

# Create Basic Auth header (JIRA uses email:token)
AUTH="$(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)"

# HTTPS only — never allow plain HTTP
# All variables double-quoted to prevent word splitting
curl -s -f \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  "https://${JIRA_DOMAIN}/rest/api/3/myself" \
  || { echo "JIRA API connection failed"; exit 1; }
```

### Step 6: Never Log Secrets

```bash
# NEVER echo token values, auth headers, or base64-encoded credentials
# Only confirm presence:
echo "JIRA connection: domain=${JIRA_DOMAIN}, email present=yes, token present=yes"
```

### Step 7: Error Handling

```bash
# Store HTTP status code from curl
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  "https://${JIRA_DOMAIN}/rest/api/3/myself")

case "$HTTP_STATUS" in
  200) echo "JIRA authentication successful" ;;
  401)
    echo "JIRA credentials invalid (HTTP 401)"
    echo "Check: API token may be expired or email incorrect"
    echo "Manage tokens: https://id.atlassian.com/manage-profile/security/api-tokens"
    ;;
  403)
    echo "JIRA permission denied (HTTP 403)"
    echo "Required permissions: Browse projects, Create issues, Edit issues"
    ;;
  *)
    echo "JIRA API error (HTTP $HTTP_STATUS)"
    ;;
esac
```

### Step 8: Production Recommendations

**For production deployments, use OAuth 2.0** instead of API tokens:

- More secure (no long-lived credentials)
- Fine-grained permissions (scopes)
- Automatic token refresh
- Audit trail in JIRA

**Setup**: https://developer.atlassian.com/console/myapps/ (OAuth 2.0 with scopes: `read:jira-work`, `write:jira-work`)

**For self-hosted JIRA**: Use Personal Access Tokens (PAT) instead of API tokens.

---

## Usage

**Export**: `/sync-jira export 0001`
**Import**: `/sync-jira import PROJ-123`
**Sync**: `/sync-jira sync 0001`

All conversion logic is handled by the `jira-mapper` agent.

---

## Confluence Page Sync

JIRA and Confluence are both Atlassian products and often used together. This skill can also help with Confluence page sync.

### Confluence Credentials

Same authentication pattern as JIRA (Basic Auth with email:api_token):

```bash
# .env (gitignored)
CONFLUENCE_API_TOKEN=your-api-token    # Same as JIRA token works
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_DOMAIN=your-domain.atlassian.net
CONFLUENCE_SPACE_KEY=PROJ
```

### Key Confluence Operations

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Get page | `/wiki/api/v2/pages/{id}?body-format=storage` | GET |
| Update page | `/wiki/api/v2/pages/{id}` | PUT |
| Create page | `/wiki/api/v2/pages` | POST |

### Critical: Version Increment

**Every page update MUST increment the version number**:

```bash
# 1. Get current version
curl -s GET ".../pages/{id}" | jq '.version.number'
# Returns: 5

# 2. Update with version + 1
PUT ".../pages/{id}"
{ "version": { "number": 6 } }
```

**Error if version not incremented**:
```
409 Conflict: "Version must be incremented on update. Current version is: 5"
```

### Reference Documentation

For complete Confluence API details, see:
- [confluence-page-api.md](../../reference/confluence-page-api.md)

### When to Use Confluence Sync

- Sync increment specs to Confluence for stakeholder visibility
- Publish living docs to Confluence wiki
- Sync task completion status to Confluence task lists
- Create Confluence pages for PRDs, HLDs, ADRs
