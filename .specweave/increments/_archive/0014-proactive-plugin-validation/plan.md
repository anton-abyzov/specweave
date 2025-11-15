# Implementation Plan: Proactive Plugin Validation System

**Increment**: 0014
**Version Target**: 0.9.4
**Architecture Approach**: Layered validation with graceful degradation

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Command Layer                          │
│  /specweave:increment, /specweave:do, /specweave:next, etc.   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Plugin Validation Layer (NEW!)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Marketplace Check                                    │  │
│  │     → .claude/settings.json exists?                      │  │
│  │     → specweave marketplace registered?                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                           │
│  ┌──────────────────▼──────────────────────────────────────┐  │
│  │  2. Core Plugin Check                                    │  │
│  │     → specweave installed?                               │  │
│  │     → Version compatible?                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                           │
│  ┌──────────────────▼──────────────────────────────────────┐  │
│  │  3. Context Detection                                    │  │
│  │     → Scan increment description for keywords            │  │
│  │     → Map keywords → required plugins                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                           │
│  ┌──────────────────▼──────────────────────────────────────┐  │
│  │  4. Installation (if needed)                             │  │
│  │     → Install marketplace                                │  │
│  │     → Install core plugin                                │  │
│  │     → Install context plugins                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼ (Only proceeds if validation passes)
┌─────────────────────────────────────────────────────────────────┐
│              Workflow Execution Layer                           │
│  PM Agent → Architect → Implementation → Tests                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Plugin Validation System
├── Core Library (src/utils/plugin-validator.ts)
│   ├── PluginValidator class
│   │   ├── validate()           - Main validation entry point
│   │   ├── checkMarketplace()   - Check .claude/settings.json
│   │   ├── checkCorePlugin()    - Check specweave installed
│   │   ├── detectContextPlugins() - Keyword scanning
│   │   ├── installMarketplace() - Create/update settings.json
│   │   └── installPlugin()      - Install via Claude CLI
│   ├── Keyword Mappings
│   │   └── PLUGIN_KEYWORDS     - Plugin → keyword mappings
│   └── Utilities
│       ├── execClaudeCommand() - Execute Claude CLI commands
│       └── parsePluginList()   - Parse /plugin list output
│
├── CLI Command (src/cli/commands/validate-plugins.ts)
│   └── Exposes: specweave validate-plugins [options]
│
├── Hook Integration (src/hooks/lib/validate-plugins-hook.ts)
│   └── Called by pre-tool-use hook
│
└── Skill (plugins/specweave/skills/plugin-validator/SKILL.md)
    └── Auto-activates when SpecWeave commands detected
```

---

## Implementation Phases

### Phase 1: Core Validation Logic (Priority: P0)

**Goal**: Build TypeScript validation engine

**Components**:
1. **Plugin Validator Class** (`src/utils/plugin-validator.ts`)
2. **Marketplace Detection** (check `.claude/settings.json`)
3. **Core Plugin Detection** (check `specweave` installed)
4. **Context Keyword Mapping** (scan for plugin keywords)

**Outputs**:
- ✅ `PluginValidator` class with validation logic
- ✅ Keyword mapping dictionary (15+ plugins)
- ✅ Error handling and graceful degradation

**Validation Flow**:

```typescript
class PluginValidator {
  async validate(options: ValidationOptions): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      missing: { marketplace: false, corePlugin: false, contextPlugins: [] },
      installed: { corePlugin: false, contextPlugins: [] },
      recommendations: [],
      errors: []
    };

    // Step 1: Check marketplace
    if (!await this.checkMarketplace()) {
      result.valid = false;
      result.missing.marketplace = true;
      result.recommendations.push("Install marketplace: create .claude/settings.json");
    }

    // Step 2: Check core plugin
    if (!await this.checkCorePlugin()) {
      result.valid = false;
      result.missing.corePlugin = true;
      result.recommendations.push("Install core plugin: /plugin install specweave");
    } else {
      result.installed.corePlugin = true;
    }

    // Step 3: Detect context plugins (if context provided)
    if (options.context) {
      const required = this.detectRequiredPlugins(options.context);
      for (const plugin of required) {
        if (!await this.checkPlugin(plugin)) {
          result.valid = false;
          result.missing.contextPlugins.push(plugin);
          result.recommendations.push(`Install context plugin: /plugin install ${plugin}`);
        } else {
          result.installed.contextPlugins.push(plugin);
        }
      }
    }

    return result;
  }
}
```

**Keyword Mapping Strategy**:

```typescript
// Plugin → Keywords mapping
export const PLUGIN_KEYWORDS: Record<string, string[]> = {
  'specweave-github': [
    'github', 'git', 'issues', 'pull request', 'pr', 'repository', 'commit'
  ],
  'specweave-jira': [
    'jira', 'epic', 'story', 'sprint', 'backlog', 'atlassian'
  ],
  'specweave-ado': [
    'azure devops', 'ado', 'azure', 'devops', 'work item'
  ],
  'specweave-payments': [
    'stripe', 'billing', 'payment', 'subscription', 'invoice', 'checkout'
  ],
  'specweave-frontend': [
    'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte', 'frontend', 'ui'
  ],
  'specweave-kubernetes': [
    'kubernetes', 'k8s', 'helm', 'pod', 'deployment', 'service mesh', 'kubectl'
  ],
  'specweave-ml': [
    'machine learning', 'ml', 'tensorflow', 'pytorch', 'model', 'training', 'dataset'
  ],
  // ... 15+ total mappings
};

