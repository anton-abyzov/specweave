---
increment: 0171-lazy-plugin-loading
title: "Implementation Plan - Lazy Plugin Loading"
phase: planning
created: 2026-01-18
---

# Implementation Plan: Lazy Plugin Loading

## Executive Summary

Implement a lazy loading architecture that reduces context usage by **99%** for non-SpecWeave work by:
1. Installing a lightweight router skill (~500 tokens) by default
2. Hot-reloading full plugins only when SpecWeave keywords are detected
3. Using context forking for heavy skills
4. Providing migration path for existing users

## Phase Overview

| Phase | Focus | Duration | Deliverables |
|-------|-------|----------|--------------|
| 1 | Router Skill & Detection | 2-3 days | Router skill, keyword detector |
| 2 | Cache & Hot-Reload | 2-3 days | Cache management, installation logic |
| 3 | Context Forking | 1-2 days | Convert heavy skills to forked context |
| 4 | Migration & Init | 1-2 days | Migration script, updated init flow |
| 5 | CLI Commands | 1-2 days | Load/unload commands, status |
| 6 | MCP Alternative (Stretch) | 2-3 days | Optional MCP server implementation |
| 7 | Testing & Docs | 2-3 days | Tests, documentation, analytics |
| 8 | Reliability & Cross-Platform | 1-2 days | Graceful degradation, Windows support |

**Total Estimated Duration**: 12-20 days

---

## Phase 1: Router Skill & Keyword Detection

### Objective
Create a minimal router skill that detects SpecWeave intent and triggers plugin loading.

### Technical Design

#### Router Skill Structure
```
~/.claude/skills/specweave-router/
├── SKILL.md (~80 lines, <500 tokens)
└── scripts/
    └── install-plugins.sh
```

#### SKILL.md Template
```yaml
---
name: specweave-router
description: |
  Lightweight router for SpecWeave framework. Detects when you need
  spec-driven development features and loads them on-demand.
  Activates for: increment, specweave, /sw:, spec.md, tasks.md,
  living docs, feature planning, sprint planning, acceptance criteria,
  user story, backlog, jira sync, github sync, ado sync, auto mode.
visibility: public
user-invocable: false
allowed-tools: Bash
---

# SpecWeave Router

When activated, I detect SpecWeave intent and load full plugins.

## Detection Logic

I activate when your prompt mentions:
- **Commands**: `/sw:`, `specweave`, `increment`
- **Files**: `spec.md`, `tasks.md`, `plan.md`
- **Concepts**: living docs, feature planning, sprint, backlog
- **Integrations**: jira sync, github sync, ado sync

## On Activation

1. Check if full plugins already loaded
2. If not, run installation script
3. Plugins hot-reload automatically (no restart needed)

## Installation Script

```bash
bash ~/.specweave/scripts/install-plugins.sh
```

This copies plugins from cache to ~/.claude/skills/ for hot-reload.
```

