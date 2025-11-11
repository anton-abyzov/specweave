# Per-Project Configuration Design

**Problem**: Current implementation supports EITHER multiple projects OR area paths/boards, not BOTH.

**Real-World Need**: Each project needs its own organizational structure:
- Backend project → API, Database, Cache area paths
- Frontend project → Web, Admin, Public area paths
- Mobile project → iOS, Android, Shared area paths

## Solution: Per-Project Configuration

### Schema Design

**Naming Convention**: `{PROVIDER}_{RESOURCE_TYPE}_{PROJECT_NAME}`

**Examples**:
```bash
# ADO per-project area paths
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public
AZURE_DEVOPS_AREA_PATHS_Mobile=iOS,Android,Shared

# ADO per-project teams
AZURE_DEVOPS_TEAMS_Backend=Alpha,Beta
AZURE_DEVOPS_TEAMS_Frontend=Gamma

# JIRA per-project boards
JIRA_BOARDS_BACKEND=123,456
JIRA_BOARDS_FRONTEND=789,012
JIRA_BOARDS_MOBILE=345,678
```

### Complete ADO Configuration Example

```bash
# Organization credentials
AZURE_DEVOPS_ORG=easychamp
AZURE_DEVOPS_PAT=your_token_here
AZURE_DEVOPS_STRATEGY=project-per-team

# Projects
AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile

# Backend project (API development)
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache,Auth
AZURE_DEVOPS_TEAMS_Backend=Backend-Alpha,Backend-Beta

# Frontend project (Web UIs)
AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public,Shared
AZURE_DEVOPS_TEAMS_Frontend=Frontend-Team

# Mobile project (iOS + Android)
AZURE_DEVOPS_AREA_PATHS_Mobile=iOS,Android,Shared,Common
AZURE_DEVOPS_TEAMS_Mobile=Mobile-iOS,Mobile-Android,Mobile-QA
```

### Complete JIRA Configuration Example

```bash
# Atlassian credentials
JIRA_DOMAIN=mycompany.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your_token_here

# Projects
JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE

# Backend project boards
JIRA_BOARDS_BACKEND=123,456  # Sprint Board, Kanban Board
JIRA_PROJECT_KEY_BACKEND=BACK

# Frontend project boards
JIRA_BOARDS_FRONTEND=789,012  # Sprint Board, Bug Board
JIRA_PROJECT_KEY_FRONTEND=FRONT

# Mobile project boards
JIRA_BOARDS_MOBILE=345,678,901  # iOS Board, Android Board, Release Board
JIRA_PROJECT_KEY_MOBILE=MOB
```

## Validation Flow

### ADO Multi-Project with Area Paths

```typescript
async validateMultipleProjects(projects: string[]): Promise<ValidationResult> {
  for (const projectName of projects) {
    // 1. Validate project exists
    const project = await this.checkProject(projectName);
    if (!project) {
      await this.promptCreateOrSelect(projectName);
    }

    // 2. Check for per-project area paths (NEW!)
    const areaPathsKey = `AZURE_DEVOPS_AREA_PATHS_${projectName}`;
    const areaPaths = env[areaPathsKey];

    if (areaPaths) {
      console.log(`\n🔍 Validating area paths for ${projectName}...`);
      const paths = areaPaths.split(',').map(p => p.trim());

      for (const path of paths) {
        const exists = await this.checkAreaPath(projectName, path);
        if (!exists) {
          console.log(`   ⚠️ Creating area path: ${projectName}\\${path}`);
          await this.createAreaPath(projectName, path);
        } else {
          console.log(`   ✅ ${projectName}\\${path}`);
        }
      }
    }

    // 3. Check for per-project teams (NEW!)
    const teamsKey = `AZURE_DEVOPS_TEAMS_${projectName}`;
    const teams = env[teamsKey];

    if (teams) {
      console.log(`\n🔍 Validating teams for ${projectName}...`);
      const teamList = teams.split(',').map(t => t.trim());

      for (const team of teamList) {
        const exists = await this.checkTeam(projectName, team);
        if (!exists) {
          console.log(`   ⚠️ Creating team: ${team}`);
          await this.createTeam(projectName, team);
        } else {
          console.log(`   ✅ ${team}`);
        }
      }
    }
  }
}
```

