---
name: sw:archive-features
description: Archive features and epics when all related increments are archived
---

# Archive Features and Epics

Archive features and epics based on their increment archive status. Features are archived when all their increments are archived, and epics are archived when all their features are archived.

## Usage

```bash
/sw:archive-features [options]
```

## Options

- `--dry-run`: Show what would be archived without actually moving files
- `--update-links`: Update all links to archived items (default: true)
- `--preserve-active`: Don't archive features with active projects (default: true)
- `--orphaned`: Also archive orphaned features/epics with no increments/features
- `--reason <text>`: Optional reason for archiving (for audit trail, AC-US13-07)

## Examples

```bash
# Preview what would be archived
/sw:archive-features --dry-run

# Archive features and update all links
/sw:archive-features

# Archive including orphaned features
/sw:archive-features --orphaned

# Archive with custom reason for audit trail (AC-US13-07)
/sw:archive-features --reason="Obsolete after product pivot"
```

## Archive Rules

### Features are archived when:
1. All linked increments are in _archive folder
2. No active projects remain (unless --preserve-active=false)
3. Feature is orphaned (no increments) and --orphaned is set

### Epics are archived when:
1. All linked features are in _archive folder
2. Epic is orphaned (no features) and --orphaned is set

### Archive Structure (v5.0.0+):
```
.specweave/docs/internal/specs/
├── {project}/               # e.g., specweave/, backend/, frontend/
│   ├── FS-023/              # Active feature (FEATURE.md + us-*.md)
│   └── _archive/
│       └── FS-001/          # Archived feature
├── _epics/
│   ├── EPIC-2025-Q1/        # Active epic
│   └── _archive/
│       └── EPIC-2024-Q4/    # Archived epic
```

**Note**: The `_features/` folder is OBSOLETE (v5.0.0+). Features live in `{project}/FS-XXX/`.

## Important Notes

- Archives are LOCAL ONLY (not synced to GitHub/JIRA/ADO)
- All links are automatically updated to point to archive locations
- Use `/sw:restore-feature FS-001` to restore from archive

## Implementation

```typescript
import { Task } from '@claude/types';

const task = new Task('feature-archiver', 'Archive features and epics');

// Main logic
task.run(async () => {
  const { FeatureArchiver } = await import('../../../dist/src/core/living-docs/feature-archiver.js');
  const archiver = new FeatureArchiver(process.cwd());

  // Parse options
  const reasonIndex = process.argv.indexOf('--reason');
  const customReason = reasonIndex !== -1 && reasonIndex + 1 < process.argv.length
    ? process.argv[reasonIndex + 1]
    : undefined;

  const options = {
    dryRun: process.argv.includes('--dry-run'),
    updateLinks: !process.argv.includes('--no-update-links'),
    preserveActiveFeatures: !process.argv.includes('--no-preserve-active'),
    archiveOrphanedFeatures: process.argv.includes('--orphaned'),
    archiveOrphanedEpics: process.argv.includes('--orphaned'),
    customReason: customReason
  };

  // Execute archiving
  const result = await archiver.archiveFeatures(options);

  // Display results
  console.log('\n📦 Archive Results:');
  console.log(`  Features archived: ${result.archivedFeatures.length}`);
  console.log(`  Epics archived: ${result.archivedEpics.length}`);
  console.log(`  Links updated: ${result.updatedLinks.length}`);

  if (result.errors.length > 0) {
    console.error('\n❌ Errors:');
    result.errors.forEach(err => console.error(`  - ${err}`));
  }

  // Show stats
  const stats = await archiver.getArchiveStats();
  console.log('\n📊 Archive Statistics:');
  console.log(`  Features: ${stats.features.active} active, ${stats.features.archived} archived`);
  console.log(`  Epics: ${stats.epics.active} active, ${stats.epics.archived} archived`);

  // Show per-project stats
  if (Object.keys(stats.projects).length > 0) {
    console.log('\n  Per Project:');
    for (const [project, counts] of Object.entries(stats.projects)) {
      console.log(`    ${project}: ${counts.active} active, ${counts.archived} archived`);
    }
  }
});

export default task;
```