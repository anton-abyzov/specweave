---
name: ado-resource-validator
description: Validates Azure DevOps projects and resources exist, creates missing resources automatically. Smart enough to prompt user to select existing or create new projects. Supports multiple projects for project-per-team strategy, area paths for area-path-based strategy, and teams for team-based strategy. Activates for ado setup, ado validation, ado configuration, missing ado project, azure devops .env setup.
allowed-tools: Read, Bash, Write, Edit
---

# Azure DevOps Resource Validator Skill

**Purpose**: Validate and auto-create Azure DevOps projects and resources, ensuring .env configuration is correct.

**Auto-Activation**: Triggers when Azure DevOps setup or validation is needed.

## What This Skill Does

This skill ensures your Azure DevOps configuration in `.env` is valid and all resources exist. It's **smart enough** to:

1. **Validate Azure DevOps projects** - Check if projects exist (multiple for project-per-team)
2. **Prompt for action** - Select existing project or create new one
3. **Validate area paths** - Check if area paths exist (for area-path-based strategy)
4. **Create missing area paths** - Auto-create area paths if missing
5. **Validate teams** - Check if teams exist (for team-based strategy)
6. **Update .env with correct values** - Ensure configuration is valid

## When This Skill Activates

✅ **Automatically activates when**:
- You set up Azure DevOps integration for the first time
- You run `/specweave-ado:sync` and resources are missing
- Your `.env` has invalid Azure DevOps configuration
- You mention "ado setup" or "azure devops validation"

## Azure DevOps Configuration Structure

### Required .env Variables

```bash
AZURE_DEVOPS_PAT=your_token_here
AZURE_DEVOPS_ORG=yourorganization
AZURE_DEVOPS_STRATEGY=project-per-team  # or area-path-based, team-based
```

### Strategy-Specific Variables

**Strategy 1: Project-per-team** (Multiple Projects)
```bash
AZURE_DEVOPS_STRATEGY=project-per-team
AZURE_DEVOPS_PROJECTS=WebApp,MobileApp,Platform
```
→ Validates that WebApp, MobileApp, and Platform projects exist

**Strategy 2: Area-path-based** (One Project, Multiple Area Paths)
```bash
AZURE_DEVOPS_STRATEGY=area-path-based
AZURE_DEVOPS_PROJECT=MainProduct
AZURE_DEVOPS_AREA_PATHS=Frontend,Backend,Mobile
```
→ Validates MainProduct project exists
→ Creates area paths if missing: MainProduct\Frontend, MainProduct\Backend, MainProduct\Mobile

**Strategy 3: Team-based** (One Project, Multiple Teams)
```bash
AZURE_DEVOPS_STRATEGY=team-based
AZURE_DEVOPS_PROJECT=MainProduct
AZURE_DEVOPS_TEAMS=Alpha Team,Beta Team,Gamma Team
```
→ Validates MainProduct project exists
→ Creates teams if missing: Alpha Team, Beta Team, Gamma Team

## Validation Flow

### Step 1: Strategy Detection

**Read .env and detect strategy**:
```bash
AZURE_DEVOPS_STRATEGY=project-per-team
```

**Result**:
```
🔍 Detected strategy: Project-per-team
   Projects to validate: WebApp, MobileApp, Platform
```

### Step 2: Project Validation (Project-per-team)

**Check if projects exist**:
```bash
# API calls to Azure DevOps
GET https://dev.azure.com/{org}/_apis/projects/WebApp
GET https://dev.azure.com/{org}/_apis/projects/MobileApp
GET https://dev.azure.com/{org}/_apis/projects/Platform
```

**If all projects exist**:
```
✅ All projects validated:
   • WebApp (ID: abcd1234)
   • MobileApp (ID: efgh5678)
   • Platform (ID: ijkl9012)
```

**If some projects don't exist**:
```
⚠️ Projects not found:
   ✅ WebApp (exists)
   ❌ MobileApp (not found)
   ❌ Platform (not found)

What would you like to do?
1. Create missing projects
2. Select existing projects
3. Fix project names manually
4. Cancel

Your choice [1]:
```

**Option 1: Create Missing Projects**:
```
📦 Creating Azure DevOps projects...

Creating project: MobileApp...
✅ Project created: MobileApp (ID: mnop3456)

Creating project: Platform...
✅ Project created: Platform (ID: qrst7890)

✅ All projects now exist!
```

**Option 2: Select Existing Projects**:
```
Available projects in organization:
1. WebApp
2. ApiGateway
3. AuthService
4. NotificationService
5. DataPipeline

Select projects (comma-separated numbers) [2,3]:

✅ Updated .env: AZURE_DEVOPS_PROJECTS=WebApp,ApiGateway,AuthService
```

### Step 3: Area Path Validation (Area-path-based)

