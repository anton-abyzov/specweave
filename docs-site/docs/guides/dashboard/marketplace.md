---
title: Marketplace
description: Discover, verify, and manage community skills through the marketplace scanner pipeline
---

# Marketplace

The Marketplace page manages the automated pipeline for discovering and verifying community skills from GitHub. It runs a scanner that finds repositories containing SpecWeave skills, puts them through a multi-tier security verification process, and presents verified skills in a browsable gallery.

## Scanner Controls

The page header shows a **Start Scanner** or **Stop Scanner** button depending on the current state. Starting the scanner begins crawling GitHub for repositories that match skill patterns. Stopping it halts the scan immediately.

## Scanner KPIs

When scanner data is available, four cards show operational metrics:

- **Scanner** -- current state (Running or Stopped) with a colored indicator.
- **Last Scan** -- relative time since the last scan completed.
- **Repos Scanned** -- total number of repositories examined.
- **Rate Limit** -- GitHub API rate limit usage (remaining/total) with a percentage subtitle. Color changes from green to amber to red as the limit is consumed.

If no scanner data exists yet, a prompt encourages you to start the scanner.

## Submission Queue

A table of all discovered skill candidates with status filter tabs:

| Filter | Shows |
|--------|-------|
| All | Every submission |
| Discovered | Newly found, not yet scanned |
| Scanning | Currently being analyzed |
| Passed | Passed Tier 1 verification |
| Failed | Failed Tier 1 verification |
| Verified | Fully verified and approved |
| Rejected | Manually or automatically rejected |

Each row in the queue table shows:

| Column | Description |
|--------|-------------|
| Repo | Repository full name (clickable link to GitHub) |
| Author | Repository owner |
| Stars | Star count |
| Status | Pipeline status badge |
| Tier | Current verification tier |
| Security | Numeric security score (green above 80, amber above 50, red below) |
| Discovered | Relative time since discovery |
| Actions | Approve/Reject buttons for submissions that have passed Tier 1 or are pending Tier 2 |

The table supports pagination with 20 items per page. Navigation controls appear at the bottom when there are more results.

## Popular Skills Gallery

A searchable grid of verified skills sorted by a popularity rank that combines star count and trust score. Each skill card shows:

- Skill name (extracted from the repo name) and author.
- A "Hot" badge for the top 3 skills by popularity rank.
- A "Verified" badge.
- A trust score bar (composite of Tier 1 and Tier 2 scores) with color coding.
- Star count with a compact formatter (e.g. `1.2k`).
- A "View on GitHub" link.

A search input at the top of the gallery filters skills by repo name or author.

## Insights

A summary section with four KPI cards (Discovered, Verified, Rejected, Pending) and two pass rate bars showing the Tier 1 and Tier 2 pass rates as percentage-filled horizontal bars with color coding.

## Real-Time Updates

The page subscribes to three SSE events:
- `submission-update` -- a submission changed status.
- `marketplace-scan` -- scanner progress update.
- `verification-complete` -- a skill finished verification.

All sections refresh automatically on any of these events.

## Launching

Run `specweave dashboard` to open the SpecWeave dashboard. Navigate to the **Marketplace** page from the sidebar. A `GITHUB_TOKEN` environment variable is required for the scanner to access the GitHub API.

## See Also

- [Plugins](./plugins.md) -- manage locally installed plugins and their usage stats
- [Config](./config.md) -- marketplace and scanner settings in the configuration editor
- [Notifications](./notifications.md) -- verification results may generate notifications
