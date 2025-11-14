---
name: specweave-jira-sync-epic
description: Sync SpecWeave Epic folder to JIRA (Epic + Stories with Epic Link). Implements Universal Hierarchy architecture - Epic → JIRA Epic, Increments → Stories.
---

# Sync Epic to JIRA (Universal Hierarchy)

**Architecture**: Hierarchical sync using Epic folder structure

- **Epic (FS-001)** → **JIRA Epic**
- **Increment (0001-core-framework)** → **JIRA Story** (Epic Link field)

## Usage

```bash
/specweave-jira:sync-epic <epic-id> [--project <project-key>]
```

## What It Does

**Hierarchical Sync Process**:

1. **Load Epic folder** from `.specweave/docs/internal/specs/FS-XXX-name/`
2. **Parse Epic README.md** to get Epic metadata (title, increments, status)
3. **Create or update JIRA Epic**:
   - Summary: `[FS-001] Epic Title`
   - Description: Epic overview + progress stats
   - Priority: Mapped from P0→Highest, P1→High, etc.
   - Labels: `epic-sync`, `fs-001`
4. **Sync each increment as JIRA Story**:
   - Summary: `[INC-0001-core-framework] Title`
   - Description: Increment overview
   - Epic Link: Links to Epic via `epicKey` field
   - Labels: `increment`, `epic-sync`
5. **Update frontmatter** in Epic README.md and increment files

## Examples

### Sync Epic FS-001 (Core Framework Architecture)

```bash
/specweave-jira:sync-epic FS-001 --project SPEC
```

**Output**:
```
🔄 Syncing Epic FS-001 to JIRA...
   📦 Epic: Core Framework Architecture
   📊 Increments: 4
   🚀 Creating JIRA Epic...
   ✅ Created Epic SPEC-100

   📝 Syncing 4 increments...
   ✅ Created Story SPEC-101 for 0001-core-framework
   ✅ Created Story SPEC-102 for 0002-core-enhancements
   ✅ Created Story SPEC-103 for 0004-plugin-architecture
   ✅ Created Story SPEC-104 for 0005-cross-platform-cli

✅ Epic sync complete!
   Epic: https://mycompany.atlassian.net/browse/SPEC-100
   Stories created: 4
   Stories updated: 0
```

### Sync Epic with short ID

```bash
/specweave-jira:sync-epic 031 --project SPEC
```

### Re-sync Epic (updates existing)

```bash
/specweave-jira:sync-epic FS-001 --project SPEC
```

**Output**:
```
🔄 Syncing Epic FS-001 to JIRA...
   ♻️  Updating existing Epic SPEC-100...
   ✅ Updated Epic SPEC-100

   📝 Syncing 4 increments...
   ♻️  Updated Story SPEC-101 for 0001-core-framework
   ♻️  Updated Story SPEC-102 for 0002-core-enhancements
   ♻️  Updated Story SPEC-103 for 0004-plugin-architecture
   ♻️  Updated Story SPEC-104 for 0005-cross-platform-cli

✅ Epic sync complete!
   Epic: https://mycompany.atlassian.net/browse/SPEC-100
   Stories created: 0
   Stories updated: 4
```

## Arguments

- `<epic-id>` - Epic ID (e.g., `FS-001` or just `001`)
- `--project <key>` - JIRA project key (e.g., `SPEC`, `PROJ`, `DEV`)

## What Gets Created

### JIRA Epic (Epic-level)

```
Key: SPEC-100
Summary: [FS-001] Core Framework Architecture

Description:
  Epic: Core Framework Architecture

  Progress: 4/4 increments (100%)

  Priority: P0
  Status: complete

Labels: epic-sync, fs-001
Priority: Highest (P0 → Highest)
```

### JIRA Story (Increment-level)

```
Key: SPEC-101
Summary: [INC-0001-core-framework] Core Framework

Description:
  Foundation framework with CLI, plugin system, and agent architecture...

  ---

  **Increment**: 0001-core-framework
  **Epic**: SPEC-100

  🤖 Auto-created by SpecWeave Epic Sync

Epic Link: SPEC-100 (linked via Epic Link field)
Labels: increment, epic-sync
```

