---
sidebar_position: 3
---

# Spec (Specification)

**Category**: SpecWeave Core

## Definition

A **spec** (specification) is a structured document that defines **what** to build, **why** to build it, and **how success is measured**. SpecWeave uses specs in TWO locations for different purposes:

1. **Living Docs Specs**: `.specweave/docs/internal/projects/{project}/specs/spec-NNN-feature.md` - Permanent, feature-level knowledge base
2. **Increment Specs**: `.specweave/increments/####-name/spec.md` - Temporary, focused implementation snapshot

## The Core Question: Why Two Locations?

**Key Difference**: Specs use **3-digit numbers** (001, 002, 003) for **feature areas**, increments use **4-digit numbers** (0001, 0002, 0003) for **implementations**.

### Living Docs Specs (Permanent Knowledge Base)

**Location**: `.specweave/docs/internal/projects/default/specs/spec-001-user-authentication.md`

**Purpose**: COMPLETE, PERMANENT source of truth for entire feature area

**Lifecycle**: Created once, updated over time, NEVER deleted

**Scope**: Comprehensive feature area (e.g., "User Authentication" = 10-20 user stories across multiple increments)

**Contains**:
- ✅ ALL user stories for the feature area
- ✅ ALL acceptance criteria (with AC-IDs)
- ✅ Implementation history (which increments built which parts)
- ✅ Links to brownfield docs (existing project documentation)
- ✅ External PM tool links (GitHub Project, Jira Epic, ADO Feature)
- ✅ Architecture decisions (ADRs)
- ✅ Success metrics for the feature area

### Increment Specs (Temporary Implementation Reference)

**Location**: `.specweave/increments/0001-user-auth-mvp/spec.md`

**Purpose**: TEMPORARY implementation reference (what am I building THIS iteration?)

**Lifecycle**: Created per increment, can be deleted after completion

**Scope**: Focused subset (3-5 user stories for this increment only)

**Contains**:
- ✅ Reference to living docs: `"See: SPEC-001-user-authentication"`
- ✅ Subset of user stories: `"Implements: US-001, US-002, US-003 only"`
- ✅ What's being implemented RIGHT NOW (this iteration)
- ✅ Out of scope: Lists what's NOT in this increment (deferred to future)

## Real-World Example

### Living Docs Spec (Permanent, Feature-Level)

```markdown
File: .specweave/docs/internal/projects/default/specs/spec-001-user-authentication.md

# SPEC-001: User Authentication System
Complete authentication solution with social login, 2FA, and session management

## Increments (Implementation History)
- 0001-user-auth-mvp: Basic login/logout (Complete ✅)
- 0002-password-reset: Password reset flow (Complete ✅)
- 0003-social-login: Google/GitHub OAuth (Complete ✅)
- 0004-two-factor-auth: SMS + TOTP 2FA (Complete ✅)

## User Stories (20 total across 4 increments)
### US-001: Basic Login Flow (0001) ✅
- AC-US1-01: User can log in with email/password (P1, testable)
- AC-US1-02: Invalid credentials show error (P1, testable)
- AC-US1-03: 5 failed attempts lock account 15min (P2, testable)

### US-002: Password Reset (0002) ✅
- AC-US2-01: User can request password reset email (P1, testable)
- AC-US2-02: Reset link expires after 1 hour (P1, testable)

### US-003: Social Login (0003) ✅
- AC-US3-01: User can sign in with Google (P1, testable)
- AC-US3-02: User can sign in with GitHub (P2, testable)

### US-004: Two-Factor Authentication (0004) ✅
- AC-US4-01: User can enable SMS 2FA (P1, testable)
- AC-US4-02: User can enable TOTP 2FA (P2, testable)

[... 16 more user stories]

## External References
- GitHub Project: https://github.com/myorg/myapp/projects/5
- Jira Epic: AUTH-123
- ADR: See ADR-015 (Why JWT over sessions)

## Success Metrics
- 95%+ user satisfaction (post-launch survey)
- &lt;500ms average login time (P95)
- Zero critical security vulnerabilities
```

