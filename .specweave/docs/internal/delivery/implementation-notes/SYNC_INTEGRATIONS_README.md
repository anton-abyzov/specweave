# ADO and Jira Sync Integrations

Comprehensive integration system for bidirectional synchronization between SpecWeave and external project management tools (Azure DevOps and Jira).

## 🎯 Features

### Azure DevOps (ADO) Sync
- ✅ List work items with filtering (sprint, status, type, tags)
- ✅ Create work items (Epic, Feature, User Story, Task)
- ✅ Update work items (status, priority, acceptance criteria)
- ✅ Get sprint/iteration information
- ✅ Map ADO ↔ SpecWeave structure
- ✅ Secure credential management
- ✅ Comprehensive test suite

### Jira Sync
- ✅ Search issues with JQL filtering (sprint, status, labels)
- ✅ Create issues (Epic, Story, Sub-task)
- ✅ Update issues (status, priority, description)
- ✅ Get sprint information
- ✅ Map Jira ↔ SpecWeave structure
- ✅ Secure credential management
- ✅ Comprehensive test suite

## 🔐 Security - API Key Management

### Step 1: Get Your API Credentials

#### Azure DevOps Personal Access Token (PAT)

1. Go to: `https://dev.azure.com/{organization}/_usersSettings/tokens`
2. Click "+ New Token"
3. Configure:
   - Name: `specweave-sync`
   - Expiration: 90 days (recommended)
   - Scopes:
     - ✅ Work Items (Read, Write, & Manage)
     - ✅ Code (Read) - optional
     - ✅ Project and Team (Read)
4. Click "Create" and **copy the token immediately**

#### Jira API Token

1. Go to: `https://id.atlassian.com/manage-profile/security/api-tokens`
2. Click "Create API token"
3. Label: `specweave-sync`
4. Click "Create" and **copy the token immediately**

### Step 2: Configure Credentials

#### Option 1: Using .env File (Recommended)

Create a `.env` file in your project root:

```bash
# Azure DevOps
AZURE_DEVOPS_PAT=your-52-char-base64-token
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PROJECT=your-project-name

# Jira
JIRA_API_TOKEN=your-jira-api-token
JIRA_EMAIL=your-email@example.com
JIRA_DOMAIN=your-company.atlassian.net
```

**Important**: The `.env` file is automatically added to `.gitignore` and never committed to source control.

#### Option 2: Environment Variables

Export environment variables:

```bash
export AZURE_DEVOPS_PAT="your-token"
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"

export JIRA_API_TOKEN="your-token"
export JIRA_EMAIL="your-email@example.com"
export JIRA_DOMAIN="your-company.atlassian.net"
```

### Step 3: Verify Setup

```bash
# Run credential verification
npm run test:integration:ado
npm run test:integration:jira
```

## 🧪 Testing

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Specific Test Suites

```bash
# ADO only
npm run test:integration:ado

# Jira only
npm run test:integration:jira
```

### Test Coverage

#### ADO Test Suite (8 tests)
1. ✅ Check ADO Credentials
2. ✅ Test ADO Connection
3. ✅ List Work Items (All Types)
4. ✅ List Work Items with Sprint Filter
5. ✅ Create New User Story
6. ✅ Update User Story
7. ✅ Map ADO Work Item to SpecWeave Structure
8. ✅ Cleanup Test Data

#### Jira Test Suite (9 tests)
1. ✅ Check Jira Credentials
2. ✅ Test Jira Connection
3. ✅ Get Accessible Projects
4. ✅ List Issues (All Types)
5. ✅ List Issues with Sprint Filter
6. ✅ Create New Story
7. ✅ Update Story
8. ✅ Map Jira Issue to SpecWeave Structure
9. ✅ Cleanup Test Data

### Test Results

Test results are automatically saved to `test-results/` folder:
- `test-results/ado-sync-{timestamp}.json`
- `test-results/jira-sync-{timestamp}.json`