**Scenario**: One project with area paths
```bash
AZURE_DEVOPS_STRATEGY=area-path-based
AZURE_DEVOPS_PROJECT=MainProduct
AZURE_DEVOPS_AREA_PATHS=Frontend,Backend,Mobile,QA
```

**Validation**:
```
Checking project: MainProduct...
✅ Project "MainProduct" exists

Checking area paths...
  ✅ MainProduct\Frontend (exists)
  ✅ MainProduct\Backend (exists)
  ⚠️ MainProduct\Mobile (not found)
  ⚠️ MainProduct\QA (not found)

📦 Creating missing area paths...
✅ Created: MainProduct\Mobile
✅ Created: MainProduct\QA

✅ All area paths validated/created successfully
```

### Step 4: Team Validation (Team-based)

**Scenario**: One project with multiple teams
```bash
AZURE_DEVOPS_STRATEGY=team-based
AZURE_DEVOPS_PROJECT=MainProduct
AZURE_DEVOPS_TEAMS=Alpha Team,Beta Team,Gamma Team
```

**Validation**:
```
Checking project: MainProduct...
✅ Project "MainProduct" exists

Checking teams...
  ✅ Alpha Team (exists)
  ⚠️ Beta Team (not found)
  ⚠️ Gamma Team (not found)

📦 Creating missing teams...
✅ Created: Beta Team
✅ Created: Gamma Team

✅ All teams validated/created successfully
```

## Usage Examples

### Example 1: Fresh Azure DevOps Setup (Project-per-team)

**Scenario**: New setup with multiple projects for different teams

**Action**: Run `/specweave-ado:sync`

**What Happens**:
```bash
🔍 Validating Azure DevOps configuration...

Strategy: Project-per-team
Checking projects: WebApp, MobileApp, Platform...

⚠️ Projects not found:
   • WebApp
   • MobileApp
   • Platform

What would you like to do?
1. Create new projects
2. Select existing projects
3. Cancel

Your choice [1]: 1

📦 Creating Azure DevOps projects...

Creating project: WebApp
  Description: Web application frontend
  Process template: Agile
✅ Created: WebApp (ID: proj-001)

Creating project: MobileApp
  Description: Mobile application
  Process template: Agile
✅ Created: MobileApp (ID: proj-002)

Creating project: Platform
  Description: Backend platform services
  Process template: Agile
✅ Created: Platform (ID: proj-003)

🎉 Azure DevOps configuration complete! All resources ready.
```

### Example 2: Migrate from Single to Multi-Project

**Scenario**: Currently using single project, want to split into multiple

**Current .env**:
```bash
AZURE_DEVOPS_PROJECT=MainProduct
```

**New .env**:
```bash
AZURE_DEVOPS_STRATEGY=project-per-team
AZURE_DEVOPS_PROJECTS=MainProduct-Frontend,MainProduct-Backend,MainProduct-Mobile
```

**What Happens**:
```bash
🔍 Detected strategy change: team-based → project-per-team

Validating new projects...
  ✅ MainProduct-Frontend (exists from previous split)
  ⚠️ MainProduct-Backend (not found)
  ⚠️ MainProduct-Mobile (not found)

Would you like to:
1. Create missing projects
2. Keep single project with area paths instead
3. Cancel

Your choice [1]: 1

📦 Creating projects...
✅ Created: MainProduct-Backend
✅ Created: MainProduct-Mobile

💡 Tip: You can now organize specs by project:
   .specweave/docs/internal/specs/MainProduct-Frontend/
   .specweave/docs/internal/specs/MainProduct-Backend/
   .specweave/docs/internal/specs/MainProduct-Mobile/
```

### Example 3: Area Path Setup

**Scenario**: Large monolithic project with area-based organization

**Action**: Setup area paths for team organization

**What Happens**:
```bash
🔍 Validating Azure DevOps configuration...

Strategy: Area-path-based
Project: EnterpriseApp
Area Paths: Core, UserManagement, Billing, Reports, Analytics

Checking project: EnterpriseApp...
✅ Project exists

Checking area paths...
  ✅ EnterpriseApp\Core
  ✅ EnterpriseApp\UserManagement
  ⚠️ EnterpriseApp\Billing (not found)
  ⚠️ EnterpriseApp\Reports (not found)
  ⚠️ EnterpriseApp\Analytics (not found)

📦 Creating area paths...

Creating: EnterpriseApp\Billing
✅ Area path created with default team

Creating: EnterpriseApp\Reports
✅ Area path created with default team

Creating: EnterpriseApp\Analytics
✅ Area path created with default team

✅ All area paths ready!

Work items will be organized by area:
  • Billing features → EnterpriseApp\Billing
  • Report features → EnterpriseApp\Reports
  • Analytics features → EnterpriseApp\Analytics
```

## CLI Command

