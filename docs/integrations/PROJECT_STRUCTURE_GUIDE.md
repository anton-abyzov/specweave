
# 🏗️ Project Structure Guide - Flexible Hierarchy Support

SpecWeave adapts to **your** project management structure, whether you use Jira Epics, ADO Features, GitHub Milestones, or something custom.

## 🎯 Overview

Different teams use different project management approaches:

- **Jira teams** → Epic → Story → Sub-task
- **ADO teams** → Feature → User Story → Task (or Epic → Feature → User Story)
- **GitHub teams** → Milestone → Issue (or flat Issues with labels)
- **Custom teams** → Your own hierarchy

SpecWeave **auto-detects** your structure and adapts RFC generation, increment organization, and sync behavior accordingly.

---

## 📊 Supported Hierarchy Levels

### Level 0: Flat (No Hierarchy)

**Use case**: Small teams, simple projects, GitHub issues without milestones

**Example**: Just Issues or User Stories
```
Issue #1: Add login button
Issue #2: Fix dashboard bug
Issue #3: Setup CI/CD
```

**RFC Organization**: Groups by type (bug, enhancement, chore) or labels
```markdown
## Bug Fixes
- Fix dashboard bug (#2)

## Features
- Add login button (#1)

## Infrastructure
- Setup CI/CD (#3)
```

---

### Level 1: Single Parent

**Use case**: GitHub with Milestones, ADO without Features

**Example**: Milestone → Issues OR Feature → Stories
```
Milestone: v1.0 Release
├── Issue #1: Add login button
├── Issue #2: Add registration
└── Issue #3: Setup analytics
```

**RFC Organization**: Groups by parent (Milestone/Feature) or by type
```markdown
## Milestone: v1.0 Release

### Features
- Add login button (#1)
- Add registration (#2)

### Infrastructure
- Setup analytics (#3)
```

---

### Level 2: Two-Level (Standard)

**Use case**: Jira, ADO with Features

**Example Jira**: Epic → Story → Sub-task
```
Epic: User Authentication
├── Story: User can login
│   ├── Sub-task: Create login form
│   └── Sub-task: Implement JWT auth
└── Story: User can register
    ├── Sub-task: Create registration form
    └── Sub-task: Setup email verification
```

**Example ADO**: Feature → User Story → Task
```
Feature: User Authentication
├── User Story: Login functionality
│   ├── Task: Frontend login form
│   └── Task: Backend auth API
└── User Story: Registration flow
    ├── Task: Registration form
    └── Task: Email service integration
```

**RFC Organization**: Groups by type (User Stories, Bug Fixes, Technical Tasks)
```markdown
## User Stories

### 1. User can login
Description...
**Jira**: [SCRUM-1](https://...)

### 2. User can register
Description...
**Jira**: [SCRUM-2](https://...)

## Technical Tasks
- Create login form (SCRUM-3)
- Implement JWT auth (SCRUM-4)
```

---

### Level 3: Three-Level (Enterprise)

**Use case**: Large enterprises with Initiatives/Programs

**Example**: Initiative → Epic → Feature → Story
```
Initiative: Digital Transformation
└── Epic: User Management
    ├── Feature: Authentication
    │   ├── Story: Login with SSO
    │   └── Story: Multi-factor auth
    └── Feature: Authorization
        └── Story: Role-based access
```

**RFC Organization**: Groups by Epic or Feature, shows full context
```markdown
## Epic: User Management

### Feature: Authentication

#### Story: Login with SSO
Description...

#### Story: Multi-factor auth
Description...

### Feature: Authorization

#### Story: Role-based access
Description...
```

---

## 🔍 Auto-Detection

SpecWeave automatically detects your project structure by analyzing:

1. **Existing increments** - Scans `.specweave/increments/*/spec.md` for patterns
2. **Metadata** - Checks for Jira, ADO, or GitHub metadata
3. **Work items** - Analyzes work item types and relationships
4. **Environment** - Detects from `JIRA_DOMAIN`, `AZURE_DEVOPS_ORG`, etc.

### Detection Process

```typescript
// Automatic detection
const detector = new ProjectStructureDetector();
const structure = await detector.detectStructure();

console.log(structure);
// {
//   source: 'jira',
//   hierarchyLevel: 'two_level',
//   workItemTypes: {
//     parentLevel: 'Epic',
//     itemLevel: 'Story',
//     subItemLevel: 'Sub-task'
//   },
//   groupingStrategy: 'by_type'
// }
```

### Detection Evidence

