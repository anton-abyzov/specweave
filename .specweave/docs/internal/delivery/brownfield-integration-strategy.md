# Brownfield Project Integration Strategy

**Status**: draft
**Author**: SpecWeave Core Team
**Created**: 2025-10-26
**Last Updated**: 2025-10-26

---

## Overview

**CRITICAL**: For brownfield projects, SpecWeave MUST:
1. **Analyze existing structure** - Scan folders, identify doc types, map to five pillars
2. **Map to existing tools** - Sync with Jira, Azure DevOps (ADO), GitHub Projects
3. **Maintain bi-directional sync** - Keep SpecWeave increments in sync with external tools
4. **Provide traceability** - Full chain from Epic → PRD → HLD → ADR → Spec → Code

---

## Phase 1: Brownfield Structure Analysis

### What Gets Analyzed

**Scan entire project** for:
- Existing documentation folders
- README files, wikis
- Architecture diagrams
- Decision logs
- API specifications
- Runbooks, playbooks
- Project management artifacts (backlog, roadmap)

### Automated Scanning

**Skill**: `brownfield-analyzer` (see `src/skills/brownfield-analyzer/SKILL.md`)

**Scan Command**:
```bash
specweave analyze --path /path/to/project
```

**Output**: High-level structure report

```markdown
# Brownfield Analysis Report

## Existing Documentation Structure

Found the following folders:
- `docs/` - 45 markdown files
- `documentation/` - 23 markdown files
- `wiki/` - 12 markdown files
- `architecture/` - 8 architecture diagrams (PNG, drawio)
- `api-specs/` - 3 OpenAPI YAML files
- `runbooks/` - 5 operational runbooks

## Document Type Classification

### Strategy Documents (PRD candidates)
- `docs/requirements/product-spec.md` → `docs/internal/strategy/prd-product.md`
- `wiki/roadmap-2025.md` → `docs/internal/delivery/roadmap.md`

### Architecture Documents (HLD/ADR candidates)
- `architecture/system-design.md` → `docs/internal/architecture/hld-system-overview.md`
- `docs/decisions/use-postgres.md` → `docs/internal/architecture/adr/0001-use-postgres.md`
- `api-specs/booking-api.yaml` → `docs/internal/specs/spec-0001-booking-api/spec.md`

### Operations Documents (Runbook candidates)
- `runbooks/api-server-runbook.md` → `docs/internal/operations/runbook-api-server.md`

### Governance Documents
- `docs/security-policy.md` → `docs/internal/governance/security-model.md`

## Recommended Migration Plan

1. Create `docs/internal/` structure
2. Migrate 45 documents to five pillars
3. Convert PNG diagrams to Mermaid (23 diagrams)
4. Number ADRs sequentially (8 decision docs found)
5. Sync with Jira (12 active epics found)

## External Tool Integration

### Jira Integration
- Project: PROJ-123
- Active Epics: 12
- Active Stories: 45
- Suggested mapping: Epic → Increment

### GitHub Projects
- Active projects: 3
- Total issues: 67
- Suggested mapping: Milestone → Release Plan
```

---

## Phase 2: External Tool Mapping

### Jira Concept Mapping

