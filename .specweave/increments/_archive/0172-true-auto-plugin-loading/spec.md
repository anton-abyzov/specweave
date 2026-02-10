---
increment: 0172-true-auto-plugin-loading
title: "True Auto Plugin Loading - Hook-Based Automatic Installation"
type: feature
status: active
priority: critical
created: 2026-01-19
---

# True Auto Plugin Loading - Hook-Based Automatic Installation

## Problem Statement

Increment 0171 (Lazy Plugin Loading) built the infrastructure but **failed to deliver the core promise**:

| What 0171 Promised | What 0171 Delivered | Gap |
|-------------------|---------------------|-----|
| "Detects SpecWeave intent from user prompts" | `detectSpecWeaveIntent()` function exists | **Never called automatically** |
| "Hot-reloads full plugins only when needed" | Manual `specweave load-plugins` command | **User must run manually** |
| "Router skill detects and loads" | Passive skill that may not activate | **Unreliable activation** |

**Evidence from user testing:**
```
User: "release newest patch npm of specweave"
Expected: sw-release auto-installs → /sw-release:npm available
Actual: Nothing happens → Command not found
```

## Root Cause Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│ ARCHITECTURAL GAP IN 0171                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  detectSpecWeaveIntent()     ←── EXISTS but NEVER CALLED        │
│           │                                                      │
│           ▼                                                      │
│  PluginCacheManager          ←── EXISTS but NEVER TRIGGERED     │
│           │                                                      │
│           ▼                                                      │
│  installPlugins()            ←── EXISTS but MANUAL ONLY         │
│           │                                                      │
│           X ←── NO AUTOMATIC TRIGGER!                           │
│                                                                  │
│  Router Skill                ←── PASSIVE (unreliable)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Solution: Three-Layer Auto-Loading

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  TRUE AUTO-LOADING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LAYER 1: Session-Start Smart Loading (PROACTIVE)                   │
│  ────────────────────────────────────────────────────────────────── │
│  Hook: session-start.sh                                             │
│  When: Claude Code session starts                                   │
│  Action: Analyze project → pre-install likely plugins               │
│                                                                      │
│  package.json has "react" → install sw-frontend                     │
│  .github/ exists → install sw-github                                │
│  k8s/ or helm/ exists → install sw-k8s                              │
│  Dockerfile exists → install sw-infra                               │
│                                                                      │
│  ────────────────────────────────────────────────────────────────── │
│                                                                      │
│  LAYER 2: User-Prompt Hook Detection (REACTIVE)                     │
│  ────────────────────────────────────────────────────────────────── │
│  Hook: user-prompt-submit.sh                                        │
│  When: User submits any prompt                                      │
│  Action: Detect keywords → install matching plugins                 │
│                                                                      │
│  "release npm" → detect "release" → install sw-release              │
│  "deploy to kubernetes" → detect "k8s" → install sw-k8s             │
│  "create stripe checkout" → detect "stripe" → install sw-payments   │
│                                                                      │
│  CRITICAL: Runs BEFORE Claude processes → plugins ready for response│
│                                                                      │
│  ────────────────────────────────────────────────────────────────── │
│                                                                      │
│  LAYER 3: CLAUDE.md Embedded Router (DETERMINISTIC FALLBACK)        │
│  ────────────────────────────────────────────────────────────────── │
│  Location: CLAUDE.md template                                       │
│  When: Always (CLAUDE.md is always read)                            │
│  Action: Tell Claude to install plugins when keywords detected      │
│                                                                      │
│  "If user asks about npm release and sw-release not loaded:         │
│   Run: specweave load-plugins release --silent                      │
│   Then: Execute /sw-release:npm"                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Three Layers?

| Layer | Trigger | Timing | Reliability | Use Case |
|-------|---------|--------|-------------|----------|
| **1. Session-Start** | Project files | Before any prompt | 100% | Pre-load for known project types |
| **2. User-Prompt Hook** | Keywords in prompt | Before Claude responds | 100% | On-demand for specific requests |
| **3. CLAUDE.md Router** | Claude reads instructions | During response | ~80% | Fallback if hooks miss something |

### Official Claude Code Hook Mechanism (Critical Implementation Detail)

Based on [official Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code/hooks), the `UserPromptSubmit` hook works as follows:

**1. Hook receives JSON on stdin:**
```json
{
  "session_id": "abc123",
  "prompt": "release newest patch npm of specweave"
}
```

**2. Hook processes and returns decision:**
```json
{
  "decision": "approve"
}
```

**3. Our implementation adds auto-loading BETWEEN receiving and responding:**

