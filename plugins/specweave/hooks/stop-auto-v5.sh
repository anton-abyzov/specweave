#!/bin/bash
# stop-auto-v5.sh - Auto Mode Stop Hook (v5.0 - Gate Only)
# ADR-0225: "Increments ARE the state. Hooks ARE the sync."
# Hook = simple gate. Quality gates (tests, build, coverage) belong in /sw:done.
# Sourceable: set __STOP_AUTO_V5_SOURCED=1 to load functions only.
set +e

# ── Timing ───────────────────────────────────────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then _START_MS=$(($(date +%s) * 1000))
else _START_MS=$(($(date +%s) * 1000 + $(date +%N 2>/dev/null | cut -c1-3 || echo "0"))); fi
_get_duration_ms() {
    local n; if [[ "$OSTYPE" == "darwin"* ]]; then n=$(($(date +%s) * 1000))
    else n=$(($(date +%s) * 1000 + $(date +%N 2>/dev/null | cut -c1-3 || echo "0"))); fi
    echo $((n - _START_MS))
}

# ── Stdin & paths ────────────────────────────────────────────────────────
[ -z "${__STOP_AUTO_V5_SOURCED:-}" ] && cat > /dev/null

# Project root detection (walk up to find .specweave/ — prevents pollution of subdirectories)
if [[ -n "${PROJECT_ROOT:-}" ]] && [[ -d "$PROJECT_ROOT/.specweave" ]]; then
    : # env var already set and valid
else
    PROJECT_ROOT="$PWD"
    while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
        PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
    done
fi

# Not a SpecWeave project — approve and exit (MUST be before any mkdir)
if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
    echo '{"decision":"approve"}'
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/log-decision.sh" ] && source "$SCRIPT_DIR/log-decision.sh"

SW="$PROJECT_ROOT/.specweave"
STATE_DIR="$SW/state"
LOGS_DIR="$SW/logs"
LOG_FILE="$LOGS_DIR/stop-auto.log"

log() {
    mkdir -p "$LOGS_DIR" 2>/dev/null
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOG_FILE" 2>/dev/null
    [ "${SPECWEAVE_DEBUG_HOOKS:-0}" = "1" ] && echo -e "\033[36m[stop-auto-v5]\033[0m $1" >&2
}

# ── Helpers ──────────────────────────────────────────────────────────────
count_pending_tasks() {
    local f="$1"; [ ! -f "$f" ] && echo "0" && return
    local c; c=$(grep -c '\[ \]' "$f" 2>/dev/null) || true; echo "${c:-0}"
}
count_completed_tasks() {
    local f="$1"; [ ! -f "$f" ] && echo "0" && return
    local c; c=$(grep -c '\[x\]' "$f" 2>/dev/null) || true; echo "${c:-0}"
}
count_open_acs() {
    local f="$1"; [ ! -f "$f" ] && echo "0" && return
    local c; c=$(grep -c '\[ \]' "$f" 2>/dev/null) || true; echo "${c:-0}"
}
get_next_task_title() {
    local f="$1"; [ ! -f "$f" ] && echo "" && return
    local lnum; lnum=$(grep -n '\[ \]' "$f" 2>/dev/null | head -1 | cut -d: -f1)
    [ -z "$lnum" ] && echo "" && return
    # Search backwards from [ ] line to find ### T-NNN: Title heading
    local title; title=$(head -n "$lnum" "$f" | grep '### T-' | tail -1 | sed 's/^### T-[0-9]*: //')
    echo "${title}" | head -c 80
}
silent_approve() {
    local reason="$1" rc="${2:-session_inactive}" ctx="${3:-"{}"}"
    log "APPROVE: $reason"
    type log_decision &>/dev/null && log_decision "stop-auto" "approve" "$rc" "$reason" "$ctx" "$(_get_duration_ms)"
    echo '{"decision":"approve"}'; exit 0
}
loud_approve() {
    local reason="$1" rc="${2:-session_complete}" ctx="${3:-"{}"}" msg="$4"
    log "APPROVE (loud): $reason"
    type log_decision &>/dev/null && log_decision "stop-auto" "approve" "$rc" "$reason" "$ctx" "$(_get_duration_ms)"
    jq -n --arg d "approve" --arg r "$reason" --arg m "$msg" '{decision:$d,reason:$r,systemMessage:$m}'; exit 0
}
block() {
    local reason="$1" rc="${2:-work_remaining}" ctx="${3:-"{}"}" msg="$4"
    log "BLOCK: $reason"
    type log_decision &>/dev/null && log_decision "stop-auto" "block" "$rc" "$reason" "$ctx" "$(_get_duration_ms)"
    jq -n --arg d "block" --arg r "$reason" --arg m "$msg" '{decision:$d,reason:$r,systemMessage:$m}'; exit 0
}

