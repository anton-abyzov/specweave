---
increment: 0037-project-specific-tasks
title: "Strategic Init & Project-Specific Architecture"
priority: P1
status: planned
created: 2025-11-15
updated: 2025-11-16
planned: 2025-11-16
feature: FS-037
projects: ['specweave']
type: feature
test_mode: TDD
coverage_target: 95
estimated_effort: 78-107 hours
total_tasks: 85
---

# Feature: Strategic Init & Project-Specific Architecture

## Quick Overview

**COMBINED SCOPE**: Transform `specweave init` into research-driven strategic planning session that detects architecture early (Phase 0), then implements copy-based sync with project-specific tasks (Phase 1-4).

**Phase 0: Research-Driven Init** (NEW!)
- Vision & market research to inform architecture decisions
- Compliance standards detection (GDPR, HIPAA, PCI-DSS, SOC2, FedRAMP, etc.)
- Ultra-smart team structure recommendations (beyond backend/frontend)
- Serverless & cost optimization suggestions ($1,520/month savings)
- Waterfall vs Agile methodology support
- **NEW**: Repository batch selection with pattern-based filtering (owner/org/prefix rules)

**Phase 1-4: Copy-Paste AC/Tasks to User Stories** (SIMPLIFIED!)
- User Stories ARE already project-specific (in `specs/{project}/FS-XXX/`)
- Copy-paste relevant ACs and Tasks into User Story files (no separate "project tasks.md"!)
- Bidirectional sync with validation (GitHub ↔ Increment tasks.md)
- Reopen mechanism (if code missing but task marked complete → reopen)

**Key Paradigm**: Research insights determine architecture → Architecture determines projects → Projects are known from day 1 → COPY-PASTE ACs/Tasks to User Stories (no transformation, no separate layers)

**Living Docs Spec**: [FS-037: Strategic Init & Project Architecture](../../docs/internal/specs/_features/FS-037/FEATURE.md)

---

## Problem Statement

### Phase 0 Problem: Architecture Without Context

**Current State** (WRONG):
```
specweave init
→ Question: "What's your architecture pattern?"
→ User: "Uh... microservices?" (has no idea!)
→ SpecWeave: Creates generic config
→ 3 months later: "Why did we build Kubernetes for 100 users?!"
```

**Why This Fails**:
1. **No Vision Context**: Don't ask about scaling goals, market, or budget
2. **Technical Jargon**: "Microservices" and "monorepo" confuse 80% of users
3. **Generic Architecture**: Recommendations don't match actual needs
4. **Late Project Detection**: Projects detected during sync (too late!)
5. **No Compliance Guidance**: Users don't know HIPAA/PCI-DSS applies to them
6. **Wrong Cost Model**: Traditional servers when serverless saves $1,520/month
7. **Missing Team Guidance**: Only asks backend/frontend, ignores auth/security/DevSecOps

**Required Approach** (CORRECT):
```
specweave init (Research-Driven)
→ Question: "What's your product vision?" (1 sentence)
→ AI Analysis: Detects viral potential, enterprise customers, compliance needs
→ Question: "What's your scaling goal?" (1K, 10K, 100K, 1M+ users)
→ AI Insights: Viral potential → Serverless, Free tier focus
→ Question: "What data will you handle?" (email, healthcare, payments)
→ AI Detection: Healthcare → HIPAA, Payments → PCI-DSS
→ Recommended Architecture: Serverless + Compliance + Right-sized teams
→ Projects Known From Day 1 → Copy-based sync
```

**Key Insight**: **Research findings determine architecture, not the other way around!**

---

### Phase 1-4 Problem: User Stories Missing ACs and Tasks

**User Feedback** (from increment 0034):
> "Tasks are related to User Stories, which are project related and not cross projects!! It will make it simpler, as all internal docs project feature US will just use copy-pasted Acceptance Criteria AND Tasks as a part of implementation!!!"

**Critical Insight**:
> "We will just need to update status for each task, US, AC and support bidirectional, e.g. I update tasks status in GH, then increment spec tasks.md MUST update as well after GitHub sync. But special validate commands MUST verify if code is still not there and task is not completed, in fact it will be reopened, or User Story reopened, or AC and increment could be reopened!"

**Current Architecture** (WRONG):
```
Increment: 0031-external-tool-status-sync/
├── spec.md (has all ACs)
└── tasks.md (has all tasks)

User Story: specs/backend/FS-031/us-001-authentication.md
└── Just links to increment tasks.md
    ❌ Problem: No copy of ACs/Tasks in User Story file!
    ❌ Problem: Backend and Frontend share same file!
```

**Required Architecture** (CORRECT - SIMPLE!):
```
Increment: 0031-external-tool-status-sync/
├── spec.md (SOURCE OF TRUTH for ACs)
└── tasks.md (SOURCE OF TRUTH for Tasks)
    ↓ (COPY-PASTE relevant ACs/Tasks by AC-ID)

User Story: specs/backend/FS-031/us-001-authentication.md
├── Acceptance Criteria (copied from increment spec.md)
├── Tasks (copied from increment tasks.md, filtered by AC-ID)
└── Status tracking (bidirectional with GitHub)

User Story: specs/frontend/FS-031/us-001-authentication.md
├── Acceptance Criteria (copied from increment spec.md)
├── Tasks (copied from increment tasks.md, filtered by AC-ID)
└── Status tracking (bidirectional with GitHub)

✅ User Stories ARE already project-specific!
✅ No need for separate "project tasks.md" files!
✅ Just copy-paste relevant content!
```

---

## Solution Approach

### Phase 0: Research-Driven Init (NEW!)

**Objective**: Transform `specweave init` into strategic planning session that uses research insights to recommend perfect architecture.

**6-Phase Research Flow**:

```
1. VISION & MARKET RESEARCH
   → User describes product (1 sentence)
   → AI analyzes: market size, competitors, viral potential
   → AI asks follow-up questions based on vision

2. SCALING & PERFORMANCE GOALS
   → Expected user count: 1K, 10K, 100K, 1M+
   → Growth rate: Steady, Viral spike, Enterprise slow burn
   → AI determines: Serverless vs Traditional

3. DATA & COMPLIANCE DETECTION
   → What data will you handle? (email, healthcare, payments, student records)
   → AI auto-detects: GDPR, HIPAA, PCI-DSS, SOC2, FERPA, COPPA, etc.
   → AI suggests compliance teams (auth, security, DevSecOps)

4. BUDGET & CLOUD CREDITS
   → Funding status: Bootstrapped, Seed funded, Series A+
   → AI recommends: AWS Activate, Azure for Startups, GCP Cloud ($100K-$350K available)
   → AI suggests: Free tier focus, serverless cost optimization

5. METHODOLOGY & ORGANIZATION
   → Organization type: Solo dev, Startup, Scale-up, Enterprise
   → Methodology: Agile (Scrum/Kanban) or Waterfall (with approval gates)
   → SpecWeave supports BOTH (increments = sprints OR phases)

6. ARCHITECTURE RECOMMENDATION
   → AI synthesizes ALL insights
   → Presents architecture with rationale
   → Example: "Viral potential + bootstrapped + global → Serverless + CDN + Free tier"
```

