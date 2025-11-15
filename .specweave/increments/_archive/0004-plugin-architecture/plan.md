# Technical Plan: Plugin Architecture

**Increment**: 0004-plugin-architecture
**Status**: Planning
**Created**: 2025-10-31

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     SpecWeave Framework                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────────┐                │
│  │  Core        │      │  Plugin System   │                │
│  │              │      │                  │                │
│  │ - increment- │      │ - PluginManager  │                │
│  │   planner    │◄─────┤ - PluginDetector │                │
│  │ - sync-docs  │      │ - PluginLoader   │                │
│  │ - PM agent   │      │ - PluginCompiler │                │
│  │ - Architect  │      └─────────┬────────┘                │
│  └──────────────┘                │                          │
│                                  │                          │
│  ┌───────────────────────────────┼─────────────────────┐   │
│  │         Adapter Layer         │                     │   │
│  ├───────────────────────────────┼─────────────────────┤   │
│  │                               │                     │   │
│  │  ┌──────────┐  ┌─────────┐  ┌┴────────┐  ┌──────┐ │   │
│  │  │  Claude  │  │ Cursor  │  │ Copilot │  │Generic│ │   │
│  │  │ Installer│  │Compiler │  │Compiler │  │Manual │ │   │
│  │  │          │  │         │  │         │  │       │ │   │
│  │  │ Native   │  │AGENTS.md│  │instruct.│  │Copy-  │ │   │
│  │  │ .claude/ │  │+ Team   │  │md       │  │paste  │ │   │
│  │  │          │  │Commands │  │         │  │       │ │   │
│  │  └────┬─────┘  └────┬────┘  └────┬────┘  └───┬──┘ │   │
│  └───────┼─────────────┼────────────┼───────────┼────┘   │
│          │             │            │           │        │
└──────────┼─────────────┼────────────┼───────────┼────────┘
           │             │            │           │
           ▼             ▼            ▼           ▼
    ┌────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
    │  .claude/  │ │ AGENTS.md│ │.github/ │ │SPECWEAVE-│
    │  skills/   │ │          │ │copilot/ │ │ MANUAL   │
    │  agents/   │ │@ context │ │instr.md │ │          │
    │  commands/ │ │team cmd  │ │         │ │          │
    └────────────┘ └──────────┘ └─────────┘ └──────────┘

           ▲             ▲            ▲           ▲
           │             │            │           │
    ┌──────┴─────────────┴────────────┴───────────┴──────┐
    │                    Plugins                          │
    ├──────────────────────────────────────────────────────┤
    │  kubernetes | ml-ops | frontend | payment-processing│
    │  observability | e2e-testing | figma | security     │
    └──────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Plugin Manager (Core)

**Location**: `src/core/plugin-manager.ts`

**Responsibilities**:
- Load/unload plugins
- Validate plugin manifests
- Manage plugin lifecycle
- Track enabled plugins in config

**API**:
```typescript
class PluginManager {
  // Load plugin by name
  async loadPlugin(name: string, adapter: IAdapter): Promise<void>

  // Unload plugin
  async unloadPlugin(name: string, adapter: IAdapter): Promise<void>

  // Get all available plugins
  async getAvailablePlugins(): Promise<PluginInfo[]>

  // Get enabled plugins
  async getEnabledPlugins(): Promise<string[]>

  // Validate plugin manifest
  validateManifest(manifest: PluginManifest): ValidationResult

  // Check plugin dependencies
  async resolveDependencies(plugin: Plugin): Promise<Plugin[]>
}
```

### 2. Plugin Detector

**Location**: `src/core/plugin-detector.ts`

**Responsibilities**:
- Scan project structure for plugin hints
- Analyze package.json dependencies
- Check environment variables
- Analyze increment specs for keywords