**Manual validation**:
```bash
# From TypeScript
npx tsx src/utils/external-resource-validator.ts --provider=ado

# Or via skill activation
"Can you validate my Azure DevOps configuration?"
```

**Validation output**:
```typescript
{
  valid: true,
  strategy: 'project-per-team',
  projects: [
    { name: 'WebApp', id: 'proj-001', exists: true },
    { name: 'MobileApp', id: 'proj-002', exists: true },
    { name: 'Platform', id: 'proj-003', exists: true }
  ],
  created: [],
  envUpdated: false
}
```

## Smart Project Detection

### Auto-detect Based on Work Item Patterns

The skill can intelligently suggest project organization based on your existing work items:

```typescript
// Analyze existing work items
const workItems = await analyzeWorkItems(org, project);

// Detect patterns
const patterns = {
  byArea: workItems.groupBy('areaPath'),      // Area-based organization
  byTeam: workItems.groupBy('assignedTeam'),  // Team-based organization
  byType: workItems.groupBy('workItemType')   // Type-based organization
};

// Suggest strategy
if (patterns.byArea.length > 3) {
  console.log('💡 Detected area-based organization');
  console.log('   Suggested strategy: area-path-based');
} else if (patterns.byTeam.length > 2) {
  console.log('💡 Detected team-based organization');
  console.log('   Suggested strategy: team-based or project-per-team');
}
```

## Project Creation API

**Azure DevOps REST API** (v7.0):

### Create Project
```bash
POST https://dev.azure.com/{org}/_apis/projects?api-version=7.0
Content-Type: application/json
Authorization: Basic {base64(":PAT")}

{
  "name": "MobileApp",
  "description": "Mobile application project",
  "capabilities": {
    "versioncontrol": {
      "sourceControlType": "Git"
    },
    "processTemplate": {
      "templateTypeId": "adcc42ab-9882-485e-a3ed-7678f01f66bc"  # Agile
    }
  }
}

Response:
{
  "id": "proj-002",
  "name": "MobileApp",
  "state": "wellFormed"
}
```

### Create Area Path
```bash
POST https://dev.azure.com/{org}/{project}/_apis/wit/classificationnodes/areas?api-version=7.0
Content-Type: application/json

{
  "name": "Frontend",
  "attributes": {
    "startDate": null,
    "finishDate": null
  }
}

Response:
{
  "id": 123,
  "name": "Frontend",
  "path": "\\MainProduct\\Area\\Frontend"
}
```

### Create Team
```bash
POST https://dev.azure.com/{org}/_apis/projects/{projectId}/teams?api-version=7.0
Content-Type: application/json

{
  "name": "Alpha Team",
  "description": "Alpha development team"
}

Response:
{
  "id": "team-001",
  "name": "Alpha Team",
  "projectName": "MainProduct"
}
```

## Configuration Examples

### Example 1: Microservices Architecture (Project-per-team)

**Before** (`.env`):
```bash
AZURE_DEVOPS_ORG=mycompany
AZURE_DEVOPS_PAT=xxx
```

**After validation**:
```bash
AZURE_DEVOPS_ORG=mycompany
AZURE_DEVOPS_PAT=xxx
AZURE_DEVOPS_STRATEGY=project-per-team
AZURE_DEVOPS_PROJECTS=AuthService,UserService,PaymentService,NotificationService
```

**Folder structure created**:
```
.specweave/docs/internal/specs/
├── AuthService/
│   └── spec-001-oauth-implementation.md
├── UserService/
│   └── spec-001-user-management.md
├── PaymentService/
│   └── spec-001-stripe-integration.md
└── NotificationService/
    └── spec-001-email-notifications.md
```

### Example 2: Monolithic Application (Area-path-based)

**Before** (`.env`):
```bash
AZURE_DEVOPS_PROJECT=ERP
```

**After validation**:
```bash
AZURE_DEVOPS_ORG=enterprise
AZURE_DEVOPS_PAT=xxx
AZURE_DEVOPS_STRATEGY=area-path-based
AZURE_DEVOPS_PROJECT=ERP
AZURE_DEVOPS_AREA_PATHS=Finance,HR,Inventory,Sales,Reports
```

**Work item organization**:
```
ERP
├── Finance/          → Finance module features
├── HR/               → HR module features
├── Inventory/        → Inventory management
├── Sales/            → Sales module features
└── Reports/          → Reporting features
```

### Example 3: Platform Teams (Team-based)

**Before** (`.env`):
```bash
AZURE_DEVOPS_PROJECT=Platform
```

**After validation**:
```bash
AZURE_DEVOPS_ORG=techcorp
AZURE_DEVOPS_PAT=xxx
AZURE_DEVOPS_STRATEGY=team-based
AZURE_DEVOPS_PROJECT=Platform
AZURE_DEVOPS_TEAMS=Infrastructure,Security,Data,DevOps
```