#### Keyword Detection Module
```typescript
// src/core/lazy-loading/keyword-detector.ts

export interface DetectionResult {
  detected: boolean;
  matchedKeywords: string[];
  confidence: number; // 0-1
  suggestedPlugins: string[];
}

export const SPECWEAVE_KEYWORDS = {
  // High confidence (definitely SpecWeave)
  high: [
    '/sw:', 'specweave', 'increment',
    'spec.md', 'tasks.md', 'plan.md', 'metadata.json',
    'living docs', 'living documentation'
  ],
  // Medium confidence (likely SpecWeave)
  medium: [
    'feature planning', 'sprint planning',
    'acceptance criteria', 'user story',
    'jira sync', 'github sync', 'ado sync',
    'auto mode', 'tdd mode', 'parallel auto'
  ],
  // Low confidence (might be SpecWeave)
  low: [
    'backlog', 'kanban', 'scrum',
    'spec', 'task', 'plan'
  ],
  // Negative patterns (definitely NOT SpecWeave)
  negative: [
    'openapi spec', 'api spec', 'test spec',
    'task runner', 'gulp task', 'npm task'
  ]
};

export function detectSpecWeaveIntent(prompt: string): DetectionResult {
  const normalized = prompt.toLowerCase();
  const matchedKeywords: string[] = [];
  let confidence = 0;

  // Check negative patterns first
  for (const neg of SPECWEAVE_KEYWORDS.negative) {
    if (normalized.includes(neg.toLowerCase())) {
      return { detected: false, matchedKeywords: [], confidence: 0, suggestedPlugins: [] };
    }
  }

  // Check high confidence keywords
  for (const kw of SPECWEAVE_KEYWORDS.high) {
    if (normalized.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      confidence = Math.max(confidence, 0.9);
    }
  }

  // Check medium confidence keywords
  for (const kw of SPECWEAVE_KEYWORDS.medium) {
    if (normalized.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      confidence = Math.max(confidence, 0.6);
    }
  }

  // Check low confidence keywords (only if no higher matches)
  if (matchedKeywords.length === 0) {
    for (const kw of SPECWEAVE_KEYWORDS.low) {
      if (normalized.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
        confidence = Math.max(confidence, 0.3);
      }
    }
  }

  // Determine which plugins to suggest
  const suggestedPlugins = determinePlugins(matchedKeywords);

  return {
    detected: confidence >= 0.3,
    matchedKeywords,
    confidence,
    suggestedPlugins
  };
}

function determinePlugins(keywords: string[]): string[] {
  const plugins = new Set<string>(['specweave']); // Always include core

  for (const kw of keywords) {
    if (kw.includes('jira')) plugins.add('specweave-jira');
    if (kw.includes('github')) plugins.add('specweave-github');
    if (kw.includes('ado') || kw.includes('azure')) plugins.add('specweave-ado');
    if (kw.includes('frontend')) plugins.add('specweave-frontend');
    if (kw.includes('backend')) plugins.add('specweave-backend');
    if (kw.includes('k8s') || kw.includes('kubernetes')) plugins.add('specweave-k8s');
    if (kw.includes('kafka')) plugins.add('specweave-kafka');
    if (kw.includes('ml') || kw.includes('machine learning')) plugins.add('specweave-ml');
  }

  return Array.from(plugins);
}
```

### Tasks
1. Create keyword detector module with tests
2. Create router skill SKILL.md template
3. Create installation shell script
4. Add router skill to marketplace
5. Test hot-reload activation

---

## Phase 2: Cache & Hot-Reload Management

### Objective
Implement plugin caching and hot-reload installation.

### Technical Design

#### Cache Structure
```
~/.specweave/
├── skills-cache/                    # Full plugin cache
│   ├── specweave/
│   │   ├── skills/
│   │   │   ├── increment-planner/
│   │   │   ├── architect/
│   │   │   └── ...
│   │   └── version.json
│   ├── specweave-github/
│   ├── specweave-jira/
│   └── ...
├── state/
│   └── plugins-loaded.json          # Current load state
└── scripts/
    ├── install-plugins.sh           # Main installer
    ├── install-plugin-group.sh      # Per-group installer
    └── unload-plugins.sh            # Cleanup script
```

#### Cache Manager
```typescript
// src/core/lazy-loading/cache-manager.ts

export interface CacheEntry {
  plugin: string;
  version: string;
  skillCount: number;
  cachedAt: string;
  size: number; // bytes
}

export interface CacheState {
  version: string;
  entries: CacheEntry[];
  totalSize: number;
  lastRefreshed: string;
}

export class PluginCacheManager {
  private cacheDir: string;
  private stateFile: string;

  constructor(baseDir: string = path.join(os.homedir(), '.specweave')) {
    this.cacheDir = path.join(baseDir, 'skills-cache');
    this.stateFile = path.join(baseDir, 'state', 'cache-state.json');
  }

  async populateCache(pluginsDir: string): Promise<void> {
    // Copy all plugins from source to cache
    // Called during refresh-marketplace
  }

  async installPlugins(plugins: string[]): Promise<InstallResult> {
    // Copy specific plugins from cache to ~/.claude/skills/
    // This triggers hot-reload
  }

  async isPluginLoaded(plugin: string): Promise<boolean> {
    // Check if plugin already in active skills dir
  }

  async getLoadedPlugins(): Promise<string[]> {
    // Return list of currently loaded plugins
  }

  async unloadPlugins(): Promise<void> {
    // Remove plugins from active dir (optional cleanup)
  }
}
```