**API**:
```typescript
class PluginDetector {
  // Detect from project structure (init time)
  async detectFromProject(projectPath: string): Promise<string[]>

  // Detect from increment spec (first increment)
  async detectFromSpec(specContent: string): Promise<string[]>

  // Detect from task description (pre-task)
  async detectFromTask(taskContent: string): Promise<string[]>

  // Detect from git diff (post-increment)
  async detectFromChanges(diff: string): Promise<string[]>
}
```

### 3. Plugin Loader

**Location**: `src/core/plugin-loader.ts`

**Responsibilities**:
- Read plugin directory structure
- Parse manifest.json
- Load skills, agents, commands
- Handle plugin errors gracefully

**API**:
```typescript
class PluginLoader {
  // Load plugin from directory
  async loadFromDirectory(pluginPath: string): Promise<Plugin>

  // Load plugin manifest
  async loadManifest(pluginPath: string): Promise<PluginManifest>

  // Verify plugin integrity
  async verifyPlugin(plugin: Plugin): Promise<boolean>

  // Get plugin metadata
  getMetadata(plugin: Plugin): PluginMetadata
}
```

### 4. Adapter Plugin Compilers

**Location**: `src/adapters/{adapter}/plugin-compiler.ts`

**Responsibilities**:
- Compile plugins to adapter-specific formats
- Generate adapter-specific files
- Manage adapter-specific plugin lifecycle

**Claude Adapter** (Native):
```typescript
class ClaudePluginInstaller {
  async installPlugin(plugin: Plugin, projectPath: string): Promise<void> {
    // Copy natively to .claude/
    await this.copySkills(plugin.skills, '.claude/skills/');
    await this.copyAgents(plugin.agents, '.claude/agents/');
    await this.copyCommands(plugin.commands, '.claude/commands/');
  }
}
```

**Cursor Adapter** (Compiled):
```typescript
class CursorPluginCompiler {
  async compilePlugin(plugin: Plugin, projectPath: string): Promise<void> {
    // Append to AGENTS.md
    const agentsSection = this.generateAGENTSmdSection(plugin);
    await this.appendToFile('AGENTS.md', agentsSection);

    // Generate team commands
    const teamCommands = this.generateTeamCommands(plugin);
    await this.writeJSON('cursor-team-commands.json', teamCommands);

    // Create @ context shortcuts
    await this.createContextShortcuts(plugin);
  }

  private generateAGENTSmdSection(plugin: Plugin): string {
    // Convert plugin skills/agents to AGENTS.md format
  }

  private generateTeamCommands(plugin: Plugin): object {
    // Convert slash commands to Cursor team commands
  }
}
```

**Copilot Adapter** (Compiled):
```typescript
class CopilotPluginCompiler {
  async compilePlugin(plugin: Plugin, projectPath: string): Promise<void> {
    // Append to .github/copilot/instructions.md
    const instructions = this.generateInstructions(plugin);
    await this.appendToFile('.github/copilot/instructions.md', instructions);
  }

  private generateInstructions(plugin: Plugin): string {
    // Convert plugin to natural language instructions
  }
}
```

**Generic Adapter** (Manual):
```typescript
class GenericPluginCompiler {
  async compilePlugin(plugin: Plugin, projectPath: string): Promise<void> {
    // Append to SPECWEAVE-MANUAL.md
    const manual = this.generateManual(plugin);
    await this.appendToFile('SPECWEAVE-MANUAL.md', manual);
  }

  private generateManual(plugin: Plugin): string {
    // Generate copy-paste manual section
  }
}
```

### 5. CLI Plugin Command

**Location**: `src/cli/commands/plugin.ts`

**Commands**:
```bash
specweave plugin list              # List all plugins
specweave plugin enable <name>     # Enable a plugin
specweave plugin disable <name>    # Disable a plugin
specweave plugin info <name>       # Show plugin details
specweave plugin search <keyword>  # Search marketplace
```

