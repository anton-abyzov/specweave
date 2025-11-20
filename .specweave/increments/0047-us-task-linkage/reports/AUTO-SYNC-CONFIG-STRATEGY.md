# Auto-Sync Configuration Strategy

**Date**: 2025-11-20
**Context**: Configuration design for automatic external tool synchronization on increment completion
**Related**: AUTO-SYNC-CASCADE-ANALYSIS.md

---

## Overview

This document defines the configuration strategy for controlling automatic synchronization to external tools (GitHub, JIRA, Azure DevOps) when increments complete via `/specweave:done`.

---

## Configuration Schema

### Complete .specweave/config.json Structure

```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "canUpdateStatus": true,
      "autoSyncOnCompletion": true
    },
    "github": {
      "enabled": true,
      "owner": "anton-abyzov",
      "repo": "specweave",
      "autoDetect": true
    },
    "jira": {
      "enabled": false,
      "domain": "company.atlassian.net",
      "projectKey": "SCRUM",
      "email": "${JIRA_EMAIL}",
      "apiToken": "${JIRA_API_TOKEN}"
    },
    "ado": {
      "enabled": false,
      "organization": "myorg",
      "project": "MyProject",
      "pat": "${ADO_PAT}"
    }
  }
}
```

---

## Field Definitions

### sync.settings (Master Controls)

#### `canUpdateExternalItems` (boolean)
**Purpose**: Master switch for ALL external sync operations (read, write, update)

**Default**: `false` (opt-in for safety)

**Behavior**:
- `true`: Allow SpecWeave to create/update external items (issues, epics, work items)
- `false`: Read-only mode (can pull from external tools, but never push)

**Use Cases**:
- Set to `false` for read-only workflows (import from GitHub/JIRA/ADO only)
- Set to `true` for bidirectional sync (SpecWeave ↔ External Tools)

**Introduced**: v0.24.0 (Three-Permission Architecture)

---

#### `canUpdateStatus` (boolean)
**Purpose**: Allow SpecWeave to update status fields in external tools

**Default**: `true` (if `canUpdateExternalItems` is true)

**Behavior**:
- `true`: Sync can update status (e.g., GitHub issue "open" → "closed", JIRA epic "In Progress" → "Done")
- `false`: Sync updates content (tasks, ACs) but NOT status

**Use Cases**:
- Set to `false` if external tool status should be manually controlled
- Set to `true` for full automation

**Introduced**: v0.24.0 (Three-Permission Architecture)

---

#### `autoSyncOnCompletion` (boolean)
**Purpose**: Enable/disable automatic sync when increment completes

**Default**: `true` (automatic sync enabled)

**Behavior**:
- `true`: `/specweave:done` automatically syncs to all enabled external tools
- `false`: `/specweave:done` completes increment but does NOT sync (manual only)

**Use Cases**:
- Set to `false` if you want to review changes before syncing
- Set to `true` for fully automated workflow

**Introduced**: v0.25.0 (this feature)

---

### sync.github (GitHub-Specific)

#### `enabled` (boolean)
**Purpose**: Enable/disable GitHub sync

**Default**: `true` (if GitHub repo detected)

**Behavior**:
- `true`: Include GitHub in automatic sync
- `false`: Skip GitHub sync (even if other tools enabled)

**Auto-Detection**: If `.git/config` contains `github.com` remote, defaults to `true`

---

#### `owner` (string)
**Purpose**: GitHub repository owner (user or organization)

**Default**: Auto-detected from `git remote get-url origin`

**Example**: `"anton-abyzov"` for https://github.com/anton-abyzov/specweave

---

#### `repo` (string)
**Purpose**: GitHub repository name

**Default**: Auto-detected from `git remote get-url origin`

**Example**: `"specweave"` for https://github.com/anton-abyzov/specweave

---

#### `autoDetect` (boolean)
**Purpose**: Automatically detect GitHub repo from git remote

