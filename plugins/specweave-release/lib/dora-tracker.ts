/**
 * DORA Metrics Persistent Tracking
 *
 * Stores DORA metrics in append-only JSONL format for historical tracking and trending
 *
 * Features:
 * - Append-only JSONL storage (.specweave/metrics/dora-history.jsonl)
 * - Trend calculation (7-day, 30-day, 90-day rolling averages)
 * - Degradation detection (alert if metrics worsen >20%)
 * - Living docs integration (auto-update dashboard)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface DORAMetric {
  value: number;
  unit: string;
  tier: 'elite' | 'high' | 'medium' | 'low' | 'n/a';
}

export interface DORASnapshot {
  timestamp: string;
  deploymentFrequency: DORAMetric;
  leadTime: DORAMetric;
  changeFailureRate: DORAMetric;
  mttr: DORAMetric;
}

export interface TrendData {
  current: number;
  sevenDay: number;
  thirtyDay: number;
  ninetyDay: number;
  sevenDayChange: number;    // Percentage change
  thirtyDayChange: number;
  ninetyDayChange: number;
}

export interface DegradationAlert {
  metric: string;
  currentValue: number;
  previousValue: number;
  percentageChange: number;
  severity: 'warning' | 'critical';
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

const SPECWEAVE_ROOT = process.cwd();
const METRICS_DIR = path.join(SPECWEAVE_ROOT, '.specweave', 'metrics');
const HISTORY_FILE = path.join(METRICS_DIR, 'dora-history.jsonl');
const DEGRADATION_THRESHOLD = 20; // 20% worsening triggers alert

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Append DORA snapshot to history file (JSONL format)
 *
 * @param snapshot - DORA metrics snapshot
 */
export function appendSnapshot(snapshot: DORASnapshot): void {
  // Ensure metrics directory exists
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }

  // Append as single line (JSONL format)
  const line = JSON.stringify(snapshot) + '\n';
  fs.appendFileSync(HISTORY_FILE, line, 'utf-8');

  console.log(`✓ Appended DORA snapshot to ${HISTORY_FILE}`);
}

/**
 * Read all DORA snapshots from history file
 *
 * @returns Array of DORA snapshots (oldest first)
 */
export function readHistory(): DORASnapshot[] {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }

  const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  return lines.map(line => JSON.parse(line) as DORASnapshot);
}

/**
 * Calculate rolling average for a metric over a time window
 *
 * @param snapshots - Historical snapshots (oldest first)
 * @param metricExtractor - Function to extract metric value from snapshot
 * @param windowDays - Time window in days (7, 30, 90)
 * @returns Average value over window, or NaN if insufficient data
 */
function calculateRollingAverage(
  snapshots: DORASnapshot[],
  metricExtractor: (snapshot: DORASnapshot) => number,
  windowDays: number
): number {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Filter snapshots within window
  const windowSnapshots = snapshots.filter(snapshot => {
    const snapshotDate = new Date(snapshot.timestamp);
    return snapshotDate >= windowStart && snapshotDate <= now;
  });

  if (windowSnapshots.length === 0) {
    return NaN;
  }

  // Calculate average
  const sum = windowSnapshots.reduce((acc, snapshot) => acc + metricExtractor(snapshot), 0);
  return sum / windowSnapshots.length;
}

/**
 * Calculate trend data for a specific metric
 *
 * @param metricName - Name of metric ('deploymentFrequency', 'leadTime', etc.)
 * @returns Trend data with current, 7-day, 30-day, 90-day averages and changes
 */
export function calculateTrend(metricName: keyof DORASnapshot): TrendData | null {
  const snapshots = readHistory();

  if (snapshots.length === 0) {
    return null;
  }

  // Metric extractor based on metric name
  const extractors: Record<string, (s: DORASnapshot) => number> = {
    deploymentFrequency: (s) => s.deploymentFrequency.value,
    leadTime: (s) => s.leadTime.value,
    changeFailureRate: (s) => s.changeFailureRate.value,
    mttr: (s) => s.mttr.value,
  };

  const extractor = extractors[metricName];
  if (!extractor) {
    throw new Error(`Unknown metric: ${metricName}`);
  }

  // Current value (latest snapshot)
  const current = extractor(snapshots[snapshots.length - 1]);

  // Rolling averages
  const sevenDay = calculateRollingAverage(snapshots, extractor, 7);
  const thirtyDay = calculateRollingAverage(snapshots, extractor, 30);
  const ninetyDay = calculateRollingAverage(snapshots, extractor, 90);

  // Percentage changes (vs rolling averages)
  const calculateChange = (average: number) => {
    if (isNaN(average) || average === 0) return 0;
    return ((current - average) / average) * 100;
  };

  return {
    current,
    sevenDay: isNaN(sevenDay) ? current : sevenDay,
    thirtyDay: isNaN(thirtyDay) ? current : thirtyDay,
    ninetyDay: isNaN(ninetyDay) ? current : ninetyDay,
    sevenDayChange: calculateChange(sevenDay),
    thirtyDayChange: calculateChange(thirtyDay),
    ninetyDayChange: calculateChange(ninetyDay),
  };
}

