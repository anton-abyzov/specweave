#!/usr/bin/env bash
#
# Heartbeat Overhead Benchmark
#
# Measures CPU and memory overhead of heartbeat process over 5 minutes
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Heartbeat Overhead Benchmark"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create test session
SESSION_ID="bench-heartbeat-$$"
echo "Creating test session: $SESSION_ID"
node dist/src/cli/register-session.js "$SESSION_ID" $$ "benchmark"

# Start heartbeat in background
echo "Starting heartbeat process..."
bash plugins/specweave/scripts/heartbeat.sh "$SESSION_ID" > /dev/null 2>&1 &
HEARTBEAT_PID=$!

echo "Heartbeat PID: $HEARTBEAT_PID"
sleep 2

# Verify heartbeat is running
if ! kill -0 $HEARTBEAT_PID 2>/dev/null; then
  echo "❌ Heartbeat process failed to start"
  exit 1
fi

echo "✅ Heartbeat running"
echo ""

# Monitor CPU and memory for 5 minutes
echo "Monitoring heartbeat overhead for 5 minutes..."
echo "Time (s),CPU (%),Memory (MB)" > tests/performance/heartbeat-metrics.csv

DURATION=300  # 5 minutes
INTERVAL=5    # Sample every 5 seconds
SAMPLES=$((DURATION / INTERVAL))

for ((i=0; i<SAMPLES; i++)); do
  ELAPSED=$((i * INTERVAL))

  # Get CPU and memory (platform-specific)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CPU=$(ps -p $HEARTBEAT_PID -o %cpu= 2>/dev/null | tr -d ' ' || echo "0")
    MEM=$(ps -p $HEARTBEAT_PID -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "0")
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CPU=$(ps -p $HEARTBEAT_PID -o %cpu= 2>/dev/null | tr -d ' ' || echo "0")
    MEM=$(ps -p $HEARTBEAT_PID -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "0")
  else
    # Windows or other
    CPU="0"
    MEM="0"
  fi

  echo "$ELAPSED,$CPU,$MEM" >> tests/performance/heartbeat-metrics.csv

  # Print progress
  if [ $((i % 6)) -eq 0 ]; then
    echo "  Progress: ${ELAPSED}s / ${DURATION}s (CPU: ${CPU}%, Mem: ${MEM} MB)"
  fi

  sleep $INTERVAL
done

echo ""
echo "✅ Monitoring complete"
echo ""

# Calculate statistics
echo "Calculating statistics..."
STATS=$(tail -n +2 tests/performance/heartbeat-metrics.csv | awk -F',' '
{
  if (NR == 1) {
    min_cpu = max_cpu = $2
    min_mem = max_mem = $3
  }
  sum_cpu += $2
  sum_mem += $3
  if ($2 < min_cpu) min_cpu = $2
  if ($2 > max_cpu) max_cpu = $2
  if ($3 < min_mem) min_mem = $3
  if ($3 > max_mem) max_mem = $3
  count++
}
END {
  printf "%.2f,%.2f,%.2f,%.2f,%.2f,%.2f", sum_cpu/count, min_cpu, max_cpu, sum_mem/count, min_mem, max_mem
}')

IFS=',' read -r AVG_CPU MIN_CPU MAX_CPU AVG_MEM MIN_MEM MAX_MEM <<< "$STATS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Heartbeat Overhead Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "CPU Usage:"
echo "  Average: ${AVG_CPU}%"
echo "  Min:     ${MIN_CPU}%"
echo "  Max:     ${MAX_CPU}%"
echo ""
echo "Memory Usage:"
echo "  Average: ${AVG_MEM} MB"
echo "  Min:     ${MIN_MEM} MB"
echo "  Max:     ${MAX_MEM} MB"
echo ""

# Compare to baselines
BASELINE_CPU=1
BASELINE_MEM=10

if (( $(echo "$MAX_CPU > $BASELINE_CPU" | bc -l) )); then
  echo "⚠️  CPU exceeds baseline (${MAX_CPU}% > ${BASELINE_CPU}%)"
else
  echo "✅ CPU within baseline"
fi

if (( $(echo "$MAX_MEM > $BASELINE_MEM" | bc -l) )); then
  echo "⚠️  Memory exceeds baseline (${MAX_MEM} MB > ${BASELINE_MEM} MB)"
else
  echo "✅ Memory within baseline"
fi

echo ""

# Clean up
kill $HEARTBEAT_PID 2>/dev/null || true
node dist/src/cli/remove-session.js "$SESSION_ID" 2>/dev/null || true

echo "✅ Benchmark complete"
echo "📊 Raw data: tests/performance/heartbeat-metrics.csv"
echo ""
