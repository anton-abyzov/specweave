---
id: specweave-sync-docs
title: /sw:sync-docs Command
sidebar_label: specweave:sync-docs
---

# /sw:sync-docs Command

The **`/sw:sync-docs`** command provides **phase-based** synchronization between strategic [living documentation](/docs/glossary/terms/living-docs) and implementation.

> **Note**: This is NOT bidirectional sync. It's two separate one-way operations at different phases:
> - **Review mode** = Pull context (docs → you)
> - **Update mode** = Push learnings (you → docs)

## What It Does

**Key actions:**
- **Review mode**: Pull strategic docs before implementation (pre-work context)
- **Update mode**: Push learnings after implementation (export findings)
- Sync [ADRs](/docs/glossary/terms/adr) (Proposed -> Accepted)
- Update architecture diagrams
- Sync [API](/docs/glossary/terms/api) documentation
- Update feature lists

## Usage

```bash
# Before implementation (review strategic docs)
/sw:sync-docs review

# After implementation (update with learnings)
/sw:sync-docs update
```

## Review Mode

Before starting work, review strategic documentation:

```bash
$ /sw:sync-docs review

📚 Strategic Documentation Review

📋 ADRs to Review:
  - ADR-0032: Authentication Strategy (Proposed)
  - ADR-0035: Database Selection (Accepted)

🏗️ Architecture:
  - Component diagram up to date
  - Data flow needs review

📖 API Contracts:
  - /api/v1/auth documented
  - /api/v1/users needs update

💡 Review these before implementing increment 0007
```

## Update Mode

After completing work, sync learnings:

```bash
$ /sw:sync-docs update

📤 Syncing to Living Documentation...

✅ ADRs Updated:
  - ADR-0032: Proposed → Accepted
  - ADR-0036: Created (JWT rotation decision)

✅ Architecture Updated:
  - Added AuthService component
  - Updated sequence diagrams

✅ API Docs Updated:
  - /api/v1/auth/login documented
  - /api/v1/auth/refresh documented

✅ Features Updated:
  - User Authentication: Complete
```

## What Gets Synced

| Category | Review Mode | Update Mode |
|----------|-------------|-------------|
| ADRs | Pull proposed | Push accepted |
| Architecture | Review planned | Update actual |
| API Docs | Review contracts | Update endpoints |
| Features | Review planned | Mark complete |

## Related

- [Living Docs](/docs/glossary/terms/living-docs) - Documentation system
- [External Tool Sync](/docs/glossary/terms/split-source-sync) - Split-source sync pattern (content vs status)
- [ADR](/docs/glossary/terms/adr) - Architecture decisions
- [Intelligent Living Docs Sync](/docs/glossary/terms/intelligent-living-docs-sync) - Sync feature
- [/sw:done](/docs/glossary/terms/specweave-done) - Close increment
