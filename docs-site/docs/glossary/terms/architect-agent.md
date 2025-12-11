---
id: architect-agent
title: Architect Agent
sidebar_label: Architect Agent
---

# Architect Agent

The **Architect Agent** is SpecWeave's AI-powered System Architect that designs technical implementations, creates architecture documentation, and makes technology decisions.

## What It Does

The Architect Agent activates after the [PM Agent](/docs/glossary/terms/pm-agent) creates specifications:

**Key responsibilities:**
- 🏗️ **System design** - Creates component architecture
- 📐 **Technology selection** - Chooses appropriate tech stack
- 📝 **[ADR](/docs/glossary/terms/adr) creation** - Documents architecture decisions
- 📊 **C4 diagrams** - Generates visual architecture diagrams
- 🧪 **Test strategy** - Defines coverage targets and approach

## Output: plan.md

The Architect Agent generates a `plan.md` file:

```markdown
# Implementation Plan: User Authentication

## Architecture

### Components
1. **AuthService** - Core authentication logic
2. **JWTManager** - Token generation/validation
3. **OAuthProvider** - Google OAuth integration
4. **PasswordHasher** - Bcrypt password hashing

### Technology Stack
- Framework: Express.js + TypeScript
- Auth: JWT (RS256) + Passport.js
- Database: PostgreSQL with Prisma
- Hashing: bcrypt (cost factor: 12)

### C4 Container Diagram
```mermaid
C4Container
    title Authentication System
    Person(user, "User")
    Container(api, "API Server", "Express.js")
    Container(auth, "AuthService", "JWT + OAuth")
    ContainerDb(db, "PostgreSQL", "Users, Sessions")
```

## Test Strategy
- **Unit Tests**: 90% coverage (AuthService, JWTManager)
- **Integration Tests**: 85% coverage (full auth flows)
- **E2E Tests**: Critical paths (login, OAuth, logout)
```

## Architecture Decision Records

The Architect Agent creates [ADRs](/docs/glossary/terms/adr) for significant decisions:

```markdown
# ADR-001: JWT vs Session-Based Authentication

## Status
✅ Accepted

## Decision
Use JWT with RS256 signing for stateless authentication.

## Rationale
- Stateless (scales horizontally)
- Standard (RFC 7519)
- Mobile-friendly (no cookies)

## Consequences
+ No server-side session storage
+ Works across multiple servers
- Cannot revoke tokens before expiry (mitigated by short expiry)
```

## Integration with Pipeline

```mermaid
graph LR
    A[PM Agent<br/>spec.md] --> B[Architect Agent<br/>plan.md]
    B --> C[Test-Aware Planner<br/>tasks.md]
```

## When It Activates

- `/sw:increment` - After PM creates spec
- Architecture questions - When user asks about design
- `/sw:sync-docs review` - Reviews architecture docs

## Related

- [ADR](/docs/glossary/terms/adr) - Architecture Decision Records
- [PM Agent](/docs/glossary/terms/pm-agent) - Creates input specs
- [Increments](/docs/glossary/terms/increments) - Contains plan.md