**Team assignments**:
- Infrastructure Team → Cloud resources, networking
- Security Team → Auth, compliance, auditing
- Data Team → Databases, analytics, ML
- DevOps Team → CI/CD, monitoring, tooling

## Error Handling

### Error 1: Invalid Credentials

**Symptom**: API calls fail with 401 Unauthorized

**Solution**:
```
❌ Azure DevOps API authentication failed

Please check:
1. AZURE_DEVOPS_PAT is correct
2. Token has not expired
3. AZURE_DEVOPS_ORG is correct

Generate new token at:
https://dev.azure.com/{org}/_usersSettings/tokens
```

### Error 2: Insufficient Permissions

**Symptom**: Cannot create projects (403 Forbidden)

**Solution**:
```
❌ Insufficient permissions to create projects

You need:
- Project Collection Administrator role (for creating projects)
- Project Administrator role (for area paths and teams)

Contact your Azure DevOps administrator to request permissions.
```

### Error 3: Project Name Conflicts

**Symptom**: Project creation fails (name exists)

**Solution**:
```
❌ Project name "WebApp" already exists

Options:
1. Use a different project name
2. Select the existing project
3. Add a suffix (e.g., WebApp-v2)

Your choice [2]:
```

### Error 4: Organization Limits

**Symptom**: Cannot create more projects

**Solution**:
```
❌ Organization project limit reached (250 projects)

Consider:
1. Using area-path-based strategy (one project)
2. Archiving old projects
3. Upgrading organization plan

Contact Azure DevOps support for limit increases.
```

## Integration with SpecWeave Workflow

### Automatic Validation

When using `/specweave-ado:sync`, validation runs automatically:

```bash
/specweave-ado:sync 0014

# Internally calls:
1. validateAzureDevOpsResources()
2. Fix missing projects/area paths/teams
3. Create folder structure for specs
4. Proceed with sync
```

### Manual Validation

Run validation independently:

```bash
# Via skill
"Validate my Azure DevOps configuration"

# Via TypeScript
npx tsx src/utils/external-resource-validator.ts --provider=ado

# Via CLI (future)
specweave validate-ado
```

## Best Practices

✅ **Choose the right strategy**:
- **Project-per-team**: Best for autonomous teams, microservices
- **Area-path-based**: Best for monolithic apps, shared codebase
- **Team-based**: Best for small organizations, simple structure

✅ **Use descriptive names**:
```bash
# Good
AZURE_DEVOPS_PROJECTS=UserManagement,PaymentProcessing,NotificationEngine

# Bad
AZURE_DEVOPS_PROJECTS=Proj1,Proj2,Proj3
```

✅ **Document project mapping** (in README):
```markdown
## Azure DevOps Projects

- UserManagement: User authentication and profile management
- PaymentProcessing: Payment gateway integrations
- NotificationEngine: Email, SMS, and push notifications
```

✅ **Keep .env in version control** (gitignored tokens):
```bash
# Commit project structure
AZURE_DEVOPS_STRATEGY=project-per-team
AZURE_DEVOPS_PROJECTS=WebApp,MobileApp,Platform

# Don't commit sensitive data
AZURE_DEVOPS_PAT=<redacted>
```

## Folder Organization

Based on strategy, the skill creates appropriate folder structure:

### Project-per-team Structure
```
.specweave/docs/internal/specs/
├── WebApp/
│   ├── spec-001-user-interface.md
│   └── spec-002-responsive-design.md
├── MobileApp/
│   ├── spec-001-ios-features.md
│   └── spec-002-android-features.md
└── Platform/
    ├── spec-001-api-design.md
    └── spec-002-database-schema.md
```

### Area-path-based Structure
```
.specweave/docs/internal/specs/MainProduct/
├── Frontend/
│   └── spec-001-ui-components.md
├── Backend/
│   └── spec-001-api-endpoints.md
└── Mobile/
    └── spec-001-mobile-sync.md
```

### Team-based Structure
```
.specweave/docs/internal/specs/MainProduct/
├── AlphaTeam/
│   └── spec-001-feature-a.md
├── BetaTeam/
│   └── spec-001-feature-b.md
└── GammaTeam/
    └── spec-001-feature-c.md
```

## Summary

This skill ensures your Azure DevOps configuration is **always valid** by:

1. ✅ **Validating projects** - Check if projects exist, prompt to select or create
2. ✅ **Supporting multiple strategies** - Project-per-team, area-path-based, team-based
3. ✅ **Auto-creating resources** - Projects, area paths, teams
4. ✅ **Organizing specs** - Create folder structure based on projects
5. ✅ **Clear error messages** - Actionable guidance for all failures

**Result**: Zero manual Azure DevOps setup - system handles everything!

---

**Skill Version**: 1.0.0
**Introduced**: SpecWeave v0.17.0
**Last Updated**: 2025-11-11