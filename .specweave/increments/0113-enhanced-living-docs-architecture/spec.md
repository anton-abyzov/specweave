---
increment: 0113-enhanced-living-docs-architecture
title: "Enhanced Living Docs - Intelligent Codebase Understanding"
priority: P1
status: completed
created: 2025-12-06
completed: 2025-12-06
project: specweave
structure: user-stories
---

# Enhanced Living Docs - Intelligent Codebase Understanding

## Problem Statement

The current Living Docs Builder generates **superficial module documentation** that provides no real value:

### Current Output (Useless)
```
Imaging-Solutions-poc
- Files Analyzed: 1
- Source Files: 1
- Test Files: 0
- Total Exports: 0
- Has README: Yes
- Has Tests: No
```

**This is just stats!** It doesn't help anyone understand:
- What does this repo DO?
- How does it fit into the organization?
- What are the key concepts and APIs?
- How does it relate to other repos?

### What We Actually Need

A **multi-phase intelligent analysis** that:

1. **Deeply understands each repo** by reading actual code (source of truth)
2. **Synthesizes organization structure** by clustering repos into teams/microservices
3. **Generates architecture artifacts** based on real understanding
4. **Identifies questions and inconsistencies** for humans to address
5. **Takes as long as needed** - hours or days for large orgs is OK

---

## New Folder Structure

```
.specweave/docs/internal/
│
├── repos/                              # LOW-LEVEL: Per-repo deep analysis
│   ├── imaging-solutions-poc/
│   │   ├── overview.md                 # LLM-generated: What this repo does
│   │   ├── architecture.md             # Repo-level patterns & structure
│   │   ├── key-concepts.md             # Domain concepts & terminology
│   │   └── api-surface.md              # Public APIs, exports, interfaces
│   ├── nova-iomt-platform/
│   │   └── ...
│   └── _index.md                       # Summary of all repos
│
├── organization/                        # HIGH-LEVEL: Synthesized structure
│   ├── overview.md                     # Company-wide tech landscape
│   ├── teams/                          # Grouped by team ownership
│   │   ├── imaging-team/
│   │   │   ├── overview.md             # Team's mission & scope
│   │   │   ├── repos.md                # Repos owned by this team
│   │   │   └── dependencies.md         # Inter-team dependencies
│   │   ├── platform-team/
│   │   └── cloud-ops-team/
│   ├── microservices/                  # Grouped by service boundaries
│   │   ├── patient-data-service/
│   │   ├── imaging-service/
│   │   └── analytics-service/
│   └── domains/                        # Grouped by business domain
│       ├── clinical/
│       ├── operations/
│       └── infrastructure/
│
├── architecture/                        # SYNTHESIZED: Org-wide architecture
│   ├── overview.md                     # System landscape
│   ├── diagrams/
│   │   ├── c4-context.md               # External actors & systems
│   │   ├── c4-container.md             # Major containers/services
│   │   ├── data-flow.md                # How data moves
│   │   └── deployment.md               # Infrastructure topology
│   ├── adr/
│   │   ├── DETECTED-001-auth-pattern.md
│   │   ├── DETECTED-002-api-style.md
│   │   └── ...
│   └── patterns/
│       ├── authentication.md           # How auth works across org
│       ├── data-storage.md             # Database patterns
│       └── messaging.md                # Event/message patterns
│
├── strategy/                            # BUSINESS: Product & tech strategy
│   ├── product-areas.md                # Business domains mapped to code
│   ├── tech-debt-inventory.md          # Identified tech debt
│   ├── modernization-candidates.md     # Legacy systems to update
│   └── capability-gaps.md              # Missing capabilities
│
├── review-needed/                       # QUESTIONS: For humans to address
│   ├── _README.md                      # Explains this folder's purpose
│   ├── inconsistencies.md              # Contradictions found
│   ├── questions-for-cto.md            # Technical architecture questions
│   ├── questions-for-po.md             # Product/business questions
│   ├── unclear-ownership.md            # Repos without clear owners
│   ├── potential-duplicates.md         # Similar code in multiple places
│   ├── security-concerns.md            # Potential security issues
│   └── missing-documentation.md        # Critical docs that don't exist
│
├── temp/                                # WORKING: Intermediate analysis
│   ├── clustering-hypotheses.md        # How repos might group
│   ├── dependency-matrix.md            # Cross-repo dependencies
│   ├── naming-patterns.md              # Detected naming conventions
│   └── llm-observations.md             # Raw LLM insights
│
└── specs/                               # EXISTING: External tool imports
    ├── project-a/
    └── project-b/
```

