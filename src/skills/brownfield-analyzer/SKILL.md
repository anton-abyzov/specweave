---
name: brownfield-analyzer
description: Analyzes existing brownfield projects to map documentation structure to SpecWeave's PRD/HLD/RFC/Runbook pattern. Scans folders, classifies documents, detects external tools (Jira, ADO, GitHub), and generates migration plan. Activates for brownfield, existing project, migrate, analyze structure, legacy documentation.
---

# Brownfield Analyzer Skill

**Purpose**: Analyze existing brownfield projects and generate a migration plan to SpecWeave's PRD/HLD/RFC/Runbook pattern.

**When to Use**: When onboarding an existing project to SpecWeave.

---

## Capabilities

1. **Assess Project Complexity** - Estimate LOC, files, modules and recommend documentation path 🆕
2. **Scan Project Structure** - Recursively scan folders for documentation
3. **Classify Documents** - Identify PRD, HLD, ADR, RFC, Runbook candidates
4. **Detect External Tools** - Find Jira, ADO, GitHub project references
5. **Analyze Diagrams** - Identify architecture diagrams (PNG, SVG, drawio)
6. **Generate Migration Plan** - Create actionable migration plan with effort estimate
7. **Suggest Increment Mapping** - Map Jira Epics/ADO Features to SpecWeave Increments
8. **Support Two Paths** - Quick Start (incremental) OR Comprehensive (upfront) 🆕

---

## Two-Path Strategy 🆕

**SpecWeave supports two brownfield approaches**:

### Path 1: Quick Start (Incremental Documentation)
**Best for**: Large projects (50k+ LOC), fast iteration, small teams

**Process**:
1. Initial scan: Document core architecture only (1-3 hours)
2. Start working immediately
3. Per increment: Document → Modify → Update docs
4. Documentation grows with changes

**Benefits**:
- Start in days, not weeks
- Focus documentation where it matters
- No analysis paralysis
- Always safe (document before touching code)

### Path 2: Comprehensive Upfront
**Best for**: Small/medium projects (<50k LOC), teams, regulated industries

**Process**:
1. Full codebase analysis (1-4 weeks)
2. Document all modules, business rules
3. Create complete baseline tests
4. Then start increments with full context

**Benefits**:
- Complete context upfront
- Full regression coverage
- Easier team coordination
- Better for compliance

### Automatic Path Recommendation

The analyzer **automatically recommends** a path based on:

| Project Size | LOC Range | Upfront Effort | Recommended Path |
|--------------|-----------|----------------|------------------|
| **Small** | < 10k LOC | 4-8 hours | Comprehensive Upfront |
| **Medium** | 10k-50k LOC | 1-2 weeks | User Choice |
| **Large** | 50k-200k LOC | 2-4 weeks | Quick Start |
| **Very Large** | 200k+ LOC | 1-3 months | Quick Start (Mandatory) |

---

## Activation Triggers

**Keywords**: brownfield, existing project, legacy, migrate, analyze, scan, documentation structure, existing documentation

**User Requests**:
- "Analyze my existing project"
- "I have a legacy codebase with scattered documentation"
- "Migrate my project to SpecWeave"
- "Scan my documentation and suggest structure"
- "I have Jira epics I want to map to SpecWeave"

---

## Analysis Process

### Step 0: Complexity Assessment 🆕

**FIRST, estimate project size to recommend path**:

**Metrics to collect**:
```typescript
interface ComplexityMetrics {
  totalLOC: number;              // Lines of code
  totalFiles: number;            // Number of files
  languages: string[];           // Programming languages detected
  modules: number;               // Estimated number of modules
  dependencies: number;          // External dependencies
  testCoverage: number;          // Existing test coverage (%)
  documentationFiles: number;    // Existing docs
  diagramsFound: number;         // Existing diagrams
  externalTools: string[];       // Jira, ADO, GitHub detected
}
```

**LOC Estimation Commands**:
```bash
# Count LOC by language (exclude vendor/node_modules/dist)
cloc . --exclude-dir=node_modules,vendor,dist,build,.git

# Or use tokei (faster)
tokei

# Or manual approach
find . -name "*.ts" -o -name "*.js" | xargs wc -l
```