**Implementation**:
```typescript
import { Command } from 'commander';

export function createPluginCommand(): Command {
  const plugin = new Command('plugin')
    .description('Manage SpecWeave plugins');

  plugin
    .command('list')
    .description('List all available and enabled plugins')
    .action(async () => {
      const manager = new PluginManager();
      const available = await manager.getAvailablePlugins();
      const enabled = await manager.getEnabledPlugins();

      console.log('\n📦 CORE (Always Loaded)');
      // Show core skills/agents

      console.log('\n📦 ENABLED PLUGINS');
      // Show enabled plugins

      console.log('\n📦 AVAILABLE PLUGINS');
      // Show available but not enabled
    });

  plugin
    .command('enable <name>')
    .description('Enable a plugin')
    .action(async (name: string) => {
      const manager = new PluginManager();
      const adapter = await detectAdapter();

      await manager.loadPlugin(name, adapter);
      console.log(`✨ Plugin '${name}' enabled!`);
    });

  plugin
    .command('disable <name>')
    .description('Disable a plugin')
    .action(async (name: string) => {
      const manager = new PluginManager();
      const adapter = await detectAdapter();

      await manager.unloadPlugin(name, adapter);
      console.log(`Plugin '${name}' disabled.`);
    });

  plugin
    .command('info <name>')
    .description('Show plugin information')
    .action(async (name: string) => {
      const loader = new PluginLoader();
      const plugin = await loader.loadFromDirectory(`src/plugins/${name}`);

      console.log(`\n📦 ${plugin.manifest.name}`);
      console.log(`Version: ${plugin.manifest.version}`);
      console.log(`Description: ${plugin.manifest.description}`);
      console.log(`\nProvides:`);
      console.log(`  - ${plugin.manifest.provides.skills.length} skills`);
      console.log(`  - ${plugin.manifest.provides.agents.length} agents`);
      console.log(`  - ${plugin.manifest.provides.commands.length} commands`);
    });

  return plugin;
}
```

### 6. Hooks for Plugin Detection

**Pre-Task Hook** (`src/hooks/pre-task-execution.sh`):
```bash
#!/bin/bash
# Check if current task needs plugins that aren't loaded

TASK_FILE=".specweave/increments/current/tasks.md"
CURRENT_TASK=$(grep -A10 "status: in_progress" "$TASK_FILE")

# Kubernetes detection
if echo "$CURRENT_TASK" | grep -qiE "kubernetes|kubectl|helm|k8s"; then
  if ! specweave plugin list --enabled | grep -q "kubernetes"; then
    echo ""
    echo "💡 This task mentions Kubernetes. Enable kubernetes plugin?"
    echo "   specweave plugin enable kubernetes"
    echo ""
  fi
fi

# Figma detection
if echo "$CURRENT_TASK" | grep -qiE "figma|design.*system|mockup"; then
  if ! specweave plugin list --enabled | grep -q "figma-ecosystem"; then
    echo ""
    echo "💡 This task involves design work. Enable figma-ecosystem plugin?"
    echo "   specweave plugin enable figma-ecosystem"
    echo ""
  fi
fi

# ML detection
if echo "$CURRENT_TASK" | grep -qiE "model|training|prediction|tensorflow|pytorch"; then
  if ! specweave plugin list --enabled | grep -q "ml-ops"; then
    echo ""
    echo "💡 This task involves machine learning. Enable ml-ops plugin?"
    echo "   specweave plugin enable ml-ops"
    echo ""
  fi
fi
```

**Post-Increment Hook** (`src/hooks/post-increment-completion.sh`):
```bash
#!/bin/bash
# Discover new dependencies added during development

echo ""
echo "🔍 Scanning for new dependencies..."

# Check package.json changes
if git diff HEAD~1 HEAD package.json | grep -q "@stripe"; then
  if ! specweave plugin list --enabled | grep -q "payment-processing"; then
    echo "💡 Detected Stripe dependency. Consider enabling 'payment-processing' plugin."
    echo "   specweave plugin enable payment-processing"
  fi
fi

# Check for new kubernetes files
if [[ -d "kubernetes/" ]] || [[ -d "k8s/" ]]; then
  if ! specweave plugin list --enabled | grep -q "kubernetes"; then
    echo "💡 Detected Kubernetes files. Consider enabling 'kubernetes' plugin."
    echo "   specweave plugin enable kubernetes"
  fi
fi

# Check for Figma integration
if [[ -f "figma.json" ]] || [[ -d ".figma/" ]]; then
  if ! specweave plugin list --enabled | grep -q "figma-ecosystem"; then
    echo "💡 Detected Figma integration. Consider enabling 'figma-ecosystem' plugin."
    echo "   specweave plugin enable figma-ecosystem"
  fi
fi

echo ""
```

