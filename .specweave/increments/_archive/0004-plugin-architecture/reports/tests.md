# Test Strategy: Plugin Architecture

**Increment**: 0004-plugin-architecture
**Status**: Planning
**Created**: 2025-10-31

---

## Test Overview

**Total Test Cases**: 127
**Test Levels**: 4 (Unit, Integration, E2E, Performance)
**Coverage Target**: 80%+ overall, 90%+ for critical paths
**Test Frameworks**:
- Jest (unit + integration)
- Playwright (E2E)
- Custom (performance benchmarks)

---

## Unit Tests (60 test cases)

### PluginLoader Tests (12 cases)

**TC-001: Load Valid Plugin**
```typescript
describe('PluginLoader', () => {
  it('should load plugin with valid manifest', async () => {
    const loader = new PluginLoader();
    const plugin = await loader.loadFromDirectory('fixtures/plugins/kubernetes');

    expect(plugin.manifest.name).toBe('specweave-kubernetes');
    expect(plugin.skills).toHaveLength(3);
    expect(plugin.agents).toHaveLength(1);
  });
});
```

**TC-002: Reject Invalid Manifest (Missing Fields)**
**TC-003: Reject Invalid Manifest (Wrong Schema)**
**TC-004: Load Skills Correctly**
**TC-005: Load Agents Correctly**
**TC-006: Load Commands Correctly**
**TC-007: Handle Missing Manifest File**
**TC-008: Handle Corrupted Manifest JSON**
**TC-009: Validate Manifest Against Schema**
**TC-010: Load Plugin with No Skills**
**TC-011: Load Plugin with No Agents**
**TC-012: Load Plugin with Dependencies**

### PluginManager Tests (15 cases)

**TC-013: Enable Plugin Successfully**
```typescript
describe('PluginManager', () => {
  it('should enable plugin and update config', async () => {
    const manager = new PluginManager();
    await manager.loadPlugin('kubernetes', mockAdapter);

    const enabled = await manager.getEnabledPlugins();
    expect(enabled).toContain('kubernetes');

    const config = await readYAML('.specweave/config.yaml');
    expect(config.plugins.enabled).toContain('kubernetes');
  });
});
```

**TC-014: Disable Plugin Successfully**
**TC-015: Enable Plugin with Dependencies (Auto-Install)**
**TC-016: Reject Plugin with Unmet Dependencies**
**TC-017: Get All Available Plugins**
**TC-018: Get Enabled Plugins Only**
**TC-019: Validate Plugin Manifest**
**TC-020: Reject Duplicate Plugin Names**
**TC-021: Handle Plugin Load Error Gracefully**
**TC-022: Unload Plugin Cleanly**
**TC-023: Resolve Dependency Graph**
**TC-024: Detect Circular Dependencies**
**TC-025: Update Config on Enable**
**TC-026: Update Config on Disable**
**TC-027: Handle Missing Plugin Directory**

### PluginDetector Tests (18 cases)

**TC-028: Detect React from package.json**
```typescript
describe('PluginDetector', () => {
  it('should detect frontend-stack from React dependency', async () => {
    const detector = new PluginDetector();
    const plugins = await detector.detectFromProject('fixtures/react-app');

    expect(plugins).toContain('frontend-stack');
  });
});
```

**TC-029: Detect Kubernetes from Directory**
**TC-030: Detect Stripe from package.json**
**TC-031: Detect Figma from .figma/ Directory**
**TC-032: Detect Playwright from Config File**
**TC-033: Detect ML from TensorFlow Dependency**
**TC-034: Detect from Environment Variables (KUBECONFIG)**
**TC-035: Detect Multiple Plugins Simultaneously**
**TC-036: Deduplicate Detected Plugins**
**TC-037: Detect from Spec (Kubernetes Keywords)**
```typescript
it('should detect kubernetes from spec content', async () => {
  const detector = new PluginDetector();
  const spec = 'Deploy API to Kubernetes with Helm charts and monitoring';
  const plugins = await detector.detectFromSpec(spec);

  expect(plugins).toContain('kubernetes');
  expect(plugins).toContain('observability');
});
```