// Scoring algorithm (multiple keyword matches increase confidence)
function detectRequiredPlugins(description: string): string[] {
  const scores: Record<string, number> = {};
  const lowerDesc = description.toLowerCase();

  for (const [plugin, keywords] of Object.entries(PLUGIN_KEYWORDS)) {
    scores[plugin] = keywords.filter(kw => lowerDesc.includes(kw)).length;
  }

  // Threshold: 2+ keyword matches = high confidence
  return Object.entries(scores)
    .filter(([_, score]) => score >= 2)
    .map(([plugin]) => plugin);
}
```

### Phase 2: Installation Logic (Priority: P0)

**Goal**: Auto-install missing components

**Components**:
1. **Marketplace Installation** (create `.claude/settings.json`)
2. **Plugin Installation** (via Claude CLI)
3. **Verification** (confirm installation succeeded)

**Implementation**:

```typescript
async installMarketplace(): Promise<InstallResult> {
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

    // Create .claude directory if needed
    await fs.ensureDir(path.dirname(settingsPath));

    // Read existing settings or create new
    let settings: any = {};
    if (await fs.pathExists(settingsPath)) {
      settings = await fs.readJson(settingsPath);
    }

    // Add SpecWeave marketplace
    settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
    settings.extraKnownMarketplaces.specweave = {
      source: {
        source: "github",
        repo: "anton-abyzov/specweave",
        path: ".claude-plugin"
      }
    };

    // Write settings
    await fs.writeJson(settingsPath, settings, { spaces: 2 });

    return { success: true, component: 'marketplace' };
  } catch (error) {
    return {
      success: false,
      component: 'marketplace',
      error: error.message
    };
  }
}

async installPlugin(name: string): Promise<InstallResult> {
  try {
    // Execute: /plugin install {name}
    // Note: This requires Claude CLI to be available
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Try to run plugin install command
    // NOTE: This assumes Claude Code CLI is available
    // In practice, we may need to guide user to run manually
    await execAsync(`claude plugin install ${name}`);

    return { success: true, component: name };
  } catch (error) {
    return {
      success: false,
      component: name,
      error: error.message
    };
  }
}
```

**Graceful Degradation**:

If auto-install fails (e.g., Claude CLI not available):

```typescript
// Fall back to manual instructions
if (!installResult.success) {
  console.log(`
❌ Auto-install failed. Please install manually:

1. Register marketplace:
   Edit ~/.claude/settings.json and add:
   {
     "extraKnownMarketplaces": {
       "specweave": {
         "source": {
           "source": "github",
           "repo": "anton-abyzov/specweave",
           "path": ".claude-plugin"
         }
       }
     }
   }

2. Install plugin:
   Run: /plugin install ${pluginName}

3. Restart Claude Code

Then re-run your command.
  `);
}
```

### Phase 3: CLI Command (Priority: P1)

**Goal**: Expose validation as CLI command

**Command**: `specweave validate-plugins [options]`

**Flags**:
- `--auto-install` - Auto-install missing components (default: false)
- `--context <description>` - Increment description for context detection
- `--dry-run` - Show what would be installed without installing
- `--verbose` - Show detailed validation steps

**Implementation** (`src/cli/commands/validate-plugins.ts`):

```typescript
import { Command } from 'commander';
import { PluginValidator } from '../../utils/plugin-validator.js';
import chalk from 'chalk';
import ora from 'ora';

