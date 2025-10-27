---
name: ado-sync
description: Sync SpecWeave increments with Azure DevOps Epics/Features/User Stories. Activates for ADO sync, Azure DevOps sync, create ADO work item, import from ADO. Coordinates with specweave-ado-mapper agent.
allowed-tools: Read, Write, Edit, Task, Bash
---

# ADO Sync Skill

Coordinates Azure DevOps synchronization by delegating to `specweave-ado-mapper` agent.

## Responsibilities

1. Detect sync requests (export, import, bidirectional)
2. Validate prerequisites (ADO PAT, Area Path, Iteration)
3. Invoke `specweave-ado-mapper` agent
4. Handle errors gracefully

---

## ⚠️ CRITICAL: Secrets Required (MANDATORY CHECK)

**BEFORE attempting Azure DevOps sync, CHECK for ADO credentials.**

### Step 1: Check If Credentials Exist

```bash
# Check .env file for required credentials
if [ -f .env ] && grep -q "AZURE_DEVOPS_PAT" .env; then
  echo "✅ Azure DevOps PAT found"
else
  # PAT NOT found - STOP and prompt user
fi
```

### Step 2: If Credentials Missing, STOP and Show This Message

```
🔐 **Azure DevOps Personal Access Token (PAT) Required**

I need your Azure DevOps Personal Access Token to sync with ADO.

**How to get it**:
1. Go to: https://dev.azure.com/{organization}/_usersSettings/tokens
2. Or: User Settings (top right) → Personal Access Tokens
3. Click "+ New Token"
4. Give it a name (e.g., "specweave-sync")
5. Set expiration (recommend: 90 days, then rotate)
6. Select scopes:
   ✅ **Work Items** (Read, Write, & Manage)
   ✅ **Code** (Read) - if syncing commits/PRs
   ✅ **Project and Team** (Read)
7. Click "Create"
8. **Copy the token immediately** (you can't see it again!)

**Where I'll save it**:
- File: `.env` (gitignored, secure)
- Format:
  ```
  AZURE_DEVOPS_PAT=your-ado-pat-here-52-chars-base64
  AZURE_DEVOPS_ORG=your-organization-name
  AZURE_DEVOPS_PROJECT=your-project-name
  ```

**Security**:
✅ .env is in .gitignore (never committed to git)
✅ Token is 52 characters, base64-encoded
✅ Stored locally only (not in source code)

Please provide:
1. Your Azure DevOps PAT:
2. Your organization name (e.g., "mycompany"):
3. Your project name (e.g., "MyProject"):
```

### Step 3: Validate Credentials Format

```bash
# Validate PAT format (52 chars, base64)
if [ ${#AZURE_DEVOPS_PAT} -ne 52 ]; then
  echo "⚠️  Warning: PAT length unexpected"
  echo "Expected: 52 characters (base64-encoded)"
  echo "Got: ${#AZURE_DEVOPS_PAT} characters"
  echo "This might not be a valid Azure DevOps PAT"
fi

# Validate organization name (no special chars)
if [[ ! "$AZURE_DEVOPS_ORG" =~ ^[a-zA-Z0-9-]+$ ]]; then
  echo "⚠️  Warning: Organization name contains unexpected characters"
  echo "Expected: alphanumeric and hyphens only"
  echo "Got: $AZURE_DEVOPS_ORG"
fi

# Validate project name (no special chars except spaces)
if [ -z "$AZURE_DEVOPS_PROJECT" ]; then
  echo "❌ Error: Project name is empty"
  exit 1
fi
```

### Step 4: Save Credentials Securely

```bash
# Save to .env
cat >> .env << EOF
AZURE_DEVOPS_PAT=$AZURE_DEVOPS_PAT
AZURE_DEVOPS_ORG=$AZURE_DEVOPS_ORG
AZURE_DEVOPS_PROJECT=$AZURE_DEVOPS_PROJECT
EOF

# Ensure .env is gitignored
if ! grep -q "^\\.env$" .gitignore; then
  echo ".env" >> .gitignore
fi

# Create .env.example for team
cat > .env.example << 'EOF'
# Azure DevOps Personal Access Token
# Get from: https://dev.azure.com/{org}/_usersSettings/tokens
# Scopes: Work Items (Read, Write, Manage), Code (Read), Project (Read)
AZURE_DEVOPS_PAT=your-ado-pat-52-chars-base64
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PROJECT=your-project-name
EOF

echo "✅ Credentials saved to .env (gitignored)"
echo "✅ Created .env.example for team (commit this)"
```

