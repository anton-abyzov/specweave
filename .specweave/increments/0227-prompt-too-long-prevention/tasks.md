# Tasks: 0227-prompt-too-long-prevention

## US-001: Proactive Prompt Health Check

### T-001: Session-start baseline health check
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Test**: Given a project with CLAUDE.md (9KB), MEMORY.md (4KB), skill budget 30K → When session starts → Then prompt-health.json written with baseline=58000, warningLevel="normal"
**Test**: Given baseline > 80K → When session starts → Then systemMessage contains "PROMPT HEALTH" warning
**Test**: Given baseline > 120K → When session starts → Then systemMessage contains "CRITICAL" with remediation advice

**File**: `plugins/specweave/hooks/v2/dispatchers/session-start.sh`

---

## US-002: Emergency Context Budget Escalation

### T-002: Emergency level in PreCompact hook
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given 2 prior compactions → When PreCompact fires 3rd time → Then context-pressure.json level="emergency"
**Test**: Given any compaction → When PreCompact fires → Then prompt-health-alert.json written with advice string

**File**: `plugins/specweave/hooks/pre-compact.sh`

### T-003: Emergency budget in UserPromptSubmit
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03, AC-US2-04 | **Status**: [x] completed
**Test**: Given context-pressure.json level="emergency" → When UserPromptSubmit runs → Then BUDGET_LEVEL="off" and context assembly skipped
**Test**: Given budget auto-adapted to "off" → When context assembled → Then remediation message appended once

**File**: `plugins/specweave/hooks/user-prompt-submit.sh`

---

## US-003: Real-Time Error Broadcasting in Dashboard

### T-004: Wire error-detected SSE events in FileWatcher
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Test**: Given FileWatcher initialized → When prompt-health.json changes → Then `error-detected` SSE event emitted
**Test**: Given FileWatcher initialized → When prompt-health-alert.json changes → Then `error-detected` SSE event emitted

**File**: `src/dashboard/server/file-watcher.ts`

### T-005: ErrorsPage real-time refresh via useSSE
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed
**Test**: Given ErrorsPage mounted → When `error-detected` SSE event received → Then error data re-fetched

**File**: `src/dashboard/client/src/pages/ErrorsPage.tsx`

### T-006: Prompt health API endpoint and OverviewPage widget
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03, AC-US3-04 | **Status**: [x] completed
**Test**: Given prompt-health.json exists → When GET /api/prompt-health → Then response contains health breakdown
**Test**: Given OverviewPage mounted → When prompt-health data available → Then PromptHealthCard renders with baseline bar

**File**: `src/dashboard/server/dashboard-server.ts`, `src/dashboard/client/src/pages/OverviewPage.tsx`
