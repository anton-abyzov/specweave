# Implementation Plan: GitHub OAuth Registration

## Overview

Add GitHub OAuth to VSkill website using custom fetch-based OAuth (no framework), HttpOnly cookies for session management, and a separate User model. Reuse existing `jose` JWT infrastructure with a type discriminator.

## Architecture

### Components
- **github-oauth.ts**: OAuth flow helpers (URL builder, token exchange, GitHub user fetch)
- **oauth-state.ts**: CSRF state parameter management via HMAC-signed cookies
- **auth-cookies.ts**: HttpOnly cookie management for user auth tokens
- **auth.ts** (extended): User token payload, signing, verification, `requireUser` middleware

### Data Model

```
User (NEW)
├── id: UUID (PK)
├── githubId: Int (unique, indexed)
├── githubUsername: String
├── avatarUrl: String?
├── createdAt, updatedAt
├── refreshTokens → UserRefreshToken[]
└── submissions → Submission[]

UserRefreshToken (NEW)
├── id: UUID (PK)
├── userId: FK → User (cascade delete)
├── token: String (unique)
├── expiresAt: DateTime (indexed)
└── createdAt

Submission (MODIFIED)
└── userId: String? (FK → User, optional)
```

### API Contracts

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/v1/auth/github` | GET | Initiate OAuth, redirect to GitHub | None |
| `/api/v1/auth/github/callback` | GET | OAuth callback, create user, set cookies | None |
| `/api/v1/auth/me` | GET | Return current user info | Cookie |
| `/api/v1/auth/logout` | POST | Clear cookies, delete refresh token | Cookie |
| `/api/v1/auth/user/refresh` | POST | Refresh access token | Cookie |
| `/api/v1/submissions` | POST | Submit skill (modified: optional userId) | Cookie (optional) |

### OAuth Flow

```
Browser                    VSkill Server                GitHub
  │                            │                          │
  ├─ GET /auth/github ────────►│                          │
  │                            ├─ Generate state          │
  │                            ├─ Set state cookie        │
  │◄─ 302 Redirect ───────────┤                          │
  │                            │                          │
  ├─ GET /login/oauth/authorize ──────────────────────────►│
  │◄─ User authorizes ────────────────────────────────────┤
  │                            │                          │
  ├─ GET /auth/github/callback?code=X&state=Y ───────────►│
  │                            ├─ Verify state cookie     │
  │                            ├─ POST /access_token ─────►│
  │                            │◄─ access_token ──────────┤
  │                            ├─ GET /user ──────────────►│
  │                            │◄─ { id, login, avatar } ─┤
  │                            ├─ Upsert User in DB       │
  │                            ├─ Sign JWT tokens         │
  │                            ├─ Set auth cookies        │
  │◄─ 302 → /submit ──────────┤                          │
```

## Technology Stack

- **Runtime**: Next.js 15 App Router on Cloudflare Workers
- **Database**: Neon PostgreSQL via Prisma 6 (serverless adapter)
- **JWT**: jose (HS256, existing)
- **OAuth**: Custom fetch-based (no library)
- **Cookies**: Next.js `cookies()` API

## Architecture Decisions

### ADR-1: Separate User Model
Users are external skill submitters (GitHub OAuth). Admins are internal reviewers (email/password). Mixing them pollutes the Admin model and complicates middleware.

### ADR-2: No OAuth Library
GitHub OAuth is 2 HTTP calls. Arctic/NextAuth add dependencies for ~40 lines of code. `fetch()` works natively on Workers.

### ADR-3: HttpOnly Cookies
Web users interact via browser. Cookies are the correct mechanism. HttpOnly + Secure + SameSite=Lax protects against XSS and CSRF. Admin API continues using Bearer tokens.

### ADR-4: Signed State Cookie
HMAC-signed, 10min expiry, stateless. No DB storage for OAuth state. Works perfectly on Workers (no session affinity needed).

### ADR-5: JWT Type Discriminator
Add `type: "user"` to user tokens, `type: "admin"` to admin tokens. Same `JWT_SECRET`, same signing infrastructure. `requireUser()` validates type.

## Implementation Phases

### Phase 1: Schema
- Prisma migration: User, UserRefreshToken, Submission.userId

### Phase 2: Auth Infrastructure (parallel tasks)
- github-oauth.ts, oauth-state.ts, auth-cookies.ts, auth.ts extensions

### Phase 3: API Routes
- OAuth initiate/callback, me, logout, refresh, submissions modification

### Phase 4: Frontend
- Submit page with auth gate, layout header, error page

### Phase 5: CLI
- Change submit to open browser

## Testing Strategy

- TDD (RED → GREEN → REFACTOR) for all lib modules
- Mock `fetch()` for GitHub API calls using `vi.hoisted()` + `vi.mock()` pattern
- Mock `getPrisma()` for database operations
- Integration tests for route handlers using NextRequest/NextResponse

## Technical Challenges

### Challenge 1: Cloudflare Workers Crypto
**Solution**: Use `crypto.randomUUID()` (native) and `crypto.subtle.sign` for HMAC. Both available in Workers runtime.

### Challenge 2: Per-Request Prisma Client
**Solution**: Already handled by existing `getPrisma()` pattern. OAuth callback creates fresh client per request.

### Challenge 3: Cookie Management on Workers
**Solution**: Next.js `cookies()` API works with `@opennextjs/cloudflare`. Standard `Set-Cookie` headers.