# ── Source-only guard ────────────────────────────────────────────────────
[ "${__STOP_AUTO_V5_SOURCED:-}" = "1" ] && return 0 2>/dev/null || true
[ "${__STOP_AUTO_V5_SOURCED:-}" = "1" ] && exit 0

# ═════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════
INC_DIR="$SW/increments"
CFG="$SW/config.json"
SESSION="$STATE_DIR/auto-mode.json"
TURN_FILE="$STATE_DIR/.stop-auto-turns"
DEDUP_PREV="$STATE_DIR/.stop-auto-dedup-prev"

# 1. Quick exits
[ ! -d "$SW" ] && silent_approve "Not a SpecWeave project" "not_specweave_project"
[ ! -d "$INC_DIR" ] && silent_approve "No increments directory" "no_increments_dir"

# 2. Config
MAX_TURNS=20; MAX_AGE=7200; AUTO_ON="true"; DEDUP_WIN="${SPECWEAVE_STOP_HOOK_DEDUP:-30}"
if [ -f "$CFG" ]; then
    AUTO_ON=$(jq -r '.auto.enabled // true' "$CFG" 2>/dev/null || echo "true")
    MAX_TURNS=$(jq -r '.auto.maxTurns // 20' "$CFG" 2>/dev/null || echo "20")
    MAX_AGE=$(jq -r '.auto.maxSessionAge // 7200' "$CFG" 2>/dev/null || echo "7200")
fi
[ "$AUTO_ON" != "true" ] && silent_approve "Auto mode disabled" "auto_disabled"

# 3. Session marker
[ ! -f "$SESSION" ] && silent_approve "No auto session" "session_inactive" '{"sessionActive":false}'
ACTIVE=$(jq -r '.active // false' "$SESSION" 2>/dev/null || echo "false")
[ "$ACTIVE" != "true" ] && silent_approve "Session not active" "session_inactive" '{"sessionActive":false}'

# 4. Staleness
MTIME=$(stat -f%m "$SESSION" 2>/dev/null || stat -c%Y "$SESSION" 2>/dev/null || echo "0")
NOW=$(date +%s); AGE=$((NOW - MTIME))
if [ "$AGE" -gt "$MAX_AGE" ]; then
    rm -f "$SESSION" "$DEDUP_PREV" "$TURN_FILE" 2>/dev/null
    silent_approve "Stale session (${AGE}s)" "session_stale" \
        "$(jq -n --argjson a "$AGE" --argjson m "$MAX_AGE" '{sessionAge:$a,maxSessionAge:$m}')"
fi
touch "$SESSION" 2>/dev/null

# 5. Turn counter (never resets during session)
TURN=1
if [ -f "$TURN_FILE" ]; then
    S=$(cat "$TURN_FILE" 2>/dev/null || echo "0")
    [[ "$S" =~ ^[0-9]+$ ]] && TURN=$((S + 1))
fi
mkdir -p "$STATE_DIR" 2>/dev/null
echo "$TURN" > "$TURN_FILE.tmp" && mv "$TURN_FILE.tmp" "$TURN_FILE" 2>/dev/null

if [ "$TURN" -ge "$MAX_TURNS" ]; then
    rm -f "$SESSION" "$DEDUP_PREV" "$TURN_FILE" 2>/dev/null
    loud_approve "Turn limit ($TURN/$MAX_TURNS)" "turn_limit" \
        "$(jq -n --argjson c "$TURN" --argjson m "$MAX_TURNS" '{turn:{current:$c,max:$m}}')" \
        "Turn limit reached ($TURN/$MAX_TURNS). Run /sw:auto to start a new session."
fi

# 6. Dedup (write-first prevents race)
if [ -f "$DEDUP_PREV" ]; then
    LAST=$(cat "$DEDUP_PREV" 2>/dev/null || echo "0")
    EL=$((NOW - LAST))
    if [ "$EL" -lt "$DEDUP_WIN" ]; then
        silent_approve "Deduplicated (${EL}s)" "deduplicated" \
            "$(jq -n --argjson e "$EL" --argjson w "$DEDUP_WIN" '{elapsed:$e,dedupWindow:$w}')"
    fi
fi
echo "$NOW" > "$DEDUP_PREV" 2>/dev/null