**Key Components**:

1. **Vision Analyzer** (AI-powered):
   - Extracts keywords ("Figma", "project management", "remote teams")
   - Detects market (productivity SaaS, healthcare, fintech, etc.)
   - Finds comparable products (competitors analysis)
   - Calculates opportunity score (market size vs competition)

2. **Compliance Detector**:
   - Healthcare data → HIPAA, HITRUST, FDA 21 CFR Part 11
   - Payment data → PCI-DSS, PSD2, SOX
   - Personal data → GDPR, CCPA, PIPEDA, LGPD
   - Government contracts → FedRAMP, FISMA, CMMC, ITAR
   - Student records → FERPA, COPPA
   - Financial services → GLBA, SOC2, ISO 27001
   - Critical infrastructure → NERC CIP

3. **Team Structure Recommender** (Ultra-Smart):
   - **Core Development**: Backend, Frontend, Mobile (always)
   - **Security/Compliance** (when needed):
     - HIPAA → Separate auth team + data team
     - PCI-DSS → Isolated payments team (or use Stripe!)
     - SOC2/ISO 27001 → DevSecOps team + CISO (if >15 people)
   - **Infrastructure**:
     - Platform team (if >5 microservices)
     - Data team (if analytics/ML)
     - Observability team (if >20 services)
   - **Specialized Services**:
     - Payments, Notifications, Analytics
     - File storage, Image processing, Email
   - **Serverless Recommendations**:
     - Auth → AWS Cognito/Auth0 (saves $185/month)
     - File uploads → S3 + Lambda (saves $480/month)
     - Image processing → Lambda/Cloudinary (saves $490/month)
     - Email → SendGrid/SES (saves $85/month)
     - Background jobs → Lambda (saves $280/month)
     - **Total savings: $1,520/month**

4. **Architecture Decision Engine**:
   ```typescript
   // Pseudo-code for architecture selection
   if (vision.viral && budget.bootstrapped) {
     return {
       architecture: 'serverless',
       rationale: 'Viral potential needs instant scaling, bootstrapped needs $0 fixed costs',
       infrastructure: ['AWS Lambda', 'Supabase', 'Vercel'],
       estimatedCost: '$10/month → $850/month at 10K users'
     };
   } else if (compliance.hipaa && data.phi) {
     return {
       architecture: 'traditional + compliance',
       rationale: 'HIPAA requires BAA, audit logs, encrypted storage',
       infrastructure: ['AWS ECS', 'RDS encrypted', 'CloudTrail'],
       teams: ['auth-team', 'data-team', 'devsecops-team'],
       estimatedCost: '$3K/month minimum (compliance overhead)'
     };
   }
   ```

**Output**: `.specweave/config.json` with:
- Projects defined (backend, frontend, auth, payments, etc.)
- Compliance standards configured
- Team structure documented
- Architecture rationale saved
- Cloud credits information
- Methodology (Agile vs Waterfall)

**Benefit**: Projects are known from DAY 1 → Copy-based sync (no transformation logic!)

---

### Phase 1-4: Copy-Paste ACs/Tasks to User Stories (SIMPLIFIED!)

**Core Principle**: User Stories ARE already project-specific (in `specs/{project}/FS-XXX/`). Just copy-paste relevant content!

**Data Flow Diagram 1: Increment → Living Docs → GitHub** (Developer marks task/AC complete)

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)                        │
│                                                              │
│ .specweave/increments/0031/                                 │
│ ├── spec.md                                                 │
│ │   └── [x] AC-US1-01: JWT token generation (backend)      │
│ │                                                            │
│ └── tasks.md                                                │
│     └── [x] T-001: Setup JWT service (AC-US1-01)           │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (COPY to living docs - filtered by project/AC-ID)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY                             │
│                                                              │
│ specs/backend/FS-031/us-001-authentication.md               │
│                                                              │
│ ## Acceptance Criteria (COPIED from increment spec.md)     │
│ - [x] AC-US1-01: JWT token generation (backend)            │
│                                                              │
│ ## Implementation (COPIED tasks from increment tasks.md)   │
│ - [x] T-001: Setup JWT service                             │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (GitHub sync - visualize as checkboxes)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                                       │
│                                                              │
│ Issue #123: US-001 Authentication (Backend)                │
│                                                              │
│ ## Acceptance Criteria                                      │
│ - [x] AC-US1-01: JWT token generation (backend)            │
│                                                              │
│ ## Subtasks                                                  │
│ - [x] T-001: Setup JWT service                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Flow**: Developer completes work → Updates increment → Propagates to living docs → Syncs to GitHub

---

**Data Flow Diagram 2: GitHub → Living Docs → Increment** (Stakeholder checks checkbox)

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                                       │
│                                                              │
│ Issue #123: US-001 Authentication (Backend)                │
│                                                              │
│ ## Acceptance Criteria                                      │
│ - [x] AC-US1-01: JWT token generation (backend) ← CHECKED! │
│                                                              │
│ ## Subtasks                                                  │
│ - [x] T-001: Setup JWT service ← CHECKED!                  │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (GitHub sync detects checkbox change)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY                             │
│                                                              │
│ specs/backend/FS-031/us-001-authentication.md               │
│                                                              │
│ ## Acceptance Criteria (synced from GitHub)                │
│ - [x] AC-US1-01: JWT token generation (backend) ← UPDATED! │
│                                                              │
│ ## Implementation (synced from GitHub)                      │
│ - [x] T-001: Setup JWT service ← UPDATED!                  │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (Living docs sync - update source of truth)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: INCREMENT (Source of Truth)                        │
│                                                              │
│ .specweave/increments/0031/                                 │
│ ├── spec.md                                                 │
│ │   └── [x] AC-US1-01: JWT token (backend) ← UPDATED!      │
│ │                                                            │
│ └── tasks.md                                                │
│     └── [x] T-001: Setup JWT service ← UPDATED!            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Flow**: Stakeholder checks checkbox in GitHub → Syncs to living docs → Updates increment source of truth

---

**Key Points**:
- ✅ User Story has **COPIED ACs** (not referenced!)
- ✅ User Story has **COPIED tasks** in Implementation section (not referenced!)
- ✅ GitHub Issue shows BOTH as checkable checkboxes (subtasks)
- ✅ **TWO separate flows**: Increment → GitHub AND GitHub → Increment
- ✅ Living Docs is the **middle layer** in both flows

