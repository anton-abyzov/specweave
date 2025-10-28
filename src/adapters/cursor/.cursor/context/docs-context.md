# @docs - Architecture Documentation Context

This file is loaded when you type `@docs` in Cursor.

## What This Provides

Quick access to architecture documentation:
- System design (HLD)
- ADRs (Architecture Decision Records)
- Component diagrams (C4 Model)
- Data models (ER diagrams)

## Usage

```
@docs show me the system architecture
@docs what ADRs exist for authentication?
@docs explain the data model
```

## Files Loaded

When `@docs` is used, Cursor should load:

```
.specweave/docs/internal/architecture/
├── system-design.md           # HLD
├── adr/                       # Architecture Decision Records
│   ├── 0001-tech-stack.md
│   ├── 0002-database-choice.md
│   └── ...
├── diagrams/                  # C4 diagrams
│   ├── system-context.mmd     # C4 Level 1
│   ├── system-container.mmd   # C4 Level 2
│   └── {module}/              # C4 Level 3 (component)
└── data-models/               # ER diagrams
    └── schema.sql
```

## Context Precision

**Don't load everything!**

If working on specific module (e.g., authentication):
1. Check context-manifest.yaml
2. Load ONLY auth-related docs:
   ```
   .specweave/docs/internal/architecture/auth/
   ├── design.md
   ├── adr/0005-auth-method.md
   └── diagrams/auth-flow.mmd
   ```

## Example Workflow

User: `@docs show authentication architecture`

You:
1. Load .specweave/docs/internal/architecture/auth/
2. Load ADRs related to auth (ADR-0005, ADR-0012)
3. Load auth diagrams
4. Summarize: "Authentication uses OAuth2 (ADR-0005), JWT tokens stored in httpOnly cookies (ADR-0012). See auth-flow.mmd for sequence diagram."