SpecWeave provides confidence level and evidence:
```typescript
const detected = await detector.autoDetectStructure();

console.log(detected.confidence);  // 0.8 (80% confident)
console.log(detected.evidence);
// [
//   'Found Jira metadata in 0003',
//   'Found Epic link: SCRUM-2',
//   'Detected 2-level hierarchy with Epics',
//   'Work item types: story, bug, task'
// ]
```

---

## ⚙️ Manual Configuration

Override auto-detection with `.specweave/config.yaml`:

### Example 1: Standard Jira Project
```yaml
project_structure:
  source: jira
  hierarchy_level: two_level
  work_item_types:
    parent_level: Epic
    item_level: Story
    sub_item_level: Sub-task
  grouping_strategy: by_type
```

### Example 2: GitHub with Milestones
```yaml
project_structure:
  source: github
  hierarchy_level: single_parent
  work_item_types:
    parent_level: Milestone
    item_level: Issue
  grouping_strategy: by_parent  # Groups by Milestone
```

### Example 3: Flat GitHub Issues
```yaml
project_structure:
  source: github
  hierarchy_level: flat
  work_item_types:
    item_level: Issue
  grouping_strategy: by_label  # Groups by labels (bug, enhancement, etc.)
```

### Example 4: ADO without Features
```yaml
project_structure:
  source: ado
  hierarchy_level: single_parent
  work_item_types:
    item_level: User Story
    sub_item_level: Task
  grouping_strategy: by_type
```

### Example 5: Enterprise Jira (3-level)
```yaml
project_structure:
  source: jira
  hierarchy_level: three_level
  work_item_types:
    top_level: Initiative
    parent_level: Epic
    item_level: Story
    sub_item_level: Sub-task
  grouping_strategy: by_parent  # Groups by Epic
```

---

## 📑 Grouping Strategies

### by_type (Default for Jira/ADO)

Groups work items by their type: Story, Bug, Task, etc.

**RFC Output**:
```markdown
## User Stories
- Story 1
- Story 2

## Bug Fixes
- Bug 1
- Bug 2

## Technical Tasks
- Task 1
- Task 2
```

**Best for**: Teams that want to see all work by category

---

### by_parent (Default for GitHub Milestones)

Groups work items by their parent: Epic, Feature, Milestone

**RFC Output**:
```markdown
## Epic: User Authentication
- Story: Login
- Story: Registration

## Epic: Dashboard
- Story: Widget system
- Bug: Chart rendering
```

**Best for**: Teams that organize work by features/milestones

---

### by_priority

Groups work items by priority

**RFC Output**:
```markdown
## Priority: P1 (Critical)
- Fix security vulnerability
- Restore login service

## Priority: P2 (Important)
- Add email notifications
- Improve dashboard performance

## Priority: P3 (Nice to have)
- Add dark mode
- Refactor old code
```

**Best for**: Teams focused on prioritization

---

### by_label

Groups work items by labels/tags (GitHub-style)

**RFC Output**:
```markdown
## Label: frontend
- Add login UI
- Fix dashboard layout

## Label: backend
- Implement auth API
- Setup database

## Label: devops
- Setup CI/CD
- Configure monitoring
```

**Best for**: GitHub teams using labels for organization

---

### flat

No grouping, flat list

**RFC Output**:
```markdown
## Work Items
1. Add login button (#123)
2. Fix dashboard bug (#124)
3. Setup CI/CD (#125)
4. Add email notifications (#126)
```

**Best for**: Small projects with few items

---

## 🔄 RFC Adaptation Examples

### Jira Project → Epic-Based RFC

**Input**: Epic SCRUM-2 with 3 stories

**Generated RFC**:
```markdown
# RFC 0003: User Authentication

**Status**: Draft
**Created**: 2025-10-28
**Jira Epic**: [SCRUM-2](https://jira.example.com/browse/SCRUM-2)

## Summary
This increment implements user authentication with login and registration.

## Motivation
Users need to securely access the system.

## Detailed Design

### User Stories

#### 1. User can login
As a user, I want to login so that I can access my account.
**Jira**: [SCRUM-3](https://...)

#### 2. User can register
As a user, I want to register so that I can create an account.
**Jira**: [SCRUM-4](https://...)

### Bug Fixes

#### 1. Fix OAuth redirect
OAuth provider redirects to wrong URL.
**Priority**: P1 | **Jira**: [SCRUM-5](https://...)
```

---

### GitHub Project → Milestone-Based RFC

**Input**: Milestone "v1.0 Release" with 5 issues