**Default**: `true`

**Behavior**:
- `true`: Use `owner` and `repo` from git remote (overrides manual config)
- `false`: Use manually configured `owner` and `repo` values

**Use Cases**:
- Set to `false` if syncing to a different repo than the current project

---

### sync.jira (JIRA-Specific)

#### `enabled` (boolean)
**Purpose**: Enable/disable JIRA sync

**Default**: `false` (opt-in, requires credentials)

**Behavior**:
- `true`: Include JIRA in automatic sync
- `false`: Skip JIRA sync

---

#### `domain` (string)
**Purpose**: JIRA Cloud domain (e.g., `company.atlassian.net`)

**Required**: Yes (if `enabled` is true)

**Example**: `"mycompany.atlassian.net"`

---

#### `projectKey` (string)
**Purpose**: JIRA project key (e.g., `SCRUM`, `PROJ`)

**Required**: Yes (if `enabled` is true)

**Example**: `"SCRUM"` for project with key SCRUM-123

---

#### `email` (string)
**Purpose**: JIRA account email (for authentication)

**Default**: `"${JIRA_EMAIL}"` (reads from environment variable)

**Security**: Use environment variables, never hardcode in config

---

#### `apiToken` (string)
**Purpose**: JIRA API token (generated from Atlassian account settings)

**Default**: `"${JIRA_API_TOKEN}"` (reads from environment variable)

**Security**: MUST use environment variables, NEVER commit to git

**Generate**: https://id.atlassian.com/manage-profile/security/api-tokens

---

### sync.ado (Azure DevOps-Specific)

#### `enabled` (boolean)
**Purpose**: Enable/disable Azure DevOps sync

**Default**: `false` (opt-in, requires credentials)

**Behavior**:
- `true`: Include ADO in automatic sync
- `false`: Skip ADO sync

---

#### `organization` (string)
**Purpose**: Azure DevOps organization name

**Required**: Yes (if `enabled` is true)

**Example**: `"mycompany"` for https://dev.azure.com/mycompany

---

#### `project` (string)
**Purpose**: Azure DevOps project name

**Required**: Yes (if `enabled` is true)

**Example**: `"MyProject"` for work items in MyProject

---

#### `pat` (string)
**Purpose**: Personal Access Token (for authentication)

**Default**: `"${ADO_PAT}"` (reads from environment variable)

**Security**: MUST use environment variables, NEVER commit to git

**Generate**: https://dev.azure.com/{org}/_usersSettings/tokens

**Permissions Required**:
- Work Items: Read & Write
- Code: Read (for linking commits)

---

## Configuration Hierarchy

### Evaluation Order (Priority)

1. **Master Switch**: `sync.settings.canUpdateExternalItems`
   - If `false`, ALL external sync blocked (read-only mode)
   - If `true`, continue to next level

2. **Auto-Sync Switch**: `sync.settings.autoSyncOnCompletion`
   - If `false`, automatic sync blocked (manual commands still work)
   - If `true`, continue to next level

3. **Per-Tool Switch**: `sync.<tool>.enabled`
   - If `false`, tool-specific sync blocked
   - If `true`, sync to this tool

### Decision Tree

```
canUpdateExternalItems?
  ├─ NO  → Read-only mode (no sync)
  └─ YES → autoSyncOnCompletion?
          ├─ NO  → Manual sync only
          └─ YES → Check per-tool:
                  ├─ github.enabled? → Sync GitHub
                  ├─ jira.enabled?   → Sync JIRA
                  └─ ado.enabled?    → Sync ADO
```

---

## Configuration Scenarios

### Scenario 1: GitHub Only (Default)

**Use Case**: Solo developer, GitHub repo, no external tools