| Jira Concept | SpecWeave Concept | Mapping Rule |
|--------------|-------------------|--------------|
| **Epic** | **Increment** (`0001-feature-name/`) | One Epic = One Increment |
| **Story** (large) | **PRD** (`docs/internal/strategy/prd-{name}.md`) | Strategic stories → PRD |
| **Story** (technical) | **Spec** (`docs/internal/specs/spec-0001-{name}/spec.md`) | Technical stories → Spec |
| **Task** | **Task** (in increment's `tasks.md`) | Tasks within increment |
| **Bug** | **Incident** (`docs/internal/operations/incidents/`) | Operational issues |
| **Sprint** | **Release Plan** (`docs/internal/delivery/release-v1.0.md`) | Sprint planning |
| **Component** | **Module** (docs structure) | Code modules |

**Metadata Sync**:
```yaml
# features/0001-user-authentication/metadata.yaml
---
increment: 0001
name: user-authentication
external_ids:
  jira:
    epic: PROJ-123
    stories:
      - PROJ-124  # Maps to PRD
      - PROJ-125  # Maps to Spec 0001
  ado: null
  github: null
status: in_progress
created: 2025-01-15
updated: 2025-01-20
---
```

### Azure DevOps (ADO) Mapping

| ADO Concept | SpecWeave Concept | Mapping Rule |
|-------------|-------------------|--------------|
| **Epic** | **Increment** | One Epic = One Increment |
| **Feature** | **PRD** or **Spec** | Depends on scope (business = PRD, technical = Spec) |
| **User Story** | **PRD** or **Spec** | Same as Feature |
| **Task** | **Task** (in increment) | Tasks within increment |
| **Bug** | **Incident** | Operational issues |
| **Sprint** | **Release Plan** | Sprint planning |
| **Work Item** | Various | Depends on type |

**Metadata Sync**:
```yaml
# features/0002-payment-processing/metadata.yaml
---
increment: 0002
name: payment-processing
external_ids:
  jira: null
  ado:
    epic: 456789
    features:
      - 456790  # Maps to PRD
      - 456791  # Maps to Spec 0001
  github: null
status: planned
created: 2025-01-22
---
```

### GitHub Projects Mapping

| GitHub Concept | SpecWeave Concept | Mapping Rule |
|----------------|-------------------|--------------|
| **Milestone** | **Release Plan** | Milestone = Release |
| **Project** | **Increment** or **Release** | Depends on scope |
| **Issue** | **Task** or **Spec** | Technical issue → Spec, task → Task |
| **Pull Request** | **Implementation** | PR linked to increment |

---

## Phase 3: Increment Structure with External IDs

### Updated Increment Structure

```
features/0001-user-authentication/
├── metadata.yaml              # ✨ NEW - External tool IDs, status
├── spec.md                    # Feature specification
├── plan.md                    # Implementation plan
├── tasks.md                   # Executable tasks
├── tests.md                   # Test strategy
├── context-manifest.yaml      # Context loading
├── sync/                      # ✨ NEW - Sync metadata
│   ├── jira-sync.json         # Last sync status with Jira
│   ├── ado-sync.json          # Last sync status with ADO
│   └── github-sync.json       # Last sync status with GitHub
└── docs/                      # Related docs
    ├── prd.md → ../../docs/internal/strategy/prd-user-auth.md (symlink)
    ├── hld.md → ../../docs/internal/architecture/hld-user-auth.md (symlink)
    └── adrs/
        └── 0001.md → ../../docs/internal/architecture/adr/0001-use-oauth.md (symlink)
```

### metadata.yaml Schema

```yaml
---
# Increment metadata
increment: 0001
name: user-authentication
title: "User Authentication with OAuth 2.0"
description: "Implement secure user authentication using OAuth 2.0"

# Status tracking
status: in_progress  # planned | in_progress | completed | on_hold | cancelled
priority: P1         # P1 (critical) | P2 (high) | P3 (medium) | P4 (low)

# External tool IDs (bi-directional sync)
external_ids:
  jira:
    project: PROJ
    epic: PROJ-123
    epic_url: https://company.atlassian.net/browse/PROJ-123
    stories:
      - PROJ-124  # PRD story
      - PROJ-125  # Spec story
    sync_enabled: true
    last_sync: 2025-01-20T10:30:00Z
    sync_status: success

  ado:
    project: MyProject
    epic: 456789
    epic_url: https://dev.azure.com/company/MyProject/_workitems/edit/456789
    features:
      - 456790
      - 456791
    sync_enabled: false
    last_sync: null
    sync_status: null

  github:
    repo: company/repo
    milestone: 5
    milestone_url: https://github.com/company/repo/milestone/5
    issues:
      - 123
      - 124
    sync_enabled: false
    last_sync: null
    sync_status: null

# Related documentation (references)
docs:
  prd: docs/internal/strategy/prd-user-authentication.md
  hld: docs/internal/architecture/hld-user-authentication.md
  adrs:
    - docs/internal/architecture/adr/0001-use-oauth2.md
    - docs/internal/architecture/adr/0002-use-auth0.md
  specs:
    - docs/internal/specs/spec-0001-auth-api/spec.md
  runbooks:
    - docs/internal/operations/runbook-auth-service.md

# Team and ownership
team: backend-team
owner: @john-doe
reviewers:
  - @architect
  - @security-lead
  - @tech-lead

# Dates
created: 2025-01-15T09:00:00Z
started: 2025-01-16T10:00:00Z
completed: null
updated: 2025-01-20T15:30:00Z

# Milestones
milestones:
  - name: PRD Complete
    date: 2025-01-16
    status: completed
  - name: HLD Complete
    date: 2025-01-18
    status: completed
  - name: Implementation Complete
    date: 2025-02-01
    status: in_progress
  - name: Testing Complete
    date: 2025-02-05
    status: planned
  - name: Production Deployment
    date: 2025-02-10
    status: planned

# Tags
tags:
  - authentication
  - security
  - oauth
  - backend
---
```

---

## Phase 4: Bi-Directional Sync Mechanism

### Sync Flow

![delivery-brownfield-integration-strategy-0](../architecture/diagrams/delivery-brownfield-integration-strategy-0.svg)

### Sync Commands

**Manual Sync**:
```bash
# Sync specific increment with Jira
specweave sync --increment 0001 --tool jira

# Sync all increments with all configured tools
specweave sync --all

# Pull changes from Jira to SpecWeave
specweave sync --increment 0001 --tool jira --direction pull

# Push changes from SpecWeave to Jira
specweave sync --increment 0001 --tool jira --direction push
```

**Automatic Sync** (via hooks):


### Sync Logic

**When Jira Epic is Updated**:
1. **Detect change** via webhook or polling
2. **Compare** Jira Epic metadata with `metadata.yaml`
3. **Identify differences**:
   - Title changed → Update increment name
   - Status changed → Update increment status
   - New stories added → Create new PRD/Spec
   - Stories completed → Update tasks
4. **Update SpecWeave**:
   - Modify `metadata.yaml`
   - Update related PRD/Spec if needed
   - Log sync in `sync/jira-sync.json`
5. **Commit changes** with message: `sync: update from Jira Epic PROJ-123`

**When SpecWeave Increment is Updated**:
1. **Detect change** via git hook or manual sync
2. **Compare** `metadata.yaml` with Jira Epic
3. **Identify differences**:
   - Status changed → Update Jira Epic status
   - New ADR/Spec created → Create Jira story
   - Tasks completed → Update Jira tasks
4. **Update Jira**:
   - API call to Jira REST API
   - Update Epic fields
   - Create/update stories
   - Log sync in `sync/jira-sync.json`

### Conflict Resolution

**If both changed** (since last sync):
1. **Prompt user** for resolution
2. **Options**:
   - Use Jira version (pull)
   - Use SpecWeave version (push)
   - Merge manually
3. **Log conflict** in `sync/{tool}-sync.json`

---

## Phase 5: Traceability Chain

### Full Traceability Matrix

```
Jira Epic PROJ-123 "User Authentication"
    ↓
SpecWeave Increment 0001-user-authentication/
    ↓
metadata.yaml (tracks Jira Epic PROJ-123)
    ↓
docs/internal/strategy/prd-user-authentication.md
    ↓
docs/internal/architecture/hld-user-authentication.md
    ↓
docs/internal/architecture/adr/0001-use-oauth2.md
docs/internal/architecture/adr/0002-use-auth0.md
    ↓
docs/internal/specs/spec-0001-auth-api/spec.md
    ↓
src/services/auth/
    ↓
tests/e2e/auth.spec.ts
    ↓
docs/internal/operations/runbook-auth-service.md
```

**Bi-directional traceability**:
- From **Jira Epic** → Can find **PRD, HLD, ADR, Spec, Code, Tests, Runbook**
- From **Code** → Can find **Increment, PRD, Jira Epic**
- From **ADR** → Can find **Jira stories, PRD, affected Code**

### Traceability Commands

```bash
# Find all docs related to Jira Epic PROJ-123
specweave trace --jira PROJ-123

# Output:
# Increment: 0001-user-authentication
# PRD: docs/internal/strategy/prd-user-authentication.md
# HLD: docs/internal/architecture/hld-user-authentication.md
# ADRs:
#   - docs/internal/architecture/adr/0001-use-oauth2.md
#   - docs/internal/architecture/adr/0002-use-auth0.md
# Specs:
#   - docs/internal/specs/spec-0001-auth-api/spec.md
# Code: src/services/auth/
# Tests: tests/e2e/auth.spec.ts
# Runbook: docs/internal/operations/runbook-auth-service.md

# Find Jira Epic from source code file
specweave trace --file src/services/auth/index.ts

# Output:
# Increment: 0001-user-authentication
# Jira Epic: PROJ-123 (https://company.atlassian.net/browse/PROJ-123)
# PRD: docs/internal/strategy/prd-user-authentication.md
```

---

## Brownfield Analysis Workflow

### Step 1: Initial Analysis

```bash
# Run brownfield analyzer
specweave analyze --path /path/to/existing/project

# Output: analysis-report.md
```

**Report Contents**:
- Existing folder structure
- Document type classification
- Suggested migration plan
- External tool detection (Jira, ADO, GitHub)
- Estimated effort (X hours)

### Step 2: Review and Approve

**User reviews**:
- Suggested document mappings
- Jira/ADO epic mappings
- Migration plan

**User approves** or adjusts mappings

### Step 3: Automated Migration

```bash
# Run migration
specweave migrate --plan analysis-report.md --execute

# What happens:
# 1. Creates docs/internal/ structure
# 2. Copies/moves existing docs to new locations
# 3. Converts diagrams (PNG → Mermaid)
# 4. Numbers ADRs sequentially
# 5. Creates metadata.yaml for each increment
# 6. Syncs with Jira/ADO epics
# 7. Generates traceability matrix
```

### Step 4: Verify Migration

```bash
# Verify structure
specweave verify

# Output:
# ✅ All documents migrated
# ✅ 23 diagrams converted to Mermaid
# ✅ 8 ADRs numbered (0001-0008)
# ✅ 12 increments synced with Jira
# ⚠️  3 documents need manual review
```

---

## Example: Brownfield SaaS Project

**Existing Structure**:
```
my-saas-project/
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── api-spec.md
│   └── deployment.md
├── wiki/
│   ├── runbook.md
│   └── security.md
├── README.md
└── src/
```

**After SpecWeave Analysis**:
```bash
specweave analyze --path my-saas-project/
```

**Migration Plan**:
```markdown
# Migration Plan

## Document Mapping
- docs/requirements.md → docs/internal/strategy/prd-saas-platform.md
- docs/architecture.md → docs/internal/architecture/hld-saas-platform.md
- docs/api-spec.md → docs/internal/specs/spec-0001-api-design/spec.md
- docs/deployment.md → docs/internal/delivery/deployment-guide.md
- wiki/runbook.md → docs/internal/operations/runbook-api-server.md
- wiki/security.md → docs/internal/governance/security-model.md

## External Tools
- Jira Project: SAAS-123 (12 active epics)
- Suggested Increments: 12 (one per epic)

## Effort Estimate
- Migration: 2 hours
- Jira sync setup: 1 hour
- Verification: 30 minutes
- Total: 3.5 hours
```

**Execute Migration**:
```bash
specweave migrate --plan analysis-report.md --execute --sync-jira
```

**Result**:
```
my-saas-project/
├── docs/
│   ├── internal/
│   │   ├── strategy/
│   │   │   └── prd-saas-platform.md
│   │   ├── architecture/
│   │   │   └── hld-saas-platform.md
│   │   ├── specs/
│   │   │   └── spec-0001-api-design/
│   │   │       └── spec.md
│   │   ├── delivery/
│   │   │   └── deployment-guide.md
│   │   ├── operations/
│   │   │   └── runbook-api-server.md
│   │   └── governance/
│   │       └── security-model.md
│   ├── public/
│   └── DIAGRAM-CONVENTIONS.md
├── features/
│   ├── 0001-user-management/
│   │   ├── metadata.yaml  # external_ids.jira.epic: SAAS-124
│   │   └── ...
│   ├── 0002-billing/
│   │   ├── metadata.yaml  # external_ids.jira.epic: SAAS-125
│   │   └── ...
│   └── ... (12 increments total, mapped to Jira epics)
└── .specweave/
    └── config.yaml  # Jira sync configured
```

---

## Configuration Reference

### .specweave/config.yaml (Sync Configuration)

```yaml
---
# SpecWeave Configuration

sync:
  enabled: true
  mode: auto  # auto | manual
  conflict_resolution: prompt  # prompt | pull | push | merge

  jira:
    enabled: true
    url: https://company.atlassian.net
    project: PROJ
    auth:
      type: api_token
      token_env: JIRA_API_TOKEN
      email_env: JIRA_EMAIL
    sync_interval: 15m
    webhooks:
      enabled: true
      secret_env: JIRA_WEBHOOK_SECRET
    mappings:
      epic:
        to: increment
        status_map:
          "To Do": planned
          "In Progress": in_progress
          "Done": completed
          "On Hold": on_hold
      story:
        to: prd_or_spec
        business_story: prd
        technical_story: spec
      task:
        to: task
      bug:
        to: incident

  ado:
    enabled: false
    # ... similar structure

  github:
    enabled: false
    # ... similar structure

brownfield:
  analysis:
    scan_patterns:
      - "docs/**/*.md"
      - "documentation/**/*.md"
      - "wiki/**/*.md"
      - "architecture/**/*.{md,png,svg,drawio}"
      - "runbooks/**/*.md"
      - "**/*spec*.{md,yaml,json}"
    exclude_patterns:
      - "node_modules/**"
      - "vendor/**"
      - "dist/**"
    diagram_conversion:
      enabled: true
      formats:
        - png
        - drawio
        - svg
---
```

---

## Skills and Commands

### Brownfield Analyzer Skill

**Location**: `src/skills/brownfield-analyzer/SKILL.md`

**Capabilities**:
- Scan project structure
- Identify documentation types
- Classify documents by pillar
- Detect external tools (Jira, ADO)
- Generate migration plan
- Estimate effort

### Jira/ADO Sync Skills

**Location**: `src/skills/jira-sync/SKILL.md`, `src/skills/ado-sync/SKILL.md`

**Capabilities**:
- Authenticate with Jira/ADO
- Fetch epics, stories, tasks
- Create SpecWeave increments from epics
- Bi-directional sync (pull/push)
- Conflict detection and resolution
- Traceability tracking

### Commands

```bash
# Brownfield analysis
specweave analyze --path /path/to/project

# Migration
specweave migrate --plan analysis-report.md --execute

# Sync
specweave sync --all
specweave sync --increment 0001 --tool jira
specweave sync --increment 0001 --tool jira --direction pull

# Traceability
specweave trace --jira PROJ-123
specweave trace --file src/services/auth/index.ts

# Verification
specweave verify
```

---

## Related Documentation

- [docs/internal/delivery/roadmap.md](roadmap.md) - Project roadmap
- [features/README.md](../../features/README.md) - Features and increments
- [.specweave/config.yaml](../../.specweave/config.yaml) - Configuration
- [src/skills/brownfield-analyzer/SKILL.md](../../src/skills/brownfield-analyzer/SKILL.md)
- [src/skills/jira-sync/SKILL.md](../../src/skills/jira-sync/SKILL.md)
- [src/skills/ado-sync/SKILL.md](../../src/skills/ado-sync/SKILL.md)

---

**Summary**: Brownfield projects require automated analysis, external tool mapping (Jira/ADO → SpecWeave), bi-directional sync, and full traceability from Epic to Code.