Example report structure:
```json
{
  "suite": "Azure DevOps Sync Integration Tests",
  "timestamp": "2025-10-28T12:00:00.000Z",
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 0,
    "skipped": 1
  },
  "results": [
    {
      "name": "Test 1: Check ADO Credentials",
      "status": "PASS",
      "duration": 45,
      "message": "Credentials found and validated"
    }
  ]
}
```

## 📖 Usage Examples

### Azure DevOps Client

```typescript
import { AdoClient } from './src/integrations/ado/ado-client';

const client = new AdoClient();

// Test connection
await client.testConnection();

// List work items
const workItems = await client.listWorkItems({
  workItemType: ['User Story', 'Task'],
  state: ['Active', 'New'],
  iteration: 'Sprint 24',
  top: 10
});

// Create user story
const story = await client.createWorkItem({
  workItemType: 'User Story',
  title: 'Implement user authentication',
  description: 'Add OAuth 2.0 authentication',
  acceptanceCriteria: '- [ ] User can login\n- [ ] Token is secure',
  priority: 1,
  state: 'New',
  tags: ['authentication', 'security']
});

// Update work item
await client.updateWorkItem({
  id: story.id,
  state: 'Active',
  priority: 1
});

// Get current sprint
const currentSprint = await client.getCurrentIteration();
```

### Jira Client

```typescript
import { JiraClient } from './src/integrations/jira/jira-client';

const client = new JiraClient();

// Test connection
await client.testConnection();

// Search issues
const issues = await client.searchIssues({
  project: 'PROJ',
  issueType: ['Story', 'Task'],
  status: ['In Progress', 'To Do'],
  sprint: 'current',
  maxResults: 10
});

// Create story
const story = await client.createIssue({
  issueType: 'Story',
  summary: 'Implement user authentication',
  description: 'Add OAuth 2.0 authentication',
  priority: 'High',
  labels: ['authentication', 'security']
}, 'PROJ');

// Update issue
await client.updateIssue({
  key: story.key,
  status: 'In Progress',
  priority: 'Highest'
});

// Get projects
const projects = await client.getProjects();
```

## 🗺️ Mapping Specifications

### ADO ↔ SpecWeave Mapping

| SpecWeave | ADO | Notes |
|-----------|-----|-------|
| Increment | Epic | `[Increment 0001] Title` format |
| User Story | Feature or User Story | Based on size (>5 criteria = Feature) |
| Task | Task | Linked to parent Feature/Story |
| Priority P1 | Priority 1 | Critical |
| Priority P2 | Priority 2 | Important |
| Priority P3 | Priority 3 | Nice to have |
| Status: planned | State: New | Not started |
| Status: in-progress | State: Active | Active work |
| Status: completed | State: Closed | Finished |

### Jira ↔ SpecWeave Mapping

| SpecWeave | Jira | Notes |
|-----------|------|-------|
| Increment | Epic | `[Increment 0001] Title` format |
| User Story | Story | Linked to Epic |
| Task | Sub-task | Linked to parent Story |
| Priority P1 | Priority: Highest | Critical |
| Priority P2 | Priority: High | Important |
| Priority P3 | Priority: Medium | Nice to have |
| Status: planned | Status: To Do | Not started |
| Status: in-progress | Status: In Progress | Active work |
| Status: completed | Status: Done | Finished |

## 🔄 Bidirectional Sync (Coming Soon)

### Sync Workflow

1. **Detect Changes**
   - SpecWeave: Modified files since last sync
   - ADO/Jira: Updated work items since last sync

2. **Conflict Detection**
   - Same field changed in both systems
   - Status mismatches
   - Priority changes

3. **Conflict Resolution**
   - Present conflicts to user
   - Offer merge options
   - Never auto-resolve

4. **Apply Sync**
   - Update SpecWeave → ADO/Jira
   - Update ADO/Jira → SpecWeave
   - Log all changes

