---
increment: 0230-marketplace-scanner-dashboard
title: "Marketplace Scanner Dashboard"
type: feature
priority: P1
status: active
created: 2026-02-16
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Marketplace Scanner Dashboard

## Problem Statement

SpecWeave has zero workers scanning GitHub for community skills. The marketplace is a monorepo-only registry with 22 internal plugins. There is no external discovery, no submission queue, and no verification pipeline for community-contributed skills. Users cannot see what skills are being discovered or their verification status.

## Goals

- Automatically discover community Claude Code skills on GitHub
- Queue and verify discovered skills through the existing Tier 1/Tier 2 security pipeline
- Provide real-time dashboard visibility into the discovery and verification pipeline
- Enable manual curation (approve/reject) of queued skills

## User Stories

### US-001: GitHub Scanner Worker (P1)
**Project**: specweave

**As a** marketplace operator
**I want** a background worker that scans GitHub for community Claude Code skills
**So that** the marketplace automatically discovers new skills without manual effort

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Given configured search topics, when scanner runs, then it queries GitHub Search API for repos matching topics/filenames
- [ ] **AC-US1-02**: Given GitHub rate limits, when limit is approached, then scanner applies exponential backoff
- [ ] **AC-US1-03**: Given a scanner crash, when restarted, then it resumes from last checkpoint cursor
- [ ] **AC-US1-04**: Given a previously discovered repo, when seen again, then it is skipped (dedup by full_name)
- [ ] **AC-US1-05**: Given config with intervalMinutes=30, when scanner runs, then it sleeps 30 min between scans

---

### US-002: Submission Queue (P1)
**Project**: specweave

**As a** marketplace operator
**I want** discovered skills queued for automated security verification
**So that** only vetted skills reach verified status

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Given a discovered repo, when added to queue, then entry persists in `.specweave/state/skill-submissions.json`
- [ ] **AC-US2-02**: Given a new submission, when autoScanOnDiscover is true, then Tier 1 regex scan runs automatically
- [ ] **AC-US2-03**: Given a Tier 1 passed skill, when Tier 2 triggered, then consent gate checks before LLM analysis
- [ ] **AC-US2-04**: Given corrupted queue JSON, when loaded, then auto-recovers from backup file
- [ ] **AC-US2-05**: Given an operator action, when approve/reject called, then submission status updates with reason

---

### US-003: Marketplace Dashboard Page (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** a Marketplace page showing scanner status, queue, and verified skills
**So that** I can monitor the skill discovery pipeline in real-time

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Given no scanner running, when page loads, then shows onboarding CTA with Start Scanner button
- [ ] **AC-US3-02**: Given active scanner, when page loads, then shows KPIs: worker health, last scan time, repos scanned, rate limit remaining
- [ ] **AC-US3-03**: Given submissions in queue, when page loads, then shows filterable table with status, tier, date, security score
- [ ] **AC-US3-04**: Given verified skills, when page loads, then shows gallery cards with security scores and author info
- [ ] **AC-US3-05**: Given a submission status change, when SSE event fires, then page updates without refresh

---

### US-004: Marketplace API Routes (P2)
**Project**: specweave

**As a** dashboard client
**I want** REST endpoints for marketplace data and scanner control
**So that** the frontend can fetch, filter, and manage the pipeline

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Given GET /api/marketplace/scanner/status, when called, then returns worker health and scan statistics
- [ ] **AC-US4-02**: Given GET /api/marketplace/queue with status filter, when called, then returns paginated results (20/page default)
- [ ] **AC-US4-03**: Given POST /api/marketplace/queue/:id/approve, when called, then updates submission to verified
- [ ] **AC-US4-04**: Given GET /api/marketplace/insights, when called, then returns aggregated discovery timeline and pass/fail rates
- [ ] **AC-US4-05**: Given POST /api/marketplace/scanner/start, when called, then launches scanner worker via job manager

## Out of Scope

- Automated Tier 3 (human review) pipeline
- Publishing verified skills back to marketplace.json
- Community skill ratings or reviews
- Multi-marketplace federation (scanning npm, PyPI, etc.)
- Automated skill installation from queue

## Technical Notes

### Dependencies
- GitHub Search API (REST v3)
- Existing SecurityScanner (src/core/fabric/security-scanner.ts)
- Existing SecurityJudge (src/core/fabric/security-judge.ts)
- BackgroundJobManager (src/core/background/job-manager.ts)
- Dashboard SSE infrastructure (src/dashboard/server/sse-manager.ts)

### Constraints
- Medium scale: 500-5000 skills, pagination with server-side filtering
- Monthly pruning of rejected entries
- Auto-recovery: backup queue file before writes, validate JSON on load
- Tier 2 LLM analysis costs ~$0.03/skill, requires consent gate

## Success Metrics

- Scanner discovers 50+ community skills in first week
- Tier 1 scan processes 100% of discovered skills automatically
- Dashboard page loads in <2s with 1000+ queue entries
- Zero data loss from queue file corruption (auto-recovery)
