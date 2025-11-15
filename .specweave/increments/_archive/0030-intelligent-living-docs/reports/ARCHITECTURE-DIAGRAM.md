# Living Docs Architecture: Visual Reference

## 🏗️ THE TWO-TIER ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL TOOLS                                 │
│                     (GitHub, Jira, Azure DevOps)                         │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
         ┌──────────▼──────────┐      ┌────────────▼─────────┐
         │   EPIC / PROJECT    │      │   STORY / ISSUE      │
         │   (Permanent)       │      │   (Temporary)        │
         └──────────┬──────────┘      └────────────┬─────────┘
                    │                               │
                    │                               │
┌───────────────────▼─────────────────────────────────────────────────────┐
│                        SPECWEAVE INTERNAL                                │
└──────────────────────────────────────────────────────────────────────────┘
                    │                               │
         ┌──────────▼──────────┐      ┌────────────▼─────────┐
         │  LIVING DOCS SPEC   │      │  INCREMENT SPEC      │
         │  (Permanent)        │◄─────│  (Temporary)         │
         │                     │      │                      │
         │  SPEC-001-auth.md   │      │  0001-basic-auth/    │
         │                     │      │  spec.md             │
         │  • All user stories │      │  • References SPEC   │
         │  • Links to arch    │      │  • Subset of stories │
         │  • External links   │      │  • Out of scope      │
         │  • Impl history     │      │  • Impl details      │
         └─────────────────────┘      └──────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   ARCHITECTURE      │
         │   (Referenced)      │
         │                     │
         │  • HLD-auth.md      │
         │  • ADR-001.md       │
         │  • diagrams/        │
         └─────────────────────┘
```

---

## 📊 CONTENT FLOW: What Goes Where

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER REQUEST: "Add Authentication"                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    PM AGENT ANALYZES   │
                    │                        │
                    │  • Market research     │
                    │  • Competitor analysis │
                    │  • User stories (20+)  │
                    │  • Acceptance criteria │
                    └────────┬───────────────┘
                             │
                    ┌────────▼────────┐
                    │  CREATE SPEC    │
                    └────────┬────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────────┐              ┌──────────────────────┐
│   LIVING DOCS       │              │   INCREMENT          │
│   SPEC-001-auth.md  │              │   0001-basic-auth    │
│   (Permanent)       │              │   spec.md            │
│                     │              │   (Temporary)        │
│ ✅ ALL 20 stories   │              │ ✅ 3 stories (MVP)   │
│ ✅ Links to arch    │              │ ✅ Ref: SPEC-001     │
│ ✅ External links   │              │ ✅ Out of scope: 17  │
│ ❌ NO arch details  │              │ ❌ NO arch details   │
│ ❌ NO impl details  │              │ ✅ Impl notes        │
└──────────┬──────────┘              └─────────┬────────────┘
           │                                   │
           │                                   ▼
           │                         ┌─────────────────┐
           │                         │   TASK EXECUTION│
           │                         │   Complete MVP  │
           │                         └─────────┬───────┘
           │                                   │
           │                         ┌─────────▼───────┐
           │                         │   HOOK FIRES    │
           │                         │   sync living   │
           │                         │   docs          │
           │                         └─────────┬───────┘
           │                                   │
           └───────────────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   UPDATE LIVING DOCS │
                    │                      │
                    │ ✅ Mark US-001 done  │
                    │ ✅ Mark US-002 done  │
                    │ ✅ Mark US-003 done  │
                    │ ✅ Update impl hist  │
                    │ ❌ NO arch dupe      │
                    └──────────────────────┘
```

---

## 🔄 SYNC LOGIC: Before vs After

### BEFORE (WRONG ❌)

```
Increment Created
  ├── spec.md (contains EVERYTHING)
  │   ├── User stories
  │   ├── Architecture details
  │   ├── ADR summaries
  │   ├── Success metrics
  │   └── Future enhancements
  │
  └── Hook fires
      │
      └── copyIncrementSpecToLivingDocs()
          │
          └── Living Docs
              └── SPEC-001.md (EXACT COPY)
                  ├── User stories ✅
                  ├── Architecture details ❌ DUPLICATE
                  ├── ADR summaries ❌ DUPLICATE
                  ├── Success metrics ❌ DUPLICATE
                  └── Future enhancements ❌ DUPLICATE

Result: MASSIVE DUPLICATION + CONFUSION
```

### AFTER (CORRECT ✅)