**Example**:

**Increment spec.md** (Source of Truth for ACs):
```markdown
## US-001: Implement Authentication

**Acceptance Criteria**:
- [x] **AC-US1-01**: JWT token generation (backend) (P1)
- [ ] **AC-US1-02**: Login form component (frontend) (P1)
- [ ] **AC-US1-03**: Protected routes (frontend) (P1)
```

**Increment tasks.md** (Source of Truth for Tasks):
```markdown
- [x] **T-001**: Setup JWT service (AC-US1-01)
- [ ] **T-002**: Create login API endpoint (AC-US1-01)
- [ ] **T-003**: Build login form component (AC-US1-02)
- [ ] **T-004**: Add route protection HOC (AC-US1-03)
```

**User Story: specs/backend/FS-031/us-001-authentication.md** (COPIED content):
```markdown
## Acceptance Criteria (COPIED from increment spec.md, filtered by backend)
- [x] **AC-US1-01**: JWT token generation (backend) (P1)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint

> **Note**: Task status syncs with increment tasks.md
```

**User Story: specs/frontend/FS-031/us-001-authentication.md** (COPIED content):
```markdown
## Acceptance Criteria (COPIED from increment spec.md, filtered by frontend)
- [ ] **AC-US1-02**: Login form component (frontend) (P1)
- [ ] **AC-US1-03**: Protected routes (frontend) (P1)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-ID)
- [ ] **T-003**: Build login form component
- [ ] **T-004**: Add route protection HOC

> **Note**: Task status syncs with increment tasks.md
```

**GitHub Issue** (After specweave-github:sync):
```markdown
# US-001: Implement Authentication (Backend)

**Feature**: [FS-031: External Tool Status Sync](../../specs/_features/FS-031/FEATURE.md)

## Acceptance Criteria (synced bidirectionally!)
- [x] **AC-US1-01**: JWT token generation (backend)

## Subtasks (synced bidirectionally!)
- [x] **T-001**: Setup JWT service
- [ ] **T-002**: Create login API endpoint

> **Bidirectional Sync**:
> - ACs: GitHub ↔ Living Docs US ↔ Increment spec.md
> - Subtasks: GitHub ↔ Living Docs Implementation ↔ Increment tasks.md
```

### Bidirectional Sync Rules (Three-Layer Architecture)

**TWO Three-Layer Sync Flows**:

1. **Acceptance Criteria (ACs)**: GitHub ↔ Living Docs US ↔ Increment spec.md
2. **Tasks (Subtasks)**: GitHub ↔ Living Docs Implementation ↔ Increment tasks.md

**Architecture for Tasks**:
```
Layer 1: GitHub Issue Subtasks (UI for stakeholders)
    ↕
Layer 2: Living Docs User Story Implementation (specs/project/FS-XXX/us-001.md)
    ↕
Layer 3: Increment tasks.md (source of truth)
```

**Architecture for Acceptance Criteria**:
```
Layer 1: GitHub Issue Acceptance Criteria (UI for stakeholders)
    ↕
Layer 2: Living Docs User Story Acceptance Criteria (specs/project/FS-XXX/us-001.md)
    ↕
Layer 3: Increment spec.md (source of truth)
```

**Rule 1A: Tasks - GitHub → Living Docs → Increment**
```
1. User checks subtask checkbox in GitHub Issue
   ↓
2. GitHub sync detects change
   ↓
3. Living Docs specs FS US Implementation section is checked
   ↓
4. Increment tasks.md is checked (source of truth updated)
```

**Rule 1B: ACs - GitHub → Living Docs → Increment**
```
1. User checks AC checkbox in GitHub Issue
   ↓
2. GitHub sync detects change
   ↓
3. Living Docs specs FS US Acceptance Criteria section is checked
   ↓
4. Increment spec.md is checked (source of truth updated)
```

**Rule 2A: Tasks - Increment → Living Docs → GitHub**
```
1. Increment tasks.md file has task, it becomes completed (checked)
   ↓
2. Living Docs sync detects change
   ↓
3. Living Docs specs FS US Implementation tasks becomes checked
   ↓
4. GitHub issue subtasks becomes checked
```

**Rule 2B: ACs - Increment → Living Docs → GitHub**
```
1. Increment spec.md has AC, it becomes completed (checked)
   ↓
2. Living Docs sync detects change
   ↓
3. Living Docs specs FS US Acceptance Criteria becomes checked
   ↓
4. GitHub issue AC checkboxes becomes checked
```

**Rule 3: Validation → Reopen** (Code Verification)
```
Validate command checks:
1. Is task marked complete in tasks.md?
2. Does the code actually exist?

If task complete BUT code missing:
→ Reopen task in increment tasks.md
→ Propagate to Living Docs Implementation section
→ Propagate to GitHub issue subtasks
→ If needed, reopen User Story/AC/Increment
```

**Rule 4: Completion Propagation** (Bottom-Up)
```
All tasks for AC-US1-01 complete (in increment tasks.md)
→ Mark AC-US1-01 as complete
→ Propagate to Living Docs
→ Propagate to GitHub
→ Check if all ACs for US-001 complete
→ If YES → Mark US-001 as complete
→ Check if all USs for increment complete
→ If YES → Mark increment as complete
```

---

## User Stories

### PHASE 0: RESEARCH-DRIVEN INIT (NEW!)

---

### US-001: Vision & Market Research Engine

**As a** user starting a new SpecWeave project
**I want** AI-powered vision analysis and market research during init
**So that** my architecture recommendations are based on actual market potential and competitive landscape

**Acceptance Criteria**:
- [x] **AC-US1-01**: Vision analyzer extracts keywords from product description (P1, testable)
- [x] **AC-US1-02**: Market detection identifies industry (SaaS, healthcare, fintech, e-commerce) (P1, testable)
- [x] **AC-US1-03**: Competitor analysis finds 3-5 comparable products (P2, testable)
- [x] **AC-US1-04**: Opportunity score calculated (market size vs competition, 1-10 scale) (P2, testable)
- [x] **AC-US1-05**: Follow-up questions adapt based on vision (viral → scaling, enterprise → compliance) (P1, testable)
- [x] **AC-US1-06**: Vision insights stored in config for architecture decision (P1, testable)
- [ ] **AC-US1-07**: User-friendly questions (no jargon like "microservices" or "monorepo") (P1, testable)
- [x] **AC-US1-08**: Research findings saved to `.specweave/reports/market-research.md` (P2, testable)

**Implementation Notes**:
- Use LLM for vision analysis (similar to bmad-method plugin)
- Store insights in config under `research.vision` section
- Progressive disclosure: 2-3 questions instead of 5-7

