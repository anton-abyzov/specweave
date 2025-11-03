# Claude Native Plugin Architecture - Complete Refactor

**Date**: 2025-11-02
**Increment**: 0004-plugin-architecture
**Status**: Design Complete, Ready for Implementation

---

## Executive Summary

This document outlines the complete architectural transformation of SpecWeave from a hybrid plugin system to a **Claude Code native-first** plugin architecture. This change aligns SpecWeave with Anthropic's official plugin standards while maintaining multi-tool support.

### Key Changes

1. **Root-level `.claude-plugin/` structure** (not in `src/`)
2. **Components at root level** (`skills/`, `agents/`, `commands/`, `hooks/`)
3. **Native marketplace loading** for Claude Code users
4. **Compilation/copying only for non-Claude tools**
5. **SpecWeave uses its own marketplace** (local references during development)

---

## Current vs. New Architecture

### Current Structure (v0.4.0 - Hybrid)

```
specweave/
├── src/                          # ❌ Wrong location (not Claude native)
│   ├── skills/                   # Should be at root
│   ├── agents/                   # Should be at root
│   ├── commands/                 # Should be at root
│   ├── hooks/                    # Should be at root
│   └── plugins/
│       └── specweave-github/
│           ├── .claude-plugin/
│           │   ├── plugin.json
│           │   └── manifest.json  # ❌ SpecWeave-specific (unnecessary)
│           ├── skills/
│           ├── agents/
│           └── commands/
│
├── .claude/                      # ❌ Installed copies (Claude doesn't need this)
│   ├── skills/                   # Copied from src/ (wasteful)
│   ├── agents/
│   └── commands/
```

**Problems**:
- ✗ Not Claude native (components in wrong location)
- ✗ Unnecessary copying for Claude Code users
- ✗ Dual manifests (plugin.json + manifest.json) create confusion
- ✗ `src/` implies build step (but plugins are ready-to-use)
- ✗ `.claude/` folder is redundant for Claude Code

---

### New Structure (v0.5.0 - Claude Native)

```
specweave/
├── .claude-plugin/
│   ├── plugin.json              # ✅ SpecWeave core plugin manifest
│   └── marketplace.json         # ✅ SpecWeave marketplace catalog
│
├── skills/                       # ✅ At root (Claude native)
│   ├── increment-planner/
│   │   ├── SKILL.md
│   │   └── test-cases/
│   ├── context-loader/
│   ├── rfc-generator/
│   └── ...                       # 8 core skills
│
├── agents/                       # ✅ At root (Claude native)
│   ├── pm/
│   │   └── AGENT.md
│   ├── architect/
│   └── tech-lead/                # 3 core agents
│
├── commands/                     # ✅ At root (Claude native)
│   ├── specweave.inc.md
│   ├── specweave.do.md
│   ├── specweave.next.md
│   └── ...                       # 7 core commands
│
├── hooks/                        # ✅ At root (Claude native)
│   ├── hooks.json               # ✅ Claude native hook config
│   └── post-task-completion.sh
│
├── plugins/                      # ✅ Additional plugins
│   ├── specweave-github/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json      # ✅ Single manifest (Claude native)
│   │   ├── skills/
│   │   │   ├── github-sync/
│   │   │   └── github-issue-tracker/
│   │   ├── agents/
│   │   │   └── github-manager/
│   │   └── commands/
│   │       ├── github-sync.md
│   │       └── ...
│   │
│   └── specweave-kubernetes/    # Future plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       ├── agents/
│       └── commands/
│
├── src/                          # ✅ Only TypeScript/build logic
│   ├── cli/                      # CLI commands (init, version)
│   ├── core/                     # Core framework logic
│   │   ├── plugin-loader.ts
│   │   ├── plugin-manager.ts
│   │   ├── plugin-detector.ts
│   │   └── config-manager.ts
│   ├── adapters/                 # Multi-tool support
│   │   ├── claude/               # Native loading (no copying!)
│   │   ├── cursor/               # Compile to AGENTS.md
│   │   ├── copilot/              # Compile to instructions.md
│   │   └── generic/              # Compile to SPECWEAVE-MANUAL.md
│   └── templates/                # User project templates
│
├── .specweave/                   # ✅ SpecWeave's own work
│   ├── increments/
│   ├── docs/
│   └── logs/
│
├── README.md
├── CLAUDE.md
└── package.json
```

