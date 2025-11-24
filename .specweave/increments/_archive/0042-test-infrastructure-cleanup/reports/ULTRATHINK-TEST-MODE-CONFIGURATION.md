# Ultrathink Analysis: Test Mode Configuration System

**Date**: 2025-11-18
**Context**: Investigation of global test methodology configuration (TDD vs test-after vs manual)
**Increment**: 0042-test-infrastructure-cleanup

---

## Executive Summary

SpecWeave has a **three-level test mode configuration hierarchy**:

1. **Global Default** (`.specweave/config.json` → `testing.defaultTestMode`)
2. **Per-Increment Override** (`spec.md` frontmatter → `test_mode`)
3. **Runtime Storage** (`metadata.json` → `testMode`)

**Key Finding**: To disable TDD globally, modify `.specweave/config.json`. New increments will inherit the new default.

---

## Configuration Architecture

### 1. Global Configuration (`.specweave/config.json`)

**Location**: `.specweave/config.json`

**Structure**:
```json
{
  "testing": {
    "defaultTestMode": "TDD",           // ← GLOBAL DEFAULT
    "defaultCoverageTarget": 80,
    "coverageTargets": {
      "unit": 85,
      "integration": 80,
      "e2e": 90
    }
  }
}
```

**Valid Values**:
- `"TDD"` - Test-Driven Development (write tests first)
- `"test-after"` - Implement first, then write tests
- `"manual"` - No automated tests

**Defaults**: Defined in `src/core/types/config.ts`:
```typescript
export const DEFAULT_CONFIG: Partial<SpecweaveConfig> = {
  testing: {
    defaultTestMode: 'TDD',
    defaultCoverageTarget: 80,
    coverageTargets: {
      unit: 85,
      integration: 80,
      e2e: 90,
    },
  },
  // ...
};
```

### 2. Per-Increment Override (`spec.md` Frontmatter)

**Location**: `.specweave/increments/####-name/spec.md`

**Format** (YAML frontmatter):
```yaml
---
test_mode: test-after
coverage_target: 75
---

# Feature Specification
...
```

**Behavior**:
- Overrides global `defaultTestMode` for this increment only
- Optional (if not specified, uses global default)
- Stored in increment's `metadata.json` during creation

### 3. Runtime Storage (`metadata.json`)

**Location**: `.specweave/increments/####-name/metadata.json`

**Structure**:
```json
{
  "id": "0043-spec-md-desync-fix",
  "status": "active",
  "type": "feature",
  "created": "2025-11-18T05:06:41Z",
  "lastActivity": "2025-11-18T05:06:41Z",
  "testMode": "TDD",             // ← FROM CONFIG OR FRONTMATTER
  "coverageTarget": 80,
  "github": { /* ... */ }
}
```

**Source**: Populated by PM agent during increment creation.

---

## Configuration Flow

### Increment Creation Workflow

```
User: /specweave:increment "new feature"
    ↓
PM Agent activates
    ↓
Step 1: Read global config (.specweave/config.json)
    ├─ testMode = config.testing?.defaultTestMode || 'TDD'
    └─ coverageTarget = config.testing?.defaultCoverageTarget || 80
    ↓
Step 2: Check spec.md frontmatter for overrides
    ├─ If spec.md has "test_mode:" → use that value
    └─ If spec.md has "coverage_target:" → use that value
    ↓
Step 3: Write metadata.json with final values
    ├─ testMode: <resolved value>
    └─ coverageTarget: <resolved value>
    ↓
Increment created with config
```

### Configuration Hierarchy (Priority Order)

1. **Highest Priority**: `spec.md` frontmatter (per-increment override)
2. **Medium Priority**: `.specweave/config.json` (global default)
3. **Lowest Priority**: Hardcoded defaults (`'TDD'`, `80`)

**Example Scenarios**:

| Scenario | config.json | spec.md frontmatter | Final testMode |
|----------|-------------|---------------------|----------------|
| 1 | `"TDD"` | None | `"TDD"` (from config) |
| 2 | `"TDD"` | `test_mode: test-after` | `"test-after"` (override) |
| 3 | `"test-after"` | None | `"test-after"` (from config) |
| 4 | Missing | None | `"TDD"` (hardcoded default) |