**Configuration**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": {
      "enabled": true,
      "autoDetect": true
    },
    "jira": { "enabled": false },
    "ado": { "enabled": false }
  }
}
```

**Behavior**:
- `/specweave:done` → Sync GitHub issue automatically
- JIRA/ADO ignored (disabled)

---

### Scenario 2: Full Automation (All Tools)

**Use Case**: Enterprise team, GitHub + JIRA + ADO all in use

**Configuration**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": {
      "enabled": true,
      "owner": "myorg",
      "repo": "project"
    },
    "jira": {
      "enabled": true,
      "domain": "mycompany.atlassian.net",
      "projectKey": "SCRUM"
    },
    "ado": {
      "enabled": true,
      "organization": "myorg",
      "project": "MyProject"
    }
  }
}
```

**Behavior**:
- `/specweave:done` → Sync GitHub + JIRA + ADO automatically
- All tools updated in parallel

---

### Scenario 3: Manual Sync Only

**Use Case**: Developer wants to review before syncing

**Configuration**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": false
    },
    "github": { "enabled": true }
  }
}
```

**Behavior**:
- `/specweave:done` → Completes increment, does NOT sync
- User manually runs `/specweave-github:sync 0047` when ready

---

### Scenario 4: Read-Only Mode

**Use Case**: Import issues from external tools, but never push back

**Configuration**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": false
    },
    "github": { "enabled": true }
  }
}
```

**Behavior**:
- Can import GitHub issues → SpecWeave increments
- `/specweave:done` → Does NOT sync back to GitHub
- Manual commands also blocked (read-only)

---

### Scenario 5: JIRA Only (No GitHub)

**Use Case**: Team uses JIRA for project management, GitHub just for code

**Configuration**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true
    },
    "github": { "enabled": false },
    "jira": {
      "enabled": true,
      "domain": "company.atlassian.net",
      "projectKey": "PROJ"
    }
  }
}
```

**Behavior**:
- `/specweave:done` → Sync JIRA epic, skip GitHub

---

## Environment Variables

### Required Environment Variables (Per Tool)

#### GitHub
```bash
# Optional (auto-detected from git remote)
GITHUB_OWNER="anton-abyzov"
GITHUB_REPO="specweave"

# Required for private repos or API rate limit increase
GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
```

#### JIRA
```bash
# Required
JIRA_EMAIL="user@company.com"
JIRA_API_TOKEN="ATATT3xFfGF0xxxxxxxxxxxxx"

# Optional (can be in config.json)
JIRA_DOMAIN="company.atlassian.net"
JIRA_PROJECT_KEY="SCRUM"
```

#### Azure DevOps
```bash
# Required
ADO_PAT="xxxxxxxxxxxxx"

# Optional (can be in config.json)
ADO_ORGANIZATION="myorg"
ADO_PROJECT="MyProject"
```

---

## Configuration Validation

### Validation Rules

1. **Master Switch Validation**:
   - If `canUpdateExternalItems` is `false`, ignore all tool configs
   - No error if tools configured but master switch off (expected)

2. **Tool-Specific Validation**:
   - If `<tool>.enabled` is `true`, check required fields:
     - GitHub: `owner`, `repo` (can auto-detect)
     - JIRA: `domain`, `projectKey`, `email`, `apiToken`
     - ADO: `organization`, `project`, `pat`
   - Error if required field missing

3. **Credential Validation**:
   - Check environment variables exist before sync
   - Error if `${JIRA_API_TOKEN}` not set but JIRA enabled
   - Error if `${ADO_PAT}` not set but ADO enabled

### Validation Timing

- **On Init**: `specweave init .` validates config schema
- **On Sync**: `SyncCoordinator` validates credentials exist
- **On Completion**: `/specweave:done` checks each tool before syncing

---

## Migration Strategy

### For Existing Projects (v0.24.x → v0.25.0)

**Goal**: Preserve existing behavior, no breaking changes

**Migration Script**: `scripts/migrate-auto-sync-config.ts`

```typescript
async function migrateConfig(projectRoot: string) {
  const configPath = path.join(projectRoot, '.specweave/config.json');
  const config = await fs.readJson(configPath);

  // Add new fields with defaults
  config.sync = config.sync || {};
  config.sync.settings = config.sync.settings || {};

  // Default: Auto-sync OFF (opt-in for safety)
  config.sync.settings.autoSyncOnCompletion ??= false;

  // Per-tool enabled flags (default: false unless already configured)
  config.sync.github = config.sync.github || {};
  config.sync.github.enabled ??= !!config.sync.github.owner;

  config.sync.jira = config.sync.jira || {};
  config.sync.jira.enabled ??= false;

  config.sync.ado = config.sync.ado || {};
  config.sync.ado.enabled ??= false;

  await fs.writeJson(configPath, config, { spaces: 2 });
  console.log('✅ Config migrated to v0.25.0');
}
```

**Run Migration**:
```bash
npx tsx scripts/migrate-auto-sync-config.ts
```

---

## User Onboarding

### Interactive Setup (specweave init)

**Step 1**: Detect external tools
```
🔍 Detecting external tools...

