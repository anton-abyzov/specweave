# @strategy - Business Strategy Context

This file is loaded when you type `@strategy` in Cursor.

## What This Provides

Quick access to business strategy documentation:
- Product vision and goals
- Business requirements (technology-agnostic)
- User stories and acceptance criteria
- PRDs (Product Requirements Documents)

## Usage

```
@strategy what's the product vision?
@strategy show me authentication requirements
@strategy what are the success criteria?
```

## Files Loaded

When `@strategy` is used, Cursor should load:

```
.specweave/docs/internal/strategy/
├── {module}/                  # Module-specific strategy
│   ├── overview.md            # Product vision
│   ├── requirements.md        # FR/NFR (tech-agnostic)
│   ├── user-stories.md        # All user stories
│   └── success-criteria.md    # KPIs, metrics
```

## Context Precision

**Don't load everything!**

If working on authentication module:
1. Load ONLY auth strategy:
   ```
   .specweave/docs/internal/strategy/auth/
   ├── overview.md
   ├── requirements.md
   ├── user-stories.md
   └── success-criteria.md
   ```

## Technology-Agnostic Requirements

**Critical**: Strategy docs are technology-agnostic (WHAT/WHY, not HOW).

**Good (technology-agnostic)**:
```markdown
## FR-001: User Authentication
Users must be able to securely authenticate with their email and password.
```

**Bad (too technical)**:
```markdown
## FR-001: User Authentication
Users authenticate via JWT tokens stored in httpOnly cookies with bcrypt password hashing.
```

The technical details go in architecture docs (@docs), not strategy.

## Example Workflow

User: `@strategy what are the authentication requirements?`

You:
1. Load .specweave/docs/internal/strategy/auth/requirements.md
2. Read functional and non-functional requirements
3. Summarize: "FR-001: Email/password auth. FR-002: Social login (Google, GitHub). NFR-001: < 2s login response time. NFR-002: 99.9% uptime."