#### Installation Script
```bash
#!/bin/bash
# ~/.specweave/scripts/install-plugins.sh

set -e

CACHE_DIR="$HOME/.specweave/skills-cache"
ACTIVE_DIR="$HOME/.claude/skills"
STATE_FILE="$HOME/.specweave/state/plugins-loaded.json"

# Parse arguments
PLUGINS="${1:-all}"

# Ensure directories exist
mkdir -p "$ACTIVE_DIR"
mkdir -p "$(dirname "$STATE_FILE")"

# Function to install a plugin
install_plugin() {
    local plugin="$1"
    local source="$CACHE_DIR/$plugin/skills"

    if [ -d "$source" ]; then
        echo "Installing $plugin..."
        cp -r "$source"/* "$ACTIVE_DIR/" 2>/dev/null || true
        return 0
    fi
    return 1
}

# Determine which plugins to install
if [ "$PLUGINS" = "all" ]; then
    PLUGIN_LIST=$(ls "$CACHE_DIR" 2>/dev/null || echo "")
else
    PLUGIN_LIST="$PLUGINS"
fi

# Install plugins
INSTALLED=()
for plugin in $PLUGIN_LIST; do
    if install_plugin "$plugin"; then
        INSTALLED+=("$plugin")
    fi
done

# Update state file
cat > "$STATE_FILE" << EOF
{
  "version": "1.0.0",
  "lazyMode": true,
  "loadedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "loadedPlugins": $(printf '%s\n' "${INSTALLED[@]}" | jq -R . | jq -s .),
  "installMethod": "hot-reload"
}
EOF

echo "Installed ${#INSTALLED[@]} plugins. Hot-reload should activate them."
```

### Background Loading Option

For large plugin sets or slow storage, use backgrounding:

```typescript
// src/core/lazy-loading/background-loader.ts

export async function installPluginsBackground(plugins: string[]): Promise<string> {
  // Returns task ID for background installation
  const taskId = `lazy-load-${Date.now()}`;

  // Start background process
  spawn('bash', [
    path.join(os.homedir(), '.specweave/scripts/install-plugins.sh'),
    plugins.join(' ')
  ], {
    detached: true,
    stdio: 'ignore'
  });

  return taskId;
}

export async function checkInstallStatus(taskId: string): Promise<InstallStatus> {
  // Check if background installation completed
}
```

### Tasks
1. Implement PluginCacheManager class
2. Create install-plugins.sh script
3. Update refresh-marketplace to populate cache
4. Implement background loading option
5. Add state file management
6. Test hot-reload behavior

---

## Phase 3: Context Forking for Heavy Skills

### Objective
Convert heavy skills (>200 lines) to use `context: fork` to reduce main context usage.

### Skills to Convert

| Skill | Current Lines | Action |
|-------|---------------|--------|
| increment-planner | ~400 | Already forked ✓ |
| architect | ~350 | Add `context: fork` |
| pm | ~300 | Add `context: fork` |
| qa-lead | ~280 | Add `context: fork` |
| tech-lead | ~260 | Add `context: fork` |
| security | ~250 | Add `context: fork` |
| docs-writer | ~240 | Add `context: fork` |
| brownfield-analyzer | ~230 | Add `context: fork` |
| tdd-orchestrator | ~220 | Add `context: fork` |
| infrastructure | ~210 | Add `context: fork` |
| performance | ~200 | Add `context: fork` |
| living-docs-navigator | ~200 | Add `context: fork` |

### Forking Strategy

```yaml
# Heavy skill frontmatter pattern
---
name: architect
description: System architecture design...
visibility: internal
invocableBy:
  - sw:increment
  - user prompt
context: fork           # NEW: Isolate in sub-agent
agent: Plan             # Use Plan agent type for architecture
model: opus             # Use powerful model for complex reasoning
---
```

