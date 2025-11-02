#!/usr/bin/env node

/**
 * trace-analyzer.js
 * Analyze distributed tracing data to identify bottlenecks
 *
 * Usage: node trace-analyzer.js <trace-id>
 *        node trace-analyzer.js <trace-id> --format=json
 *        node trace-analyzer.js --file=trace.json
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
let traceId = null;
let traceFile = null;
let outputFormat = 'text'; // text or json

for (const arg of args) {
  if (arg.startsWith('--file=')) {
    traceFile = arg.split('=')[1];
  } else if (arg.startsWith('--format=')) {
    outputFormat = arg.split('=')[1];
  } else if (!arg.startsWith('--')) {
    traceId = arg;
  }
}

// Mock trace data (in production, fetch from APM/tracing system)
function getMockTraceData(id) {
  return {
    traceId: id,
    rootSpan: {
      spanId: 'span-1',
      service: 'frontend',
      operation: 'GET /dashboard',
      startTime: 1698345600000,
      duration: 8250, // ms
      children: [
        {
          spanId: 'span-2',
          service: 'api',
          operation: 'GET /api/dashboard',
          startTime: 1698345600010,
          duration: 8200,
          children: [
            {
              spanId: 'span-3',
              service: 'api',
              operation: 'db.query',
              startTime: 1698345600020,
              duration: 7800, // SLOW!
              tags: {
                'db.statement': 'SELECT * FROM users WHERE last_login_at > ...',
                'db.type': 'postgresql',
              },
              children: [],
            },
            {
              spanId: 'span-4',
              service: 'api',
              operation: 'cache.get',
              startTime: 1698345608200,
              duration: 5,
              children: [],
            },
          ],
        },
      ],
    },
  };
}

// Load trace from file or mock
function loadTrace() {
  if (traceFile) {
    try {
      const data = fs.readFileSync(traceFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Error loading trace file: ${error.message}`);
      process.exit(1);
    }
  } else if (traceId) {
    return getMockTraceData(traceId);
  } else {
    console.error('Usage: node trace-analyzer.js <trace-id> OR --file=trace.json');
    process.exit(1);
  }
}

// Analyze trace
function analyzeTrace(trace) {
  const analysis = {
    traceId: trace.traceId,
    totalDuration: trace.rootSpan.duration,
    rootOperation: trace.rootSpan.operation,
    spanCount: 0,
    slowSpans: [],
    bottlenecks: [],
    serviceBreakdown: {},
  };

  // Traverse spans
  function traverseSpans(span, depth = 0) {
    analysis.spanCount++;

    // Track service time
    if (!analysis.serviceBreakdown[span.service]) {
      analysis.serviceBreakdown[span.service] = {
        totalTime: 0,
        calls: 0,
      };
    }
    analysis.serviceBreakdown[span.service].totalTime += span.duration;
    analysis.serviceBreakdown[span.service].calls++;

    // Identify slow spans (>1s)
    if (span.duration > 1000) {
      analysis.slowSpans.push({
        service: span.service,
        operation: span.operation,
        duration: span.duration,
        percentage: ((span.duration / analysis.totalDuration) * 100).toFixed(1),
        depth,
      });
    }

    // Traverse children
    if (span.children) {
      span.children.forEach(child => traverseSpans(child, depth + 1));
    }
  }

  traverseSpans(trace.rootSpan);

  // Sort slow spans by duration
  analysis.slowSpans.sort((a, b) => b.duration - a.duration);

  // Identify bottlenecks (spans taking >50% of total time)
  analysis.bottlenecks = analysis.slowSpans.filter(
    span => parseFloat(span.percentage) > 50
  );

  return analysis;
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Print analysis (text format)
function printAnalysis(analysis) {
  console.log('========================================');
  console.log('DISTRIBUTED TRACE ANALYSIS');
  console.log('========================================');
  console.log(`Trace ID: ${analysis.traceId}`);
  console.log(`Root Operation: ${analysis.rootOperation}`);
  console.log(`Total Duration: ${formatDuration(analysis.totalDuration)}`);
  console.log(`Total Spans: ${analysis.spanCount}`);
  console.log('');

  // Service breakdown
  console.log('📊 SERVICE BREAKDOWN');
  console.log('-------------------');
  console.log(`${'Service'.padEnd(20)} ${'Time'.padEnd(15)} ${'Calls'.padEnd(10)} ${'% of Total'.padEnd(15)}`);
  console.log('-'.repeat(70));

  for (const [service, data] of Object.entries(analysis.serviceBreakdown)) {
    const percentage = ((data.totalTime / analysis.totalDuration) * 100).toFixed(1);
    console.log(
      `${service.padEnd(20)} ${formatDuration(data.totalTime).padEnd(15)} ${String(data.calls).padEnd(10)} ${percentage}%`
    );
  }
  console.log('');

  // Slow spans
  if (analysis.slowSpans.length > 0) {
    console.log(`🐌 SLOW SPANS (>${formatDuration(1000)})`);
    console.log('-------------------');
    console.log(`${'Service'.padEnd(15)} ${'Operation'.padEnd(30)} ${'Duration'.padEnd(15)} ${'% of Total'.padEnd(15)}`);
    console.log('-'.repeat(80));

    for (const span of analysis.slowSpans.slice(0, 10)) {
      console.log(
        `${span.service.padEnd(15)} ${span.operation.padEnd(30)} ${formatDuration(span.duration).padEnd(15)} ${span.percentage}%`
      );
    }
    console.log('');
  }

  // Bottlenecks
  if (analysis.bottlenecks.length > 0) {
    console.log('🚨 BOTTLENECKS (>50% of total time)');
    console.log('-----------------------------------');

    for (const bottleneck of analysis.bottlenecks) {
      console.log(`⚠️  ${bottleneck.service} - ${bottleneck.operation}`);
      console.log(`   Duration: ${formatDuration(bottleneck.duration)} (${bottleneck.percentage}% of trace)`);
      console.log('');
    }
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('-----------------');

  if (analysis.bottlenecks.length > 0) {
    console.log('🔴 CRITICAL: Bottlenecks detected!');
    for (const bottleneck of analysis.bottlenecks) {
      console.log(`   - Optimize ${bottleneck.service}.${bottleneck.operation} (${bottleneck.percentage}% of trace)`);

      // Specific recommendations based on operation
      if (bottleneck.operation.includes('db.query')) {
        console.log('     → Add database index, optimize query, add caching');
      } else if (bottleneck.operation.includes('http')) {
        console.log('     → Add timeout, cache response, use async processing');
      } else if (bottleneck.operation.includes('cache')) {
        console.log('     → Check cache hit rate, optimize cache key');
      }
    }
  } else if (analysis.slowSpans.length > 0) {
    console.log('🟡 Some slow spans detected:');
    for (const span of analysis.slowSpans.slice(0, 3)) {
      console.log(`   - ${span.service}.${span.operation}: ${formatDuration(span.duration)}`);
    }
  } else {
    console.log('✅ No obvious performance issues detected.');
    console.log('   All spans complete in reasonable time.');
  }

  console.log('');
  console.log('Next steps:');
  console.log('  - Profile slowest spans');
  console.log('  - Check for N+1 queries, missing indexes');
  console.log('  - Add caching where appropriate');
  console.log('  - Review external API timeouts');
  console.log('');
}

// Main
function main() {
  const trace = loadTrace();
  const analysis = analyzeTrace(trace);

  if (outputFormat === 'json') {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    printAnalysis(analysis);
  }
}

main();
