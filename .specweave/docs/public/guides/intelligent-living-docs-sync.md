# Intelligent Living Docs Sync - User Guide

**Version**: 0.18.3+
**Status**: Production-Ready
**Last Updated**: 2025-11-15

## NEW in v0.18.3: Project-Specific Tasks

User stories now include **checkable task lists** instead of just links:

```markdown
## Tasks

- [ ] **T-001**: Setup API endpoint
- [x] **T-003**: Add DB migration (completed)

> **Note**: Tasks are project-specific. See increment tasks.md for full list
```

**Benefits**:
- **Project Isolation**: Backend tasks separate from frontend tasks
- **GitHub UX**: Tasks appear as checkable checkboxes in GitHub issues
- **Traceability**: Each user story explicitly lists relevant tasks
- **Status Tracking**: Completion state synced from increment tasks.md

**See**: [Project-Specific Tasks Architecture](#project-specific-tasks) below for details.

## Quick Start

Enable intelligent sync in `.specweave/config.json`:

```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

**Result**: After every task completion, your spec.md is automatically:
1. Parsed into sections
2. Classified by content type (user stories, architecture, operations, etc.)
3. Distributed to appropriate folders
4. Cross-linked for traceability
5. Enriched with Docusaurus frontmatter

## What Is Intelligent Living Docs Sync?

**Problem**: Traditional approach copies entire `spec.md` to living docs as a single file:
```
❌ OLD WAY:
.specweave/docs/internal/specs/spec-0016-authentication.md  (5,000 lines, mixed content)
```

**Solution**: Intelligent sync parses, classifies, and organizes content:
```
✅ NEW WAY:
.specweave/docs/internal/
├── specs/backend/
│   ├── us-001-backend-api-auth.md        (User Story)
│   └── us-002-session-management.md      (User Story)
├── architecture/
│   ├── authentication-flow.md            (HLD)
│   └── adr/0001-oauth-vs-jwt.md          (ADR)
├── operations/
│   ├── runbook-auth-service.md           (Runbook)
│   └── slo-auth-availability.md          (SLO)
├── delivery/
│   └── test-strategy-authentication.md   (Test Strategy)
└── strategy/
    └── auth-business-requirements.md     (Strategy)
```

**Benefits**:
- ✅ **Better organization**: Content organized by type and project
- ✅ **Easier navigation**: Find what you need quickly
- ✅ **LLM-friendly**: Rich context for AI assistants
- ✅ **Cross-linked**: Related documents automatically linked
- ✅ **Docusaurus-ready**: Works out-of-the-box with Docusaurus
- ✅ **Multi-project support**: Separate docs for backend/frontend/mobile

## How It Works

### Workflow

```
┌─────────────────────┐
│  Task Completed     │
│  (TodoWrite event)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│  Post-Task Hook Fires   │
│  sync-living-docs.sh    │
└──────────┬──────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  Intelligent Sync (if enabled)        │
│                                       │
│  1. Parse spec.md                     │
│     → Sections + Frontmatter          │
│                                       │
│  2. Classify Sections                 │
│     → User Story? Architecture? ADR?  │
│                                       │
│  3. Detect Project                    │
│     → Backend? Frontend? Mobile?      │
│                                       │
│  4. Distribute Content                │
│     → Write to appropriate folders    │
│     → Add Docusaurus frontmatter      │
│                                       │
│  5. Generate Cross-Links              │
│     → Specs ↔ Architecture            │
│     → Operations ↔ Architecture       │
│     → Bidirectional references        │
└───────────────────────────────────────┘
           │
           ▼
    ✅ Living docs updated!
```

### Classification System

Intelligent sync automatically classifies sections into 9 categories:

| Category | Detects | Examples | Goes To |
|----------|---------|----------|---------|
| **User Story** | US-XXX pattern, "As a" format, Acceptance Criteria | US-001, US-002 | `specs/{project}/` |
| **NFR** | NFR-XXX pattern, performance metrics, SLAs | NFR-001, "99.9% uptime" | `specs/{project}/nfr/` |
| **Architecture** | HLD, LLD, system design, diagrams | "System Architecture", C4 diagrams | `architecture/` |
| **ADR** | ADR-XXX pattern, decision structure | ADR-001, "Context/Decision/Consequences" | `architecture/adr/` |
| **Operations** | Runbooks, SLOs, procedures | "Runbook:", "SLO:", incident response | `operations/` |
| **Delivery** | Test strategy, release plans, CI/CD | "Test Strategy", "Release Plan" | `delivery/` |
| **Strategy** | Business requirements, PRDs, OKRs | "Business Requirements", market analysis | `strategy/` |
| **Governance** | Security policies, compliance | "Security Policy", GDPR, SOC 2 | `governance/` |
| **Overview** | Introduction, summary sections | "Quick Overview", "Executive Summary" | `specs/{project}/` |

### Project Detection

Intelligent sync detects which project (backend/frontend/mobile) an increment belongs to:

**Scoring System**:
- Increment name contains project ID (e.g., `0016-backend-auth`) → +10 points
- Frontmatter has `project:` field → +20 points (highest confidence)
- Team name match → +5 points
- Keyword match → +3 points each
- Tech stack match → +2 points each

**Confidence**: Score normalized to 0.0-1.0 (max ~30 points = 1.0)

**Example**:
```
Increment: 0016-backend-api-authentication
Frontmatter: project: backend
Keywords: api, backend, Node.js, PostgreSQL

Score:
- "backend" in increment name: +10
- Frontmatter project: +20
- Keywords: +3 × 2 = +6
- Tech stack: +2 × 2 = +4
Total: 40 → Confidence: 1.0 (capped)

Result: Project = "backend" ✅
```

## Configuration

### Basic Configuration

**.specweave/config.json**:
```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

### Advanced Configuration

```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "splitByCategory": true,              // Organize by category
      "generateCrossLinks": true,           // Add "Related Documents" sections
      "preserveOriginal": true,             // Keep original spec.md in _archive
      "classificationConfidenceThreshold": 0.6,  // Min confidence to classify
      "fallbackProject": "default"          // Default project if detection fails
    }
  }
}
```

**Options**:

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Enable intelligent sync |
| `splitByCategory` | `true` | Organize sections by category (vs single file) |
| `generateCrossLinks` | `true` | Add "Related Documents" sections |
| `preserveOriginal` | `true` | Archive original spec.md to `_archive` folder |
| `classificationConfidenceThreshold` | `0.6` | Minimum confidence to classify (0.0-1.0) |
| `fallbackProject` | `"default"` | Default project if detection fails |

### Multi-Project Setup

**1. Define Projects in Config**:

```json
{
  "multiProject": {
    "projects": {
      "backend": {
        "name": "Backend Services",
        "description": "API and backend services",
        "keywords": ["api", "backend", "service"],
        "team": "Backend Team",
        "techStack": ["Node.js", "TypeScript", "PostgreSQL"]
      },
      "frontend": {
        "name": "Frontend Application",
        "keywords": ["frontend", "ui", "react"],
        "team": "Frontend Team",
        "techStack": ["React", "Next.js", "TypeScript"]
      },
      "mobile": {
        "name": "Mobile App",
        "keywords": ["mobile", "ios", "android"],
        "techStack": ["React Native", "Expo"]
      }
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

**2. Result**:
```
.specweave/docs/internal/specs/
├── backend/
│   ├── us-001-api-auth.md
│   ├── us-002-session-mgmt.md
│   └── README.md              # Auto-generated
├── frontend/
│   ├── us-010-login-ui.md
│   ├── us-011-dashboard.md
│   └── README.md
└── mobile/
    ├── us-020-biometric-login.md
    └── README.md
```

**3. Specify Project Explicitly** (optional):

Add to `spec.md` frontmatter:
```yaml
---
title: User Authentication
project: backend    # ← Explicit project (highest confidence)
---
```

## Features

### 1. Docusaurus Frontmatter

Every distributed file gets rich frontmatter:

```yaml
---
id: us-001-user-login
title: "US-001: User Login"
sidebar_label: "User Login"
description: "User can log in with email and password"
tags: ["user-story", "backend", "authentication"]
increment: "0016-authentication"
project: "backend"
category: "user-story"
last_updated: "2025-11-10"
status: "planning"
priority: "P1"
---
```

**Benefits**:
- Auto-generated sidebar labels
- SEO-friendly descriptions
- Searchable tags
- Source traceability
- Status tracking

### 2. Cross-Linking

Intelligent sync generates bidirectional links between related documents:

**Example**: `us-001-user-login.md`
```markdown
## Related Documents

### Implements
- [Authentication Architecture](../../architecture/auth-flow.md) - User story implements architecture design

### References
- [ADR-001: OAuth vs JWT](../../architecture/adr/0001-oauth-vs-jwt.md) - User story references architecture decision

### Defined In
- [Authentication Requirements](../../strategy/auth-requirements.md) - Referenced by Authentication Requirements
```

**Link Types**:
- **Implements**: User story → Architecture
- **Depends On**: Operations → Architecture
- **References**: General cross-reference
- **Tests For**: Test strategy → User story
- **Defined In**: Architecture → User story (backlink)
- **Related To**: Generic relationship

### 3. Original Spec Archiving

Original `spec.md` is preserved in `_archive` folder:

```
.specweave/docs/internal/specs/backend/
├── _archive/
│   └── spec-0016-authentication.md    # Original spec
├── us-001-backend-api-auth.md          # Distributed content
└── us-002-session-management.md
```

**Why?**
- Historical reference
- Rollback if needed
- Audit trail
- Compare distributed vs original

### 4. README Generation

Each project folder gets a `README.md`:

```markdown
# Backend Services Specifications

**Project**: Backend Services
**Description**: API and backend services

## Specifications

*Specifications will appear here after living docs sync.*

---

Generated by SpecWeave
```

After sync:
```markdown
# Backend Services Specifications

**Project**: Backend Services
**Description**: API and backend services
**Files**: 15

## Files

- [US-001: Backend API Authentication](./us-001-backend-api-auth.md)
- [US-002: Session Management](./us-002-session-management.md)
- [US-003: Rate Limiting](./us-003-rate-limiting.md)
...
```

## Usage

### Enable Intelligent Sync

**Step 1**: Update config:
```bash
vim .specweave/config.json
```

Add:
```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

**Step 2**: Complete a task:
```bash
/specweave:do
# Complete tasks...
```

**Result**: Living docs sync automatically after task completion!

### Manual Sync

Force sync for a specific increment:

```bash
# Via CLI (future)
specweave sync-docs --increment 0016-authentication

# Via Node.js script
node dist/hooks/lib/sync-living-docs.js 0016-authentication
```

### Disable Intelligent Sync

**Fallback to simple mode**:
```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": false    # ← Disable
    }
  }
}
```

**Result**: Simple copy of `spec.md` to `docs/internal/specs/spec-{id}.md` (legacy behavior)

## Troubleshooting

### Issue: Sections classified incorrectly

**Cause**: Low confidence score (< 0.6)

**Solution**: Add explicit markers to spec.md:
```markdown
## US-001: User Login    # ← US-XXX pattern = high confidence

## ADR-001: Database Choice    # ← ADR-XXX pattern = high confidence

## Runbook: API Service    # ← "Runbook:" prefix = high confidence
```

### Issue: Wrong project detected

**Cause**: Ambiguous increment name or missing keywords

**Solution 1 - Explicit frontmatter**:
```yaml
---
title: User Authentication
project: backend    # ← Explicit (100% confidence)
---
```

**Solution 2 - Add keywords to increment name**:
```bash
# ❌ Ambiguous
/specweave:increment "0016-authentication"

# ✅ Clear
/specweave:increment "0016-backend-authentication"
```

**Solution 3 - Add project keywords to spec**:
```markdown
# User Authentication

Quick overview: Implement OAuth authentication for **backend services** using Node.js...
# Keywords: backend, api, service → detected!
```

### Issue: No cross-links generated

**Cause**: Filenames don't share keywords

**Solution**: Use consistent naming:
```
✅ GOOD (2+ shared words):
- us-001-user-authentication.md
- authentication-flow-architecture.md
→ Shared: "authentication" → Linked!

❌ BAD (no shared words):
- us-001-login.md
- system-design.md
→ No shared words → Not linked
```

### Issue: Living docs not syncing

**Cause**: Hook not firing or sync disabled

**Check**:
```bash
# 1. Verify config
cat .specweave/config.json | grep sync_living_docs
# Should show: "sync_living_docs": true

# 2. Check hook logs
cat .specweave/logs/hooks-debug.log

# 3. Test manual sync
node dist/hooks/lib/sync-living-docs.js 0016-test
```

## Examples

### Example 1: Single Project

**.specweave/config.json**:
```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "fallbackProject": "default"
    }
  }
}
```

**spec.md**:
```markdown
---
title: User Authentication
---

## US-001: User Login
...

## Architecture
System uses OAuth 2.0...

## ADR-001: Use OAuth
...
```

**Result**:
```
.specweave/docs/internal/
├── specs/default/
│   ├── us-001-user-login.md
│   └── _archive/spec-0016-auth.md
├── architecture/
│   ├── authentication-system.md
│   └── adr/0001-use-oauth.md
```

### Example 2: Multi-Project

**.specweave/config.json**:
```json
{
  "multiProject": {
    "projects": {
      "backend": {
        "keywords": ["api", "backend", "service"]
      },
      "frontend": {
        "keywords": ["ui", "frontend", "react"]
      }
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

**spec.md**:
```markdown
---
title: End-to-End Authentication
---

## US-001: Backend API
Backend API authentication with OAuth...

## US-002: Frontend Login UI
React login form with email/password...
```

**Result**:
```
.specweave/docs/internal/specs/
├── backend/
│   └── us-001-backend-api.md      # Backend content
└── frontend/
    └── us-002-frontend-login.md   # Frontend content
```

## Best Practices

### 1. Use Consistent Naming

**User Stories**:
```markdown
## US-001: User Login          ✅
## User Story: Login           ❌ (less reliable)
```

**ADRs**:
```markdown
## ADR-001: Use PostgreSQL     ✅
## Decision: Database Choice   ❌ (less reliable)
```

**NFRs**:
```markdown
## NFR-001: 99.9% Uptime       ✅
## Performance Requirements    ❌ (less reliable)
```

### 2. Add Project Metadata

**In frontmatter** (highest confidence):
```yaml
---
title: User Authentication
project: backend
---
```

**In increment name**:
```bash
/specweave:increment "0016-backend-authentication"
```

### 3. Use Descriptive Headings

```markdown
✅ GOOD:
## Authentication Flow Architecture
## Runbook: API Service Incident Response
## Test Strategy: OAuth Integration

❌ BAD (too generic):
## Architecture
## Operations
## Testing
```

### 4. Cross-Reference by Name

**In content**, mention related files by name:
```markdown
## US-001: User Login

This user story implements the **authentication-flow-architecture** design.

See also: **oauth-vs-jwt-adr** for the decision rationale.
```

→ Intelligent sync will detect these references and create links!

## Migration from Simple Mode

Already using simple mode? Migrate gradually:

**Step 1 - Enable intelligent sync**:
```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true
    }
  }
}
```

**Step 2 - Complete a new task**:
```bash
/specweave:do
# Complete task → Automatic sync!
```

**Step 3 - Verify**:
```bash
ls .specweave/docs/internal/specs/default/
# Should see distributed files (us-001-*.md, etc.)

