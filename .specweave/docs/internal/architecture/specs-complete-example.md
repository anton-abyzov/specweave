# Complete Specs Architecture (brownfield-first)

## 🎯 The Big Picture: No Duplication!

```
.specweave/docs/internal/
│
├── strategy/                    ✅ PRD-* (Business requirements)
│   ├── PRD-001-authentication.md
│   ├── PRD-002-dashboard.md
│   └── PRD-003-notifications.md
│
├── architecture/                ✅ HLD-*, ADR-* (Technical design)
│   ├── HLD-001-auth-flow.md
│   ├── HLD-002-dashboard-architecture.md
│   ├── adr/
│   │   ├── 0001-database-choice.md     (ADR-0001)
│   │   ├── 0012-oauth-vs-jwt.md        (ADR-0012)
│   │   └── 0015-react-vs-vue.md        (ADR-0015)
│   └── diagrams/
│       ├── auth-sequence.md
│       └── dashboard-component.md
│
├── operations/                  ✅ RUN-*, SLO-*, NFR-* (Production ops)
│   ├── RUN-001-auth-service.md
│   ├── RUN-002-dashboard-service.md
│   ├── SLO-001-auth-availability.md
│   ├── SLO-002-dashboard-latency.md
│   ├── NFR-001-auth-performance.md
│   └── NFR-002-dashboard-scalability.md
│
├── delivery/                    ✅ TST-* (Test strategies)
│   ├── TST-001-auth-test-strategy.md
│   └── TST-002-dashboard-test-strategy.md
│
├── governance/                  ✅ SEC-*, COMP-* (Policies)
│   ├── SEC-001-security-policy.md
│   └── COMP-001-data-privacy.md
│
└── specs/                       ✅ FS-* ONLY (Feature specs - living docs)
    │
    ├── BE/                      ← JIRA Project: Backend (key: BE)
    │   ├── README.md            (2 specs, 100% complete)
    │   ├── FS-001-api-v2.md
    │   │   Frontmatter:
    │   │     project: BE
    │   │     epic: BE-123
    │   │     strategy_docs: [PRD-001]
    │   │     architecture_docs: [HLD-001, ADR-0001, ADR-0012]
    │   │     operations_docs: [RUN-001, SLO-001, NFR-001]
    │   │     delivery_docs: [TST-001]
    │   │   Content:
    │   │     - References PRD-001 for business requirements
    │   │     - References HLD-001 for architecture
    │   │     - References ADR-0001, ADR-0012 for decisions
    │   │     - References RUN-001 for runbook
    │   │     - References SLO-001, NFR-001 for SLOs/NFRs
    │   │     - References TST-001 for test strategy
    │   │     - Implementation history (increments 0001, 0002, 0005)
    │   │     - User story status (from PRD-001)
    │   │
    │   └── FS-002-auth.md
    │       Frontmatter:
    │         project: BE
    │         epic: BE-124
    │         strategy_docs: [PRD-001]
    │         architecture_docs: [HLD-001, ADR-0012]
    │         operations_docs: [RUN-001, SLO-001]
    │       Content:
    │         - References (not duplicates!)
    │         - Implementation history
    │         - User story status
    │
    ├── FE/                      ← JIRA Project: Frontend (key: FE)
    │   ├── README.md            (1 spec, 50% complete)
    │   └── FS-001-dashboard.md
    │       Frontmatter:
    │         project: FE
    │         epic: FE-456
    │         strategy_docs: [PRD-002]
    │         architecture_docs: [HLD-002, ADR-0015]
    │         operations_docs: [RUN-002, SLO-002, NFR-002]
    │         delivery_docs: [TST-002]
    │       Content:
    │         - References PRD-002, HLD-002, etc.
    │         - Implementation history
    │         - User story status
    │
    ├── MOB/                     ← JIRA Project: Mobile (key: MOB)
    │   ├── README.md            (1 spec, 0% complete)
    │   └── FS-001-offline-mode.md
    │       Frontmatter:
    │         project: MOB
    │         epic: MOB-789
    │         strategy_docs: [PRD-003]
    │       Content:
    │         - References PRD-003
    │         - Implementation history
    │
    └── _index/                  ← Auto-generated navigation
        ├── README.md            (Master index: 4 specs across 3 projects)
        ├── by-project.md        (BE: 2, FE: 1, MOB: 1)
        ├── by-status.md         (Active: 1, Planning: 0, Completed: 3)
        ├── by-release.md        (1.0: 3, 1.1: 1)
        └── by-team.md           (Backend Team: 2, Frontend Team: 1, Mobile Team: 1)
```