```bash
#!/bin/bash
# plugins/specweave/hooks/v2/dispatchers/user-prompt-submit.sh

# Read JSON from stdin (Claude Code provides this)
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# === AUTO-LOADING LOGIC (NEW) ===
# Detect keywords and install plugins BEFORE Claude processes
if [ -n "$PROMPT" ]; then
  # Call specweave CLI to detect and install (silent, timeout protected)
  timeout 0.5s specweave detect-intent "$PROMPT" --install --silent 2>/dev/null || true
fi
# === END AUTO-LOADING LOGIC ===

# Always approve (auto-loading doesn't block)
echo '{"decision":"approve"}'
```

**Why this works:**
1. Hook runs **BEFORE** Claude receives the prompt
2. Plugin installation **completes** before Claude Code reads available skills
3. Claude's response has access to newly-installed plugin commands
4. Timeout + `|| true` ensures hook never blocks Claude

**Existing infrastructure we leverage:**
- `plugins/specweave/hooks/v2/dispatchers/user-prompt-submit.sh` - already parses prompt
- `src/core/lazy-loading/keyword-detector.ts` - has `detectSpecWeaveIntent()`
- `specweave load-plugins` - installs plugins to `~/.claude/skills/`

---

## User Stories

### US-001: Session-Start Project Analysis
**Project**: specweave
**As a** developer opening Claude Code in a project,
**I want** relevant plugins to be pre-installed automatically,
**So that** commands are available from my first prompt.

**Acceptance Criteria**:
- [x] **AC-US1-01**: session-start hook analyzes project files (package.json, requirements.txt, etc.)
- [x] **AC-US1-02**: React/Vue/Angular projects trigger sw-frontend installation
- [x] **AC-US1-03**: Python projects with FastAPI/Django trigger sw-backend installation
- [x] **AC-US1-04**: Projects with .github/ trigger sw-github installation
- [x] **AC-US1-05**: Projects with k8s/, helm/, or Kubernetes manifests trigger sw-k8s installation
- [x] **AC-US1-06**: Projects with Dockerfile/docker-compose trigger sw-infra installation
- [x] **AC-US1-07**: Analysis completes in <3 seconds
- [x] **AC-US1-08**: Already-installed plugins are not re-installed (idempotent)

### US-002: User-Prompt Keyword Detection Hook
**Project**: specweave
**As a** developer typing a prompt,
**I want** the system to detect keywords and install matching plugins,
**So that** the relevant commands are available for Claude's response.

**Acceptance Criteria**:
- [x] **AC-US2-01**: user-prompt-submit hook runs `specweave detect-intent` on every prompt
- [x] **AC-US2-02**: Detection uses existing `detectSpecWeaveIntent()` function
- [x] **AC-US2-03**: Matching plugins installed BEFORE Claude processes the prompt
- [x] **AC-US2-04**: Installation is silent (no output that disrupts UX)
- [x] **AC-US2-05**: Hook completes in <500ms to avoid noticeable delay
- [x] **AC-US2-06**: Multiple plugins can be installed in single hook execution
- [x] **AC-US2-07**: Hook failure does not block Claude response (graceful degradation)

### US-003: CLI detect-intent Command
**Project**: specweave
**As a** hook developer,
**I want** a CLI command to detect intent from a prompt,
**So that** I can call it from shell hooks.

**Acceptance Criteria**:
- [x] **AC-US3-01**: `specweave detect-intent "prompt text"` command exists
- [x] **AC-US3-02**: Returns JSON with detected plugins: `{"plugins": ["release", "github"]}`
- [x] **AC-US3-03**: Returns empty array if no match: `{"plugins": []}`
- [x] **AC-US3-04**: Supports `--install` flag to also install detected plugins
- [x] **AC-US3-05**: Supports `--silent` flag for hook usage (no stdout)
- [x] **AC-US3-06**: Exit code 0 if plugins detected, 1 if none

### US-004: CLAUDE.md Embedded Router Instructions
**Project**: specweave
**As a** user whose hooks might miss something,
**I want** CLAUDE.md to contain fallback routing instructions,
**So that** Claude can install plugins when needed.

**Acceptance Criteria**:
- [x] **AC-US4-01**: CLAUDE.md template includes "Auto-Loading Fallback" section
- [x] **AC-US4-02**: Section lists keyword → plugin mappings
- [x] **AC-US4-03**: Instructions tell Claude to run `specweave load-plugins X --silent` when keywords detected
- [x] **AC-US4-04**: Instructions include the full command to execute after loading
- [x] **AC-US4-05**: Template updated via `specweave update-instructions`