---

### US-002: Compliance Standards Detection

**As a** user handling sensitive data
**I want** automatic compliance standards detection (GDPR, HIPAA, PCI-DSS, etc.)
**So that** I build compliant architecture from day 1 instead of refactoring later

**Acceptance Criteria**:
- [x] **AC-US2-01**: Data type detection asks user: "What data will you handle?" (P1, testable)
- [x] **AC-US2-02**: Healthcare data → Auto-detects HIPAA, HITRUST, FDA 21 CFR Part 11 (P1, testable)
- [x] **AC-US2-03**: Payment data → Auto-detects PCI-DSS, PSD2, SOX (P1, testable)
- [x] **AC-US2-04**: Personal data + EU users → Auto-detects GDPR, CCPA, PIPEDA, LGPD (P1, testable)
- [x] **AC-US2-05**: Government contracts → Auto-detects FedRAMP, FISMA, CMMC, ITAR (P2, testable)
- [x] **AC-US2-06**: Student records → Auto-detects FERPA, COPPA (P2, testable)
- [x] **AC-US2-07**: Financial services → Auto-detects GLBA, SOC2, ISO 27001 (P2, testable)
- [x] **AC-US2-08**: Critical infrastructure → Auto-detects NERC CIP (P3, testable)
- [x] **AC-US2-09**: Compliance standards stored in config with team impact notes (P1, testable)
- [x] **AC-US2-10**: User shown compliance requirements summary before finalizing (P1, testable)

**Compliance Table** (30+ standards):

| Data Type | Detected Standards | Team Impact |
|-----------|-------------------|-------------|
| Healthcare (PHI) | HIPAA, HITRUST, FDA 21 CFR Part 11 | Auth team, Data team, DevSecOps |
| Payment (PCI) | PCI-DSS, PSD2, SOX | Isolated payments team (use Stripe!) |
| Personal (PII) | GDPR, CCPA, PIPEDA, LGPD | Privacy engineering, DPO |
| Government | FedRAMP, FISMA, CMMC, ITAR | Large compliance team, ISSO |
| Student records | FERPA, COPPA | Age verification, parental consent |
| Financial | GLBA, SOC2, ISO 27001 | DevSecOps, CISO |

---

### US-003: Ultra-Smart Team Detection

**As a** user planning team structure
**I want** intelligent team recommendations beyond backend/frontend
**So that** I know if I need auth, security, DevSecOps, or serverless teams

**Acceptance Criteria**:
- [x] **AC-US3-01**: Core teams always created: backend, frontend, mobile (if applicable) (P1, testable)
- [x] **AC-US3-02**: HIPAA detected → Suggests separate auth team + data team (P1, testable)
- [x] **AC-US3-03**: PCI-DSS detected → Suggests isolated payments team OR Stripe integration (P1, testable)
- [x] **AC-US3-04**: SOC2/ISO 27001 + >15 people → Suggests DevSecOps team + CISO (P1, testable)
- [x] **AC-US3-05**: >5 microservices → Suggests platform team (infrastructure) (P2, testable)
- [x] **AC-US3-06**: Analytics/ML detected → Suggests data team (P2, testable)
- [x] **AC-US3-07**: >20 services → Suggests observability team (P3, testable)
- [x] **AC-US3-08**: Specialized services identified: payments, notifications, analytics (P2, testable)
- [x] **AC-US3-09**: Serverless recommendations for specific use cases (auth, file uploads, email) (P1, testable)
- [x] **AC-US3-10**: Team structure stored in config with rationale (P1, testable)
- [x] **AC-US3-11**: Cost savings calculated for serverless recommendations (P2, testable)

**Serverless Savings**:
- Auth → AWS Cognito/Auth0: $185/month saved
- File uploads → S3 + Lambda: $480/month saved
- Image processing → Lambda/Cloudinary: $490/month saved
- Email → SendGrid/SES: $85/month saved
- Background jobs → Lambda: $280/month saved
- **Total: $1,520/month savings**

---

### US-004: Repository Batch Selection with Pattern-Based Filtering

**As a** user with multiple repositories (3+, 10+, 50+, or 100+ repos)
**I want** to select repositories using pattern-based rules (prefix, owner/org, keyword filters)
**So that** I don't waste time manually selecting each repository during multi-repo init

**Acceptance Criteria**:
- [x] **AC-US4-01**: Detect multi-repo scenario during init (user has 3+ repositories) (P1, testable)
- [x] **AC-US4-02**: Offer batch selection options for ALL multi-repo setups: "All repos", "By prefix", "By owner/org", "By keyword", "Manual selection" (P1, testable)
- [x] **AC-US4-03**: Prefix rule: User enters "ec-" → Selects all repos starting with "ec-" (e.g., ec-frontend, ec-backend, ec-api) (P1, testable)
- [x] **AC-US4-04**: Owner/org rule: User enters "my-organization" → Selects all repos in that GitHub org/owner (P1, testable)
- [ ] **AC-US4-05**: Keyword rule: User enters "service" → Selects all repos with "service" in name (e.g., auth-service, payment-service) (P2, testable)
- [ ] **AC-US4-06**: Combined rules: User can combine filters (e.g., "ec-" prefix + "my-org" owner) (P2, testable)
- [ ] **AC-US4-07**: Preview selected repositories before confirming (count + list) (P1, testable)
- [ ] **AC-US4-08**: Allow manual exclusions after batch selection ("Exclude ec-deprecated") (P2, testable)
- [ ] **AC-US4-09**: Save batch selection rules to config for future use (P2, testable)
- [ ] **AC-US4-10**: Adaptive UX: Suggest "All repos" for 3-5 repos, recommend "Pattern" for 50+ repos (P1, testable)
- [ ] **AC-US4-11**: Fallback to manual selection if user prefers (P1, testable)

**Example Flow 1: Small Multi-Repo Setup (3-5 repos)**:
```
specweave init --multi-repo

Question: "How many repositories are in this project?"
→ User: "3 repos"

Suggestion: "Since you have multiple repositories, would you like to use a quick selection method?"
Options:
1. All repositories from my GitHub account/org (fastest)
2. Pattern-based selection (e.g., prefix like "myapp-")
3. Manual selection (enter each repository URL)

→ User: "All repositories from my GitHub account/org"

Question: "GitHub username or organization?"
→ User: "my-company"

Preview: Found 5 repositories for "my-company":
✓ myapp-frontend
✓ myapp-backend
✓ myapp-api
✓ legacy-project (exclude? y/n)
✓ demo-app (exclude? y/n)

→ User: "y" (exclude legacy-project), "y" (exclude demo-app)

✅ 3 repositories selected! (Saved manual entry time!)
```

