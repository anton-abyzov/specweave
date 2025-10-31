# Product Specification: Plugin Architecture

**Increment**: 0004-plugin-architecture
**Title**: Plugin Architecture - Modular, Context-Efficient, Multi-Tool Support
**Status**: Planning
**Priority**: P0 (Foundation for v0.4.0)
**Created**: 2025-10-31

---

## Executive Summary

Transform SpecWeave from a monolithic skill/agent bundle into a **modular plugin architecture** that:
- Reduces context usage by 60-80% (only load what you need)
- Enables community contributions (publish to Anthropic's marketplace)
- Maintains multi-tool support (Claude, Cursor 2.0, Copilot, Generic)
- Preserves Claude Code's superiority (native hooks, auto-activation, MCP)

**Core Insight**: SpecWeave currently loads 44 skills + 20 agents + 18 commands for EVERY project, even if they never touch Kubernetes or ML. Plugin architecture makes SpecWeave contextually lightweight while remaining feature-rich.

---

## Problem Statement

### Current State (v0.3.7)

**Context Bloat**:
- Every project loads ALL 44 skills, regardless of need
- Kubernetes skills loaded for React-only projects
- ML ops agents loaded for static sites
- Figma skills loaded for backend-only APIs

**No Extensibility**:
- Users can't add custom domain plugins
- Community can't contribute specialized skills
- All features must be in core (monolithic)

**Tool Parity Issues**:
- Documentation doesn't emphasize Claude Code's superiority
- Users don't understand why hooks matter (automated living docs)
- Competing tools like Kiro claim "automated docs" when SpecWeave already does this BETTER

### User Pain Points

**User Story 1: Simple Backend API**
> "I'm building a Node.js API with no frontend. Why is SpecWeave loading React skills, Figma skills, and Kubernetes agents? My context is bloated."

**User Story 2: ML Engineer**
> "I need SpecWeave's increment workflow, but I also need specialized ML ops skills. Can I add custom plugins without forking the entire framework?"

**User Story 3: Team Lead**
> "We're using Cursor 2.0, not Claude Code. The docs don't explain what features we're missing (like automated hooks). We manually update docs and wonder why it's not automatic."

**User Story 4: Kiro User**
> "I'm using Kiro for automated living docs. Why should I switch to SpecWeave? Doesn't Kiro do the same thing?"

---

## Target Audience

### Primary Users

1. **SpecWeave Contributors** (maintaining the framework)
   - Need modular architecture for easier maintenance
   - Want clear separation between core and optional features

2. **Enterprise Teams** (using SpecWeave at scale)
   - Need to customize with domain-specific plugins
   - Want to control which features are loaded (security, performance)

3. **Solo Developers** (small projects)
   - Need minimal context footprint
   - Only want core increment workflow + relevant plugins

4. **Community Contributors** (extending SpecWeave)
   - Want to publish specialized plugins (industry-specific, tool-specific)
   - Need clear plugin API and marketplace

### Secondary Users

5. **Cursor/Copilot Users** (non-Claude tools)
   - Need clarity on what features they're missing
   - Want best possible experience within their tool's constraints

6. **Prospective Users** (evaluating SpecWeave)
   - Need clear comparison: Claude Code vs. other tools
   - Want to understand SpecWeave's competitive advantages

---

## User Stories & Acceptance Criteria

### US-001: Core Framework Separation

**As a** SpecWeave user
**I want** the framework to load ONLY core features by default
**So that** my context usage is minimal and focused

**Acceptance Criteria**:
- ✅ Core features clearly defined (increment-planner, sync-docs, PM agent, architect agent)
- ✅ Core = ~10-12 skills + 3-4 agents + 8 commands (vs. 44 skills today)
- ✅ `specweave init` only installs core by default
- ✅ Core features work identically across all adapters
- ✅ Documentation lists what's in core vs. plugins

### US-002: Auto-Detect Plugins from Project

**As a** new SpecWeave user
**I want** the framework to auto-detect which plugins I need
**So that** I don't have to manually configure everything

**Acceptance Criteria**:
- ✅ Init-time detection: Scan `package.json`, folders, config files
- ✅ Suggest relevant plugins during `specweave init`
- ✅ Detection accuracy >= 90% for common stacks (React, Node.js, K8s, etc.)
- ✅ User can approve/reject suggestions
- ✅ Saves configuration to `.specweave/config.yaml`

### US-003: Spec-Based Plugin Detection

**As a** SpecWeave user creating my first increment
**I want** the framework to analyze my spec and suggest plugins
**So that** I get relevant help without manual setup

**Acceptance Criteria**:
- ✅ `/specweave.inc` analyzes increment description for keywords
- ✅ Suggests plugins before creating spec.md
- ✅ Keywords cover common domains (auth, payments, K8s, ML, design)
- ✅ User can enable plugins inline (no context switch)
- ✅ Plugins load immediately for current increment

### US-004: Manual Plugin Management

**As a** SpecWeave power user
**I want** fine-grained control over plugins
**So that** I can optimize my setup

**Acceptance Criteria**:
- ✅ `specweave plugin list` - Shows all available plugins
- ✅ `specweave plugin enable <name>` - Enable a plugin
- ✅ `specweave plugin disable <name>` - Disable a plugin
- ✅ `specweave plugin info <name>` - Show plugin details
- ✅ Configuration persists in `.specweave/config.yaml`

### US-005: Plugin Lifecycle Hooks

**As a** SpecWeave framework
**I want** to validate plugin requirements during workflow
**So that** users don't encounter missing dependencies mid-task

**Acceptance Criteria**:
- ✅ Pre-task hook: Check if task mentions plugin keywords, suggest if not loaded
- ✅ Post-increment hook: Scan for new dependencies, suggest plugins
- ✅ Hooks are non-blocking (suggestions, not errors)
- ✅ Hook logs to `.specweave/logs/plugin-suggestions.log`

### US-006: Claude Code Plugin Installer (Native)

**As a** Claude Code user
**I want** plugins to install natively to `.claude-plugin/`
**So that** I get best-in-class experience with auto-activation and hooks

**Acceptance Criteria**:
- ✅ Plugins install to `.claude/skills/`, `.claude/agents/`, `.claude/commands/`
- ✅ Skills auto-activate based on context
- ✅ Agents available via Task tool with isolated contexts
- ✅ Slash commands work natively (`/k8s.deploy`)
- ✅ Hooks execute automatically (living docs update on task completion)

### US-007: Cursor Plugin Compiler

**As a** Cursor 2.0 user
**I want** plugins compiled to AGENTS.md + team commands
**So that** I get semi-automated experience within Cursor's capabilities

**Acceptance Criteria**:
- ✅ Plugins append to `AGENTS.md` automatically
- ✅ Generates `cursor-team-commands.json` for team dashboard
- ✅ Creates `@<plugin-name>` context shortcuts
- ✅ Documentation explains missing features (no auto hooks)
- ✅ Instructions for manual doc updates

### US-008: Copilot Plugin Compiler

**As a** GitHub Copilot user
**I want** plugins compiled to `.github/copilot/instructions.md`
**So that** I get basic plugin support

**Acceptance Criteria**:
- ✅ Plugins append to `instructions.md` automatically
- ✅ Includes skill descriptions, agent roles, workflows
- ✅ Documentation explains limitations (no auto-activation, no hooks)
- ✅ Provides manual workflow steps

### US-009: Generic Plugin Compiler

**As a** ChatGPT/Gemini user
**I want** a copy-paste manual for plugins
**So that** I can use SpecWeave without specialized tools

**Acceptance Criteria**:
- ✅ Generates `SPECWEAVE-MANUAL.md` with all plugin content
- ✅ Includes system prompts, workflows, examples
- ✅ Clearly labeled sections per plugin
- ✅ Instructions: "Copy-paste this section when starting work"

### US-010: Marketplace Publication

**As a** SpecWeave maintainer
**I want** to publish plugins to Anthropic's marketplace
**So that** users can discover and install plugins without NPM

**Acceptance Criteria**:
- ✅ Create `specweave/marketplace` GitHub repo
- ✅ Marketplace manifest (`.claude-plugin/marketplace.json`)
- ✅ Published plugins: kubernetes, ml-ops, frontend-stack, payment-processing
- ✅ Users can install via `/plugin marketplace add specweave/marketplace`
- ✅ Plugins work standalone (without full SpecWeave framework)

### US-011: Documentation Overhaul - Claude Code Superiority

**As a** prospective SpecWeave user
**I want** clear documentation on why Claude Code is best-in-class
**So that** I understand the value proposition

**Acceptance Criteria**:
- ✅ CLAUDE.md emphasizes Claude Code's native advantages
- ✅ README.md includes feature comparison matrix (Claude vs. Cursor vs. Copilot)
- ✅ Explains hooks = automated living docs (vs. Kiro's manual approach)
- ✅ Explains MCP = superior context management
- ✅ Explains agent isolation = better multi-role workflows
- ✅ Links to "Why Claude Code?" section

### US-012: GitHub Plugin Integration

**As a** SpecWeave user with a GitHub repository
**I want** increments to automatically sync with GitHub issues
**So that** my team can track work in GitHub while using SpecWeave's workflow

**Acceptance Criteria**:
- ✅ GitHub plugin auto-detects `.git/` + GitHub remote during init
- ✅ `/specweave.inc` optionally creates GitHub issue
- ✅ `/specweave.do` posts task completion comments on issue
- ✅ `/specweave.done` closes GitHub issue with spec summary
- ✅ `/sync-docs` updates issue description when spec changes
- ✅ GitHub issue links back to increment folder
- ✅ Works with GitHub CLI (`gh`)
- ✅ Respects `.env` for `GITHUB_TOKEN`

**User Workflow**:
```bash
# 1. Init project (auto-detect GitHub)
$ specweave init
> Detected GitHub repository (anton-abyzov/specweave)
> Enable github plugin? (Y/n) y
> ✅ GitHub plugin enabled

# 2. Create increment (create GitHub issue)
$ /specweave.inc "user authentication"
> Create GitHub issue for this increment? (Y/n) y
> ✅ Created issue #42: Feature: user-authentication
> 🔗 https://github.com/anton-abyzov/specweave/issues/42

# 3. Work on tasks (auto-comment on issue)
$ /specweave.do
> ✅ Task T-001 completed: Create login form
> 💬 Commented on issue #42

$ /specweave.do
> ✅ Task T-002 completed: Add JWT authentication
> 💬 Commented on issue #42

# 4. Close increment (close GitHub issue)
$ /specweave.done
> All PM gates passed! ✅
> Close GitHub issue #42? (Y/n) y
> ✅ Issue #42 closed with spec summary
```

**GitHub Issue Format**:
```markdown
# Feature: user-authentication

**Increment**: 0005-user-authentication
**Status**: In Progress
**Priority**: P1

## Summary
[Auto-generated from spec.md]

## Tasks
- [x] T-001: Create login form
- [x] T-002: Add JWT authentication
- [ ] T-003: Write tests

## Links
- [Spec](../.specweave/increments/0005-user-authentication/spec.md)
- [Plan](../.specweave/increments/0005-user-authentication/plan.md)
- [Tasks](../.specweave/increments/0005-user-authentication/tasks.md)

---
🤖 Managed by [SpecWeave](https://spec-weave.com)
```

---

### US-013: Attribution for Borrowed Plugins

**As a** SpecWeave maintainer
**I want** clear attribution for community-sourced plugins
**So that** we maintain open-source ethics and legal compliance

**Acceptance Criteria**:
- ✅ Plugin manifest includes `credits` section
- ✅ README links to upstream sources (e.g., wshobson/agents)
- ✅ Lists modifications made for SpecWeave integration
- ✅ Same open-source license as upstream
- ✅ Contribution guidelines for upstream improvements

---

## Success Metrics

### Performance Metrics

**Context Reduction**:
- Target: 60-80% reduction in loaded skills/agents for typical projects
- Measurement: Compare token usage before/after (simple React app)
- Before: 44 skills + 20 agents ≈ 50K tokens
- After: 10 core + 2 plugins ≈ 15K tokens

**Detection Accuracy**:
- Target: >= 90% accuracy for auto-detection
- Measurement: Test on 50 diverse projects (React, Node, K8s, ML, etc.)
- Success: Correctly suggests relevant plugins 9/10 times

**Plugin Installation Speed**:
- Target: < 2 seconds to enable a plugin
- Measurement: Time from `specweave plugin enable kubernetes` to ready

### Adoption Metrics

**Marketplace Downloads**:
- Target: 100+ downloads per plugin in first month
- Measurement: GitHub releases download count

**Community Contributions**:
- Target: 3+ community-contributed plugins in first 6 months
- Measurement: Pull requests to marketplace repo

**User Satisfaction**:
- Target: "Plugin system is intuitive" (>= 4/5 rating)
- Measurement: User survey after v0.4.0 release

---

## Non-Goals (Out of Scope)

### v0.4.0 Will NOT Include:

1. **Plugin Versioning** - All plugins match framework version (v0.4.0)
   - Future: Semantic versioning per plugin (v1.2.0)

2. **Plugin Dependency Resolution** - No automatic dependency graph
   - Future: Plugin A can require Plugin B

3. **Hot Reloading** - Plugins load at increment/task boundaries, not mid-conversation
   - Future: Explore real-time plugin swapping

4. **Plugin Sandboxing** - No security isolation between plugins
   - Future: Permission model (read-only, write, execute, network)

5. **Plugin Analytics** - No usage tracking or telemetry
   - Future: Opt-in analytics for plugin usage patterns

6. **Multi-Language Support** - Plugins are Markdown/YAML only (English)
   - Future: i18n for plugin descriptions

---

## Competitive Analysis

### SpecWeave + Claude Code vs. Competitors

| Feature | SpecWeave (Claude) | Kiro | Cursor Composer | Copilot |
|---------|-------------------|------|-----------------|---------|
| **Living Docs (Automated)** | ✅ Native hooks | 🟡 Manual sync | ❌ Manual | ❌ Manual |
| **Auto-Activation** | ✅ Skills auto-fire | ❌ No | ❌ No | ❌ No |
| **Multi-Agent Isolation** | ✅ Separate contexts | ❌ No | 🟡 8 parallel | ❌ No |
| **Slash Commands** | ✅ Native | ❌ No | 🟡 Team commands | ❌ No |
| **Hooks (Pre/Post)** | ✅ Native | ❌ No | ❌ No | ❌ No |
| **MCP Protocol** | ✅ Native | ❌ No | ❌ No | ❌ No |
| **Plugin System** | ✅ This increment | ❌ No | ❌ No | ❌ No |
| **Context Efficiency** | ✅ 60-80% reduction | 🟡 Unknown | 🟡 @ shortcuts | 🟡 @ workspace |
| **Spec-Driven Workflow** | ✅ Core feature | ❌ No | ❌ No | ❌ No |

**Key Differentiators**:
1. **Automated Living Docs**: SpecWeave + Claude Code updates docs ON EVERY TASK via hooks. Kiro requires manual sync. Cursor/Copilot have no concept of living docs.

2. **True Multi-Agent**: Claude Code's agents have isolated contexts. Cursor's 8 agents share context. Copilot has no agents.

3. **Context Efficiency**: Plugin architecture means SpecWeave only loads what you need. Competitors load everything or nothing.

4. **Spec-Driven Philosophy**: SpecWeave is built around increments (spec → plan → tasks → tests). Competitors are ad-hoc coding assistants.

### Why Claude Code is Best-in-Class

**Anthropic Sets Standards**:
- MCP (Model Context Protocol) - Industry standard for context management
- Skills - Proven pattern for auto-activating capabilities
- Agents - Proven pattern for role-based, isolated workflows
- Hooks - Proven pattern for lifecycle automation

**SpecWeave Leverages These Standards**:
- Native MCP integration = superior context loading
- Skills auto-activate = no manual invocation
- Agents with isolation = clean separation of concerns
- Hooks = guaranteed automated docs (vs. Kiro's manual approach)

**Result**: SpecWeave + Claude Code = **10x better developer experience** than any competitor.

---

## Technical Requirements

### Core Plugin API

**Plugin Manifest** (`.claude-plugin/manifest.json`):
```json
{
  "name": "specweave-kubernetes",
  "version": "1.0.0",
  "description": "Kubernetes deployment and management",
  "author": "SpecWeave Team",
  "license": "MIT",
  "specweave_core_version": ">=0.4.0",
  "dependencies": {
    "plugins": ["specweave-cloud-infrastructure"]
  },
  "auto_detect": {
    "files": ["kubernetes/", "k8s/", "helm/"],
    "packages": ["@kubernetes/client-node"],
    "env_vars": ["KUBECONFIG"]
  },
  "provides": {
    "skills": ["k8s-deployer", "helm-manager"],
    "agents": ["devops"],
    "commands": ["specweave.k8s.deploy"]
  },
  "triggers": ["kubernetes", "k8s", "kubectl", "helm", "pod", "deployment"],
  "credits": {
    "based_on": null,
    "contributors": ["Anton Abyzov"]
  }
}
```

**Plugin Directory Structure**:
```
plugins/kubernetes/
├── .claude-plugin/
│   └── manifest.json
├── skills/
│   ├── k8s-deployer/
│   │   ├── SKILL.md
│   │   └── test-cases/
│   ├── helm-manager/
│   └── k8s-troubleshooter/
├── agents/
│   └── devops/
│       └── AGENT.md
├── commands/
│   └── k8s-deploy.md
└── README.md
```

### Adapter Requirements

**All adapters MUST implement**:
```typescript
interface IAdapter {
  supportsPlugins(): boolean;
  compilePlugin(plugin: Plugin): Promise<void>;
  unloadPlugin(pluginName: string): Promise<void>;
  getLoadedPlugins(): Promise<string[]>;
}
```

**Adapter Capabilities Matrix**:

| Adapter | Plugins? | Auto-Activate? | Hooks? | Commands? | Quality |
|---------|----------|----------------|--------|-----------|---------|
| Claude  | ✅ Native | ✅ Yes | ✅ Yes | ✅ Yes | ⭐⭐⭐⭐⭐ 100% |
| Cursor 2.0 | ✅ Compiled | ❌ No | ❌ No | 🟡 Team | ⭐⭐⭐⭐ 85% |
| Copilot | ✅ Compiled | ❌ No | ❌ No | ❌ No | ⭐⭐⭐ 60% |
| Generic | ✅ Manual | ❌ No | ❌ No | ❌ No | ⭐⭐ 40% |

---

## User Workflows

### Workflow 1: New User with Auto-Detection

```bash
$ npm install -g specweave
$ cd my-react-app
$ specweave init

🔍 Detecting your project...
   ✓ Found React 18.x (package.json)
   ✓ Found Playwright (playwright.config.ts)
   ✓ Found Stripe (package.json)

🤖 Detected AI tool: Claude Code (best-in-class!)

📦 Recommended plugins:
   ✓ frontend-stack (React, Next.js skills)
   ✓ e2e-testing (Playwright integration)
   ✓ payment-processing (Stripe workflows)

Enable these plugins? (Y/n) y

✨ Installing...
   ✓ Core framework (10 skills, 3 agents, 8 commands)
   ✓ frontend-stack plugin (5 skills, 1 agent)
   ✓ e2e-testing plugin (2 skills, 1 agent)
   ✓ payment-processing plugin (4 skills, 1 agent)

🎯 Setup complete! Create your first increment:
   /specweave.inc "user authentication with Stripe billing"
```

### Workflow 2: Spec-Based Plugin Suggestion

```bash
User: /specweave.inc "deploy API to Kubernetes with monitoring"

Claude:
📋 Planning increment: kubernetes-deployment-with-monitoring

🔍 Analyzing requirements...
   - Kubernetes deployment (kubectl, helm)
   - Observability (monitoring, metrics, logs)

📦 This increment would benefit from additional plugins:

   ☸️ Kubernetes Plugin
      - k8s-deployer skill (kubectl, helm)
      - devops agent (infrastructure expert)
      - /k8s.deploy command

   📊 Observability Plugin
      - monitoring-setup skill (Prometheus, Grafana)
      - sre agent (troubleshooting, metrics)
      - /observe.metrics command

Enable these plugins? (Y/n) y

✨ Installing plugins...
   ✓ kubernetes (2.1s)
   ✓ observability (1.8s)

🎯 Plugins ready! Now let's plan your increment...

[PM agent creates spec.md with Kubernetes + observability context]
```

### Workflow 3: Manual Plugin Management

```bash
$ specweave plugin list

📦 CORE (Always Loaded)
   ✓ increment-planner
   ✓ context-loader
   ✓ sync-docs
   ✓ pm agent
   ✓ architect agent
   ✓ tech-lead agent

📦 ENABLED PLUGINS
   ✓ frontend-stack (React, Next.js)
   ✓ e2e-testing (Playwright)
   ✓ payment-processing (Stripe)

📦 AVAILABLE PLUGINS
   - kubernetes (K8s deployment)
   - ml-ops (Machine learning workflows)
   - observability (Monitoring, metrics)
   - figma-ecosystem (Design integration)
   - security (Security scanning, best practices)

$ specweave plugin enable kubernetes

✨ Enabling kubernetes plugin...
   ✓ Installed to .claude/
   ✓ Updated .specweave/config.yaml
   ✓ 4 skills, 1 agent, 2 commands now available

🎯 Ready! Skills will auto-activate when you mention Kubernetes.
```

### Workflow 4: Cursor User (Understanding Limitations)

```bash
$ npm install -g specweave
$ cd my-project
$ specweave init --tool cursor

🔍 Detected AI tool: Cursor 2.0 (semi-automation)

⚠️  IMPORTANT: Cursor limitations vs. Claude Code:
   ❌ No automated hooks (living docs require manual updates)
   ❌ No skill auto-activation (must explicitly request)
   ✅ AGENTS.md provides workflow instructions
   ✅ Team commands available (upload to dashboard)
   ✅ @ context shortcuts work

Continue with Cursor setup? (Y/n) y

✨ Installing...
   ✓ Core framework
   ✓ AGENTS.md created (Cursor reads this automatically)
   ✓ cursor-team-commands.json generated

📋 Next steps:
   1. Upload cursor-team-commands.json to your Cursor team dashboard
   2. Reload Cursor window (Cmd+Shift+P → Reload Window)
   3. Use @increments, @docs, @strategy for context
   4. Manually run /sync-docs after completing tasks

📖 See .cursor/README.md for full instructions
```

---

## Risks & Mitigations

### Risk 1: Breaking Changes for Existing Users

**Risk**: Users on v0.3.7 will have ALL skills in core. Upgrading to v0.4.0 changes structure.

**Mitigation**:
- Migration script: `specweave migrate:v0.4.0`
- Detects current project, suggests plugins to enable
- One-click migration: "Enable all previously available features? (Y/n)"
- Changelog clearly documents breaking changes
- Support both old and new structure for 1 release cycle (v0.4.0 compatibility mode)

### Risk 2: Plugin Discovery (Users Don't Know What's Available)

**Risk**: Users don't know which plugins exist or what they do.

**Mitigation**:
- `specweave plugin search <keyword>` - Search marketplace
- Rich descriptions in `specweave plugin list`
- Documentation page: "Available Plugins" with use cases
- Auto-suggestions during `/specweave.inc` (spec analysis)

### Risk 3: Cursor/Copilot Users Feel Second-Class

**Risk**: Documentation emphasizes Claude Code, making other users feel unsupported.

**Mitigation**:
- Clear "Feature Comparison Matrix" showing what each tool gets
- Positive framing: "Cursor gets AGENTS.md + team commands (85% of Claude experience)"
- Dedicated guides: "Best Practices for Cursor Users"
- Emphasize: "SpecWeave works with any tool, optimized for Claude"

### Risk 4: Plugin Conflicts (Duplicate Skills)

**Risk**: Two plugins provide similar skills, causing confusion.

**Mitigation**:
- Namespacing: `kubernetes:deployer` vs `cloud:deployer`
- Dependency checking: Warn if plugins overlap
- Manifest validation: Reject duplicate skill names at publish
- Documentation: "Recommended Plugin Combinations"

### Risk 5: Marketplace Maintenance Burden

**Risk**: Publishing to Anthropic marketplace requires ongoing maintenance.

**Mitigation**:
- Automated CI/CD for marketplace repo
- Plugin publish script: `specweave plugin publish kubernetes`
- Semantic versioning: Match SpecWeave framework version
- Community moderation: Accept community PRs for plugin updates

---

## Future Enhancements (v0.5.0+)

### Plugin Versioning
- Plugins have independent versions (kubernetes@1.2.0)
- `specweave plugin update kubernetes` - Update single plugin
- Compatibility matrix: Which plugins work with which SpecWeave versions

### Plugin Dependencies
- Automatic dependency graph resolution
- `kubernetes` plugin requires `cloud-infrastructure` plugin
- One-click install: "kubernetes needs cloud-infrastructure. Install both? (Y/n)"

### Plugin Permissions
- Read-only plugins (documentation, guides)
- Write plugins (generate code, modify files)
- Execute plugins (run commands, deploy)
- Network plugins (API calls, webhooks)

### Hot Reloading
- Load/unload plugins mid-conversation (Claude Code native)
- Context switch optimization (swap plugins without losing state)

### Plugin Analytics
- Opt-in telemetry: Which plugins are most used?
- Insights: "Projects with kubernetes plugin have 40% higher increment completion rate"

---

## Appendix

### A. Core vs. Plugin Feature List

**CORE (Always Loaded)**:

**Skills** (7):
- increment-planner
- context-loader
- increment-quality-judge
- project-kickstarter
- brownfield-analyzer
- brownfield-onboarder
- context-optimizer

**Agents** (3):
- pm (Product Manager)
- architect (System Architect)
- tech-lead (Technical Lead)

**Commands** (7):
- /specweave.inc
- /specweave.do
- /specweave.next
- /specweave.done
- /specweave.progress
- /specweave.validate
- /sync-docs

**PLUGINS (Opt-In)**:

**Priority Plugins** (Commonly needed):
**Plugin: github** (2 skills, 1 agent, 3 commands) - GitHub issue integration
**Plugin: frontend-stack** (5 skills, 1 agent) - React, Next.js
**Plugin: kubernetes** (3 skills, 1 agent, 2 commands) - K8s deployment

**Domain Plugins**:
**Plugin: ml-ops** (3 skills, 3 agents, 1 command) - Machine learning
**Plugin: observability** (4 skills, 4 agents, 2 commands) - Monitoring
**Plugin: payment-processing** (4 skills, 1 agent) - Stripe
**Plugin: e2e-testing** (2 skills, 1 agent) - Playwright
**Plugin: figma-ecosystem** (5 skills, 2 agents) - Design
**Plugin: security** (3 skills, 1 agent) - Security scanning
**Plugin: diagrams** (2 skills, 1 agent) - C4, Mermaid

**Backend Stacks**:
**Plugin: nodejs-backend** (1 skill, 1 agent)
**Plugin: python-backend** (1 skill, 1 agent)
**Plugin: dotnet-backend** (1 skill, 1 agent)

**Enterprise Sync** (Alternative to GitHub):
**Plugin: jira-sync** (1 skill, 1 agent, 2 commands)
**Plugin: ado-sync** (1 skill, 1 agent, 2 commands)

### B. Manifest Schema (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SpecWeave Plugin Manifest",
  "type": "object",
  "required": ["name", "version", "description", "provides"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^specweave-[a-z0-9-]+$",
      "description": "Plugin name (must start with 'specweave-')"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version (e.g., 1.0.0)"
    },
    "description": {
      "type": "string",
      "maxLength": 1024,
      "description": "Plugin description (max 1024 chars)"
    },
    "author": {
      "type": "string",
      "description": "Plugin author"
    },
    "license": {
      "type": "string",
      "description": "License (e.g., MIT, Apache-2.0)"
    },
    "specweave_core_version": {
      "type": "string",
      "description": "Required SpecWeave core version (e.g., '>=0.4.0')"
    },
    "dependencies": {
      "type": "object",
      "properties": {
        "plugins": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Required plugin dependencies"
        }
      }
    },
    "auto_detect": {
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": { "type": "string" },
          "description": "File/directory patterns to detect"
        },
        "packages": {
          "type": "array",
          "items": { "type": "string" },
          "description": "NPM package dependencies to detect"
        },
        "env_vars": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Environment variables to detect"
        }
      }
    },
    "provides": {
      "type": "object",
      "required": ["skills", "agents", "commands"],
      "properties": {
        "skills": {
          "type": "array",
          "items": { "type": "string" }
        },
        "agents": {
          "type": "array",
          "items": { "type": "string" }
        },
        "commands": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "triggers": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Keywords that trigger plugin suggestions"
    },
    "credits": {
      "type": "object",
      "properties": {
        "based_on": {
          "type": ["string", "null"],
          "description": "Upstream source URL if forked"
        },
        "original_author": {
          "type": "string"
        },
        "contributors": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

---

## Conclusion

The plugin architecture transforms SpecWeave from a monolithic framework into a **modular, context-efficient, extensible platform** while preserving and emphasizing **Claude Code's best-in-class advantages**.

**Key Benefits**:
1. **60-80% context reduction** - Only load what you need
2. **Community extensibility** - Anyone can publish plugins
3. **Multi-tool support** - Works with Claude, Cursor, Copilot, ChatGPT
4. **Competitive clarity** - Clear messaging on why Claude Code is superior
5. **Marketplace presence** - Discoverable via Anthropic's ecosystem

**Next**: See `plan.md` for technical architecture and implementation strategy.

---

**Version**: 1.0
**Last Updated**: 2025-10-31
**Owner**: Anton Abyzov
**Reviewers**: SpecWeave Core Team