### US-005: Project Type Detection Module
**Project**: specweave
**As a** system that pre-loads plugins,
**I want** accurate project type detection,
**So that** the right plugins are pre-installed.

**Acceptance Criteria**:
- [x] **AC-US5-01**: Module at `src/core/lazy-loading/project-detector.ts`
- [x] **AC-US5-02**: Detects frontend frameworks: React, Vue, Angular, Svelte, Next.js, Nuxt
- [x] **AC-US5-03**: Detects backend frameworks: Express, FastAPI, Django, NestJS, Spring Boot
- [x] **AC-US5-04**: Detects infrastructure: Docker, Kubernetes, Terraform, Pulumi
- [x] **AC-US5-05**: Detects integrations: GitHub Actions, JIRA config, Azure DevOps
- [x] **AC-US5-06**: Returns list of recommended plugin groups
- [x] **AC-US5-07**: Detection is fast (<1 second) using file existence checks, not content parsing

### US-006: Silent Plugin Installation Mode
**Project**: specweave
**As a** hook that installs plugins,
**I want** silent installation mode,
**So that** user experience is not disrupted by output.

**Acceptance Criteria**:
- [x] **AC-US6-01**: `specweave load-plugins X --silent` produces no stdout
- [x] **AC-US6-02**: Errors still written to stderr for debugging
- [x] **AC-US6-03**: Exit codes still work correctly for hook logic
- [x] **AC-US6-04**: Logging still happens to `~/.specweave/logs/lazy-loading.log`

### US-007: Hook Performance Optimization
**Project**: specweave
**As a** user who doesn't want delays,
**I want** hooks to be fast,
**So that** auto-loading doesn't noticeably slow down my workflow.

**Acceptance Criteria**:
- [x] **AC-US7-01**: session-start hook completes in <3 seconds
- [x] **AC-US7-02**: user-prompt-submit hook completes in <500ms
- [x] **AC-US7-03**: Plugin installation uses async/parallel where possible
- [x] **AC-US7-04**: Caching prevents redundant detection/installation
- [x] **AC-US7-05**: Performance logged for monitoring

### US-008: Keyword-to-Plugin Mapping Expansion
**Project**: specweave
**As a** user mentioning various technologies,
**I want** comprehensive keyword detection,
**So that** the right plugins load regardless of how I phrase things.

**Acceptance Criteria**:
- [x] **AC-US8-01**: Release keywords: release, publish, npm, version, changelog, semver
- [x] **AC-US8-02**: Frontend keywords: react, vue, angular, svelte, next.js, nuxt, frontend, UI, component
- [x] **AC-US8-03**: Backend keywords: API, REST, GraphQL, database, SQL, PostgreSQL, MongoDB, Redis
- [x] **AC-US8-04**: Infra keywords: kubernetes, k8s, docker, terraform, aws, azure, gcp, deploy
- [x] **AC-US8-05**: GitHub keywords: github, PR, pull request, issue, actions, workflow
- [x] **AC-US8-06**: Testing keywords: test, TDD, vitest, jest, playwright, e2e, coverage
- [x] **AC-US8-07**: Payments keywords: stripe, payment, checkout, subscription, billing
- [x] **AC-US8-08**: Mobile keywords: react native, expo, ios, android, mobile app

### US-009: Integration Testing
**Project**: specweave
**As a** developer ensuring reliability,
**I want** comprehensive integration tests,
**So that** auto-loading works correctly in real scenarios.

**Acceptance Criteria**:
- [x] **AC-US9-01**: E2E test: Fresh session → React project → sw-frontend auto-installed
- [x] **AC-US9-02**: E2E test: User types "npm release" → sw-release auto-installed
- [x] **AC-US9-03**: E2E test: Multiple keywords → multiple plugins installed
- [x] **AC-US9-04**: E2E test: Already-installed plugin → no re-installation
- [x] **AC-US9-05**: E2E test: Hook failure → Claude still responds (graceful degradation)
- [x] **AC-US9-06**: Performance test: Hook completes within time limits

### US-010: Documentation Update
**Project**: specweave
**As a** user reading documentation,
**I want** accurate documentation of auto-loading behavior,
**So that** I understand how the system works.

**Acceptance Criteria**:
- [x] **AC-US10-01**: CLAUDE.md template updated with auto-loading explanation
- [x] **AC-US10-02**: README updated with "How Auto-Loading Works" section
- [x] **AC-US10-03**: Troubleshooting guide for when auto-loading doesn't work
- [x] **AC-US10-04**: Documentation clearly states this replaces manual loading in most cases

---