### Increment Spec (Temporary, Implementation-Level)

```markdown
File: .specweave/increments/0001-user-auth-mvp/spec.md

# Increment 0001: User Authentication MVP
**Implements**: SPEC-001-user-authentication (US-001 to US-002 only)
**Complete Specification**: See ../../docs/internal/projects/default/specs/spec-001-user-authentication.md

## What We're Implementing (This Increment Only)
### US-001: Basic Login Flow ✅
- AC-US1-01: User can log in with email/password (P1, testable)
- AC-US1-02: Invalid credentials show error (P1, testable)
- AC-US1-03: 5 failed attempts lock account 15min (P2, testable)

### US-002: Basic Logout ✅
- AC-US2-01: User can log out (P1, testable)
- AC-US2-02: Session invalidated on logout (P1, testable)

## Out of Scope (For This Increment)
- ❌ Password reset (US-003) → Increment 0002
- ❌ Social login (US-004) → Increment 0003
- ❌ Two-factor authentication (US-005) → Increment 0004

## Implementation Notes
- Using JWT tokens (15min access, 7d refresh)
- Bcrypt hashing (cost factor: 10)
- Rate limiting: 5 attempts per 15min per IP
```

## Spec Structure (Living Docs)

```markdown
# SPEC-NNN: Feature Name
Brief description (1-2 sentences)

## Overview
- **Feature Area**: What domain this covers
- **Business Value**: Why we're building this
- **Target Users**: Who benefits
- **Dependencies**: What else needs to exist

## Increments (Implementation History)
- 0001-increment-name: Brief description (Status)
- 0002-increment-name: Brief description (Status)
- 0003-increment-name: Brief description (Status)

## User Stories
### US-001: Story Title
**Priority**: P1 (Critical), P2 (High), P3 (Medium), P4 (Low)
**Status**: Complete ✅ | In Progress ⏳ | Planned 📋

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Specific, measurable criterion (P1, testable)
- [ ] **AC-US1-02**: Another criterion (P1, testable)
- [ ] **AC-US1-03**: Edge case handling (P2, testable)

**Implemented In**: 0001-increment-name

[... More user stories]

## External References
- GitHub Project: [link]
- Jira Epic: [link]
- ADO Feature: [link]
- Brownfield Docs: [link to existing docs]

## Architecture Decisions
- See: ADR-015 (Why JWT over sessions)
- See: ADR-016 (Password hashing strategy)

## Success Metrics
- 95%+ user satisfaction score (post-launch survey)
- Page load &lt;2s (95th percentile)
- Zero critical security vulnerabilities

## Non-Functional Requirements
- Security: OWASP Top 10 compliance
- Performance: &lt;500ms average response time
- Scalability: Support 10K concurrent users
```

## Benefits of Two-Location Architecture

### 1. **Permanent Knowledge Base**
Living docs = long-term memory. Answer: "How did we build authentication?"

### 2. **Focused Implementation**
Increment specs = short-term focus. Answer: "What am I building RIGHT NOW?"

### 3. **Brownfield Integration**
Living docs link to existing project docs, increment specs stay simple

### 4. **Clean After Completion**
Delete increment specs (optional), living docs remain as knowledge base

### 5. **External PM Tool Integration**
Jira epic → Living docs spec (permanent link), increment specs don't need external links

## Comparison Table

| Aspect | Living Docs Specs | Increment Specs |
|--------|------------------|----------------|
| **Location** | `.specweave/docs/internal/specs/` | `.specweave/increments/####/` |
| **Lifecycle** | ✅ Permanent (never deleted) | ⏳ Temporary (optional deletion) |
| **Scope** | 📚 Complete feature (20 US) | 🎯 Focused subset (3 US) |
| **Size** | 500+ lines (comprehensive) | 50-100 lines (focused) |
| **Purpose** | Knowledge base + history | Implementation tracker |
| **Coverage** | ALL user stories | SUBSET of user stories |
| **Brownfield** | ✅ Links to existing docs | ❌ Rarely needed |
| **External Links** | ✅ Jira, ADO, GitHub | ❌ Rarely needed |
| **Multiple Increments** | ✅ One spec → many increments | ❌ One increment → one spec |
| **After Completion** | ✅ Remains forever | ⚠️ Can be deleted |

