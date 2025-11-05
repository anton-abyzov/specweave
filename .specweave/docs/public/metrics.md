# Engineering Metrics (DORA)

SpecWeave tracks engineering performance using **DORA (DevOps Research and Assessment) metrics** - the industry-standard framework for measuring software delivery excellence.

## Real-Time Metrics Dashboard

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://spec-weave.com/docs/metrics)
[![Lead Time](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=h&color=brightgreen)](https://spec-weave.com/docs/metrics)
[![Change Failure Rate](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen)](https://spec-weave.com/docs/metrics)
[![MTTR](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=min&color=brightgreen)](https://spec-weave.com/docs/metrics)

**Last Updated**: Updated daily at 06:00 UTC via automated workflow

---

## What are DORA Metrics?

DORA metrics are four key indicators that measure the **velocity** and **stability** of software delivery:

### 1. Deployment Frequency

**What it measures**: How often you deploy code to production

**SpecWeave tracking**:
- Counts successful deployments to production
- Target: 1+ deployments per day (elite performance)

**Why it matters**: High deployment frequency indicates:
- ✅ Small, manageable changes
- ✅ Fast feedback loops
- ✅ Reduced risk per deployment
- ✅ Quick value delivery to users

### 2. Lead Time for Changes

**What it measures**: Time from code commit to running in production

**SpecWeave tracking**:
- Measures: `production_deploy_time - first_commit_time`
- Target: < 24 hours (elite performance)

**Why it matters**: Short lead time indicates:
- ✅ Efficient CI/CD pipeline
- ✅ Minimal handoffs
- ✅ Quick iteration cycles
- ✅ Rapid response to customer needs

### 3. Change Failure Rate

**What it measures**: Percentage of deployments causing failures in production

**SpecWeave tracking**:
- Calculates: `(failed_deployments / total_deployments) * 100`
- Target: < 15% (elite performance)

**Why it matters**: Low failure rate indicates:
- ✅ High code quality
- ✅ Effective testing
- ✅ Reliable deployment process
- ✅ Stable production environment

### 4. Mean Time to Recovery (MTTR)

**What it measures**: Average time to restore service after failure

**SpecWeave tracking**:
- Measures: Time from incident detection to resolution
- Target: < 1 hour (elite performance)

**Why it matters**: Fast recovery indicates:
- ✅ Effective monitoring
- ✅ Quick incident response
- ✅ Good rollback procedures
- ✅ Resilient architecture

---

## DORA Performance Levels

According to DORA research, teams are categorized into four performance levels:

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| **Deployment Frequency** | On-demand (multiple/day) | 1/week - 1/month | 1/month - 6 months | < 1/6 months |
| **Lead Time** | < 1 hour | 1 day - 1 week | 1 week - 1 month | 1-6 months |
| **Change Failure Rate** | 0-15% | 16-30% | 31-45% | 46-60% |
| **MTTR** | < 1 hour | < 1 day | 1 day - 1 week | 1 week - 1 month |

**SpecWeave's Goal**: Maintain **Elite** or **High** performance across all metrics

---

## How SpecWeave Improves DORA Metrics

SpecWeave is designed to naturally improve your DORA metrics through disciplined development:

### Improving Deployment Frequency

✅ **Incremental delivery** - Small, complete increments deploy faster
✅ **Automated workflows** - CI/CD pipelines run on every commit
✅ **Living docs automation** - Documentation never blocks deployment

### Reducing Lead Time

✅ **Structured planning** - Less rework = faster delivery
✅ **Test-aware tasks** - Tests written with implementation (no separate QA phase)
✅ **Auto-resume workflows** - Pick up where you left off instantly

### Lowering Change Failure Rate

✅ **Embedded test plans** - Every task has tests (BDD format)
✅ **AC-ID traceability** - Requirements → Tasks → Tests linked
✅ **Coverage validation** - Ensures critical paths tested

### Faster MTTR

✅ **Living documentation** - Up-to-date runbooks and architecture docs
✅ **ADRs** - Architecture decisions documented for quick troubleshooting
✅ **Increment isolation** - Easy to identify and rollback changes

---

## SpecWeave's Metrics Collection

### Automated Workflow

SpecWeave collects DORA metrics via GitHub Actions:

```yaml
name: DORA Metrics
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 06:00 UTC
  workflow_dispatch:     # Manual trigger

jobs:
  calculate-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Collect deployment data
      - name: Calculate DORA metrics
      - name: Generate JSON report
      - name: Commit metrics to repo
```

**Output**: `metrics/dora-latest.json` (public, version controlled)

### Metrics Calculation

**Deployment Frequency**:
- Source: GitHub deployments API + production tags
- Calculation: Count deployments in last 30 days

**Lead Time**:
- Source: Git commits + deployment timestamps
- Calculation: Average time from first commit to deployment per increment

**Change Failure Rate**:
- Source: GitHub deployments (success/failure status) + rollback commits
- Calculation: `(failed_deployments + rollbacks) / total_deployments * 100`

**MTTR**:
- Source: GitHub Issues with `incident` label
- Calculation: Average time from issue creation to closure

---

## Transparency Commitment

SpecWeave's DORA metrics are:

✅ **Public** - Visible to all users and contributors
✅ **Automated** - No manual intervention, no gaming
✅ **Version controlled** - Full history in Git
✅ **Real-time** - Updated daily via CI/CD

**See metrics history**: [View JSON data](https://github.com/anton-abyzov/specweave/tree/develop/metrics)

---

## Why DORA Metrics Matter for SpecWeave

As a framework focused on **disciplined development**, SpecWeave practices what it preaches:

1. **Small increments** → High deployment frequency
2. **Structured workflow** → Short lead times
3. **Test-driven planning** → Low change failure rate
4. **Living docs** → Fast MTTR

**The Result**: SpecWeave demonstrates that discipline leads to velocity AND stability.

---

## Learn More

- 📖 [DORA Research](https://dora.dev/) - Original research and methodologies
- 📊 [Accelerate Book](https://itrevolution.com/product/accelerate/) - The science behind DORA metrics
- 🔧 [SpecWeave Workflows](./workflows/overview) - How we maintain high performance
- 📈 [GitHub Actions](https://github.com/anton-abyzov/specweave/actions) - See our automation in action

---

**Bottom Line**: DORA metrics aren't just numbers - they're a reflection of how well your development process works. SpecWeave helps you achieve elite performance through disciplined, incremental delivery.