**Example Flow 2: Large Multi-Repo Setup (50+ repos)**:
```
specweave init --multi-repo

Question: "How many repositories are in this project?"
→ User: "About 50 repos"

Recommendation: "For large multi-repo setups, pattern-based selection is fastest!"

Question: "How would you like to select repositories?"
Options:
1. Pattern-based selection (prefix, keyword, org) ← RECOMMENDED
2. All repositories from my GitHub account/org
3. Manual selection (enter each repository URL)

→ User: "Pattern-based selection"

Question: "What's the repository naming pattern?"
Examples:
- Prefix: "ec-" (e.g., ec-frontend, ec-backend, ec-api)
- Owner/org: "my-company" (all repos from GitHub org)
- Keyword: "service" (all repos containing "service")
- Combined: "ec-" prefix + "my-company" owner

→ User: "ec-"

Preview: Found 23 repositories matching "ec-*":
- ec-frontend
- ec-backend
- ec-api
- ec-auth-service
... (19 more)

Confirm selection? (y/n)
→ User: "y"

✅ 23 repositories selected! (Saved 22 manual entries!)
```

**Benefits**:
- **Time Savings**: Select 3-5 repos in 10 seconds, 50 repos in 30 seconds (vs 1-5 minutes manually)
- **Accuracy**: Pattern matching reduces typos/errors
- **Consistency**: Rules ensure all matching repos are included
- **Scalability**: Works for 3, 10, 50, 100+ repositories (adaptive UX based on count)
- **Reusability**: Save rules for future init (new projects)
- **Smart Suggestions**: "All repos" for 3-5, "Pattern" recommended for 50+

**Implementation Notes**:
- Use GitHub API to fetch user's repositories
- Support local git remote parsing as fallback (no GitHub API)
- Store rules in `.specweave/config.json` under `repositories.selectionRules`
- Pattern matching uses glob-style patterns (`*`, `?`, `[...]`)

---

### US-005: Architecture Decision Engine

**As a** user completing init
**I want** AI to synthesize all research insights into architecture recommendation
**So that** I get perfect architecture match from day 1 (serverless vs traditional, monolith vs microservices)

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Vision insights + scaling goals + budget → Architecture decision (P1, testable)
- [ ] **AC-US5-02**: Viral potential + bootstrapped → Recommends serverless (P1, testable)
- [ ] **AC-US5-03**: Enterprise + compliance → Recommends traditional + compliance features (P1, testable)
- [ ] **AC-US5-04**: Learning project → Recommends YAGNI + free tier (P1, testable)
- [ ] **AC-US5-05**: Architecture includes infrastructure recommendations (AWS, Azure, GCP) (P1, testable)
- [ ] **AC-US5-06**: Cost estimation provided ($X/month at 1K, 10K, 100K users) (P2, testable)
- [x] **AC-US5-07**: Cloud credits information shown (AWS Activate, Azure for Startups, GCP Cloud) (P2, testable)
- [ ] **AC-US5-08**: Rationale clearly explained (why this architecture?) (P1, testable)
- [ ] **AC-US5-09**: User can accept/reject/modify recommendation (P1, testable)
- [ ] **AC-US5-10**: Final architecture stored in config with all rationale (P1, testable)
- [ ] **AC-US5-11**: Projects list generated based on architecture (backend, frontend, auth, etc.) (P1, testable)
- [ ] **AC-US5-12**: Waterfall vs Agile methodology support configured (P1, testable)

**Decision Logic**:
```typescript
// Example architecture decisions
if (vision.viral && budget.bootstrapped) {
  architecture = 'serverless';
  cost = '$10/month → $850/month at 10K users';
} else if (compliance.hipaa && data.phi) {
  architecture = 'traditional + compliance';
  cost = '$3K/month minimum (compliance overhead)';
}
```

---

### PHASE 1-4: PROJECT-SPECIFIC TASKS (Existing)

---

### US-006: Copy ACs and Tasks to User Story Implementation Section

**Complete Details**: [US-001](../../docs/internal/specs/specweave/FS-037/us-001-task-splitting-logic.md)

**As a** developer working on multi-project features
**I want** ACs and Tasks COPIED into User Story Implementation section
**So that** GitHub sync can create checkable subtasks (no separate TASKS.md files!)

**Acceptance Criteria**:
- [ ] **AC-US6-01**: SpecDistributor copies ACs from increment spec.md to User Story files during sync (P1, testable)
- [ ] **AC-US6-02**: SpecDistributor copies Tasks into `## Implementation` section, filtered by AC-ID (P1, testable)
- [ ] **AC-US6-03**: User Story files have `## Acceptance Criteria` and `## Implementation` sections (P1, testable)
- [ ] **AC-US6-04**: Implementation section has COPIED tasks from increment tasks.md (filtered by AC-ID) (P1, testable)
- [ ] **AC-US6-05**: Tasks are filtered by AC-ID (only tasks for ACs in that User Story) (P1, testable)
- [ ] **AC-US6-06**: ACs are filtered by project keywords (backend, frontend, mobile) from description (P1, testable)
- [ ] **AC-US6-07**: Status checkboxes preserved during sync ([ ] vs [x]) (P1, testable)
- [ ] **AC-US6-08**: NO separate `specs/{project}/FS-XXX/TASKS.md` files created (P1, testable)
- [ ] **AC-US6-09**: Backward compatibility: Existing increments without Implementation section still work (P1, testable)

**Key Simplification**: User Stories have `## Implementation` section with COPIED tasks from increment tasks.md (not a separate file!).

---

### US-007: Three-Layer Bidirectional Sync with Validation

**Complete Details**: [US-002](../../docs/internal/specs/specweave/FS-037/us-002-bidirectional-completion-tracking.md)

**As a** developer updating task status
**I want** status changes to sync through three layers (GitHub → Living Docs → Increment) with code validation
**So that** all three layers stay in sync and tasks can't be marked complete without actual code

**Acceptance Criteria**:

**Three-Layer Architecture**:
- [ ] **AC-US7-01**: Layer 1 = GitHub Issue Subtasks (UI for stakeholders) (P1, testable)
- [ ] **AC-US7-02**: Layer 2 = Living Docs User Story Implementation (specs/project/FS-XXX/us-001.md) (P1, testable)
- [ ] **AC-US7-03**: Layer 3 = Increment tasks.md (source of truth) (P1, testable)

**Sync Flow 1: GitHub → Living Docs → Increment**:
- [ ] **AC-US7-04**: User checks subtask in GitHub → Living Docs Implementation checked → Increment tasks.md checked (P1, testable)
- [ ] **AC-US7-05**: GitHub sync detects checkbox change (P1, testable)
- [ ] **AC-US7-06**: Living Docs file updates first (P1, testable)
- [ ] **AC-US7-07**: Increment tasks.md updates last (source of truth) (P1, testable)