## When to Use Which?

### Create Living Docs Spec When:
- ✅ Planning a major feature (authentication, payments, messaging)
- ✅ Feature spans multiple increments (will take weeks/months)
- ✅ Need brownfield integration (link to existing project docs)
- ✅ Want permanent historical record (how did we build this?)
- ✅ Need external PM tool link (Jira epic, ADO feature, GitHub milestone)

### Create Increment Spec When:
- ✅ Starting implementation of one increment
- ✅ Want quick reference (what am I building right now?)
- ✅ Need focused scope (just 3 user stories, not 20)

## Typical Workflow

**Phase 1: Planning** (PM Agent)
```bash
User: "I want to build user authentication"
PM Agent:
1. Creates living docs spec:
   → .specweave/docs/internal/specs/spec-001-user-authentication.md
   → Contains ALL 20 user stories (comprehensive, feature-level)
   → Links to GitHub Project
   → Maps to 4 increments (0001, 0002, 0003, 0004)
```

**Phase 2: Increment 1** (Core MVP)
```bash
User: "/specweave:increment 0001-user-auth-mvp"
PM Agent:
1. Creates increment spec:
   → .specweave/increments/0001-user-auth-mvp/spec.md
   → References living docs: "See SPEC-001"
   → Contains ONLY US-001 to US-003 (focused, this iteration only)
2. Implementation happens...
3. Increment completes ✅
4. Increment spec stays for history (or can be deleted)
```

**Phase 3: Increment 2** (Password Reset)
```bash
User: "/specweave:increment 0002-password-reset"
PM Agent:
1. Creates increment spec:
   → .specweave/increments/0002-password-reset/spec.md
   → References SAME living docs: "See SPEC-001"
   → Contains ONLY US-004 to US-005 (focused, this iteration only)
2. Implementation happens...
3. Increment completes ✅
```

**Phase 4: All Increments Done!**
```bash
After ALL increments complete (0001, 0002, 0003, 0004):
- ✅ Living docs spec REMAINS (permanent knowledge base)
- ⏳ Increment specs can be deleted (optional cleanup)
- ✅ Complete history preserved in SPEC-001
- ✅ GitHub Project linked to SPEC-001 (not increments)
```

## Relationship Diagram

```
SPEC-001: User Authentication (Living Docs - Permanent, Feature-Level)
├── 0001-user-auth-mvp (Increment - Temporary, Implementation-Level)
├── 0002-password-reset (Increment - Temporary, Implementation-Level)
├── 0003-social-login (Increment - Temporary, Implementation-Level)
└── 0004-two-factor-auth (Increment - Temporary, Implementation-Level)

SPEC-002: Payment Processing (Living Docs - Permanent, Feature-Level)
├── 0005-stripe-integration (Increment - Temporary, Implementation-Level)
├── 0006-subscription-billing (Increment - Temporary, Implementation-Level)
└── 0007-invoice-generation (Increment - Temporary, Implementation-Level)
```

## Analogy

- **Living Docs Specs** = 📚 Wikipedia Article (permanent, comprehensive, updated over time)
- **Increment Specs** = 📝 Sticky Note Reminder (temporary, focused, disposable after done)

## Related Terms

- [SpecWeave](./specweave.md) - The framework
- [Increment](./increment.md) - Unit of work
- [Living Docs](./living-docs.md) - Permanent documentation
- [User Story](./user-story.md) - User-facing requirement
- [AC-ID](./ac-id.md) - Acceptance Criteria ID

## Learn More

- [Planning Guide](/docs/workflows/planning)
- [Living Documentation](/docs/glossary/terms/living-docs)
- [Specs Architecture (Internal)](../../.specweave/increments/0007-smart-increment-discipline/reports/SPECS-ARCHITECTURE-CLARIFICATION.md)
