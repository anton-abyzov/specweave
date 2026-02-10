---
increment: 0171-lazy-plugin-loading
title: "Lazy Plugin Loading - Conditional SpecWeave Activation"
type: feature
status: completed
priority: high
created: 2026-01-18
completed: 2026-01-19
---

# Lazy Plugin Loading - Conditional SpecWeave Activation

## Problem Statement

Currently, SpecWeave installs **all 24 plugins** (~251 skills) at once, which:
1. **Bloats context** - Only 108 of 251 skills (43%) are shown due to token limits
2. **Wastes tokens** - ~60,000 tokens consumed even when SpecWeave isn't needed
3. **Slows startup** - All plugins loaded regardless of user intent
4. **Reduces quality** - Important skills get truncated from context

**Evidence**: `<!-- Showing 108 of 251 skills due to token limits -->` appears in system prompts.

## Solution

Implement a **lazy loading architecture** that:
1. Installs only a lightweight **router skill** by default (~500 tokens)
2. **Detects SpecWeave intent** from user prompts using keyword matching
3. **Hot-reloads full plugins** only when needed (leveraging Claude Code 2.1.0+ features)
4. Uses **context forking** for heavy skills to isolate their context
5. Provides **migration path** for existing installations
6. Updates **init flow** for new users

## Target Token Savings

| Scenario | Current | After | Savings |
|----------|---------|-------|---------|
| Non-SpecWeave work | ~60,000 | ~500 | **99%** |
| SpecWeave work | ~60,000 | ~60,000 | 0% (loaded on demand) |
| Mixed session | ~60,000 | ~30,000 avg | **50%** |

## Claude Code Feature Alignment

This implementation leverages these Claude Code 2.1.0+ features:

| Feature | Version | How We Use It |
|---------|---------|---------------|
| **Skill Hot-Reload** | 2.1.0 | Skills in `~/.claude/skills/` activate immediately without restart |
| **Context Forking** | 2.1.0 | `context: fork` runs heavy skills in isolated sub-agent |
| **Setup Hook** | 2.1.10 | Runs on `--init` for conditional plugin setup |
| **MCP list_changed** | 2.1.0 | Alternative: MCP server can dynamically update tools |
| **Nested Discovery** | 2.1.0 | Auto-discovers skills from `.claude/skills/` subdirectories |
| **Progressive Disclosure** | 2.1.0 | Load supporting files on-demand |

---

## User Stories

### US-001: Router Skill Detection
**Project**: specweave
**As a** developer using Claude Code,
**I want** SpecWeave skills to load only when I mention SpecWeave-related keywords,
**So that** my context isn't bloated when doing non-SpecWeave work.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Router skill is <100 lines and <500 tokens
- [x] **AC-US1-02**: Router detects keywords: increment, specweave, /sw:, spec.md, tasks.md, living docs, feature planning, sprint
- [x] **AC-US1-03**: Non-matching prompts do NOT trigger plugin loading
- [x] **AC-US1-04**: Keyword detection is case-insensitive
- [x] **AC-US1-05**: Detection latency is <50ms

### US-002: On-Demand Plugin Installation
**Project**: specweave
**As a** developer,
**I want** full SpecWeave plugins to install automatically when detected,
**So that** I get full functionality without manual steps.

**Acceptance Criteria**:
- [x] **AC-US2-01**: Skills copy from cache to `~/.claude/skills/` on detection
- [x] **AC-US2-02**: Hot-reload activates skills within same session (no restart)
- [x] **AC-US2-03**: Already-installed skills are not re-copied (idempotent)
- [x] **AC-US2-04**: Installation completes in <2 seconds
- [x] **AC-US2-05**: User sees brief "Loading SpecWeave..." message during install

### US-003: Skill Cache Management
**Project**: specweave
**As a** SpecWeave user,
**I want** full plugins stored in a cache directory,
**So that** they can be quickly loaded when needed.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Cache stored at `~/.specweave/skills-cache/`
- [x] **AC-US3-02**: Cache populated during `specweave refresh-marketplace`
- [x] **AC-US3-03**: Cache includes version metadata for update detection
- [x] **AC-US3-04**: Cache cleanup removes skills not in current marketplace
- [x] **AC-US3-05**: Cache size reported in `specweave status`

### US-004: Context Forking for Heavy Skills
**Project**: specweave
**As a** developer,
**I want** heavy skills (architect, planner, etc.) to run in forked context,
**So that** my main conversation context isn't overwhelmed.

**Acceptance Criteria**:
- [x] **AC-US4-01**: Skills >200 lines use `context: fork` in frontmatter
- [x] **AC-US4-02**: Forked skills use appropriate agent type (Explore, Plan, general-purpose)
- [x] **AC-US4-03**: Forked skill results return to main conversation
- [x] **AC-US4-04**: At least 15 heavy skills converted to forked context
- [x] **AC-US4-05**: Token usage reduced by >30% for forked skills (achieved 46%)

