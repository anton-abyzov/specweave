# Enterprise-Level Specs Organization Strategy

**Version**: 2.0 (Enterprise)
**Last Updated**: 2025-11-12
**Status**: Proposed

## Current Problems

1. ❌ **Flat structure** - 30+ files in single `default/` folder
2. ❌ **Mixed document types** - specs, NFRs, overviews, user stories all mixed
3. ❌ **No categorization** - Hard to find documents by feature area, phase, or team
4. ❌ **Poor scalability** - Will become unmanageable at 100+ specs
5. ❌ **No metadata** - Missing tags, status, priority, ownership
6. ❌ **No relationships** - Can't see dependencies between specs

## Enterprise Organization Principles

### 1. **Hierarchy by Feature Domain** (Primary Organization)

```
.specweave/docs/internal/specs/{project}/
├── core-framework/          # Core framework capabilities
│   ├── spec-001-*.md
│   ├── spec-004-*.md
│   └── README.md
├── developer-experience/    # DX improvements
│   ├── spec-003-*.md
│   └── README.md
├── integrations/            # External tool integrations
│   ├── github/
│   ├── jira/
│   └── ado/
├── infrastructure/          # Platform, DevOps, observability
│   ├── spec-004-metrics-observability.md
│   └── spec-029-cicd-failure-detection.md
├── quality-velocity/        # Testing, metrics, performance
│   ├── spec-005-stabilization.md
│   └── spec-010-dora-metrics.md
└── intelligence/            # AI capabilities, smart features
    ├── spec-002-intelligent-capabilities.md
    └── spec-016-self-reflection.md
```

### 2. **Standardized Metadata** (Rich Context)

Every spec gets frontmatter with:

```yaml
---
# Identity
id: spec-001-core-framework-architecture
title: "Core Framework & Architecture"
version: 2.0
status: active | planning | archived | deprecated

# Classification
domain: core-framework
category: feature | nfr | user-story | overview
priority: P0 | P1 | P2 | P3
complexity: low | medium | high | very-high

# Ownership
team: Core Team
owner: @anton-abyzov
stakeholders: ["Product", "Engineering"]

# Lifecycle
created: 2025-01-15
last_updated: 2025-11-10
target_release: 1.0.0

# Relationships
increments: [0001, 0002, 0004, 0005]
depends_on: []
blocks: [spec-002, spec-003]
related: [spec-016]

# External Links
github_project: https://github.com/anton-abyzov/specweave/projects/1
jira_epic: null
confluence: null

# Tags
tags: [framework, cli, plugin-system, mvp]

# Metrics
estimated_effort: 120h
actual_effort: 95h
user_stories: 35
completion: 100%
---
```

### 3. **Document Type Separation**

```
.specweave/docs/internal/specs/{project}/{domain}/
├── specs/               # Living docs specs (permanent)
│   ├── spec-001-*.md
│   └── spec-002-*.md
├── nfrs/                # Non-functional requirements
│   ├── nfr-performance.md
│   ├── nfr-security.md
│   └── nfr-scalability.md
├── user-stories/        # Detailed user stories (extracted)
│   ├── us-001-*.md
│   └── us-002-*.md
├── overviews/           # High-level summaries
│   └── overview.md
└── _archive/            # Completed/deprecated specs
```

### 4. **Multi-Dimensional Navigation**

**By Feature Domain** (Primary):
```
core-framework/
developer-experience/
integrations/
infrastructure/
quality-velocity/
intelligence/
```

**By Status**:
```
active/        # Currently being worked on
planning/      # Being planned
completed/     # Delivered to production
archived/      # Historical reference only
```

**By Release**:
```
1.0.0/         # Specs for 1.0 release
1.1.0/         # Specs for 1.1 release
2.0.0/         # Specs for 2.0 release
```

**By Team** (for large orgs):
```
core-team/
platform-team/
dx-team/
integrations-team/
```

## Recommended Enterprise Structure