---

## Analysis Phases

### Phase A: Repo Discovery (Quick - Minutes)
- Scan all repos/modules in umbrella project
- Collect basic metadata (file counts, languages, frameworks)
- Create skeleton entries in `/repos/`
- **Output**: `repos/_index.md` with repo list

### Phase B: Deep Repo Analysis (Slow - Hours)
**For each repo:**
1. **Read README** - Extract stated purpose
2. **Read package.json/config** - Understand dependencies
3. **Sample key files** - Entry points, main modules
4. **LLM Analysis** - Ask Claude to explain:
   - What is this repo's primary purpose?
   - What are the key domain concepts?
   - What are the main APIs/exports?
   - What patterns does it use?
5. **Save to `/repos/{name}/overview.md`**

**Checkpoint after each repo** - Resume if interrupted

### Phase C: Organization Clustering (Medium - 30min-2hrs)
1. **Load all repo analyses**
2. **Load external specs** from `/specs/` (Jira/ADO imports)
3. **LLM Clustering** - Ask Claude to:
   - Group repos by likely team ownership
   - Group repos by microservice boundaries
   - Group repos by business domain
   - Identify cross-cutting concerns
4. **Save hypotheses to `/temp/clustering-hypotheses.md`**
5. **Generate structure in `/organization/`**

### Phase D: Architecture Synthesis (Medium - 1-2hrs)
1. **Aggregate patterns** from all repos
2. **Build dependency graph** across repos
3. **LLM Synthesis** - Generate:
   - C4 diagrams (context, container)
   - Data flow diagrams
   - Detected ADRs (auth, API, storage patterns)
4. **Save to `/architecture/`**

### Phase E: Inconsistency Detection (Medium - 30min-1hr)
1. **Compare patterns across repos** - Find conflicts
2. **Check ownership** - Find orphaned repos
3. **Find duplicates** - Similar functionality in multiple places
4. **Security scan** - Obvious issues
5. **LLM Analysis** - Generate questions
6. **Save to `/review-needed/`**

### Phase F: Strategy Population (Quick - 15min)
1. **Aggregate tech debt** from analyses
2. **Map business domains** to code
3. **Identify capability gaps**
4. **Save to `/strategy/`**

---

## User Stories

### US-001: Deep Repo Understanding
**As a** developer joining a large organization
**I want** each repo to have an LLM-generated overview explaining its purpose
**So that** I can quickly understand what any repo does without reading all the code

**Acceptance Criteria:**
- [x] **AC-US1-01**: LLM reads actual source code (not just stats)
- [x] **AC-US1-02**: README is incorporated into understanding
- [x] **AC-US1-03**: Key domain concepts are extracted and explained
- [x] **AC-US1-04**: Main APIs/exports are documented
- [x] **AC-US1-05**: Each repo gets `repos/{name}/overview.md` with meaningful content
- [x] **AC-US1-06**: Analysis checkpoints after each repo (resume support)

### US-002: Organization Structure Synthesis
**As a** CTO reviewing our tech landscape
**I want** repos automatically grouped into teams/services/domains
**So that** I can see the big picture without manual curation

**Acceptance Criteria:**
- [x] **AC-US2-01**: Repos clustered by likely team ownership
- [x] **AC-US2-02**: Repos clustered by microservice boundaries
- [x] **AC-US2-03**: Repos clustered by business domain
- [x] **AC-US2-04**: External specs (from Jira/ADO) inform clustering
- [x] **AC-US2-05**: Generated structure saved to `/organization/`
- [x] **AC-US2-06**: Nested folders for hierarchy (teams → repos)

### US-003: Architecture Diagrams from Understanding
**As an** architect planning changes
**I want** C4 diagrams generated from actual code analysis
**So that** diagrams reflect reality, not outdated documentation

**Acceptance Criteria:**
- [x] **AC-US3-01**: C4 Context diagram shows system boundaries
- [x] **AC-US3-02**: C4 Container diagram shows major services
- [x] **AC-US3-03**: Data flow diagram shows information movement
- [x] **AC-US3-04**: Diagrams are Mermaid format (renderable)
- [x] **AC-US3-05**: Saved to `/architecture/diagrams/`