**TC-038: Detect from Spec (Payment Keywords)**
**TC-039: Detect from Spec (ML Keywords)**
**TC-040: Detect from Spec (Design Keywords)**
**TC-041: Detect from Task Content**
**TC-042: Detect from Git Diff (New Dependencies)**
**TC-043: No False Positives (Empty Project)**
**TC-044: Accuracy Test (50 Diverse Projects >= 90%)**
**TC-045: Performance (Detection < 500ms)**

### Adapter Tests (15 cases)

**TC-046: Claude Adapter - Native Installation**
```typescript
describe('ClaudePluginInstaller', () => {
  it('should copy plugin to .claude/ directory', async () => {
    const installer = new ClaudePluginInstaller();
    await installer.installPlugin(kubernetesPlugin, 'fixtures/project');

    expect(await fs.pathExists('fixtures/project/.claude/skills/k8s-deployer')).toBe(true);
    expect(await fs.pathExists('fixtures/project/.claude/agents/devops')).toBe(true);
  });
});
```

**TC-047: Claude Adapter - Skills Auto-Activate**
**TC-048: Claude Adapter - Commands Work Natively**
**TC-049: Cursor Adapter - Generate AGENTS.md Section**
```typescript
describe('CursorPluginCompiler', () => {
  it('should append plugin to AGENTS.md', async () => {
    const compiler = new CursorPluginCompiler();
    await compiler.compilePlugin(kubernetesPlugin, 'fixtures/project');

    const agentsMd = await fs.readFile('fixtures/project/AGENTS.md', 'utf-8');
    expect(agentsMd).toContain('# specweave-kubernetes Plugin');
    expect(agentsMd).toContain('k8s-deployer');
  });
});
```

**TC-050: Cursor Adapter - Generate Team Commands JSON**
**TC-051: Cursor Adapter - Create @ Context Shortcuts**
**TC-052: Copilot Adapter - Append to instructions.md**
**TC-053: Generic Adapter - Generate Manual Section**
**TC-054: All Adapters - Support Plugin Interface**
**TC-055: All Adapters - Handle Missing Directories**
**TC-056: All Adapters - Unload Plugin Cleanly**
**TC-057: Adapter Detection (Detect Correct Tool)**
**TC-058: Adapter Fallback (Generic if Unknown)**
**TC-059: Adapter Plugin Compilation Speed (< 2s)**
**TC-060: Adapter Error Handling (Invalid Plugin)**

---

## Integration Tests (35 test cases)

### Plugin Lifecycle (10 cases)

**TC-061: Full Lifecycle (Load → Use → Unload)**
```typescript
describe('Plugin Lifecycle Integration', () => {
  it('should complete full lifecycle', async () => {
    // 1. Enable plugin
    await execCommand('specweave plugin enable kubernetes');

    // 2. Verify installation
    const skills = await fs.readdir('.claude/skills/');
    expect(skills).toContain('k8s-deployer');

    // 3. Use plugin (skills auto-activate)
    // (simulated - would require actual Claude Code instance)

    // 4. Disable plugin
    await execCommand('specweave plugin disable kubernetes');

    // 5. Verify removal
    const afterDisable = await fs.readdir('.claude/skills/');
    expect(afterDisable).not.toContain('k8s-deployer');
  });
});
```

**TC-062: Enable Multiple Plugins Sequentially**
**TC-063: Enable Plugin with Dependencies (Auto-Install)**
**TC-064: Disable Plugin with Dependents (Warning)**
**TC-065: Re-Enable Previously Disabled Plugin**
**TC-066: Upgrade Plugin (Future: v0.5.0)**
**TC-067: Rollback Plugin (Future: v0.5.0)**
**TC-068: Plugin Conflict Detection**
**TC-069: Plugin Compatibility Check (Core Version)**
**TC-070: Plugin Config Persistence**

### Auto-Detection Integration (15 cases)

