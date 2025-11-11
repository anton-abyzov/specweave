# Increment 0014: Proactive Plugin Validation System

**Status**: completed (scope reduced)
**Version**: 0.9.4 (target)
**Priority**: P0 (Critical Infrastructure)
**Type**: feature
**Completed**: 2025-11-11
**Scope Change**: Deferred full implementation - basic validation exists

## Executive Summary

Implement a comprehensive plugin validation system that proactively checks and installs required SpecWeave plugins BEFORE any workflow command executes. This ensures seamless environment migration (local → VM → Cloud IDE) and prevents cryptic errors from missing plugins.

## Problem Statement

### Current State (Critical Gap)

When users move projects between environments or start fresh:

```bash
# User on new VM runs:
/specweave:increment "Add GitHub sync"

# Current behavior:
❌ Command fails silently (no marketplace)
❌ Cryptic error: "command not found"
❌ User manually debugs plugin installation
❌ 10-15 minutes wasted per environment setup
```

**Pain Points**:
- ❌ No validation that marketplace is registered
- ❌ No validation that core plugin is installed
- ❌ No detection of context-specific plugins needed
- ❌ Silent failures instead of helpful prompts
- ❌ Manual intervention required for every new environment

### Desired State (After This Increment)

```bash
# User on new VM runs:
/specweave:increment "Add GitHub sync"

# New behavior:
🔍 Validating SpecWeave environment...

❌ Missing components detected:
   • SpecWeave marketplace not registered
   • Core plugin (specweave) not installed
   • Context plugin (specweave-github) not installed (detected from "GitHub sync")

📦 Installing missing components...
   ✅ Marketplace registered (.claude/settings.json)
   ✅ Core plugin installed (specweave)
   ✅ Context plugin installed (specweave-github)

🎉 Environment ready! Proceeding with increment planning...
```

**Result**: Zero manual intervention, seamless cross-environment workflows

## User Stories

### US1: Environment Migration

**As a** developer moving between environments (local → VM → cloud IDE)
**I want** SpecWeave to auto-detect and install missing plugins
**So that** I can continue work seamlessly without manual setup

**Acceptance Criteria**:
- **AC-US1-01**: Validation runs BEFORE any `/specweave:*` command executes (P1, testable)
- **AC-US1-02**: Missing marketplace is detected and registered automatically (P1, testable)
- **AC-US1-03**: Missing core plugin is detected and installed automatically (P1, testable)
- **AC-US1-04**: User sees clear progress messages during installation (P2, testable)
- **AC-US1-05**: Command proceeds automatically after validation passes (P1, testable)

**Out of Scope**:
- ❌ Validating plugin versions (deferred to future increment)
- ❌ Offline mode handling (deferred)

### US2: Context-Aware Plugin Detection

**As a** user creating increments with specific technologies
**I want** SpecWeave to suggest relevant plugins based on keywords
**So that** I get specialized expertise without manual plugin discovery

**Acceptance Criteria**:
- **AC-US2-01**: Keywords detected from increment description (e.g., "GitHub", "Stripe", "React") (P1, testable)
- **AC-US2-02**: Keywords mapped to plugins (e.g., "GitHub" → specweave-github) (P1, testable)
- **AC-US2-03**: Missing context plugins suggested to user (P1, testable)
- **AC-US2-04**: User can opt-in or skip plugin installation (P2, testable)
- **AC-US2-05**: Installed plugins available immediately in same session (P1, testable)

**Example Mappings**:

| Keywords Detected | Plugin Suggested | Why |
|------------------|------------------|-----|
| "GitHub", "git", "issues" | specweave-github | Issue tracking sync |
| "Jira", "epic", "story" | specweave-jira | Jira integration |
| "Stripe", "billing", "payment" | specweave-payments | Payment expertise |
| "React", "Next.js", "frontend" | specweave-frontend | Frontend stack |
| "Kubernetes", "k8s", "helm" | specweave-kubernetes | K8s deployment |

**Out of Scope**:
- ❌ Machine learning-based keyword detection (deferred)

### US3: Clear Validation Feedback

**As a** user running SpecWeave commands
**I want** clear feedback about plugin status and installation progress
**So that** I understand what's happening and can troubleshoot if needed

**Acceptance Criteria**:
- **AC-US3-01**: Validation shows spinner/progress indicator (P2, testable)
- **AC-US3-02**: Each installation step shows success/failure (P1, testable)
- **AC-US3-03**: Errors show actionable guidance (e.g., "Run: /plugin install specweave") (P1, testable)
- **AC-US3-04**: Summary shows all installed components at end (P2, testable)

### US4: CLI Command for Manual Validation

**As a** power user or CI/CD pipeline
**I want** a CLI command to validate plugins without running workflows
**So that** I can check environment setup independently

**Acceptance Criteria**:
- **AC-US4-01**: `specweave validate-plugins` command available (P1, testable)
- **AC-US4-02**: Command shows validation report (installed/missing) (P1, testable)
- **AC-US4-03**: Command exits with code 0 (valid) or 1 (invalid) (P1, testable)
- **AC-US4-04**: `--auto-install` flag triggers automatic installation (P2, testable)
- **AC-US4-05**: `--context="description"` enables context-aware detection (P2, testable)