---

## Code References

### 1. Type Definitions

**File**: `src/core/types/config.ts:140-175`

```typescript
/**
 * Testing mode options
 */
export type TestMode = 'TDD' | 'test-after' | 'manual';

/**
 * Testing configuration
 *
 * Controls default testing approach and coverage targets for all increments.
 * Can be overridden per-increment via frontmatter.
 */
export interface TestingConfig {
  /** Default testing mode for new increments */
  defaultTestMode: TestMode;

  /** Default overall coverage target (70-95%) */
  defaultCoverageTarget: number;

  /** Specific coverage targets per test type */
  coverageTargets: CoverageTargets;
}
```

### 2. Increment Metadata

**File**: `src/core/types/increment-metadata.ts:60-99`

```typescript
/**
 * Increment metadata schema
 * Stored in .specweave/increments/{id}/metadata.json
 */
export interface IncrementMetadata {
  /** Increment ID (e.g., "0007-smart-increment-discipline") */
  id: string;

  /** Current status */
  status: IncrementStatus;

  /** Increment type */
  type: IncrementType;

  /** Creation timestamp (ISO 8601) */
  created: string;

  /** Last activity timestamp (ISO 8601) */
  lastActivity: string;

  /** Testing mode for this increment (defaults to global config) */
  testMode?: 'TDD' | 'test-after' | 'manual';

  /** Coverage target percentage (70-95, defaults to global config) */
  coverageTarget?: number;

  // ... other fields
}
```

### 3. PM Agent Logic

**File**: `plugins/specweave/agents/pm/AGENT.md:1242-1281`

```typescript
// Read global testing config (NEW - v0.18.0+)
const configPath = path.join(process.cwd(), '.specweave', 'config.json');
let testMode = 'TDD'; // Default if config missing
let coverageTarget = 80; // Default if config missing

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    testMode = config.testing?.defaultTestMode || 'TDD';
    coverageTarget = config.testing?.defaultCoverageTarget || 80;
  } catch (error) {
    // Config parse error - use defaults
  }
}

// Check spec.md frontmatter for overrides
const specPath = `${incrementPath}/spec.md`;
if (fs.existsSync(specPath)) {
  const specContent = fs.readFileSync(specPath, 'utf-8');
  const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const testModeMatch = frontmatter.match(/test_mode:\s*(.+)/);
    const coverageMatch = frontmatter.match(/coverage_target:\s*(\d+)/);

    if (testModeMatch) testMode = testModeMatch[1].trim();
    if (coverageMatch) coverageTarget = parseInt(coverageMatch[1]);
  }
}

// Create minimal metadata with testing config
const metadata = {
  id: incrementId,
  status: "active",
  type: "feature",
  created: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  testMode,         // From config or frontmatter override
  coverageTarget    // From config or frontmatter override
};
```

### 4. Init Command (User Prompt)

**File**: `src/cli/commands/init.ts:894-935`

```typescript
// 12. Prompt for testing configuration (NEW)
let testMode: 'TDD' | 'test-after' | 'manual' = 'TDD';
let coverageTarget = 80;

// Only prompt if interactive (not CI)
const isCI = process.env.CI === 'true' ||
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.GITLAB_CI === 'true' ||
             process.env.CIRCLECI === 'true' ||
             !process.stdin.isTTY;

if (!isCI && !continueExisting) {
  console.log('');
  console.log(chalk.cyan.bold('🧪 Testing Configuration'));
  console.log(chalk.gray('   Configure your default testing approach and coverage targets'));
  console.log('');

  const { selectedTestMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTestMode',
      message: 'Select your testing approach:',
      choices: [
        {
          name: 'TDD (Test-Driven Development) - Write tests first',
          value: 'TDD',
          short: 'TDD'
        },
        {
          name: 'Test-After - Implement first, then write tests',
          value: 'test-after',
          short: 'Test-After'
        },
        {
          name: 'Manual Testing - No automated tests',
          value: 'manual',
          short: 'Manual'
        }
      ],
      default: 'TDD'
    }
  ]);
  testMode = selectedTestMode;
  // ... (coverage target prompt follows)
}
```

