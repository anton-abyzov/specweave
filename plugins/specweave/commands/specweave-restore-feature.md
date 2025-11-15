---
name: specweave-restore-feature
description: Restore a feature or epic from archive back to active status
---

# Restore Feature or Epic from Archive

Restore an archived feature or epic back to its active location. This also restores all project-specific folders and updates links throughout the codebase.

## Usage

```bash
/specweave:restore-feature <feature-or-epic-id>
```

## Examples

```bash
# Restore a feature
/specweave:restore-feature FS-001

# Restore an epic
/specweave:restore-feature EPIC-2024-Q4
```

## What Gets Restored

### For Features:
1. `_features/_archive/FS-XXX/` → `_features/FS-XXX/`
2. `{project}/_archive/FS-XXX/` → `{project}/FS-XXX/` (all projects)
3. All links updated from archive paths back to active paths

### For Epics:
1. `_epics/_archive/EPIC-XXX/` → `_epics/EPIC-XXX/`
2. All links updated from archive paths back to active paths

## Important Notes

- Cannot restore if the item already exists in active location
- Links are automatically updated throughout the codebase
- Consider restoring related increments if needed

## Implementation

```typescript
import { Task } from '@claude/types';

const task = new Task('restore-feature', 'Restore feature or epic from archive');

task.run(async () => {
  const itemId = process.argv[3]; // Get the feature/epic ID

  if (!itemId) {
    console.error('❌ Please provide a feature or epic ID to restore');
    console.log('Usage: /specweave:restore-feature <feature-or-epic-id>');
    console.log('Example: /specweave:restore-feature FS-001');
    process.exit(1);
  }

  const { FeatureArchiver } = await import('../../../dist/src/core/living-docs/feature-archiver.js');
  const archiver = new FeatureArchiver(process.cwd());

  try {
    // Determine if it's a feature or epic
    const isEpic = itemId.startsWith('EPIC-');

    if (isEpic) {
      // Restore epic (to be implemented)
      await archiver.restoreEpic(itemId);
      console.log(`✅ Restored epic ${itemId} from archive`);
    } else {
      // Restore feature
      await archiver.restoreFeature(itemId);
      console.log(`✅ Restored feature ${itemId} from archive`);
    }

    // Show current stats
    const stats = await archiver.getArchiveStats();
    console.log('\n📊 Current Archive Statistics:');
    console.log(`  Features: ${stats.features.active} active, ${stats.features.archived} archived`);
    console.log(`  Epics: ${stats.epics.active} active, ${stats.epics.archived} archived`);

  } catch (error) {
    console.error(`❌ Failed to restore ${itemId}: ${error.message}`);
    process.exit(1);
  }
});

export default task;
```