**Example**:
```bash
specweave validate-plugins --auto-install --context="Add GitHub sync for mobile app"
# Output:
# ✅ Marketplace registered
# ✅ Core plugin installed (specweave v0.9.3)
# ❌ Missing: specweave-github
# 📦 Installing specweave-github...
# ✅ All plugins ready!
```

## Architecture Overview

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│ User Command: /specweave:increment "Add billing"           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 0: Plugin Validation (MANDATORY - NEW!)               │
│                                                             │
│ 1. Check marketplace (.claude/settings.json)               │
│ 2. Check core plugin (specweave)                           │
│ 3. Detect context plugins (keyword scanning)               │
│ 4. Auto-install missing components                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ (Only proceeds if validation passes)
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: PM Agent Planning (existing workflow)              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**1. TypeScript Validation Utility** (`src/utils/plugin-validator.ts`):
- Core validation logic
- Marketplace detection
- Plugin detection
- Context keyword mapping
- CLI-accessible
- Testable (unit tests)

**2. CLI Command** (`src/cli/commands/validate-plugins.ts`):
- Manual validation command
- `specweave validate-plugins [options]`
- Flags: `--auto-install`, `--context`, `--dry-run`

**3. Proactive Skill** (`plugins/specweave/skills/plugin-validator/SKILL.md`):
- Auto-activates when SpecWeave commands detected
- Calls TypeScript utility
- User-friendly prompts

**4. Command Integration** (ALL `plugins/specweave/commands/*.md`):
- STEP 0 validation added to EVERY command
- Non-blocking (can skip with warning)
- Consistent UX across all commands

## Validation Logic

### Phase 1: Marketplace Check

```typescript
// Check .claude/settings.json
interface MarketplaceConfig {
  extraKnownMarketplaces: {
    specweave?: {
      source: {
        source: "github";
        repo: "anton-abyzov/specweave";
        path: ".claude-plugin";
      }
    }
  }
}

// If missing:
// 1. Create .claude/settings.json
// 2. Add marketplace config
// 3. Notify user
```

### Phase 2: Core Plugin Check

```bash
# Check if specweave plugin installed
claude plugin list --installed | grep "specweave "

# If missing:
# 1. Run: /plugin marketplace add specweave
# 2. Run: /plugin install specweave
# 3. Verify installation
```

### Phase 3: Context Plugin Detection

```typescript
// Keyword mapping
const PLUGIN_KEYWORDS = {
  'specweave-github': ['github', 'git', 'issues', 'pull request', 'pr'],
  'specweave-jira': ['jira', 'epic', 'story', 'sprint'],
  'specweave-payments': ['stripe', 'billing', 'payment', 'subscription'],
  'specweave-frontend': ['react', 'nextjs', 'next.js', 'vue', 'angular'],
  'specweave-kubernetes': ['kubernetes', 'k8s', 'helm', 'pod', 'deployment'],
  // ... more mappings
};

// Scan increment description
function detectRequiredPlugins(description: string): string[] {
  const required: string[] = [];
  const lowerDesc = description.toLowerCase();

  for (const [plugin, keywords] of Object.entries(PLUGIN_KEYWORDS)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      required.push(plugin);
    }
  }

  return required;
}
```

### Phase 4: Installation

```typescript
interface InstallResult {
  success: boolean;
  component: string;
  error?: string;
}

async function installMarketplace(): Promise<InstallResult> {
  // Create .claude/settings.json with marketplace config
}

async function installPlugin(name: string): Promise<InstallResult> {
  // Run: /plugin install {name}
  // Verify installation
}
```

## Implementation Details

### File Structure

```
src/
├── utils/
│   └── plugin-validator.ts          (NEW - 500 lines)
├── cli/
│   └── commands/
│       └── validate-plugins.ts      (NEW - 200 lines)
└── hooks/
    └── lib/
        └── validate-plugins-hook.ts (NEW - 150 lines)

plugins/specweave/
├── skills/
│   └── plugin-validator/
│       └── SKILL.md                 (NEW - 200 lines)
└── commands/
    ├── specweave-increment.md       (UPDATED - add STEP 0)
    ├── specweave-do.md              (UPDATED - add STEP 0)
    ├── specweave-next.md            (UPDATED - add STEP 0)
    └── ... (22 commands total)

tests/
├── unit/
│   └── plugin-validator.test.ts    (NEW - 500 lines)
└── e2e/
    └── plugin-validation.spec.ts    (NEW - 300 lines)
```

### TypeScript Interfaces

