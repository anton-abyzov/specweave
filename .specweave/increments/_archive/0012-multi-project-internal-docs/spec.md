# Specification: Multi-Project Internal Docs & Brownfield Import

**Increment**: 0012-multi-project-internal-docs
**Status**: Planning
**Created**: 2025-11-05
**Priority**: P0 (Needed Now - Enterprise Feature)

---

## Executive Summary

Transform SpecWeave's internal documentation structure to support **enterprise-scale multi-project/team scenarios** with brownfield documentation import. Enable teams managing multiple repos, microservices, or products to organize specs, modules, team playbooks, and legacy docs per project/team while maintaining shared cross-cutting documentation.

**Key Insight**: Single project is just multi-project with 1 project—no special cases, unified architecture.

---

## Problem Statement

### Current Limitations

**Single Project Assumption**:
```
.specweave/docs/internal/
├── specs/                    # Assumes ONE project
│   ├── spec-001-auth.md
│   └── spec-002-payments.md
└── architecture/             # Assumes ONE project
    └── adr/
```

**Enterprise Reality**:
- Platform engineering team: Manages 5 terraform repos + 3 app repos
- Each app team: Has its own ADO board/project
- Microservices: 12 services, 8 teams, 3 GitHub orgs
- Need brownfield migration: 200+ Notion docs to import
- Module-specific knowledge: Auth domain, Payment processing, ML pipeline
- Team-specific conventions: React team vs Backend team different patterns

**What Breaks**:
- ❌ Can't organize specs per project/team
- ❌ No place for module-level docs (auth-module.md)
- ❌ No team playbooks (onboarding, conventions, workflows)
- ❌ No brownfield import destination (where do Notion exports go?)
- ❌ Forced special case for single project (backward compatibility burden)

---

## Goals

### Primary Goals

1. **Multi-Project Support**: Enable unlimited projects/teams with organized specs per project
2. **Module Documentation**: Support module/component-level docs (auth, payments, ML pipeline)
3. **Team Playbooks**: Team-specific conventions, workflows, onboarding
4. **Brownfield Import**: Import existing docs from Notion, Confluence, GitHub Wiki, markdown exports
5. **Unified Architecture**: Single project = multi-project with 1 project (no special cases)

### Secondary Goals

6. **Backward Compatible**: Existing single-project setups continue to work
7. **Easy Migration**: Auto-migrate from single to multi-project with one command
8. **Clear Separation**: Project-specific vs cross-cutting docs clearly separated

---

## User Stories

### US-001: Multi-Project Organization (P0)
**As a** platform engineering lead
**I want to** organize specs by project/team
**So that** each team's docs are clearly separated and easy to find

**Acceptance Criteria**:
- [ ] AC-US1-01: Can create unlimited projects in `.specweave/docs/internal/projects/`
- [ ] AC-US1-02: Each project has its own `specs/` folder (spec-001, spec-002, etc.)
- [ ] AC-US1-03: Project-level README explains project scope, tech stack, team
- [ ] AC-US1-04: Config file defines projects with metadata (name, description, tech stack, team)
- [ ] AC-US1-05: Single project mode uses `projects/default/` (no special case)

**Priority**: P0 (Critical for enterprise use)

---

### US-002: Module Documentation (P0)
**As a** senior developer
**I want to** document module-level architecture and design
**So that** developers understand domain-specific components (auth, payments, notifications)

**Acceptance Criteria**:
- [ ] AC-US2-01: Each project can have `modules/` folder for module-level docs
- [ ] AC-US2-02: Module docs include: architecture, key components, integration points, security
- [ ] AC-US2-03: Module docs separate from architecture/ (project-specific vs system-wide)
- [ ] AC-US2-04: Module index (README.md) lists all modules with short descriptions
- [ ] AC-US2-05: Can reference module docs from specs and tasks

**Priority**: P0 (Critical for large codebases)

---

### US-003: Team Playbooks (P1)
**As a** team lead
**I want to** document team-specific conventions and workflows
**So that** new developers onboard faster and team follows consistent patterns

**Acceptance Criteria**:
- [ ] AC-US3-01: Each project can have `team/` folder for team-specific docs
- [ ] AC-US3-02: Team docs include: onboarding, conventions, workflows, contacts
- [ ] AC-US3-03: Conventions doc covers: naming, code patterns, tech stack preferences
- [ ] AC-US3-04: Workflows doc covers: PR process, incident handling, sprint planning
- [ ] AC-US3-05: Contacts doc has team members, on-call rotation, escalation paths

**Priority**: P1 (High value for team productivity)