### US-004: Pattern Detection & ADRs
**As a** tech lead enforcing standards
**I want** architectural patterns auto-detected across repos
**So that** I know what patterns are actually in use

**Acceptance Criteria:**
- [x] **AC-US4-01**: Auth patterns detected (JWT, OAuth, sessions)
- [x] **AC-US4-02**: API patterns detected (REST, GraphQL, gRPC)
- [x] **AC-US4-03**: Data storage patterns detected
- [x] **AC-US4-04**: Each detected pattern generates an ADR
- [x] **AC-US4-05**: ADRs include confidence level and evidence
- [x] **AC-US4-06**: Saved to `/architecture/adr/DETECTED-*.md`

### US-005: Questions & Inconsistencies Report
**As a** product owner / CTO
**I want** a prioritized list of questions and issues found
**So that** I can address problems and provide missing context

**Acceptance Criteria:**
- [x] **AC-US5-01**: Inconsistencies between repos detected
- [x] **AC-US5-02**: Unclear ownership flagged
- [x] **AC-US5-03**: Potential duplicate functionality identified
- [x] **AC-US5-04**: Security concerns highlighted
- [x] **AC-US5-05**: Questions categorized (for CTO vs PO)
- [x] **AC-US5-06**: Saved to `/review-needed/` folder
- [x] **AC-US5-07**: Each question includes context & evidence

### US-006: Strategy & Tech Debt Inventory
**As a** engineering manager planning roadmap
**I want** tech debt and capability gaps inventoried
**So that** I can prioritize modernization efforts

**Acceptance Criteria:**
- [x] **AC-US6-01**: Tech debt items extracted from code analysis
- [x] **AC-US6-02**: Business domains mapped to codebases
- [x] **AC-US6-03**: Modernization candidates identified
- [x] **AC-US6-04**: Capability gaps noted
- [x] **AC-US6-05**: Saved to `/strategy/` folder

### US-007: Long-Running Background Job Support
**As a** user with large codebase (100+ repos)
**I want** the analysis to run for hours/days if needed
**So that** every repo gets proper deep analysis

**Acceptance Criteria:**
- [x] **AC-US7-01**: Each phase has checkpoint/resume support
- [x] **AC-US7-02**: Progress visible via `specweave jobs --follow`
- [x] **AC-US7-03**: Partial results visible immediately (incremental)
- [x] **AC-US7-04**: Job can be paused/resumed across sessions
- [x] **AC-US7-05**: Intermediate results saved to `/temp/`

---

## Technical Approach

### LLM Usage Strategy

**Per-Repo Analysis Prompt** (Phase B):
```
You are analyzing a software repository to understand its purpose.

Repository: {repo_name}
README content: {readme_content}
Package.json: {package_json}
Key files sampled:
{file_samples}

Based on this information, provide:
1. **Purpose** (2-3 sentences): What is this repo's primary function?
2. **Key Concepts** (bullet list): What domain concepts does it implement?
3. **Main APIs** (bullet list): What are the key exports/interfaces?
4. **Patterns Used**: What architectural patterns are evident?
5. **Dependencies**: What major external systems does it interact with?

Be specific and concrete. Don't say "handles data" - say "processes DICOM medical images".
```

**Organization Clustering Prompt** (Phase C):
```
You are analyzing {repo_count} repositories to understand organization structure.

Repository summaries:
{repo_summaries}

External project info (from Jira/ADO):
{external_specs_summary}

Suggest:
1. **Team Groupings**: Which repos likely belong to the same team? Why?
2. **Service Boundaries**: Which repos form microservices together?
3. **Business Domains**: Which repos serve which business areas?
4. **Cross-Cutting Concerns**: What repos are shared infrastructure?

Explain your reasoning. It's OK to be uncertain - note confidence levels.
```

**Inconsistency Detection Prompt** (Phase E):
```
You are a code auditor looking for problems across an organization.

Repository analyses:
{all_repo_analyses}

Detected patterns:
{patterns}

Find and report:
1. **Inconsistencies**: Where do repos contradict each other?
2. **Duplications**: Is the same thing implemented multiple times?
3. **Ownership Gaps**: Which repos seem unowned or abandoned?
4. **Security Concerns**: Any obvious security issues?
5. **Questions for Humans**: What do you need clarified?

For each finding, include:
- Severity (critical/important/minor)
- Evidence (which files, which repos)
- Suggested action or question
```

### File Sampling Strategy