```
.specweave/docs/internal/specs/
├── README.md                           # Index with search/filter
│
├── default/                            # Single-project mode (current)
│   ├── core-framework/
│   │   ├── README.md                   # Domain overview
│   │   ├── spec-001-core-framework-architecture.md
│   │   ├── spec-004-plugin-architecture.md
│   │   └── nfrs/
│   │       └── nfr-cross-platform-support.md
│   │
│   ├── developer-experience/
│   │   ├── spec-003-developer-experience.md
│   │   ├── spec-022-multi-repo-init-ux.md
│   │   └── user-stories/
│   │       └── us-001-npm-installation.md
│   │
│   ├── integrations/
│   │   ├── github/
│   │   │   ├── spec-017-sync-architecture-fix.md
│   │   │   └── user-stories/
│   │   ├── jira/
│   │   └── ado/
│   │
│   ├── infrastructure/
│   │   ├── spec-004-metrics-observability.md
│   │   ├── spec-029-cicd-failure-detection.md
│   │   └── nfrs/
│   │       └── nfr-performance-targets.md
│   │
│   ├── quality-velocity/
│   │   ├── spec-005-stabilization-1.0.0.md
│   │   └── spec-010-dora-metrics-mvp.md
│   │
│   ├── intelligence/
│   │   ├── spec-002-intelligent-capabilities.md
│   │   ├── spec-016-self-reflection-system.md
│   │   └── spec-009-intelligent-reopen-logic.md
│   │
│   ├── _archive/                       # Completed/deprecated
│   │   └── increment-copies/           # Old increment specs
│   │
│   └── _index/                         # Generated indices
│       ├── by-status.md
│       ├── by-release.md
│       ├── by-team.md
│       └── by-priority.md
│
├── backend/                            # Multi-project (example)
│   ├── api/
│   ├── auth/
│   └── data/
│
└── frontend/                           # Multi-project (example)
    ├── ui-components/
    └── state-management/
```

## Feature Domain Classification

### Core Framework
- Plugin architecture
- CLI foundation
- Cross-platform support
- Configuration management
- Core workflows (increment, do, done)

### Developer Experience
- Installation & setup
- Documentation & guides
- Error messages
- CLI UX improvements
- Multi-repo initialization

### Integrations
- GitHub Issues/Projects
- JIRA
- Azure DevOps
- Figma
- Slack/Discord

### Infrastructure
- CI/CD pipelines
- Monitoring & observability
- Performance optimization
- Security scanning
- Cost optimization

### Quality & Velocity
- Testing framework
- DORA metrics
- Stabilization efforts
- Release management
- Quality gates

### Intelligence
- AI model selection
- Self-reflection system
- Smart increment discipline
- Intelligent reopening
- Context optimization

## Automation Strategy

### 1. Intelligent Living Docs Sync Enhancement

Update `src/hooks/lib/sync-living-docs.ts` to:

```typescript
// Auto-classify specs by domain
const classifyDomain = (spec: string): string => {
  const keywords = {
    'core-framework': ['framework', 'cli', 'plugin', 'core', 'foundation'],
    'developer-experience': ['dx', 'ux', 'installation', 'setup', 'guide'],
    'integrations': ['github', 'jira', 'ado', 'figma', 'sync'],
    'infrastructure': ['cicd', 'monitoring', 'observability', 'performance'],
    'quality-velocity': ['testing', 'dora', 'metrics', 'stabilization'],
    'intelligence': ['ai', 'intelligent', 'smart', 'reflection', 'model']
  };

  // Score each domain
  const scores = Object.entries(keywords).map(([domain, terms]) => ({
    domain,
    score: terms.filter(t => spec.toLowerCase().includes(t)).length
  }));

  // Return highest scoring domain or 'uncategorized'
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.score > 0 ? best.domain : 'uncategorized';
};

// Auto-extract metadata from spec content
const extractMetadata = (content: string): SpecMetadata => {
  // Extract from frontmatter or infer from content
  // Priority detection, status, tags, etc.
};

// Generate domain-specific path
const getSpecPath = (spec: SpecMetadata, project: string): string => {
  const domain = classifyDomain(spec.title);
  return `.specweave/docs/internal/specs/${project}/${domain}/spec-${spec.id}.md`;
};
```

### 2. Auto-Generated Indices

Create `generate-spec-indices.ts`:

```typescript
// Auto-generate navigation indices
const generateIndices = () => {
  // By status
  generateByStatus(); // active/ planning/ completed/ archived/

  // By domain
  generateByDomain(); // core-framework/ dx/ integrations/ etc.

  // By release
  generateByRelease(); // 1.0.0/ 1.1.0/ 2.0.0/

  // By team
  generateByTeam(); // core-team/ platform-team/ dx-team/

  // By priority
  generateByPriority(); // P0/ P1/ P2/ P3/
};
```

### 3. Spec Template with Rich Metadata

Update `templates/spec.md.template`:

