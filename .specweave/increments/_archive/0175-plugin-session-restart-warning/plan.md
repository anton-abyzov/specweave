---
increment: 0175-plugin-session-restart-warning
title: "Technical Plan - Plugin Session Restart Warning"
---

# Technical Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Session                       │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │ user-prompt-     │    │   Plugin Installation        │  │
│  │ submit.sh hook   │───▶│   Detector                   │  │
│  └──────────────────┘    │   (new component)            │  │
│                          └──────────────────────────────┘  │
│                                     │                       │
│                                     ▼                       │
│                          ┌──────────────────────────────┐  │
│                          │   Session State Tracker       │  │
│                          │   - pluginsInstalledThisSession│
│                          │   - installationTimestamp      │
│                          │   - projectPath                │
│                          └──────────────────────────────┘  │
│                                     │                       │
│                          ┌──────────┴──────────┐           │
│                          ▼                     ▼           │
│               ┌──────────────────┐  ┌──────────────────┐  │
│               │ Warning Display  │  │ Context Generator │  │
│               │ Component        │  │ Component         │  │
│               └──────────────────┘  └──────────────────┘  │
│                          │                     │           │
│                          └──────────┬──────────┘           │
│                                     ▼                       │
│                          ┌──────────────────────────────┐  │
│                          │   Execution Halter            │  │
│                          │   (stdout + exit signal)      │  │
│                          └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Plugin Installation Detector

**Location**: `src/core/session/plugin-install-detector.ts`

```typescript
interface PluginInstallEvent {
  timestamp: string;
  plugins: string[];
  trigger: 'specweave-init' | 'claude-plugin-install' | 'manual';
  projectPath: string;
}

interface DetectionResult {
  detected: boolean;
  event?: PluginInstallEvent;
}

function detectPluginInstallation(hookOutput: string): DetectionResult;
function parseInstalledPlugins(output: string): string[];
```

**Detection triggers:**
- Output contains "sw installed" or similar success messages
- Output contains "Plugin Installation Complete"
- `specweave init` command ran successfully
- `claude plugin install` command ran

### 2. Session State Tracker

**Location**: `src/core/session/session-state.ts`

```typescript
interface SessionState {
  sessionId: string;
  startTime: string;
  pluginsInstalledDuringSession: string[];
  lastInstallationEvent?: PluginInstallEvent;
  projectPath?: string;
  originalIntent?: string;
}

// State file location: .specweave/state/session-state.json
// Cleared on session start, updated during session
```

### 3. Warning Display Component

**Location**: `src/core/session/restart-warning.ts`

```typescript
interface WarningOptions {
  plugins: string[];
  projectPath: string;
  originalIntent?: string;
}

function formatRestartWarning(options: WarningOptions): string;
function shouldShowWarning(state: SessionState): boolean;
```

**Output format:**
```
════════════════════════════════════════════════════════════════
⚠️  SESSION RESTART REQUIRED
════════════════════════════════════════════════════════════════

Plugins were installed during this session:
  • sw-frontend (React, Vue, frontend expertise)
  • sw-payments (Stripe integration)
  • sw-backend (.NET, Node.js backend expertise)

These plugins are NOT loaded in the current session.
To use specialized skills, you must start a new Claude Code session.

📁 Project location: ~/Projects/react-dash-stripe

📋 To continue in new session:
   1. Open terminal in: ~/Projects/react-dash-stripe
   2. Run: claude
   3. Tell Claude: "Continue building React dashboard with Stripe checkout"

💡 Available skills in new session:
   • /sw:increment - Plan features with PM expertise
   • sw-frontend skills - React architecture, components
   • sw-payments skills - Stripe integration patterns

════════════════════════════════════════════════════════════════
```

### 4. Context Generator

**Location**: `src/core/session/handoff-context.ts`

```typescript
interface HandoffContext {
  summary: string;
  projectPath: string;
  installedPlugins: string[];
  availableSkills: string[];
  continuationPrompt: string;
}

function generateHandoffContext(state: SessionState): HandoffContext;
function formatHandoffText(context: HandoffContext): string;
```

### 5. Hook Integration

**Location**: `.specweave/hooks/user-prompt-submit.sh` (modification)

Add detection logic at the END of the hook:
```bash
# After all other processing...

# Check if plugins were installed this session
if [ -f ".specweave/state/plugins-installed-this-session.flag" ]; then
  # Read installed plugins list
  INSTALLED_PLUGINS=$(cat .specweave/state/installed-plugins.txt 2>/dev/null)

  # Display warning
  specweave session-warning --plugins="$INSTALLED_PLUGINS" --project="$(pwd)"

  # Signal halt (hook returns special exit code or outputs marker)
  echo "::SPECWEAVE_HALT_EXECUTION::"
  exit 0
fi
```

## Data Flow

```
1. User: "Create React dashboard with Stripe"
   │
   ▼
2. Claude runs: specweave init (in new project dir)
   │
   ▼
3. plugin-installer.ts installs plugins
   │
   ├─► Creates: .specweave/state/plugins-installed-this-session.flag
   └─► Writes: .specweave/state/installed-plugins.txt
   │
   ▼
4. Next user-prompt-submit hook runs
   │
   ▼
5. Hook detects flag file
   │
   ▼
6. specweave session-warning command runs
   │
   ▼
7. Warning displayed + execution halted
```

## File Changes

| File | Change Type | Purpose |
|------|-------------|---------|
| `src/core/session/plugin-install-detector.ts` | NEW | Detect plugin installations |
| `src/core/session/session-state.ts` | NEW | Track session state |
| `src/core/session/restart-warning.ts` | NEW | Format warning message |
| `src/core/session/handoff-context.ts` | NEW | Generate continuation context |
| `src/cli/commands/session-warning.ts` | NEW | CLI command for warning |
| `src/cli/helpers/init/plugin-installer.ts` | MODIFY | Write flag file on install |
| Template hooks | MODIFY | Add detection logic |

## Testing Strategy

### Unit Tests
- `plugin-install-detector.test.ts` - Detection logic
- `session-state.test.ts` - State management
- `restart-warning.test.ts` - Warning formatting
- `handoff-context.test.ts` - Context generation

### Integration Tests
- Full flow: init → detect → warn → halt
- Hook integration tests
- Cross-platform tests (macOS, Linux, Windows)

### E2E Tests
- Simulate actual Claude session with plugin install
- Verify warning appears correctly
- Verify handoff context is usable

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| False positives | Check multiple signals, not just flag file |
| Hooks not running | Fall back to detection in plugin-installer output |
| State file corruption | Use atomic writes, validate JSON |
| Different project paths | Normalize paths, use absolute paths |
| IDE vs CLI differences | Test both environments |

## ADR Reference

Consider creating ADR for:
- Session state management approach
- Hook-based vs inline detection
- Warning format standardization