export function setupValidatePluginsCommand(program: Command): void {
  program
    .command('validate-plugins')
    .description('Validate SpecWeave plugin installation')
    .option('--auto-install', 'Auto-install missing components', false)
    .option('--context <description>', 'Increment description for context detection')
    .option('--dry-run', 'Show what would be installed without installing', false)
    .option('--verbose', 'Show detailed validation steps', false)
    .action(async (options) => {
      const spinner = ora('Validating SpecWeave environment...').start();

      const validator = new PluginValidator();
      const result = await validator.validate({
        autoInstall: options.autoInstall,
        context: options.context,
        dryRun: options.dryRun,
        verbose: options.verbose
      });

      spinner.stop();

      // Display results
      if (result.valid) {
        console.log(chalk.green('✅ All plugins validated!'));
        if (result.installed.corePlugin) {
          console.log(chalk.gray('   • Core plugin: installed'));
        }
        if (result.installed.contextPlugins.length > 0) {
          console.log(chalk.gray(`   • Context plugins: ${result.installed.contextPlugins.join(', ')}`));
        }
      } else {
        console.log(chalk.red('❌ Missing components detected:'));
        if (result.missing.marketplace) {
          console.log(chalk.yellow('   • SpecWeave marketplace not registered'));
        }
        if (result.missing.corePlugin) {
          console.log(chalk.yellow('   • Core plugin (specweave) not installed'));
        }
        if (result.missing.contextPlugins.length > 0) {
          console.log(chalk.yellow(`   • Context plugins: ${result.missing.contextPlugins.join(', ')}`));
        }

        console.log('\n' + chalk.cyan('📦 Recommendations:'));
        result.recommendations.forEach(rec => {
          console.log(chalk.gray('   ' + rec));
        });

        process.exit(1);
      }
    });
}
```

### Phase 4: Command Integration (Priority: P0)

**Goal**: Add STEP 0 validation to ALL commands

**Files to Update**: 22 command files in `plugins/specweave/commands/`

**Template for STEP 0**:

```markdown
## STEP 0: Plugin Validation (MANDATORY - ALWAYS FIRST!)

🚨 **CRITICAL**: Before ANY planning or execution, validate plugin installation.

**Why This Matters**:
- Ensures SpecWeave marketplace is registered
- Ensures core plugin is installed
- Detects and installs context-specific plugins
- Prevents cryptic errors from missing plugins
- Enables seamless environment migration

**How to Validate**:

Use the Bash tool to run:
```bash
npx specweave validate-plugins --auto-install --context="$(cat <<'EOF'
[USER'S INCREMENT DESCRIPTION OR COMMAND CONTEXT]
EOF
)"
```

**Validation Output**:

If validation passes:
```
✅ All plugins validated!
   • Core plugin: installed
   • Context plugins: specweave-github (detected from "GitHub sync")
```

If validation fails:
```
❌ Missing components detected:
   • SpecWeave marketplace not registered
   • Core plugin (specweave) not installed
   • Context plugin (specweave-github) not installed

📦 Installing missing components...
   ✅ Marketplace registered
   ✅ Core plugin installed
   ✅ Context plugin installed

🎉 Environment ready! Proceeding...
```

**What to Do After Validation**:

1. ✅ **If validation passes**: Proceed to STEP 1
2. ⚠️ **If validation fails with errors**: Show errors and STOP
3. 🔄 **If auto-install succeeded**: Proceed to STEP 1
4. ⚠️ **If auto-install failed**: Show manual instructions and STOP

**Error Handling**:

If auto-install fails, show manual instructions:
```
❌ Auto-install failed. Please install manually:

1. Register marketplace:
   Edit ~/.claude/settings.json and add SpecWeave marketplace

2. Install core plugin:
   Run: /plugin install specweave

3. Restart Claude Code and re-run this command
```

**DO NOT PROCEED** to STEP 1 until validation passes!

---