**Benefits**:
- ✅ 100% Claude Code native (matches official docs)
- ✅ No copying for Claude users (native loading)
- ✅ Single manifest per plugin (plugin.json only)
- ✅ Clear separation: plugins at root, build logic in src/
- ✅ SpecWeave uses its own marketplace (dogfooding)

---

## Component Location Rules

### Root Level (Claude Native)

**Always at root**:
- `.claude-plugin/` - Plugin metadata + marketplace
- `skills/` - Core skills (8 skills)
- `agents/` - Core agents (3 agents)
- `commands/` - Core commands (7 commands)
- `hooks/` - Lifecycle hooks (1 hook + config)
- `plugins/` - Additional plugins (GitHub, Kubernetes, etc.)

### src/ (TypeScript/Build)

**Only TypeScript/build artifacts**:
- `src/cli/` - CLI commands (init, version)
- `src/core/` - Framework logic (loaders, managers)
- `src/adapters/` - Multi-tool adapters
- `src/templates/` - User project templates

### User Projects (After Installation)

**Claude Code users**:
```
user-project/
├── .specweave/                   # Only this! No .claude/
│   ├── increments/
│   ├── docs/
│   └── logs/
├── .claude-code/                 # Claude's native plugin storage
│   └── marketplaces/
│       └── specweave/            # Loaded from marketplace
└── CLAUDE.md                     # From template
```

**Other tool users** (Cursor, Copilot):
```
user-project/
├── .specweave/                   # SpecWeave work
├── .cursorrules                  # Compiled from marketplace
│   OR
├── .github/copilot/instructions.md
└── CLAUDE.md
```

---

## Marketplace Structure

### .claude-plugin/marketplace.json

```json
{
  "name": "specweave",
  "owner": {
    "name": "Anton Abyzov",
    "email": "anton@spec-weave.com"
  },
  "metadata": {
    "description": "SpecWeave - Spec-Driven Development Framework",
    "version": "0.5.0",
    "homepage": "https://spec-weave.com",
    "repository": "https://github.com/antonabyzov/specweave"
  },
  "plugins": [
    {
      "name": "specweave-core",
      "description": "SpecWeave core framework (increment lifecycle, living docs)",
      "source": "./",
      "version": "0.5.0",
      "author": {
        "name": "Anton Abyzov"
      },
      "keywords": ["spec-driven", "increments", "living-docs", "pm", "architect"]
    },
    {
      "name": "specweave-github",
      "description": "GitHub integration - bidirectional sync, issue tracking, task management",
      "source": "./plugins/specweave-github",
      "version": "1.0.0",
      "author": {
        "name": "Anton Abyzov"
      },
      "keywords": ["github", "sync", "issues", "tasks"]
    },
    {
      "name": "specweave-kubernetes",
      "description": "Kubernetes deployment and management",
      "source": "./plugins/specweave-kubernetes",
      "version": "1.0.0",
      "author": {
        "name": "Anton Abyzov"
      },
      "keywords": ["kubernetes", "k8s", "helm", "deployment"]
    }
  ]
}
```

### .claude-plugin/plugin.json (Core)

```json
{
  "name": "specweave-core",
  "description": "SpecWeave core framework for spec-driven development",
  "version": "0.5.0",
  "author": {
    "name": "Anton Abyzov",
    "email": "anton@spec-weave.com",
    "url": "https://spec-weave.com"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/antonabyzov/specweave"
  },
  "keywords": [
    "spec-driven",
    "increments",
    "living-docs",
    "architecture",
    "pm"
  ]
}
```

---

## Installation Flows

### Flow 1: Claude Code User (Native)

**Step 1: Add Marketplace**
```bash
/plugin marketplace add antonabyzov/specweave
```

**Step 2: Install Core**
```bash
/plugin install specweave-core@specweave
```

**Step 3: Install Plugins (Optional)**
```bash
/plugin install specweave-github@specweave
/plugin install specweave-kubernetes@specweave
```

**Result**:
- ✅ No file copying (native loading)
- ✅ Skills auto-activate based on context
- ✅ Commands available immediately: `/specweave:inc`, `/specweave:do`, etc.
- ✅ Hooks fire automatically on events
- ✅ Native `/plugin` commands work: `/plugin list`, `/plugin disable`, etc.

---

