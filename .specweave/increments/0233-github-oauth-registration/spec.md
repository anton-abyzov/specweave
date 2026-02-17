---
increment: 0233-github-oauth-registration
title: "GitHub OAuth Registration"
type: feature
priority: P1
status: planned
created: 2026-02-17
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: GitHub OAuth Registration

## Overview

Add GitHub OAuth authentication to VSkill website so skill authors can authenticate with their GitHub identity to submit skills. Currently VSkill has no end-user accounts — only Admin accounts for internal reviewers. The CLI remains unauthenticated; `vskill submit` opens the browser to the web submission page.

## User Stories

### US-001: GitHub Login (P1)
**Project**: vskill

**As a** skill author visiting verified-skill.com
**I want** to log in with my GitHub account
**So that** I can authenticate to submit skills with my verified identity

**Acceptance Criteria**:
- [ ] **AC-US1-01**: "Login with GitHub" button visible on the website
- [ ] **AC-US1-02**: Clicking redirects to GitHub OAuth with `read:user` scope
- [ ] **AC-US1-03**: State parameter validated on callback (CSRF protection)
- [ ] **AC-US1-04**: User record created (or found) in database with githubId, githubUsername, avatarUrl
- [ ] **AC-US1-05**: HttpOnly secure cookies set with access and refresh JWT tokens
- [ ] **AC-US1-06**: User redirected to submit page after successful login
- [ ] **AC-US1-07**: OAuth failure/denial shows error page with retry option

---

### US-002: Web Skill Submission (P1)
**Project**: vskill

**As an** authenticated user
**I want** to submit a skill through the website
**So that** my submission is linked to my GitHub identity

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Submit page requires authentication (redirects to login if not)
- [ ] **AC-US2-02**: Form collects GitHub repo URL and skill name
- [ ] **AC-US2-03**: Submission linked to authenticated user via `userId`
- [ ] **AC-US2-04**: Success shows confirmation with submission ID
- [ ] **AC-US2-05**: Unauthenticated users redirected to login page

---

### US-003: CLI Submit Redirect (P2)
**Project**: vskill

**As a** CLI user running `vskill submit`
**I want** the CLI to open my browser to the web submission page
**So that** I can authenticate and submit through the website

**Acceptance Criteria**:
- [ ] **AC-US3-01**: `vskill submit owner/repo` opens browser to submit page with repo pre-filled
- [ ] **AC-US3-02**: CLI outputs message telling user to complete submission in browser
- [ ] **AC-US3-03**: `--email` flag removed (no longer needed)

---

### US-004: User Session Management (P2)
**Project**: vskill

**As an** authenticated user
**I want** my session to persist across page loads
**So that** I do not have to log in every time

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Access token in HttpOnly cookie with 24h expiry
- [ ] **AC-US4-02**: Refresh token in HttpOnly cookie with 7d expiry
- [ ] **AC-US4-03**: Expired access token auto-refreshes via refresh token
- [ ] **AC-US4-04**: Logout clears all auth cookies and deletes refresh token from DB

## Functional Requirements

### FR-001: Minimal Data Collection
Only store publicly available GitHub data: githubId (Int), githubUsername (String), avatarUrl (String?). No email storage. No GDPR concerns with public data.

### FR-002: Backward Compatibility
Existing unauthenticated submission API (`POST /api/v1/submissions`) continues to work. `userId` on Submission is optional.

### FR-003: Cloudflare Workers Compatibility
All code must work on Cloudflare Workers runtime. No Node.js-only APIs. Use `fetch()`, `crypto.subtle`, `jose` library.

## Success Criteria

- Users can log in with GitHub and submit skills via web UI
- CLI redirects to web for submission
- Existing admin auth and unauthenticated flows unaffected
- Unit test coverage >= 80% on new auth modules

## Out of Scope

- User profile page
- Email notifications for users
- GitHub repo verification (checking user owns the repo)
- Admin OAuth (admins continue using email/password)
- Multiple OAuth providers (only GitHub)

## Dependencies

- GitHub OAuth App (personal account, created in GitHub Developer Settings)
- Environment variables: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