**Complexity Scoring**:
```typescript
function assessComplexity(metrics: ComplexityMetrics): ComplexityAssessment {
  const score = calculateScore(metrics);

  if (metrics.totalLOC < 10_000) {
    return {
      size: "Small",
      effort: "4-8 hours",
      recommendedPath: "Comprehensive Upfront",
      confidence: "High"
    };
  } else if (metrics.totalLOC < 50_000) {
    return {
      size: "Medium",
      effort: "1-2 weeks",
      recommendedPath: "User Choice (Ask preference)",
      confidence: "Medium"
    };
  } else if (metrics.totalLOC < 200_000) {
    return {
      size: "Large",
      effort: "2-4 weeks",
      recommendedPath: "Quick Start",
      confidence: "High"
    };
  } else {
    return {
      size: "Very Large",
      effort: "1-3 months",
      recommendedPath: "Quick Start (Mandatory)",
      confidence: "Critical"
    };
  }
}
```

**Output to User**:
```
🔍 Analyzing project complexity...

Metrics:
  • 85,420 LOC detected
  • 342 files analyzed
  • Languages: TypeScript (65%), JavaScript (30%), CSS (5%)
  • Estimated modules: 12
  • Test coverage: 45%
  • Existing docs: 23 files
  • External tools: Jira (PROJ-*)

Complexity Assessment: LARGE PROJECT
  • Size: Large (85k LOC)
  • Full analysis effort: 2-3 weeks
  • Recommended path: Quick Start

Recommendation:
  ✓ Document core architecture only (2-3 hours)
  ✓ Start working immediately
  ✓ Document incrementally per feature
  → Avoid 2-3 week upfront analysis

Alternative:
  ⚠️  Comprehensive upfront (2-3 weeks)
  → Only if you need full context before starting

Proceed with Quick Start? (y/n)
```

---

### Step 1: Initial Scan

**Scan depth depends on chosen path**:

#### Quick Start Path:
**Scan ONLY for**:
- Core architecture files (`architecture/**/*.md`)
- Main README files
- Tech stack indicators (`package.json`, `requirements.txt`, `.csproj`)
- High-level business domains (folder structure)
- Critical patterns (auth, payment, security)

**Skip detailed**:
- Individual module documentation
- Detailed business rules
- Code-level documentation

**Result**: High-level understanding (1-3 hours)

#### Comprehensive Path:
**Scan ALL patterns**:
```
docs/**/*.md
documentation/**/*.md
wiki/**/*.md
architecture/**/*.{md,png,svg,drawio}
runbooks/**/*.md
**/*spec*.{md,yaml,json}
**/*design*.md
**/*decision*.md
**/*adr*.md
**/*rfc*.md
**/README.md
```

**Exclude**:
```
node_modules/**
vendor/**
dist/**
build/**
.git/**
```

### Step 2: Document Classification

**Classify each document** using these rules:

#### PRD Candidates (Strategy)
**Indicators**:
- Filenames: `*requirement*`, `*spec*`, `*product*`, `*feature*`, `*prd*`
- Content keywords: "user story", "acceptance criteria", "success metrics", "business goal", "target users"
- Section headers: "Problem", "Requirements", "User Stories", "Acceptance Criteria"

**Output**: `prd-{name}.md` → `docs/internal/strategy/`

#### HLD Candidates (Architecture)
**Indicators**:
- Filenames: `*architecture*`, `*design*`, `*system*`, `*hld*`
- Content keywords: "component diagram", "data model", "system design", "architecture overview"
- Section headers: "Architecture", "Components", "Data Model", "Integrations"
- Diagrams present (PNG, SVG, Mermaid)

**Output**: `hld-{system}.md` → `docs/internal/architecture/`

#### ADR Candidates (Architecture Decisions)
**Indicators**:
- Filenames: `*decision*`, `*adr*`, `*choice*`
- Content keywords: "we decided", "rationale", "alternatives considered", "consequences"
- Section headers: "Decision", "Context", "Consequences", "Alternatives"
- Sequential numbering (0001, 0002, etc.)

**Output**: `0001-{decision}.md` → `docs/internal/architecture/adr/`

#### RFC Candidates (API/Schema Design)
**Indicators**:
- Filenames: `*api*`, `*rfc*`, `*proposal*`, `*spec*`
- Content keywords: "API design", "endpoint", "schema", "request/response", "OpenAPI"
- File formats: `.yaml`, `.json`, `.openapi`
- Section headers: "API", "Endpoints", "Schema", "Data Flow"

**Output**: `0001-{feature}.md` → `docs/internal/architecture/rfc/`

#### Runbook Candidates (Operations)
**Indicators**:
- Filenames: `*runbook*`, `*playbook*`, `*ops*`, `*operation*`, `*sop*`
- Content keywords: "procedure", "step-by-step", "troubleshooting", "incident", "monitoring"
- Section headers: "Procedures", "Common Failures", "Diagnostics", "SLO", "Escalation"