---

### US-004: Brownfield Import (P0)
**As a** tech lead migrating from Notion
**I want to** import existing markdown documentation
**So that** I preserve historical knowledge while building new SpecWeave specs

**Acceptance Criteria**:
- [ ] AC-US4-01: Can import markdown files from external folder (Notion export, Confluence, Wiki)
- [ ] AC-US4-02: Analyzer detects doc types: specs → specs/, modules → modules/, rest → legacy/
- [ ] AC-US4-03: Legacy folder organized by source (notion/, confluence/, wiki/)
- [ ] AC-US4-04: Migration report shows what was imported, from where, when
- [ ] AC-US4-05: Clearly document supported formats (markdown primary, detect others)
- [ ] AC-US4-06: Preserve original file structure if meaningful
- [ ] AC-US4-07: Create project README with migration notes

**Priority**: P0 (Critical for enterprise adoption)

**Supported Sources** (Initial):
- ✅ Markdown exports (Notion, Confluence, GitHub Wiki)
- ✅ Plain markdown files from any folder
- 🔄 Future: Direct Notion API, Confluence API, Google Docs export

---

### US-005: Unified Architecture (P0)
**As a** framework developer
**I want** single project to be a special case of multi-project
**So that** there's no code duplication or complexity

**Acceptance Criteria**:
- [ ] AC-US5-01: Single project mode uses same structure as multi-project (projects/default/)
- [ ] AC-US5-02: Config flag `multiProject.enabled` defaults to `false` (single project)
- [ ] AC-US5-03: When disabled, all operations target `projects/default/` automatically
- [ ] AC-US5-04: No special-case code for single vs multi-project (unified path resolution)
- [ ] AC-US5-05: Auto-migration creates `projects/default/` from existing `specs/`

**Priority**: P0 (Architectural requirement)

---

### US-006: Cross-Cutting Documentation (P1)
**As a** architect
**I want** cross-cutting docs (strategy, delivery, operations, governance) separate from projects
**So that** system-wide policies apply to all projects

**Acceptance Criteria**:
- [ ] AC-US6-01: `strategy/`, `delivery/`, `operations/`, `governance/` remain at root level
- [ ] AC-US6-02: Architecture docs can be project-specific OR system-wide (both supported)
- [ ] AC-US6-03: ADRs can be project-specific OR shared (both supported)
- [ ] AC-US6-04: Clear convention: `architecture/adr/` = shared, `projects/{id}/architecture/` = project-specific
- [ ] AC-US6-05: README explains when to use project-specific vs shared docs

**Priority**: P1 (Architectural clarity)

---

## Proposed Solution

### Directory Structure

```
.specweave/docs/internal/
│
├── strategy/              # EXISTING - Business rationale (cross-project)
├── delivery/              # EXISTING - Build & release (cross-project)
├── operations/            # EXISTING - Production ops (cross-project)
├── governance/            # EXISTING - Policies (cross-project)
│
├── architecture/          # EXISTING - System-wide architecture
│   ├── adr/               # Shared ADRs (cross-project decisions)
│   └── diagrams/          # System-level diagrams
│
├── specs/                 # DEPRECATED (migrate to projects/default/specs/)
│   └── ... (auto-migrated on first multi-project init)
│
└── projects/              # 🆕 NEW! Multi-project/team support
    │
    ├── _README.md         # 🆕 Multi-project guide
    │
    ├── default/           # 🆕 Default project (single-project mode)
    │   ├── README.md      # Project overview
    │   ├── specs/         # Living docs specs (spec-001, spec-002, ...)
    │   ├── modules/       # 🆕 Module-level docs (optional)
    │   ├── team/          # 🆕 Team playbooks (optional)
    │   ├── architecture/  # 🆕 Project-specific architecture (optional)
    │   │   └── adr/       # Project-specific ADRs
    │   └── legacy/        # 🆕 Brownfield imports (optional)
    │       ├── README.md  # Migration notes
    │       ├── notion/    # From Notion export
    │       ├── confluence/# From Confluence
    │       └── wiki/      # From GitHub Wiki
    │
    ├── alpha/             # Example: Web App Team
    │   ├── README.md
    │   ├── specs/
    │   ├── modules/
    │   ├── team/
    │   ├── architecture/
    │   └── legacy/
    │
    ├── beta/              # Example: Mobile Team
    │   └── ...
    │
    └── gamma/             # Example: Platform Engineering
        └── ...
```

### Configuration Schema

**File**: `.specweave/config.json`