**Sync Flow 2: Increment → Living Docs → GitHub**:
- [ ] **AC-US7-08**: Increment tasks.md checked → Living Docs Implementation checked → GitHub subtask checked (P1, testable)
- [ ] **AC-US7-09**: Living Docs sync detects increment change (P1, testable)
- [ ] **AC-US7-10**: Living Docs file updates first (P1, testable)
- [ ] **AC-US7-11**: GitHub issue subtasks update last (P1, testable)

**Validation & Reopen Logic**:
- [ ] **AC-US7-12**: Validate command checks if code exists for completed tasks (P1, testable)
- [ ] **AC-US7-13**: If task complete BUT code missing → Reopen in increment tasks.md (P1, testable)
- [ ] **AC-US7-14**: Reopen propagates: Increment → Living Docs → GitHub (P1, testable)
- [ ] **AC-US7-15**: If needed, reopen User Story/AC/Increment (P1, testable)

**Completion Propagation** (Bottom-Up):
- [ ] **AC-US7-16**: All tasks for AC complete → Mark AC as complete in increment (P1, testable)
- [ ] **AC-US7-17**: Completion propagates: Increment → Living Docs → GitHub (P1, testable)

**Key Innovation**: Three-layer sync ensures all representations stay consistent!

---

### US-008: GitHub Issue with Feature Link & Bidirectional AC/Task Sync

**Complete Details**: [US-003](../../docs/internal/specs/specweave/FS-037/us-003-github-sync-integration.md)

**As a** stakeholder viewing GitHub issues
**I want** to see Feature link, ACs, and Subtasks with bidirectional sync
**So that** I can track progress, navigate to Feature, and update checkboxes which sync to increment

**Acceptance Criteria**:

**Issue Structure**:
- [ ] **AC-US8-01**: GitHub issue has link to Feature in `specs/_features/FS-XXX/FEATURE.md` (P1, testable)
- [ ] **AC-US8-02**: Feature link appears at top of issue body (P1, testable)
- [ ] **AC-US8-03**: If _epics exist (for ADO/JIRA), link to Epic as well (P2, testable)

**Issue Body Content**:
- [ ] **AC-US8-04**: GitHub issue body shows ACs from User Story file (P1, testable)
- [ ] **AC-US8-05**: GitHub issue body shows Subtasks from User Story Implementation section (P1, testable)
- [ ] **AC-US8-06**: ACs and Subtasks appear as checkable checkboxes in GitHub issue (P1, testable)
- [ ] **AC-US8-07**: Checkbox status matches increment status ([ ] vs [x]) (P1, testable)

**Three-Layer Sync for ACs** (GitHub ↔ Living Docs ↔ Increment spec.md):
- [ ] **AC-US8-08**: User checks AC in GitHub → Living Docs US AC checked → Increment spec.md checked (P1, testable)
- [ ] **AC-US8-09**: Increment spec.md AC changes → Living Docs US AC updates → GitHub AC updates (P1, testable)

**Three-Layer Sync for Tasks** (GitHub ↔ Living Docs ↔ Increment tasks.md):
- [ ] **AC-US8-10**: User checks subtask in GitHub → Living Docs Implementation checked → Increment tasks.md checked (P1, testable)
- [ ] **AC-US8-11**: Increment tasks.md changes → Living Docs Implementation updates → GitHub subtasks update (P1, testable)

**Progress Tracking**:
- [ ] **AC-US8-12**: Progress comments show completion % (Subtasks: 3/5, ACs: 2/3) (P2, testable)
- [ ] **AC-US8-13**: Issue state auto-updates (open → in-progress → completed) based on progress (P1, testable)
- [ ] **AC-US8-14**: Issue links back to User Story file in specs/{project}/FS-XXX/ (P2, testable)

**Key Features**:
- Feature link at top
- **TWO bidirectional syncs**: ACs (GitHub ↔ US ↔ spec.md) AND Tasks (GitHub ↔ Implementation ↔ tasks.md)!

---

### US-009: Testing & Migration Strategy

**Complete Details**: [US-004](../../docs/internal/specs/specweave/FS-037/us-004-testing-migration-strategy.md)

**As a** SpecWeave contributor
**I want** comprehensive test coverage and migration strategy for ALL features (Phase 0 + Phase 1-4)
**So that** existing increments remain compatible and new features work reliably

**Acceptance Criteria**:

**Phase 0 Tests (Strategic Init)**:
- [ ] **AC-US9-01**: Unit tests cover vision analyzer (keyword extraction, market detection) (P1, testable)
- [ ] **AC-US9-02**: Unit tests cover compliance detector (all 30+ standards) (P1, testable)
- [ ] **AC-US9-03**: Unit tests cover team recommender (compliance-driven teams) (P1, testable)
- [ ] **AC-US9-04**: Unit tests cover architecture decision engine (P1, testable)
- [ ] **AC-US9-05**: Unit tests cover repository batch selection (pattern matching, preview) (P1, testable)
- [ ] **AC-US9-06**: Integration tests cover full init flow (vision → architecture) (P1, testable)
- [ ] **AC-US9-07**: E2E tests cover user scenarios (viral product, enterprise, HIPAA, multi-repo) (P1, testable)

**Phase 1-4 Tests (Project Tasks)**:
- [ ] **AC-US9-08**: Unit tests cover task splitting logic (95%+ coverage) (P1, testable)
- [ ] **AC-US9-09**: Unit tests cover bidirectional completion tracking (95%+ coverage) (P1, testable)
- [ ] **AC-US9-10**: Integration tests cover full living docs sync with project tasks (P1, testable)
- [ ] **AC-US9-11**: E2E tests cover complete workflow (increment → sync → GitHub) (P1, testable)
- [ ] **AC-US9-12**: Backward compatibility tests verify existing increments work (P1, testable)
- [ ] **AC-US9-13**: Migration script converts existing increments to project tasks (P2, testable)
- [ ] **AC-US9-14**: Performance tests ensure sync completes within 5 seconds (P2, testable)
- [ ] **AC-US9-15**: Error handling tests cover edge cases (missing files, malformed tasks) (P1, testable)

---

## Success Criteria

### Functional Metrics
- **Task Splitting Accuracy**: 95%+ tasks correctly classified by project (backend vs frontend)
- **Bidirectional Sync Correctness**: 100% completion state consistency (no orphaned tasks)
- **Backward Compatibility**: 100% existing increments work without modification

### Quality Metrics
- **Test Coverage**: 95%+ overall (unit + integration + E2E)
- **Performance**: Living docs sync completes within 5 seconds for 100 tasks
- **Error Handling**: Zero crashes on malformed input (graceful degradation)

