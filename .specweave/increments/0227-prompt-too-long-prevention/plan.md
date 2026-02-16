# Architecture: Prompt-Too-Long Prevention

## Design

### Data Flow

```
Session Start → prompt-health.json → FileWatcher → SSE → Dashboard
PreCompact    → context-pressure.json + prompt-health-alert.json → FileWatcher → SSE → Dashboard
UserPromptSubmit → reads pressure → emergency budget → stripped context
```

### Key Decisions

1. **Session-start (not per-turn)** for health check — components measured don't change mid-session
2. **File-based state** — hooks are bash processes, dashboard is Node.js; file + FSWatcher is the established pattern
3. **Emergency level** — new pressure level beyond critical; 3+ compactions = nuclear option (budget=off)
4. **Reuse existing SSE** — `error-detected` event type already defined in types, just not wired

### Files Modified

| File | Change |
|------|--------|
| `plugins/specweave/hooks/v2/dispatchers/session-start.sh` | Baseline health check |
| `plugins/specweave/hooks/pre-compact.sh` | Emergency level + alert file |
| `plugins/specweave/hooks/user-prompt-submit.sh` | Emergency budget handling |
| `src/dashboard/server/file-watcher.ts` | Watch prompt-health files |
| `src/dashboard/client/src/pages/ErrorsPage.tsx` | useSSE subscription |
| `src/dashboard/server/dashboard-server.ts` | `/api/prompt-health` endpoint |
| `src/dashboard/client/src/pages/OverviewPage.tsx` | PromptHealthCard widget |