```markdown
---
# Identity
id: spec-{number}-{slug}
title: "{Title}"
version: 1.0
status: planning

# Classification
domain: {auto-detected}
category: feature
priority: P1
complexity: medium

# Ownership
team: {team-name}
owner: @{github-username}
stakeholders: []

# Lifecycle
created: {timestamp}
last_updated: {timestamp}
target_release: {version}

# Relationships
increments: []
depends_on: []
blocks: []
related: []

# External Links
github_project: null
jira_epic: null

# Tags
tags: []

# Metrics
estimated_effort: 0h
actual_effort: 0h
user_stories: 0
completion: 0%
---

# SPEC-{number}: {Title}

{Auto-generated content}
```

## Migration Plan

### Phase 1: Classify Existing Specs (Automated)

```bash
# Run classification script
node scripts/classify-specs.js

# Output:
# ✅ Classified 22 specs:
#    - core-framework: 5 specs
#    - developer-experience: 3 specs
#    - integrations: 4 specs
#    - infrastructure: 3 specs
#    - quality-velocity: 2 specs
#    - intelligence: 3 specs
#    - uncategorized: 2 specs
```

### Phase 2: Create Domain Folders (Manual Review)

```bash
# Create structure
mkdir -p .specweave/docs/internal/specs/default/{core-framework,developer-experience,integrations,infrastructure,quality-velocity,intelligence,_archive,_index}

# Review classifications
vim .specweave/docs/internal/specs/default/_index/classification-report.md
```

### Phase 3: Move Files (Automated)

```bash
# Move specs to domain folders
node scripts/migrate-specs-to-domains.js

# Verify
ls -R .specweave/docs/internal/specs/default/
```

### Phase 4: Generate Indices (Automated)

```bash
# Generate navigation indices
node scripts/generate-spec-indices.js

# Output:
# ✅ Generated indices:
#    - by-status.md (5 active, 2 planning, 15 completed)
#    - by-domain.md (6 domains)
#    - by-release.md (1.0.0, 1.1.0, 2.0.0)
#    - by-priority.md (P0: 3, P1: 10, P2: 7, P3: 2)
```

### Phase 5: Update Living Docs Sync (Code Change)

```bash
# Update sync logic to use new structure
vim src/hooks/lib/sync-living-docs.ts

# Test
npm test -- tests/integration/living-docs/domain-classification.test.ts
```

## Benefits

### For Users
- ✅ **Find specs 10x faster** - Browse by domain instead of scrolling through 30+ files
- ✅ **Clear relationships** - See dependencies, blockers, related specs
- ✅ **Rich metadata** - Status, priority, ownership, effort at a glance
- ✅ **Multi-dimensional navigation** - By status, domain, release, team, priority

### For Teams
- ✅ **Team ownership** - Clear accountability (core-team/, platform-team/)
- ✅ **Release planning** - Easy to see what's in 1.0 vs 2.0
- ✅ **Dependency management** - blocks: [] and depends_on: [] fields
- ✅ **Effort tracking** - estimated_effort vs actual_effort for velocity

### For Enterprise
- ✅ **Scalability** - Handles 100+ specs easily
- ✅ **Compliance** - Audit trail via metadata (created, owner, stakeholders)
- ✅ **Reporting** - Auto-generated indices for stakeholders
- ✅ **Multi-project** - Separate backend/, frontend/, mobile/ projects

## Next Steps

1. ✅ Create classification script (`scripts/classify-specs.js`)
2. ✅ Run classification on existing 22 specs
3. ✅ Review and adjust classifications (manual)
4. ✅ Create domain folder structure
5. ✅ Migrate specs to domains (automated)
6. ✅ Generate indices (automated)
7. ✅ Update living docs sync logic
8. ✅ Update CLAUDE.md with new organization rules
9. ✅ Update PM agent to use new structure
10. ✅ Test with new increment creation

## Configuration

Add to `.specweave/config.json`:

```json
{
  "specs": {
    "organization": {
      "strategy": "domain-based",
      "autoDomainClassification": true,
      "autoGenerateIndices": true,
      "requireMetadata": true,
      "domains": [
        "core-framework",
        "developer-experience",
        "integrations",
        "infrastructure",
        "quality-velocity",
        "intelligence"
      ],
      "metadata": {
        "required": ["id", "title", "status", "domain", "team", "owner"],
        "optional": ["priority", "complexity", "tags", "increments"]
      }
    }
  }
}
```

## Summary

**From**: Flat file structure with 30+ specs in one folder
**To**: Enterprise-grade organization with domains, metadata, and auto-generated indices

**Impact**:
- 10x faster spec discovery
- 100% metadata coverage
- Auto-classification via AI
- Multi-dimensional navigation
- Scales to 1000+ specs

**Effort**: 2-3 hours (mostly automated)