### Flow 2: Other Tools (Cursor, Copilot, Generic)

**Step 1: Install SpecWeave CLI**
```bash
npm install -g specweave
```

**Step 2: Initialize Project**
```bash
cd my-project
specweave init
```

**Detected Tool: Cursor**
```
✓ Detected: Cursor
✓ Creating .specweave/ structure
✓ Compiling plugins to .cursorrules
✓ Adding @specweave context shortcuts
✓ Creating cursor-team-commands.json
```

**Detected Tool: Copilot**
```
✓ Detected: GitHub Copilot
✓ Creating .specweave/ structure
✓ Compiling plugins to .github/copilot/instructions.md
✓ Creating workspace instructions
```

**Result**:
- ✅ Reads from `.claude-plugin/marketplace.json`
- ✅ Parses plugin structures (`skills/`, `agents/`, `commands/`)
- ✅ Compiles to tool-specific format
- ✅ Maintains multi-tool support

---

## Adapter Changes

### Claude Adapter (Native Loading)

**Before** (v0.4.0 - Copying):
```typescript
// src/adapters/claude/adapter.ts
async install() {
  // Copy from src/skills/ to .claude/skills/
  // Copy from src/agents/ to .claude/agents/
  // Copy from src/commands/ to .claude/commands/
}
```

**After** (v0.5.0 - Native):
```typescript
// src/adapters/claude/adapter.ts
async install() {
  // For Claude Code: DO NOTHING!
  // User adds marketplace: /plugin marketplace add antonabyzov/specweave
  // User installs: /plugin install specweave-core@specweave
  // Claude loads natively from marketplace

  console.log('Claude Code detected!');
  console.log('Add marketplace: /plugin marketplace add antonabyzov/specweave');
  console.log('Install core: /plugin install specweave-core@specweave');
  console.log('Install GitHub: /plugin install specweave-github@specweave');
}
```

---

### Cursor Adapter (Compilation)

**Before** (v0.4.0 - Copy from src/):
```typescript
async install() {
  // Read from src/skills/, src/agents/, src/commands/
  // Compile to .cursorrules + AGENTS.md
}
```

**After** (v0.5.0 - Parse marketplace):
```typescript
async install() {
  // 1. Read .claude-plugin/marketplace.json
  const marketplace = await this.readMarketplace();

  // 2. Parse plugin structures
  const core = await this.parsePlugin('./');  // Root = core
  const github = await this.parsePlugin('./plugins/specweave-github');

  // 3. Compile to Cursor format
  await this.compileToAgentsMd([core, github]);
  await this.compileToCursorRules([core, github]);

  // 4. Generate @context shortcuts
  await this.generateContextShortcuts([core, github]);
}
```

---

### Copilot Adapter (Compilation)

**Before** (v0.4.0 - Copy from src/):
```typescript
async install() {
  // Read from src/skills/, src/agents/, src/commands/
  // Compile to .github/copilot/instructions.md
}
```

**After** (v0.5.0 - Parse marketplace):
```typescript
async install() {
  // 1. Read .claude-plugin/marketplace.json
  const marketplace = await this.readMarketplace();

  // 2. Parse plugin structures
  const core = await this.parsePlugin('./');
  const github = await this.parsePlugin('./plugins/specweave-github');

  // 3. Compile to Copilot format
  await this.compileToInstructionsMd([core, github]);

  // 4. Generate workspace config
  await this.generateWorkspaceConfig([core, github]);
}
```

---

## GitHub References & Updates

### Question: When is GitHub referenced plugin updated?

**Answer**: Plugins from GitHub are **snapshots at install time**, not live references.

**Update Mechanism**:

1. **Marketplace metadata update**:
   ```bash
   /plugin marketplace update specweave
   ```
   - Fetches latest `marketplace.json` from GitHub
   - Shows new plugin versions available
   - Does NOT update installed plugins

2. **Plugin reinstall**:
   ```bash
   /plugin uninstall specweave-github@specweave
   /plugin install specweave-github@specweave
   ```
   - Fetches latest plugin version from source
   - Updates to new version

3. **Automatic update** (future):
   ```bash
   /plugin update specweave-github@specweave
   ```
   - Updates plugin to latest version
   - May be supported in future Claude Code versions