```typescript
// src/utils/plugin-validator.ts

export interface PluginValidationResult {
  valid: boolean;
  missing: {
    marketplace: boolean;
    corePlugin: boolean;
    contextPlugins: string[];
  };
  installed: {
    corePlugin: boolean;
    contextPlugins: string[];
  };
  recommendations: string[];
  errors: string[];
}

export interface ValidationOptions {
  autoInstall: boolean;
  context?: string;  // Increment description for context detection
  dryRun?: boolean;
  verbose?: boolean;
}

export class PluginValidator {
  async validate(options: ValidationOptions): Promise<PluginValidationResult>;
  async installMarketplace(): Promise<InstallResult>;
  async installPlugin(name: string): Promise<InstallResult>;
  detectRequiredPlugins(description: string): string[];
  // ... more methods
}
```

## Testing Strategy

### Unit Tests (90%+ Coverage)

**Test Suite**: `tests/unit/plugin-validator.test.ts`

**Test Cases**:
1. Marketplace detection (exists/missing)
2. Core plugin detection (installed/missing)
3. Context keyword detection (all mappings)
4. Installation logic (success/failure)
5. Edge cases (corrupt config, network errors)

### Integration Tests

**Test Suite**: `tests/integration/plugin-validation.test.ts`

**Test Cases**:
1. Fresh environment simulation (Docker container)
2. Partial installation (marketplace exists, plugin missing)
3. Full installation flow (end-to-end)
4. CLI command integration

### E2E Tests (Playwright)

**Test Suite**: `tests/e2e/plugin-validation.spec.ts`

**Test Cases**:
1. `/specweave:increment` triggers validation
2. Auto-install flow (user accepts)
3. Skip flow (user declines)
4. Context detection (GitHub keywords → specweave-github suggested)

## Success Metrics

**Key Performance Indicators**:
- ✅ Zero manual plugin installations after this increment
- ✅ <5 seconds validation overhead per command
- ✅ 100% detection rate for context plugins (keyword accuracy)
- ✅ <1% false positives (wrong plugin suggestions)

**User Experience**:
- ✅ Clear progress messages (no silent failures)
- ✅ One-click installation (or auto-install)
- ✅ Works on all platforms (macOS/Linux/Windows)

## Migration Guide

### For Existing Users

**No action required!** Validation runs automatically on next command.

### For New Users

**Automatic!** First command triggers validation and installation.

### For CI/CD Pipelines

```bash
# Add to CI setup:
specweave validate-plugins --auto-install
# Ensures plugins ready before running workflows
```

## Documentation Updates

**Files to Update**:
1. `CLAUDE.md` - Add "Plugin Validation" section
2. `README.md` - Update "Getting Started" with validation info
3. `docs-site/docs/guides/environment-setup.md` - New guide
4. `.specweave/docs/internal/architecture/adr/` - ADR-0018: Plugin Validation Architecture

## Rollout Plan

**Phase 1** (v0.9.4):
- Core validation logic
- CLI command
- Integration into `/specweave:increment` only (pilot)

**Phase 2** (v0.9.5):
- Integration into ALL commands
- Proactive skill
- E2E tests

**Phase 3** (v0.10.0):
- Plugin version validation
- Offline mode support
- Performance optimizations

## Risk Assessment

**Risks**:
1. **Network failures** - Mitigation: Graceful degradation, offline detection
2. **Claude CLI unavailable** - Mitigation: Fall back to manual instructions
3. **Plugin installation errors** - Mitigation: Clear error messages, retry logic
4. **Performance overhead** - Mitigation: Cache validation results (5 min TTL)

## Dependencies

**Technical Dependencies**:
- Node.js 20+ (existing requirement)
- Claude Code CLI (assumption: available in environment)
- fs-extra (existing)
- chalk (existing)

**External Dependencies**:
- ✅ `.claude/settings.json` structure (stable API)
- ✅ `/plugin install` command (Claude native)
- ⚠️  Plugin marketplace availability (assume GitHub accessible)

## Timeline Estimate

**Total Effort**: 12-16 hours

| Task | Estimate |
|------|----------|
| TypeScript utilities | 4 hours |
| CLI command | 2 hours |
| Proactive skill | 2 hours |
| Command integration (22 files) | 3 hours |
| Unit tests | 2 hours |
| E2E tests | 2 hours |
| Documentation | 2 hours |
| Buffer | 3 hours |

## Open Questions

1. **Auto-install default**: Should validation ALWAYS auto-install (no prompt)?
   - **Proposed Answer**: Yes, auto-install by default with `--no-auto-install` flag to disable

2. **Marketplace source validation**: Should we warn if marketplace points to local (dev) instead of GitHub?
   - **Proposed Answer**: Yes, show warning: "Development mode detected (local marketplace)"

3. **Version validation**: Should we validate plugin versions?
   - **Proposed Answer**: Defer to Phase 3 (v0.10.0)

4. **Offline handling**: What if no internet connection?
   - **Proposed Answer**: Defer to Phase 3, show warning: "Offline mode - skipping validation"

## References

- **Architecture Decision**: ADR-0018 (to be created)
- **Related Increments**:
  - 0004: Plugin architecture
  - 0005: Cross-platform CLI
- **External Docs**: [Claude Code Plugin System](https://docs.claude.com/en/docs/claude-code/plugins)

---

**Specification Complete**
Ready for implementation: ✅
Estimated version: 0.9.4
Target completion: 2025-11-09
