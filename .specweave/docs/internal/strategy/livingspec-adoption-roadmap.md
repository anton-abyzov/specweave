---
title: LivingSpec Adoption Roadmap
status: approved
created: 2025-12-06
---

# LivingSpec Adoption Roadmap

## Adoption Levels

### Level 1: Basic (Day 1)

**Goal**: Get started in 5 minutes

```bash
# Initialize LivingSpec
npx livingspec init

# Creates:
.livingspec/
├── manifest.yaml
├── specs/
└── architecture/
    └── adr/
```

**What you get**:
- Directory structure
- Basic frontmatter validation
- Manual documentation

**Who it's for**: Individual developers, small projects

---

### Level 2: Structured (Week 1)

**Goal**: Full ID system with E-suffix

```bash
# Enable structured mode
livingspec upgrade --level structured
```

**New capabilities**:
- Epic → Feature → User Story → Task hierarchy
- E-suffix for external imports
- JSON schema validation
- Cross-references

**Directory structure**:
```
.livingspec/
├── manifest.yaml
├── specs/
│   └── FS-001/
│       ├── FEATURE.md
│       └── us-001.md
├── _epics/
│   └── EP-001/
│       └── EPIC.md
├── architecture/
│   ├── adr/
│   │   └── 0001-use-postgres.md
│   └── modules/
└── work/
    └── 0001-initial-setup/
```

**Who it's for**: Teams, projects with external tool integration

---

### Level 3: Integrated (Month 1)

**Goal**: Bidirectional sync with external tools

```bash
# Configure sync providers
livingspec sync init github
livingspec sync init jira
```

**New capabilities**:
- GitHub Issues → User Stories (E-suffix)
- JIRA Epics → Epics (E-suffix)
- ADO Work Items → Stories (E-suffix)
- Conflict resolution
- Origin tracking

**Sync configuration**:
```yaml
# .livingspec/sync/config.yaml
providers:
  github:
    enabled: true
    repo: "org/repo"
    sync_direction: "bidirectional"
    e_suffix_for_imports: true

  jira:
    enabled: true
    project: "PROJ"
    sync_direction: "bidirectional"
    e_suffix_for_imports: true
```

**Who it's for**: Organizations with established tooling

---

### Level 4: Automated (Month 3)

**Goal**: CI/CD integration, real-time sync

```yaml
# .github/workflows/livingspec.yml
name: LivingSpec CI

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: livingspec/validate-action@v1
        with:
          strict: true
          check-esuffix: true

  sync:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: livingspec/sync-action@v1
        with:
          providers: github,jira
```

**New capabilities**:
- Automated validation on PR
- Real-time sync on merge
- Documentation site deployment
- AI context generation

**Who it's for**: Mature engineering organizations

---

## Migration Paths

### From Confluence

```bash
# Export Confluence space
livingspec migrate confluence \
  --space PROJ \
  --output .livingspec/

# Review and approve
livingspec migrate --review

# Apply E-suffix to imported items
livingspec fix --add-esuffix-to-external
```

**Mapping**:
| Confluence | LivingSpec |
|------------|------------|
| Space | Project (manifest.yaml) |
| Page | Feature or User Story |
| Child Page | Nested content |

---

### From Notion

```bash
# Export Notion workspace (Markdown)
# Then import:
livingspec migrate notion \
  --input notion-export/ \
  --output .livingspec/

# Classify content
livingspec migrate --classify

# Apply E-suffix
livingspec fix --add-esuffix-to-external
```

**Mapping**:
| Notion | LivingSpec |
|--------|------------|
| Database | Entity type (Epic, Feature, etc.) |
| Page | Document |
| Properties | Frontmatter |

---

### From GitHub Issues Only

```bash
# Import GitHub issues as external items
livingspec sync github \
  --import-only \
  --repo org/repo \
  --label "feature"

# All imported issues get E-suffix
# US-001E, US-002E, etc.
```

---

### From Scratch (Greenfield)

```bash
# Initialize with full structure
livingspec init --level structured

# Create first feature
livingspec create feature "User Authentication"
# Creates: FS-001/FEATURE.md

# Create first user story
livingspec create story "User Login" --feature FS-001
# Creates: FS-001/us-001.md

# No E-suffix (internal items)
```

---

## Adoption Checklist

### Day 1
- [ ] Run `livingspec init`
- [ ] Create manifest.yaml
- [ ] Write first ADR

### Week 1
- [ ] Create first Feature folder
- [ ] Create first User Story
- [ ] Enable JSON schema validation
- [ ] Set up VS Code extension

### Month 1
- [ ] Configure sync provider (GitHub/JIRA/ADO)
- [ ] Import existing items (with E-suffix)
- [ ] Set up conflict resolution rules
- [ ] Document E-suffix conventions for team

### Month 3
- [ ] Add CI/CD validation
- [ ] Deploy documentation site (Docusaurus)
- [ ] Enable real-time sync
- [ ] Train team on workflow

---

## Success Criteria

### Adoption Success

| Metric | Threshold |
|--------|-----------|
| Team members using daily | > 80% |
| Docs freshness (< 7 days) | > 95% |
| E-suffix compliance | 100% |
| Sync success rate | > 99% |

### Documentation Quality

| Metric | Threshold |
|--------|-----------|
| Features with specs | > 90% |
| ADRs for decisions | > 80% |
| Cross-references valid | 100% |
| Build passing | 100% |
