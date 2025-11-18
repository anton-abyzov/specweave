# 🔬 ULTRATHINK: Option B Implementation Plan - Living Docs Sync

**Date**: 2025-11-18
**Increment**: 0042-test-infrastructure-cleanup
**Scope**: Complete living docs sync mechanism with proper integration
**Estimated Effort**: 1-2 days (but we'll work autonomously to complete faster)

---

## 🎯 Implementation Goals

**Primary Objectives:**
1. ✅ **Complete SpecDistributor Integration** - Make it actually work
2. ✅ **CLI Command** - `/specweave:sync-specs` for manual/auto sync
3. ✅ **Post-Completion Hook** - Auto-sync on increment close
4. ✅ **Test Coverage** - Greenfield scenarios, auto-generation, sync execution
5. ✅ **Retroactive Sync** - Fix 5 missing increments (0022, 0034, 0040, 0041, 0042)

**Success Criteria:**
- [ ] All increments (completed) have living docs files
- [ ] Tests cover greenfield auto-generation
- [ ] Sync runs automatically on `/specweave:done`
- [ ] Manual sync command works for any increment
- [ ] No regression in existing functionality

---

## 🧬 Architecture Analysis

### Current State (Broken)

```
Increment Flow (BROKEN):
/specweave:increment → Create spec.md
/specweave:do → Execute tasks
/specweave:done → Close increment
    ❌ NO SYNC! Living docs not updated

Files:
- spec-distributor.ts.DISABLED (old, functional but disabled)
- SpecDistributor.ts (new, incomplete, not integrated)
- content-distributor.ts (for strategic docs, different purpose)
- feature-id-manager.ts (works, but never called)
```

### Target State (Fixed)

```
Increment Flow (FIXED):
/specweave:increment → Create spec.md (with feature: FS-XXX)
/specweave:do → Execute tasks
/specweave:done → Close increment
    ↓
    Hook: post-increment-complete
    ↓
    Auto-trigger: /specweave:sync-specs {incrementId}
    ↓
    ✅ Living docs updated automatically

Alternative: Manual Sync
/specweave:sync-specs 0040
    ↓
    FeatureIDManager.buildRegistry()
    ↓
    SpecDistributor.syncIncrement(0040)
    ↓
    ✅ Living docs created/updated

Files:
- SpecDistributor.ts (complete, integrated)
- feature-id-manager.ts (called by sync process)
- CLI: specweave-sync-specs.md (new command)
- Hook: post-increment-complete.sh (updated to trigger sync)
```

---

## 📋 Implementation Phases

### Phase 1: Analyze & Design (30 min)

**Tasks:**
1. ✅ Read complete `SpecDistributor.ts` implementation
2. ✅ Understand `feature-id-manager.ts` logic
3. ✅ Review old `spec-distributor.ts.DISABLED` for reference
4. ✅ Design CLI command interface
5. ✅ Design hook integration points

**Deliverables:**
- Architecture diagram (Mermaid)
- API interface spec
- Hook integration spec

### Phase 2: Complete SpecDistributor Implementation (2-3 hours)

**Current Implementation Gaps:**

Looking at `SpecDistributor.ts` (lines 1-150):
```typescript
// ✅ Has: parseAcceptanceCriteria()
// ✅ Has: parseTasks()
// ✅ Has: groupAcsByUserStory()
// ✅ Has: filterTasksByAcIds()

// ❌ Missing: findUserStoryFile() implementation
// ❌ Missing: updateUserStoryFile() implementation
// ❌ Missing: createFeatureFile() (for _features/FS-XXX/FEATURE.md)
// ❌ Missing: createUserStoryFiles() (for specweave/FS-XXX/us-*.md)
// ❌ Missing: Integration with FeatureIDManager
// ❌ Missing: GitHub URL generation for links
```

**Tasks:**
1. Complete missing methods in `SpecDistributor.ts`
2. Integrate `FeatureIDManager` for feature ID resolution
3. Add living docs structure generation:
   - `.specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md`
   - `.specweave/docs/internal/specs/specweave/FS-XXX/README.md`
   - `.specweave/docs/internal/specs/specweave/FS-XXX/us-001-title.md`
4. Add error handling and validation
5. Add dry-run mode for testing

**Method Signatures to Implement:**

```typescript
/**
 * Main sync entry point
 */
async syncIncrement(
  incrementId: string,
  options?: { dryRun?: boolean; force?: boolean }
): Promise<SyncResult>;

/**
 * Create feature overview file
 */
private async createFeatureFile(
  featureId: string,
  increment: ParsedIncrement,
  featurePath: string
): Promise<void>;

/**
 * Create/update user story files
 */
private async createUserStoryFiles(
  featureId: string,
  userStories: UserStory[],
  projectPath: string
): Promise<void>;

/**
 * Find user story file by ID
 */
private async findUserStoryFile(
  livingDocsPath: string,
  userStoryId: string
): Promise<string | null>;

/**
 * Update user story file with ACs and tasks
 */
private async updateUserStoryFile(
  userStoryPath: string,
  acs: AcceptanceCriterion[],
  tasks: Task[]
): Promise<void>;

/**
 * Generate GitHub URLs for increment
 */
private generateGitHubUrls(
  incrementId: string
): { incrementUrl: string; tasksUrl: string };
```

### Phase 3: Create CLI Command (1 hour)

**File:** `plugins/specweave/commands/specweave-sync-specs.md`

**Command Spec:**

```yaml
---
name: specweave:sync-specs
description: Sync increment specifications to living docs structure
---

# Sync Increment Specifications to Living Docs

Usage:
  /specweave:sync-specs [increment-id] [options]

Examples:
  /specweave:sync-specs              # Sync latest completed increment
  /specweave:sync-specs 0040         # Sync specific increment
  /specweave:sync-specs --all        # Sync all completed increments
  /specweave:sync-specs 0040 --force # Force re-sync even if exists
  /specweave:sync-specs --dry-run    # Preview changes without writing

Options:
  --all        Sync all completed increments (retroactive)
  --force      Force re-sync even if living docs exist
  --dry-run    Preview changes without writing files

Behavior:
1. Detect increment ID (or use provided)
2. Run FeatureIDManager.buildRegistry()
3. Auto-generate feature ID if missing (greenfield)
4. Call SpecDistributor.syncIncrement()
5. Create/update living docs files
6. Report results

Output:
✅ Synced: 0040-vitest-living-docs-mock-fixes → FS-040
   Created: .specweave/docs/internal/specs/_features/FS-040/FEATURE.md
   Created: .specweave/docs/internal/specs/specweave/FS-040/README.md
   Created: 3 user story files
```

**Implementation:**

```typescript
// src/cli/commands/sync-specs.ts
import { SpecDistributor } from '../../core/living-docs/SpecDistributor.js';
import { FeatureIDManager } from '../../core/living-docs/feature-id-manager.js';

export async function syncSpecs(args: string[]): Promise<void> {
  // Parse arguments
  const incrementId = args[0];
  const options = parseOptions(args);

  // Initialize managers
  const projectRoot = process.cwd();
  const featureManager = new FeatureIDManager(projectRoot);
  const distributor = new SpecDistributor(projectRoot);

  // Build feature registry
  await featureManager.buildRegistry();

  if (options.all) {
    // Sync all completed increments
    const increments = await findCompletedIncrements(projectRoot);
    for (const inc of increments) {
      await syncSingleIncrement(inc, distributor, featureManager, options);
    }
  } else {
    // Sync single increment
    const inc = incrementId || await findLatestCompletedIncrement(projectRoot);
    await syncSingleIncrement(inc, distributor, featureManager, options);
  }
}

async function syncSingleIncrement(
  incrementId: string,
  distributor: SpecDistributor,
  featureManager: FeatureIDManager,
  options: SyncOptions
): Promise<void> {
  // 1. Get/assign feature ID
  const featureId = await getOrAssignFeatureId(incrementId, featureManager);

  // 2. Sync increment
  const result = await distributor.syncIncrement(incrementId, {
    dryRun: options.dryRun,
    force: options.force
  });

  // 3. Report results
  console.log(`✅ Synced: ${incrementId} → ${featureId}`);
  console.log(`   Created: ${result.filesCreated.length} files`);
  console.log(`   Updated: ${result.filesUpdated.length} files`);
}
```

### Phase 4: Hook Integration (30 min)

**Update:** `plugins/specweave/hooks/post-increment-complete.sh`

```bash
#!/bin/bash
# Post-increment complete hook
# Triggered by /specweave:done after PM validation passes

INCREMENT_ID=$1

# Auto-sync to living docs
echo "📚 Syncing to living docs..."
npx specweave sync-specs "$INCREMENT_ID"

# Check sync status
if [ $? -eq 0 ]; then
  echo "✅ Living docs synced successfully"
else
  echo "⚠️  Living docs sync failed (check logs)"
fi
```

**Or via Node.js Hook** (preferred for cross-platform):

`plugins/specweave/lib/hooks/post-increment-complete.ts`:

```typescript
#!/usr/bin/env node
/**
 * Post-increment complete hook
 * Auto-syncs increment to living docs after successful closure
 */

import { syncSpecs } from '../../../../dist/src/cli/commands/sync-specs.js';

const incrementId = process.argv[2];

if (!incrementId) {
  console.error('❌ No increment ID provided');
  process.exit(1);
}

console.log(`📚 Syncing ${incrementId} to living docs...`);

syncSpecs([incrementId])
  .then(() => {
    console.log('✅ Living docs synced successfully');
  })
  .catch((error) => {
    console.error('⚠️  Living docs sync failed:', error.message);
    // Don't fail the entire closure if sync fails
    process.exit(0);
  });
```

### Phase 5: Test Coverage (2-3 hours)

**New Test Files:**

#### 5.1 Unit Tests for SpecDistributor

`tests/unit/living-docs/spec-distributor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpecDistributor } from '../../../src/core/living-docs/SpecDistributor.js';
import fs from 'fs-extra';
import path from 'path';
import * as os from 'os';

describe('SpecDistributor', () => {
  let testRoot: string;
  let distributor: SpecDistributor;

  beforeEach(async () => {
    // SAFE: Isolated temp directory (not process.cwd())
    testRoot = path.join(os.tmpdir(), `test-spec-dist-${Date.now()}`);
    await fs.ensureDir(testRoot);
    distributor = new SpecDistributor(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('syncIncrement', () => {
    it('should sync greenfield increment without feature field', async () => {
      // Create increment without feature field
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test
status: completed
type: bug
---

# Test Feature

## Acceptance Criteria

- [ ] AC-US1-01: First AC
- [ ] AC-US1-02: Second AC
`
      );

      await fs.writeFile(
        path.join(incrementPath, 'tasks.md'),
        `### T-001: First Task (P1)

**AC**: AC-US1-01
**Status**: ✅ Completed
**Completed**: 2025-11-17
`
      );

      // Sync increment
      const result = await distributor.syncIncrement('0040-test');

      // Verify feature ID auto-generated
      expect(result.featureId).toBe('FS-040');

      // Verify files created
      const featureFile = path.join(
        testRoot,
        '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'
      );
      expect(await fs.pathExists(featureFile)).toBe(true);

      const userStoryFile = path.join(
        testRoot,
        '.specweave/docs/internal/specs/specweave/FS-040/us-001-*.md'
      );
      // Should create user story file
      const usFiles = await fs.readdir(
        path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040')
      );
      expect(usFiles.length).toBeGreaterThan(0);
    });

    it('should respect existing feature field', async () => {
      // Create increment WITH feature field
      const incrementPath = path.join(testRoot, '.specweave/increments/0038-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0038-test
feature: FS-038
status: completed
---

# Test Feature
`
      );

      const result = await distributor.syncIncrement('0038-test');

      // Should use existing feature ID
      expect(result.featureId).toBe('FS-038');
    });

    it('should handle dry-run mode without writing files', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test
---
# Test
`
      );

      const result = await distributor.syncIncrement('0040-test', { dryRun: true });

      // Should plan files but not create them
      expect(result.filesCreated.length).toBeGreaterThan(0);

      const featureFile = path.join(
        testRoot,
        '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'
      );
      expect(await fs.pathExists(featureFile)).toBe(false);
    });
  });
});
```

#### 5.2 Integration Tests for CLI Command

`tests/integration/core/sync-specs-command.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { syncSpecs } from '../../../src/cli/commands/sync-specs.js';
import fs from 'fs-extra';
import path from 'path';
import * as os from 'os';