ls .specweave/docs/internal/architecture/
# Should see architecture files
```

**Step 4 - Keep legacy specs** (optional):
```bash
# Legacy specs still work!
ls .specweave/docs/internal/specs/spec-*.md
# Old format: spec-0001-core-framework.md (still there)

# New format: specs/default/us-001-*.md (distributed)
```

## FAQ

**Q: Does this work with existing increments?**
A: Yes! Just enable intelligent sync and complete a task. Automatic sync fires after task completion.

**Q: Can I disable for specific increments?**
A: Yes, set `enabled: false` temporarily, complete the increment, then re-enable.

**Q: What if I want one big file instead?**
A: Set `splitByCategory: false` in config. All content goes to one file per project.

**Q: Does this work with Docusaurus?**
A: Yes! Generated frontmatter is Docusaurus-compatible out-of-the-box.

**Q: Can I customize classification rules?**
A: Not yet (v0.18.0). Custom rules planned for v0.19.0.

**Q: What about performance?**
A: Fast! ~10-50ms to parse, classify, and distribute. Async (non-blocking).

## Support

**Documentation**: https://spec-weave.com/docs/intelligent-living-docs-sync
**Issues**: https://github.com/anton-abyzov/specweave/issues
**Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

**Generated by SpecWeave v0.18.0**
**Last Updated**: 2025-11-10