**TC-071: Init-Time Detection (React App)**
```typescript
describe('Init-Time Detection', () => {
  it('should detect and suggest plugins during init', async () => {
    // Create test project with React
    await createTestProject({
      dependencies: { 'react': '^18.0.0' }
    });

    // Run specweave init
    const { stdout } = await execCommand('specweave init', {
      input: 'y\n' // Accept plugin suggestions
    });

    // Verify detection
    expect(stdout).toContain('Recommended plugins');
    expect(stdout).toContain('frontend-stack');

    // Verify installation
    const config = await readYAML('.specweave/config.yaml');
    expect(config.plugins.enabled).toContain('frontend-stack');
  });
});
```

**TC-072: Init-Time Detection (Kubernetes Project)**
**TC-073: Init-Time Detection (Full-Stack App)**
**TC-074: Init-Time Detection (Empty Project - No Suggestions)**
**TC-075: First Increment Detection (K8s Spec)**
```typescript
describe('First Increment Detection', () => {
  it('should suggest plugins based on spec content', async () => {
    // Mock /specweave:inc with K8s keywords
    const output = await execClaudeCommand(
      '/specweave:inc "deploy API to Kubernetes"'
    );

    // Verify suggestion
    expect(output).toContain('kubernetes plugin');
    expect(output).toContain('Enable these plugins?');
  });
});
```

**TC-076: First Increment Detection (Payment Spec)**
**TC-077: First Increment Detection (ML Spec)**
**TC-078: First Increment Detection (Multi-Plugin Spec)**
**TC-079: Pre-Task Hook Detection**
```typescript
describe('Pre-Task Hook Detection', () => {
  it('should suggest plugin before task execution', async () => {
    // Create task mentioning Kubernetes
    await createTask({
      title: 'Deploy to K8s cluster',
      description: 'Use kubectl to deploy...'
    });

    // Trigger pre-task hook
    const output = await execHook('pre-task-execution.sh');

    // Verify suggestion
    expect(output).toContain('This task mentions Kubernetes');
    expect(output).toContain('Enable kubernetes plugin?');
  });
});
```

**TC-080: Post-Increment Hook Detection (New Stripe Dependency)**
**TC-081: Post-Increment Hook Detection (New K8s Files)**
**TC-082: Post-Increment Hook Detection (New Figma Integration)**
**TC-083: Auto-Detection Accuracy (50 Projects >= 90%)**
**TC-084: Auto-Detection False Positives (< 5%)**
**TC-085: Auto-Detection Performance (< 1s for init)**

### Multi-Adapter Integration (10 cases)

**TC-086: Claude Adapter - Full Workflow**
```typescript
describe('Claude Adapter Full Workflow', () => {
  it('should enable, use, and disable plugin', async () => {
    // Enable kubernetes plugin for Claude
    await execCommand('specweave plugin enable kubernetes');

    // Verify .claude/ structure
    expect(await fs.pathExists('.claude/skills/k8s-deployer')).toBe(true);

    // Verify skills auto-activate (manual test in Claude Code)
    // (automated testing would require Claude Code API)

    // Disable
    await execCommand('specweave plugin disable kubernetes');
    expect(await fs.pathExists('.claude/skills/k8s-deployer')).toBe(false);
  });
});
```

**TC-087: Cursor Adapter - Full Workflow**
```typescript
describe('Cursor Adapter Full Workflow', () => {
  it('should compile plugin to AGENTS.md and team commands', async () => {
    // Enable kubernetes plugin for Cursor
    await execCommand('specweave plugin enable kubernetes --tool cursor');

    // Verify AGENTS.md updated
    const agentsMd = await fs.readFile('AGENTS.md', 'utf-8');
    expect(agentsMd).toContain('kubernetes Plugin');

    // Verify team commands generated
    expect(await fs.pathExists('cursor-team-commands.json')).toBe(true);
    const teamCommands = await fs.readJSON('cursor-team-commands.json');
    expect(teamCommands.commands.some(c => c.name === 'deploy-to-k8s')).toBe(true);

    // Verify @ context shortcuts
    expect(await fs.pathExists('.cursor/context/kubernetes-context.md')).toBe(true);
  });
});
```