describe('sync-specs command', () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = path.join(os.tmpdir(), `test-sync-cmd-${Date.now()}`);
    await fs.ensureDir(testRoot);
    process.chdir(testRoot);
  });

  it('should sync latest completed increment when no ID provided', async () => {
    // Create multiple increments
    await createTestIncrement(testRoot, '0039', 'completed');
    await createTestIncrement(testRoot, '0040', 'completed');
    await createTestIncrement(testRoot, '0041', 'active');

    // Run sync without increment ID
    await syncSpecs([]);

    // Should sync latest COMPLETED (0040, not 0041 which is active)
    const featureFile = path.join(
      testRoot,
      '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'
    );
    expect(await fs.pathExists(featureFile)).toBe(true);
  });

  it('should sync all completed increments with --all flag', async () => {
    await createTestIncrement(testRoot, '0039', 'completed');
    await createTestIncrement(testRoot, '0040', 'completed');
    await createTestIncrement(testRoot, '0041', 'active');

    await syncSpecs(['--all']);

    // Should sync both 0039 and 0040
    expect(await fs.pathExists(
      path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-039/FEATURE.md')
    )).toBe(true);
    expect(await fs.pathExists(
      path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md')
    )).toBe(true);

    // Should NOT sync active increment
    expect(await fs.pathExists(
      path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-041/FEATURE.md')
    )).toBe(false);
  });
});