## Technical Design

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPONENT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ HOOKS (plugins/specweave/hooks/)                              │  │
│  │                                                                │  │
│  │ v2/dispatchers/session-start.sh                               │  │
│  │   └── specweave detect-project "$PROJECT_ROOT" --install      │  │
│  │                                                                │  │
│  │ user-prompt-submit.sh  (receives JSON stdin: {"prompt":"..."})│  │
│  │   └── specweave detect-intent "$PROMPT" --install --silent    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ CLI COMMANDS (src/cli/commands/)                              │  │
│  │                                                                │  │
│  │ detect-intent.ts                                               │  │
│  │   └── Uses: detectSpecWeaveIntent() from keyword-detector.ts  │  │
│  │   └── Flags: --install, --silent, --json                      │  │
│  │                                                                │  │
│  │ detect-project.ts                                              │  │
│  │   └── Uses: detectProjectType() from project-detector.ts      │  │
│  │   └── Flags: --install, --silent, --json                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ CORE MODULES (src/core/lazy-loading/)                         │  │
│  │                                                                │  │
│  │ keyword-detector.ts   (EXISTS - enhanced)                      │  │
│  │   └── detectSpecWeaveIntent(prompt): DetectionResult          │  │
│  │   └── NEW: getPluginsForKeywords(keywords): string[]          │  │
│  │                                                                │  │
│  │ project-detector.ts   (NEW)                                    │  │
│  │   └── detectProjectType(projectPath): ProjectType             │  │
│  │   └── getRecommendedPlugins(projectType): string[]            │  │
│  │                                                                │  │
│  │ cache-manager.ts      (EXISTS - enhanced)                      │  │
│  │   └── NEW: installPluginsSilent(plugins): Promise<void>       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ TEMPLATES (src/templates/)                                    │  │
│  │                                                                │  │
│  │ CLAUDE.md.template                                             │  │
│  │   └── NEW: "## Auto-Loading Fallback" section                 │  │
│  │   └── Keyword → plugin → command mappings                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow Diagrams

#### Session-Start Flow
```
Claude Code Starts
       │
       ▼
┌──────────────────┐
│ session-start.sh │
│ hook triggers    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ specweave detect-project     │
│ --install --silent           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Analyze project files:       │
│ - package.json               │
│ - requirements.txt           │
│ - Dockerfile                 │
│ - .github/                   │
│ - k8s/, helm/                │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Detected: React + GitHub     │
│ Install: sw-frontend,        │
│          sw-github           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ User's first prompt has      │
│ frontend & github commands   │
│ available immediately!       │
└──────────────────────────────┘
```

#### User-Prompt Flow
```
User types: "release npm patch version"
       │
       ▼
┌─────────────────────────────┐
│ user-prompt-submit.sh       │
│ hook triggers BEFORE Claude │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ specweave detect-intent             │
│ "release npm patch version"         │
│ --install --silent                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ detectSpecWeaveIntent() returns:    │
│ {                                   │
│   detected: true,                   │
│   matchedKeywords: ["release","npm"]│
│   suggestedPlugins: ["release"]     │
│ }                                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Install sw-release silently         │
│ → Copies to ~/.claude/skills/       │
│ → Hot-reload activates immediately  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Claude processes prompt             │
│ /sw-release:npm IS AVAILABLE!       │
│ Claude can execute the command      │
└─────────────────────────────────────┘
```

### Project Type Detection Rules

```typescript
interface ProjectTypeRule {
  type: string;
  plugins: string[];
  detect: () => boolean;
}

const PROJECT_RULES: ProjectTypeRule[] = [
  // Frontend
  {
    type: 'react',
    plugins: ['frontend'],
    detect: () => packageJsonHas('react') || fileExists('src/App.tsx')
  },
  {
    type: 'vue',
    plugins: ['frontend'],
    detect: () => packageJsonHas('vue') || fileExists('src/App.vue')
  },
  {
    type: 'nextjs',
    plugins: ['frontend', 'backend'],
    detect: () => packageJsonHas('next') || fileExists('next.config.js')
  },

  // Backend
  {
    type: 'express',
    plugins: ['backend'],
    detect: () => packageJsonHas('express')
  },
  {
    type: 'fastapi',
    plugins: ['backend'],
    detect: () => fileExists('requirements.txt') && fileContains('requirements.txt', 'fastapi')
  },
  {
    type: 'nestjs',
    plugins: ['backend'],
    detect: () => packageJsonHas('@nestjs/core')
  },

  // Infrastructure
  {
    type: 'kubernetes',
    plugins: ['k8s', 'infra'],
    detect: () => dirExists('k8s') || dirExists('helm') || globExists('**/deployment.yaml')
  },
  {
    type: 'docker',
    plugins: ['infra'],
    detect: () => fileExists('Dockerfile') || fileExists('docker-compose.yml')
  },
  {
    type: 'terraform',
    plugins: ['infra'],
    detect: () => globExists('**/*.tf')
  },

  // Integrations
  {
    type: 'github',
    plugins: ['github'],
    detect: () => dirExists('.github')
  },
  {
    type: 'jira',
    plugins: ['jira'],
    detect: () => fileExists('.specweave/config.json') && configHas('jira.enabled', true)
  }
];
```

