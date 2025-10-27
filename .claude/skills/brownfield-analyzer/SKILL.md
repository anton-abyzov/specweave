---
name: brownfield-analyzer
description: Analyzes existing brownfield projects to map documentation structure to SpecWeave's PRD/HLD/RFC/Runbook pattern. Scans folders, classifies documents, detects external tools (Jira, ADO, GitHub), and generates migration plan. Activates for brownfield, existing project, migrate, analyze structure, legacy documentation.
---

# Brownfield Analyzer Skill

**Purpose**: Analyze existing brownfield projects and generate a migration plan to SpecWeave's PRD/HLD/RFC/Runbook pattern.

**When to Use**: When onboarding an existing project to SpecWeave.

---

## Capabilities

1. **Scan Project Structure** - Recursively scan folders for documentation
2. **Classify Documents** - Identify PRD, HLD, ADR, RFC, Runbook candidates
3. **Detect External Tools** - Find Jira, ADO, GitHub project references
4. **Analyze Diagrams** - Identify architecture diagrams (PNG, SVG, drawio)
5. **Generate Migration Plan** - Create actionable migration plan with effort estimate
6. **Suggest Increment Mapping** - Map Jira Epics/ADO Features to SpecWeave Increments

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

### Step 1: Initial Scan

**Scan these patterns**:
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

**Generate markdown report**:

```markdown
# Brownfield Analysis Report

**Project**: {project-name}
**Analyzed**: {date}
**Total Files Scanned**: {count}

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

### Your Response
```
I'll analyze your existing project structure and generate a migration plan.

Scanning: /path/to/project

Found:
- 45 markdown files
- 8 diagrams
- Jira project detected (PROJ)

Analyzing... (this may take a moment)

✅ Analysis complete!

I've generated a comprehensive analysis report. Here's the summary:

**Documentation**: 45 files classified
- PRD candidates: 3
- HLD candidates: 2
- ADR candidates: 8
- RFC candidates: 3
- Runbook candidates: 5
- Governance: 2

**Diagrams**: 8 diagrams (6 need Mermaid conversion)

**External Tools**: Jira project PROJ with 12 active epics

**Suggested**: Create 12 increments (one per Jira epic)

**Estimated Effort**: 3.5 hours

Would you like me to:
1. Show the full analysis report?
2. Proceed with migration?
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
- [TOOL-CONCEPT-MAPPING.md](../../../docs/TOOL-CONCEPT-MAPPING.md)
- [increment-metadata-template.yaml](../../../templates/increment-metadata-template.yaml)

---

## Test Cases

See `test-cases/` directory for validation scenarios.