async function createTestIncrement(
  root: string,
  id: string,
  status: string
): Promise<void> {
  const incrementPath = path.join(root, `.specweave/increments/${id}-test`);
  await fs.ensureDir(incrementPath);

  await fs.writeFile(
    path.join(incrementPath, 'spec.md'),
    `---
increment: ${id}-test
status: ${status}
---
# Test Increment
`
  );

  await fs.writeJson(
    path.join(incrementPath, 'metadata.json'),
    { id: `${id}-test`, status }
  );
}
```

#### 5.3 Update Feature ID Manager Tests

`tests/unit/feature-id-manager.test.ts` (add new test cases):

```typescript
describe('FeatureIDManager - Greenfield Auto-Generation', () => {
  it('should auto-generate FS-XXX for greenfield without feature field', async () => {
    // Create increment WITHOUT feature field and WITHOUT imported flag
    const incrementPath = path.join(testProjectRoot, '.specweave/increments/0040-test');
    await fs.ensureDir(incrementPath);

    await fs.writeFile(
      path.join(incrementPath, 'spec.md'),
      `---
increment: 0040-test
status: completed
type: bug
---
# No feature field here!
`
    );

    await fs.writeJson(
      path.join(incrementPath, 'metadata.json'),
      { id: '0040-test', created: '2025-11-17', status: 'completed' }
    );

    await manager.buildRegistry();

    // Should auto-generate FS-040
    const features = manager.getAllFeatures();
    const feature040 = features.find(f => f.incrementId === '0040-test');

    expect(feature040).toBeDefined();
    expect(feature040?.assignedId).toBe('FS-040');
    expect(feature040?.originalId).toBe('FS-040');
  });

  it('should NOT auto-generate for brownfield with imported flag', async () => {
    const incrementPath = path.join(testProjectRoot, '.specweave/increments/0050-imported');
    await fs.ensureDir(incrementPath);

    await fs.writeFile(
      path.join(incrementPath, 'spec.md'),
      `---
increment: 0050-imported
imported: true
feature: FS-25-11-15-external
---
# Imported from external tool
`
    );

    await manager.buildRegistry();

    const features = manager.getAllFeatures();
    const feature050 = features.find(f => f.incrementId === '0050-imported');

    // Should use date-based ID from frontmatter
    expect(feature050?.originalId).toBe('FS-25-11-15-external');
    expect(feature050?.assignedId).toBe('FS-001'); // Sequential assignment
  });
});
```

### Phase 6: Retroactive Sync (30 min)

**Script:** `scripts/retroactive-sync-living-docs.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Retroactive sync for missing increments
 * Syncs all completed increments that don't have living docs
 */

