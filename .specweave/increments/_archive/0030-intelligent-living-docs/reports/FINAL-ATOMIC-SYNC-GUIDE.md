# FINAL Atomic Sync Guide - The Definitive Implementation

**Status**: Definitive Guide
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**This is THE definitive guide for syncing increment specs to living docs and external tools.**

**Key Insight**: **Increment ≈ Feature** (not just an execution unit)

Most SpecWeave increments define a complete feature (authentication, GitHub integration, status sync). This means:
- ✅ Increment contains multiple User Stories (US-001, US-002, etc.)
- ✅ Increment maps to Epic/Feature in external tools (Jira, ADO, GitHub)
- ✅ Increment should preserve hierarchy when synced

**The Challenge**: Current sync is FLAT (loses user story structure). We need HIERARCHICAL sync.

**This Guide Covers**:
1. **Increment ≈ Feature**: Understanding the relationship
2. **Atomic Sync**: Extract ALL content types (nothing lost)
3. **External Tool Mapping**: Jira/ADO/GitHub hierarchy
4. **Complete Traceability**: Spec → Living Docs → External Tools

---

## Part 1: Understanding Increment ≈ Feature

### The Fundamental Relationship

**SpecWeave's Three-Level Model**:

```
1. Feature Spec (FS-020-github-integration)  ← Permanent living docs
   ├── 20+ User Stories (US-001 to US-020)
   ├── Business value, roadmap
   ├── May span multiple increments

2. Increment (0020-github-phase-1)           ← Temporary execution unit
   ├── 3-5 User Stories (US-001 to US-005)
   ├── Implements part of Feature Spec
   ├── Has tasks.md (execution details)

3. User Story (US-001: User Login)           ← Atomic requirement
   ├── Acceptance Criteria (AC-US1-01, AC-US1-02)
   ├── Business rationale
   ├── Implemented by tasks
```