**Best Practices**:
- Version plugins semantically (1.0.0, 1.1.0, 2.0.0)
- Document breaking changes in CHANGELOG.md
- Use GitHub releases for stable versions
- Test plugins locally before pushing to GitHub

---

## SpecWeave Using Its Own Marketplace

### During Development (Local References)

**Add local marketplace**:
```bash
cd ~/Projects/github/specweave
/plugin marketplace add ./
```

**Install from local**:
```bash
/plugin install specweave-core@specweave
/plugin install specweave-github@specweave
```

**Benefits**:
- ✅ Real-time updates (no reinstall needed during development)
- ✅ Test changes immediately
- ✅ Dogfooding (we use what users use)

### For Contributors

**Setup**:
```bash
# 1. Clone SpecWeave
git clone https://github.com/antonabyzov/specweave.git
cd specweave

# 2. Add local marketplace
/plugin marketplace add ./

# 3. Install core + plugins
/plugin install specweave-core@specweave
/plugin install specweave-github@specweave

# 4. Start working
/specweave:inc "0005-new-feature"
```

**Workflow**:
```bash
# Edit skills/increment-planner/SKILL.md
vim skills/increment-planner/SKILL.md

# Changes reflected immediately (no reinstall!)
# Just restart Claude Code if needed

# Test
/specweave:inc "test feature"
```

---

## Migration Plan (v0.4.0 → v0.5.0)

### Phase 1: Restructure (Breaking Changes)

**Tasks**:
1. ✅ Create `.claude-plugin/` at root
2. ✅ Move `src/skills/` → `skills/`
3. ✅ Move `src/agents/` → `agents/`
4. ✅ Move `src/commands/` → `commands/`
5. ✅ Move `src/hooks/` → `hooks/`
6. ✅ Create `hooks/hooks.json` (Claude native hook config)
7. ✅ Update `plugins/specweave-github/` (remove manifest.json, keep plugin.json only)
8. ✅ Remove `.claude/` folder (not needed for Claude Code)

**File Movements**:
```bash
# Core components to root
mv src/skills skills
mv src/agents agents
mv src/commands commands
mv src/hooks hooks

# Create Claude native structure
mkdir -p .claude-plugin
mv src/plugins/specweave-github/.claude-plugin/plugin.json \
   plugins/specweave-github/.claude-plugin/plugin.json
rm src/plugins/specweave-github/.claude-plugin/manifest.json  # Remove SpecWeave-specific

# Clean up
rm -rf .claude/  # Not needed for Claude Code
rm -rf src/skills src/agents src/commands src/hooks
```

---

### Phase 2: Update Adapters

**Claude Adapter**:
```typescript
// Remove file copying logic
// Add marketplace instructions
async install() {
  console.log('Add marketplace: /plugin marketplace add antonabyzov/specweave');
  console.log('Install: /plugin install specweave-core@specweave');
}
```

**Cursor Adapter**:
```typescript
// Add marketplace parsing
async install() {
  const marketplace = await this.readMarketplace('.claude-plugin/marketplace.json');
  const plugins = await this.parsePlugins(marketplace);
  await this.compileToAgentsMd(plugins);
}
```

**Copilot Adapter**:
```typescript
// Add marketplace parsing
async install() {
  const marketplace = await this.readMarketplace('.claude-plugin/marketplace.json');
  const plugins = await this.parsePlugins(marketplace);
  await this.compileToInstructionsMd(plugins);
}
```

---

### Phase 3: Update Build & Scripts

**package.json**:
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:e2e": "playwright test",
    "install:all": "echo 'No longer needed! Use /plugin marketplace add ./'",
    "install:skills": "echo 'No longer needed!'",
    "install:agents": "echo 'No longer needed!'"
  }
}
```

**Remove obsolete scripts**:
- `bin/install-all.sh` (replaced by marketplace)
- `bin/install-skills.sh` (replaced by marketplace)
- `bin/install-agents.sh` (replaced by marketplace)

---

### Phase 4: Update Documentation

**CLAUDE.md**:
- Update architecture diagrams
- Remove references to `src/skills/`, `src/agents/`
- Add marketplace installation instructions
- Update contributor workflow

**README.md**:
- Update installation: `/plugin marketplace add antonabyzov/specweave`
- Remove NPM installation (for now, focus on Claude native)
- Add multi-tool support section

**ADRs**:
- Update ADR-0015 (Hybrid → Native)
- Create ADR-0016 (Claude Native Architecture)

---

## Testing Strategy

### Test 1: Claude Code Native Installation

```bash
# Clean environment
rm -rf ~/.claude-code/marketplaces/specweave