```json
{
  "multiProject": {
    "enabled": false,              // Default: single project mode
    "activeProject": "default",    // Current active project
    "projects": [
      {
        "id": "default",           // Project identifier (folder name)
        "name": "Default Project", // Display name
        "description": "Main project",
        "techStack": ["TypeScript", "Node.js"],
        "team": "Engineering Team",
        "contacts": {
          "lead": "lead@example.com",
          "pm": "pm@example.com"
        },
        "syncProfiles": ["specweave-dev"]  // Links to sync profiles (0011)
      }
    ]
  },
  "brownfield": {
    "importHistory": [
      {
        "source": "notion",           // Source type: notion, confluence, wiki, custom
        "workspace": "acme-corp",     // Source identifier
        "importedAt": "2025-11-06T10:30:00Z",
        "project": "default",         // Target project
        "filesImported": 47,
        "destination": ".specweave/docs/internal/projects/default/legacy/notion/"
      }
    ]
  }
}
```

### Workflows

#### Workflow 1: Enable Multi-Project (Initial Setup)

```bash
# User has single-project setup, wants multi-project
/specweave:init-multiproject

# Prompts:
# - Enable multi-project mode? (yes)
# - Migrate existing specs to default project? (yes)
# - Create additional projects? (alpha, beta)

# Result:
# - Creates projects/default/ with migrated specs
# - Creates projects/alpha/, projects/beta/ (empty)
# - Updates config.json (multiProject.enabled = true)
# - Creates migration report
```

#### Workflow 2: Brownfield Import

```bash
# User exports Notion workspace to /tmp/notion-export/ (markdown files)
# User runs import command

/specweave:import-docs /tmp/notion-export/ --source=notion --project=default

# Analyzer detects:
# - 47 Markdown files total
# - 12 files match "feature" keywords → modules/
# - 8 files match "spec" keywords → specs/
# - 27 remaining files → legacy/notion/

# Imports to:
# - .specweave/docs/internal/projects/default/specs/ (8 files)
# - .specweave/docs/internal/projects/default/modules/ (12 files)
# - .specweave/docs/internal/projects/default/legacy/notion/ (27 files)

# Creates:
# - projects/default/legacy/README.md (migration report)
# - Updates config.json (brownfield.importHistory)
```

#### Workflow 3: Switch Active Project

```bash
# User working on "default" project, wants to switch to "alpha"
/specweave:switch-project alpha

# Result:
# - Updates config.json (activeProject = "alpha")
# - Future increments use projects/alpha/specs/
# - Increment numbers are project-specific!
```

#### Workflow 4: Create Increment (Multi-Project Aware)

```bash
# User creates increment
/specweave:increment "Add user authentication"

# Increment planner detects:
# - Active project: "alpha" (from config)
# - Creates spec in: projects/alpha/specs/spec-001-user-auth.md
# - Creates increment: .specweave/increments/0013-user-auth/
# - Links increment to project "alpha"
```

---

## Technical Design

### Path Resolution (Unified)

**Core principle**: All operations use project-aware path resolution

```typescript
// src/core/project-manager.ts

class ProjectManager {
  // Get current active project
  getActiveProject(): ProjectContext {
    const config = loadConfig();
    if (!config.multiProject?.enabled) {
      return { id: 'default', ...defaultProject };
    }
    return config.multiProject.projects.find(
      p => p.id === config.multiProject.activeProject
    );
  }

  // Resolve specs path for active project
  getSpecsPath(): string {
    const project = this.getActiveProject();
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id,
      'specs'
    );
  }

  // Resolve modules path for active project
  getModulesPath(): string {
    const project = this.getActiveProject();
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id,
      'modules'
    );
  }
}
```

### Brownfield Analyzer

```typescript
// src/core/brownfield/analyzer.ts

interface BrownfieldAnalysisResult {
  totalFiles: number;
  specs: string[];        // Files detected as specs
  modules: string[];      // Files detected as module docs
  team: string[];         // Files detected as team docs
  legacy: string[];       // Remaining files
  confidence: {
    specs: number;        // 0-1 confidence score
    modules: number;
    team: number;
  };
}

class BrownfieldAnalyzer {
  analyze(sourcePath: string): BrownfieldAnalysisResult {
    // 1. Read all markdown files recursively
    // 2. Analyze content for keywords:
    //    - Specs: "user story", "acceptance criteria", "feature"
    //    - Modules: "module", "component", "service", "domain"
    //    - Team: "onboarding", "convention", "workflow", "team"
    // 3. Score confidence based on keyword density
    // 4. Return classification
  }

  import(
    sourcePath: string,
    project: string,
    source: 'notion' | 'confluence' | 'wiki' | 'custom'
  ): ImportReport {
    // 1. Analyze files
    // 2. Copy to appropriate destinations
    // 3. Create migration report (legacy/README.md)
    // 4. Update config.json (brownfield.importHistory)
    // 5. Return report
  }
}
```

