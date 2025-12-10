# Fix: "Claude Code Stuck" Red Alert Icon Notification

**Incident Date**: 2025-12-10
**Severity**: RESOLVED
**Root Cause**: Old cached plugin version (v0.25.0) with buggy notification

---

## Symptoms

User received notification with **RED ALERT ICON**:
- **Title**: "🚨 Claude Code Stuck"
- **Message**: Vague context
- **Icon**: Red alert badge in macOS notification center
- **Sound**: "Basso" (alarming)

---

## Root Cause Analysis

### 1. **Old Plugin Cache**
```bash
# Multiple watchdog processes from different versions:
/Users/anton.abyzov/.claude/plugins/cache/specweave/specweave/0.25.0/scripts/session-watchdog.sh (BAD)
/Users/anton.abyzov/Projects/specweave/plugins/specweave/scripts/session-watchdog.sh (GOOD)
```

### 2. **Buggy Notification Code (v0.25.0)**
```bash
# OLD version violates CLAUDE.md Section 11:
send_notification() {
  local title="$1"
  local message="$2"

  # ❌ VIOLATION: Uses "Basso" sound → RED ALERT ICON!
  osascript -e "display notification \"$message\" with title \"$title\" sound name \"Basso\""

  # ❌ VIOLATION: Uses critical urgency on Linux
  notify-send "$title" "$message" --urgency=critical
}

# Triggered by:
send_notification "🚨 Claude Code Stuck" "$reason_str - Run cleanup-state.sh"
```

**Violations of [CLAUDE.md:529-597](../../CLAUDE.md#L529-L597)**:
1. ❌ **Uses "Basso" sound** → Triggers RED ALERT ICON in macOS
2. ❌ **Emoji in title** → Alarming appearance
3. ❌ **Vague message** → No WHO/WHAT/ACTION context
4. ❌ **No fire-and-forget** → Potentially blocking
5. ❌ **Critical urgency** → Bypasses Do Not Disturb on Linux

### 3. **Fixed Version (v0.33.6+)**
```bash
# NEW version follows CLAUDE.md guidelines:
send_notification() {
  local severity="$1"
  local title="$2"
  local message="$3"

  # ✅ Only notify for CRITICAL severity (not warnings)
  if [[ "$severity" -lt "$SEVERITY_CRITICAL" ]]; then
    return
  fi

  # ✅ Uses "Submarine" sound (deep but calm, NO red icon)
  osascript -e "display notification \"$message\" with title \"$title\" sound name \"Submarine\""

  # ✅ Uses normal urgency on Linux
  notify-send "$title" "$message" --urgency=normal
}
```

---

## Fix Applied

### Step 1: Kill Old Watchdogs
```bash
pkill -f "session-watchdog.sh"
# Stopped 3 processes (2 old cached versions, 1 current)
```

### Step 2: Remove Cached Plugins
```bash
rm -rf /Users/anton.abyzov/.claude/plugins/cache/specweave
# Removed all cached plugin versions
```

### Step 3: Refresh Marketplace
```bash
bash scripts/refresh-marketplace.sh
# Installed latest plugins (25/26 succeeded, core plugin N/A in dev mode)
```

### Step 4: Verification
```bash
# No more SpecWeave watchdogs running
ps aux | grep -i watchdog | grep -v grep
# Only system watchdogs (Parallels, Teams, macOS)
```

---

## Prevention Strategy

### 1. **Notification Standards Enforcement** (CLAUDE.md Section 11)

**All notifications MUST:**
- Start with "SpecWeave:" (WHO)
- Describe specific action (WHAT)
- Include action guidance (ACTION)
- Use **ONLY** these sounds:
  - `Pop` - Success, completion
  - `Glass` - Informational
  - `Submarine` - Warning OR error (NOT "Basso"!)
- Use **fire-and-forget** pattern (no `await` or `execSync`)

**Example from [src/utils/notification-constants.ts](../../src/utils/notification-constants.ts)**:
```typescript
export const NotificationSounds = {
  SUCCESS: 'Pop',
  INFO: 'Glass',
  WARNING: 'Submarine',
  CRITICAL: 'Submarine',  // NOT "Basso"!
} as const;
```

### 2. **Severity-Based Notifications** (v0.33.0+)

Watchdog now uses **severity levels**:
```bash
SEVERITY_INFO=0      # No notification
SEVERITY_WARNING=1   # No notification (logged only)
SEVERITY_CRITICAL=2  # Notification sent
```

**Only CRITICAL issues trigger notifications** (e.g., stuck process confirmed for >5min).

### 3. **False Positive Elimination**

**OLD behavior** (v0.25.0):
- Stale lock file → Immediate notification ❌

**NEW behavior** (v0.33.0+):
- Stale lock file → Check if PID is actually running
- Process running >5min → Warning logged (no notification)
- Process stuck >5min + 3 consecutive checks → Notification

---

## Detection Checklist

If you receive **any** SpecWeave notification with a **red icon**:

1. **Check notification sound**:
   ```bash
   # If "Basso" is mentioned in any notification code:
   grep -r "Basso" plugins/specweave/scripts/
   # MUST be empty! (or show ONLY "NEVER use Basso" comments)
   ```

2. **Check cached plugins**:
   ```bash
   ls -la ~/.claude/plugins/cache/specweave/*/scripts/session-watchdog.sh
   # Should NOT exist (cleaned by refresh-marketplace.sh)
   ```

3. **Verify watchdog version**:
   ```bash
   head -5 plugins/specweave/scripts/session-watchdog.sh
   # MUST show "Session Watchdog v2.0" or higher
   ```

4. **Check sound usage**:
   ```bash
   grep "sound name" plugins/specweave/scripts/session-watchdog.sh
   # MUST be "Submarine" (NOT "Basso")
   ```

---

## Monitoring

### Session Watchdog Health Check
```bash
# Check if watchdog is running (should be 0-1 processes)
ps aux | grep -i "session-watchdog" | grep -v grep | wc -l

# Check watchdog logs (should show v2.0+)
tail -20 .specweave/logs/watchdog.log

# Check diagnostics file (written by watchdog)
cat .specweave/state/.watchdog-diagnostics.json | jq .
```

### Notification Test
```bash
# Test non-alarming notification:
osascript -e 'display notification "Test message" with title "SpecWeave: Test" sound name "Submarine"'

# Verify NO red icon appears in notification center
```

---

## Related Files

- [CLAUDE.md:529-597](../../CLAUDE.md#L529-L597) - Notification guidelines
- [src/utils/notification-constants.ts](../../src/utils/notification-constants.ts) - Standard notification types
- [src/utils/notification-manager.ts](../../src/utils/notification-manager.ts) - Cross-platform sender
- [plugins/specweave/scripts/session-watchdog.sh](../../../plugins/specweave/scripts/session-watchdog.sh) - Watchdog v2.0+

---

## Lessons Learned

1. **Plugin caching is persistent** - Old versions can linger in `~/.claude/plugins/cache/`
2. **Multiple processes can run** - Need cleanup before refresh
3. **"Basso" is poisonous** - Triggers red alert icon, violates user trust
4. **Fire-and-forget is critical** - Blocking notifications freeze sessions
5. **Severity levels prevent spam** - Only critical issues deserve notifications

---

## Status

✅ **RESOLVED** - All old watchdogs killed, cache cleared, marketplace refreshed.

**No further action required** unless red icon appears again.
