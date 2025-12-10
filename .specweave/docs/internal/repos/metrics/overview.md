# metrics

*Analyzed: 2025-12-10 | Confidence: medium**

## Purpose

A TypeScript-based DORA (DevOps Research and Assessment) metrics calculator that fetches data from GitHub API to compute the four key DORA metrics: Deployment Frequency, Lead Time for Changes, Change Failure Rate, and Mean Time to Recovery (MTTR). It generates both JSON data files and detailed markdown reports with industry benchmark comparisons.

## Key Concepts

- DORA Metrics
- Deployment Frequency
- Lead Time for Changes
- Change Failure Rate
- Mean Time to Recovery (MTTR)
- Performance Tier Classification
- Percentile Calculations (P50, P90)
- GitHub API Integration
- Trunk-based Development Metrics
- DevOps Performance Benchmarks

## Patterns

- **REST API Client using Octokit** (api)
- **TypeScript Strong Typing with Interfaces** (structure)
- **Strategy Pattern for Metric Calculation** (architecture)
- **Utility Module Pattern** (structure)
- **Rate Limiting with Exponential Backoff** (api)
- **ESM Module System** (structure)
- **Statistical Analysis with Percentiles** (data)
- **Benchmark Classification System** (architecture)
- **CLI Entry Point Pattern** (structure)
- **Report Generation with Markdown** (integration)

## External Dependencies

- GitHub REST API (releases, commits, issues endpoints)
- @octokit/rest (GitHub API client library)
- Node.js fs module (file system operations)
- Node.js path module (path manipulation)

## Observations

- Designed for AI-assisted development workflows where commits to develop branch = deployments
- Uses trunk-based development assumption (each merge to develop is a deployment)
- Incidents tracked via GitHub issue labels: 'incident' or 'production-bug'
- Outputs both machine-readable JSON (.specweave/metrics/dora-latest.json) and human-readable markdown report
- Tier thresholds based on official DORA research benchmarks from dora.dev
- 30-day rolling window for metric calculations
- Designed to run in GitHub Actions workflow (references GITHUB_TOKEN environment variable)
- No database persistence - calculates metrics on-demand from GitHub API
- Report includes executive summary table and detailed per-metric insights with improvement recommendations