# Performance Benchmarks

Performance benchmark suite for process lifecycle management (zombie prevention system).

## Benchmarks

### 1. Session Registry Performance

Measures registry update latency over 1000 iterations.

**Run**:
```bash
ts-node tests/performance/session-registry-bench.ts
```

**Metrics**:
- Average latency
- P50, P95, P99 latencies
- Min/max values

**Baseline** (from `baselines.json`):
- P50: 5ms
- P95: 15ms
- P99: 25ms

### 2. Heartbeat Overhead

Measures CPU and memory overhead of heartbeat process over 5 minutes.

**Run**:
```bash
bash tests/performance/heartbeat-overhead-bench.sh
```

**Metrics**:
- CPU usage (%)
- Memory usage (MB)
- Sampled every 5 seconds

**Baseline**:
- CPU: <1%
- Memory: <10 MB

### 3. Cleanup Service Scan Time

Measures cleanup service performance with 10, 50, and 100 sessions.

**Run**:
```bash
ts-node tests/performance/session-registry-bench.ts
```

**Metrics**:
- Scan time per session count
- Total cleanup time

**Baselines**:
- 10 sessions: 100ms
- 50 sessions: 300ms
- 100 sessions: 500ms

## Baseline Comparison

Compare results to baselines and detect regressions:

```bash
ts-node tests/performance/compare-to-baseline.ts
```

**Regression Threshold**: 20% (configurable in `baselines.json`)

## Running All Benchmarks

```bash
# Run registry benchmarks
ts-node tests/performance/session-registry-bench.ts

# Run heartbeat benchmark (takes 5 minutes)
bash tests/performance/heartbeat-overhead-bench.sh

# Compare to baselines
ts-node tests/performance/compare-to-baseline.ts
```

## Results

Results are saved to:
- `tests/performance/results.json` - Registry benchmark results
- `tests/performance/heartbeat-metrics.csv` - Heartbeat overhead data

## Interpreting Results

### Registry Update Latency

- **P50 < 5ms**: Excellent
- **P95 < 15ms**: Good
- **P99 < 25ms**: Acceptable
- **>20% slower**: Performance regression detected

### Heartbeat Overhead

- **CPU < 1%**: Excellent
- **Memory < 10MB**: Good
- **Higher values**: May indicate issues with heartbeat implementation

### Cleanup Scan Time

Should scale linearly with session count:
- 10 sessions: ~100ms
- 50 sessions: ~300ms (3x)
- 100 sessions: ~500ms (5x)

Non-linear scaling may indicate O(n²) complexity issues.

## CI Integration

Benchmarks can be integrated into CI to catch regressions:

```yaml
- name: Run performance benchmarks
  run: |
    ts-node tests/performance/session-registry-bench.ts
    ts-node tests/performance/compare-to-baseline.ts
```

## Updating Baselines

If performance improvements are made intentionally, update `baselines.json`:

```bash
# Run benchmarks
ts-node tests/performance/session-registry-bench.ts

# Review results
cat tests/performance/results.json

# Update baselines manually in baselines.json
```