---

## Data Models

### Plugin Manifest

```typescript
interface PluginManifest {
  name: string;                    // e.g., "specweave-kubernetes"
  version: string;                 // e.g., "1.0.0"
  description: string;             // Max 1024 chars
  author?: string;
  license?: string;                // e.g., "MIT"
  specweave_core_version: string;  // e.g., ">=0.4.0"

  dependencies?: {
    plugins?: string[];            // Required plugins
  };

  auto_detect?: {
    files?: string[];              // File patterns (e.g., "kubernetes/")
    packages?: string[];           // NPM packages (e.g., "@stripe/stripe-js")
    env_vars?: string[];           // Environment variables (e.g., "KUBECONFIG")
  };

  provides: {
    skills: string[];              // Skill names
    agents: string[];              // Agent names
    commands: string[];            // Command names
  };

  triggers?: string[];             // Keywords for spec detection

  credits?: {
    based_on?: string | null;      // Upstream URL
    original_author?: string;
    contributors?: string[];
  };
}
```

### Plugin Structure

```typescript
interface Plugin {
  manifest: PluginManifest;
  path: string;                    // Path to plugin directory
  skills: Skill[];
  agents: Agent[];
  commands: Command[];
}

interface Skill {
  name: string;
  path: string;                    // Path to SKILL.md
  description: string;
  testCases: TestCase[];
}

interface Agent {
  name: string;
  path: string;                    // Path to AGENT.md
  systemPrompt: string;
  capabilities: string[];
}

interface Command {
  name: string;
  path: string;                    // Path to command.md
  description: string;
  prompt: string;
}
```

### Config Schema

```yaml
# .specweave/config.yaml
version: 1.0

# Detected tool
tool: claude

# Core framework version
core_version: 0.4.0

# Enabled plugins
plugins:
  enabled:
    - frontend-stack
    - e2e-testing
    - payment-processing

  # Plugin-specific settings
  settings:
    kubernetes:
      default_namespace: default
      kubeconfig_path: ~/.kube/config

    observability:
      prometheus_url: http://localhost:9090
      grafana_url: http://localhost:3000
```

---

## Directory Structure Changes

### Before (v0.3.7)

```
src/
├── skills/                  # 44 skills (ALL in core)
│   ├── increment-planner/
│   ├── k8s-deployer/        # Should be plugin!
│   ├── figma-designer/      # Should be plugin!
│   └── ...
├── agents/                  # 20 agents (ALL in core)
│   ├── pm/
│   ├── devops/              # Should be plugin!
│   └── ...
└── commands/                # 18 commands (ALL in core)
```

### After (v0.4.0)