### US-005: Migration for Existing Installations
**Project**: specweave
**As an** existing SpecWeave user,
**I want** to migrate to lazy loading without losing my current setup,
**So that** I can benefit from token savings immediately.

**Acceptance Criteria**:
- [x] **AC-US5-01**: Migration script `specweave migrate-lazy` handles existing installs
- [x] **AC-US5-02**: Current plugins backed up before migration
- [x] **AC-US5-03**: User memories preserved during migration
- [x] **AC-US5-04**: Rollback command `specweave migrate-lazy --rollback` available
- [x] **AC-US5-05**: Migration is non-destructive and reversible

### US-006: Updated Init Flow for New Users
**Project**: specweave
**As a** new SpecWeave user,
**I want** `specweave init` to default to lazy loading mode,
**So that** I start with optimized token usage.

**Acceptance Criteria**:
- [x] **AC-US6-01**: `specweave init` installs router skill by default
- [x] **AC-US6-02**: Full plugins cached at `~/.specweave/skills-cache/`
- [x] **AC-US6-03**: User informed about lazy loading behavior during init
- [x] **AC-US6-04**: `specweave init --full` option for traditional full install
- [x] **AC-US6-05**: Init completion message explains how lazy loading works

### US-007: Loading State Tracking
**Project**: specweave
**As a** developer,
**I want** to know which plugins are currently loaded,
**So that** I can understand my current context state.

**Acceptance Criteria**:
- [x] **AC-US7-01**: State tracked in `~/.specweave/state/plugins-loaded.json`
- [x] **AC-US7-02**: `specweave plugin-status` shows loaded vs cached plugins
- [x] **AC-US7-03**: State persists across Claude Code restarts
- [x] **AC-US7-04**: State cleared when user requests full unload
- [x] **AC-US7-05**: State includes timestamps for debugging

### US-008: Manual Load/Unload Commands
**Project**: specweave
**As a** power user,
**I want** commands to manually load/unload plugin groups,
**So that** I have fine-grained control over my context.

**Acceptance Criteria**:
- [x] **AC-US8-01**: `specweave load-plugins [group]` loads specific plugin group
- [x] **AC-US8-02**: `specweave unload-plugins` removes loaded skills from active dir
- [x] **AC-US8-03**: Plugin groups: core, github, jira, ado, frontend, backend, infra, ml
- [x] **AC-US8-04**: Loading/unloading respects hot-reload (no restart needed)
- [x] **AC-US8-05**: Help text explains each plugin group's purpose

### US-009: MCP Alternative Implementation [DEFERRED - Stretch Goal]
**Project**: specweave
**As an** advanced user,
**I want** an MCP-based alternative for dynamic tool loading,
**So that** I can use the MCPSearch auto-threshold feature.

**Status**: DEFERRED - Router skill approach proven effective. MCP alternative deferred to future increment.

**Acceptance Criteria**:
- [~] **AC-US9-01**: Optional MCP server `specweave-mcp` available (DEFERRED)
- [~] **AC-US9-02**: MCP server uses `list_changed` notifications for dynamic tools (DEFERRED)
- [~] **AC-US9-03**: Tools auto-deferred when exceeding 10% context threshold (DEFERRED)
- [~] **AC-US9-04**: MCP mode configurable via `specweave init --mcp-mode` (DEFERRED)
- [~] **AC-US9-05**: Documentation explains MCP vs router-skill trade-offs (DEFERRED)

### US-010: Telemetry and Analytics
**Project**: specweave
**As a** SpecWeave maintainer,
**I want** to track lazy loading effectiveness,
**So that** I can measure and improve token savings.

**Acceptance Criteria**:
- [x] **AC-US10-01**: Track: loads triggered, tokens saved, detection latency
- [x] **AC-US10-02**: Analytics stored locally (privacy-preserving)
- [x] **AC-US10-03**: `specweave analytics --lazy-loading` shows stats
- [~] **AC-US10-04**: Opt-in anonymous aggregation for improvement insights (DEFERRED - privacy review needed)
- [x] **AC-US10-05**: Analytics respect existing analytics config settings

### US-011: Graceful Degradation
**Project**: specweave
**As a** developer,
**I want** clear feedback and recovery options when hot-reload fails,
**So that** I can still access SpecWeave functionality.

**Acceptance Criteria**:
- [x] **AC-US11-01**: Failed hot-reload shows clear error message to user
- [x] **AC-US11-02**: User offered "restart Claude Code" option on failure
- [x] **AC-US11-03**: Failure logged to ~/.specweave/logs/lazy-loading.log
- [x] **AC-US11-04**: Retry mechanism attempts reload up to 3 times
- [x] **AC-US11-05**: Fallback to full install available via `specweave load-plugins --force`