import { syncSpecs } from '../src/cli/commands/sync-specs.js';
import fs from 'fs-extra';
import path from 'path';

const MISSING_INCREMENTS = [
  '0022-multi-repo-init-ux',
  // Skip 0034 - no spec.md file!
  '0040-vitest-living-docs-mock-fixes',
  '0041-living-docs-test-fixes',
  '0042-test-infrastructure-cleanup'
];

async function main() {
  console.log('🔄 Starting retroactive living docs sync...\n');

  for (const incrementId of MISSING_INCREMENTS) {
    console.log(`📚 Syncing ${incrementId}...`);

    try {
      // Check if spec.md exists
      const specPath = path.join(
        process.cwd(),
        '.specweave/increments',
        incrementId,
        'spec.md'
      );

      if (!await fs.pathExists(specPath)) {
        console.log(`   ⚠️  Skipped (no spec.md)\n`);
        continue;
      }

      // Sync increment
      await syncSpecs([incrementId]);
      console.log(`   ✅ Success\n`);

    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
    }
  }

  console.log('✅ Retroactive sync complete!');
}

main().catch(console.error);
```

### Phase 7: Validation & Testing (1 hour)

**Validation Checklist:**

```bash
# 1. Build project
npm run rebuild

# 2. Run all tests
npm run test:unit
npm run test:integration

# 3. Test manual sync
npx tsx scripts/retroactive-sync-living-docs.ts