```
src/
├── core/                    # Core framework (always loaded)
│   ├── skills/
│   │   ├── increment-planner/
│   │   ├── context-loader/
│   │   ├── increment-quality-judge/
│   │   └── project-kickstarter/
│   ├── agents/
│   │   ├── pm/
│   │   ├── architect/
│   │   └── tech-lead/
│   ├── commands/
│   │   ├── specweave.inc.md
│   │   ├── specweave.do.md
│   │   ├── sync-docs.md
│   │   └── ...
│   ├── plugin-manager.ts    # NEW
│   ├── plugin-detector.ts   # NEW
│   └── plugin-loader.ts     # NEW
│
├── plugins/                 # Optional domain-specific
│   ├── kubernetes/
│   │   ├── .claude-plugin/
│   │   │   └── manifest.json
│   │   ├── skills/
│   │   │   ├── k8s-deployer/
│   │   │   ├── helm-manager/
│   │   │   └── k8s-troubleshooter/
│   │   ├── agents/
│   │   │   └── devops/
│   │   ├── commands/
│   │   │   └── k8s-deploy.md
│   │   └── README.md
│   │
│   ├── frontend-stack/
│   ├── ml-ops/
│   ├── observability/
│   ├── payment-processing/
│   ├── e2e-testing/
│   ├── figma-ecosystem/
│   └── security/
│
├── adapters/
│   ├── adapter-interface.ts    # Updated for plugins
│   ├── plugin-compiler.ts      # NEW
│   ├── claude/
│   │   └── plugin-installer.ts # NEW
│   ├── cursor/
│   │   └── plugin-compiler.ts  # NEW
│   ├── copilot/
│   │   └── plugin-compiler.ts  # NEW
│   └── generic/
│       └── plugin-compiler.ts  # NEW
│
├── cli/
│   └── commands/
│       └── plugin.ts           # NEW
│
└── hooks/
    ├── pre-task-execution.sh       # Updated
    └── post-increment-completion.sh # Updated
```

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

**Goal**: Core plugin infrastructure

**Tasks**:
1. Create `src/core/plugin-manager.ts`
2. Create `src/core/plugin-detector.ts`
3. Create `src/core/plugin-loader.ts`
4. Define TypeScript interfaces
5. Create plugin manifest JSON schema
6. Update `.gitignore` for plugins

**Deliverables**:
- Plugin manager can load/validate manifests
- Plugin detector can scan projects
- TypeScript types defined
- Unit tests for core components

### Phase 2: CLI & Config (Week 1)

**Goal**: User-facing plugin commands

**Tasks**:
1. Create `src/cli/commands/plugin.ts`
2. Implement `specweave plugin list`
3. Implement `specweave plugin enable <name>`
4. Implement `specweave plugin disable <name>`
5. Implement `specweave plugin info <name>`
6. Update `.specweave/config.yaml` schema

**Deliverables**:
- CLI commands work locally
- Config persists enabled plugins
- User can manage plugins manually

### Phase 3: Adapter Integration (Week 2)

**Goal**: Multi-tool plugin support

**Tasks**:
1. Update `src/adapters/adapter-interface.ts`
2. Implement `src/adapters/claude/plugin-installer.ts`
3. Implement `src/adapters/cursor/plugin-compiler.ts`
4. Implement `src/adapters/copilot/plugin-compiler.ts`
5. Implement `src/adapters/generic/plugin-compiler.ts`

**Deliverables**:
- Claude: Native installation works
- Cursor: AGENTS.md + team commands generated
- Copilot: instructions.md updated
- Generic: Manual generated

### Phase 4: Auto-Detection (Week 2)

**Goal**: Smart plugin suggestions

**Tasks**:
1. Implement init-time detection
2. Implement first-increment detection (modify `/specweave:inc`)
3. Create pre-task hook
4. Create post-increment hook
5. Integration tests

**Deliverables**:
- Auto-detect works during `specweave init`
- `/specweave:inc` suggests plugins
- Hooks suggest plugins at runtime

### Phase 5: Plugin Migration (Week 3)

**Goal**: Move features to plugins

**Tasks**:
1. Create `src/plugins/kubernetes/` structure
2. Migrate k8s skills from core to plugin
3. Create kubernetes plugin manifest
4. Create `src/plugins/frontend-stack/`
5. Migrate React/Next.js skills to plugin
6. Create 10+ plugins

**Plugins to Create**:
- kubernetes
- frontend-stack
- ml-ops
- observability (forked from wshobson)
- payment-processing
- e2e-testing
- figma-ecosystem
- security
- diagrams
- nodejs-backend
- python-backend
- dotnet-backend

**Deliverables**:
- 12+ plugins created
- All plugins have manifests
- Core reduced to ~10-12 skills

### Phase 6: Documentation (Week 3)