# Add marketplace
/plugin marketplace add antonabyzov/specweave

# Verify
/plugin marketplace list
# Should show: specweave (antonabyzov/specweave)

# Install core
/plugin install specweave-core@specweave

# Verify
/help
# Should show: /specweave:inc, /specweave:do, etc.

# Test skill activation
# Ask: "I want to plan a new increment for user authentication"
# Should activate increment-planner skill

# Install GitHub plugin
/plugin install specweave-github@specweave

# Verify
/help
# Should show: /github-sync, /github-create-issue, etc.
```

---

### Test 2: Cursor Compilation

```bash
# Install SpecWeave CLI (for non-Claude tools)
npm install -g specweave@0.5.0

# Initialize in Cursor project
cd my-cursor-project
specweave init

# Detected: Cursor
# Verify files created:
ls .cursorrules                          # Should exist
ls .cursorrules/AGENTS.md                # Should contain compiled agents
ls .cursorrules/cursor-team-commands.json # Should contain commands

# Test in Cursor
# Ask: "I want to plan a new increment for user authentication"
# Should follow SpecWeave workflow
```

---

### Test 3: Local Development (SpecWeave Using Itself)

```bash
cd ~/Projects/github/specweave

# Add local marketplace
/plugin marketplace add ./

# Install core
/plugin install specweave-core@specweave

# Edit a skill
vim skills/increment-planner/SKILL.md
# Make a change

# Test immediately (no reinstall!)
/specweave:inc "test feature"
# Should reflect changes

# Verify real-time updates
/help
# Should show updated commands
```

---

## Success Criteria

### Must Have
- ✅ Claude Code users can install via `/plugin marketplace add`
- ✅ Skills auto-activate based on context
- ✅ Commands available immediately after install
- ✅ Hooks fire automatically on events
- ✅ Multi-tool support maintained (Cursor, Copilot)
- ✅ SpecWeave uses its own marketplace (dogfooding)

### Nice to Have
- ✅ Backward compatibility warnings for v0.4.0 users
- ✅ Migration guide (v0.4.0 → v0.5.0)
- ✅ Automated tests for marketplace parsing
- ✅ CI/CD for marketplace validation

---

## Risks & Mitigations

### Risk 1: Breaking Changes for Existing Users

**Mitigation**:
- Clear migration guide in CHANGELOG.md
- Deprecation warnings in v0.4.x
- Maintain v0.4.x branch for critical fixes

### Risk 2: Marketplace GitHub References May Be Stale

**Mitigation**:
- Document update process clearly
- Add `/plugin marketplace update` reminders
- Version plugins semantically

### Risk 3: Multi-Tool Support May Break

**Mitigation**:
- Comprehensive adapter tests
- Test on all supported tools (Claude, Cursor, Copilot)
- Maintain test projects for each tool

---

## Timeline

### Week 1: Restructure
- Day 1-2: Move files to root level
- Day 3-4: Create marketplace.json
- Day 5: Test local marketplace loading

### Week 2: Adapters
- Day 1-2: Update Claude adapter (native loading)
- Day 3: Update Cursor adapter (marketplace parsing)
- Day 4: Update Copilot adapter (marketplace parsing)
- Day 5: Test all adapters

### Week 3: Documentation & Testing
- Day 1-2: Update CLAUDE.md, README.md
- Day 3: Create ADR-0016
- Day 4-5: E2E tests for all flows

### Week 4: Release
- Day 1: Beta release (0.5.0-beta.1)
- Day 2-3: Community testing
- Day 4: Final release (0.5.0)
- Day 5: Publish to NPM + GitHub marketplace

---

## Conclusion

This architectural transformation aligns SpecWeave with Claude Code's native plugin system while maintaining multi-tool support. The new structure is:

- ✅ **Simpler**: No dual manifests, no copying for Claude
- ✅ **Native**: 100% Claude Code compliant
- ✅ **Flexible**: Multi-tool support via compilation
- ✅ **Dogfooded**: SpecWeave uses its own marketplace
- ✅ **Future-proof**: Follows Anthropic's official standards

**Status**: Ready for implementation in Increment 0004!