# 4. Verify living docs created
ls -la .specweave/docs/internal/specs/_features/
ls -la .specweave/docs/internal/specs/specweave/

# 5. Test CLI command
/specweave:sync-specs 0040
/specweave:sync-specs --all
/specweave:sync-specs --dry-run

# 6. Test hook integration
/specweave:done 0042  # Should auto-sync

# 7. Verify no regressions
npm run test:all
```

**Expected Results:**

```
✅ Living docs structure:
.specweave/docs/internal/specs/
├── _features/
│   ├── FS-022/FEATURE.md  ← Created!
│   ├── FS-040/FEATURE.md  ← Created!
│   ├── FS-041/FEATURE.md  ← Created!
│   └── FS-042/FEATURE.md  ← Created!
└── specweave/
    ├── FS-022/
    │   ├── README.md
    │   └── us-*.md
    ├── FS-040/
    │   ├── README.md
    │   └── us-*.md
    ├── FS-041/
    │   ├── README.md
    │   └── us-*.md
    └── FS-042/
        ├── README.md
        └── us-*.md

✅ Test results:
- feature-id-manager.test.ts: ALL PASS (includes greenfield tests)
- spec-distributor.test.ts: ALL PASS (new file)
- sync-specs-command.test.ts: ALL PASS (new file)
```

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Existing Functionality

**Mitigation:**
- Run full test suite after each phase
- Incremental commits after each phase
- Don't delete old `spec-distributor.ts.DISABLED` (keep as reference)
- Test with dry-run mode first

### Risk 2: Increment 0034 Has No spec.md

**Mitigation:**
- Skip 0034 in retroactive sync
- Add warning in sync command
- Document in completion report

### Risk 3: Feature ID Conflicts

**Mitigation:**
- FeatureIDManager handles deduplication
- Registry persistence prevents conflicts
- Force flag to re-sync if needed

### Risk 4: Hook Execution Failures

**Mitigation:**
- Hook should NOT fail the entire `/specweave:done`
- Log errors but exit 0
- Add `--skip-sync` flag to `/specweave:done` if needed

---

## 📊 Success Metrics

**Quantitative:**
- [ ] 5/5 missing increments synced (excluding 0034)
- [ ] 100% test pass rate maintained
- [ ] 0 regression failures
- [ ] < 5 seconds sync time per increment

**Qualitative:**
- [ ] Living docs structure matches spec
- [ ] Feature IDs correctly assigned
- [ ] User stories properly formatted
- [ ] GitHub links work correctly
- [ ] Auto-sync triggers on increment close

---

## 🎯 Execution Strategy

**Autonomous Workflow:**

1. **Phase 1**: Read & analyze (use Read tool extensively)
2. **Phase 2**: Implement SpecDistributor methods (Edit tool)
3. **Phase 3**: Create CLI command (Write tool)
4. **Phase 4**: Update hook (Edit tool)
5. **Phase 5**: Add tests (Write tool, parallel execution)
6. **Phase 6**: Retroactive sync (Bash tool with safety checks)
7. **Phase 7**: Validate (Bash tool for test execution)

**Commit Strategy:**
- Commit after each phase completes
- Small, atomic commits
- Clear commit messages

**Testing Strategy:**
- Run unit tests after Phase 2, 5
- Run integration tests after Phase 3, 5
- Run E2E validation after Phase 6
- NO manual intervention required

---

## ⏱️ Time Estimates

| Phase | Estimated | Autonomous |
|-------|-----------|------------|
| Phase 1: Analysis | 30 min | 5 min (parallel reads) |
| Phase 2: SpecDistributor | 2-3 hours | 45 min (focused edits) |
| Phase 3: CLI Command | 1 hour | 20 min |
| Phase 4: Hook | 30 min | 10 min |
| Phase 5: Tests | 2-3 hours | 1 hour (parallel writes) |
| Phase 6: Retroactive | 30 min | 10 min |
| Phase 7: Validation | 1 hour | 15 min |
| **Total** | **7-10 hours** | **~3 hours** |

**Autonomous execution with parallel tool calls will complete in ~3 hours of focused work.**

---

## 📝 Next Steps

**Immediate:**
1. Execute Phase 1 (analysis)
2. Create Mermaid architecture diagram
3. Begin Phase 2 (SpecDistributor implementation)

**Let's begin autonomous execution!**

---

**Implementation Lead**: Claude Code (Autonomous Mode)
**Status**: Ready to Execute
**Confidence**: High (95% - clear requirements, existing code to reference, comprehensive plan)
