# Global Test Configuration - Implementation Complete

**Date**: 2025-11-14
**Increment**: 0032 - Prevent Increment Number Gaps
**Feature**: Global Test Configuration System

---

## Summary

Successfully implemented a global testing configuration system that allows users to configure default testing approach (testMode) and coverage targets during `specweave init`, with per-increment override capabilities.

**Result**: No more hardcoded TDD and 95% coverage - users can now choose their testing style and realistic coverage targets!

---

## What Was Implemented

### 1. TypeScript Configuration Types ✅

**File**: `src/core/types/config.ts`

**Added**:
- `TestMode` type: `'TDD' | 'test-after' | 'manual'`
- `CoverageTargets` interface: Unit, Integration, E2E coverage targets
- `TestingConfig` interface: Global testing configuration
- Updated `SpecweaveConfig` to include `testing?: TestingConfig`
- Added to `DEFAULT_CONFIG`:
  ```typescript
  testing: {
    defaultTestMode: 'TDD',
    defaultCoverageTarget: 80,  // ← Changed from hardcoded 95%!
    coverageTargets: {
      unit: 85,
      integration: 80,
      e2e: 90
    }
  }
  ```

### 2. Interactive CLI Prompts ✅

**File**: `src/cli/commands/init.ts`

**Added**:
- Testing approach prompt (TDD, Test-After, Manual)
- Coverage target prompt (70%, 80%, 90%, Custom)
- Custom coverage validation (70-95% range)
- Automatic configuration in config.json

**User Experience**:
```bash
$ specweave init .

🧪 Testing Configuration
   Configure your default testing approach and coverage targets

? Select your testing approach:
  ❯ TDD (Test-Driven Development) - Write tests first
    Test-After - Implement first, then write tests
    Manual Testing - No automated tests

? Select your coverage target level:
    70% - Acceptable (core paths covered)
  ❯ 80% - Good (recommended - most paths covered)
    90% - Excellent (comprehensive coverage)
    Custom (enter your own value)

   ✔ Testing: TDD
   ✔ Coverage Target: 80%
```

### 3. Config.json Generation ✅

**File**: `src/cli/commands/init.ts` (createConfigFile function)

**Result**:
```json
{
  "project": {
    "name": "my-project",
    "version": "0.1.0"
  },
  "adapters": {
    "default": "claude"
  },
  "testing": {
    "defaultTestMode": "TDD",
    "defaultCoverageTarget": 80,
    "coverageTargets": {
      "unit": 85,
      "integration": 80,
      "e2e": 90
    }
  }
}
```

### 4. Increment Metadata Types ✅

**File**: `src/core/types/increment-metadata.ts`

**Added**:
```typescript
export interface IncrementMetadata {
  id: string;
  status: IncrementStatus;
  type: IncrementType;
  created: string;
  lastActivity: string;
  testMode?: 'TDD' | 'test-after' | 'manual';  // ← NEW
  coverageTarget?: number;                      // ← NEW
  // ... other fields
}
```

### 5. PM Agent Integration ✅

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Implementation**:
- Reads global config from `.specweave/config.json`
- Checks spec.md frontmatter for overrides
- Includes testMode and coverageTarget in metadata.json
- Priority: Frontmatter > Global Config > Hardcoded defaults

**Example**:
```typescript
// Read global config
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
let testMode = config.testing?.defaultTestMode || 'TDD';
let coverageTarget = config.testing?.defaultCoverageTarget || 80;

// Check frontmatter for overrides
if (frontmatter.test_mode) testMode = frontmatter.test_mode;
if (frontmatter.coverage_target) coverageTarget = frontmatter.coverage_target;

// Write to metadata.json
const metadata = {
  id: incrementId,
  status: "active",
  type: "feature",
  created: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  testMode,         // ← From config or override
  coverageTarget    // ← From config or override
};
```

### 6. Post-Increment-Planning Hook ✅

**File**: `plugins/specweave/hooks/post-increment-planning.sh`

**Implementation**:
- Reads testing config from config.json using `jq`
- Extracts overrides from spec.md frontmatter using `awk`
- Creates metadata.json with testMode and coverageTarget
- Fallback to defaults if config missing

**Example**:
```bash
# Read config
test_mode=$(jq -r '.testing.defaultTestMode // "TDD"' config.json)
coverage_target=$(jq -r '.testing.defaultCoverageTarget // 80' config.json)

# Check spec.md frontmatter
spec_test_mode=$(awk '/^---$/,/^---$/ {if (/^test_mode:/) ...}' spec.md)

# Create metadata.json
cat > metadata.json <<EOF
{
  "id": "$increment_id",
  "status": "active",
  "type": "$increment_type",
  "testMode": "$test_mode",
  "coverageTarget": $coverage_target
}
EOF
```

---

## Coverage Target Changes

### Before ❌
- Hardcoded to **95%** everywhere
- No way to configure
- Unrealistic for most projects

### After ✅
- Default to **80%** (industry standard)
- User-selectable: 70%, 80%, 90%, or custom (70-95%)
- Configurable globally + per-increment overrides
- Realistic and achievable targets

