# Specs - Feature Specifications

**Purpose**: Detailed feature specifications organized by project and feature number.

**Last Updated**: 2025-11-19

---

## Overview

This directory contains the **living documentation** of all feature specifications for SpecWeave projects. Each feature has:

1. **High-level feature summary** (`_features/FS-XXX/FEATURE.md`)
2. **Detailed user stories** (`{project}/FS-XXX/us-XXX-*.md`)

## Directory Structure

```
specs/
├── _features/              # High-level feature summaries
│   ├── FS-022/
│   │   └── FEATURE.md      # Feature overview, acceptance criteria
│   ├── FS-043/
│   │   └── FEATURE.md
│   └── ...
│
└── specweave/              # Project-specific detailed specs
    ├── FS-022/
    │   ├── README.md       # Feature-level index
    │   ├── us-001-*.md     # User story 001
    │   ├── us-002-*.md     # User story 002
    │   └── ...
    ├── FS-043/
    │   ├── README.md
    │   └── us-001-*.md
    └── ...
```

## Folder Organization

### `_features/` - Feature Summaries

Contains **FEATURE.md** files with:
- Feature overview and context
- High-level acceptance criteria
- Business value and priority
- Links to detailed user stories

**Format**: `FS-{number}`
- FS-022: Multi-repo Init UX
- FS-043: spec.md Desync Fix
- etc.

### `{project}/` - Detailed User Stories

Contains project-specific feature folders with:
- **README.md**: Feature-level index and context
- **us-{number}-{title}.md**: Individual user story specifications

**Naming Convention**:
- `us-001-status-line-shows-correct-increment.md`
- `us-002-spec-md-metadata-json-sync.md`

Each user story includes:
- Detailed description
- Acceptance criteria (AC-XXX format)
- Implementation notes
- Test requirements
- Priority/status

## Current Features

### Active Features (v0.22.x)

- **FS-022**: Multi-repo Init UX - Simplified repository setup
- **FS-023**: Release Management Enhancements
- **FS-028**: Multi-repo UX Improvements
- **FS-031**: External Tool Status Sync
- **FS-033**: Duplicate Increment Prevention
- **FS-035**: Kafka Event Streaming Plugin
- **FS-037**: Project-Specific Tasks
- **FS-038**: Serverless Architecture Intelligence
- **FS-039**: Ultra-Smart Next Command
- **FS-040**: Living Docs External Sync
- **FS-041**: Integration Testing Status Hooks
- **FS-042**: Test Infrastructure Cleanup
- **FS-043**: spec.md Desync Fix & Validation

## How to Use

### Finding a Feature

1. **Browse by number**: `_features/FS-{number}/FEATURE.md`
2. **Find user stories**: `specweave/FS-{number}/`

### Creating New Features

1. Create feature summary: `_features/FS-{next}/FEATURE.md`
2. Create project folder: `{project}/FS-{next}/`
3. Add README.md and user stories
4. Link from feature summary to user stories

### Cross-References

- Feature specs reference ADRs: `../../architecture/adr/`
- User stories link to acceptance criteria in increments
- Implementation status tracked in `.specweave/increments/`

## Feature Lifecycle

```
Draft → In Progress → Implemented → Verified → Deployed
```

**Status tracked in**:
- Feature-level: `_features/FS-{number}/FEATURE.md` frontmatter
- User story-level: `{project}/FS-{number}/us-{number}-*.md` frontmatter
- Increment-level: `.specweave/increments/{number}/metadata.json`

## Related Documentation

- [Architecture Overview](../architecture/README.md) - System design and ADRs
- [Strategy](../strategy/README.md) - Business context and vision
- [Delivery](../delivery/README.md) - Release planning and roadmap
- [Internal Docs Home](../README.md) - Documentation structure

---

**Note**: This is internal documentation. For user-facing feature documentation, see the [public guides](../../docs-site/docs/).