**Output**: `runbook-{service}.md` → `docs/internal/operations/`

#### Governance Candidates
**Indicators**:
- Filenames: `*security*`, `*compliance*`, `*policy*`, `*governance*`, `*gdpr*`, `*hipaa*`
- Content keywords: "security policy", "compliance", "audit", "data retention", "privacy"

**Output**: `{topic}.md` → `docs/internal/governance/`

### Step 3: External Tool Detection

**Scan for**:

#### Jira
**Patterns**:
- URLs: `https://*.atlassian.net/browse/*`
- Project keys: `[A-Z]+-\d+` (e.g., PROJ-123)
- Files: `.jira-config`, `jira.yaml`

**Extract**:
- Jira URL
- Project key
- Active Epics (via Jira API if credentials provided)

#### Azure DevOps
**Patterns**:
- URLs: `https://dev.azure.com/*`
- Work item IDs: `#\d+`
- Files: `azure-pipelines.yml`

**Extract**:
- ADO URL
- Project name
- Active Epics/Features

#### GitHub
**Patterns**:
- URLs: `https://github.com/*/*`
- Issue references: `#\d+`
- Files: `.github/`, `CODEOWNERS`

**Extract**:
- Repository
- Active Milestones
- Open Issues

### Step 4: Diagram Analysis

**Identify diagrams**:
- PNG files in `architecture/`, `diagrams/`, `docs/`
- DrawIO files (`.drawio`)
- SVG files
- Mermaid diagrams (already in markdown)

**Conversion plan**:
- PNG/DrawIO → Suggest Mermaid conversion
- Estimate: 15-30 minutes per diagram

### Step 5: Effort Estimation

**Calculate total effort**:

| Task | Effort per Item | Total Items | Total Hours |
|------|-----------------|-------------|-------------|
| Migrate documents | 5 min | X | Y |
| Convert diagrams | 20 min | X | Y |
| Number ADRs | 2 min | X | Y |
| Create metadata.yaml | 10 min | X | Y |
| Sync with Jira/ADO | 15 min | X | Y |
| Verification | - | - | 0.5 |
| **Total** | | | **Z hours** |

---

## Output: Analysis Report

**Generate markdown report** (path-specific):

### Quick Start Report

```markdown
# Brownfield Analysis Report - Quick Start Mode

**Project**: {project-name}
**Analyzed**: {date}
**Mode**: Quick Start (Incremental Documentation)

---

## Complexity Assessment 🆕

**Project Size**: {size} ({LOC} LOC)
**Files Analyzed**: {count}
**Languages**: {languages}
**Modules Detected**: {count}
**Test Coverage**: {percentage}%

**Upfront Effort Estimate**:
- Quick Start: **2-3 hours** (Core concepts only)
- Comprehensive: ~{weeks} weeks (Full documentation)

**Recommended Path**: Quick Start

**Why Quick Start?**
- Large codebase would take {weeks} to fully document
- Start delivering value in days, not weeks
- Document as you modify code (safer, focused)

---

## Core Architecture Extracted

**High-Level Components**:
- {Component 1}: {Brief description}
- {Component 2}: {Brief description}
- {Component 3}: {Brief description}

**Critical Patterns Identified**:
- Authentication: {pattern}
- Authorization: {pattern}
- Data Flow: {pattern}
- Error Handling: {pattern}

**Tech Stack**:
- Frontend: {frameworks}
- Backend: {frameworks}
- Database: {databases}
- Infrastructure: {platform}

**Business Domains** (detected from folder structure):
- `src/{domain1}/` - {estimated purpose}
- `src/{domain2}/` - {estimated purpose}
- `src/{domain3}/` - {estimated purpose}

---

## External Tools Detected

- **Jira**: {url} ({count} active epics)
- **GitHub**: {repo} ({count} open issues)

---

## Recommended Next Steps (Quick Start)

1. ✅ **Review this report** (5 minutes)
2. ✅ **Create `.specweave/` structure** (5 minutes)
3. ✅ **Document core architecture** (1-2 hours)
   - Create `.specweave/docs/internal/architecture/core-architecture.md`
   - Document high-level components from above
4. ✅ **Start first increment** (immediate)
   - Choose feature to implement/modify
   - Document affected code BEFORE modifying
   - Implement with regression tests
   - Update docs AFTER change

**Total Time to Start**: 2-3 hours

**Per-Increment Pattern**:
```
1. Document affected code (30 min)
2. Add regression tests (30 min)
3. Implement change (varies)
4. Update docs (20 min)
```

---

## Skipped in Quick Start Mode

The following will be documented **per increment** as needed:
- Detailed module documentation
- Complete business rules catalog
- Full API documentation
- Comprehensive test coverage

**This is intentional** - focuses effort where it matters.

---

## Alternative: Switch to Comprehensive

If you prefer full upfront documentation:
- Run: `brownfield-analyzer --comprehensive`
- Effort: ~{weeks} weeks
- Result: Complete specs before any code changes

---
```