/**
 * Detect metric degradation (>20% worsening)
 *
 * @returns Array of degradation alerts (empty if no degradation detected)
 */
export function detectDegradation(): DegradationAlert[] {
  const alerts: DegradationAlert[] = [];
  const snapshots = readHistory();

  if (snapshots.length < 2) {
    return alerts; // Insufficient data
  }

  const latest = snapshots[snapshots.length - 1];
  const metrics: Array<keyof DORASnapshot> = [
    'deploymentFrequency',
    'leadTime',
    'changeFailureRate',
    'mttr',
  ];

  metrics.forEach(metricName => {
    const trend = calculateTrend(metricName);
    if (!trend) return;

    const { current, thirtyDay, thirtyDayChange } = trend;

    // For leadTime, changeFailureRate, mttr: LOWER is better (so INCREASE is degradation)
    // For deploymentFrequency: HIGHER is better (so DECREASE is degradation)

    let isDegradation = false;
    let severity: 'warning' | 'critical' = 'warning';

    if (metricName === 'deploymentFrequency') {
      // Deployment frequency DECREASE is degradation
      if (thirtyDayChange < -DEGRADATION_THRESHOLD) {
        isDegradation = true;
        severity = thirtyDayChange < -40 ? 'critical' : 'warning';
      }
    } else {
      // Lead time, change failure rate, MTTR INCREASE is degradation
      if (thirtyDayChange > DEGRADATION_THRESHOLD) {
        isDegradation = true;
        severity = thirtyDayChange > 40 ? 'critical' : 'warning';
      }
    }

    if (isDegradation) {
      alerts.push({
        metric: metricName,
        currentValue: current,
        previousValue: thirtyDay,
        percentageChange: thirtyDayChange,
        severity,
        message: `${metricName} has degraded by ${Math.abs(thirtyDayChange).toFixed(1)}% (30-day average)`,
      });
    }
  });

  return alerts;
}

/**
 * Get latest DORA snapshot
 *
 * @returns Latest snapshot, or null if no history
 */
export function getLatestSnapshot(): DORASnapshot | null {
  const snapshots = readHistory();
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Get snapshot count
 *
 * @returns Number of snapshots in history
 */
export function getSnapshotCount(): number {
  return readHistory().length;
}

/**
 * Clear history (use with caution!)
 */
export function clearHistory(): void {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.unlinkSync(HISTORY_FILE);
    console.log(`✓ Cleared DORA history: ${HISTORY_FILE}`);
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * CLI tool for DORA tracking operations
 *
 * Usage:
 *   npm run dora:track append      # Append latest metrics to history
 *   npm run dora:track trends      # Show trend analysis
 *   npm run dora:track degradation # Check for degradation
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'append': {
      // Read latest metrics from dora-latest.json
      const latestFile = path.join(METRICS_DIR, 'dora-latest.json');
      if (!fs.existsSync(latestFile)) {
        console.error('❌ No latest metrics found. Run: npm run metrics:dora');
        process.exit(1);
      }

      const latest = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
      appendSnapshot(latest);
      console.log('✅ Snapshot appended to history');
      break;
    }

    case 'trends': {
      const metrics: Array<keyof DORASnapshot> = [
        'deploymentFrequency',
        'leadTime',
        'changeFailureRate',
        'mttr',
      ];

      console.log('\n📊 DORA Metrics Trends\n');
      metrics.forEach(metric => {
        const trend = calculateTrend(metric);
        if (!trend) {
          console.log(`${metric}: Insufficient data`);
          return;
        }

        console.log(`\n${metric}:`);
        console.log(`  Current: ${trend.current}`);
        console.log(`  7-day avg: ${trend.sevenDay.toFixed(2)} (${trend.sevenDayChange >= 0 ? '+' : ''}${trend.sevenDayChange.toFixed(1)}%)`);
        console.log(`  30-day avg: ${trend.thirtyDay.toFixed(2)} (${trend.thirtyDayChange >= 0 ? '+' : ''}${trend.thirtyDayChange.toFixed(1)}%)`);
        console.log(`  90-day avg: ${trend.ninetyDay.toFixed(2)} (${trend.ninetyDayChange >= 0 ? '+' : ''}${trend.ninetyDayChange.toFixed(1)}%)`);
      });
      break;
    }

    case 'degradation': {
      const alerts = detectDegradation();
      if (alerts.length === 0) {
        console.log('✅ No degradation detected. Metrics are stable or improving.');
      } else {
        console.log('⚠️  Degradation Detected:\n');
        alerts.forEach(alert => {
          const icon = alert.severity === 'critical' ? '🔴' : '🟠';
          console.log(`${icon} ${alert.message}`);
          console.log(`   Previous: ${alert.previousValue.toFixed(2)}`);
          console.log(`   Current: ${alert.currentValue.toFixed(2)}`);
          console.log(`   Change: ${alert.percentageChange.toFixed(1)}%`);
          console.log('');
        });
      }
      break;
    }

    case 'count': {
      const count = getSnapshotCount();
      console.log(`📊 ${count} snapshots in history`);
      break;
    }

    default:
      console.log('Usage: npm run dora:track [append|trends|degradation|count]');
      process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}