## 2-Letter Document Codes (Complete Map)

| Code | Full Name | Location | Purpose | Example |
|------|-----------|----------|---------|---------|
| **FS** | Feature Spec | `specs/{project}/` | Living docs spec (permanent) | `FS-001-authentication.md` |
| **PRD** | Product Requirements Doc | `strategy/` | Business requirements | `PRD-001-authentication.md` |
| **HLD** | High-Level Design | `architecture/` | System design | `HLD-001-auth-flow.md` |
| **ADR** | Architecture Decision Record | `architecture/adr/` | Design decisions | `ADR-0012-oauth-vs-jwt.md` |
| **RUN** | Runbook | `operations/` | Incident response | `RUN-001-auth-service.md` |
| **SLO** | Service Level Objective | `operations/` | Reliability targets | `SLO-001-auth-availability.md` |
| **NFR** | Non-Functional Requirement | `operations/` | Performance, security | `NFR-001-auth-performance.md` |
| **TST** | Test Strategy | `delivery/` | Testing approach | `TST-001-auth-test-strategy.md` |
| **SEC** | Security Policy | `governance/` | Security guidelines | `SEC-001-security-policy.md` |
| **COMP** | Compliance Policy | `governance/` | Regulatory compliance | `COMP-001-data-privacy.md` |

**Result**: Each document type has ONE home, no overlap, clear naming!

## Document Flow (PRD → FS → Implementation)

```
Phase 1: Planning (PM)
├─ PRD-001-authentication.md created in strategy/
├─ HLD-001-auth-flow.md created in architecture/
├─ ADR-0012-oauth-vs-jwt.md created in architecture/adr/
├─ NFR-001-auth-performance.md created in operations/
├─ SLO-001-auth-availability.md created in operations/
└─ TST-001-auth-test-strategy.md created in delivery/

Phase 2: Specification (PM + Architect)
└─ FS-001-authentication.md created in specs/BE/
   Frontmatter:
     project: BE
     strategy_docs: [PRD-001]
     architecture_docs: [HLD-001, ADR-0012]
     operations_docs: [NFR-001, SLO-001]
     delivery_docs: [TST-001]
   Content:
     - References all above docs (no duplication!)
     - Implementation history (which increments)
     - User story status (from PRD-001)

Phase 3: Implementation (Tech Lead + Developer)
├─ 0001-core-auth (Complete) → Updates FS-001
├─ 0002-oauth-integration (Complete) → Updates FS-001
└─ 0005-production-hardening (Complete) → Updates FS-001

Phase 4: Operations (SRE)
└─ RUN-001-auth-service.md updated with production learnings
└─ FS-001 references RUN-001 (no duplication!)
```

## Example: Complete Feature Spec (FS)