## STEP 1: [Existing command logic...]
```

**Commands to Update**:
1. `specweave-increment.md` ✅ (highest priority)
2. `specweave-do.md` ✅
3. `specweave-next.md` ✅
4. `specweave-done.md`
5. `specweave-progress.md`
6. `specweave-validate.md`
7. `specweave-sync-docs.md`
8. `specweave-sync-tasks.md`
9. `specweave-pause.md`
10. `specweave-resume.md`
11. `specweave-abandon.md`
12. `specweave-check-tests.md`
13. `specweave-costs.md`
14. `specweave-translate.md`
15. `specweave-update-scope.md`
16. `specweave-status.md`
17. `specweave-qa.md`
18. `specweave-tdd-cycle.md`
19. `specweave-tdd-red.md`
20. `specweave-tdd-green.md`
21. `specweave-tdd-refactor.md`
22. `specweave.md` (master command)

### Phase 5: Proactive Skill (Priority: P2)

**Goal**: Auto-activate validation when SpecWeave commands detected

**Skill**: `plugins/specweave/skills/plugin-validator/SKILL.md`

**Activation Keywords**:
- `/specweave:*`
- "plugin validation"
- "environment setup"
- "missing plugin"

**Purpose**:
- Educate users about plugin validation
- Auto-trigger validation before workflows
- Handle edge cases (offline, errors)

### Phase 6: Testing (Priority: P0)

**Test Coverage Target**: 90%+

**Unit Tests** (`tests/unit/plugin-validator.test.ts`):
- Marketplace detection (exists/missing)
- Core plugin detection (installed/missing)
- Keyword mapping (all plugins)
- Installation logic (success/failure/errors)
- Edge cases (corrupt config, missing Claude CLI)

**Integration Tests** (`tests/integration/plugin-validation.test.ts`):
- CLI command execution
- Auto-install flow (end-to-end)
- Dry-run mode
- Verbose mode

**E2E Tests** (`tests/e2e/plugin-validation.spec.ts`):
- Command integration (`/specweave:increment` triggers validation)
- Context detection (keywords → plugins)
- User prompts and responses

---

## Data Structures

### Configuration Schema

```typescript
// .specweave/config.json
interface SpecWeaveConfig {
  pluginValidation?: {
    enabled: boolean;          // Default: true
    autoInstall: boolean;      // Default: true
    verbose: boolean;          // Default: false
    cacheValidation: boolean;  // Default: true (5 min TTL)
    cacheTTL: number;          // Default: 300 (seconds)
  }
}
```

### Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  timestamp: number;
  missing: {
    marketplace: boolean;
    corePlugin: boolean;
    contextPlugins: string[];
  };
  installed: {
    corePlugin: boolean;
    corePluginVersion?: string;
    contextPlugins: string[];
  };
  recommendations: string[];
  errors: string[];
  cache?: {
    hit: boolean;
    age: number;  // seconds
  };
}
```

---

## Performance Considerations

**Target Performance**:
- ✅ <2 seconds for cached validation (marketplace + core plugin check)
- ✅ <5 seconds for full validation (no cache)
- ✅ <30 seconds for auto-install (marketplace + 1 plugin)

