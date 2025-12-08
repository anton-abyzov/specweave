---
name: specweave-jira:create
description: Create JIRA issue from SpecWeave increment
---

# Create JIRA Issue Command

**Usage**: `/specweave-jira:create <increment-id>`

**Purpose**: Create an Epic or Story in JIRA from a SpecWeave increment

---

## Command Behavior

When user runs this command, Claude should:

### 1. Check Permission Gate (MANDATORY FIRST STEP)

**Before ANY JIRA API calls**, check if write operations are allowed:

```typescript
// Read .specweave/config.json
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;

if (!canUpdateExternal) {
  // STOP HERE - Permission denied
  console.log(`
❌ Permission Denied

JIRA write operations are disabled.
Setting: sync.settings.canUpdateExternalItems = false

To enable, update .specweave/config.json:
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true
    }
  }
}
`);
  return; // DO NOT proceed to create issue
}
```

If `canUpdateExternalItems` is `false`, display the error and **STOP**. Do not invoke the JIRA Manager agent.

### 2. Resolve JIRA Profile

Use the increment's stored profile or fall back to global defaultProfile/activeProfile:

```typescript
// Load increment metadata
const metadata = JSON.parse(await fs.readFile(
  `.specweave/increments/${incrementId}/metadata.json`, 'utf-8'
));

// Check for increment-specific profile
let profileName = metadata?.external_sync?.jira?.profile;

// Fall back to global defaultProfile (v0.31.0+) or activeProfile (legacy)
if (!profileName) {
  profileName = config?.sync?.defaultProfile ?? config?.sync?.activeProfile;
}

// Get profile config
const profileConfig = config?.sync?.profiles?.[profileName];
if (!profileConfig || profileConfig.provider !== 'jira') {
  console.log(`❌ Profile "${profileName}" not found or not a JIRA profile`);
  return;
}

const { domain, projectKey } = profileConfig.config;
```

### 3. Validate Prerequisites

- Check JIRA plugin installed
- Check JIRA_API_TOKEN and JIRA_EMAIL environment variables set
- Check JIRA profile has domain and projectKey

### 4. Invoke JIRA Manager Agent

```
Use Task tool with subagent_type: "specweave-jira:jira-manager:jira-manager"

Prompt: "Create JIRA issue for increment {increment-id}.

IMPORTANT: Permission already verified (canUpdateExternalItems=true).
Use profile: {profileName} (domain: {domain}, project: {projectKey})

Steps:
1. Read .specweave/increments/{increment-id}/spec.md
2. Extract title and description
3. Use JIRA domain: {domain}, project key: {projectKey}
4. Create Epic via JIRA REST API (POST /rest/api/3/issue)
5. Store issue key in increment metadata.json external_sync.jira.issueKey
6. Store profile name in metadata.json external_sync.jira.profile
7. Display: Issue Key, URL, and confirmation"
```

### 5. Display Result

```
✅ Created JIRA Epic

Issue: PROJ-123
URL: https://{domain}/browse/PROJ-123
Profile: {profileName}

Linked to increment: {increment-id}
```

---

## Permission Denied Output

If `canUpdateExternalItems` is false:

```
❌ Permission Denied: JIRA Write Operations Disabled

Your configuration prevents creating/updating JIRA issues.

Current setting:
  sync.settings.canUpdateExternalItems = false

To enable JIRA writes:
1. Edit .specweave/config.json
2. Set sync.settings.canUpdateExternalItems to true
3. Re-run this command

This setting was configured during 'specweave init'.
```

---

## Example Usage

```
User: /specweave-jira:create 0005-payment-integration

# If permission granted:
Claude: Checking JIRA permissions...
        ✓ canUpdateExternalItems: true

        Resolving JIRA profile...
        ✓ Using profile: jira-my-project (from increment)
        ✓ Domain: company.atlassian.net
        ✓ Project: MYPROJ

        Creating issue...
        [Invokes JIRA Manager Agent]

        ✅ Created JIRA Epic MYPROJ-123
        URL: https://company.atlassian.net/browse/MYPROJ-123

# If permission denied:
Claude: Checking JIRA permissions...
        ❌ Permission Denied

        sync.settings.canUpdateExternalItems = false

        To enable: Edit .specweave/config.json and set canUpdateExternalItems to true
```

---

## Metadata Updates

After successful creation, the increment's `metadata.json` will be updated:

```json
{
  "external_sync": {
    "jira": {
      "profile": "jira-my-project",
      "issueKey": "MYPROJ-123",
      "issueUrl": "https://company.atlassian.net/browse/MYPROJ-123",
      "lastSyncedAt": "2025-12-07T04:30:00Z"
    }
  }
}
```

---

## Related

| Command | Purpose |
|---------|---------|
| `/specweave-jira:pull` | Pull changes from JIRA |
| `/specweave-jira:push` | Push progress to JIRA |
| `/specweave-jira:sync` | Two-way sync |
| `/specweave-jira:status` | Check sync status |
| `/specweave-jira:close` | Close issue when complete |
