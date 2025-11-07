# DORA Metrics Report

**Generated**: Nov 7, 2025 at 1:04:31 PM
**Period**: Last 30 days

---

## 📊 Executive Summary

| Metric | Value | Tier | Status |
|--------|-------|------|--------|
| **Deployment Frequency** | 5 deploys/month | ⭐ High | ✅ |
| **Lead Time for Changes** | 11.3 hours | ⭐ High | ✅ |
| **Change Failure Rate** | 0% | 🏆 Elite | ✅ |
| **Mean Time to Recovery** | 0 minutes | ⚪ N/A | ℹ️ |

**Overall Assessment**: ⭐ **High-Performing Team** - 3/4 metrics at high or elite

---

## 🚀 Deployment Frequency

**Current**: 5 deploys/month (⭐ High)

**Industry Benchmarks**:
- 🏆 Elite: Multiple deploys per day (>365/year)
- ⭐ High: Weekly to monthly (52-365/year)
- 📊 Medium: Monthly to quarterly (12-52/year)
- ⚠️ Low: Less than quarterly (<12/year)

### Insights

- ✅ **Strong Performance**: Weekly to monthly deployments indicate healthy delivery rhythm
- 📈 **Next Level**: Consider increasing to daily deployments for elite performance
- 💡 **Tip**: Implement feature flags to decouple deployment from release

---

## ⚡ Lead Time for Changes

**Current**: 11.3 hours (⭐ High)
**Percentiles**: P50 = 6.2h, P90 = 44.9h

**Industry Benchmarks**:
- 🏆 Elite: Less than 1 hour
- ⭐ High: 1 day to 1 week
- 📊 Medium: 1 week to 1 month
- ⚠️ Low: More than 1 month

### Insights

- ✅ **Strong Performance**: Lead time under 1 week is competitive
- 📊 **Distribution**: 50% of changes deploy in 6.2h, 90% in 44.9h
- 📈 **Next Level**: Focus on reducing p90 to reach elite tier
- 💡 **Tip**: Identify bottlenecks in slowest 10% of deployments

---

## ✅ Change Failure Rate

**Current**: 0% (🏆 Elite)
**Failed Releases**: 0 / 5

**Industry Benchmarks**:
- 🏆 Elite: 0-15%
- ⭐ High: 16-30%
- 📊 Medium: 31-45%
- ⚠️ Low: More than 45%

### Insights

- 🎉 **Elite Performance**: < 15% failure rate indicates high quality
- 🏆 **Perfect Record**: Zero failures across all deployments!
- ✅ Maintain current quality standards

---

## 🔧 Mean Time to Recovery (MTTR)

**Current**: 0 minutes (⚪ N/A)

**Industry Benchmarks**:
- 🏆 Elite: Less than 1 hour
- ⭐ High: 1 hour to 1 day
- 📊 Medium: 1 day to 1 week
- ⚠️ Low: More than 1 week

### Insights

- ℹ️ **No Incidents**: No production incidents in measurement period
- ✅ This is good news! Either stability is high or incident tracking needs improvement
- 💡 **Tip**: Ensure production incidents are labeled "incident" or "production-bug"

---

## 📈 Recent Activity

### Recent Releases (5 in last 30 days)

- **[v0.9.1](https://github.com/anton-abyzov/specweave/releases/tag/v0.9.1)** - Nov 7, 2025
  _v0.9.1 - Bug Fix: Duplicate Command Invocation_
- **[v0.8.21](https://github.com/anton-abyzov/specweave/releases/tag/v0.8.21)** - Nov 7, 2025
  _v0.8.21 - Azure DevOps Team-Based Structure Fix_
- **[v0.8.18](https://github.com/anton-abyzov/specweave/releases/tag/v0.8.18)** - Nov 7, 2025
  _v0.8.18 - Documentation Preview Enabled by Default_
- **[v0.7.1](https://github.com/anton-abyzov/specweave/releases/tag/v0.7.1)** - Nov 4, 2025
  _v0.7.1 - Critical Bug Fix: Init Command_
- **[v0.7.0](https://github.com/anton-abyzov/specweave/releases/tag/v0.7.0)** - Nov 4, 2025
  _v0.7.0 - Increment Management v2.0_

### Production Incidents

ℹ️ No production incidents tracked in the last 30 days.

💡 **Tip**: Label issues with "incident" or "production-bug" to track them automatically.

---

## 🎯 Recommended Actions

✅ **Great work!** All metrics are performing well. Focus on maintaining current standards.

💡 **Continue**:
- Monitor metrics regularly for trends
- Share DORA metrics with team for transparency
- Celebrate successes and learn from incidents

---

## 📚 Resources

- **DORA Research**: [State of DevOps Report](https://cloud.google.com/devops/state-of-devops)
- **Metrics Calculation**: [GitHub Workflow](https://github.com/anton-abyzov/specweave/actions/workflows/dora-metrics.yml)
- **Implementation**: [SpecWeave DORA Calculator](https://github.com/anton-abyzov/specweave/tree/develop/src/metrics)

---

_This report was generated automatically by SpecWeave DORA Metrics Calculator_
_Last updated: Nov 7, 2025_
