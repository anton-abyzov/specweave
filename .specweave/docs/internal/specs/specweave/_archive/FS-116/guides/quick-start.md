# LivingSpec Quick-Start Guide

Get started with LivingSpec in under 5 minutes. This guide walks you through creating your first living documentation project.

## Prerequisites

- Node.js 18+ or Python 3.8+
- Git installed
- An existing project (or new directory)

## Step 1: Initialize LivingSpec

### Option A: Using npm (Recommended)

```bash
# Install the CLI
npm install -g livingspec-cli

# Initialize in your project
cd your-project
livingspec init
```

### Option B: Manual Setup

Create the directory structure manually:

```bash
mkdir -p .livingspec/{specs,architecture/adr,work,sync}
touch .livingspec/manifest.yaml
```

## Step 2: Create manifest.yaml

Create your project manifest:

```yaml
# .livingspec/manifest.yaml
version: "1.0.0"

project:
  name: my-awesome-project
  title: My Awesome Project
  version: "0.1.0"
  repository: https://github.com/org/my-project

implementation_level: 1

sync:
  enabled: false

documentation:
  platform: docusaurus
  show_origin_badges: true
```

## Step 3: Create Your First Feature

Create a feature folder and document:

```bash
mkdir -p .livingspec/specs/FS-001
```

Create `.livingspec/specs/FS-001/FEATURE.md`:

```yaml
---
id: "FS-001"
title: "User Authentication"
status: "draft"
owner: "platform-team"
priority: "P1"
---

# FS-001: User Authentication

## Description

Implement user authentication with email/password login and JWT tokens.

## User Stories

- [US-001: User Registration](./US-001.md)
- [US-002: User Login](./US-002.md)
```

## Step 4: Create a User Story

Create `.livingspec/specs/FS-001/US-001.md`:

```yaml
---
id: "US-001"
feature: "FS-001"
title: "User Registration"
status: "draft"
---

# US-001: User Registration

**As a** new user
**I want to** create an account with my email
**So that** I can access the platform

## Acceptance Criteria

- [ ] **AC-US1-01**: Given a valid email and password, when I submit the form, then my account is created
- [ ] **AC-US1-02**: Given an existing email, when I submit, then I see an error message
- [ ] **AC-US1-03**: Given a weak password, when I submit, then I see validation errors
```

## Step 5: Validate Your Structure

```bash
livingspec validate .

# Expected output:
# ✅ manifest.yaml valid
# ✅ FS-001/FEATURE.md valid
# ✅ FS-001/US-001.md valid
# All documents valid!
```

## Step 6: Create a Work Unit (Increment)

When ready to implement, create a work unit:

```bash
mkdir -p .livingspec/work/0001-auth-feature
```

Create `.livingspec/work/0001-auth-feature/spec.md`:

```yaml
---
increment: 0001-auth-feature
status: planned
---

# Increment 0001: Auth Feature

Implementing user registration and login.

## Scope

- US-001: User Registration
- US-002: User Login
```

Create `.livingspec/work/0001-auth-feature/tasks.md`:

```markdown
# Tasks

### T-001: Create User model
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

### T-002: Implement registration endpoint
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending
```

## Step 7: Generate Documentation Site

### Using Docusaurus

```bash
# Install Docusaurus
npx create-docusaurus@latest docs-site classic

# Add LivingSpec plugin
cd docs-site
npm install @livingspec/docusaurus-plugin

# Configure (add to docusaurus.config.js)
# plugins: ['@livingspec/docusaurus-plugin']

# Build and serve
npm run start
```

## What You've Created

```
your-project/
├── .livingspec/
│   ├── manifest.yaml           # Project metadata
│   ├── specs/
│   │   └── FS-001/
│   │       ├── FEATURE.md      # Feature specification
│   │       └── US-001.md       # User story with ACs
│   ├── work/
│   │   └── 0001-auth-feature/
│   │       ├── spec.md         # Increment scope
│   │       └── tasks.md        # Implementation tasks
│   └── architecture/
│       └── adr/                # Future decision records
└── docs-site/                  # Documentation site
```

## Next Steps

1. **Add more features** - Create FS-002, FS-003, etc.
2. **Record decisions** - Create ADRs in `architecture/adr/`
3. **Enable sync** - Connect to GitHub/JIRA/ADO
4. **Import external items** - Use E-suffix for imported work

## Working with External Items (E-Suffix)

When importing from external tools, items get an E-suffix:

```yaml
---
id: "FS-001E"           # External feature
title: "Imported Feature"
origin: "external"
source: "github"
external_id: "#42"
external_url: "https://github.com/org/repo/issues/42"
---
```

See the [E-Suffix documentation](../SPECIFICATION.md#e-suffix) for details.

## Common Commands

```bash
# Validate all documents
livingspec validate .

# Check sync status
livingspec sync status

# Generate context manifest for AI
livingspec context generate

# Build documentation
livingspec docs build
```

## Troubleshooting

### "Invalid frontmatter"

Ensure YAML frontmatter uses quotes for IDs:

```yaml
# Correct
id: "FS-001"

# May cause issues
id: FS-001
```

### "Missing required field"

Check that required fields are present:
- Features: `id`, `title`, `status`
- User Stories: `id`, `feature`, `title`, `status`
- Tasks: `id`, `title`, `user_story`, `status`

### "E-suffix validation failed"

External items must have:
- ID ending with `E` (e.g., `FS-001E`)
- `origin: "external"`
- `source` field (github/jira/ado)
- `external_id` field

## Resources

- [Full Specification](../SPECIFICATION.md)
- [Glossary](../GLOSSARY.md)
- [Docusaurus Integration](./docusaurus-integration.md)
- [MkDocs Integration](./mkdocs-integration.md)