### JIRA Multi-Project with Boards

```typescript
async validateMultipleProjects(projects: string[]): Promise<ValidationResult> {
  for (const projectKey of projects) {
    // 1. Validate project exists
    const project = await this.checkProject(projectKey);
    if (!project) {
      await this.promptCreateOrSelect(projectKey);
    }

    // 2. Check for per-project boards (NEW!)
    const boardsKey = `JIRA_BOARDS_${projectKey}`;
    const boards = env[boardsKey];

    if (boards) {
      console.log(`\n🔍 Validating boards for ${projectKey}...`);
      const boardList = boards.split(',').map(b => b.trim());

      for (const boardId of boardList) {
        const exists = await this.checkBoard(boardId);
        if (!exists) {
          // Prompt: Create board or select existing?
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: `Board ${boardId} not found for ${projectKey}. What to do?`,
              choices: [
                { name: 'Create new board', value: 'create' },
                { name: 'Select existing board', value: 'select' },
                { name: 'Skip', value: 'skip' }
              ]
            }
          ]);

          if (action === 'create') {
            await this.createBoard(projectKey, boardId);
          } else if (action === 'select') {
            const selectedBoard = await this.promptSelectBoard(projectKey);
            // Update .env with correct board ID
            this.updateEnv(boardsKey, selectedBoard.id);
          }
        } else {
          console.log(`   ✅ Board ${boardId} exists`);
        }
      }
    }
  }
}
```

## Folder Organization

### ADO Multi-Project with Area Paths

```
.specweave/docs/internal/specs/
├── Backend/
│   ├── API/
│   │   ├── spec-001-rest-endpoints.md
│   │   └── spec-002-graphql-schema.md
│   ├── Database/
│   │   ├── spec-001-user-schema.md
│   │   └── spec-002-migrations.md
│   └── Cache/
│       └── spec-001-redis-setup.md
│
├── Frontend/
│   ├── Web/
│   │   ├── spec-001-dashboard.md
│   │   └── spec-002-settings.md
│   ├── Admin/
│   │   └── spec-001-admin-panel.md
│   └── Public/
│       └── spec-001-landing-page.md
│
└── Mobile/
    ├── iOS/
    │   └── spec-001-ios-app.md
    ├── Android/
    │   └── spec-001-android-app.md
    └── Shared/
        └── spec-001-shared-components.md
```

### Work Item Organization

**Backend Project**:
```
Backend (Project)
├── API (Area Path)
│   ├── Epic-001: REST API v2
│   │   ├── Story-001: User endpoints
│   │   └── Story-002: Auth endpoints
│   └── Epic-002: GraphQL Migration
├── Database (Area Path)
│   ├── Epic-003: Schema redesign
│   └── Epic-004: Performance optimization
└── Cache (Area Path)
    └── Epic-005: Redis implementation
```

**Frontend Project**:
```
Frontend (Project)
├── Web (Area Path)
│   ├── Epic-006: Dashboard redesign
│   └── Epic-007: Dark mode
├── Admin (Area Path)
│   └── Epic-008: Admin panel v2
└── Public (Area Path)
    └── Epic-009: Marketing site
```

## Migration Path

### From Simple to Rich Configuration

**Before** (Simple multi-project):
```bash
AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile
```

**After** (Rich per-project configuration):
```bash
AZURE_DEVOPS_PROJECTS=Backend,Frontend,Mobile

# Add per-project area paths
AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
AZURE_DEVOPS_AREA_PATHS_Frontend=Web,Admin,Public
AZURE_DEVOPS_AREA_PATHS_Mobile=iOS,Android,Shared

# Add per-project teams
AZURE_DEVOPS_TEAMS_Backend=Alpha,Beta
AZURE_DEVOPS_TEAMS_Frontend=Gamma
AZURE_DEVOPS_TEAMS_Mobile=iOS-Team,Android-Team
```