### Agent Type Selection

| Skill Type | Agent Type | Reason |
|------------|------------|--------|
| Planning skills | `Plan` | Architecture planning |
| Analysis skills | `Explore` | Codebase exploration |
| Implementation skills | `general-purpose` | Full tool access |
| QA skills | `general-purpose` | Test execution |

### Tasks
1. Audit all skills for line count
2. Add context: fork to 12+ heavy skills
3. Choose appropriate agent types
4. Test forked skill behavior
5. Verify results return to main context

---

## Phase 4: Migration & Init Flow

### Objective
Provide seamless migration for existing users and updated init for new users.

### Migration Command

```bash
specweave migrate-lazy [--rollback] [--dry-run]
```

#### Migration Steps
1. **Backup** current ~/.claude/skills/ to ~/.specweave/backups/
2. **Populate cache** from marketplace
3. **Install router** skill only
4. **Update state** to lazy mode
5. **Verify** hot-reload works

```typescript
// src/cli/commands/migrate-lazy.ts

export async function migrateLazy(options: MigrateOptions): Promise<void> {
  const { rollback, dryRun } = options;

  if (rollback) {
    return performRollback();
  }

  console.log('🔄 Migrating to lazy loading mode...\n');

  // Step 1: Backup
  const backupDir = await backupCurrentSkills();
  console.log(`✅ Backed up current skills to ${backupDir}`);

  // Step 2: Populate cache
  await populateCache();
  console.log('✅ Populated skills cache');

  // Step 3: Clear active skills
  await clearActiveSkills();
  console.log('✅ Cleared active skills directory');

  // Step 4: Install router only
  await installRouterSkill();
  console.log('✅ Installed router skill');

  // Step 5: Update state
  await updateState({ lazyMode: true });
  console.log('✅ Updated state to lazy mode');

  console.log('\n🎉 Migration complete!');
  console.log('   Token savings: ~99% for non-SpecWeave work');
  console.log('   Rollback: specweave migrate-lazy --rollback');
}
```

### Updated Init Flow

```typescript
// src/cli/commands/init.ts (updated)

export async function init(options: InitOptions): Promise<void> {
  const { full, mcpMode } = options;

  // ... existing init logic ...

  if (full) {
    // Traditional full install
    await installAllPlugins();
    console.log('📦 Installed all plugins (full mode)');
  } else {
    // NEW: Default lazy loading
    await populateCache();
    await installRouterSkill();

    console.log('🚀 Initialized with lazy loading (default)');
    console.log('');
    console.log('   How it works:');
    console.log('   • Router skill installed (~500 tokens)');
    console.log('   • Full plugins cached for on-demand loading');
    console.log('   • Mention SpecWeave keywords → plugins auto-load');
    console.log('');
    console.log('   Keywords that trigger loading:');
    console.log('   • /sw:, specweave, increment');
    console.log('   • spec.md, tasks.md, living docs');
    console.log('   • jira sync, github sync, auto mode');
    console.log('');
    console.log('   For traditional full install: specweave init --full');
  }
}
```

### Tasks
1. Implement migrate-lazy command
2. Add backup/rollback functionality
3. Update init command with lazy default
4. Add --full flag for traditional install
5. Update user documentation
6. Test migration end-to-end

---

## Phase 5: CLI Commands

### Objective
Provide manual load/unload commands for power users.

### New Commands

```bash
# Load specific plugin groups
specweave load-plugins core          # Core SpecWeave
specweave load-plugins github        # GitHub integration
specweave load-plugins jira          # JIRA integration
specweave load-plugins all           # All plugins

# Unload plugins (cleanup)
specweave unload-plugins             # Remove all loaded plugins
specweave unload-plugins github      # Remove specific group

# Status
specweave plugin-status              # Show loaded vs cached

# Analytics
specweave analytics --lazy-loading   # Show token savings stats
```

### Plugin Groups