### User Experience Metrics
- **GitHub Issue Quality**: Stakeholders can see project-specific progress without repository access
- **Developer Clarity**: Backend/frontend teams report clear task ownership (user survey)
- **Migration Success**: 100% of existing increments migrated without data loss

---

## Architecture Reference

**Complete Design Document**: [PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md](../0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md)

### Key Components

**1. SpecDistributor Enhancement** (`src/core/living-docs/spec-distributor.ts`):
- Generates project TASKS.md files during living docs sync
- Splits increment tasks by project (keyword/tech stack detection)
- Creates bidirectional links (project task → increment task)

**2. CompletionCalculator Enhancement** (`plugins/specweave-github/lib/completion-calculator.ts`):
- Reads BOTH increment AND project tasks
- Validates completion state consistency
- Calculates progress % based on project task completion

**3. GitHub Sync Enhancement** (`plugins/specweave-github/lib/`):
- Updates issue body with project-specific task lists
- Shows progress comments with project breakdown
- Verification gate checks project task completion

---

## Implementation Phases

### PHASE 0: RESEARCH-DRIVEN INIT (60-80 hours)

**Phase 0.1: Vision & Market Research Engine (15-20 hours)**
- **Files**: `src/init/research/vision-analyzer.ts`, `market-detector.ts`, `competitor-analyzer.ts`
- **Output**: AI-powered vision analysis, market detection, competitor research
- **Dependencies**: LLM integration (similar to bmad-method plugin)

**Phase 0.2: Compliance Standards Detection (15-20 hours)**
- **Files**: `src/init/compliance/compliance-detector.ts`, `compliance-standards.ts`
- **Output**: Auto-detection of 30+ compliance standards (GDPR, HIPAA, PCI-DSS, FedRAMP, etc.)
- **Key**: Compliance mapping table (data type → standards → team impact)

**Phase 0.3: Ultra-Smart Team Detection (10-15 hours)**
- **Files**: `src/init/team/team-recommender.ts`, `serverless-analyzer.ts`
- **Output**: Team structure recommendations (auth, security, DevSecOps, serverless)
- **Key**: Serverless cost savings calculator ($1,520/month potential)

**Phase 0.4: Repository Batch Selection (8-12 hours)**
- **Files**: `src/init/repo/repository-selector.ts`, `pattern-matcher.ts`, `github-api-client.ts`
- **Output**: Pattern-based repository selection (prefix, owner/org, keyword filters)
- **Key**: Batch selection rules with preview and manual exclusions
- **Features**: GitHub API integration, glob pattern matching, selection rule persistence

**Phase 0.5: Architecture Decision Engine (15-20 hours)**
- **Files**: `src/init/architecture/architecture-decision-engine.ts`, `cost-estimator.ts`
- **Output**: Research-driven architecture recommendations with rationale
- **Key**: Decision logic (vision + scaling + budget → perfect architecture)

**Phase 0.6: User-Friendly Init Flow (5-10 hours)**
- **Files**: `src/init/init-flow.ts` (enhanced with research flow)
- **Output**: Progressive disclosure, no jargon, 2-3 questions
- **Key**: Adaptive questions based on user responses

**Total Phase 0 Effort**: 68-92 hours (increased by 8-12 hours for repository batch selection)

---

### PHASE 1-4: COPY-PASTE ACs/TASKS (10-15 hours - SIMPLER!)

**Phase 1: Copy-Paste ACs/Tasks to User Stories (3-4 hours)**
- **Files**: `src/core/living-docs/spec-distributor.ts`
- **Output**: User Story files get `## Acceptance Criteria` and `## Tasks` sections (copied from increment)
- **Logic**: Filter ACs by project keywords, filter Tasks by AC-ID
- **Key**: NO separate TASKS.md files! Everything in User Story files!

**Phase 2: Bidirectional Sync with Validation (4-5 hours)**
- **Files**: `plugins/specweave-github/lib/sync-manager.ts`, `validation-checker.ts`
- **Output**: Bidirectional sync (GitHub ↔ Increment ↔ User Story) with code validation
- **Logic**:
  - GitHub checkbox change → Increment tasks.md updates
  - Validation checks if code exists → Reopens if missing

**Phase 3: GitHub Sync Integration (2-3 hours)**
- **Files**: `plugins/specweave-github/lib/user-story-issue-builder.ts`
- **Output**: GitHub issues show User Story ACs and Tasks as checkboxes
- **Logic**: Read ACs/Tasks from User Story file, render as checkboxes in issue body

**Phase 4: Testing & Migration (3-3 hours)**
- **Files**: 8 test files (unit, integration, E2E) + migration script
- **Output**: 95%+ test coverage + migration script for existing increments
- **Key**: Simpler than three-level hierarchy! Fewer tests needed!

**Total Phase 1-4 Effort**: 10-15 hours (REDUCED from 15-20 hours due to simplification!)

---

### TOTAL ESTIMATED EFFORT: 78-107 hours (12-17 weeks part-time)

**Breakdown**:
- Phase 0 (Strategic Init): 68-92 hours (includes 8-12 hours for repository batch selection)
- Phase 1-4 (Copy-Paste ACs/Tasks): 10-15 hours (REDUCED due to simplification!)
- **Total**: 78-107 hours (increased from 70-95 hours due to US-004 repository batch selection feature)

---

## Benefits

### PHASE 0 BENEFITS (Strategic Init)

**Perfect Architecture Match**:
- Research-driven recommendations (not guesses!)
- Vision → Market → Budget → Architecture
- Example: Viral product + bootstrapped → Serverless (saves $1,520/month)

**Compliance from Day 1**:
- Auto-detect 30+ standards (GDPR, HIPAA, PCI-DSS, FedRAMP, etc.)
- Know compliance needs BEFORE building
- Avoid 3-6 months refactoring (typical compliance retrofit)

**Right-Sized Teams**:
- Beyond backend/frontend (auth, security, DevSecOps, serverless)
- HIPAA → Separate auth team + data team
- PCI-DSS → Isolated payments team (or use Stripe!)
- SOC2 + >15 people → DevSecOps team + CISO

**Cost Optimization**:
- Serverless recommendations where appropriate
- Auth → AWS Cognito: $185/month saved
- File uploads → S3 + Lambda: $480/month saved
- Image processing → Lambda: $490/month saved
- Email → SendGrid/SES: $85/month saved
- Background jobs → Lambda: $280/month saved
- **Total: $1,520/month savings**

**Cloud Credits Awareness**:
- AWS Activate: $1K-$300K (12 months)
- Azure for Startups: $1K-$100K (90-180 days)
- GCP Cloud: $2K-$350K (24 months)
- Users know what's available from day 1