**TC-088: Copilot Adapter - Full Workflow**
**TC-089: Generic Adapter - Full Workflow**
**TC-090: Adapter Auto-Detection**
**TC-091: Adapter Fallback (Unknown → Generic)**
**TC-092: Switch Adapters (Claude → Cursor)**
**TC-093: Multi-Tool Project (Claude + Cursor)**
**TC-094: Adapter-Specific Config Settings**
**TC-095: All Adapters - Plugin Parity (Core Features)**

---

## E2E Tests (22 test cases)

### CLI Command Tests (10 cases)

**TC-096: `specweave plugin list` - Shows All Plugins**
```typescript
test('plugin list shows all plugins', async ({ page }) => {
  const output = await execCommand('specweave plugin list');

  // Core section
  expect(output).toContain('CORE (Always Loaded)');
  expect(output).toContain('increment-planner');

  // Enabled section
  expect(output).toContain('ENABLED PLUGINS');

  // Available section
  expect(output).toContain('AVAILABLE PLUGINS');
  expect(output).toContain('kubernetes');
  expect(output).toContain('frontend-stack');
});
```

**TC-097: `specweave plugin enable kubernetes` - Enables Successfully**
**TC-098: `specweave plugin disable kubernetes` - Disables Successfully**
**TC-099: `specweave plugin info kubernetes` - Shows Details**
**TC-100: `specweave plugin enable invalid-plugin` - Error Handling**
**TC-101: `specweave plugin enable` - Interactive Mode**
**TC-102: `specweave plugin list --enabled` - Filter Enabled Only**
**TC-103: `specweave plugin list --available` - Filter Available Only**
**TC-104: `specweave plugin search kubernetes` - Search Marketplace**
**TC-105: Plugin CLI - Help Text**

### Marketplace Tests (5 cases)

**TC-106: Add Marketplace**
```typescript
test('add specweave marketplace', async ({ page }) => {
  // Mock /plugin command (Claude Code)
  const output = await execClaudeCommand(
    '/plugin marketplace add specweave/marketplace'
  );

  expect(output).toContain('Marketplace added');
  expect(output).toContain('specweave');
});
```

**TC-107: List Marketplace Plugins**
**TC-108: Install Plugin from Marketplace**
```typescript
test('install kubernetes from marketplace', async ({ page }) => {
  await execClaudeCommand('/plugin marketplace add specweave/marketplace');
  await execClaudeCommand('/plugin install kubernetes');

  // Verify installation
  const skills = await fs.readdir('.claude/skills/');
  expect(skills).toContain('k8s-deployer');
});
```

**TC-109: Marketplace Plugin Works Standalone (No SpecWeave Framework)**
**TC-110: Update Plugin from Marketplace (Future)**

### Real-World Workflows (7 cases)

**TC-111: New React Project - Full Workflow**
```typescript
test('new react project workflow', async ({ page }) => {
  // 1. Create React app
  await execCommand('npx create-react-app my-app');
  await execCommand('cd my-app');

  // 2. Initialize SpecWeave
  await execCommand('specweave init', { input: 'y\n' });

  // 3. Verify auto-detection suggested frontend-stack
  const config = await readYAML('.specweave/config.yaml');
  expect(config.plugins.enabled).toContain('frontend-stack');

  // 4. Create increment
  await execClaudeCommand('/specweave:inc "user authentication"');

  // 5. Verify spec created with React context
  const spec = await fs.readFile('.specweave/increments/0001-user-authentication/spec.md', 'utf-8');
  expect(spec).toContain('React');
});
```

**TC-112: Kubernetes Deployment - Full Workflow**
**TC-113: ML Pipeline - Full Workflow**
**TC-114: Stripe Integration - Full Workflow**
**TC-115: Multi-Plugin Project (React + Stripe + E2E)**
**TC-116: Brownfield Project - Migration**
**TC-117: Team Collaboration (Cursor Users)**

