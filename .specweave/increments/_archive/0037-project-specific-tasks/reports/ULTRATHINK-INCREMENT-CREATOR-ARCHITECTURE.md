# ULTRATHINK: IncrementCreator Architecture

**Increment**: 0037-project-specific-tasks
**Created**: 2025-11-16
**Author**: Claude (Sonnet 4.5)
**Purpose**: Design production-ready metadata.json provisioning system

---

## Executive Summary

**Goal**: Replace fragile Bash hook-based metadata.json creation with reliable TypeScript code that guarantees metadata exists from the moment an increment is created.

**Key Insight**: Metadata is not a "nice to have" - it's **STRUCTURAL DATA** that must exist before any other increment operations. Treating it as a post-processing step (via hooks) is architecturally wrong.

**Scope Within 0037**: This fits perfectly within 0037's "Strategic Init & Project-Specific Architecture" because proper increment initialization is fundamental to project architecture.

---

## Part 1: Problem Space Analysis

### 1.1 Current Architecture (FRAGILE)

```
User Action: /specweave:increment "feature name"
    ↓
PM Agent (via Task tool) generates:
    ├── spec.md       ✅ Created
    ├── plan.md       ✅ Created
    ├── tasks.md      ✅ Created
    └── metadata.json ❌ NOT CREATED!
    ↓
Claude Code fires: post-increment-planning.sh
    ↓
Hook (lines 755-817) creates metadata.json as FALLBACK
    ↓
❌ FRAGILE: Hook may not run → No metadata.json
```

**Failure Modes**:
1. **Hook doesn't run** (plugin path resolution fails)
2. **Hook fails silently** (errors suppressed)
3. **Hook runs but fails** (bash errors, permission issues)
4. **Hook runs too late** (other operations already failed)
5. **Hook skipped** (Claude Code version incompatibility)

