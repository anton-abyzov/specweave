---
sidebar_position: 10
title: DORA Metrics Dashboard
description: Live DORA metrics for SpecWeave development performance
---

# 📊 DORA Metrics Dashboard

Real-time DevOps performance metrics for SpecWeave, updated daily.

<div style={{marginBottom: '2rem'}}>
  <a href="https://github.com/anton-abyzov/specweave/actions/workflows/dora-metrics.yml" target="_blank">
    <img src="https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/dora-metrics.yml?branch=develop&label=Metrics%20Calculation&style=for-the-badge" alt="Metrics Status" />
  </a>
</div>

## Current Performance

### 🚀 Deployment Frequency

<div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
  <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deployment%20Frequency&suffix=/month&color=brightgreen&style=for-the-badge" alt="Deployment Frequency" />
  <span style={{marginLeft: '1rem', fontSize: '1.2rem', fontWeight: 'bold'}}>
    <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.tier&label=Tier&color=blue&style=for-the-badge" alt="DF Tier" />
  </span>
</div>

**What it measures:** How often we deploy to production
**Industry benchmarks:**
- 🏆 **Elite**: Multiple deploys per day (>365/year)
- ⭐ **High**: Weekly to daily (52-365/year)
- 📊 **Medium**: Monthly to weekly (12-52/year)
- ⚠️ **Low**: Less than monthly (<12/year)

---

### ⚡ Lead Time for Changes

<div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
  <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=%20hours&color=brightgreen&style=for-the-badge" alt="Lead Time" />
  <span style={{marginLeft: '1rem', fontSize: '1.2rem', fontWeight: 'bold'}}>
    <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.tier&label=Tier&color=blue&style=for-the-badge" alt="LT Tier" />
  </span>
</div>

**What it measures:** Time from commit to production
**Industry benchmarks:**
- 🏆 **Elite**: Less than 1 hour
- ⭐ **High**: 1 day to 1 week
- 📊 **Medium**: 1 week to 1 month
- ⚠️ **Low**: More than 1 month

**Percentiles:**
- **P50 (Median)**: ![P50](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.p50&label=P50&suffix=%20hours&color=lightgrey)
- **P90**: ![P90](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.p90&label=P90&suffix=%20hours&color=lightgrey)

---

### ✅ Change Failure Rate

<div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
  <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen&style=for-the-badge" alt="CFR" />
  <span style={{marginLeft: '1rem', fontSize: '1.2rem', fontWeight: 'bold'}}>
    <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.tier&label=Tier&color=blue&style=for-the-badge" alt="CFR Tier" />
  </span>
</div>

**What it measures:** Percentage of deployments that fail
**Industry benchmarks:**
- 🏆 **Elite**: 0-15%
- ⭐ **High**: 16-30%
- 📊 **Medium**: 31-45%
- ⚠️ **Low**: More than 45%

**Failed Releases:** ![Failed](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.failedReleases&label=Failed&color=red) / ![Total](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.totalReleases&label=Total&color=blue)

---

### 🔧 Mean Time to Recovery (MTTR)

<div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
  <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=%20minutes&color=brightgreen&style=for-the-badge" alt="MTTR" />
  <span style={{marginLeft: '1rem', fontSize: '1.2rem', fontWeight: 'bold'}}>
    <img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.tier&label=Tier&color=blue&style=for-the-badge" alt="MTTR Tier" />
  </span>
</div>

**What it measures:** Time to recover from production incidents
**Industry benchmarks:**
- 🏆 **Elite**: Less than 1 hour
- ⭐ **High**: 1 hour to 1 day
- 📊 **Medium**: 1 day to 1 week
- ⚠️ **Low**: More than 1 week

**Percentiles:**
- **P50 (Median)**: ![P50](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.p50&label=P50&suffix=%20minutes&color=lightgrey)
- **P90**: ![P90](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.p90&label=P90&suffix=%20minutes&color=lightgrey)

---

## 📈 How It Works

### Architecture

```mermaid
graph LR
    A[GitHub API] --> B[DORA Calculator]
    B --> C[metrics/dora-latest.json]
    C --> D[Shields.io Badges]
    D --> E[README.md]
    C --> F[This Dashboard]
    G[GitHub Actions] --> B
    G -->|Daily 06:00 UTC| B
```

### Data Sources

All metrics are calculated from GitHub data:

1. **Deployment Frequency**: Counts GitHub Releases
2. **Lead Time**: Measures commit → release time
3. **Change Failure Rate**: Tracks issues labeled `incident` or `production-bug`
4. **MTTR**: Measures incident creation → closure time

### Zero Infrastructure

- **Cost**: $0/month (GitHub API free tier)
- **Database**: None (GitHub is our database)
- **Server**: None (GitHub Actions)
- **Rate Limits**: 5000 API calls/hour (we use ~20/day)

---

## 🔄 Automation

Metrics update automatically:

- **Schedule**: Daily at 06:00 UTC
- **Workflow**: [`.github/workflows/dora-metrics.yml`](https://github.com/anton-abyzov/specweave/blob/develop/.github/workflows/dora-metrics.yml)
- **Manual Trigger**: `gh workflow run dora-metrics.yml`

**Latest Update**: ![Last Update](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.timestamp&label=Last%20Update&color=lightgrey)

---

## 📚 Learn More

### DORA Research

The DORA (DevOps Research and Assessment) metrics are industry-standard KPIs for software delivery performance, backed by 6+ years of research.

**Resources:**
- [State of DevOps Report](https://cloud.google.com/devops/state-of-devops)
- [Accelerate Book](https://itrevolution.com/book/accelerate/)
- [Google Cloud DORA](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance)

### Implementation

**Code**: [`src/metrics/`](https://github.com/anton-abyzov/specweave/tree/develop/src/metrics)
**Increment**: [`.specweave/increments/0010-dora-metrics-mvp/`](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/0010-dora-metrics-mvp)
**Architecture Decision**: [Why No Database](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0010-dora-metrics-mvp/reports/ARCHITECTURE-DECISION.md)

---

## 🎯 Continuous Improvement

Track our progress over time as we optimize SpecWeave's delivery performance:

**Current Goals:**
- 🚀 Deployment Frequency: High → Elite (8/month → 30/month)
- ⚡ Lead Time: High → Elite (15.6h → <1h)
- ✅ Change Failure Rate: Elite (maintain 0-15%)
- 🔧 MTTR: Track once we have incidents (target: <1 hour)