### Comprehensive Report

```markdown
# Brownfield Analysis Report - Comprehensive Mode

**Project**: {project-name}
**Analyzed**: {date}
**Mode**: Comprehensive (Upfront Documentation)
**Total Files Scanned**: {count}

---

## Complexity Assessment 🆕

**Project Size**: {size} ({LOC} LOC)
**Recommended**: {path}
**Estimated Effort**: {weeks}

---

## Executive Summary

- **Documentation Files**: {count} markdown files found
- **Diagrams**: {count} diagrams found ({png}, {drawio}, {svg})
- **External Tools**: {Jira/ADO/GitHub detected}
- **Suggested Increments**: {count} (based on {Jira Epics/ADO Features})
- **Estimated Migration Effort**: {hours} hours

---

## Existing Documentation Structure

```
{project}/
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   └── ... ({count} files)
├── wiki/
│   └── ... ({count} files)
└── ...
```

---

## Document Classification

### Strategy Documents (PRD candidates)
- `docs/requirements/product-spec.md` → `docs/internal/strategy/prd-product.md`
- `wiki/feature-request.md` → `docs/internal/strategy/prd-feature.md`
- **Total**: {count} documents

### Architecture Documents (HLD candidates)
- `docs/architecture/system-design.md` → `docs/internal/architecture/hld-system-overview.md`
- **Total**: {count} documents

### Architecture Decision Records (ADR candidates)
- `docs/decisions/use-postgres.md` → `docs/internal/architecture/adr/0001-use-postgres.md`
- `docs/decisions/microservices.md` → `docs/internal/architecture/adr/0002-microservices.md`
- **Total**: {count} documents (will be numbered 0001-{count})

### API Specifications (RFC candidates)
- `api-specs/booking-api.yaml` → `docs/internal/architecture/rfc/0001-booking-api.md`
- **Total**: {count} documents

### Operations Documents (Runbook candidates)
- `runbooks/api-server.md` → `docs/internal/operations/runbook-api-server.md`
- **Total**: {count} documents

### Governance Documents
- `docs/security-policy.md` → `docs/internal/governance/security-model.md`
- **Total**: {count} documents

### Diagrams
- `architecture/system-diagram.png` → Convert to Mermaid (`hld-system-overview.context.mmd`)
- **Total**: {count} diagrams ({count} need conversion)

---

## External Tool Integration

### Jira
- **URL**: https://company.atlassian.net
- **Project**: PROJ
- **Active Epics**: {count}
  - PROJ-123: User Authentication
  - PROJ-124: Payment Processing
  - ... (list all)

**Suggested Mapping**:
- Epic PROJ-123 → Increment 0001-user-authentication
- Epic PROJ-124 → Increment 0002-payment-processing
- ... (one increment per epic)

### Azure DevOps
- (if detected)

### GitHub
- (if detected)

---

## Recommended Migration Plan

### Phase 1: Structure Creation (15 minutes)
1. Create `docs/internal/` structure (5 pillars)
2. Create `docs/public/` structure
3. Create `features/` directory

### Phase 2: Document Migration ({X} hours)
1. Migrate {count} PRD candidates → `docs/internal/strategy/`
2. Migrate {count} HLD candidates → `docs/internal/architecture/`
3. Migrate {count} ADR candidates → `docs/internal/architecture/adr/` (with numbering)
4. Migrate {count} RFC candidates → `docs/internal/architecture/rfc/` (with numbering)
5. Migrate {count} Runbook candidates → `docs/internal/operations/`
6. Migrate {count} Governance docs → `docs/internal/governance/`

### Phase 3: Diagram Conversion ({X} hours)
1. Convert {count} PNG/DrawIO diagrams to Mermaid
2. Co-locate diagrams with markdown files

### Phase 4: Increment Creation ({X} hours)
1. Create {count} increments (one per Jira Epic)
2. Create `metadata.yaml` for each increment
3. Link increments to related docs (PRD, HLD, ADR, RFC)

### Phase 5: External Tool Sync ({X} hours)
1. Configure `.specweave/config.yaml` with Jira/ADO credentials
2. Run initial sync to link Epics → Increments
3. Verify all Epics are mapped

### Phase 6: Verification (30 minutes)
1. Run `specweave verify`
2. Review migration report
3. Manual review of {count} documents flagged for attention

---

## Effort Estimate

| Phase | Estimated Hours |
|-------|-----------------|
| Structure Creation | 0.25 |
| Document Migration | {X} |
| Diagram Conversion | {Y} |
| Increment Creation | {Z} |
| External Tool Sync | {A} |
| Verification | 0.5 |
| **Total** | **{Total} hours** |

---

## Next Steps

1. **Review this report** - Confirm document classifications
2. **Adjust mappings** - Modify if document classifications are incorrect
3. **Approve migration plan** - Confirm effort estimate
4. **Execute migration**:
   ```bash
   specweave migrate --plan analysis-report.md --execute
   ```
5. **Enable sync** - Configure Jira/ADO sync in `.specweave/config.yaml`

---

## Questions for User

- [ ] Are document classifications correct?
- [ ] Should we sync with Jira/ADO/GitHub?
- [ ] Are Jira Epic → Increment mappings correct?
- [ ] Any documents to exclude from migration?
- [ ] Proceed with migration?

---

## Appendix: Full File List

### PRD Candidates
1. `docs/requirements/product-spec.md`
2. ...

### HLD Candidates
1. `docs/architecture/system-design.md`
2. ...

### ADR Candidates
1. `docs/decisions/use-postgres.md` → `0001-use-postgres.md`
2. ...

(Full list of all classified documents)

---

**End of Report**
```