---

## How to Disable TDD Globally

### Option 1: Modify `.specweave/config.json` (Recommended)

**Steps**:

1. Open `.specweave/config.json`
2. Find the `testing` section
3. Change `defaultTestMode` value:

```json
{
  "testing": {
    "defaultTestMode": "test-after",  // ← CHANGE THIS
    "defaultCoverageTarget": 80,
    "coverageTargets": {
      "unit": 85,
      "integration": 80,
      "e2e": 90
    }
  }
}
```

**Effect**:
- ✅ All **new** increments will use `test-after` mode by default
- ❌ Existing increments keep their current `testMode` (no retroactive change)
- ✅ Can still override per-increment via `spec.md` frontmatter

### Option 2: Re-run `specweave init` (Not Recommended)

**Warning**: This will prompt for all settings again and may overwrite other configs.

**Steps**:
```bash
specweave init .
# Select "Continue working" when prompted
# Select "Test-After" when prompted for testing approach
```

**Effect**:
- Updates `.specweave/config.json` with new `defaultTestMode`
- May trigger other setup prompts (adapter, plugins, etc.)

---

## How to Override TDD for Specific Increments

### Add Frontmatter to `spec.md`

**When**: You want ONE increment to use a different test mode than the global default.

**Example**: Global is TDD, but this increment should use test-after:

```yaml
---
test_mode: test-after
coverage_target: 75
---

# Feature: Quick Prototype

This is a POC that doesn't need TDD...
```

**Effect**:
- ✅ This increment uses `test-after` mode
- ✅ Other increments use global default (`TDD`)
- ✅ Override stored in `metadata.json` during creation

---

## Testing Strategy

### Current State

**Gaps Identified**:
- ❌ No tests for config hierarchy (global → frontmatter → metadata)
- ❌ No tests for testMode propagation during increment creation
- ❌ No tests for invalid testMode values
- ❌ No tests for config.json parsing errors

### Proposed Tests

#### 1. Unit Tests (`tests/unit/config-test-mode.test.ts`)

**Test Cases**:
```typescript
describe('TestMode Configuration', () => {
  describe('Config Hierarchy', () => {
    it('uses global defaultTestMode when no frontmatter override', async () => {
      // Setup: config.json with defaultTestMode: "test-after"
      // Action: Create increment without spec.md frontmatter
      // Verify: metadata.json has testMode: "test-after"
    });

    it('overrides global config with spec.md frontmatter', async () => {
      // Setup: config.json with defaultTestMode: "TDD"
      // Setup: spec.md with frontmatter test_mode: "manual"
      // Action: PM agent creates metadata.json
      // Verify: metadata.json has testMode: "manual"
    });

    it('falls back to hardcoded default when config missing', async () => {
      // Setup: No config.json file
      // Action: Create increment
      // Verify: metadata.json has testMode: "TDD"
    });

    it('falls back to hardcoded default when config malformed', async () => {
      // Setup: config.json with invalid JSON
      // Action: Create increment
      // Verify: metadata.json has testMode: "TDD" (no crash)
    });
  });

  describe('Valid Values', () => {
    it('accepts "TDD" as valid testMode', async () => {
      // Verify: No errors, metadata.json created
    });

    it('accepts "test-after" as valid testMode', async () => {
      // Verify: No errors, metadata.json created
    });

    it('accepts "manual" as valid testMode', async () => {
      // Verify: No errors, metadata.json created
    });

    it('rejects invalid testMode values', async () => {
      // Setup: config.json with testMode: "invalid"
      // Action: Create increment
      // Verify: Falls back to "TDD" OR throws validation error
    });
  });

  describe('Coverage Target', () => {
    it('uses global defaultCoverageTarget when no override', async () => {
      // Setup: config.json with defaultCoverageTarget: 85
      // Action: Create increment
      // Verify: metadata.json has coverageTarget: 85
    });

    it('overrides global coverage with spec.md frontmatter', async () => {
      // Setup: config.json with defaultCoverageTarget: 80
      // Setup: spec.md with coverage_target: 90
      // Action: PM agent creates metadata.json
      // Verify: metadata.json has coverageTarget: 90
    });
  });
});
```