**Optimization Strategies**:
1. **Cache validation results** (5 min TTL)
2. **Parallel checks** (marketplace + plugin checks concurrently)
3. **Skip validation** if config disables it
4. **Async installation** (don't block on progress updates)

**Caching Logic**:

```typescript
interface ValidationCache {
  timestamp: number;
  result: ValidationResult;
}

const CACHE_FILE = path.join(os.homedir(), '.specweave', 'validation-cache.json');
const CACHE_TTL = 300; // 5 minutes

async function getCachedValidation(): Promise<ValidationResult | null> {
  if (!await fs.pathExists(CACHE_FILE)) return null;

  const cache: ValidationCache = await fs.readJson(CACHE_FILE);
  const age = Date.now() - cache.timestamp;

  if (age > CACHE_TTL * 1000) return null;

  return { ...cache.result, cache: { hit: true, age: age / 1000 } };
}

async function setCachedValidation(result: ValidationResult): Promise<void> {
  const cache: ValidationCache = {
    timestamp: Date.now(),
    result
  };
  await fs.writeJson(CACHE_FILE, cache);
}
```

---

## Error Handling

**Error Categories**:
1. **Network Errors** - GitHub marketplace unreachable
2. **File System Errors** - Can't write `.claude/settings.json`
3. **CLI Errors** - Claude CLI not available
4. **Permission Errors** - Can't execute commands

**Handling Strategy**:

```typescript
try {
  const result = await validator.validate(options);
  // ... success path
} catch (error) {
  if (error.code === 'ENOENT') {
    // File system error
    console.error('Cannot access .claude directory. Check permissions.');
  } else if (error.code === 'ECONNREFUSED') {
    // Network error
    console.error('Cannot reach GitHub. Check internet connection.');
  } else if (error.message.includes('claude: command not found')) {
    // CLI error
    console.error('Claude CLI not available. Please install Claude Code.');
  } else {
    // Unknown error
    console.error(`Validation failed: ${error.message}`);
  }

  // Show manual instructions
  showManualInstructions();
  process.exit(1);
}
```

---

## Documentation Updates

**Files to Create/Update**:

1. **ADR-0018**: Plugin Validation Architecture
   - Location: `.specweave/docs/internal/architecture/adr/0018-plugin-validation.md`
   - Content: Architecture decisions, alternatives considered, trade-offs

2. **User Guide**: Environment Setup
   - Location: `docs-site/docs/guides/environment-setup.md`
   - Content: How validation works, troubleshooting, manual setup

3. **CLAUDE.md**: Plugin Validation Section
   - Add section: "Plugin Validation System"
   - Explain workflow, CLI command, configuration

4. **README.md**: Update "Getting Started"
   - Add note: "Plugin validation runs automatically on first command"

---

## Rollout Strategy

**Phase 1 (v0.9.4)**: Core Infrastructure
- TypeScript validation library
- CLI command
- Unit tests
- Integration into `/specweave:increment` ONLY (pilot)

**Phase 2 (v0.9.5)**: Full Integration
- Integration into ALL 22 commands
- E2E tests
- Proactive skill
- Documentation

**Phase 3 (v0.10.0)**: Enhancements
- Plugin version validation
- Offline mode support
- Performance optimizations
- Analytics (track plugin usage)

---

## Testing Plan

### Test Matrix

| Component | Unit | Integration | E2E | Coverage Target |
|-----------|------|-------------|-----|-----------------|
| PluginValidator class | ✅ | ✅ | - | 95% |
| CLI command | ✅ | ✅ | ✅ | 90% |
| Keyword detection | ✅ | - | - | 100% |
| Installation logic | ✅ | ✅ | - | 85% |
| Command integration | - | ✅ | ✅ | 90% |

### Test Scenarios

**Unit Tests**:
1. Marketplace detection (10 test cases)
2. Plugin detection (15 test cases)
3. Keyword mapping (20 test cases - all plugins)
4. Installation logic (10 test cases)
5. Error handling (15 test cases)

**Integration Tests**:
1. CLI command execution (5 test cases)
2. Auto-install flow (3 test cases)
3. Dry-run mode (2 test cases)
4. Cache behavior (3 test cases)

**E2E Tests**:
1. Fresh environment (Docker container)
2. Partial installation (marketplace exists)
3. Context detection (GitHub keywords)
4. Skip validation (user declines)
5. Auto-install success
6. Auto-install failure

---

## Implementation Checklist

**Phase 1: Core Library** (4 hours)
- [ ] Create `src/utils/plugin-validator.ts`
- [ ] Implement `PluginValidator` class
- [ ] Implement marketplace detection
- [ ] Implement plugin detection
- [ ] Implement keyword mapping (15+ plugins)
- [ ] Implement installation logic
- [ ] Add error handling
- [ ] Add caching logic

**Phase 2: CLI Command** (2 hours)
- [ ] Create `src/cli/commands/validate-plugins.ts`
- [ ] Implement command logic
- [ ] Add flags (`--auto-install`, `--context`, etc.)
- [ ] Add progress indicators (ora)
- [ ] Add colored output (chalk)

**Phase 3: Command Integration** (3 hours)
- [ ] Update `specweave-increment.md` (add STEP 0)
- [ ] Update `specweave-do.md` (add STEP 0)
- [ ] Update `specweave-next.md` (add STEP 0)
- [ ] Update remaining 19 commands (add STEP 0)

**Phase 4: Proactive Skill** (2 hours)
- [ ] Create `plugins/specweave/skills/plugin-validator/SKILL.md`
- [ ] Add activation keywords
- [ ] Add validation logic
- [ ] Add user guidance

**Phase 5: Tests** (4 hours)
- [ ] Create `tests/unit/plugin-validator.test.ts` (70 test cases)
- [ ] Create `tests/integration/plugin-validation.test.ts` (13 test cases)
- [ ] Create `tests/e2e/plugin-validation.spec.ts` (6 test cases)
- [ ] Verify 90%+ coverage

**Phase 6: Documentation** (2 hours)
- [ ] Create ADR-0018
- [ ] Update CLAUDE.md
- [ ] Update README.md
- [ ] Create user guide

**Phase 7: Testing & Refinement** (3 hours)
- [ ] Manual testing (fresh VM)
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Performance profiling
- [ ] Bug fixes

---

**Plan Complete**
Ready for task breakdown: ✅