5. **Update Metadata**
   - Timestamp last sync
   - Record sync direction
   - Track conflicts resolved

## 🏗️ Architecture

### Components

```
src/
├── core/
│   └── credentials-manager.ts    # Secure credential loader
├── integrations/
│   ├── ado/
│   │   ├── ado-client.ts         # Azure DevOps API client
│   │   └── ado-mapper.ts         # ADO ↔ SpecWeave mapper (TODO)
│   └── jira/
│       ├── jira-client.ts        # Jira API client
│       └── jira-mapper.ts        # Jira ↔ SpecWeave mapper (TODO)
tests/
└── integration/
    ├── ado-sync.test.ts          # ADO integration tests
    └── jira-sync.test.ts         # Jira integration tests
```

### MCP Server Support

Both integrations support **Model Context Protocol (MCP)** servers:

- **Azure DevOps**: microsoft/azure-devops-mcp (official)
- **Jira**: Atlassian Remote MCP Server (official)

When MCP servers are detected, they will be used as the primary integration method. Otherwise, the system falls back to direct REST API calls.

## 🐛 Troubleshooting

### ADO Connection Issues

#### Error: 401 Unauthorized
```
Check:
1. PAT expired? Regenerate at: https://dev.azure.com/{org}/_usersSettings/tokens
2. Organization name correct? (alphanumeric + hyphens only)
3. Scopes sufficient? Need: Work Items (Read, Write, Manage)
```

#### Error: 403 Forbidden
```
Your account lacks permissions.
Contact your Azure DevOps administrator to grant:
- View work items in this project
- Edit work items in this project
- Manage work item tags
```

### Jira Connection Issues

#### Error: 401 Unauthorized
```
Check:
1. API token expired/revoked? Regenerate at: https://id.atlassian.com/manage-profile/security/api-tokens
2. Email correct?
3. Domain correct? (e.g., company.atlassian.net)
```

#### Error: 403 Forbidden
```
Your account lacks permissions.
Required permissions:
- Browse projects
- Create issues
- Edit issues
- Administer projects (for Epic creation)
```

### Credential Debugging

```typescript
import { credentialsManager } from './src/core/credentials-manager';

// Check if credentials exist (never logs secrets)
console.log(credentialsManager.getMaskedAdoInfo());
console.log(credentialsManager.getMaskedJiraInfo());

// Example output:
// ADO credentials:
//   PAT: your...code (52 chars)
//   Organization: mycompany
//   Project: MyProject
```

## 📝 Best Practices

### Security

1. **Never commit credentials** - Use .env (automatically gitignored)
2. **Rotate tokens regularly** - Set 90-day expiration
3. **Use minimum scopes** - Only grant necessary permissions
4. **Monitor access logs** - Review API usage in ADO/Jira

### Production Deployment

#### Azure DevOps
- Use **Service Principals** instead of PAT
- Configure **Managed Identities** in Azure
- Set up **OAuth 2.0 flow** for better security

#### Jira
- Use **OAuth 2.0** instead of API tokens
- Configure **App-specific credentials**
- Enable **IP allowlisting** for additional security

### Testing

1. **Run tests before deployment** - Validate integration
2. **Check test results** - Review `test-results/` folder
3. **Monitor cleanup** - Ensure test data is removed
4. **Update credentials** - Use separate tokens for test/prod

## 🚀 Next Steps

1. ✅ **Setup Complete** - Credentials configured and tested
2. 🔜 **Implement Mappers** - Full bidirectional conversion
3. 🔜 **Add Sync Command** - `/sync-ado` and `/sync-jira` commands
4. 🔜 **Webhook Support** - Real-time bidirectional sync
5. 🔜 **Conflict UI** - Interactive conflict resolution

## 📚 References

- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp)
- [Atlassian Remote MCP Server](https://www.atlassian.com/platform/remote-mcp-server)
- [SpecWeave Documentation](../../README.md)

---

**Made with ❤️ by SpecWeave** | Last updated: 2025-10-28