---

## User Interaction Flow

### Initial Request
**User**: "Analyze my existing project at /path/to/project"

### Your Response (Step 1: Complexity Assessment) 🆕

```
I'll analyze your existing project to determine the best onboarding approach.

Step 1: Assessing project complexity...

Running: cloc . --exclude-dir=node_modules,vendor,dist

🔍 Complexity Analysis:

Metrics:
  • 85,420 LOC detected
  • 342 files analyzed
  • Languages: TypeScript (55,273), JavaScript (25,147), CSS (5,000)
  • Estimated modules: 12
  • Test coverage: 45% (from coverage reports)
  • Existing docs: 23 markdown files
  • External tools: Jira (PROJ-*), GitHub

Complexity Assessment: LARGE PROJECT
  • Size: Large (85k LOC)
  • Full analysis effort: 2-3 weeks
  • Recommended path: Quick Start

---

Recommendation: QUICK START PATH

Why?
  ✓ Large codebase (85k LOC)
  ✓ Full documentation would take 2-3 weeks
  ✓ Start delivering value in 2-3 hours instead
  ✓ Document incrementally as you modify code

Quick Start Process:
  1. Document core architecture only (2-3 hours)
  2. Start first increment immediately
  3. Per increment: Document → Modify → Update
  4. Documentation grows with changes

Alternative: Comprehensive Upfront
  ⚠️  Full documentation (2-3 weeks)
  → Only if you need complete context before starting

---

Which path do you prefer?
1. Quick Start (recommended) - Start in 2-3 hours
2. Comprehensive - Full analysis (2-3 weeks)
3. Let me decide based on your recommendation

```

### User Chooses Quick Start

```
Great! I'll perform a Quick Start analysis focusing on core concepts.

Step 2: Scanning for core architecture...

Found:
- 12 high-level modules
- 4 critical patterns (auth, payment, data flow, error handling)
- 23 existing markdown files
- 8 diagrams
- Jira project detected (PROJ) with 12 active epics

Extracting core architecture... ✅

I've generated a Quick Start analysis report. Here's the summary:

**Core Architecture Extracted**:
- API Gateway (routing, auth)
- User Service (user management, profiles)
- Payment Service (Stripe integration)
- Notification Service (email/SMS)
- Database Layer (PostgreSQL)

**Critical Patterns**:
- Auth: JWT tokens, refresh mechanism
- Payment: Stripe webhooks, idempotency
- Data Flow: Event-driven (Redis pub/sub)
- Errors: Centralized error handler

**Tech Stack**:
- Frontend: Next.js 14, React, Tailwind
- Backend: Node.js 20, Express, TypeScript
- Database: PostgreSQL 16, Prisma ORM
- Infrastructure: Docker, Hetzner Cloud

**External Tools**: Jira (12 active epics) → Can map to increments

**Estimated Time to Start**: 2-3 hours (document core architecture)

---

Next Steps:
1. ✅ Create `.specweave/` structure (5 min)
2. ✅ Document core architecture (2 hours) - I can help
3. ✅ Start first increment (immediate)

Should I:
1. Create the SpecWeave structure and document core architecture?
2. Show the full Quick Start report first?
3. Map Jira epics to increments?
```