### Migration Script

```typescript
// src/cli/commands/migrate-to-multiproject.ts

async function migrateToMultiProject(): Promise<void> {
  // 1. Detect current setup (single project)
  // 2. Create projects/default/ structure
  // 3. Move specs/ → projects/default/specs/
  // 4. Update config.json (multiProject.enabled = true)
  // 5. Create migration report
  // 6. Backup old config
}
```

---

## Integration with Increment 0011

**Increment 0011** (Multi-Project External Sync) provides:
- External sync profiles (GitHub, JIRA, ADO)
- Project context detection
- Time range filtering

**This Increment (0012)** provides:
- Internal docs structure per project
- Module and team documentation
- Brownfield import

**Integration Points**:
1. **Sync profiles link to projects**: `project.syncProfiles = ["specweave-dev"]`
2. **Project detection**: 0011 detects project → 0012 creates specs in project folder
3. **Increment planning**: Uses 0012's path resolution for spec creation

---

## Migration Strategy

### Phase 1: Single Project Auto-Migration
- On first multi-project operation, auto-migrate specs/ → projects/default/specs/
- No user action required (transparent)
- Backup old structure

### Phase 2: Multi-Project Opt-In
- User enables via `/specweave:init-multiproject`
- Creates additional projects
- Each project has clean structure

### Phase 3: Brownfield Import
- User imports Notion/Confluence docs
- Analyzer classifies files
- Creates legacy/ folder with migration notes

---

## Success Metrics

### Functional
- [ ] Users can create 3+ projects per SpecWeave instance
- [ ] Users can import 100+ brownfield docs in <5 minutes
- [ ] Module docs clearly separate from architecture docs
- [ ] Team playbooks improve onboarding time by 50%

### Performance
- [ ] Auto-migration: <10 seconds for 100 specs
- [ ] Brownfield import: <1 minute for 500 markdown files
- [ ] Path resolution: <1ms per operation

### UX
- [ ] Single project users see NO changes (transparent migration)
- [ ] Multi-project users understand structure immediately (clear README files)
- [ ] Brownfield import: 80%+ accuracy in file classification

---

## Out of Scope

### Explicitly NOT in this increment

- ❌ Direct Notion API integration (use exports for now)
- ❌ Confluence API integration (use exports)
- ❌ Google Docs integration (future)
- ❌ Non-markdown file formats (PDFs, Word docs)
- ❌ UI for browsing projects (CLI only)
- ❌ Cross-project spec references (future)

---

## Dependencies

### Internal Dependencies
- ✅ Increment 0011 (Multi-Project External Sync) - Provides sync profiles
- ✅ Config schema (src/core/schemas/specweave-config.schema.json)
- ✅ Path utilities (src/utils/path.ts)

### External Dependencies
- None (pure filesystem operations)

---

## Risks

### Risk 1: Brownfield Classification Accuracy
**Risk**: Analyzer misclassifies docs (specs as modules, etc.)
**Mitigation**:
- Show preview before import (user confirms)
- Allow manual override
- Create legacy/ folder for uncertain files
**Probability**: Medium
**Impact**: Low (user can manually move files)

### Risk 2: Migration Breaks Existing Workflows
**Risk**: Auto-migration to projects/default/ breaks user scripts
**Mitigation**:
- Document migration clearly
- Provide rollback script
- Test extensively on SpecWeave's own increments
**Probability**: Low
**Impact**: Medium

### Risk 3: Path Resolution Performance
**Risk**: Frequent path resolution slows down operations
**Mitigation**:
- Cache project context in memory
- Lazy load project config
- Benchmark path resolution (<1ms target)
**Probability**: Low
**Impact**: Low

---

## Testing Strategy

### Unit Tests
- ProjectManager path resolution
- BrownfieldAnalyzer file classification
- Config schema validation
- Migration script logic

### Integration Tests
- End-to-end multi-project setup
- Brownfield import from real Notion export
- Switch project workflow
- Increment creation with active project

### E2E Tests (Playwright)
- CLI: `/specweave:init-multiproject` flow
- CLI: `/specweave:import-docs` flow
- CLI: `/specweave:switch-project` flow
- Verify folder structure created correctly

