# Global Test Configuration Design

**Date**: 2025-11-14
**Context**: Increment 0032 - Prevent Increment Number Gaps
**Issue**: testMode and coverageTarget are hardcoded, not configurable

---

## Problem Statement

Currently, test-related settings are hardcoded:
- `testMode`: Always "TDD" (no option for test-after or manual)
- `coverageTarget`: Always 95% (too ambitious for most projects)

**Impact**:
- Users cannot choose their testing style
- Coverage targets are unrealistic (95% is very hard to maintain)
- No flexibility per project or team

---

## Proposed Solution

### 1. Global Configuration (`.specweave/config.json`)

Add new `testing` section:

```json
{
  "project": {
    "name": "specweave",
    "version": "0.1.0"
  },
  "testing": {
    "defaultTestMode": "TDD",
    "defaultCoverageTarget": 80,
    "coverageTargets": {
      "unit": 85,
      "integration": 80,
      "e2e": 90
    }
  },
  "adapters": {
    "default": "claude"
  }
}
```

**Configuration Fields**:

| Field | Type | Options | Default | Description |
|-------|------|---------|---------|-------------|
| `defaultTestMode` | string | "TDD", "test-after", "manual" | "TDD" | Default testing approach |
| `defaultCoverageTarget` | number | 70-95 | 80 | Overall coverage target (%) |
| `coverageTargets.unit` | number | 70-95 | 85 | Unit test coverage target |
| `coverageTargets.integration` | number | 70-95 | 80 | Integration test coverage |
| `coverageTargets.e2e` | number | 70-95 | 90 | E2E critical path coverage |

---

### 2. `specweave init` Prompts

Add interactive prompts during initialization:

```bash
$ specweave init .

SpecWeave Initialization
========================

...existing prompts...

Testing Configuration
=====================

? Select your testing approach:
  ❯ TDD (Test-Driven Development)
    Test-After (Implementation-first)
    Manual Testing

? Select your coverage target level:
    70% - Acceptable (core paths covered)
  ❯ 80% - Good (recommended - most paths covered)
    90% - Excellent (comprehensive coverage)
    Custom (enter your own value)

? Custom coverage target (70-95): _
```

**Testing Approach Options**:

| Option | Description | Use When |
|--------|-------------|----------|
| **TDD** | Write tests first (red-green-refactor) | Team experienced with TDD, greenfield projects |
| **Test-After** | Implement first, then write tests | Rapid prototyping, exploratory work |
| **Manual** | Manual testing only (no automated tests) | Proof-of-concepts, experiments |

**Coverage Target Options**:

| Level | Target | Description | Realistic For |
|-------|--------|-------------|---------------|
| **70%** | Acceptable | Core business logic covered | Legacy codebases, tight deadlines |
| **80%** | Good ✅ | Most paths covered (RECOMMENDED) | Standard projects |
| **90%** | Excellent | Comprehensive coverage | Critical systems, financial apps |
| **95%** | Exceptional | Near-complete coverage | Medical devices, aerospace (rare) |
| **Custom** | 70-95 | User-defined | Specific project requirements |

**Why 80% is Recommended**:
- ✅ Achievable and maintainable
- ✅ Covers most critical paths
- ✅ Leaves room for UI code, edge cases
- ✅ Industry standard (Google, Microsoft use 70-80%)
- ❌ 95% is often impractical (diminishing returns)

---

### 3. Per-Increment Override

Allow overriding in spec.md frontmatter:

```yaml
---
increment: 0032-prevent-increment-number-gaps
title: "Prevent Increment Number Gaps"
type: bug
priority: P1
status: planned
created: 2025-11-14
test_mode: TDD              # ← Override global default
coverage_target: 90         # ← Override global default
---
```

**Priority**: Frontmatter > Global Config > Hardcoded Default

---

## Implementation Plan

### Phase 1: Configuration System

**Files to Update**:
1. `src/core/config-manager.ts` - Add `testing` config schema
2. `src/core/types/config.ts` - Add TypeScript interfaces
3. `.specweave/config.json` (template) - Add default testing section

**Example Config Interface**:
```typescript
export interface TestingConfig {
  defaultTestMode: 'TDD' | 'test-after' | 'manual';
  defaultCoverageTarget: number; // 70-95
  coverageTargets: {
    unit: number;
    integration: number;
    e2e: number;
  };
}

export interface SpecWeaveConfig {
  project: ProjectConfig;
  testing: TestingConfig;  // ← NEW
  adapters: AdapterConfig;
  hooks: HookConfig;
  sync: SyncConfig;
}
```

### Phase 2: CLI Prompts

**Files to Update**:
1. `src/cli/commands/init.ts` - Add testing prompts