| Group | Plugins Included |
|-------|------------------|
| `core` | specweave |
| `github` | specweave-github |
| `jira` | specweave-jira |
| `ado` | specweave-ado |
| `frontend` | specweave-frontend |
| `backend` | specweave-backend |
| `infra` | specweave-infrastructure, specweave-k8s |
| `ml` | specweave-ml |
| `all` | All 24 plugins |

### Tasks
1. Implement load-plugins command
2. Implement unload-plugins command
3. Implement plugin-status command
4. Add analytics command extension
5. Add shell completions

---

## Phase 6: MCP Alternative (Optional)

### Objective
Provide MCP-based dynamic tool loading as an alternative.

### MCP Server Design

```typescript
// src/mcp/specweave-mcp-server.ts

import { Server } from "@modelcontextprotocol/sdk/server";

export class SpecWeaveMCPServer {
  private server: Server;
  private loadedTools: Map<string, Tool> = new Map();

  async handlePrompt(prompt: string): Promise<void> {
    const detection = detectSpecWeaveIntent(prompt);

    if (detection.detected && !this.toolsLoaded) {
      await this.loadSpecWeaveTools(detection.suggestedPlugins);

      // Notify Claude Code that tools changed
      await this.server.notification({
        method: "notifications/tools/list_changed"
      });
    }
  }

  async loadSpecWeaveTools(plugins: string[]): Promise<void> {
    // Dynamically expose SpecWeave tools based on detection
  }
}
```

### Configuration

```json
// .specweave/config.json
{
  "lazyLoading": {
    "mode": "mcp",  // "router" (default) or "mcp"
    "autoThreshold": 10,  // % of context before auto-defer
    "preloadPlugins": ["core"]
  }
}
```

### Tasks
1. Create specweave-mcp-server package
2. Implement list_changed notifications
3. Add MCPSearch integration
4. Document MCP vs router trade-offs
5. Add init --mcp-mode flag

---

## Phase 7: Testing & Documentation

### Test Plan

#### Unit Tests
- Keyword detector accuracy
- Cache manager operations
- State file management
- Migration logic

#### Integration Tests
- Hot-reload activation
- Plugin installation end-to-end
- Migration with rollback
- Background loading

#### E2E Tests
- Full user flow: init → use → lazy load
- Migration from existing install
- Multi-plugin group loading

### Documentation Updates

1. **README.md**: Add lazy loading section
2. **CLAUDE.md**: Update with lazy loading info
3. **Website**: New page for lazy loading
4. **Migration guide**: Step-by-step for existing users

### Tasks
1. Write unit tests for keyword detector
2. Write unit tests for cache manager
3. Write integration tests for hot-reload
4. Write E2E tests for full flow
5. Update documentation
6. Add analytics tracking

---

## Implementation Order

```
Week 1:
├── Phase 1: Router Skill (T-001 to T-005)
└── Phase 2: Cache Management (T-006 to T-011)

Week 2:
├── Phase 3: Context Forking (T-012 to T-016)
└── Phase 4: Migration & Init (T-017 to T-022)

Week 3:
├── Phase 5: CLI Commands (T-023 to T-027)
├── Phase 8: Reliability & Cross-Platform (T-041 to T-046)
└── Phase 7: Testing & Docs (T-033 to T-040)

Week 4 (Stretch):
└── Phase 6: MCP Alternative (T-028 to T-032) - Optional
```

**Note**: Phase 6 (MCP Alternative) is a STRETCH GOAL. The router skill approach
(Phases 1-5, 7-8) provides full lazy loading functionality. MCP mode is an
advanced alternative for users who prefer MCP-based tool management.

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token reduction (non-SW) | >95% | Before/after comparison |
| Load latency | <2s | Timing measurement |
| Hot-reload success rate | >99% | Test runs |
| Migration success rate | 100% | Test migrations |
| Test coverage | >80% | Coverage report |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Hot-reload doesn't work | Verify Claude Code version, add restart fallback |
| Cache corruption | Version tracking, integrity checks |
| Migration data loss | Mandatory backup, rollback command |
| Keyword false positives | Negative patterns, confidence thresholds |
| User confusion | Clear status messages, documentation |