**Goal**: Update all docs for plugin architecture

**Tasks**:
1. Update `CLAUDE.md` (emphasize Claude superiority)
2. Update `README.md` (feature comparison matrix)
3. Update adapter READMEs (claude, cursor, copilot, generic)
4. Update `AGENTS.md` template
5. Create plugin developer guide
6. Create migration guide (v0.3.7 → v0.4.0)

**Deliverables**:
- Clear "Why Claude Code?" section
- Feature comparison table
- Migration guide for existing users
- Plugin development guide

### Phase 7: Marketplace (Week 4)

**Goal**: Publish to Anthropic marketplace

**Tasks**:
1. Create `marketplace` GitHub repo
2. Create marketplace manifest (`.claude-plugin/marketplace.json`)
3. Publish plugins: kubernetes, ml-ops, frontend-stack, payment-processing
4. Create README with installation instructions
5. Test installation via `/plugin marketplace add specweave/marketplace`

**Deliverables**:
- Marketplace repo published
- 4+ plugins available standalone
- Installation tested
- Documentation complete

### Phase 8: Testing & Polish (Week 4)

**Goal**: Comprehensive testing

**Tasks**:
1. Unit tests (plugin manager, detector, loader)
2. Integration tests (full workflow)
3. E2E tests (Playwright - CLI interactions)
4. Adapter tests (all 4 adapters)
5. Performance tests (context reduction measurement)
6. Documentation review

**Deliverables**:
- 80%+ test coverage
- All adapters tested
- Performance benchmarks
- Documentation reviewed

---

## Testing Strategy

### Unit Tests

**Plugin Manager**:
```typescript
describe('PluginManager', () => {
  it('should load plugin with valid manifest', async () => {
    const manager = new PluginManager();
    await manager.loadPlugin('kubernetes', claudeAdapter);

    const enabled = await manager.getEnabledPlugins();
    expect(enabled).toContain('kubernetes');
  });

  it('should reject plugin with invalid manifest', async () => {
    const manager = new PluginManager();
    await expect(
      manager.loadPlugin('invalid-plugin', claudeAdapter)
    ).rejects.toThrow('Invalid manifest');
  });

  it('should resolve plugin dependencies', async () => {
    const manager = new PluginManager();
    const deps = await manager.resolveDependencies(k8sPlugin);

    expect(deps).toContain('cloud-infrastructure');
  });
});
```

**Plugin Detector**:
```typescript
describe('PluginDetector', () => {
  it('should detect React project', async () => {
    const detector = new PluginDetector();
    const plugins = await detector.detectFromProject('./fixtures/react-app');

    expect(plugins).toContain('frontend-stack');
  });

  it('should detect Kubernetes from spec', async () => {
    const detector = new PluginDetector();
    const spec = 'Deploy API to Kubernetes with Helm charts';
    const plugins = await detector.detectFromSpec(spec);

    expect(plugins).toContain('kubernetes');
  });
});
```

### Integration Tests

**Full Workflow**:
```typescript
describe('Plugin Workflow', () => {
  it('should auto-detect and enable plugins', async () => {
    // 1. Initialize project
    await execCommand('specweave init', { cwd: './fixtures/react-app' });

    // 2. Check auto-detected plugins
    const config = await readYAML('.specweave/config.yaml');
    expect(config.plugins.enabled).toContain('frontend-stack');

    // 3. Verify installation
    const claudeSkills = await fs.readdir('.claude/skills/');
    expect(claudeSkills).toContain('nextjs');
  });
});
```

### E2E Tests (Playwright)

**CLI Interaction**:
```typescript
test('user can list and enable plugins', async ({ page }) => {
  // Run CLI command
  const output = await execCommand('specweave plugin list');

  // Verify output
  expect(output).toContain('AVAILABLE PLUGINS');
  expect(output).toContain('kubernetes');

  // Enable plugin
  await execCommand('specweave plugin enable kubernetes');

  // Verify enabled
  const listOutput = await execCommand('specweave plugin list');
  expect(listOutput).toContain('✓ kubernetes');
});
```