```
Increment Created
  ├── spec.md (references living docs)
  │   ├── "Implements: SPEC-001 (US-001, US-002, US-003)"
  │   ├── User stories (SUBSET - 3 stories)
  │   ├── Out of scope (17 stories deferred)
  │   └── Implementation notes
  │
  └── Hook fires
      │
      └── extractAndMergeLivingDocs()
          │
          ├── Parse increment spec
          │   └── Extract user stories ONLY
          │
          ├── Load living docs (if exists)
          │   └── SPEC-001.md
          │
          ├── Merge new stories (if not exist)
          │
          ├── Update implementation history
          │   └── "0001-basic-auth: US-001, US-002, US-003 (Complete)"
          │
          ├── Generate links (don't duplicate)
          │   ├── Architecture: ../../architecture/hld-auth.md
          │   └── ADRs: ../../architecture/adr/001-oauth.md
          │
          └── Write living docs
              └── SPEC-001.md
                  ├── User stories ✅ (ALL 20)
                  ├── Implementation history ✅ (brief)
                  ├── Architecture links ✅ (NO duplication)
                  └── ADR links ✅ (NO duplication)

Result: CLEAN SEPARATION + NO DUPLICATION
```

---

## 🗂️ FILE ORGANIZATION

```
.specweave/
├── docs/
│   └── internal/
│       ├── specs/                    ← LIVING DOCS (Permanent)
│       │   └── default/
│       │       ├── SPEC-001-auth.md  ← ALL auth user stories
│       │       ├── SPEC-002-payments.md
│       │       └── SPEC-003-calendar.md
│       │
│       └── architecture/             ← REFERENCED (Not duplicated)
│           ├── hld-auth.md
│           ├── hld-payments.md
│           └── adr/
│               ├── 001-oauth.md
│               └── 002-stripe.md
│
└── increments/                       ← TEMPORARY ITERATIONS
    ├── 0001-basic-auth/              ← Implements SPEC-001 (US-001 to US-003)
    │   ├── spec.md                   ← References SPEC-001, 3 stories only
    │   ├── plan.md
    │   └── tasks.md
    │
    ├── 0002-oauth-integration/       ← Implements SPEC-001 (US-004 to US-007)
    │   ├── spec.md                   ← References SPEC-001, 4 stories only
    │   ├── plan.md
    │   └── tasks.md
    │
    └── 0003-payment-setup/            ← Implements SPEC-002 (US-001 to US-005)
        ├── spec.md                   ← References SPEC-002, 5 stories only
        ├── plan.md
        └── tasks.md
```

---

## 🔗 EXTERNAL TOOL MAPPING

```
┌────────────────────────────────────────────────────────────────────────┐
│                            GITHUB                                      │
└────────────────────────────────────────────────────────────────────────┘

  📋 Project: "Authentication"
  (Linked to SPEC-001-auth.md)
  │
  ├─ 🔹 Issue #101: "Basic Auth MVP"
  │  (Linked to 0001-basic-auth/spec.md)
  │  ├─ ☑ US-001: User login
  │  ├─ ☑ US-002: Password reset
  │  └─ ☐ US-003: Session management
  │
  ├─ 🔹 Issue #145: "OAuth Integration"
  │  (Linked to 0002-oauth-integration/spec.md)
  │  ├─ ☐ US-004: Google OAuth
  │  ├─ ☐ US-005: GitHub OAuth
  │  └─ ☐ US-006: SAML support
  │
  └─ 🔹 Issue #189: "Payment Setup"
     (Linked to 0003-payment-setup/spec.md)
     ├─ ☐ US-001: Stripe checkout
     ├─ ☐ US-002: Subscription billing
     └─ ☐ US-003: Invoice generation

┌────────────────────────────────────────────────────────────────────────┐
│                            JIRA                                        │
└────────────────────────────────────────────────────────────────────────┘

  📦 Epic: "PROJ-100: Authentication"
  (Linked to SPEC-001-auth.md)
  │
  ├─ 📝 Story: "PROJ-101: Basic Auth MVP"
  │  (Linked to 0001-basic-auth/spec.md)
  │  ├─ ☑ Subtask: US-001
  │  ├─ ☑ Subtask: US-002
  │  └─ ☐ Subtask: US-003
  │
  ├─ 📝 Story: "PROJ-102: OAuth Integration"
  │  (Linked to 0002-oauth-integration/spec.md)
  │  ├─ ☐ Subtask: US-004
  │  ├─ ☐ Subtask: US-005
  │  └─ ☐ Subtask: US-006
  │
  └─ 📝 Story: "PROJ-103: Payment Setup"
     (Linked to 0003-payment-setup/spec.md)
     ├─ ☐ Subtask: US-001
     ├─ ☐ Subtask: US-002
     └─ ☐ Subtask: US-003

┌────────────────────────────────────────────────────────────────────────┐
│                         AZURE DEVOPS                                   │
└────────────────────────────────────────────────────────────────────────┘

  🎯 Feature: "Authentication System"
  (Linked to SPEC-001-auth.md)
  │
  ├─ 📋 User Story: "Basic Auth MVP"
  │  (Linked to 0001-basic-auth/spec.md)
  │  ├─ ☑ Task: US-001
  │  ├─ ☑ Task: US-002
  │  └─ ☐ Task: US-003
  │
  ├─ 📋 User Story: "OAuth Integration"
  │  (Linked to 0002-oauth-integration/spec.md)
  │  ├─ ☐ Task: US-004
  │  ├─ ☐ Task: US-005
  │  └─ ☐ Task: US-006
  │
  └─ 📋 User Story: "Payment Setup"
     (Linked to 0003-payment-setup/spec.md)
     ├─ ☐ Task: US-001
     ├─ ☐ Task: US-002
     └─ ☐ Task: US-003
```