---

## Performance Tests (10 test cases)

### Context Reduction (3 cases)

**TC-118: Measure Context Reduction (Simple React App)**
```typescript
describe('Context Reduction Performance', () => {
  it('should reduce context by 60%+ for simple React app', async () => {
    // Before: All skills loaded (v0.3.7)
    const beforeTokens = await measureTokenUsage({
      skills: 44,
      agents: 20,
      commands: 18
    });

    // After: Core + frontend-stack only (v0.4.0)
    const afterTokens = await measureTokenUsage({
      core: { skills: 10, agents: 3, commands: 8 },
      plugins: ['frontend-stack'] // 5 skills, 1 agent
    });

    const reduction = (beforeTokens - afterTokens) / beforeTokens;
    expect(reduction).toBeGreaterThan(0.6); // 60%+
  });
});
```

**TC-119: Measure Context Reduction (Backend API)**
**TC-120: Measure Context Reduction (Full-Stack App)**

### Speed Benchmarks (4 cases)

**TC-121: Plugin Enable Speed (< 2 seconds)**
```typescript
describe('Plugin Enable Performance', () => {
  it('should enable plugin in under 2 seconds', async () => {
    const start = Date.now();
    await execCommand('specweave plugin enable kubernetes');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000); // 2 seconds
  });
});
```

**TC-122: Plugin Disable Speed (< 1 second)**
**TC-123: Auto-Detection Speed (< 500ms for init)**
**TC-124: Manifest Validation Speed (< 100ms)**

### Accuracy Benchmarks (3 cases)

**TC-125: Auto-Detection Accuracy (>= 90% on 50 Projects)**
```typescript
describe('Auto-Detection Accuracy', () => {
  it('should achieve 90%+ accuracy on diverse projects', async () => {
    const testProjects = [
      { name: 'react-app', expected: ['frontend-stack'] },
      { name: 'k8s-deploy', expected: ['kubernetes'] },
      { name: 'ml-pipeline', expected: ['ml-ops'] },
      // ... 47 more projects
    ];

    let correct = 0;
    for (const project of testProjects) {
      const detector = new PluginDetector();
      const detected = await detector.detectFromProject(project.path);

      if (detected.includes(project.expected[0])) {
        correct++;
      }
    }

    const accuracy = correct / testProjects.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.9); // 90%+
  });
});
```

**TC-126: Spec-Based Detection Accuracy (>= 85%)**
**TC-127: False Positive Rate (< 5%)**

---

## Test Data & Fixtures

### Fixture Projects

