# Troubleshooting: Zombie Processes

**Automated since**: v0.33.0
**Status**: ✅ Self-healing system

## Overview

SpecWeave includes automated zombie process prevention. This guide covers troubleshooting when the automatic cleanup fails.

## Quick Diagnosis

### Check Session Registry

```bash
# View active sessions
cat .specweave/state/.session-registry.json | jq '.sessions'

# Count active sessions
cat .specweave/state/.session-registry.json | jq '.sessions | length'

# Find stale sessions
node dist/src/cli/cleanup-zombies.js --dry-run 60
```

### Check Logs

```bash
# Session tracking
ls -lh .specweave/logs/sessions/

# Cleanup activity
tail -50 .specweave/logs/cleanup.log

# Heartbeat status
tail -20 .specweave/logs/heartbeat-*.log
```

### Check Running Processes

```bash
# Find Claude processes
pgrep -f "claude" | xargs ps -p

# Find session-watchdog daemons
pgrep -f "session-watchdog.*--daemon"

# Find zombies by pattern
pgrep -f "cat.*EOF"
pgrep -f "esbuild.*--service"
```

## Common Issues

### Issue 1: Zombies Persist >5 Minutes

**Symptoms**: Processes remain after session ends

**Diagnosis**:
```bash
# Check if watchdog is running
pgrep -f "session-watchdog"

# Check registry for stale sessions
node dist/src/cli/cleanup-zombies.js --dry-run 60
```

**Solution**:
```bash
# Start watchdog if not running
bash plugins/specweave/scripts/session-watchdog.sh --daemon &

# Or manually clean up
node dist/src/cli/cleanup-zombies.js 60
```

### Issue 2: Multiple Watchdogs Running

**Symptoms**: 3+ session-watchdog processes

**Diagnosis**:
```bash
pgrep -af "session-watchdog.*--daemon"
```

**Solution**:
```bash
# Kill all watchdogs
pkill -f "session-watchdog.*--daemon"

# Start one watchdog
bash plugins/specweave/scripts/session-watchdog.sh --daemon &
```

### Issue 3: Heartbeat Process Stuck

**Symptoms**: Heartbeat log not updating

**Diagnosis**:
```bash
# Find heartbeat processes
pgrep -af "heartbeat.sh"

# Check log timestamps
ls -lt .specweave/logs/heartbeat-*.log | head -5
```

**Solution**:
```bash
# Kill stuck heartbeats
pkill -f "heartbeat.sh"

# Registry will be cleaned up by watchdog
```

### Issue 4: Registry Corrupted

**Symptoms**: Errors reading `.session-registry.json`

**Diagnosis**:
```bash
# Validate JSON
cat .specweave/state/.session-registry.json | jq .

# Check for backups
ls -lt .specweave/state/.session-registry.json.corrupted.*
```

**Solution**:
```bash
# Registry auto-repairs on next access
# Or manually reset
mv .specweave/state/.session-registry.json .specweave/state/.session-registry.json.bak
node dist/src/cli/register-session.js "recovery-$$" $$ "claude-code"
```

### Issue 5: Cleanup Not Running

**Symptoms**: No cleanup activity in logs

**Diagnosis**:
```bash
# Check watchdog status
pgrep -af "session-watchdog"

# Check last cleanup timestamp
cat .specweave/state/.session-registry.json | jq '.last_cleanup'
```

**Solution**:
```bash
# Restart watchdog
pkill -f "session-watchdog"
bash plugins/specweave/scripts/session-watchdog.sh --daemon &
```

## Manual Recovery

### Full System Reset

```bash
# 1. Kill all SpecWeave processes
pkill -f "claude"
pkill -f "session-watchdog"
pkill -f "heartbeat.sh"
pkill -f "cat.*EOF"
pkill -9 -f "esbuild.*--service"

# 2. Clean state
rm -f .specweave/state/.session-registry.json
rm -f .specweave/state/*.lock
rm -rf .specweave/state/.dedup-cache

# 3. Clean logs (optional)
rm -f .specweave/logs/heartbeat-*.log
rm -f .specweave/logs/cleanup.log

# 4. Restart Claude Code
# Session tracking will re-initialize automatically
```

### Emergency Cleanup Script

```bash
#!/bin/bash
# emergency-zombie-cleanup.sh

echo "🚨 Emergency Zombie Cleanup"

# Kill zombies by pattern
patterns=(
  "cat.*EOF"
  "esbuild.*--service.*--ping"
  "session-watchdog.*--daemon"
  "heartbeat.sh"
)

for pattern in "${patterns[@]}"; do
  pids=$(pgrep -f "$pattern" || echo "")
  if [ -n "$pids" ]; then
    echo "Killing: $pattern"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done

echo "✅ Cleanup complete"
```

## Debugging

### Enable Debug Logging

```bash
# Set debug level
export SPECWEAVE_LOG_LEVEL=debug

# Run cleanup with verbose output
node dist/src/cli/cleanup-zombies.js 60
```

### Check Hook Execution

```bash
# View hook logs
cat .specweave/logs/hooks.log

# Test SessionStart hook
bash plugins/specweave/hooks/v2/session-start.sh

# Test SessionEnd hook
bash plugins/specweave/hooks/v2/session-end.sh
```

### Monitor in Real-Time

```bash
# Watch session registry
watch -n 5 'cat .specweave/state/.session-registry.json | jq ".sessions | length"'

# Tail cleanup log
tail -f .specweave/logs/cleanup.log

# Monitor processes
watch -n 5 'pgrep -af "claude\|watchdog\|heartbeat"'
```

## Prevention

### Best Practices

1. **Always exit Claude Code cleanly** (Ctrl+C or `/exit`)
2. **Monitor system resources** periodically
3. **Update SpecWeave** regularly for fixes
4. **Review logs** after crashes

### Health Checks

```bash
# Add to crontab (runs every hour)
0 * * * * cd /path/to/project && node dist/src/cli/cleanup-zombies.js 120
```

### Watchdog as System Service (optional)

```bash
# macOS (launchd)
# Create ~/Library/LaunchAgents/com.specweave.watchdog.plist

# Linux (systemd)
# Create ~/.config/systemd/user/specweave-watchdog.service
```

## References

- **Architecture**: `.specweave/docs/internal/architecture/adr/0141-session-registry-zombie-prevention.md`
- **Code**: `src/utils/session-registry.ts`, `src/cli/cleanup-zombies.ts`
- **CLAUDE.md**: "Zombie Processes" section
- **Support**: https://github.com/anthropics/specweave/issues