---

## 🎭 USER STORY FLOW

```
Step 1: PM Creates Living Docs Spec
───────────────────────────────────
SPEC-001-auth.md
├── US-001: User login
├── US-002: Password reset
├── US-003: Session management
├── US-004: Google OAuth
├── US-005: GitHub OAuth
├── US-006: SAML support
├── US-007: MFA
├── US-008: Account recovery
├── US-009: Security audit
└── US-010: Penetration testing

Step 2: PM Creates First Increment
───────────────────────────────────
0001-basic-auth/spec.md
├── Implements: SPEC-001
├── In scope:
│   ├── US-001 ✅
│   ├── US-002 ✅
│   └── US-003 ✅
└── Out of scope:
    ├── US-004 → 0002
    ├── US-005 → 0002
    ├── US-006 → 0003
    ├── US-007 → 0004
    ├── US-008 → 0004
    ├── US-009 → 0005
    └── US-010 → 0005

Step 3: Increment Completes
───────────────────────────────────
Hook fires → Update living docs

SPEC-001-auth.md
├── US-001: User login ✅ (0001)
├── US-002: Password reset ✅ (0001)
├── US-003: Session management ✅ (0001)
├── US-004: Google OAuth ⏳ (0002 in progress)
├── US-005: GitHub OAuth 📋 (0002 planned)
├── US-006: SAML support 📋 (0003 planned)
├── US-007: MFA 📋 (0004 planned)
├── US-008: Account recovery 📋 (0004 planned)
├── US-009: Security audit 📋 (0005 planned)
└── US-010: Penetration testing 📋 (0005 planned)

Implementation History:
├── 0001-basic-auth: US-001, US-002, US-003 ✅ (2025-10-15)
├── 0002-oauth-integration: US-004, US-005 ⏳ (In Progress)
└── 0003-saml-support: US-006 📋 (Planned)

Step 4: All Increments Complete
───────────────────────────────────
SPEC-001-auth.md
├── All 10 user stories: ✅ COMPLETE
└── Implementation history: 5 increments

External Tools:
├── GitHub Project: https://github.com/org/repo/projects/1
├── Jira Epic: PROJ-100
└── Azure DevOps Feature: #1000
```

---

## 📋 QUICK REFERENCE

### What Goes in Living Docs?
✅ ALL user stories (permanent)
✅ Implementation history (brief)
✅ Links to architecture (NOT duplicate)
✅ Links to ADRs (NOT duplicate)
✅ External tool links (GitHub, Jira, ADO)
❌ Technical details (those live in architecture/)
❌ Success metrics (those live in increment reports)
❌ Future enhancements (those live in roadmap)

### What Goes in Increment Specs?
✅ Reference to living docs ("Implements SPEC-001")
✅ Subset of user stories (ONLY this increment)
✅ Out of scope section (deferred stories)
✅ Implementation notes (specific to this iteration)
❌ Architecture duplication (just reference living docs)
❌ Complete feature history (that's in living docs)

### External Tool Mapping
Living Docs = Epic/Project/Feature (PERMANENT)
Increment = Story/Issue/User Story (TEMPORARY)
tasks.md = Subtasks/Checkboxes/Tasks (EPHEMERAL)

---

**This diagram explains the entire architecture visually!**