**User-Friendly Experience**:
- No jargon ("How many repositories?" not "Monorepo?")
- 80% faster completion (5 min → 1 min for learning projects)
- Progressive disclosure (2-3 questions, not 5-7)

**Methodology Support**:
- BOTH Agile and Waterfall
- Increments = Sprints (Agile) OR Phases (Waterfall)
- Approval gates for Waterfall compliance

---

### PHASE 1-4 BENEFITS (Copy-Paste ACs/Tasks)

**Radical Simplification**:
- User Stories ARE already project-specific (in `specs/{project}/FS-XXX/`)
- Just copy-paste relevant ACs and Tasks (no separate TASKS.md files!)
- No three-level hierarchy needed
- No complex transformation logic

**Clear Ownership**:
- Backend User Story: Has backend ACs and Tasks
- Frontend User Story: Has frontend ACs and Tasks
- Mobile User Story: Has mobile ACs and Tasks
- No confusion about who does what

**Granular Tracking**:
- Each User Story tracks its own ACs and Tasks independently
- GitHub issues show User Story-specific completion %
- Stakeholders see which User Story (project) is blocking

**Bidirectional Sync with Validation**:
- GitHub checkbox change → Increment tasks.md updates
- Increment tasks.md change → User Story file updates
- User Story change → GitHub issue updates
- **NEW**: Validate command checks if code exists → Reopens task if missing!

**Source of Truth Discipline**:
- Increment spec.md = Source of truth for ACs
- Increment tasks.md = Source of truth for Tasks
- User Stories = Copies filtered by AC-ID and project keywords
- Changes propagate from source → copies

**Copy-Based Sync** (Enabled by Phase 0):
- Projects known from day 1 → Simple copy-paste
- No transformation logic needed
- 80%+ code reduction (simpler than three-level hierarchy!)
- 100% accuracy (just copying content!)

---

## Migration Strategy

### Backward Compatibility

**Problem**: Existing increments have user stories linking to `increments/####/tasks.md` (no project tasks).

**Solution**: Lazy migration on next sync (auto-generate project tasks from increment tasks).

**Configuration** (`.specweave/config.json`):
```json
{
  "livingDocs": {
    "projectTasks": {
      "enabled": true,
      "migrationMode": "auto-generate",
      "autoSplitTasks": true
    }
  }
}
```

### Migration Script

**File**: `scripts/migrate-to-project-tasks.ts`

**Usage**:
```bash
# Dry run (preview changes)
npm run migrate:project-tasks -- --dry-run

# Migrate all increments
npm run migrate:project-tasks

# Migrate specific increment
npm run migrate:project-tasks -- 0031
```

---

## Related Documentation

- **Architecture Design**: [PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md](../0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md)
- **Living Spec**: [FS-037 Feature Overview](../../docs/internal/specs/_features/FS-037/FEATURE.md)
- **User Stories**:
  - [US-001: Task Splitting Logic](../../docs/internal/specs/specweave/FS-037/us-001-task-splitting-logic.md)
  - [US-002: Bidirectional Completion Tracking](../../docs/internal/specs/specweave/FS-037/us-002-bidirectional-completion-tracking.md)
  - [US-003: GitHub Sync Integration](../../docs/internal/specs/specweave/FS-037/us-003-github-sync-integration.md)
  - [US-004: Testing & Migration Strategy](../../docs/internal/specs/specweave/FS-037/us-004-testing-migration-strategy.md)

---

## Research Documentation

**Complete Research Archive** (200,000+ words):

**Core Research**:
- [ULTRATHINK-RESEARCH-DRIVEN-ARCHITECTURE.md](./reports/ULTRATHINK-RESEARCH-DRIVEN-ARCHITECTURE.md) - Final integrated approach (20K words)
- [ULTRATHINK-STRATEGIC-INIT.md](./reports/ULTRATHINK-STRATEGIC-INIT.md) - Strategic planning with 4 modes (31K words)
- [ULTRATHINK-ULTRA-SMART-TEAM-DETECTION.md](./reports/ULTRATHINK-ULTRA-SMART-TEAM-DETECTION.md) - Beyond backend/frontend (25K words)
- [ULTRATHINK-USER-FRIENDLY-INIT.md](./reports/ULTRATHINK-USER-FRIENDLY-INIT.md) - No-jargon questions (17K words)
- [ULTRATHINK-ARCHITECTURE-AWARE-PLANNING.md](./reports/ULTRATHINK-ARCHITECTURE-AWARE-PLANNING.md) - Copy-based sync paradigm (30K words)

**Supporting Documents**:
- [ADR-COPY-BASED-SYNC.md](./reports/ADR-COPY-BASED-SYNC.md) - Architecture Decision Record (23K words)
- [CONFIG-SCHEMA.md](./reports/CONFIG-SCHEMA.md) - Config schema design (24K words)
- [PM-AGENT-MULTI-PROJECT.md](./reports/PM-AGENT-MULTI-PROJECT.md) - PM Agent enhancement (21K words)
- [COMPLETE-STRATEGIC-ARCHITECTURE-RESEARCH.md](./reports/COMPLETE-STRATEGIC-ARCHITECTURE-RESEARCH.md) - Summary (18K words)

**Key Insights**:
- **30+ Compliance Standards**: GDPR, HIPAA, PCI-DSS, FedRAMP, FISMA, CMMC, ITAR, FERPA, COPPA, SOC2, ISO 27001, etc.
- **Cloud Credits Research**: AWS Activate ($1K-$300K), Azure for Startups ($1K-$100K), GCP Cloud ($2K-$350K)
- **Serverless Savings**: $1,520/month potential (auth, file uploads, email, image processing, background jobs)
- **4 Strategic Modes**: Learning Project, Startup/Product, Enterprise, Research First
- **Waterfall Support**: Increments = Phases with approval gates
- **Copy-Based Sync**: 74% code reduction, 5-10x faster

---

**Status**: Planning
**Priority**: P1 (blocking multi-project workflow + strategic planning)
**Scope**: COMBINED - Phase 0 (Strategic Init + Repository Batch Selection) + Phase 1-4 (Copy-Paste ACs/Tasks - SIMPLIFIED!)
**Estimated Effort**: 78-107 hours total (12-17 weeks part-time) - includes new US-004 repository batch selection
**Timeline**: 3-4 months (part-time) or 6-8 weeks (full-time)
**Test Coverage Target**: 95%+
**Key Simplification**: User Stories ARE already project-specific! Just copy-paste ACs/Tasks. No separate TASKS.md files!
**New Feature**: Repository batch selection with pattern-based filtering (owner/org/prefix rules) saves massive time for multi-repo setups!