Found:
  ✅ GitHub repository (github.com/anton-abyzov/specweave)
  ❓ JIRA integration (not configured)
  ❓ Azure DevOps integration (not configured)
```

**Step 2**: Configure auto-sync
```
🔄 Auto-sync on increment completion?

When increments complete (/specweave:done), automatically sync to external tools?

  ○ Yes, sync automatically (recommended)
  ● No, I'll sync manually

Tip: You can change this later in .specweave/config.json
```

**Step 3**: Configure per-tool
```
✅ GitHub sync enabled (auto-detected)

🔧 Configure JIRA?
  ○ Yes, use JIRA
  ● No, skip for now

🔧 Configure Azure DevOps?
  ○ Yes, use ADO
  ● No, skip for now
```

**Step 4**: Save config
```
✅ Configuration saved to .specweave/config.json

Auto-sync: Enabled
  ✅ GitHub: ON
  ❌ JIRA: OFF
  ❌ Azure DevOps: OFF

To enable JIRA/ADO later, run:
  /specweave:config sync
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Auto-Sync Not Working

**Symptom**: `/specweave:done` completes but external tools not updated

**Check**:
1. `config.sync.settings.autoSyncOnCompletion` is `true`?
2. `config.sync.settings.canUpdateExternalItems` is `true`?
3. `config.sync.<tool>.enabled` is `true`?
4. Environment variables set correctly?

**Debug**:
```bash
# Check config
cat .specweave/config.json | jq '.sync'

# Check environment variables
echo $GITHUB_TOKEN
echo $JIRA_API_TOKEN
echo $ADO_PAT
```

---

#### Issue 2: GitHub Sync Fails (Auto-Detect)

**Symptom**: "GitHub repository not configured"

**Cause**: `git remote` doesn't have GitHub URL

**Fix**:
```json
{
  "sync": {
    "github": {
      "enabled": true,
      "autoDetect": false,
      "owner": "anton-abyzov",
      "repo": "specweave"
    }
  }
}
```

---

#### Issue 3: JIRA API Token Invalid

**Symptom**: "JIRA authentication failed"

**Check**:
1. Token generated from correct account? (https://id.atlassian.com/manage-profile/security/api-tokens)
2. Environment variable set? (`echo $JIRA_API_TOKEN`)
3. Email matches Atlassian account? (`echo $JIRA_EMAIL`)

**Fix**: Regenerate token, update environment variable

---

## Next Steps

1. **Implementation**: Use this config schema in `SyncCoordinator`
2. **Validation**: Implement config validation in `src/utils/config-validator.ts`
3. **Migration**: Create migration script for existing projects
4. **Documentation**: Update user guide with configuration examples
5. **Testing**: Test all configuration scenarios
6. **Release**: Ship as v0.25.0 with clear migration guide
