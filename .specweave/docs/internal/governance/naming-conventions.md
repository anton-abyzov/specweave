# Internal Documentation Naming Conventions

**Status**: Active
**Last Updated**: 2025-11-26
**Purpose**: Define consistent naming rules for internal docs used as team wiki

---

## File Naming Rules

### General Format

```
{descriptive-name}.md
```

**Rules**:
- Use **kebab-case** (lowercase with hyphens)
- No underscores (use hyphens instead)
- No spaces
- Descriptive but concise (2-5 words)
- File extension: `.md`

### UPPERCASE Exceptions

Only these file types may use UPPERCASE:

| Pattern | Purpose | Example |
|---------|---------|---------|
| `README.md` | Directory index | Standard convention |
| `FEATURE.md` | Living docs feature file | Feature spec template |

**Rationale**: UPPERCASE reserved for widely-recognized standard file names only.

All other files use **kebab-case** including:
- Recovery runbooks: `hook-crash-recovery.md`
- Templates: `bug-report-template.md`
- Guides: `migration-guide.md`

### Common Patterns

| Pattern | Example |
|---------|---------|
| Architecture docs | `architecture-overview.md` |
| Design docs | `design-sync-engine.md` |
| Recovery runbooks | `hook-crash-recovery.md` |
| Monitoring docs | `circuit-breaker-monitoring.md` |
| Templates | `bug-report-template.md` |
| Guides | `migration-guide.md` |

---

## ADR Naming

### Format

```
{4-digit-number}-{descriptive-title}.md
```

**Examples**:
- `0001-tech-stack.md`
- `0052-smart-pagination.md`
- `0145-context-loading.md`

### Rules

1. **Number must match title**: File `0145-*.md` must have `# ADR-0145:` as first heading
2. **Sequential numbering**: No gaps (or document why skipped)
3. **One topic per ADR**: Don't combine unrelated decisions
4. **Superseded ADRs**: Mark with `Status: Superseded` and link to replacement

### Title Format Inside ADR

```markdown
# ADR-{NUMBER}: {Title}

**Status**: Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
```

---

## Folder Structure

### Top-Level Organization

```
internal/
├── README.md                    # Wiki home page / getting started
├── architecture/                # System design & decisions
├── delivery/                    # Release & deployment
├── governance/                  # Standards & policies
├── operations/                  # Runbooks & monitoring (rename to runbooks/)
├── specs/                       # Living documentation
└── strategy/                    # Product strategy
```

### Architecture Subfolders

```
architecture/
├── README.md                    # Architecture index
├── adr/                         # Architecture Decision Records
│   └── NNNN-topic.md           # Individual ADRs
├── concepts/                    # Core concepts explained
├── diagrams/                    # Visual diagrams
├── guides/                      # Implementation guides
├── hld/                         # High-Level Design docs
└── specs-architecture/          # Architecture specs
```

### No Redundant Prefixes

Files in typed folders don't need type prefix:

| Wrong | Correct |
|-------|---------|
| `hld/diagram-generation.md` | `hld/diagram-generation.md` |
| `adr/adr-0001-tech-stack.md` | `adr/0001-tech-stack.md` |
| `runbooks/runbook-api.md` | `runbooks/api.md` |

---

## Living Docs (specs/)

### Feature Folders

```
specs/{project}/FS-{NNN}/
├── README.md           # Feature overview
├── FEATURE.md          # Feature definition
└── us-{NNN}-{title}.md # User stories
```

### User Story Files

```
us-{3-digit}-{kebab-case-title}.md
```

**Examples**:
- `us-001-smart-pagination-during-init.md`
- `us-002-cli-first-defaults.md`

**Rules**:
- Numbers are scoped to feature (restart at 001 per feature)
- Same us-XXX number can exist in different FS-YYY folders (not duplicates)

---

## Anti-Patterns to Avoid

### 1. Duplicate Topics

**Problem**: Multiple ADRs covering same topic
```
0052-smart-pagination.md
0180-smart-pagination-50-project-limit.md
0181-smart-pagination.md
```

**Solution**: One canonical ADR per topic. Others should:
- Be marked `Superseded` if outdated
- Reference the canonical ADR
- Be deleted if truly duplicate

### 2. Title/Number Mismatch

**Problem**: File `0145-context-loading.md` contains `# ADR-0002:`

**Solution**: Title must match filename number

### 3. Mixed Case

**Problem**: `MIGRATION_GUIDE.md` (uppercase with underscore)

**Solution**: Either `MIGRATION-GUIDE.md` (template/special) or `migration-guide.md` (regular)

### 4. Over-Nesting

**Problem**:
```
architecture/diagrams/workflow-orchestration/sub-diagrams/detail/flow.md
```

**Solution**: Max 3 levels deep. Flatten if deeper.

---

## Smart Organization for Large Folders

### When to Organize

When a folder exceeds **30 files**, use `/specweave:organize-docs` to generate themed navigation indexes.

### Organization Philosophy

**Generate indexes, don't move files** - This preserves URLs and existing links.

### What Gets Generated

```
architecture/adr/
├── _categories.md          # Main navigation hub
├── _index-sync.md          # Sync-related ADRs
├── _index-github.md        # GitHub integration ADRs
├── _index-hooks.md         # Hook & event ADRs
├── _index-testing.md       # Testing ADRs
└── ... (original files unchanged)
```

### Theme Categories

The organizer detects these themes automatically:

| Icon | Theme | Keywords |
|------|-------|----------|
| 🔄 | Synchronization | sync, integration, bidirectional |
| 🐙 | GitHub | github, issue, actions |
| 🪝 | Hooks | hook, event, trigger |
| 🔌 | External Tools | jira, ado, area-path |
| 🧪 | Testing | test, fixture, coverage |
| 🏗️ | Brownfield | brownfield, migration, legacy |
| ⚡ | Performance | cache, pagination, batch |
| 🔒 | Security | permission, auth, token |
| 📦 | Increments | increment, status, lifecycle |
| ⚙️ | Configuration | config, env, setup |
| 📚 | Documentation | doc, spec, naming |

### Docusaurus Integration

Generated indexes work seamlessly with Docusaurus:

```bash
/specweave-docs:organize  # Generate indexes
/specweave-docs:view      # View in browser (internal docs, port 3015)
/specweave-docs:view --public  # View public docs (port 3016)
```

The sidebar will show themed categories for easy navigation.

---

## Migration Checklist

When reviewing/fixing docs:

- [ ] File uses kebab-case (or allowed UPPERCASE pattern)
- [ ] No underscores in filename
- [ ] ADR number matches title inside
- [ ] No redundant folder prefix in filename
- [ ] No duplicate topics across ADRs
- [ ] README.md exists in each folder
- [ ] Cross-references use relative paths

---

## Validation Script

Run audit:
```bash
./scripts/docs-audit-and-fix.sh audit
```

Apply safe fixes:
```bash
./scripts/docs-audit-and-fix.sh fix
```

Generate report:
```bash
./scripts/docs-audit-and-fix.sh report
```