### US-012: Cross-Platform Support
**Project**: specweave
**As a** Windows developer,
**I want** lazy loading to work without Git Bash,
**So that** I can use SpecWeave on any Windows setup.

**Acceptance Criteria**:
- [x] **AC-US12-01**: PowerShell script available as Windows alternative
- [x] **AC-US12-02**: Auto-detection of available shell (Bash > PowerShell)
- [x] **AC-US12-03**: Same functionality in both Bash and PowerShell versions
- [x] **AC-US12-04**: Windows long path support (>260 chars)
- [x] **AC-US12-05**: Documented Windows-specific setup instructions

---

## Technical Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAZY LOADING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐ │
│  │  Router Skill    │     │  Skills Cache                         │ │
│  │  (~500 tokens)   │     │  ~/.specweave/skills-cache/           │ │
│  │                  │     │                                        │ │
│  │  - Keyword       │────▶│  ├── specweave/                       │ │
│  │    detection     │     │  │   ├── increment-planner/           │ │
│  │  - Install       │     │  │   ├── architect/                   │ │
│  │    trigger       │     │  │   └── ... (50+ skills)             │ │
│  │  - State track   │     │  ├── specweave-github/                │ │
│  └──────────────────┘     │  ├── specweave-jira/                  │ │
│           │               │  └── ... (24 plugins)                  │ │
│           │               └──────────────────────────────────────┘ │
│           │                              │                          │
│           ▼                              ▼                          │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐ │
│  │  Active Skills   │◀────│  Hot-Reload Copy                      │ │
│  │  ~/.claude/      │     │  (on detection)                       │ │
│  │  skills/         │     │                                        │ │
│  │                  │     │  cp -r cache/* ~/.claude/skills/      │ │
│  │  Loaded on       │     │  → Activates immediately              │ │
│  │  demand only     │     │  → No restart needed                  │ │
│  └──────────────────┘     └──────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Keyword Detection Algorithm

```typescript
const SPECWEAVE_KEYWORDS = [
  // Commands
  '/sw:', 'specweave', 'increment',
  // Files
  'spec.md', 'tasks.md', 'plan.md', 'metadata.json',
  // Concepts
  'living docs', 'living documentation',
  'feature planning', 'sprint planning',
  'acceptance criteria', 'user story',
  // Workflow
  'backlog', 'kanban', 'scrum',
  // Integrations
  'jira sync', 'github sync', 'ado sync',
  // Advanced
  'auto mode', 'parallel auto', 'tdd mode'
];

function detectSpecWeaveIntent(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  return SPECWEAVE_KEYWORDS.some(kw => normalized.includes(kw.toLowerCase()));
}
```

### State File Format

```json
// ~/.specweave/state/plugins-loaded.json
{
  "version": "1.0.0",
  "lazyMode": true,
  "loadedAt": "2026-01-18T12:00:00Z",
  "loadedPlugins": [
    {
      "name": "specweave",
      "loadedAt": "2026-01-18T12:00:00Z",
      "trigger": "User mentioned 'increment'",
      "skillCount": 50
    }
  ],
  "cachedPlugins": [
    "specweave", "specweave-github", "specweave-jira", "specweave-ado",
    "specweave-frontend", "specweave-backend", "specweave-infrastructure",
    "specweave-ml", "specweave-kafka", "specweave-k8s", "specweave-mobile",
    "specweave-payments", "specweave-release", "specweave-testing",
    "specweave-diagrams", "specweave-confluent", "specweave-ui"
  ],
  "analytics": {
    "totalLoads": 42,
    "avgLoadTimeMs": 850,
    "tokensSaved": 2500000
  }
}
```

---

## Out of Scope

1. **Per-skill lazy loading** - Too granular, plugin-level is sufficient
2. **Remote skill hosting** - Skills must be local for reliability
3. **Automatic context compaction** - Handled by Claude Code natively
4. **Real-time token counting** - Use estimates, not exact counts
5. **Cross-machine sync** - Each machine manages its own cache

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hot-reload fails silently | Medium | High | Add verification step after copy |
| Cache becomes stale | Low | Medium | Version tracking + auto-refresh |
| Keyword false positives | Medium | Low | Tune keywords, add negative patterns |
| User confusion about partial load | Medium | Medium | Clear status messages |
| Migration breaks existing work | Low | High | Backup + rollback commands |

---

## Success Metrics

1. **Token savings**: >90% reduction for non-SpecWeave sessions
2. **Load latency**: <2 seconds for full plugin activation
3. **User satisfaction**: No increase in support tickets
4. **Adoption**: >80% of new installs use lazy mode within 3 months
5. **Reliability**: <1% of loads fail to activate skills

---

## References

- [Claude Code 2.1.0 Release Notes](https://hyperdev.matsuoka.com/p/claude-code-210-ships)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [MCP Token Optimization](https://www.geeky-gadgets.com/claude-search-picked-plugin-tools/)
- [Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