## Frontmatter Updates

### Epic README.md (after sync)

```yaml
---
id: FS-001
title: "Core Framework Architecture"
external_tools:
  jira:
    type: epic
    key: SPEC-100                       # ← Added
    url: https://mycompany.atlassian.net/browse/SPEC-100  # ← Added
increments:
  - id: 0001-core-framework
    external:
      jira: SPEC-101                    # ← Added
  - id: 0002-core-enhancements
    external:
      jira: SPEC-102                    # ← Added
---
```

### Increment file (0001-core-framework.md)

```yaml
---
id: 0001-core-framework
epic: FS-001
external:
  jira:
    story: SPEC-101                     # ← Added
    url: https://mycompany.atlassian.net/browse/SPEC-101  # ← Added
---
```

## Benefits

✅ **Hierarchical tracking**: JIRA Epics group related Stories
✅ **Epic-level progress**: See completion in Epic details
✅ **Automatic linking**: Epic Link field links Stories to Epic
✅ **Idempotent**: Safe to re-run (updates existing Epic/Stories)
✅ **Brownfield-ready**: Links existing JIRA Epics/Stories

## Requirements

1. **JIRA credentials** in `.env`:
   ```
   JIRA_DOMAIN=mycompany.atlassian.net
   JIRA_EMAIL=user@mycompany.com
   JIRA_API_TOKEN=your-api-token
   ```
2. **Project exists** in JIRA
3. **Write access** to project (for creating Epics/Stories)
4. **Epic folder exists** at `.specweave/docs/internal/specs/FS-XXX-name/`

## Architecture: Why Epic Link?

**JIRA's Hierarchy**:
- JIRA Epics = Top-level grouping
- JIRA Stories = Implementation work
- Epic Link field = Links Stories to Epic

**Comparison with GitHub/ADO**:
- GitHub: Epic → Milestone, Increment → Issue (Milestone link)
- JIRA: Epic → Epic, Increment → Story (Epic Link field)
- ADO: Epic → Feature, Increment → User Story (Parent link)

All three implement the same Universal Hierarchy, just with different fields/terminology.

## Priority Mapping

| SpecWeave | JIRA |
|-----------|------|
| P0 | Highest |
| P1 | High |
| P2 | Medium |
| P3 | Low |

## Troubleshooting

**"Epic FS-001 not found"**:
- Check Epic folder exists: `ls .specweave/docs/internal/specs/`
- Verify Epic ID format: `FS-001-epic-name/`

**"Epic README.md missing YAML frontmatter"**:
- Ensure Epic was migrated with `migrate-to-epic-folders.ts`
- Frontmatter must start with `---` on line 1

**"Failed to create JIRA Epic"**:
- Check credentials: `echo $JIRA_API_TOKEN`
- Verify project exists in JIRA
- Check write permissions

**"Epic Link field not found"**:
- Some JIRA instances use custom field for Epic Link
- Check with JIRA admin for custom field ID
- May need configuration update

## Related Commands

- `/specweave-github:sync-epic` - Sync to GitHub Milestone + Issues
- `/specweave-ado:sync-epic` - Sync to ADO Feature + User Stories
- `/specweave-jira:sync-spec` - OLD (flat spec → epic) - DEPRECATED

## Implementation

**File**: `plugins/specweave-jira/lib/jira-epic-sync.ts`

**Core Class**: `JiraEpicSync`

**Methods**:
- `syncEpicToJira(epicId)` - Main sync logic
- `createEpic(epic)` - Create JIRA Epic
- `updateEpic(key, epic)` - Update existing Epic
- `createStory(increment, epicKey)` - Create JIRA Story
- `updateStory(key, increment, epicKey)` - Update existing Story
- `updateEpicReadme(path, jira)` - Update frontmatter
- `updateIncrementExternalLink(...)` - Update increment frontmatter

## Next Steps

After syncing Epic to JIRA:

1. **View Epic**: Open in JIRA browser
2. **List Stories**: Filter by Epic Link field
3. **Track completion**: JIRA shows Epic progress automatically
4. **Link to Sprint**: Drag Stories into Sprint planning
