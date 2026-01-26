# Phase 2: Create Increment

Load this phase when ready to create increment files.

## STEP 1: Get Next Increment Number

```bash
# Using helper
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next

# Or manually
ls -1 .specweave/increments/ | grep -E '^[0-9]{4}-' | sort | tail -1
# Get highest, add 1
```

## STEP 1.5: Validate Number

Warn if non-sequential:
```
⚠️  Skipping 2 number(s): 0158 to 0159
💡 Consider using 0158 for sequential tracking.
```

## STEP 2: Check Duplicates

```bash
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0021
```

## STEP 3: Create via Template Creator API (MANDATORY)

**USE THE API - Direct Write is FORBIDDEN!**

```bash
npx ts-node -e "
import { createIncrementTemplates } from './src/core/increment/template-creator.js';

const result = await createIncrementTemplates({
  incrementId: '0021-feature-name',
  title: 'Feature Title',
  description: 'Brief description',
  projectId: 'PROJECT_ID_FROM_PHASE_1',
  boardId: 'BOARD_ID_IF_2_LEVEL',
  type: 'feature',
  priority: 'P1',
  projectRoot: process.cwd()
});

console.log(result.success ? 'Created!' : result.error);
"
```

**Alternative CLI:**
```bash
specweave create-increment \
  --id "0021-feature-name" \
  --title "Feature Title" \
  --project "my-project" \
  --type feature
```

## What Template Creator Does

1. Creates increment directory
2. Creates metadata.json (reads testMode from config)
3. Creates spec.md TEMPLATE with markers
4. Creates plan.md TEMPLATE with markers
5. Creates tasks.md TEMPLATE (TDD-aware)
6. Returns next steps

## Increment Structure

**ONLY at root:**
- metadata.json
- spec.md
- plan.md
- tasks.md

**Everything else in subfolders:**
```
.specweave/increments/####-name/
├── reports/
├── logs/
├── scripts/
└── docs/
```

## STEP 4: Guide User

Output guidance:
```
✅ Templates created: .specweave/increments/0021-feature-name/

🚀 To complete planning (run in MAIN conversation):
1. "Complete spec for increment 0021-feature-name"
2. "Design architecture for increment 0021-feature-name"
3. "Create tasks for increment 0021-feature-name"
```

## STEP 5: Trigger Sync

```bash
/sw:sync-specs 0021-feature-name
```

Expected:
```
✅ Living docs synced: FS-021
📡 GitHub: 3 issues created
```

## Next

After creation, user completes spec in main conversation.