### Keyword-to-Plugin Mapping (Enhanced)

```typescript
const KEYWORD_PLUGIN_MAP: Record<string, string[]> = {
  // Release
  'release': ['release'],
  'publish': ['release'],
  'npm publish': ['release'],
  'version bump': ['release'],
  'changelog': ['release'],
  'semver': ['release'],

  // Frontend
  'react': ['frontend'],
  'vue': ['frontend'],
  'angular': ['frontend'],
  'svelte': ['frontend'],
  'nextjs': ['frontend'],
  'next.js': ['frontend'],
  'frontend': ['frontend'],
  'component': ['frontend'],
  'ui': ['frontend'],
  'dashboard': ['frontend'],
  'landing page': ['frontend'],

  // Backend
  'api': ['backend'],
  'rest': ['backend'],
  'graphql': ['backend'],
  'database': ['backend'],
  'sql': ['backend'],
  'postgresql': ['backend'],
  'mongodb': ['backend'],
  'redis': ['backend'],
  'backend': ['backend'],

  // Infrastructure
  'kubernetes': ['k8s', 'infra'],
  'k8s': ['k8s', 'infra'],
  'docker': ['infra'],
  'terraform': ['infra'],
  'aws': ['infra'],
  'azure': ['infra'],
  'gcp': ['infra'],
  'deploy': ['infra'],
  'ci/cd': ['infra'],

  // GitHub
  'github': ['github'],
  'pull request': ['github'],
  'pr': ['github'],
  'issue': ['github'],
  'actions': ['github'],
  'workflow': ['github'],

  // Testing
  'test': ['testing'],
  'tdd': ['testing'],
  'vitest': ['testing'],
  'jest': ['testing'],
  'playwright': ['testing'],
  'e2e': ['testing'],
  'coverage': ['testing'],

  // Payments
  'stripe': ['payments'],
  'payment': ['payments'],
  'checkout': ['payments'],
  'subscription': ['payments'],
  'billing': ['payments'],

  // Mobile
  'react native': ['mobile'],
  'expo': ['mobile'],
  'ios': ['mobile'],
  'android': ['mobile'],
  'mobile': ['mobile'],

  // ML
  'machine learning': ['ml'],
  'ml': ['ml'],
  'model': ['ml'],
  'training': ['ml'],
  'ai': ['ml'],

  // Diagrams
  'diagram': ['diagrams'],
  'mermaid': ['diagrams'],
  'architecture diagram': ['diagrams'],
  'flowchart': ['diagrams'],
};
```

---

## Out of Scope

1. **MCP-based dynamic loading** - Deferred from 0171, still too complex
2. **Per-skill loading** - Plugin-level granularity is sufficient
3. **Cross-machine sync** - Each machine manages its own state
4. **Automatic unloading** - Plugins remain loaded once installed

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hook execution delays UX | Medium | Medium | Strict <500ms timeout, async where possible |
| False positive detection | Low | Low | Tune keywords, add negative patterns |
| Hook conflicts with other hooks | Low | Medium | Use standard hook priority, test combinations |
| Session-start adds latency | Medium | Low | Async installation, <3s timeout |
| Plugin installation fails | Low | High | Graceful degradation, Claude still responds |

---

## Success Metrics

1. **Auto-install success rate**: >95% of relevant plugins auto-installed
2. **Hook latency**: <500ms for user-prompt-submit, <3s for session-start
3. **User satisfaction**: No manual `specweave load-plugins` needed for common workflows
4. **False positive rate**: <5% of incorrect plugin installations
5. **Zero UX disruption**: Silent installation, no visible delays

---

## Dependencies

- Increment 0171 (Lazy Plugin Loading) - provides core infrastructure
- Claude Code hooks system - provides execution points
- Existing keyword-detector.ts - provides detection logic

---

## References

- ADR-0171: Lazy Plugin Loading Architecture
- Claude Code Hooks Documentation
- Increment 0171 spec.md and tasks.md