```yaml
---
# Identity
id: FS-001-authentication
title: "User Authentication"
version: 2.0
status: completed

# Classification (brownfield: JIRA project)
project: BE                              ← JIRA project key
epic: BE-123                             ← JIRA epic key
external_url: https://jira.mycompany.com/browse/BE-123

# Ownership
team: Backend Team
owner: @john-doe
created: 2025-01-15
last_updated: 2025-11-10
target_release: 1.0.0

# References (to other internal/ folders) ✅ NO DUPLICATION!
strategy_docs:
  - PRD-001-authentication               # Business requirements
architecture_docs:
  - HLD-001-auth-flow                    # System design
  - ADR-0001-database-choice             # Database decision
  - ADR-0012-oauth-vs-jwt                # Auth method decision
operations_docs:
  - RUN-001-auth-service                 # Incident runbook
  - SLO-001-auth-availability            # 99.9% uptime target
  - NFR-001-auth-performance             # <100ms login time
delivery_docs:
  - TST-001-auth-test-strategy           # Test approach

# Relationships (to other specs)
increments: [0001, 0002, 0005]
depends_on: [FS-010-user-management]
blocks: [FS-015-social-login]
related: [FS-020-session-management]

# Metrics
estimated_effort: 120h
actual_effort: 95h
user_stories: 12
completion: 100%
---

# FS-001: User Authentication

## Quick Overview
OAuth 2.0 authentication for backend services with JWT tokens, session management, and password reset.

**Business Case**: See **PRD-001** for complete business requirements and user stories.

**Architecture**: See **HLD-001** for system design and **ADR-0012** for OAuth vs JWT decision.

**Operations**: See **RUN-001** for incident response, **SLO-001** for 99.9% availability target, and **NFR-001** for <100ms performance requirement.

**Testing**: See **TST-001** for complete test strategy (95% unit, 90% integration, 100% E2E critical paths).

## Implementation History

### 0001-core-auth (Complete - 2025-01-15)
- Basic login/logout with password hashing (bcrypt)
- JWT token generation and validation
- See **HLD-001** for architecture details

### 0002-oauth-integration (Complete - 2025-02-10)
- OAuth 2.0 flow implementation
- Integration with Google, GitHub providers
- See **ADR-0012** for why we chose OAuth over session-based auth

### 0005-production-hardening (Complete - 2025-03-05)
- Rate limiting (Redis-based)
- Session management and "Remember Me"
- Production monitoring and alerting
- See **RUN-001** for incident runbook
- See **SLO-001** for 99.9% availability SLO

## User Story Status (from PRD-001)

- ✅ **US-001**: User login with email/password (Complete - 0001)
- ✅ **US-002**: Password reset flow (Complete - 0001)
- ✅ **US-003**: OAuth social login (Complete - 0002)
- ✅ **US-004**: "Remember Me" functionality (Complete - 0005)
- ⏳ **US-005**: Two-factor authentication (Planned - 0008)
- ⏳ **US-006**: Biometric auth (Future - 1.1.0)

See **PRD-001** for complete user story details and acceptance criteria.

## Architecture & Design Decisions

- **System Design**: See **HLD-001** for complete auth flow diagrams
- **Database**: PostgreSQL for user storage - See **ADR-0001** for decision
- **Auth Method**: OAuth 2.0 + JWT - See **ADR-0012** for decision rationale
- **Token Storage**: httpOnly cookies for security

## Operations & Reliability

- **Runbook**: See **RUN-001** for incident response procedures
- **SLO**: 99.9% availability (monthly) - See **SLO-001** for details
- **Performance**: <100ms login time (p95) - See **NFR-001** for requirements
- **Monitoring**: Prometheus + Grafana dashboards
- **Alerting**: PagerDuty for availability < 99.5%

## Testing & Quality

- **Test Strategy**: See **TST-001** for complete approach
- **Coverage**: 95% unit, 90% integration, 100% E2E critical paths
- **Security**: OWASP Top 10 testing, penetration testing quarterly
- **Load Testing**: 10,000 concurrent users, <100ms p95

## Dependencies & Blockers

- **Depends On**: FS-010 (User Management) - Must complete first
- **Blocks**: FS-015 (Social Login) - Waiting for this
- **Related**: FS-020 (Session Management) - Shares components

## External Links

- **JIRA Epic**: https://jira.mycompany.com/browse/BE-123
- **GitHub Project**: https://github.com/mycompany/backend/projects/1
- **Production Dashboard**: https://grafana.mycompany.com/d/auth

---

**Status**: ✅ Complete (100% - 12/12 user stories)
**Release**: 1.0.0 (Shipped 2025-03-05)
**Team**: Backend Team
**Owner**: @john-doe