# 7. Read userGoal from session marker
USER_GOAL=$(jq -r '.userGoal // ""' "$SESSION" 2>/dev/null || echo "")

# 8. Scan active increments (enriched: next task, progress fraction)
TP=0; TAC=0; IC=0; ILIST=""
_SCORE_SCRIPT="$SCRIPT_DIR/lib/score-increment.sh"
for meta in $(find "$INC_DIR" -maxdepth 2 -name "metadata.json" 2>/dev/null); do
    st=$(jq -r '.status // "unknown"' "$meta" 2>/dev/null || echo "unknown")
    [ "$st" != "active" ] && [ "$st" != "in-progress" ] && continue
    d=$(dirname "$meta"); id=$(basename "$d")
    p=$(count_pending_tasks "$d/tasks.md"); a=$(count_open_acs "$d/spec.md")
    if [ "$p" -gt 0 ] || [ "$a" -gt 0 ]; then
        TP=$((TP + p)); TAC=$((TAC + a)); IC=$((IC + 1))
        # Extract next pending task title (first [ ] line, strip markdown)
        _next_task=$(grep -m1 '\[ \]' "$d/tasks.md" 2>/dev/null | sed 's/.*\] //' | head -c 80 || echo "")
        # Count completed tasks for progress fraction
        _done=$(grep -c '\[x\]' "$d/tasks.md" 2>/dev/null) || _done=0
        _total=$((_done + p))
        # Score against userGoal if set and scoring script available
        _score=""
        if [ -n "$USER_GOAL" ] && [ -f "$_SCORE_SCRIPT" ]; then
            _score=$(bash "$_SCORE_SCRIPT" "$d" "$USER_GOAL" 2>/dev/null || echo "0")
        fi
        # Extended ILIST format: id|pending|acs|next_task|done|total|score
        _entry="$id|$p|$a|$_next_task|$_done|$_total|${_score:-0}"
        [ -z "$ILIST" ] && ILIST="$_entry" || ILIST="$ILIST,$_entry"
    fi
done

# 9. All complete → approve
if [ "$IC" -eq 0 ]; then
    rm -f "$SESSION" "$DEDUP_PREV" "$TURN_FILE" 2>/dev/null
    loud_approve "All work complete" "all_complete" \
        "$(jq -n --argjson t "$TURN" '{turn:$t}')" \
        "All tasks and ACs complete. Run /sw:done to close the increment."
fi

# 10. Work remains → block with enriched context message
# Sort entries by score descending (highest-relevance first) when userGoal is set
SORTED_ILIST="$ILIST"
if [ -n "$USER_GOAL" ] && [ "$IC" -gt 1 ]; then
    # Sort by score field (7th field) descending
    SORTED_ILIST=$(echo "$ILIST" | tr ',' '\n' | sort -t'|' -k7 -nr | tr '\n' ',')
    SORTED_ILIST="${SORTED_ILIST%,}"  # trim trailing comma
fi

DETAILS=""
_BEST_ID=""
IFS=',' read -ra ENTRIES <<< "$SORTED_ILIST"
for entry in "${ENTRIES[@]}"; do
    IFS='|' read -r eid ep ea enext edone etotal escore <<< "$entry"
    [ -z "$_BEST_ID" ] && _BEST_ID="$eid"
    _progress="${edone:-0}/${etotal:-0} tasks"
    _next_info=""
    [ -n "$enext" ] && _next_info=" | Next: $enext"
    DETAILS="${DETAILS}\n  ▸ ${eid}: ${_progress}${_next_info}"
done

# Build enriched block message
BMSG=""
[ -n "$USER_GOAL" ] && BMSG="Goal: ${USER_GOAL}\n"
BMSG="${BMSG}Auto Mode: ${IC} increment(s) need work${DETAILS}"
BMSG="${BMSG}\nTurn $TURN/$MAX_TURNS | Continue: /sw:do ${_BEST_ID}"
BMSG=$(echo -e "$BMSG")

block "Work remaining: $TP tasks, $TAC ACs" "work_remaining" \
    "$(jq -n --argjson p "$TP" --argjson a "$TAC" --argjson i "$IC" \
        --argjson t "$TURN" --argjson mt "$MAX_TURNS" --arg il "$ILIST" \
        --arg goal "$USER_GOAL" --arg best "$_BEST_ID" \
        '{pendingTasks:$p,openAcs:$a,incompleteIncrements:$i,increments:$il,turn:{current:$t,max:$mt},userGoal:$goal,recommended:$best}')" \
    "$BMSG"
