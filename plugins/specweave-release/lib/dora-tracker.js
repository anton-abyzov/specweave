import * as fs from "fs";
import * as path from "path";
const SPECWEAVE_ROOT = process.cwd();
const METRICS_DIR = path.join(SPECWEAVE_ROOT, ".specweave", "metrics");
const HISTORY_FILE = path.join(METRICS_DIR, "dora-history.jsonl");
const DEGRADATION_THRESHOLD = 20;
function appendSnapshot(snapshot) {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
  const line = JSON.stringify(snapshot) + "\n";
  fs.appendFileSync(HISTORY_FILE, line, "utf-8");
  console.log(`\u2713 Appended DORA snapshot to ${HISTORY_FILE}`);
}
function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  const content = fs.readFileSync(HISTORY_FILE, "utf-8");
  const lines = content.trim().split("\n").filter((line) => line.length > 0);
  return lines.map((line) => JSON.parse(line));
}
function calculateRollingAverage(snapshots, metricExtractor, windowDays) {
  const now = /* @__PURE__ */ new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1e3);
  const windowSnapshots = snapshots.filter((snapshot) => {
    const snapshotDate = new Date(snapshot.timestamp);
    return snapshotDate >= windowStart && snapshotDate <= now;
  });
  if (windowSnapshots.length === 0) {
    return NaN;
  }
  const sum = windowSnapshots.reduce((acc, snapshot) => acc + metricExtractor(snapshot), 0);
  return sum / windowSnapshots.length;
}
function calculateTrend(metricName) {
  const snapshots = readHistory();
  if (snapshots.length === 0) {
    return null;
  }
  const extractors = {
    deploymentFrequency: (s) => s.deploymentFrequency.value,
    leadTime: (s) => s.leadTime.value,
    changeFailureRate: (s) => s.changeFailureRate.value,
    mttr: (s) => s.mttr.value
  };
  const extractor = extractors[metricName];
  if (!extractor) {
    throw new Error(`Unknown metric: ${metricName}`);
  }
  const current = extractor(snapshots[snapshots.length - 1]);
  const sevenDay = calculateRollingAverage(snapshots, extractor, 7);
  const thirtyDay = calculateRollingAverage(snapshots, extractor, 30);
  const ninetyDay = calculateRollingAverage(snapshots, extractor, 90);
  const calculateChange = (average) => {
    if (isNaN(average) || average === 0) return 0;
    return (current - average) / average * 100;
  };
  return {
    current,
    sevenDay: isNaN(sevenDay) ? current : sevenDay,
    thirtyDay: isNaN(thirtyDay) ? current : thirtyDay,
    ninetyDay: isNaN(ninetyDay) ? current : ninetyDay,
    sevenDayChange: calculateChange(sevenDay),
    thirtyDayChange: calculateChange(thirtyDay),
    ninetyDayChange: calculateChange(ninetyDay)
  };
}
function detectDegradation() {
  const alerts = [];
  const snapshots = readHistory();
  if (snapshots.length < 2) {
    return alerts;
  }
  const latest = snapshots[snapshots.length - 1];
  const metrics = [
    "deploymentFrequency",
    "leadTime",
    "changeFailureRate",
    "mttr"
  ];
  metrics.forEach((metricName) => {
    const trend = calculateTrend(metricName);
    if (!trend) return;
    const { current, thirtyDay, thirtyDayChange } = trend;
    let isDegradation = false;
    let severity = "warning";
    if (metricName === "deploymentFrequency") {
      if (thirtyDayChange < -DEGRADATION_THRESHOLD) {
        isDegradation = true;
        severity = thirtyDayChange < -40 ? "critical" : "warning";
      }
    } else {
      if (thirtyDayChange > DEGRADATION_THRESHOLD) {
        isDegradation = true;
        severity = thirtyDayChange > 40 ? "critical" : "warning";
      }
    }
    if (isDegradation) {
      alerts.push({
        metric: metricName,
        currentValue: current,
        previousValue: thirtyDay,
        percentageChange: thirtyDayChange,
        severity,
        message: `${metricName} has degraded by ${Math.abs(thirtyDayChange).toFixed(1)}% (30-day average)`
      });
    }
  });
  return alerts;
}
function getLatestSnapshot() {
  const snapshots = readHistory();
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}
function getSnapshotCount() {
  return readHistory().length;
}
function clearHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    fs.unlinkSync(HISTORY_FILE);
    console.log(`\u2713 Cleared DORA history: ${HISTORY_FILE}`);
  }
}
async function main() {
  const command = process.argv[2];
  switch (command) {
    case "append": {
      const latestFile = path.join(METRICS_DIR, "dora-latest.json");
      if (!fs.existsSync(latestFile)) {
        console.error("\u274C No latest metrics found. Run: npm run metrics:dora");
        process.exit(1);
      }
      const latest = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
      appendSnapshot(latest);
      console.log("\u2705 Snapshot appended to history");
      break;
    }
    case "trends": {
      const metrics = [
        "deploymentFrequency",
        "leadTime",
        "changeFailureRate",
        "mttr"
      ];
      console.log("\n\u{1F4CA} DORA Metrics Trends\n");
      metrics.forEach((metric) => {
        const trend = calculateTrend(metric);
        if (!trend) {
          console.log(`${metric}: Insufficient data`);
          return;
        }
        console.log(`
${metric}:`);
        console.log(`  Current: ${trend.current}`);
        console.log(`  7-day avg: ${trend.sevenDay.toFixed(2)} (${trend.sevenDayChange >= 0 ? "+" : ""}${trend.sevenDayChange.toFixed(1)}%)`);
        console.log(`  30-day avg: ${trend.thirtyDay.toFixed(2)} (${trend.thirtyDayChange >= 0 ? "+" : ""}${trend.thirtyDayChange.toFixed(1)}%)`);
        console.log(`  90-day avg: ${trend.ninetyDay.toFixed(2)} (${trend.ninetyDayChange >= 0 ? "+" : ""}${trend.ninetyDayChange.toFixed(1)}%)`);
      });
      break;
    }
    case "degradation": {
      const alerts = detectDegradation();
      if (alerts.length === 0) {
        console.log("\u2705 No degradation detected. Metrics are stable or improving.");
      } else {
        console.log("\u26A0\uFE0F  Degradation Detected:\n");
        alerts.forEach((alert) => {
          const icon = alert.severity === "critical" ? "\u{1F534}" : "\u{1F7E0}";
          console.log(`${icon} ${alert.message}`);
          console.log(`   Previous: ${alert.previousValue.toFixed(2)}`);
          console.log(`   Current: ${alert.currentValue.toFixed(2)}`);
          console.log(`   Change: ${alert.percentageChange.toFixed(1)}%`);
          console.log("");
        });
      }
      break;
    }
    case "count": {
      const count = getSnapshotCount();
      console.log(`\u{1F4CA} ${count} snapshots in history`);
      break;
    }
    default:
      console.log("Usage: npm run dora:track [append|trends|degradation|count]");
      process.exit(1);
  }
}
if (require.main === module) {
  main().catch(console.error);
}
export {
  appendSnapshot,
  calculateTrend,
  clearHistory,
  detectDegradation,
  getLatestSnapshot,
  getSnapshotCount,
  readHistory
};
