---
name: specweave-ado:create-workitem
description: Create Azure DevOps work item from SpecWeave increment
---

# Create ADO Work Item Command

**Usage**: `/specweave-ado:create-workitem <increment-id>`

**Purpose**: Create an Epic, Feature, or User Story in Azure DevOps from a SpecWeave increment

---

## Command Behavior

When user runs this command, Claude should:

### 1. Check Permission Gate (MANDATORY FIRST STEP)

**Before ANY ADO API calls**, check if write operations are allowed:

```typescript
// Read .specweave/config.json
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;

if (!canUpdateExternal) {
  // STOP HERE - Permission denied
  console.log(`
❌ Permission Denied

ADO write operations are disabled.
Setting: sync.settings.canUpdateExternalItems = false

To enable, update .specweave/config.json:
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true
    }
  }
}

Or run: jq '.sync.settings.canUpdateExternalItems = true' .specweave/config.json > tmp && mv tmp .specweave/config.json
`);
  return; // DO NOT proceed to create work item
}
```

If `canUpdateExternalItems` is `false`, display the error and **STOP**. Do not invoke the ADO Manager agent.

### 2. Resolve ADO Profile

Use the increment's stored profile or fall back to global activeProfile:

```typescript
// Load increment metadata
const metadata = JSON.parse(await fs.readFile(
  `.specweave/increments/${incrementId}/metadata.json`, 'utf-8'
));

// Check for increment-specific profile
let profileName = metadata?.external_sync?.ado?.profile;

// Fall back to global activeProfile
if (!profileName) {
  profileName = config?.sync?.activeProfile;
}

// Get profile config
const profileConfig = config?.sync?.profiles?.[profileName];
if (!profileConfig || profileConfig.provider !== 'ado') {
  console.log(`❌ Profile "${profileName}" not found or not an ADO profile`);
  return;
}

const { organization, project } = profileConfig.config;
```

### 3. Validate Prerequisites

- Check ADO plugin installed
- Check AZURE_DEVOPS_PAT environment variable set
- Check ADO profile has organization and project

### 4. Invoke ADO Manager Agent

```
Use Task tool with subagent_type: "specweave-ado:ado-manager:ado-manager"

Prompt: "Create ADO work item for increment {increment-id}.

IMPORTANT: Permission already verified (canUpdateExternalItems=true).
Use profile: {profileName} (org: {organization}, project: {project})

Steps:
1. Read .specweave/increments/{increment-id}/spec.md
2. Extract title and description
3. Use ADO organization: {organization}, project: {project}
4. Create work item via ADO REST API
5. Store work item ID in increment metadata.json
6. Store profile name in metadata.json external_sync.ado.profile
7. Display: Work Item ID, URL, and confirmation"
```

### 5. Display Result

```
✅ Created ADO Epic

Work Item: #12345
URL: https://dev.azure.com/{organization}/{project}/_workitems/edit/12345
Profile: {profileName}

Linked to increment: {increment-id}
```

---

## Permission Denied Output

If `canUpdateExternalItems` is false:

```
❌ Permission Denied: ADO Write Operations Disabled

Your configuration prevents creating/updating ADO work items.

Current setting:
  sync.settings.canUpdateExternalItems = false

To enable ADO writes:
1. Edit .specweave/config.json
2. Set sync.settings.canUpdateExternalItems to true
3. Re-run this command

This setting was configured during 'specweave init'.
```

---

## Example Usage

```
User: /specweave-ado:create-workitem 0005-payment-integration

# If permission granted:
Claude: Checking ADO permissions...
        ✓ canUpdateExternalItems: true

        Resolving ADO profile...
        ✓ Using profile: ado-my-project (from increment)
        ✓ Organization: acme-corp
        ✓ Project: My Project

        Creating work item...
        [Invokes ADO Manager Agent]

        ✅ Created ADO Epic #12345
        URL: https://dev.azure.com/acme-corp/My%20Project/_workitems/edit/12345

# If permission denied:
Claude: Checking ADO permissions...
        ❌ Permission Denied

        sync.settings.canUpdateExternalItems = false

        To enable: Edit .specweave/config.json and set canUpdateExternalItems to true
```

---

## Related

- `/specweave-ado:sync` - Sync progress to existing work item
- `/specweave-ado:status` - Check ADO sync status (read-only, always allowed)
- `/specweave-ado:close-workitem` - Close work item when complete
