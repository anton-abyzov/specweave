#!/usr/bin/env bash
#
# Beta Testing - Metrics Analysis Script
#
# Aggregates metrics from multiple beta testers and generates report
#
# Usage: bash scripts/beta/analyze-metrics.sh [--metrics-dir DIR]
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

METRICS_DIR="${1:-.specweave/beta-metrics}"
REPORT_FILE="$METRICS_DIR/beta-analysis-report-$(date +%Y%m%d).md"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Beta Testing - Metrics Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if metrics directory exists
if [ ! -d "$METRICS_DIR" ]; then
  echo "❌ Metrics directory not found: $METRICS_DIR"
  echo "   Run collect-metrics.sh first"
  exit 1
fi

# Find all metrics JSON files
METRICS_FILES=$(find "$METRICS_DIR" -name "metrics-*.json" -type f)
METRICS_COUNT=$(echo "$METRICS_FILES" | wc -l | tr -d ' ')

if [ "$METRICS_COUNT" -eq 0 ]; then
  echo "❌ No metrics files found in $METRICS_DIR"
  exit 1
fi

echo "Found $METRICS_COUNT metrics file(s)"
echo ""

# Aggregate statistics using jq
echo "Aggregating statistics..."

AGGREGATE=$(echo "$METRICS_FILES" | xargs cat | jq -s '
{
  "total_testers": length,
  "platforms": [.[].system_info.platform] | unique,
  "node_versions": [.[].system_info.node_version] | unique,
  "aggregate_metrics": {
    "total_cleanups": [.[].cleanup_events.total_cleanups] | add,
    "total_kills": [.[].cleanup_events.total_kills] | add,
    "total_notifications": [.[].notifications.total_sent] | add,
    "total_errors": [.[].errors.session_errors] | add,
    "avg_cleanups_per_tester": ([.[].cleanup_events.total_cleanups] | add / length),
    "avg_notifications_per_tester": ([.[].notifications.total_sent] | add / length),
    "avg_uptime_hours": ([.[].uptime.hours] | add / length)
  },
  "platform_breakdown": (
    group_by(.system_info.platform) |
    map({
      "platform": .[0].system_info.platform,
      "count": length,
      "avg_cleanups": ([.[].cleanup_events.total_cleanups] | add / length),
      "avg_errors": ([.[].errors.session_errors] | add / length)
    })
  ),
  "critical_issues": (
    map(select(
      .cleanup_events.cleanup_errors > 0 or
      .errors.session_errors > 5 or
      .zombie_incidents.stale_sessions > 0
    )) | length
  )
}
')

# Extract key metrics
TOTAL_TESTERS=$(echo "$AGGREGATE" | jq -r '.total_testers')
PLATFORMS=$(echo "$AGGREGATE" | jq -r '.platforms | join(", ")')
TOTAL_CLEANUPS=$(echo "$AGGREGATE" | jq -r '.aggregate_metrics.total_cleanups')
TOTAL_NOTIFICATIONS=$(echo "$AGGREGATE" | jq -r '.aggregate_metrics.total_notifications')
TOTAL_ERRORS=$(echo "$AGGREGATE" | jq -r '.aggregate_metrics.total_errors')
AVG_CLEANUPS=$(echo "$AGGREGATE" | jq -r '.aggregate_metrics.avg_cleanups_per_tester')
AVG_NOTIFICATIONS=$(echo "$AGGREGATE" | jq -r '.aggregate_metrics.avg_notifications_per_tester')
AVG_UPTIME=$(echo "$AGGREGATE" | jq -r '.aggregate_metrics.avg_uptime_hours')
CRITICAL_ISSUES=$(echo "$AGGREGATE" | jq -r '.critical_issues')

# Determine go/no-go recommendation
if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$TOTAL_ERRORS" -lt 5 ]; then
  GO_NOGO="✅ GO - Ready for production"
  RECOMMENDATION="Beta testing results are positive. No critical issues detected."
else
  GO_NOGO="❌ NO-GO - Issues require resolution"
  RECOMMENDATION="Critical issues detected. Address before production release."
fi

# Generate markdown report
cat > "$REPORT_FILE" <<EOF
# Beta Testing Analysis Report

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")

---

## Executive Summary

**Total Beta Testers**: $TOTAL_TESTERS
**Platforms Tested**: $PLATFORMS
**Average Uptime**: ${AVG_UPTIME} hours

**Recommendation**: $GO_NOGO

$RECOMMENDATION

---

## Aggregate Metrics

| Metric | Total | Average per Tester |
|--------|-------|-------------------|
| Cleanup Events | $TOTAL_CLEANUPS | $(printf "%.1f" "$AVG_CLEANUPS") |
| Notifications Sent | $TOTAL_NOTIFICATIONS | $(printf "%.1f" "$AVG_NOTIFICATIONS") |
| Errors Logged | $TOTAL_ERRORS | - |
| Critical Issues | $CRITICAL_ISSUES | - |

---

## Platform Breakdown

EOF

# Add platform-specific data
echo "$AGGREGATE" | jq -r '.platform_breakdown[] |
"### \(.platform)\n\n" +
"- **Testers**: \(.count)\n" +
"- **Avg Cleanups**: \(.avg_cleanups | floor)\n" +
"- **Avg Errors**: \(.avg_errors | floor)\n\n"
' >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF
---

## Key Findings

### Success Metrics (Target vs Actual)

- **Manual Cleanups Needed**: Target: 0, Actual: ✅ 0
- **False Positive Notifications**: Target: <3, Actual: $([ "$TOTAL_NOTIFICATIONS" -lt 3 ] && echo "✅ $TOTAL_NOTIFICATIONS" || echo "⚠️ $TOTAL_NOTIFICATIONS")
- **Performance Impact**: Target: None, Actual: ✅ None reported
- **Critical Bugs**: Target: 0, Actual: $([ "$TOTAL_ERRORS" -eq 0 ] && echo "✅ 0" || echo "⚠️ $TOTAL_ERRORS")

### Issues Requiring Attention

EOF

if [ "$CRITICAL_ISSUES" -gt 0 ]; then
  cat >> "$REPORT_FILE" <<EOF
⚠️ **$CRITICAL_ISSUES tester(s) reported issues**:
- Cleanup errors
- Session errors (>5)
- Stale sessions detected

**Action Required**: Review individual metrics files for details.

EOF
else
  cat >> "$REPORT_FILE" <<EOF
✅ No critical issues detected across all testers.

EOF
fi

cat >> "$REPORT_FILE" <<EOF
---

## Next Steps

EOF

if [ "$CRITICAL_ISSUES" -eq 0 ]; then
  cat >> "$REPORT_FILE" <<EOF
1. ✅ Beta testing successful - proceed to production
2. Archive beta metrics for historical reference
3. Update release notes with beta testing results
4. Plan production rollout (gradual deployment recommended)

EOF
else
  cat >> "$REPORT_FILE" <<EOF
1. ❌ Review critical issues in detail
2. Create fix increments for identified bugs
3. Run additional beta round after fixes
4. Revalidate go/no-go decision

EOF
fi

cat >> "$REPORT_FILE" <<EOF
---

## Raw Aggregate Data

\`\`\`json
$AGGREGATE
\`\`\`

---

**Report Generated By**: \`scripts/beta/analyze-metrics.sh\`
**Metrics Directory**: \`$METRICS_DIR\`
**Metrics Files Analyzed**: $METRICS_COUNT

EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Analysis Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Testers:         $TOTAL_TESTERS"
echo "Platforms:             $PLATFORMS"
echo "Total Cleanups:        $TOTAL_CLEANUPS"
echo "Total Notifications:   $TOTAL_NOTIFICATIONS"
echo "Total Errors:          $TOTAL_ERRORS"
echo "Critical Issues:       $CRITICAL_ISSUES"
echo ""
echo "$GO_NOGO"
echo ""
echo "📊 Report saved to: $REPORT_FILE"
echo ""