**fixtures/react-app/**:
- package.json with React dependency
- src/ with components
- playwright.config.ts

**fixtures/kubernetes-project/**:
- kubernetes/ directory with manifests
- Dockerfile
- helm/ charts

**fixtures/ml-pipeline/**:
- requirements.txt with tensorflow
- notebooks/ with Jupyter notebooks
- models/ directory

**fixtures/stripe-integration/**:
- package.json with @stripe/stripe-js
- .env with STRIPE_API_KEY

**fixtures/empty-project/**:
- Minimal package.json
- No dependencies
- For testing "no detection" case

### Mock Plugins

**fixtures/plugins/kubernetes/**:
- Valid manifest.json
- 3 skills, 1 agent, 2 commands
- README.md

**fixtures/plugins/invalid-plugin/**:
- Missing manifest.json
- For error testing

**fixtures/plugins/circular-dep-a/**:
- Depends on circular-dep-b
- For circular dependency testing

**fixtures/plugins/circular-dep-b/**:
- Depends on circular-dep-a

---

## Coverage Requirements

### Critical Paths (90%+ coverage)

- ✅ PluginManager.loadPlugin()
- ✅ PluginManager.unloadPlugin()
- ✅ PluginDetector.detectFromProject()
- ✅ PluginDetector.detectFromSpec()
- ✅ All adapter compilePlugin() methods
- ✅ CLI commands (list, enable, disable, info)

### Important Paths (80%+ coverage)

- ✅ PluginLoader.loadFromDirectory()
- ✅ Manifest validation
- ✅ Dependency resolution
- ✅ Config read/write
- ✅ Hooks (pre-task, post-increment)

### Nice-to-Have (60%+ coverage)

- ✅ Edge cases (empty plugins, no dependencies)
- ✅ Error messages
- ✅ Help text
- ✅ Logging

---

## Test Execution Plan

### Phase 1: Unit Tests (Week 1)
```bash
npm run test:unit
# Run after each component implementation
# Goal: 60 unit tests passing
```

### Phase 2: Integration Tests (Week 2)
```bash
npm run test:integration
# Run after adapter integration
# Goal: 35 integration tests passing
```

### Phase 3: E2E Tests (Week 3)
```bash
npm run test:e2e
# Run after CLI implementation
# Goal: 22 E2E tests passing
```

### Phase 4: Performance Tests (Week 4)
```bash
npm run test:performance
# Run before release
# Goal: All benchmarks met
```

### Continuous Integration
```yaml
# .github/workflows/test.yml
name: Test Plugin Architecture

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:performance
      - uses: codecov/codecov-action@v3
```

---

## Success Metrics

### Test Metrics
- ✅ All 127 test cases pass
- ✅ 80%+ overall coverage
- ✅ 90%+ coverage on critical paths
- ✅ CI/CD green on all tests
- ✅ No flaky tests (< 1% failure rate)

### Performance Metrics
- ✅ 60-80% context reduction
- ✅ 90%+ detection accuracy
- ✅ < 2s plugin enable time
- ✅ < 5% false positive rate

### Quality Metrics
- ✅ All adapters tested
- ✅ All plugins validated
- ✅ Real-world workflows tested
- ✅ Edge cases covered

---

## Test Maintenance

### Adding New Plugins
When adding a new plugin:
1. Create fixture in `fixtures/plugins/<name>/`
2. Add detection test (TC-XXX)
3. Add integration test (TC-XXX)
4. Add E2E workflow test (TC-XXX)
5. Update accuracy benchmark

### Adding New Adapters
When adding a new adapter:
1. Add unit tests (15 cases minimum)
2. Add integration test (full workflow)
3. Add E2E test (CLI interaction)
4. Update adapter comparison matrix

### Regression Testing
After any change to core plugin system:
1. Run full test suite
2. Check performance benchmarks
3. Verify accuracy metrics
4. Test all 4 adapters
5. Manual smoke test in Claude Code

---

## Test Reporting

### Coverage Report
```bash
npm run test:coverage
# Generates coverage/index.html
# View in browser
```

### Performance Report
```bash
npm run test:performance --report
# Generates performance-report.json
# Compare against baseline
```

### Accuracy Report
```bash
npm run test:accuracy --projects=50
# Tests auto-detection on 50 projects
# Generates accuracy-report.json
```

---

## Appendix: Test Utilities

### Helper Functions

```typescript
// test/helpers/plugin-test-utils.ts

export async function createTestPlugin(name: string): Promise<Plugin> {
  // Create temporary plugin for testing
}

export async function measureTokenUsage(config: any): Promise<number> {
  // Measure token count for given configuration
}

export async function execCommand(cmd: string, options?: any): Promise<any> {
  // Execute CLI command and capture output
}

export async function execClaudeCommand(cmd: string): Promise<string> {
  // Mock Claude Code command execution
}

export async function createTestProject(config: any): Promise<string> {
  // Create temporary test project
}
```

---

## Conclusion

Comprehensive test strategy covering all aspects of plugin architecture:
- **127 test cases** across 4 levels
- **80%+ coverage** overall, 90%+ for critical paths
- **Performance benchmarks** for context reduction and speed
- **Accuracy benchmarks** for auto-detection
- **CI/CD integration** for continuous quality

Tests ensure plugin system is robust, performant, and user-friendly across all adapters.

---

**Version**: 1.0
**Last Updated**: 2025-10-31
**Total Test Cases**: 127
**Coverage Target**: 80%+ overall, 90%+ critical