**Recommended Levels**:
| Level | Target | Description | Best For |
|-------|--------|-------------|----------|
| **70%** | Acceptable | Core paths covered | Legacy code, tight deadlines |
| **80%** | Good ✅ | Most paths covered | Standard projects (RECOMMENDED) |
| **90%** | Excellent | Comprehensive coverage | Critical systems, financial apps |
| **95%** | Exceptional | Near-complete coverage | Medical, aerospace (rare) |

---

## Per-Increment Override

Users can override global settings in spec.md frontmatter:

```yaml
---
increment: 0032-prevent-increment-number-gaps
title: "Prevent Increment Number Gaps"
type: bug
priority: P1
status: planned
created: 2025-11-14
test_mode: test-after      # ← Override global TDD
coverage_target: 90        # ← Override global 80%
---
```

**Priority**: Frontmatter > Global Config > Hardcoded Defaults

---

## Benefits

### For Users
- ✅ **Flexible**: Choose testing style (TDD vs test-after vs manual)
- ✅ **Realistic**: Coverage targets match industry standards (80% default)
- ✅ **Configurable**: Set once during init, use everywhere
- ✅ **Override**: Can adjust per-increment if needed
- ✅ **No surprises**: Clear prompts with explanations

### For Teams
- ✅ **Consistent**: Everyone uses same testing approach
- ✅ **Achievable**: 80% target is maintainable
- ✅ **Transparent**: Clear expectations in config.json
- ✅ **Professional**: Modern, flexible testing configuration

### For SpecWeave
- ✅ **Industry-aligned**: Matches best practices (Google, Microsoft use 70-80%)
- ✅ **User-friendly**: Interactive prompts during init
- ✅ **Future-proof**: Easy to add more testing options
- ✅ **Backward compatible**: Defaults work for existing projects

---

## Migration Path

### For New Projects
1. Run `specweave init`
2. Answer testing prompts
3. Config saved automatically
4. All increments use these defaults

### For Existing Projects
1. Run `specweave init .` → Choose "Continue working"
2. No testing prompts (keeps existing config)
3. **OR** manually add to `.specweave/config.json`:
   ```json
   {
     "testing": {
       "defaultTestMode": "TDD",
       "defaultCoverageTarget": 80,
       "coverageTargets": {
         "unit": 85,
         "integration": 80,
         "e2e": 90
       }
     }
   }
   ```

### Backward Compatibility
- ✅ If `testing` config missing → uses hardcoded defaults (TDD, 80%)
- ✅ Existing metadata.json files remain valid
- ✅ No breaking changes

---

## Testing Configuration Examples

### Startup (Fast Iteration)
```json
{
  "testing": {
    "defaultTestMode": "test-after",
    "defaultCoverageTarget": 70,
    "coverageTargets": {
      "unit": 75,
      "integration": 70,
      "e2e": 85
    }
  }
}
```

### Enterprise (High Quality)
```json
{
  "testing": {
    "defaultTestMode": "TDD",
    "defaultCoverageTarget": 85,
    "coverageTargets": {
      "unit": 90,
      "integration": 85,
      "e2e": 95
    }
  }
}
```

### Open Source (Balanced)
```json
{
  "testing": {
    "defaultTestMode": "TDD",
    "defaultCoverageTarget": 80,
    "coverageTargets": {
      "unit": 85,
      "integration": 80,
      "e2e": 90
    }
  }
}
```

---

## Files Modified

1. **src/core/types/config.ts** - Added TestingConfig interfaces
2. **src/cli/commands/init.ts** - Added interactive prompts
3. **src/core/types/increment-metadata.ts** - Added testMode and coverageTarget fields
4. **plugins/specweave/agents/pm/AGENT.md** - Read config and create metadata
5. **plugins/specweave/hooks/post-increment-planning.sh** - Read config and create metadata

**Lines Changed**: ~300 lines (types, prompts, logic)

---

## Next Steps (Future Enhancements)

### Phase 2 (Optional)
1. **Per-project profiles** - Different settings for backend vs frontend
2. **Test framework detection** - Auto-detect Jest, Mocha, Playwright
3. **Coverage enforcement** - CI/CD integration with quality gates
4. **Test mode hints** - Show test examples based on selected mode

### Phase 3 (Advanced)
1. **AI test generation** - Generate tests based on testMode
2. **Coverage visualization** - Show coverage progress in status line
3. **Test quality scoring** - Beyond coverage % (mutation testing, etc.)

---

## Validation

### Build Status
✅ TypeScript compilation: SUCCESS
✅ No type errors
✅ All modules resolved

### Manual Testing Needed
- [ ] Run `specweave init .` and test prompts
- [ ] Verify config.json created with testing section
- [ ] Create increment and check metadata.json includes testMode/coverageTarget
- [ ] Test frontmatter override
- [ ] Test fallback when config missing

---

## Related Documents

- Design Document: `.specweave/increments/0032-prevent-increment-number-gaps/reports/GLOBAL-TEST-CONFIG-DESIGN.md`
- CLAUDE.md Section: (needs update - see next todo)
- User Guide: (to be created)

---

## Summary

🎉 **Successfully implemented global test configuration system!**

**Key Achievement**: Users can now configure their testing approach and coverage targets during `specweave init`, with sensible defaults (TDD, 80%) and full flexibility (per-increment overrides).

**No more hardcoded 95% coverage!** 🚀
