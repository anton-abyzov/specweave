# Flexible Spec Identifier System - Brownfield & Greenfield

**Date**: 2025-11-12
**Key Insight**: Don't force new IDs on existing projects - adapt to what's already there!

---

## The Problem with Rigid IDs

### What's Wrong with `spec-001`?

**Greenfield (new projects)**: ✅ Works great!
- No existing IDs
- We control the naming
- Sequential numbers are fine

**Brownfield (existing projects)**: ❌ Breaks everything!
- Already has JIRA IDs: `AUTH-123`, `PAY-456`
- Already has ADO work items: `12345`, `67890`
- Already has GitHub issues: `#123`, `#456`
- Already has custom IDs: `user-auth`, `payment-flow`

**The Mistake**: Forcing `spec-001` on a project that already uses `AUTH-123` creates confusion and duplicate tracking!

---

## Smart Identifier Strategies

### Strategy 1: External Tool ID (Brownfield with JIRA/ADO/GitHub)

**When to use**: Importing specs from existing JIRA/ADO/GitHub projects

**Format**: `{external-tool}-{external-id}`

**Examples**:
- `JIRA-AUTH-123` (from JIRA epic AUTH-123)
- `ADO-12345` (from Azure DevOps work item 12345)
- `GH-456` (from GitHub issue #456)

**File naming**:
- `specs/backend/JIRA-AUTH-123.md`
- `specs/frontend/ADO-12345.md`
- `specs/mobile/GH-456.md`

**Frontmatter**:
```yaml
---
id: JIRA-AUTH-123  # ✅ Preserves original ID
project: backend
title: "User Authentication System"
externalLinks:
  jira:
    issueKey: AUTH-123
    url: https://company.atlassian.net/browse/AUTH-123
    epicId: AUTH-100
---
```

**Benefits**:
- ✅ Direct 1:1 mapping to external tool
- ✅ No duplicate tracking
- ✅ Team already knows these IDs
- ✅ Easy to find in JIRA/ADO/GitHub

### Strategy 2: Title-Based Slug (Brownfield without IDs)

**When to use**: Existing project has specs but no formal ID system

**Format**: `{kebab-case-title}`

**Examples**:
- `user-authentication` (from title "User Authentication")
- `payment-processing` (from "Payment Processing System")
- `real-time-notifications` (from "Real-time Notifications")

**File naming**:
- `specs/backend/user-authentication.md`
- `specs/frontend/payment-ui.md`
- `specs/mobile/push-notifications.md`

**Frontmatter**:
```yaml
---
id: user-authentication  # ✅ Generated from title
project: backend
title: "User Authentication System"
slug: user-authentication  # Explicit slug for stability
---
```

**Generation**:
```typescript
function generateSlugId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '')         // Trim hyphens from start/end
    .substring(0, 50);             // Max 50 chars
}

// Examples:
generateSlugId("User Authentication System")  → "user-authentication-system"
generateSlugId("Real-time Notifications")     → "real-time-notifications"
generateSlugId("Payment Processing (Stripe)") → "payment-processing-stripe"
```

**Benefits**:
- ✅ Human-readable and descriptive
- ✅ Easy to remember: "user-auth" vs "spec-001"
- ✅ Stable (doesn't change with spec content)
- ✅ No external dependencies

### Strategy 3: Sequential Number (Greenfield)

**When to use**: Brand new project, no existing IDs

**Format**: `spec-{number}`

**Examples**:
- `spec-001`, `spec-002`, `spec-003`

**File naming**:
- `specs/backend/spec-001.md`
- `specs/frontend/spec-001.md`

**Frontmatter**:
```yaml
---
id: spec-001
project: backend
title: "User Authentication System"
---
```

**Benefits**:
- ✅ Simple and predictable
- ✅ Easy to generate (auto-increment)
- ✅ Works when no better option exists

### Strategy 4: Hybrid Prefix + Number (Categorized Greenfield)

**When to use**: Want feature area categorization + sequential numbering

**Format**: `{prefix}-{number}`

**Examples**:
- `AUTH-001`, `AUTH-002` (authentication features)
- `PAY-001`, `PAY-002` (payment features)
- `NOTIFY-001` (notification features)

**File naming**:
- `specs/backend/AUTH-001.md`
- `specs/backend/PAY-001.md`

**Frontmatter**:
```yaml
---
id: AUTH-001
project: backend
title: "User Login with Email/Password"
category: authentication  # Optional categorization
---
```

**Benefits**:
- ✅ Organized by feature area
- ✅ Still predictable numbering
- ✅ Easy to see related specs (all AUTH-* together)

---

## Auto-Detection Logic

### Smart ID Detection (Brownfield Import)

When importing a brownfield spec, detect the ID automatically:

```typescript
interface SpecIdentifier {
  full: string;       // "backend/user-authentication"
  display: string;    // "user-authentication" or "JIRA-AUTH-123"
  source: 'external-jira' | 'external-ado' | 'external-github' |
          'title-slug' | 'sequential' | 'custom';
  externalId?: string;  // "AUTH-123" (JIRA), "12345" (ADO), "#456" (GitHub)
  externalUrl?: string; // Direct link to external issue
  project: string;      // "backend", "frontend", etc.
  stable: boolean;      // Does ID change if content changes?
}

function detectSpecIdentifier(spec: {
  title: string;
  frontmatter: any;
  project: string;
  existingSpecs: string[];
}): SpecIdentifier {
  const { title, frontmatter, project, existingSpecs } = spec;

  // Priority 1: External tool link (highest priority for brownfield)
  if (frontmatter.externalLinks?.jira?.issueKey) {
    return {
      full: `${project}/JIRA-${frontmatter.externalLinks.jira.issueKey}`,
      display: `JIRA-${frontmatter.externalLinks.jira.issueKey}`,
      source: 'external-jira',
      externalId: frontmatter.externalLinks.jira.issueKey,
      externalUrl: frontmatter.externalLinks.jira.url,
      project,
      stable: true
    };
  }

  if (frontmatter.externalLinks?.ado?.workItemId) {
    return {
      full: `${project}/ADO-${frontmatter.externalLinks.ado.workItemId}`,
      display: `ADO-${frontmatter.externalLinks.ado.workItemId}`,
      source: 'external-ado',
      externalId: String(frontmatter.externalLinks.ado.workItemId),
      externalUrl: frontmatter.externalLinks.ado.url,
      project,
      stable: true
    };
  }

  if (frontmatter.externalLinks?.github?.issueNumber) {
    return {
      full: `${project}/GH-${frontmatter.externalLinks.github.issueNumber}`,
      display: `GH-${frontmatter.externalLinks.github.issueNumber}`,
      source: 'external-github',
      externalId: `#${frontmatter.externalLinks.github.issueNumber}`,
      externalUrl: frontmatter.externalLinks.github.url,
      project,
      stable: true
    };
  }

  // Priority 2: Explicit custom ID in frontmatter
  if (frontmatter.id) {
    return {
      full: `${project}/${frontmatter.id}`,
      display: frontmatter.id,
      source: 'custom',
      project,
      stable: true
    };
  }

  // Priority 3: Generate from title (slugified)
  const titleSlug = slugify(title);
  const slugExists = existingSpecs.some(s => s.includes(titleSlug));

  if (!slugExists && titleSlug.length >= 5) {
    return {
      full: `${project}/${titleSlug}`,
      display: titleSlug,
      source: 'title-slug',
      project,
      stable: true
    };
  }

  // Priority 4: Fall back to sequential numbering (greenfield)
  const nextNumber = findNextSequentialNumber(existingSpecs, project);
  return {
    full: `${project}/spec-${nextNumber}`,
    display: `spec-${nextNumber}`,
    source: 'sequential',
    project,
    stable: true
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function findNextSequentialNumber(existingSpecs: string[], project: string): string {
  const numbers = existingSpecs
    .filter(s => s.startsWith(`${project}/spec-`))
    .map(s => parseInt(s.split('spec-')[1]))
    .filter(n => !isNaN(n));

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(maxNumber + 1).padStart(3, '0');
}
```

### Examples

**Example 1: Brownfield JIRA Project**
```typescript
// Input spec with JIRA link
const spec = {
  title: "User Authentication System",
  frontmatter: {
    externalLinks: {
      jira: {
        issueKey: "AUTH-123",
        url: "https://company.atlassian.net/browse/AUTH-123"
      }
    }
  },
  project: "backend",
  existingSpecs: []
};

detectSpecIdentifier(spec);
// → {
//     full: "backend/JIRA-AUTH-123",
//     display: "JIRA-AUTH-123",
//     source: "external-jira",
//     externalId: "AUTH-123",
//     externalUrl: "https://company.atlassian.net/browse/AUTH-123",
//     project: "backend",
//     stable: true
//   }

// File created: specs/backend/JIRA-AUTH-123.md
```

**Example 2: Brownfield without IDs**
```typescript
const spec = {
  title: "Payment Processing System",
  frontmatter: {},
  project: "backend",
  existingSpecs: []
};

detectSpecIdentifier(spec);
// → {
//     full: "backend/payment-processing-system",
//     display: "payment-processing-system",
//     source: "title-slug",
//     project: "backend",
//     stable: true
//   }

// File created: specs/backend/payment-processing-system.md
```

**Example 3: Greenfield**
```typescript
const spec = {
  title: "User Authentication",
  frontmatter: {},
  project: "backend",
  existingSpecs: ["backend/spec-001", "backend/spec-002"]
};

detectSpecIdentifier(spec);
// → {
//     full: "backend/spec-003",
//     display: "spec-003",
//     source: "sequential",
//     project: "backend",
//     stable: true
//   }

// File created: specs/backend/spec-003.md
```

---

## Flexible File Naming

### Principle: File Name = Identifier

```
Identifier → File Path

backend/user-authentication       → specs/backend/user-authentication.md
backend/JIRA-AUTH-123            → specs/backend/JIRA-AUTH-123.md
backend/spec-001                 → specs/backend/spec-001.md
frontend/GH-456                  → specs/frontend/GH-456.md
```

### Legacy Support

Also support legacy format with descriptive suffix:

```
File: specs/backend/spec-001-user-auth.md

Frontmatter:
---
id: spec-001  # ✅ ID extracted from frontmatter
slug: user-auth  # Optional descriptive part
---

Identifier: "backend/spec-001"
Display: "spec-001" (ignore suffix)
```

---

## GitHub Issue Title Format

### Flexible Display

```
[{PROJECT_CODE}-{IDENTIFIER}] {Title}

Examples:
- [BE-user-authentication] User Authentication System
- [BE-JIRA-AUTH-123] User Authentication (from JIRA AUTH-123)
- [BE-001] User Authentication
- [FE-GH-456] Login Form UI (synced with GitHub #456)
- [MB-payment-ui] Mobile Payment Interface
```

### Compact Project Codes

```typescript
const projectCodes = {
  backend: 'BE',
  frontend: 'FE',
  mobile: 'MB',
  infra: 'IN',
  _parent: 'PA'
};

function formatGitHubIssueTitle(spec: Spec): string {
  const projectCode = projectCodes[spec.project] || spec.project.toUpperCase().substring(0, 2);
  return `[${projectCode}-${spec.identifier.display}] ${spec.title}`;
}

// Examples:
formatGitHubIssueTitle({
  project: 'backend',
  identifier: { display: 'JIRA-AUTH-123' },
  title: 'User Authentication'
})
// → "[BE-JIRA-AUTH-123] User Authentication"

formatGitHubIssueTitle({
  project: 'frontend',
  identifier: { display: 'user-login-ui' },
  title: 'User Login Interface'
})
// → "[FE-user-login-ui] User Login Interface"
```

---

## Frontmatter Schema

### Complete Example

```yaml
---
# Identity (REQUIRED)
id: user-authentication  # ✅ Can be: JIRA-AUTH-123, spec-001, user-auth, etc.
project: backend         # ✅ Which project (backend, frontend, mobile)
title: "User Authentication System"

# Optional descriptive slug
slug: user-auth  # For legacy compatibility or readability

# Status & Priority
status: in-progress
priority: P0

# External Links (if imported from external tool)
externalLinks:
  jira:
    issueKey: AUTH-123
    epicId: AUTH-100
    url: https://company.atlassian.net/browse/AUTH-123
    syncedAt: "2025-11-12T10:00:00Z"
  github:
    owner: myorg
    repo: backend-api
    issueNumber: 45
    issueUrl: https://github.com/myorg/backend-api/issues/45
    syncedAt: "2025-11-12T10:05:00Z"

# Cross-Project References
relatedSpecs:
  - frontend/user-login-ui  # Frontend spec for same feature
  - _parent/authentication-overview  # Parent coordination doc

# Increments (which increments implement this spec)
increments:
  - 0001-user-auth-mvp
  - 0005-auth-enhancements
---
```

---

## Migration & Import

### Scenario 1: Import from JIRA

```bash
# User has existing JIRA epic AUTH-123
/specweave:import-from-jira AUTH-123

# SpecWeave:
# 1. Fetches JIRA epic AUTH-123
# 2. Detects project from epic content (backend keywords)
# 3. Creates: specs/backend/JIRA-AUTH-123.md
# 4. Frontmatter includes:
#    id: JIRA-AUTH-123
#    externalLinks.jira.issueKey: AUTH-123
# 5. Creates GitHub issue in backend-api repo
# 6. Title: [BE-JIRA-AUTH-123] User Authentication System
# 7. Links back to JIRA: "Imported from JIRA AUTH-123"
```

### Scenario 2: Import from Existing Docs

```bash
# User has existing spec without formal IDs
# File: docs/features/authentication.md

/specweave:import-doc docs/features/authentication.md

# SpecWeave:
# 1. Reads title: "User Authentication System"
# 2. Detects project from content (backend keywords)
# 3. Generates slug: "user-authentication-system"
# 4. Creates: specs/backend/user-authentication-system.md
# 5. Frontmatter:
#    id: user-authentication-system
#    source: title-slug
# 6. Creates GitHub issue
# 7. Title: [BE-user-authentication-system] User Authentication System
```

### Scenario 3: Greenfield New Spec

```bash
# Brand new project, no existing IDs
/specweave:increment "User Authentication"

# SpecWeave:
# 1. No existing specs found
# 2. Uses sequential numbering (greenfield)
# 3. Creates: specs/backend/spec-001.md
# 4. Frontmatter:
#    id: spec-001
#    source: sequential
# 5. Creates GitHub issue
# 6. Title: [BE-001] User Authentication System
```

---

## Benefits of Flexible IDs

### Why This Approach Works

1. **Brownfield-Friendly** ✅
   - Preserves existing JIRA/ADO/GitHub IDs
   - No duplicate tracking systems
   - Teams use familiar identifiers

2. **Human-Readable** ✅
   - `user-authentication` > `spec-001`
   - Easy to remember and search
   - Descriptive and meaningful

3. **Stable** ✅
   - IDs don't change when spec content changes
   - External tool IDs are permanent
   - Title slugs are deterministic

4. **Flexible** ✅
   - Adapts to project needs
   - Works for greenfield and brownfield
   - Supports custom ID schemes

5. **Searchable** ✅
   - Easy to grep: `grep -r "JIRA-AUTH-123"`
   - GitHub issue search works
   - File naming matches identifier

---

## Next Steps

**What I need from you**:

1. **Which scenario applies to you?**
   - Greenfield (new project, no IDs) → Use sequential or title-slug
   - Brownfield with JIRA → Use JIRA-{issueKey}
   - Brownfield with ADO → Use ADO-{workItemId}
   - Brownfield with GitHub → Use GH-{issueNumber}
   - Brownfield without IDs → Use title-slug

2. **Do you have existing specs?**
   - If yes: What identifier system are you using?
   - If no: Which system do you prefer?

3. **Approval to implement**:
   - Auto-detection logic (4 priority levels)
   - Flexible file naming
   - Multi-project spec split
   - Smart GitHub issue title format

Let me know which direction to go!

---

**Status**: Awaiting confirmation on identifier strategy
**Date**: 2025-11-12