**Prompt Flow**:
```typescript
// After project name and adapter selection
const testMode = await select({
  message: 'Select your testing approach',
  choices: [
    { name: 'TDD (Test-Driven Development)', value: 'TDD' },
    { name: 'Test-After (Implementation-first)', value: 'test-after' },
    { name: 'Manual Testing', value: 'manual' }
  ],
  default: 'TDD'
});

const coverageLevel = await select({
  message: 'Select your coverage target level',
  choices: [
    { name: '70% - Acceptable', value: 70 },
    { name: '80% - Good (recommended)', value: 80 },
    { name: '90% - Excellent', value: 90 },
    { name: 'Custom', value: 'custom' }
  ],
  default: 80
});

let coverageTarget = coverageLevel;
if (coverageLevel === 'custom') {
  coverageTarget = await number({
    message: 'Enter custom coverage target (70-95)',
    default: 80,
    min: 70,
    max: 95
  });
}

// Write to config
config.testing = {
  defaultTestMode: testMode,
  defaultCoverageTarget: coverageTarget,
  coverageTargets: {
    unit: Math.min(coverageTarget + 5, 95),
    integration: coverageTarget,
    e2e: Math.min(coverageTarget + 10, 100)
  }
};
```

### Phase 3: PM Agent Integration

**Files to Update**:
1. `plugins/specweave/agents/pm/AGENT.md` - Read from config
2. `plugins/specweave/agents/test-aware-planner/AGENT.md` - Use config defaults

**How PM Agent Should Work**:
```markdown
## Create Increment Metadata

1. Read global config:
   ```typescript
   const config = ConfigManager.read(projectRoot);
   const testMode = config.testing?.defaultTestMode || 'TDD';
   const coverageTarget = config.testing?.defaultCoverageTarget || 80;
   ```

2. Check spec.md frontmatter for overrides:
   - If `test_mode` present → use it
   - If `coverage_target` present → use it
   - Otherwise → use global defaults

3. Write to metadata.json:
   ```json
   {
     "id": "0032-prevent-gaps",
     "status": "planned",
     "testMode": "TDD",           // ← From config or override
     "coverageTarget": 80,        // ← From config or override
     "created": "2025-11-14T..."
   }
   ```
```

### Phase 4: Documentation

**Files to Update**:
1. `CLAUDE.md` - Document new config section
2. `.specweave/docs/public/guides/testing-configuration.md` - User guide
3. `README.md` - Mention in features

---

## Migration Strategy

**For Existing Projects**:

1. **Automatic Migration** (on next `specweave init` or increment):
   - Detect missing `testing` config
   - Prompt user for preferences
   - Write to config.json
   - Show migration message

2. **Backward Compatibility**:
   - If `testing` config missing → use hardcoded defaults (TDD, 95%)
   - No breaking changes for existing increments
   - Existing metadata.json files remain valid

3. **Migration Script** (optional):
   ```bash
   # Migrate existing config
   node scripts/migrate-testing-config.js
   ```

**Migration Message**:
```
⚠️  Testing configuration not found in .specweave/config.json

We've added new testing configuration options!

? Would you like to configure them now? (Y/n)

[If yes, show prompts]
[If no, use defaults: TDD, 80%]
```

---

## Benefits

### For Users
- ✅ **Flexible**: Choose testing style (TDD vs test-after)
- ✅ **Realistic**: Coverage targets match industry standards
- ✅ **Configurable**: Set once, use everywhere
- ✅ **Override**: Can adjust per-increment if needed

### For Teams
- ✅ **Consistent**: Everyone uses same testing approach
- ✅ **Reasonable**: 80% target is achievable
- ✅ **Transparent**: Clear expectations in config.json

### For SpecWeave
- ✅ **Professional**: Modern, flexible testing config
- ✅ **Industry-aligned**: Matches best practices
- ✅ **User-friendly**: Interactive prompts during init

---

## Example Configurations

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

## Open Questions

1. **Should we support per-project profiles?**
   - Example: `testing.profiles.backend = TDD`, `testing.profiles.frontend = test-after`
   - Decision: **Phase 2 feature** (not MVP)

2. **Should coverageTarget be per test type or overall?**
   - Current design: Both (global + per-type)
   - Decision: **Keep both** (flexibility)

3. **Should we validate coverageTarget range (70-95)?**
   - Yes, enforce in config-manager.ts
   - Show warning if outside recommended range

4. **Should we allow disabling tests entirely?**
   - Example: `testMode: "none"`
   - Decision: **Yes**, but show warning during init

---

## Next Steps

1. ✅ Get approval on design
2. Implement Phase 1 (Configuration System)
3. Implement Phase 2 (CLI Prompts)
4. Implement Phase 3 (PM Agent Integration)
5. Test with existing increments
6. Document in CLAUDE.md and user guides
7. Update templates and examples

---

## Related Documents

- `.specweave/increments/0032-prevent-increment-number-gaps/spec.md`
- `CLAUDE.md` (Test-Aware Planning section)
- `plugins/specweave/agents/pm/AGENT.md`
- `plugins/specweave/agents/test-aware-planner/AGENT.md`