### Step 5: Use Credentials in Sync

```bash
# Export for Azure DevOps API calls
export AZURE_DEVOPS_PAT=$(grep AZURE_DEVOPS_PAT .env | cut -d '=' -f2)
export AZURE_DEVOPS_ORG=$(grep AZURE_DEVOPS_ORG .env | cut -d '=' -f2)
export AZURE_DEVOPS_PROJECT=$(grep AZURE_DEVOPS_PROJECT .env | cut -d '=' -f2)

# Create Base64 Basic Auth header (PAT as username, empty password)
AUTH=$(echo -n ":$AZURE_DEVOPS_PAT" | base64)

# Use in Azure DevOps REST API calls
curl -H "Authorization: Basic $AUTH" \
     -H "Content-Type: application/json" \
     https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_apis/wit/workitems/12345?api-version=7.0
```

### Step 6: Never Log Secrets

```bash
# ❌ WRONG - Logs secret
echo "Using PAT: $AZURE_DEVOPS_PAT"

# ✅ CORRECT - Masks secret
echo "Using Azure DevOps credentials (PAT present: ✅, org: $AZURE_DEVOPS_ORG, project: $AZURE_DEVOPS_PROJECT)"
```

### Step 7: Error Handling

```bash
# If API call fails with 401 Unauthorized
if [ $? -eq 401 ]; then
  echo "❌ Azure DevOps PAT invalid or expired"
  echo ""
  echo "Possible causes:"
  echo "1. PAT expired (check expiration date)"
  echo "2. PAT revoked"
  echo "3. Organization name incorrect (check: $AZURE_DEVOPS_ORG)"
  echo "4. Insufficient scopes (need: Work Items Read/Write/Manage)"
  echo ""
  echo "Please verify or regenerate PAT:"
  echo "https://dev.azure.com/$AZURE_DEVOPS_ORG/_usersSettings/tokens"
fi

# If API call fails with 403 Forbidden
if [ $? -eq 403 ]; then
  echo "❌ Azure DevOps permission denied"
  echo ""
  echo "Your account lacks permissions for this operation."
  echo "Required permissions:"
  echo "- View work items in this project"
  echo "- Edit work items in this project"
  echo "- Manage work item tags"
  echo "- View project-level information"
  echo ""
  echo "Contact your Azure DevOps administrator."
fi

# If API call fails with 404 Not Found
if [ $? -eq 404 ]; then
  echo "❌ Azure DevOps project not found"
  echo ""
  echo "Check your configuration:"
  echo "- Organization: $AZURE_DEVOPS_ORG"
  echo "- Project: $AZURE_DEVOPS_PROJECT"
  echo ""
  echo "Verify the project exists:"
  echo "https://dev.azure.com/$AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT"
fi
```

### Step 8: Production Recommendations

**For production deployments, use Service Principals or Managed Identities**:

**Why Service Principals?**
- ✅ Not tied to individual user accounts
- ✅ Can be scoped to specific projects/resources
- ✅ Easier to rotate and manage
- ✅ Better audit trail

**How to set up Service Principal**:
1. Go to: https://portal.azure.com/
2. Navigate to: Azure Active Directory → App Registrations
3. Create new registration
4. Add to Azure DevOps organization
5. Grant appropriate permissions
6. Use client credentials flow instead of PAT

**PAT Best Practices**:
- ✅ Set expiration to 90 days maximum
- ✅ Use minimum required scopes
- ✅ Rotate regularly (set calendar reminder)
- ✅ Revoke immediately when team member leaves
- ✅ Create separate PATs for different purposes (dev, prod, CI/CD)

**Alternative: Azure CLI**:
```bash
# Authenticate once with Azure CLI
az login

# Azure DevOps commands will use your Azure credentials
az devops configure --defaults organization=https://dev.azure.com/$AZURE_DEVOPS_ORG project=$AZURE_DEVOPS_PROJECT

# No PAT needed if Azure CLI is configured
az boards work-item show --id 12345
```

---

## Usage

**Export**: `/sync-ado export 0001`
**Import**: `/sync-ado import 12345`
**Sync**: `/sync-ado sync 0001`

All conversion logic is handled by the `specweave-ado-mapper` agent.