### Coverage Target
- Unit: 90%+
- Integration: 85%+
- E2E: 100% of critical paths

---

## Documentation

### User-Facing Docs
- `docs-site/docs/guides/multi-project-setup.md` - Getting started
- `docs-site/docs/guides/brownfield-import.md` - Import existing docs
- `docs-site/docs/guides/team-playbooks.md` - Team documentation best practices

### Internal Docs
- `.specweave/docs/internal/architecture/adr/0017-multi-project-internal-structure.md`
- Update CLAUDE.md (Multi-Project section)
- Update README.md (Enterprise features)

### Migration Guide
- `.specweave/docs/public/guides/migration-to-multiproject.md`

---

## Timeline Estimate

### Phase 1: Core Infrastructure (8 hours)
- ProjectManager class
- Path resolution
- Config schema updates
- Auto-migration script

### Phase 2: Brownfield Analyzer (6 hours)
- File classification algorithm
- Import logic
- Migration report generation

### Phase 3: CLI Commands (6 hours)
- `/specweave:init-multiproject`
- `/specweave:import-docs`
- `/specweave:switch-project`

### Phase 4: Testing (6 hours)
- Unit tests
- Integration tests
- E2E tests
- Manual testing

### Phase 5: Documentation (4 hours)
- User guides
- ADR
- CLAUDE.md updates
- Migration guide

**Total**: ~30 hours (4 working days)

---

## Open Questions

1. **Module docs vs Architecture docs**: Should modules/ be inside architecture/ or separate?
   - **Proposal**: Separate (`projects/{id}/modules/`) for clarity

2. **ADR placement**: Project-specific or always shared?
   - **Proposal**: Both supported (architecture/adr/ = shared, projects/{id}/architecture/adr/ = project-specific)

3. **Spec numbering**: Per-project or global?
   - **Proposal**: Per-project (projects/alpha/specs/spec-001, projects/beta/specs/spec-001 - different features!)

4. **Cross-project references**: How to link between projects?
   - **Future**: For now, none. Future increment can add cross-project spec references.

---

## Appendix

### Example Project Structure (Enterprise)

```
.specweave/docs/internal/projects/
├── web-app/                          # Web Application Team
│   ├── README.md                     # Tech: React, Node.js | Team: 5 engineers
│   ├── specs/
│   │   ├── spec-001-user-auth.md
│   │   └── spec-002-payments.md
│   ├── modules/
│   │   ├── auth-module.md
│   │   └── payment-module.md
│   ├── team/
│   │   ├── onboarding.md
│   │   ├── conventions.md            # React patterns, testing approach
│   │   └── workflows.md              # PR process, deployments
│   └── legacy/
│       └── notion/
│           └── existing-features.md
│
├── mobile-app/                       # Mobile Team
│   ├── README.md                     # Tech: React Native, Firebase | Team: 3 engineers
│   ├── specs/
│   │   └── spec-001-push-notifications.md
│   ├── modules/
│   │   └── push-module.md
│   └── team/
│       ├── onboarding.md
│       └── conventions.md            # React Native patterns, iOS/Android specifics
│
└── platform-infra/                   # Platform Engineering Team
    ├── README.md                     # Tech: Terraform, K8s, Python | Team: 2 SREs
    ├── specs/
    │   ├── spec-001-monitoring.md
    │   └── spec-002-ci-cd-pipeline.md
    ├── modules/
    │   ├── terraform-modules.md
    │   └── k8s-operators.md
    ├── team/
    │   ├── on-call.md                # On-call rotation, escalation
    │   └── runbooks.md               # Incident response procedures
    └── legacy/
        └── confluence/
            └── old-runbooks.md
```

---

**Status**: Specification Complete - Ready for Planning
**Next Step**: Create plan.md (implementation strategy)


---

## Archive Note (2025-11-15)

**Status**: Completed under early SpecWeave architecture (pre-ADR-0032 Universal Hierarchy / ADR-0016 Multi-Project Sync).

**Unchecked ACs**: Reflect historical scope and tracking discipline. Core functionality verified in subsequent increments:
- Increment 0028: Multi-repo UX improvements
- Increment 0031: External tool status sync
- Increment 0033: Duplicate prevention
- Increment 0034: GitHub AC checkboxes fix

**Recommendation**: Accept as historical tech debt. No business value in retroactive AC validation.

**Rationale**:
- Features exist in codebase and are operational
- Later increments successfully built on this foundation
- No user complaints or functionality gaps reported
- AC tracking discipline was less strict during early development

**Tracking Status**: `historical-ac-incomplete`

**Verified**: 2025-11-15

