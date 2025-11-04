# Architecture Decision: Database-Free DORA Metrics

**Date**: 2025-11-04
**Decision**: Use GitHub API as sole data source (no external database)
**Status**: Approved

## Context

User asked: "Do you really need a database? Separate server? Tell me the truth."

## Decision

**NO DATABASE NEEDED!**

## Rationale

### Why GitHub API is Perfect

GitHub **already is** our database:

| DORA Metric | GitHub Data Source | How We Use It |
|-------------|-------------------|---------------|
| **Deployment Frequency** | Releases API | Count releases per week (last 30 days) |
| **Lead Time** | Commits API + Releases | Calculate commit timestamp → release timestamp |
| **Change Failure Rate** | Issues API (labels) | Find issues with "incident" or "production-bug" labels |
| **MTTR** | Issues API (timestamps) | Calculate created_at → closed_at duration |

### Benefits

✅ **Zero Cost**: No database hosting, no servers
✅ **Zero Maintenance**: GitHub maintains it
✅ **Zero Setup**: No schemas, no migrations
✅ **High Reliability**: GitHub's 99.95% uptime
✅ **Free 5000 API calls/hour**: More than enough (we use <20 per day)
✅ **Version Controlled**: All data in Git already
✅ **No Data Privacy Concerns**: Public repos, aggregate metrics only

### Architecture

```
GitHub API (free, reliable)
    ↓
TypeScript Calculator (src/metrics/dora-calculator.ts)
    ↓
GitHub Actions Workflow (daily at 06:00 UTC)
    ↓
Output: JSON file (metrics/dora-latest.json)
    ↓
├─ README Badges (Shields.io)
├─ Docs Dashboard (Docusaurus)
└─ Version Controlled (Git commit)
```

### API Call Budget

Per workflow run (daily):
- Releases API: 1 call
- Commits API: 1-5 calls (depends on releases)
- Issues API: 1 call

**Total**: <20 calls/day (well under 5000/hour limit)

### What We DON'T Need

❌ PostgreSQL database
❌ Separate server/hosting
❌ Grafana (too complex for MVP)
❌ DataDog (paid service)
❌ PagerDuty integration (future increment)
❌ Real-time updates (daily is enough)

## Implementation

See:
- `spec.md` - Full requirements
- `plan.md` - Technical design
- `tasks.md` - 40 tasks (24 hours effort)

## Success Criteria

- ✅ All 4 DORA metrics calculated
- ✅ Daily automation via GitHub Actions
- ✅ README badges visible
- ✅ Docs dashboard functional
- ✅ $0/month cost

## Alternative Considered

**Option B: PostgreSQL + Grafana**

Pros:
- Historical data storage (>30 days)
- Advanced visualizations
- Real-time dashboards

Cons:
- **$20-50/month** hosting cost
- Database setup, migrations, backups
- Grafana configuration complexity
- Overkill for MVP

**Decision**: Defer to future increment (0011-dora-historical-tracking) if needed.

## Truth

**The truth**: We genuinely don't need a database for MVP.

GitHub API provides all data we need, with better reliability and zero cost. If we later need historical trending (>30 days) or advanced analytics, we can add PostgreSQL in increment 0011.

For now: **Keep it simple, keep it free, keep it on GitHub.**

---

**Approved by**: Autonomous implementation
**Implementation**: Increment 0010 (this increment)