#### 2. Integration Tests (`tests/integration/core/config-test-mode-integration.test.ts`)

**Test Cases**:
```typescript
describe('TestMode Integration', () => {
  it('full workflow: config → frontmatter → metadata', async () => {
    // Setup: Full .specweave/ structure with config.json
    // Action: Run /specweave:increment command
    // Verify:
    //   - Config read correctly
    //   - Frontmatter parsed correctly
    //   - metadata.json created with correct testMode
  });

  it('multiple increments inherit same global default', async () => {
    // Setup: config.json with defaultTestMode: "test-after"
    // Action: Create 3 increments (0001, 0002, 0003)
    // Verify: All 3 have testMode: "test-after"
  });

  it('changing config affects new increments only', async () => {
    // Setup: Create increment 0001 with config defaultTestMode: "TDD"
    // Action: Change config to defaultTestMode: "test-after"
    // Action: Create increment 0002
    // Verify:
    //   - 0001 still has testMode: "TDD"
    //   - 0002 has testMode: "test-after"
  });
});
```

#### 3. E2E Tests (`tests/e2e/test-mode-workflow.test.ts`)

**Test Cases**:
```typescript
describe('TestMode E2E Workflow', () => {
  it('user sets test-after mode during specweave init', async () => {
    // Simulate: specweave init with test-after selection
    // Verify: config.json created with defaultTestMode: "test-after"
  });

  it('PM agent respects config during increment creation', async () => {
    // Action: Call PM agent to create increment
    // Verify: metadata.json created with config's testMode
  });

  it('spec.md frontmatter overrides config correctly', async () => {
    // Setup: spec.md with frontmatter test_mode: "manual"
    // Action: PM agent creates metadata.json
    // Verify: metadata.json has testMode: "manual"
  });
});
```

---

## Recommendations

### Immediate Actions

1. **✅ Document Current Behavior** (This document)
2. **✅ Update `.specweave/config.json`** to disable TDD:   ```json
   {
     "testing": {
       "defaultTestMode": "test-after"
     }
   }
   ```

3. **🔧 Add Tests** (Missing coverage):
   - Unit tests for config hierarchy
   - Integration tests for PM agent metadata creation
   - E2E tests for full workflow

4. **📝 Update Documentation**:
   - Add `.specweave/docs/internal/guides/test-mode-configuration.md`
   - Update user guide with test mode explanation
   - Add troubleshooting section

### Future Enhancements

1. **Validation Layer**:
   - Add schema validation for `config.json`
   - Reject invalid `testMode` values with clear error
   - Warn on malformed frontmatter

2. **CLI Command**:
   ```bash
   specweave config set testing.defaultTestMode test-after
   specweave config get testing.defaultTestMode
   ```

3. **Per-Project Test Mode** (Multi-Project Support):
   ```json
   {
     "multiProject": {
       "projects": {
         "backend": {
           "testing": {
             "defaultTestMode": "TDD"
           }
         },
         "frontend": {
           "testing": {
             "defaultTestMode": "test-after"
           }
         }
       }
     }
   }
   ```

---

## Conclusion

**Answer to Original Question**:

> "If there is a global config for the project how to develop, e.g. TDD method, turn it off for SpecWeave. Next increment will be created with this config off, right?"

**YES**! Here's how:

1. **Edit** `.specweave/config.json`:
   ```json
   {
     "testing": {
       "defaultTestMode": "test-after"  // ← Change from "TDD"
     }
   }
   ```

2. **Effect**:
   - ✅ Next increment will use `"test-after"` mode
   - ✅ No TDD enforcement
   - ✅ Existing increments unchanged

3. **Verify**:
   ```bash
   # Create new increment
   /specweave:increment "test feature"

   # Check metadata.json
   cat .specweave/increments/0044-test-feature/metadata.json | grep testMode
   # Should show: "testMode": "test-after"
   ```

**Next Steps**:
1. Update config (immediate)
2. Add tests (this increment - 0042)
3. Document behavior (user guide)

---

**Status**: ✅ Investigation Complete
**Action Required**: Add tests for testMode configuration hierarchy