To analyze repos without reading everything:
1. **Always read**: README.md, package.json, tsconfig.json
2. **Entry points**: index.ts, main.ts, app.ts, server.ts
3. **API surfaces**: routes/, api/, controllers/, handlers/
4. **Domain models**: models/, types/, entities/, schemas/
5. **Sample limit**: Max 20 files per repo, 500 lines each

### Checkpoint Strategy

```typescript
interface AnalysisCheckpoint {
  phase: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  
  // Phase B: Per-repo progress
  reposTotal: number;
  reposCompleted: string[];
  repoInProgress: string | null;
  
  // Phase C-F: Completion flags
  clusteringComplete: boolean;
  architectureComplete: boolean;
  inconsistenciesComplete: boolean;
  strategyComplete: boolean;
  
  // Timestamps
  startedAt: string;
  lastActivityAt: string;
  estimatedCompletion: string;
}
```

---

## Output Examples

### Example: `/repos/imaging-solutions-poc/overview.md`

```markdown
# Imaging-Solutions-poc

## Purpose

This repository implements a **medical imaging processing pipeline** for 
DICOM files. It provides services for image ingestion, format conversion, 
and integration with PACS (Picture Archiving and Communication System).

## Key Concepts

- **DICOM Processing**: Handles DICOM file parsing and metadata extraction
- **Image Normalization**: Converts various image formats to standardized output
- **PACS Integration**: Pushes processed images to hospital PACS systems
- **Study Management**: Groups related images into studies/series

## Main APIs

- `DicomIngester` - Accepts raw DICOM files, validates, stores
- `ImageProcessor` - Applies transformations (resize, enhance, anonymize)
- `PacsConnector` - Manages connections to external PACS systems
- `StudyManager` - CRUD operations for imaging studies

## Patterns Used

- **Repository Pattern**: Data access abstracted via repositories
- **Queue-based Processing**: RabbitMQ for async image processing
- **Event Sourcing**: Image lifecycle events persisted for audit

## Dependencies

- **Internal**: Connects to `authentication-service` for user validation
- **External**: Integrates with Philips PACS, GE Healthcare systems
- **Infrastructure**: PostgreSQL for metadata, MinIO for image storage

---
*Analysis generated on 2025-12-06 by Living Docs Builder*
*Confidence: High (README + 15 source files analyzed)*
```

### Example: `/review-needed/questions-for-cto.md`

```markdown
# Technical Questions for CTO Review

These questions were generated during automated codebase analysis.
Please review and provide answers to improve documentation accuracy.

---

## 1. Authentication Pattern Inconsistency

**Severity**: Important
**Evidence**: 
- `auth-service/` uses JWT with RS256
- `imaging-api/` uses JWT with HS256
- `legacy-portal/` uses session cookies

**Question**: Is the mixed authentication approach intentional? 
Should we standardize on one pattern?

---

## 2. Duplicate User Management

**Severity**: Important
**Evidence**:
- `user-service/src/models/User.ts`
- `legacy-portal/models/user.py`
- `admin-dashboard/lib/user.ts`

**Question**: Are these three user implementations intentional?
Which is the source of truth?

---

## 3. Unclear Repo Ownership

**Severity**: Minor
**Evidence**: No CODEOWNERS, no recent commits (6+ months)
- `legacy-reporting-tool/`
- `deprecated-etl-scripts/`
- `old-mobile-app/`

**Question**: Should these repos be archived? Who owns them?

---

## 4. Missing API Documentation

**Severity**: Important
**Evidence**: Public APIs without OpenAPI specs
- `patient-api/` - 23 endpoints, no swagger
- `imaging-api/` - 15 endpoints, no swagger

**Question**: Is API documentation planned? Should we auto-generate?

---

*Generated by Living Docs Builder on 2025-12-06*
*Review and update this file, then delete addressed items*
```

---

## Success Metrics

- **Per-repo overviews** actually explain what each repo does (not just stats)
- **Organization structure** matches how teams actually think about the codebase
- **Questions document** surfaces issues humans didn't know existed
- **New team member** can understand org's tech landscape in 1 day (not 1 month)
- **Architecture diagrams** are accurate enough to use in planning meetings

---

## Non-Goals (Out of Scope)

- Real-time sync (this is a point-in-time analysis)
- Automatic code refactoring
- CI/CD integration
- Multi-language support beyond TypeScript/JavaScript (v1)