**But in Practice** (SpecWeave's current usage):

```
Increment 0016-authentication               ← This IS the feature!
├── Contains ALL user stories (US-001 to US-005)
├── Complete feature (not a phase)
├── Maps to external tool as Epic/Feature
```

**Key Insight**: Most SpecWeave increments ARE features (one-to-one mapping).

### Two Patterns in SpecWeave

**Pattern A: Increment = Complete Feature** (90% of cases)

```
Increment 0016-authentication
├── US-001: User Login
├── US-002: Session Management
├── US-003: Password Reset
├── US-004: MFA
├── US-005: Session Timeout
└── ✅ Complete feature (all stories implemented in one increment)
```

**Maps to External Tool**:
- **Jira**: Epic "SPEC-016: Authentication"
- **ADO**: Feature "Authentication System"
- **GitHub**: Issue #16 (Epic-like) or Project "Authentication"

**Pattern B: Increment = Feature Phase** (10% of cases)

```
Feature Spec: FS-020-github-integration (Permanent)
├── 20 User Stories total
├── Phase 1: Increment 0020 (US-001 to US-005)
├── Phase 2: Increment 0025 (US-006 to US-010)
└── Phase 3: Increment 0030 (US-011 to US-015)
```

**Maps to External Tool**:
- **Jira**: Epic "FS-020: GitHub Integration" → Stories "US-001" to "US-020"
- **ADO**: Feature "GitHub Integration" → User Stories "US-001" to "US-020"
- **GitHub**: Project "GitHub Integration" → Issues for each phase

### The Sync Challenge

**Current Sync** (FLAT):
```
Increment 0016-authentication → GitHub Issue #16
├── Description: File reference (.specweave/docs/internal/specs/spec-0016.md)
└── Tasks: ☐ T-001, ☐ T-002, ☐ T-003
```

**Problem**: Loses User Story structure! Can't see US-001, US-002, etc.

**Desired Sync** (HIERARCHICAL):
```
Increment 0016-authentication → GitHub Issue #16 (Epic-like)
├── Description:
│   ├── Executive Summary
│   ├── User Stories:
│   │   ├── US-001: User Login
│   │   │   ├── Description: "As a user..."
│   │   │   └── AC: AC-US1-01, AC-US1-02
│   │   ├── US-002: Session Management
│   │       ├── Description: "As a user..."
│   │       └── AC: AC-US2-01, AC-US2-02
│   ├── NFRs:
│   │   └── NFR-001: Login latency < 200ms
│   └── Architecture: [Link to living docs]
└── Tasks (checkboxes):
    ☐ T-001: Create Login Endpoint (implements US-001)
    ☐ T-002: JWT Token Generation (implements US-001)
    ☐ T-003: Session Management (implements US-002)
```

**Result**: Full hierarchy preserved, nothing lost!

---

## Part 2: External Tool Hierarchy Mapping

### Understanding External Tool Structures

| SpecWeave | GitHub | Jira | Azure DevOps |
|-----------|--------|------|--------------|
| **Feature Spec** | Project / Milestone | Epic | Feature |
| **Increment** | Issue (Epic-like) | Epic (if no Feature Spec) | Feature (if no parent) |
| **User Story** | Issue section (not separate) | Story | User Story |
| **Task** | Checkbox in Issue | Sub-task | Task |

### Mapping Strategy by Tool

#### Option 1: GitHub (Flat Hierarchy with Rich Content)

**GitHub Limitations**:
- No native "Epic" concept
- No parent-child issue relationships (except Projects)
- Best we can do: Rich issue description + checkboxes

**Mapping**:
```
Increment 0016-authentication → GitHub Issue #16
├── Title: "[FEATURE] Authentication System"
├── Labels: ["feature", "specweave-increment", "P1"]
├── Description (Markdown):
│   ├── ## Executive Summary
│   ├── ## User Stories
│   │   ├── ### US-001: User Login
│   │   │   <details>
│   │   │   <summary>Details</summary>
│   │   │   **As a** user...
│   │   │   **Acceptance Criteria**:
│   │   │   - AC-US1-01: User can enter credentials
│   │   │   - AC-US1-02: User receives JWT token
│   │   │   </details>
│   │   ├── ### US-002: Session Management
│   │       <details>...</details>
│   ├── ## NFRs
│   │   └── NFR-001: Login latency < 200ms
│   ├── ## Architecture
│   │   └── [High-Level Design](link-to-living-docs)
│   └── ## Implementation Progress
│       └── [Living Docs](link-to-living-docs)
└── Tasks (checkboxes):
    ☐ **US-001**: User Login
      ☐ T-001: Create Login Endpoint
      ☐ T-002: JWT Token Generation
    ☐ **US-002**: Session Management
      ☐ T-003: Session Management Logic
```

**Benefits**:
- ✅ User Stories visible in issue description (collapsible)
- ✅ AC-IDs preserved (traceability)
- ✅ Task checkboxes grouped by User Story
- ✅ Links to living docs (full details)

**Alternative: GitHub Projects** (Optional)
```
GitHub Project: "Authentication"
├── Issue #16: Authentication System (Epic-like)
│   ├── Contains all User Stories in description
│   └── Checkboxes for tasks
└── Optional: Create separate issues for each User Story (if team prefers)
    ├── Issue #17: US-001 User Login
    ├── Issue #18: US-002 Session Management
    └── (Linked to Epic #16)
```

#### Option 2: Jira (Full Hierarchy)

**Jira Native Hierarchy**:
```
Epic
├── Story 1
│   ├── Sub-task 1
│   └── Sub-task 2
└── Story 2
```

**Mapping**:
```
Increment 0016-authentication → Jira Epic "SPEC-016"
├── Summary: "Authentication System"
├── Description:
│   ├── Executive Summary
│   ├── Business Value
│   ├── NFRs: NFR-001, NFR-002
│   └── Architecture: [Link to living docs]
├── Story "US-001: User Login"
│   ├── Description: "As a user..."
│   ├── Acceptance Criteria:
│   │   ├── AC-US1-01: User can enter credentials
│   │   └── AC-US1-02: User receives JWT token
│   ├── Sub-task "T-001: Create Login Endpoint"
│   └── Sub-task "T-002: JWT Token Generation"
└── Story "US-002: Session Management"
    ├── Description: "As a user..."
    ├── Acceptance Criteria:
    │   └── AC-US2-01: Session lasts 24 hours
    └── Sub-task "T-003: Session Management Logic"
```

**Benefits**:
- ✅ Full hierarchy (Epic → Story → Sub-task)
- ✅ User Stories are separate items (can be assigned, tracked independently)
- ✅ AC-IDs in Story description
- ✅ Complete traceability

**Sync Strategy**:
1. Create Jira Epic from increment (if doesn't exist)
2. Create Jira Stories from User Stories (if don't exist)
3. Create Sub-tasks from tasks.md (if don't exist)
4. Update Epic description with executive summary, NFRs, architecture links

#### Option 3: Azure DevOps (Full Hierarchy)

**ADO Native Hierarchy**:
```
Feature
├── User Story 1
│   ├── Task 1
│   └── Task 2
└── User Story 2
```

**Mapping**:
```
Increment 0016-authentication → ADO Feature "Authentication System"
├── Title: "Authentication System"
├── Description:
│   ├── Executive Summary
│   ├── Business Value
│   ├── NFRs: NFR-001, NFR-002
│   └── Architecture: [Link to living docs]
├── User Story "US-001: User Login"
│   ├── Description: "As a user..."
│   ├── Acceptance Criteria:
│   │   ├── AC-US1-01: User can enter credentials
│   │   └── AC-US1-02: User receives JWT token
│   ├── Task "T-001: Create Login Endpoint"
│   └── Task "T-002: JWT Token Generation"
└── User Story "US-002: Session Management"
    ├── Description: "As a user..."
    ├── Acceptance Criteria:
    │   └── AC-US2-01: Session lasts 24 hours
    └── Task "T-003: Session Management Logic"
```

**Benefits**:
- ✅ Full hierarchy (Feature → User Story → Task)
- ✅ Native ADO work item types
- ✅ User Stories are separate items
- ✅ Complete traceability

**Sync Strategy**:
1. Create ADO Feature from increment (if doesn't exist)
2. Create User Stories from User Stories (if don't exist)
3. Create Tasks from tasks.md (if don't exist)
4. Update Feature description with executive summary, NFRs, architecture links

### Sync Complexity Levels

**Level 1: Simple Sync** (GitHub - Rich Description Only)
- Create/update Issue with rich description (User Stories in markdown)
- Update task checkboxes
- No separate issues for User Stories

**Level 2: Full Hierarchy Sync** (Jira/ADO)
- Create/update Epic/Feature
- Create/update Stories/User Stories (separate work items)
- Create/update Sub-tasks/Tasks
- Maintain parent-child relationships

**Level 3: Bidirectional Sync** (Future)
- Pull status updates from external tool
- Sync comments, attachments, time tracking
- Conflict resolution

---

## Part 3: Atomic Sync - Complete Extraction

### The Complete Flow

```
Input: increments/0016-authentication/spec.md
    ↓
[Section Parser]
    ↓
Sections:
├── User Stories (US-001, US-002, ...)
├── NFR (NFR-001, NFR-002, ...)
├── Architecture (HLD, diagrams)
├── Decisions (ADRs)
├── Business Value
├── External Links
└── Overview
    ↓
[Item Extractor]
    ↓
Atomic Items:
├── US-001 (type: user-story)
├── US-002 (type: user-story)
├── NFR-001 (type: nfr)
├── ADR-001 (type: adr)
├── HLD (type: architecture)
└── Epic (type: epic) ← NEW!
    ↓
[Content Classifier]
    ↓
Classified Items (project: backend, confidence: 0.9)
    ↓
[Atomic File Generator]
    ↓
Living Docs Files:
├── specs/backend/us-001-user-login.md
├── specs/backend/us-002-session-management.md
├── specs/backend/nfr/nfr-001-auth-performance.md
├── architecture/auth-oauth-flow.md
├── architecture/adr/adr-001-oauth-vs-jwt.md
└── specs/backend/epic-0016-authentication.md ← NEW!
    ↓
[External Tool Sync]
    ↓
External Tool (GitHub/Jira/ADO):
└── Epic/Feature with User Stories in description/hierarchy
```

### NEW: Epic-Level Extraction

**Epic File** (NEW atomic type):

**Purpose**: Preserve increment-level metadata (business value, roadmap, external links)

**Location**: `specs/{project}/epic-{increment-id}.md`

**Example**: `specs/backend/epic-0016-authentication.md`

```markdown
---
id: epic-0016-authentication
title: "Epic: Authentication System"
type: epic
increment: "0016-authentication"
project: "backend"
status: "complete"
priority: "P1"
created: "2025-11-01"
completed: "2025-11-13"
external_links:
  github: "https://github.com/org/repo/issues/16"
  jira: "https://jira.org/browse/SPEC-016"
  ado: "https://dev.azure.com/org/project/_workitems/edit/016"
---

# Epic: Authentication System

## Executive Summary

Implement OAuth 2.0 authentication with JWT tokens for secure user access.

## Business Value

- **Security**: Industry-standard authentication reduces breach risk by 80%
- **Scalability**: JWT tokens enable horizontal scaling (10x capacity)
- **User Experience**: SSO reduces login friction by 60%

## User Stories

This epic contains 5 user stories:

- [US-001: User Login](./us-001-user-login.md) - ✅ Complete
- [US-002: Session Management](./us-002-session-management.md) - ✅ Complete
- [US-003: Password Reset](./us-003-password-reset.md) - ✅ Complete
- [US-004: MFA](./us-004-mfa.md) - ✅ Complete
- [US-005: Session Timeout](./us-005-session-timeout.md) - ✅ Complete

**Progress**: 5/5 user stories complete (100%)

## NFRs

- [NFR-001: Authentication Performance](./nfr/nfr-001-auth-performance.md) - Login < 200ms
- [NFR-002: Authentication Reliability](./nfr/nfr-002-auth-reliability.md) - 99.9% uptime

## Architecture

- [Authentication OAuth Flow](../../architecture/auth-oauth-flow.md) - High-Level Design
- [ADR-001: OAuth vs JWT](../../architecture/adr/adr-001-oauth-vs-jwt.md) - Architecture Decision

## Implementation

**Increment**: [0016-authentication](../../../../increments/0016-authentication/tasks.md)

**Tasks** (embedded in tasks.md):
- T-001: Create Login Endpoint (US-001)
- T-002: JWT Token Generation (US-001)
- T-003: Session Management (US-002)
- T-004: Password Reset Flow (US-003)
- T-005: MFA Integration (US-004)
- T-006: Session Timeout Logic (US-005)

**Test Coverage**:
- Unit: 90% (target: 90%+)
- Integration: 87% (target: 85%+)
- E2E: 82% (target: 80%+)

## External Tool Integration

**GitHub**: [Issue #16](https://github.com/org/repo/issues/16)
**Jira**: [Epic SPEC-016](https://jira.org/browse/SPEC-016)
**ADO**: [Feature 016](https://dev.azure.com/org/project/_workitems/edit/016)

## Timeline

- **Started**: 2025-11-01
- **Completed**: 2025-11-13
- **Duration**: 13 days
- **Velocity**: 5 stories / 13 days = 0.38 stories/day

---

_Source: Increment 0016-authentication | Last Updated: 2025-11-13_
```

**Key Features**:
- ✅ Business value (why this epic matters)
- ✅ Links to all User Stories (complete picture)
- ✅ Links to NFRs (performance, reliability)
- ✅ Links to architecture (HLD, ADRs)
- ✅ Links to tasks.md (implementation details)
- ✅ External tool links (GitHub, Jira, ADO)
- ✅ Timeline and velocity metrics

### Complete Extraction Matrix

| Content Type | Extract? | Goes To | External Tool |
|--------------|----------|---------|---------------|
| **Executive Summary** | ✅ Yes | Epic file | Epic/Feature description |
| **Business Value** | ✅ Yes | Epic file | Epic/Feature description |
| **User Stories** | ✅ Yes | `specs/{project}/us-*.md` | Story/Issue (Jira/ADO) OR Section (GitHub) |
| **Acceptance Criteria** | ✅ Yes | User Story files | Story description |
| **NFRs** | ✅ Yes | `specs/{project}/nfr/nfr-*.md` | Epic description OR separate NFR items |
| **Architecture (HLD)** | ✅ Yes | `architecture/*.md` | Link in Epic description |
| **ADRs** | ✅ Yes | `architecture/adr/adr-*.md` | Link in Epic description |
| **Test Strategy** | ❌ No | Stays in `tasks.md` | NOT synced (embedded in tasks) |
| **Tasks** | ❌ No | Stays in `tasks.md` | Checkboxes in Epic/Feature |
| **External Links** | ✅ Yes | Epic file + metadata | Linked issues/work items |

**Result**: **100% of permanent content extracted**, **0% lost!**

---

## Part 4: Implementation Guide

### Step 1: Parse Increment Spec

**Input**: `increments/0016-authentication/spec.md`

**Code**:
```typescript
const sections = SectionParser.parse(specContent);
// Returns: [
//   { type: 'overview', content: '...' },
//   { type: 'business-value', content: '...' },
//   { type: 'user-stories', content: '...' },
//   { type: 'nfr', content: '...' },
//   { type: 'architecture', content: '...' },
//   { type: 'decisions', content: '...' },
// ]
```

### Step 2: Extract Atomic Items

**Code**:
```typescript
const items = [];

// Extract Epic-level content (NEW!)
const epic = ItemExtractor.extractEpic(spec, sections);
items.push(epic);

// Extract User Stories
for (const userStory of ItemExtractor.extractUserStories(sections)) {
  items.push(userStory);
}

// Extract NFRs
for (const nfr of ItemExtractor.extractNFRs(sections)) {
  items.push(nfr);
}

// Extract Architecture
for (const arch of ItemExtractor.extractArchitecture(sections)) {
  items.push(arch);
}

// Extract ADRs
for (const adr of ItemExtractor.extractADRs(sections)) {
  items.push(adr);
}

// Returns: [
//   { id: 'epic-0016', type: 'epic', title: 'Authentication System', ... },
//   { id: 'US-001', type: 'user-story', title: 'User Login', ... },
//   { id: 'US-002', type: 'user-story', title: 'Session Management', ... },
//   { id: 'NFR-001', type: 'nfr', title: 'Authentication Performance', ... },
//   { id: 'HLD-001', type: 'architecture', title: 'OAuth Flow', ... },
//   { id: 'ADR-001', type: 'adr', title: 'OAuth vs JWT', ... },
// ]
```

### Step 3: Generate Living Docs Files

**Code**:
```typescript
for (const item of items) {
  const targetPath = AtomicFileGenerator.getTargetPath(item);
  const content = AtomicFileGenerator.generateContent(item);

  await fs.writeFile(targetPath, content);
}

// Creates:
// - specs/backend/epic-0016-authentication.md
// - specs/backend/us-001-user-login.md
// - specs/backend/us-002-session-management.md
// - specs/backend/nfr/nfr-001-auth-performance.md
// - architecture/auth-oauth-flow.md
// - architecture/adr/adr-001-oauth-vs-jwt.md
```

### Step 4: Sync to External Tools

**GitHub (Rich Description)**:
```typescript
const epicItem = items.find(i => i.type === 'epic');
const userStories = items.filter(i => i.type === 'user-story');
const nfrs = items.filter(i => i.type === 'nfr');

const githubDescription = GitHubSyncEngine.buildDescription({
  epic: epicItem,
  userStories,
  nfrs,
  architectureLinks: items.filter(i => i.type === 'architecture'),
});

await GitHub.createOrUpdateIssue({
  title: `[FEATURE] ${epicItem.title}`,
  body: githubDescription,
  labels: ['feature', 'specweave-increment', epicItem.priority],
});
```

**Jira (Full Hierarchy)**:
```typescript
// 1. Create Epic
const epic = await Jira.createEpic({
  summary: epicItem.title,
  description: JiraSyncEngine.formatEpicDescription(epicItem),
});

// 2. Create Stories
for (const userStory of userStories) {
  const story = await Jira.createStory({
    summary: userStory.title,
    description: JiraSyncEngine.formatStoryDescription(userStory),
    epicLink: epic.key,
  });

  // 3. Create Sub-tasks
  const tasks = TaskMapper.getTasksForUserStory(userStory.id);
  for (const task of tasks) {
    await Jira.createSubTask({
      summary: task.title,
      parent: story.key,
    });
  }
}
```

**ADO (Full Hierarchy)**:
```typescript
// Similar to Jira, but using ADO API
const feature = await ADO.createFeature({ ... });
const userStories = await ADO.createUserStories({ parent: feature.id });
const tasks = await ADO.createTasks({ parent: userStory.id });
```

---

## Part 5: Validation - Nothing Lost!

### Checklist: All Content Extracted

**From spec.md**:
- [x] Executive Summary → Epic file
- [x] Business Value → Epic file
- [x] User Stories (US-001, US-002, ...) → Individual files
- [x] Acceptance Criteria → User Story files
- [x] Business Rationale → User Story files
- [x] NFRs (NFR-001, NFR-002, ...) → Individual files
- [x] Architecture (HLD) → architecture/*.md
- [x] Decisions (ADRs) → architecture/adr/*.md
- [x] External Links → Epic file + metadata
- [x] Timeline → Epic file

**Not Extracted** (stays in tasks.md):
- [x] Test Plans → Embedded in tasks.md (execution context)
- [x] Tasks → Embedded in tasks.md (temporary, execution-specific)

**Synced to External Tools**:
- [x] Epic/Feature → GitHub Issue / Jira Epic / ADO Feature
- [x] User Stories → GitHub Description / Jira Stories / ADO User Stories
- [x] Tasks → Checkboxes / Sub-tasks / Tasks
- [x] Links to Living Docs → All external items

**Result**: ✅ **100% coverage**, nothing lost!

---

## Part 6: Complete Example

### Input: Increment Spec

**File**: `increments/0016-authentication/spec.md` (500 lines)

```markdown
---
title: Authentication System
increment: 0016-authentication
project: backend
priority: P1
---

# Increment 0016: Authentication System

## Executive Summary

Implement OAuth 2.0 authentication with JWT tokens...

## Business Value

- **Security**: Industry-standard authentication...
- **Scalability**: JWT tokens enable horizontal scaling...

## User Stories

#### US-001: User Login
**As a** user...
**Acceptance Criteria**:
- **AC-US1-01**: User can enter credentials
- **AC-US1-02**: User receives JWT token

#### US-002: Session Management
...

## NFR

### NFR-001: Authentication Performance
**Metric**: Login latency < 200ms...

## Architecture

### High-Level Design
OAuth 2.0 flow with JWT tokens...

### Decision: OAuth vs JWT
**Context**: We need to choose...
**Decision**: Use OAuth 2.0 with JWT
**Consequences**: Industry standard...
```

### Output: Living Docs (6 Files)

**1. Epic File**: `specs/backend/epic-0016-authentication.md`
- Executive Summary
- Business Value
- Links to all User Stories (complete picture)
- Links to NFRs
- Links to Architecture
- External tool links
- Timeline and metrics

**2-3. User Story Files**: `specs/backend/us-001-user-login.md`, `us-002-session-management.md`
- Description ("As a user...")
- Acceptance Criteria (AC-US1-01, AC-US1-02)
- Business Rationale
- Links to tasks.md (implementation)
- Links to Epic file (parent)

**4. NFR File**: `specs/backend/nfr/nfr-001-auth-performance.md`
- Metric (Login < 200ms)
- Acceptance criteria (99th percentile < 500ms)
- Links to User Stories (which stories this NFR affects)

**5. Architecture File**: `architecture/auth-oauth-flow.md`
- High-Level Design (OAuth 2.0 flow)
- Sequence diagram
- Links to ADR (decision)

**6. ADR File**: `architecture/adr/adr-001-oauth-vs-jwt.md`
- Context
- Decision
- Consequences

### Output: External Tools

**GitHub Issue #16**:
```markdown
# [FEATURE] Authentication System

## Executive Summary

Implement OAuth 2.0 authentication with JWT tokens...

## Business Value

- **Security**: Industry-standard authentication...
- **Scalability**: JWT tokens enable horizontal scaling...

## User Stories

<details>
<summary>US-001: User Login</summary>

**As a** user
**I want** to log in with email/password
**So that** I can access protected resources

**Acceptance Criteria**:
- AC-US1-01: User can enter credentials
- AC-US1-02: User receives JWT token

[View in Living Docs](link)
</details>

<details>
<summary>US-002: Session Management</summary>
...
</details>

## NFRs

- NFR-001: Login latency < 200ms (p50)

## Architecture

- [OAuth 2.0 Flow](link-to-living-docs)
- [ADR-001: OAuth vs JWT](link-to-living-docs)

## Implementation Progress

[View Complete Documentation](link-to-epic-file)

---

## Tasks

☐ **US-001: User Login**
  ☐ T-001: Create Login Endpoint
  ☐ T-002: JWT Token Generation
☐ **US-002: Session Management**
  ☐ T-003: Session Management Logic
```

**Jira Epic SPEC-016**:
```
Epic: SPEC-016 Authentication System
Description: [Executive Summary + Business Value]

Stories:
├── US-001: User Login
│   ├── Description: "As a user..."
│   ├── AC: AC-US1-01, AC-US1-02
│   ├── Sub-task: T-001 Create Login Endpoint
│   └── Sub-task: T-002 JWT Token Generation
└── US-002: Session Management
    ├── Description: "As a user..."
    ├── AC: AC-US2-01
    └── Sub-task: T-003 Session Management Logic
```

**Result**: Full hierarchy preserved in Jira, rich content in GitHub!

---

## Part 7: Configuration

**Enable Atomic Sync** (`.specweave/config.json`):

```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "atomicSync": true,
      "extractEpic": true,              // ← NEW: Extract Epic-level content
      "mergeStrategy": "smart",
      "crossLink": true,
      "preserveOriginal": true,
      "splitByCategory": true
    }
  },
  "sync": {
    "enabled": true,
    "activeProfile": "default",
    "settings": {
      "syncHierarchy": "full",          // ← NEW: full | flat | none
      "syncUserStories": true,          // ← NEW: Create separate Stories (Jira/ADO)
      "syncTasks": true,                // ← Create Sub-tasks/Tasks
      "autoCreateEpic": true            // ← Auto-create Epic/Feature on sync
    },
    "profiles": {
      "default": {
        "provider": "github",           // github | jira | ado
        "config": {
          "owner": "org",
          "repo": "project",
          "syncStrategy": "rich-description"  // rich-description | full-hierarchy
        }
      }
    }
  }
}
```

**Sync Strategies**:

1. **Rich Description** (GitHub):
   - User Stories in Epic description (collapsible sections)
   - Tasks as checkboxes (grouped by User Story)
   - No separate issues for User Stories

2. **Full Hierarchy** (Jira/ADO):
   - Epic/Feature created
   - User Stories as separate items (Story/User Story)
   - Tasks as separate items (Sub-task/Task)
   - Parent-child relationships maintained

---

## Part 8: Summary

### The Definitive Flow

```
1. Increment Spec (spec.md)
   ├── Executive Summary
   ├── Business Value
   ├── User Stories (US-001, US-002, ...)
   ├── NFRs (NFR-001, NFR-002, ...)
   ├── Architecture (HLD, ADRs)
   └── External Links

2. Atomic Sync Engine
   ├── Parse sections
   ├── Extract Epic (NEW!)
   ├── Extract User Stories
   ├── Extract NFRs
   ├── Extract Architecture
   └── Extract ADRs

3. Living Docs Files
   ├── specs/backend/epic-0016-authentication.md (NEW!)
   ├── specs/backend/us-001-user-login.md
   ├── specs/backend/us-002-session-management.md
   ├── specs/backend/nfr/nfr-001-auth-performance.md
   ├── architecture/auth-oauth-flow.md
   └── architecture/adr/adr-001-oauth-vs-jwt.md

4. External Tool Sync
   ├── GitHub: Issue with rich description (collapsible User Stories)
   ├── Jira: Epic → Stories → Sub-tasks (full hierarchy)
   └── ADO: Feature → User Stories → Tasks (full hierarchy)
```

### Key Principles

1. **Increment ≈ Feature**: Most increments define a complete feature
2. **Epic-Level Content**: Extract Executive Summary, Business Value, timeline
3. **Hierarchical Sync**: Preserve User Stories → Tasks structure
4. **100% Coverage**: Nothing lost (all content extracted or referenced)
5. **Tool-Specific Strategies**: Rich description (GitHub) vs Full hierarchy (Jira/ADO)

### Validation Checklist

- [x] All User Stories extracted
- [x] All Acceptance Criteria preserved
- [x] All NFRs extracted
- [x] All Architecture extracted
- [x] All ADRs extracted
- [x] Epic-level metadata extracted
- [x] External tool links preserved
- [x] Test plans stay in tasks.md (embedded)
- [x] Tasks stay in tasks.md (temporary)
- [x] Synced to external tool with hierarchy

**Result**: ✅ Complete, lossless, hierarchical sync!

---

**Status**: ✅ Definitive Guide - Ready for Implementation
**Next Steps**:
1. Implement Epic extraction
2. Implement hierarchical external tool sync
3. Test with real increments
4. Validate nothing is lost

---

**Approvers**: SpecWeave Core Team
**Date**: 2025-11-13