**Migration Tool** (future):
```bash
# Analyze existing work items and suggest configuration
specweave analyze-ado-structure

# Output:
# 📊 Detected structure in Backend project:
#    - 45 work items in "API" area path
#    - 32 work items in "Database" area path
#    - 18 work items in "Cache" area path
#
# 💡 Suggested configuration:
#    AZURE_DEVOPS_AREA_PATHS_Backend=API,Database,Cache
```

## Benefits

✅ **Realistic organization**: Matches real-world multi-project structures
✅ **Per-project flexibility**: Each project has unique area paths/boards
✅ **Backwards compatible**: Simple configs still work (no area paths = flat structure)
✅ **Clear naming**: Convention makes it obvious which config applies to which project
✅ **Scales well**: Add new projects with `AREA_PATHS_{NewProject}=...`

## Examples

### Example 1: Microservices with Area-Based Organization

```bash
# E-commerce platform with microservices

AZURE_DEVOPS_PROJECTS=AuthService,UserService,PaymentService

# Auth Service (small, simple)
# No area paths needed - flat structure

# User Service (medium complexity)
AZURE_DEVOPS_AREA_PATHS_UserService=API,Database,Cache

# Payment Service (complex, regulated)
AZURE_DEVOPS_AREA_PATHS_PaymentService=Stripe,PayPal,Compliance,Fraud,Reports
AZURE_DEVOPS_TEAMS_PaymentService=Payment-Dev,Payment-Security,Payment-Compliance
```

### Example 2: Platform with Frontend/Backend/Mobile

```bash
# SaaS platform

AZURE_DEVOPS_PROJECTS=Platform-Backend,Platform-Frontend,Platform-Mobile

# Backend (API + Infrastructure)
AZURE_DEVOPS_AREA_PATHS_Platform-Backend=API,Database,Infrastructure,Monitoring
AZURE_DEVOPS_TEAMS_Platform-Backend=Backend-Alpha,Backend-Beta,DevOps

# Frontend (Multiple web apps)
AZURE_DEVOPS_AREA_PATHS_Platform-Frontend=Dashboard,Admin,Marketing,Shared
AZURE_DEVOPS_TEAMS_Platform-Frontend=Frontend-Team

# Mobile (iOS + Android)
AZURE_DEVOPS_AREA_PATHS_Platform-Mobile=iOS,Android,Shared,Testing
AZURE_DEVOPS_TEAMS_Platform-Mobile=iOS-Team,Android-Team,Mobile-QA
```

### Example 3: JIRA Multi-Project with Multiple Boards

```bash
# Software company with multiple products

JIRA_PROJECTS=BACKEND,FRONTEND,MOBILE

# Backend (Sprint + Kanban + Bug boards)
JIRA_BOARDS_BACKEND=123,456,789
# 123 = Sprint Board
# 456 = Kanban Board
# 789 = Bug Triage Board

# Frontend (Sprint + Bug boards)
JIRA_BOARDS_FRONTEND=234,567
# 234 = Sprint Board
# 567 = Bug Board

# Mobile (iOS + Android + Release boards)
JIRA_BOARDS_MOBILE=345,678,901
# 345 = iOS Sprint Board
# 678 = Android Sprint Board
# 901 = Release Planning Board
```

## API Changes

### New Methods

**ADO Validator**:
```typescript
// Check if area path exists
async checkAreaPath(projectName: string, areaPath: string): Promise<boolean>

// Create area path
async createAreaPath(projectName: string, areaPath: string): Promise<void>

// Check if team exists
async checkTeam(projectName: string, teamName: string): Promise<boolean>

// Create team
async createTeam(projectName: string, teamName: string): Promise<void>
```

**JIRA Validator**:
```typescript
// Check if board exists
async checkBoard(boardId: string): Promise<boolean>

// Create board
async createBoard(projectKey: string, boardName: string): Promise<Board>

// Prompt to select existing board
async promptSelectBoard(projectKey: string): Promise<Board>
```

## Summary

**Current Implementation**: Multiple projects OR area paths (limited)
**New Implementation**: Multiple projects AND per-project area paths/boards (rich)

**Result**: Real-world multi-project organization with per-project flexibility!

---

**Design Version**: 1.0
**Created**: 2025-11-11
**Status**: Ready for implementation