### Performance Tests

**Context Reduction**:
```typescript
describe('Performance', () => {
  it('should reduce context by 60%+', async () => {
    // Before: All skills loaded
    const beforeTokens = await measureTokens('./fixtures/app-before');

    // After: Only core + 2 plugins
    const afterTokens = await measureTokens('./fixtures/app-after');

    const reduction = (beforeTokens - afterTokens) / beforeTokens;
    expect(reduction).toBeGreaterThan(0.6); // 60%+
  });
});
```

---

## Migration Strategy

### Backwards Compatibility

**v0.4.0 Compatibility Mode**:
- Detect v0.3.7 projects (no `.specweave/config.yaml` or old format)
- Auto-migrate: "Detected v0.3.7 project. Migrate to v0.4.0? (Y/n)"
- Migration script enables ALL previously available skills as plugins
- User can disable plugins later

**Migration Script**:
```bash
#!/bin/bash
# scripts/migrate-to-v0.4.0.sh

echo "🔄 Migrating to SpecWeave v0.4.0 (Plugin Architecture)"
echo ""

# Check if already migrated
if grep -q "version: 1.0" .specweave/config.yaml 2>/dev/null; then
  echo "✅ Already migrated!"
  exit 0
fi

echo "This migration will:"
echo "  - Enable all previously available features as plugins"
echo "  - Create .specweave/config.yaml"
echo "  - Preserve existing increments"
echo ""
read -p "Continue? (Y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Enable all plugins to maintain feature parity
specweave plugin enable frontend-stack
specweave plugin enable kubernetes
specweave plugin enable ml-ops
specweave plugin enable observability
specweave plugin enable payment-processing
specweave plugin enable e2e-testing
specweave plugin enable figma-ecosystem
specweave plugin enable security
specweave plugin enable diagrams

echo ""
echo "✅ Migration complete!"
echo ""
echo "💡 You can now disable unused plugins to reduce context:"
echo "   specweave plugin list"
echo "   specweave plugin disable <name>"
```

---

## Risks & Mitigations

### Risk 1: Context Reload Issues

**Risk**: Loading/unloading plugins mid-conversation breaks Claude's context.

**Mitigation**:
- Only load/unload at increment boundaries
- Pre-task hook suggests but doesn't auto-load
- User must manually enable, then reload conversation

### Risk 2: Plugin Conflicts

**Risk**: Two plugins provide similar skills with conflicting behavior.

**Mitigation**:
- Skill namespacing: `kubernetes:deployer` vs `docker:deployer`
- Manifest validation: Reject duplicate skill names
- Dependency checking: Warn if plugins overlap
- Documentation: "Recommended Plugin Combinations"

### Risk 3: Adapter Parity

**Risk**: Cursor/Copilot users expect same experience as Claude.

**Mitigation**:
- Clear feature comparison matrix in docs
- Positive framing: "Cursor gets 85% of Claude experience"
- Dedicated guides: "Best Practices for Cursor Users"
- Emphasize what they DO get, not what they don't

### Risk 4: Marketplace Maintenance

**Risk**: Publishing to Anthropic marketplace requires ongoing work.

**Mitigation**:
- Automated CI/CD for marketplace repo
- Plugin publish script: `npm run publish:plugin kubernetes`
- Community moderation: Accept PRs
- Deprecation policy: 6-month support for old versions

---

## Success Criteria

### Technical Success

- ✅ 60-80% context reduction (measured via token usage)
- ✅ Plugin installation < 2 seconds
- ✅ Auto-detection accuracy >= 90%
- ✅ All adapters support plugins
- ✅ 80%+ test coverage
- ✅ Zero breaking changes for users who migrate

### User Success

- ✅ Users can enable/disable plugins via CLI
- ✅ Auto-detection suggests correct plugins 9/10 times
- ✅ Documentation clearly explains Claude superiority
- ✅ Migration from v0.3.7 is one-click
- ✅ Community can publish custom plugins