**Generated RFC**:
```markdown
# RFC 0004: v1.0 Release

**Status**: Draft
**Created**: 2025-10-28
**GitHub Milestone**: [v1.0 Release](https://github.com/org/repo/milestone/1)
**Repository**: org/repo

## Summary
This release includes core features for initial launch.

## Motivation
Launch MVP with essential functionality.

## Detailed Design

### Milestone: v1.0 Release

#### 1. Add user authentication
Implement login and registration.
**GitHub**: [#123](https://github.com/org/repo/issues/123)
**Labels**: feature, frontend

#### 2. Setup CI/CD pipeline
Automated testing and deployment.
**GitHub**: [#124](https://github.com/org/repo/issues/124)
**Labels**: infrastructure, devops
```

---

### ADO Project → Feature-Based RFC

**Input**: Feature "Payment System" with user stories

**Generated RFC**:
```markdown
# RFC 0005: Payment System

**Status**: Draft
**Created**: 2025-10-28
**ADO Work Item**: [#12345](https://dev.azure.com/org/project/_workitems/edit/12345)

## Summary
Implement payment processing with Stripe integration.

## Motivation
Users need to make purchases within the app.

## Detailed Design

### User Stories

#### 1. User can add payment method
Users can save credit cards for future purchases.
**ADO**: [#12346](https://...)

#### 2. User can checkout
Users can complete purchase with saved payment.
**ADO**: [#12347](https://...)

### Technical Tasks

#### 1. Integrate Stripe SDK
Setup Stripe SDK and webhooks.
**ADO**: [#12348](https://...)
```

---

## 🚀 Migration Guide

### From Fixed Structure to Flexible

If you have existing increments with old structure:

1. **SpecWeave auto-detects** - No migration needed!
2. **RFCs regenerate** with new structure on next sync
3. **Existing RFCs preserved** - New ones use flexible format

### Switching Project Types

If you change from Jira to GitHub:

1. Update `.specweave/config.yaml`:
   ```yaml
   project_structure:
     source: github
     hierarchy_level: single_parent
     work_item_types:
       parent_level: Milestone
       item_level: Issue
     grouping_strategy: by_parent
   ```

2. Future RFCs adapt automatically
3. Existing increments remain unchanged

---

## 📚 API Usage

### Using RFC Generator (Current Implementation)

```typescript
// Current: Using standard RFCGenerator
import { RFCGenerator, WorkItem, RFCContent } from './core/rfc-generator';

const generator = new RFCGenerator();

// Note: FlexibleRFCGenerator is a planned enhancement (see FLEXIBLE_STRUCTURE_SUMMARY.md)

const workItems: FlexibleWorkItem[] = [
  {
    type: 'story',
    id: 'US0003-001',
    title: 'User can login',
    description: 'As a user, I want to login...',
    priority: 'P1',
    source_key: 'SCRUM-3',
    source_url: 'https://jira.example.com/browse/SCRUM-3',
    parent: {
      type: 'Epic',
      key: 'SCRUM-2',
      title: 'User Authentication',
      url: 'https://jira.example.com/browse/SCRUM-2'
    },
    labels: ['frontend', 'auth']
  }
  // ... more items
];

const rfcPath = await generator.generateRFC({
  metadata: {
    incrementId: '0003',
    title: 'User Authentication',
    status: 'draft',
    source: 'jira',
    created: '2025-10-28'
  },
  sourceMetadata: {
    source_type: 'jira',
    parent_type: 'Epic',
    parent_key: 'SCRUM-2',
    parent_url: 'https://jira.example.com/browse/SCRUM-2',
    parent_title: 'User Authentication'
  },
  summary: 'Implement user authentication',
  motivation: 'Users need to securely access the system',
  workItems
  // projectStructure is auto-detected if omitted
});
```

---

## 🎯 Best Practices

1. **Let SpecWeave auto-detect** - Only configure if auto-detection is wrong
2. **Start simple** - Use default grouping_strategy first
3. **Document your structure** - Add comments in config.yaml
4. **Test with sample** - Create one increment to verify structure
5. **Consistent naming** - Use consistent work item type names

---

## 🐛 Troubleshooting

### RFC grouping looks wrong

**Solution**: Override grouping_strategy in config
```yaml
project_structure:
  grouping_strategy: by_parent  # Try different strategy
```

### Work item types not detected

**Solution**: Specify explicitly in config
```yaml
project_structure:
  work_item_types:
    parent_level: Epic
    item_level: Story
```

### Mixed hierarchy (some with Epic, some without)

**Solution**: Use `by_type` grouping, it handles both
```yaml
project_structure:
  grouping_strategy: by_type
```

---

## 📖 Related Documentation

- [Jira Sync Integration](./SYNC_INTEGRATIONS_README.md)
- [Quick Start Guide](./QUICK_START.md)
- [RFC Template](../../src/templates/docs/rfc-template.md)
- [Configuration Example](../../.specweave/config.example.yaml)

---

**Made with ❤️ by SpecWeave** | Flexible Structure Support v2.0
