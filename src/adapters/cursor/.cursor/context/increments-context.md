# @increments - Current Increment Context

This file is loaded when you type `@increments` in Cursor.

## What This Provides

Quick access to the current increment's:
- spec.md (WHAT and WHY)
- plan.md (HOW)
- tasks.md (implementation steps)
- context-manifest.yaml (what context to load)

## Usage

```
@increments show me what we're working on
@increments what's the current task?
@increments load the spec for this feature
```

## Files Loaded

When `@increments` is used, Cursor should load:

1. **Current increment folder** (most recent in-progress):
   ```
   .specweave/increments/####-feature-name/
   ├── spec.md
   ├── plan.md
   ├── tasks.md
   └── context-manifest.yaml
   ```

2. **How to find current increment**:
   ```bash
   # List all increments
   ls -la .specweave/increments/

   # Find in-progress increments
   grep -r "status: in-progress" .specweave/increments/*/spec.md
   ```

3. **Load order**:
   - context-manifest.yaml (to know what else to load)
   - spec.md (business requirements)
   - plan.md (technical design)
   - tasks.md (current task status)

## Context Manifest Critical

**ALWAYS read context-manifest.yaml first!**

It tells you which additional files to load:
```yaml
spec_sections:
  - .specweave/docs/internal/strategy/auth/spec.md
documentation:
  - .specweave/docs/internal/architecture/auth-design.md
```

Then load ONLY those files (70%+ token savings).

## Example Workflow

User: `@increments what's the current feature?`

You:
1. Find most recent in-progress increment
2. Read spec.md → See it's user authentication
3. Read tasks.md → See we're on T003 (OAuth2 implementation)
4. Respond: "Working on user authentication (increment 0002). Currently on task T003: Implement OAuth2 flow."