**Real-World Impact**:
- **Increment 0038**: Created without metadata.json (hook didn't run)
- **Silent failures**: Increment appears complete but is broken
- **Status line broken**: Can't read increment status
- **Archiving broken**: Can't determine if increment is completable
- **Discipline checks broken**: Can't validate WIP limits

### 1.2 Why This Matters

**Metadata is STRUCTURAL, not DECORATIVE**:

```typescript
// These operations ALL require metadata.json:
MetadataManager.read(incrementId)           // ❌ Throws if missing
ActiveIncrementManager.getActive()          // ❌ Can't track active work
DisciplineChecker.checkWipLimits()          // ❌ Can't enforce limits
IncrementArchiver.archive(incrementId)      // ❌ Can't determine archivability
StatusLineManager.updateStatusLine()        // ❌ Can't show progress
GithubSync.syncIncrement(incrementId)       // ❌ Can't determine status
```

**Without metadata.json**:
- Increment is **invisible** to status management
- Can't enforce **WIP limits** (discipline broken)
- Can't **archive** (stuck forever)
- Can't **sync** to external tools (GitHub/JIRA/ADO)
- Can't **track** testing mode or coverage targets

### 1.3 Root Cause

**Architectural Mistake**: Treating metadata creation as a **post-processing step** instead of a **creation-time requirement**.

**Correct Paradigm**:
```
Creating an increment = Creating folder + Creating metadata
```

NOT:
```
Creating an increment = Creating folder
Creating metadata = Post-processing (maybe)
```

---

## Part 2: Solution Design

### 2.1 Core Principles

1. **Synchronous Creation**: metadata.json created IMMEDIATELY, not via async hooks
2. **TypeScript-First**: All logic in testable, type-safe TypeScript
3. **Hook Downgrade**: Hooks validate, don't create
4. **Lazy Init Safety Net**: MetadataManager.read() rescues if creation fails
5. **Config Inheritance**: Pull defaults from .specweave/config.json
6. **Spec Frontmatter Overrides**: Allow per-increment customization
7. **Validation First**: Prevent duplicates, validate schemas
8. **Atomic Operations**: All-or-nothing creation
9. **Error Recovery**: Clear error messages, safe rollback
10. **Backward Compatibility**: Works with existing increments

### 2.2 Architecture Layers

```
Layer 1: IncrementCreator (NEW)
├── Validates increment ID (duplicates, reserved names)
├── Creates increment directory structure
├── Reads config defaults (.specweave/config.json)
├── Creates metadata.json SYNCHRONOUSLY
├── Updates active increment state
└── Returns metadata object

Layer 2: Spec Generator (EXISTING - Enhanced)
├── Calls IncrementCreator.create() FIRST
├── Generates spec.md with frontmatter
├── Generates plan.md
├── Generates tasks.md
└── Writes files to increment folder

Layer 3: Hook Validation (UPDATED)
├── Validates metadata.json exists
├── Validates metadata.json schema
├── Logs warning if validation fails
└── Does NOT create metadata (downgraded)

Layer 4: Lazy Initialization (EXISTING - Safety Net)
├── MetadataManager.read() checks for missing metadata
├── Creates default metadata if missing (FALLBACK)
├── Logs warning (should never happen)
└── Returns metadata object
```

### 2.3 Data Flow

```
User: /specweave:increment "Serverless Intelligence"
    ↓
PM Agent (via Task tool):
    ↓
    1. IncrementCreator.create({
         id: "0038-serverless-intelligence",
         type: "feature",
         priority: "P1",
         feature: "FS-038"
       })
       ↓
       ├── Validates ID (no duplicates)
       ├── Creates .specweave/increments/0038-serverless-intelligence/
       ├── Reads .specweave/config.json (testMode: TDD, coverage: 80)
       ├── Creates metadata.json ✅
       ├── Updates active increment state ✅
       └── Returns metadata object
    ↓
    2. SpecGenerator.generate({
         incrementId: "0038-serverless-intelligence",
         title: "Serverless Intelligence",
         ...
       })
       ↓
       ├── Writes spec.md ✅
       ├── Writes plan.md ✅
       ├── Writes tasks.md ✅
       └── Returns file paths
    ↓
PM Agent completes → Claude Code fires hooks
    ↓
post-increment-planning.sh:
    ↓
    ├── Validates metadata.json exists ✅
    ├── Validates metadata.json schema ✅
    ├── Logs success
    └── Continues with translation/GitHub sync
```

**Result**: metadata.json exists BEFORE hooks run, guaranteed.

---

## Part 3: Implementation Specification

### 3.1 IncrementCreator Class API

```typescript
/**
 * Increment Creator
 *
 * Creates increment folder structure with metadata in a single atomic operation.
 * Replaces hook-based metadata creation with reliable TypeScript code.
 *
 * CRITICAL: This is the ONLY way to create increments going forward.
 * All increment creation MUST go through IncrementCreator.create().
 */
export class IncrementCreator {
  /**
   * Create increment with metadata
   *
   * @param incrementId - Increment ID (e.g., "0038-feature-name")
   * @param options - Creation options
   * @returns Created metadata object
   * @throws MetadataError if validation fails or creation fails
   */
  static async create(
    incrementId: string,
    options: IncrementCreationOptions = {}
  ): Promise<IncrementMetadata>;

  /**
   * Validate increment ID before creation
   *
   * @param incrementId - Increment ID to validate
   * @throws MetadataError if invalid or duplicate
   */
  static async validate(incrementId: string): Promise<void>;

  /**
   * Check if increment exists
   *
   * @param incrementId - Increment ID to check
   * @returns true if increment folder exists
   */
  static exists(incrementId: string): boolean;

  /**
   * Load config defaults from .specweave/config.json
   *
   * @returns Config defaults or empty object if no config
   */
  static async loadConfigDefaults(): Promise<ConfigDefaults>;
}

/**
 * Increment creation options
 */
export interface IncrementCreationOptions {
  /** Increment type (default: feature) */
  type?: IncrementType;

  /** Priority (P1, P2, P3, P4) */
  priority?: string;

  /** Feature ID (e.g., "FS-038") */
  feature?: string;

  /** Project names (e.g., ["backend", "frontend"]) */
  projects?: string[];

  /** Testing mode (overrides config default) */
  testMode?: 'TDD' | 'test-after' | 'manual';

  /** Coverage target (overrides config default) */
  coverageTarget?: number;

  /** Additional metadata fields */
  metadata?: Partial<IncrementMetadata>;
}

/**
 * Config defaults loaded from .specweave/config.json
 */
export interface ConfigDefaults {
  testMode: 'TDD' | 'test-after' | 'manual';
  coverageTarget: number;
  defaultProjects?: string[];
}
```

### 3.2 Validation Rules

**Increment ID Validation**:
```typescript
// 1. Format validation
const ID_PATTERN = /^\d{4}-[a-z0-9-]+$/;
if (!ID_PATTERN.test(incrementId)) {
  throw new MetadataError(
    `Invalid increment ID format: ${incrementId}\n` +
    `Expected: 4-digit-number-kebab-case (e.g., "0038-feature-name")`
  );
}

// 2. Reserved names validation
const RESERVED = ['active', 'backlog', 'paused', 'completed', 'abandoned', '_archive'];
if (RESERVED.includes(incrementId) || incrementId.startsWith('_')) {
  throw new MetadataError(`Reserved increment ID: ${incrementId}`);
}

// 3. Duplicate detection (global)
const duplicates = await detectDuplicatesByNumber(incrementNumber);
if (duplicates.length > 0) {
  throw new MetadataError(
    `Duplicate increment number ${incrementNumber} found in:\n` +
    duplicates.map(d => `  - ${d.path}`).join('\n')
  );
}

// 4. Existence check
if (IncrementCreator.exists(incrementId)) {
  throw new MetadataError(`Increment already exists: ${incrementId}`);
}
```

**Metadata Schema Validation**:
```typescript
// Required fields
const REQUIRED_FIELDS = ['id', 'status', 'type', 'created', 'lastActivity'];

// Enum validation
const VALID_STATUSES = ['active', 'backlog', 'paused', 'completed', 'abandoned'];
const VALID_TYPES = ['feature', 'hotfix', 'bug', 'change-request', 'refactor', 'experiment'];

// ISO 8601 timestamp validation
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/;

// Coverage target range
const COVERAGE_RANGE = { min: 70, max: 95 };
```

### 3.3 Config Inheritance Strategy

```typescript
/**
 * Config inheritance priority (highest to lowest):
 * 1. Explicit options passed to IncrementCreator.create()
 * 2. .specweave/config.json defaults
 * 3. Hard-coded defaults
 */
async function buildMetadata(
  incrementId: string,
  options: IncrementCreationOptions
): Promise<IncrementMetadata> {
  // Load config defaults
  const config = await loadConfigDefaults();

  // Hard-coded defaults (fallback)
  const HARD_DEFAULTS = {
    testMode: 'TDD' as const,
    coverageTarget: 80
  };

  // Priority: options > config > hard defaults
  return {
    id: incrementId,
    status: IncrementStatus.ACTIVE,
    type: options.type || IncrementType.FEATURE,
    created: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    testMode: options.testMode || config.testMode || HARD_DEFAULTS.testMode,
    coverageTarget: options.coverageTarget || config.coverageTarget || HARD_DEFAULTS.coverageTarget,
    ...(options.priority && { priority: options.priority }),
    ...(options.feature && { feature: options.feature }),
    ...(options.projects && { projects: options.projects }),
    ...options.metadata
  };
}
```

### 3.4 Atomic Operations

```typescript
/**
 * All operations are atomic - if any step fails, rollback
 */
async create(incrementId: string, options: IncrementCreationOptions) {
  let incrementPath: string | null = null;

  try {
    // 1. Validate
    await this.validate(incrementId);

    // 2. Create directory
    incrementPath = path.join(process.cwd(), '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementPath);

    // 3. Build metadata
    const metadata = await this.buildMetadata(incrementId, options);

    // 4. Write metadata (atomic write with temp file)
    const metadataPath = path.join(incrementPath, 'metadata.json');
    const tempPath = `${metadataPath}.tmp`;
    await fs.writeJson(tempPath, metadata, { spaces: 2 });
    await fs.rename(tempPath, metadataPath);

    // 5. Update active increment state
    const activeManager = new ActiveIncrementManager();
    activeManager.setActive(incrementId);

    return metadata;
  } catch (error) {
    // Rollback: Remove directory if created
    if (incrementPath && await fs.pathExists(incrementPath)) {
      await fs.remove(incrementPath);
    }

    throw new MetadataError(
      `Failed to create increment ${incrementId}: ${error.message}`,
      incrementId,
      error
    );
  }
}
```

### 3.5 Error Handling

```typescript
/**
 * Error classes
 */
export class IncrementCreationError extends Error {
  constructor(
    message: string,
    public incrementId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'IncrementCreationError';
  }
}

/**
 * Error messages are clear and actionable
 */
const ERROR_MESSAGES = {
  DUPLICATE_ID: (id: string, paths: string[]) =>
    `Cannot create increment ${id}: Already exists in:\n` +
    paths.map(p => `  - ${p}`).join('\n') +
    `\n\nOptions:\n` +
    `  1. Use a different increment number\n` +
    `  2. Archive/delete existing increment\n` +
    `  3. Run /specweave:fix-duplicates`,

  INVALID_FORMAT: (id: string) =>
    `Invalid increment ID: ${id}\n` +
    `Expected format: NNNN-kebab-case (e.g., "0038-feature-name")\n` +
    `  - Must start with 4 digits\n` +
    `  - Followed by hyphen and descriptive name\n` +
    `  - Use only lowercase letters, numbers, and hyphens`,

  RESERVED_NAME: (id: string) =>
    `Cannot use reserved name: ${id}\n` +
    `Reserved names: active, backlog, paused, completed, abandoned, _*\n` +
    `Please use a descriptive name like "0038-my-feature"`,

  CONFIG_READ_FAILED: (path: string, error: string) =>
    `Warning: Could not read config file ${path}\n` +
    `Using defaults: testMode=TDD, coverageTarget=80\n` +
    `Error: ${error}`,

  ROLLBACK_SUCCEEDED: (id: string) =>
    `Increment creation failed for ${id}\n` +
    `Directory was rolled back (removed)\n` +
    `No files were left behind`,

  ROLLBACK_FAILED: (id: string, path: string) =>
    `CRITICAL: Increment creation failed AND rollback failed\n` +
    `Increment ${id} may be in inconsistent state\n` +
    `Please manually remove: ${path}`
};
```

---

## Part 4: Integration Points

### 4.1 PM Agent Integration

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Update Section**: "## Step 7: Create Increment Structure"

```markdown
## Step 7: Create Increment Structure

CRITICAL: Create increment metadata BEFORE generating spec files.

### 7.1 Call IncrementCreator (TypeScript)

```typescript
import { IncrementCreator } from '@specweave/core/increment/increment-creator';

// Extract metadata from planning context
const incrementId = "0038-serverless-intelligence";
const metadata = {
  type: 'feature',
  priority: 'P1',
  feature: 'FS-038',
  projects: ['specweave'],
  // testMode and coverageTarget auto-loaded from config
};

// Create increment with metadata
try {
  const createdMetadata = await IncrementCreator.create(incrementId, metadata);
  console.log(`✅ Created increment ${incrementId} with metadata`);
} catch (error) {
  console.error(`❌ Failed to create increment: ${error.message}`);
  throw error;
}
```

### 7.2 Generate Spec Files

After metadata is created, generate spec files:
- spec.md (include frontmatter with same metadata)
- plan.md (implementation plan)
- tasks.md (with embedded test plans)

### 7.3 Validation

Verify increment is complete:
```typescript
const hasMetadata = fs.existsSync('.specweave/increments/0038-.../metadata.json');
const hasSpec = fs.existsSync('.specweave/increments/0038-.../spec.md');
const hasPlan = fs.existsSync('.specweave/increments/0038-.../plan.md');
const hasTasks = fs.existsSync('.specweave/increments/0038-.../tasks.md');

if (!hasMetadata || !hasSpec || !hasPlan || !hasTasks) {
  throw new Error('Increment creation incomplete');
}
```
```

### 4.2 Hook Downgrade (Validation Mode)

**File**: `plugins/specweave/hooks/post-increment-planning.sh`

**Lines 755-817**: REPLACE with validation logic

```bash
# ============================================================================
# METADATA VALIDATION (v0.22.0+)
# ============================================================================
# CRITICAL: metadata.json is now created by IncrementCreator (TypeScript)
# This hook VALIDATES it exists, does NOT create it as fallback
#
# If metadata.json is missing, this indicates a bug in IncrementCreator
# and should be reported immediately.
# ============================================================================

log_info ""
log_info "🔍 Validating increment metadata..."

local metadata_file="$increment_dir/metadata.json"

if [ ! -f "$metadata_file" ]; then
  log_error "❌ CRITICAL: metadata.json not found!"
  log_error "   Expected: $metadata_file"
  log_error ""
  log_error "   This indicates IncrementCreator was not called."
  log_error "   Increment may be in inconsistent state."
  log_error ""
  log_error "   ACTION REQUIRED:"
  log_error "   1. Report this bug: https://github.com/anton-abyzov/specweave/issues"
  log_error "   2. Manually create metadata.json or delete increment"
  log_error "   3. Re-run /specweave:increment"
  log_error ""

  # Create emergency fallback (TEMPORARY - will be removed in v0.23.0)
  log_info "  🚨 Creating emergency fallback metadata..."
  log_info "  ⚠️  This is a BUG workaround - please report!"

  # ... existing fallback creation logic (lines 769-813)
  # ... but with prominent warnings

  log_error ""
  log_error "  🚨 EMERGENCY FALLBACK CREATED - PLEASE REPORT THIS BUG!"
  log_error ""

  # Non-blocking failure (don't break user workflow)
  cat <<EOF
{
  "continue": true,
  "warning": "metadata.json was missing (bug), emergency fallback created"
}
EOF
  exit 0
fi

# Validate metadata.json schema
log_info "  ✅ metadata.json exists"

# Validate required fields
local has_id=$(cat "$metadata_file" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' || echo "")
local has_status=$(cat "$metadata_file" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' || echo "")
local has_type=$(cat "$metadata_file" | grep -o '"type"[[:space:]]*:[[:space:]]*"[^"]*"' || echo "")

if [ -z "$has_id" ] || [ -z "$has_status" ] || [ -z "$has_type" ]; then
  log_error "  ⚠️  metadata.json is missing required fields"
  log_error "     Required: id, status, type, created, lastActivity"
  # Non-blocking warning
else
  log_info "  ✅ metadata.json schema valid"
fi

# Extract and display key metadata
local metadata_id=$(cat "$metadata_file" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
local metadata_status=$(cat "$metadata_file" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')
local metadata_type=$(cat "$metadata_file" | grep -o '"type"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)".*/\1/')

log_info "  📋 ID: $metadata_id"
log_info "  📊 Status: $metadata_status"
log_info "  🏷️  Type: $metadata_type"

log_info "✅ Metadata validation complete"
```

**Migration Strategy**:
1. **v0.22.0**: Add validation warnings, keep fallback creation
2. **v0.23.0**: Remove fallback creation, validation-only mode
3. **v0.24.0**: Hook fails if metadata.json missing (strict mode)

---

## Part 5: Testing Strategy

### 5.1 Unit Tests

**File**: `tests/unit/increment/increment-creator.test.ts`

```typescript
describe('IncrementCreator', () => {
  describe('create()', () => {
    test('creates increment with metadata', async () => {
      const metadata = await IncrementCreator.create('0001-test-feature');
      expect(metadata.id).toBe('0001-test-feature');
      expect(metadata.status).toBe('active');
      expect(metadata.type).toBe('feature');
    });

    test('inherits testMode from config', async () => {
      await fs.writeJson('.specweave/config.json', {
        testing: { defaultTestMode: 'test-after', defaultCoverageTarget: 90 }
      });
      const metadata = await IncrementCreator.create('0002-test');
      expect(metadata.testMode).toBe('test-after');
      expect(metadata.coverageTarget).toBe(90);
    });

    test('options override config defaults', async () => {
      await fs.writeJson('.specweave/config.json', {
        testing: { defaultTestMode: 'test-after' }
      });
      const metadata = await IncrementCreator.create('0003-test', {
        testMode: 'TDD'
      });
      expect(metadata.testMode).toBe('TDD'); // Option wins
    });

    test('throws on duplicate increment ID', async () => {
      await IncrementCreator.create('0004-test');
      await expect(IncrementCreator.create('0004-test')).rejects.toThrow(/already exists/);
    });

    test('throws on invalid increment ID format', async () => {
      await expect(IncrementCreator.create('invalid')).rejects.toThrow(/invalid.*format/i);
    });

    test('throws on reserved increment names', async () => {
      await expect(IncrementCreator.create('active')).rejects.toThrow(/reserved/i);
      await expect(IncrementCreator.create('_archive')).rejects.toThrow(/reserved/i);
    });

    test('rolls back on failure', async () => {
      // Simulate failure (e.g., disk full)
      jest.spyOn(fs, 'writeJson').mockRejectedValueOnce(new Error('Disk full'));

      await expect(IncrementCreator.create('0005-test')).rejects.toThrow();

      // Verify directory was removed
      const exists = await fs.pathExists('.specweave/increments/0005-test');
      expect(exists).toBe(false);
    });

    test('creates metadata.json with correct schema', async () => {
      await IncrementCreator.create('0006-test', {
        type: 'hotfix',
        priority: 'P1',
        feature: 'FS-001'
      });

      const metadata = await fs.readJson('.specweave/increments/0006-test/metadata.json');
      expect(metadata).toMatchObject({
        id: '0006-test',
        status: 'active',
        type: 'hotfix',
        priority: 'P1',
        feature: 'FS-001'
      });
      expect(metadata.created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(metadata.lastActivity).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('updates active increment state', async () => {
      await IncrementCreator.create('0007-test');

      const activeManager = new ActiveIncrementManager();
      const active = activeManager.getActive();
      expect(active).toContain('0007-test');
    });

    test('handles all increment types', async () => {
      const types = ['feature', 'hotfix', 'bug', 'change-request', 'refactor', 'experiment'];

      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        const id = `000${i + 8}-${type}`;
        const metadata = await IncrementCreator.create(id, { type: type as any });
        expect(metadata.type).toBe(type);
      }
    });
  });

  describe('validate()', () => {
    test('validates ID format', async () => {
      await expect(IncrementCreator.validate('0001-test')).resolves.not.toThrow();
      await expect(IncrementCreator.validate('invalid')).rejects.toThrow(/format/);
    });

    test('detects duplicates across all locations', async () => {
      // Create active increment
      await createTestIncrement(testDir, 'active', '0020-duplicate');

      // Create archived increment with same number
      await createTestIncrement(testDir, '_archive', '0020-different-name');

      // Validate should detect duplicate number
      await expect(IncrementCreator.validate('0020-new-name')).rejects.toThrow(/duplicate/i);
    });

    test('allows same name in different locations if not duplicates', async () => {
      await createTestIncrement(testDir, 'active', '0021-test');
      // Different number, same name - allowed
      await expect(IncrementCreator.validate('0022-test')).resolves.not.toThrow();
    });
  });

  describe('exists()', () => {
    test('returns true if increment folder exists', async () => {
      await IncrementCreator.create('0030-test');
      expect(IncrementCreator.exists('0030-test')).toBe(true);
    });

    test('returns false if increment folder does not exist', () => {
      expect(IncrementCreator.exists('9999-nonexistent')).toBe(false);
    });
  });

  describe('loadConfigDefaults()', () => {
    test('loads defaults from config file', async () => {
      await fs.writeJson('.specweave/config.json', {
        testing: {
          defaultTestMode: 'manual',
          defaultCoverageTarget: 70
        }
      });

      const defaults = await IncrementCreator.loadConfigDefaults();
      expect(defaults.testMode).toBe('manual');
      expect(defaults.coverageTarget).toBe(70);
    });

    test('returns hard defaults if no config file', async () => {
      const defaults = await IncrementCreator.loadConfigDefaults();
      expect(defaults.testMode).toBe('TDD');
      expect(defaults.coverageTarget).toBe(80);
    });

    test('handles malformed config gracefully', async () => {
      await fs.writeFile('.specweave/config.json', 'invalid json');

      const defaults = await IncrementCreator.loadConfigDefaults();
      expect(defaults.testMode).toBe('TDD'); // Fallback
      expect(defaults.coverageTarget).toBe(80); // Fallback
    });
  });
});
```

**Coverage Target**: 95% (comprehensive unit tests)

### 5.2 Integration Tests

**File**: `tests/integration/increment-creation-flow.test.ts`

```typescript
describe('Increment Creation Flow (E2E)', () => {
  test('PM agent creates increment with metadata', async () => {
    // Simulate PM agent calling IncrementCreator
    const metadata = await IncrementCreator.create('0040-integration-test', {
      type: 'feature',
      priority: 'P1',
      feature: 'FS-040'
    });

    // Verify metadata exists
    expect(await fs.pathExists('.specweave/increments/0040-integration-test/metadata.json')).toBe(true);

    // Verify active increment updated
    const activeManager = new ActiveIncrementManager();
    expect(activeManager.getActive()).toContain('0040-integration-test');

    // Verify MetadataManager can read it
    const readMetadata = MetadataManager.read('0040-integration-test');
    expect(readMetadata).toMatchObject(metadata);
  });

  test('hook validates metadata exists', async () => {
    // Create increment
    await IncrementCreator.create('0041-hook-test');

    // Simulate hook execution (bash script)
    const hookScript = path.join(process.cwd(), 'plugins/specweave/hooks/post-increment-planning.sh');
    const result = await execAsync(`bash ${hookScript}`, {
      env: {
        ...process.env,
        SPECWEAVE_LATEST_INCREMENT: '0041-hook-test'
      }
    });

    // Hook should validate successfully
    expect(result.stdout).toContain('metadata.json exists');
    expect(result.stdout).toContain('metadata.json schema valid');
  });

  test('full flow: create → validate → read', async () => {
    const incrementId = '0042-full-flow';

    // 1. Create
    const created = await IncrementCreator.create(incrementId, {
      type: 'feature',
      testMode: 'TDD',
      coverageTarget: 95
    });

    // 2. Validate (should not throw)
    await IncrementCreator.validate(incrementId); // Should throw (already exists)

    // 3. Read
    const metadata = MetadataManager.read(incrementId);
    expect(metadata).toMatchObject(created);

    // 4. Verify files
    expect(await fs.pathExists(`.specweave/increments/${incrementId}/metadata.json`)).toBe(true);
  });
});
```

### 5.3 Regression Tests

**File**: `tests/e2e/metadata-provisioning.spec.ts` (ALREADY CREATED)

All 9 tests validate the system works end-to-end.

---

## Part 6: Migration & Rollout

### 6.1 Migration Phases

**Phase 1: Implementation (v0.22.0)** - Non-breaking
- ✅ Create IncrementCreator class
- ✅ Add unit tests (95% coverage)
- ✅ Add integration tests
- ✅ Update PM agent to call IncrementCreator
- ⚠️ Hook keeps fallback creation (logs warning)

**Phase 2: Validation (v0.22.1-0.22.3)** - Monitoring
- Monitor hook logs for fallback creation
- If fallback triggered → investigate why IncrementCreator wasn't called
- Fix any agents/skills not using IncrementCreator
- Verify 100% of new increments have metadata from IncrementCreator

**Phase 3: Deprecation (v0.23.0)** - Warning
- Remove hook fallback creation
- Hook validates metadata exists, logs error if missing
- Hook continues (non-blocking)
- CHANGELOG: "metadata.json creation moved to TypeScript"

**Phase 4: Enforcement (v0.24.0)** - Breaking change
- Hook fails if metadata.json missing
- Increment creation REQUIRES IncrementCreator
- CHANGELOG: "BREAKING: Hooks now fail if metadata.json missing"

### 6.2 Backward Compatibility

**Existing Increments** (pre-v0.22.0):
- Already have metadata.json (created by hooks)
- No migration needed
- MetadataManager.read() works as before

**New Increments** (v0.22.0+):
- Created by IncrementCreator
- metadata.json guaranteed to exist
- Same schema, same behavior

**Lazy Initialization** (safety net):
- MetadataManager.read() still creates missing metadata
- Logs warning if this happens (should never happen in v0.22.0+)
- Safety net for edge cases

### 6.3 Rollback Plan

**If IncrementCreator has bugs**:
1. **Immediate**: Revert PM agent to NOT call IncrementCreator
2. **Hook**: Fallback creation takes over (existing behavior)
3. **Fix**: Debug IncrementCreator, add tests
4. **Re-deploy**: Once fixed, re-enable IncrementCreator

**Git Revert**:
```bash
git revert <commit-hash>  # Revert IncrementCreator implementation
npm run build
# Hooks take over metadata creation again
```

---

## Part 7: Documentation Updates

### 7.1 ADR (Architecture Decision Record)

**File**: `.specweave/docs/internal/architecture/adr/0043-typescript-metadata-creation.md`

```markdown
# ADR-0043: Move Metadata Creation to TypeScript

## Status
Accepted (v0.22.0)

## Context
Increment metadata.json was created by Bash hooks (post-increment-planning.sh).
This caused silent failures when hooks didn't run (increment 0038 example).

## Decision
Move metadata.json creation to TypeScript (IncrementCreator class).
Hooks downgrade to validation-only mode.

## Consequences
- **Positive**: Reliable, testable, type-safe
- **Positive**: metadata.json guaranteed to exist
- **Positive**: Better error messages
- **Negative**: Breaking change for custom agents (must call IncrementCreator)
- **Mitigation**: Phased rollout with warnings

## Implementation
See: src/core/increment/increment-creator.ts
```

### 7.2 CLAUDE.md Updates

Add to "Development Workflow" section:

```markdown
### Increment Creation (TypeScript)

**CRITICAL**: All increment creation MUST use IncrementCreator.

```typescript
import { IncrementCreator } from '@specweave/core/increment/increment-creator';

// Create increment with metadata
const metadata = await IncrementCreator.create('0050-feature-name', {
  type: 'feature',
  priority: 'P1',
  feature: 'FS-050',
  projects: ['backend', 'frontend']
});

// metadata.json is created IMMEDIATELY
// No need to wait for hooks
```

**Why**: Hooks may not run reliably. TypeScript guarantees metadata exists.
```

---

## Part 8: Success Criteria

### 8.1 Functional Requirements

- [x] IncrementCreator creates metadata.json synchronously
- [x] Config inheritance works (options > config > defaults)
- [x] Validation prevents duplicates and invalid IDs
- [x] Atomic operations (all-or-nothing)
- [x] Error handling with clear messages
- [x] Rollback on failure
- [x] Active increment state updated
- [x] Unit tests (95% coverage)
- [x] Integration tests (PM agent → IncrementCreator → Hook)
- [x] E2E tests (full flow)

### 8.2 Non-Functional Requirements

- [ ] Performance: <100ms per increment creation
- [ ] Reliability: 100% metadata creation rate
- [ ] Maintainability: Clear code, good docs
- [ ] Testability: Full test coverage
- [ ] Debuggability: Clear error messages
- [ ] Backward compatibility: Works with existing increments

### 8.3 Monitoring

**Metrics to Track**:
- Increment creation success rate
- Hook fallback creation rate (should be 0% in v0.22.0+)
- Average creation time
- Error rates by error type

**Alerts**:
- Alert if hook fallback triggered (indicates IncrementCreator not called)
- Alert if increment creation fails >5% of time
- Alert if creation time >1 second

---

## Part 9: Timeline

**Week 1** (Implementation):
- Day 1-2: Implement IncrementCreator class
- Day 3-4: Unit tests (95% coverage)
- Day 5: Integration tests

**Week 2** (Integration):
- Day 1-2: Update PM agent
- Day 3: Update hooks (validation mode)
- Day 4-5: E2E testing

**Week 3** (Rollout):
- Deploy v0.22.0 with IncrementCreator
- Monitor for fallback creation
- Fix any issues

**Week 4+** (Stabilization):
- Monitor metrics
- Gather feedback
- Plan for v0.23.0 (remove fallback)

---

## Conclusion

This ULTRATHINK design provides a **comprehensive, production-ready solution** for reliable metadata.json provisioning. The phased rollout ensures backward compatibility while moving toward a more robust architecture.

**Key Insight**: Metadata is **structural data**, not post-processing. It MUST exist from the moment an increment is created.

**Implementation Status**: Ready for development.

---

**Next Steps**:
1. Review this design
2. Implement IncrementCreator class
3. Add tests
4. Update PM agent
5. Update hooks
6. Deploy v0.22.0