### User Chooses Comprehensive

```
Understood! I'll perform a comprehensive analysis of the entire codebase.

⚠️  This will take some time for a project of this size.

Step 2: Comprehensive scan...

Scanning: /path/to/project

Found:
- 342 source files
- 23 markdown files
- 8 diagrams
- Jira project detected (PROJ)

Analyzing... (this may take a few minutes)

✅ Analysis complete!

I've generated a comprehensive analysis report. Here's the summary:

**Documentation**: 23 files classified
- PRD candidates: 3
- HLD candidates: 2
- ADR candidates: 8
- RFC candidates: 3
- Runbook candidates: 5
- Governance: 2

**Diagrams**: 8 diagrams (6 need Mermaid conversion)

**Modules Analyzed**: 12 major modules documented

**External Tools**: Jira project PROJ with 12 active epics

**Suggested**: Create 12 increments (one per Jira epic)

**Estimated Migration Effort**: 2-3 weeks (full documentation)

Would you like me to:
1. Show the full comprehensive report?
2. Start migration (Phase 1: Structure creation)?
3. Adjust any classifications?
```

### After User Approval
```
Great! I'll execute the migration plan.

Step 1: Creating docs/internal/ structure...
✅ Structure created

Step 2: Migrating documents...
✅ Migrated 3 PRD candidates → docs/internal/strategy/
✅ Migrated 2 HLD candidates → docs/internal/architecture/
✅ Migrated 8 ADR candidates → docs/internal/architecture/adr/ (numbered 0001-0008)
✅ Migrated 3 RFC candidates → docs/internal/architecture/rfc/ (numbered 0001-0003)
✅ Migrated 5 Runbooks → docs/internal/operations/
✅ Migrated 2 Governance docs → docs/internal/governance/

Step 3: Converting diagrams...
⏳ Converting 6 PNG/DrawIO diagrams to Mermaid...
✅ Converted 6 diagrams

Step 4: Creating increments...
✅ Created 12 increments (mapped to Jira epics)
✅ Created metadata.yaml for each increment

Step 5: Syncing with Jira...
✅ Linked 12 Jira epics to increments
✅ Synced Epic statuses

Step 6: Verification...
✅ All documents migrated
✅ All diagrams converted
✅ All epics mapped
⚠️  3 documents need manual review (see verification report)

Migration complete! 🎉

Your project is now using SpecWeave's PRD/HLD/RFC/Runbook pattern.

Next steps:
1. Review migrated documents
2. Run: mkdocs serve (to view documentation)
3. Configure ongoing sync: specweave sync --daemon
```

---

## Tool Usage

**When analyzing**:
- Use `Glob` to find files matching patterns
- Use `Read` to read document contents
- Use `Grep` to search for keywords

**Example**:
```typescript
// Find all markdown files
glob("**/*.md", { exclude: ["node_modules/**", "dist/**"] })

// Read and analyze each file
for (file of files) {
  content = read(file)
  classify(content)  // PRD, HLD, ADR, RFC, Runbook?
}
```

---

## Configuration

**User can configure** scan patterns in `.specweave/config.yaml`:

```yaml
brownfield:
  analysis:
    scan_patterns:
      - "docs/**/*.md"
      - "documentation/**/*.md"
      - "wiki/**/*.md"
      - "architecture/**/*.{md,png,svg,drawio}"
      - "runbooks/**/*.md"
    exclude_patterns:
      - "node_modules/**"
      - "vendor/**"
      - "dist/**"
    diagram_conversion:
      enabled: true
      formats:
        - png
        - drawio
        - svg
```

---

## Related Documentation

- [BROWNFIELD-INTEGRATION-STRATEGY.md](../../../docs/internal/delivery/BROWNFIELD-INTEGRATION-STRATEGY.md)
- [Tool Concept Mapping](../../../docs/internal/delivery/guides/tool-concept-mapping.md)
- [increment-metadata-template.yaml](../../../templates/increment-metadata-template.yaml)

---

## Test Cases

See `test-cases/` directory for validation scenarios.