### Business Success

- ✅ 100+ marketplace downloads per plugin (month 1)
- ✅ 3+ community plugins (month 6)
- ✅ User satisfaction >= 4/5 (plugin system)
- ✅ Clear competitive positioning vs. Kiro/Cursor

---

## Deployment Plan

### Pre-Release (v0.4.0-beta)

**Week 1-2**:
- Internal testing with SpecWeave core team
- Fix critical bugs
- Performance benchmarking

**Week 3**:
- Beta release to early adopters (GitHub Discussions)
- Collect feedback
- Refine auto-detection accuracy

**Week 4**:
- Documentation review
- Migration guide testing
- Final polish

### Release (v0.4.0)

**Day 1**:
- Publish to NPM: `npm publish`
- Tag release: `git tag v0.4.0`
- Publish marketplace repo
- Announcement blog post

**Week 1**:
- Monitor GitHub issues
- Support early adopters
- Quick fixes via patch releases (v0.4.1)

**Month 1**:
- Collect usage metrics
- Iterate on plugin suggestions
- Community plugin submissions

---

## Future Enhancements (v0.5.0+)

### Plugin Versioning
- Independent versioning: `kubernetes@1.2.0`
- Compatibility matrix
- `specweave plugin update kubernetes`

### Plugin Dependencies
- Automatic dependency resolution
- Dependency graph visualization
- One-click multi-plugin install

### Hot Reloading
- Load/unload plugins without context reset
- Claude Code native support
- Optimized context swapping

### Plugin Permissions
- Read-only plugins (docs, guides)
- Write plugins (code generation)
- Execute plugins (command execution)
- Network plugins (API calls)

### Plugin Analytics
- Opt-in usage telemetry
- Insights: "Most popular plugins"
- Recommendations: "Projects like yours use..."

---

## Appendix

### A. Core vs. Plugin Decision Tree

```
Is this feature...
├─ Used by EVERY project? → CORE
├─ Specific to a tech stack (React, K8s, ML)? → PLUGIN
├─ Part of increment lifecycle (spec, plan, tasks)? → CORE
├─ Domain-specific expertise (DevOps, design, payments)? → PLUGIN
├─ Automated via hooks (living docs)? → CORE
└─ Nice-to-have but not essential? → PLUGIN
```

### B. Adapter Capabilities Matrix

| Feature | Claude Code | Cursor 2.0 | Copilot | Generic |
|---------|-------------|------------|---------|---------|
| Native Plugins | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Auto-Activation | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Hooks | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Slash Commands | ✅ Native | 🟡 Team | ❌ No | ❌ No |
| Multi-Agent | ✅ Isolated | 🟡 Shared | ❌ No | ❌ No |
| MCP Protocol | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Context Shortcuts | ✅ @ files | ✅ @ files | 🟡 @ workspace | ❌ No |
| Living Docs Auto | ✅ Yes | ❌ Manual | ❌ Manual | ❌ Manual |

**Quality Score**:
- Claude Code: ⭐⭐⭐⭐⭐ (100%) - Best-in-class
- Cursor 2.0: ⭐⭐⭐⭐ (85%) - Semi-automation
- Copilot: ⭐⭐⭐ (60%) - Basic automation
- Generic: ⭐⭐ (40%) - Manual workflow

---

## Conclusion

The plugin architecture provides **modular, context-efficient, extensible** platform while preserving Claude Code's superiority. Implementation is phased over 4 weeks with clear milestones and comprehensive testing.

**Key Innovations**:
1. **Four-phase detection** (init, first increment, pre-task, post-increment)
2. **Adapter-as-compiler** (plugins work across all tools)
3. **Claude Code superiority** (documented and emphasized)
4. **Community extensibility** (marketplace for custom plugins)

**Next**: See `tasks.md` for detailed implementation tasks and `tests.md` for comprehensive test strategy.

---

**Version**: 1.0
**Last Updated**: 2025-10-31
**Author**: Anton Abyzov
