# Tasks: GitHub OAuth Registration

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed

## Phase 1: Schema

### T-001: Add User and UserRefreshToken models to Prisma schema
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [ ] not started

**Description**: Add `User` model (githubId, githubUsername, avatarUrl), `UserRefreshToken` model, and optional `userId` FK on `Submission`.

**Files**: `packages/web/prisma/schema.prisma`

**Test**: Given schema changes → When `prisma migrate dev` runs → Then migration applies cleanly and User model is queryable

---

## Phase 2: Auth Infrastructure

### T-002: Create GitHub OAuth helper module [P]
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] not started

**Description**: New `github-oauth.ts` with `buildAuthorizationUrl(state)`, `exchangeCodeForToken(code)`, `fetchGitHubUser(accessToken)`.

**Files**:
- Create: `packages/web/src/lib/github-oauth.ts`
- Create: `packages/web/src/lib/__tests__/github-oauth.test.ts`

**Test**:
- **TC-001**: Given valid state → When buildAuthorizationUrl called → Then returns GitHub URL with client_id, redirect_uri, scope=read:user, state params
- **TC-002**: Given valid code → When exchangeCodeForToken called → Then POSTs to github.com/login/oauth/access_token and returns token
- **TC-003**: Given valid access token → When fetchGitHubUser called → Then GETs api.github.com/user and returns { id, login, avatar_url }
- **TC-004**: Given GitHub API error → When exchangeCodeForToken called → Then throws descriptive error

**Dependencies**: None

---

### T-003: Add user token functions to auth module [P]
**User Story**: US-001, US-004 | **Satisfies ACs**: AC-US1-05, AC-US4-01, AC-US4-02 | **Status**: [ ] not started

**Description**: Add `UserTokenPayload` interface, `signUserAccessToken`, `signUserRefreshToken`, `verifyUserAccessToken`, `requireUser` middleware (reads from cookies).

**Files**:
- Modify: `packages/web/src/lib/auth.ts`
- Create: `packages/web/src/lib/__tests__/auth-user.test.ts`

**Test**:
- **TC-001**: Given user payload → When signUserAccessToken called → Then JWT has type="user", sub, githubUsername claims
- **TC-002**: Given valid user JWT → When verifyUserAccessToken called → Then returns UserTokenPayload
- **TC-003**: Given admin JWT → When verifyUserAccessToken called → Then throws (wrong type)
- **TC-004**: Given request with valid cookie → When requireUser called → Then returns UserTokenPayload
- **TC-005**: Given request without cookie → When requireUser called → Then returns 401 Response

**Dependencies**: None

---

### T-004: Create OAuth state cookie helpers [P]
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] not started

**Description**: New `oauth-state.ts` with `generateState()`, `createStateCookie(state)`, `verifyStateCookie(cookieValue, state)` using HMAC-SHA256.

**Files**:
- Create: `packages/web/src/lib/oauth-state.ts`
- Create: `packages/web/src/lib/__tests__/oauth-state.test.ts`

**Test**:
- **TC-001**: Given state → When createStateCookie + verifyStateCookie round-trip → Then verification passes
- **TC-002**: Given tampered cookie → When verifyStateCookie called → Then returns false
- **TC-003**: Given different state value → When verifyStateCookie called → Then returns false

**Dependencies**: None

---

### T-005: Create auth cookie helpers [P]
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-04 | **Status**: [ ] not started

**Description**: New `auth-cookies.ts` with `setAuthCookies`, `clearAuthCookies`, `getAccessTokenFromCookie`, `getRefreshTokenFromCookie`. Cookie names: `vskill_access`, `vskill_refresh`.

**Files**:
- Create: `packages/web/src/lib/auth-cookies.ts`
- Create: `packages/web/src/lib/__tests__/auth-cookies.test.ts`

**Test**:
- **TC-001**: Given tokens → When setAuthCookies called → Then response has vskill_access and vskill_refresh cookies with HttpOnly, Secure, SameSite=Lax
- **TC-002**: Given response → When clearAuthCookies called → Then both cookies expired (Max-Age=0)
- **TC-003**: Given request with cookie → When getAccessTokenFromCookie called → Then returns token string
- **TC-004**: Given request without cookie → When getAccessTokenFromCookie called → Then returns null

**Dependencies**: None

---

## Phase 3: API Routes

### T-006: Create GET /api/v1/auth/github route
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] not started

**Description**: Generates random state, creates signed state cookie, redirects to GitHub authorization URL. Accepts optional `?redirect=/submit` query param stored in `vskill_redirect` cookie.

**Files**:
- Create: `packages/web/src/app/api/v1/auth/github/route.ts`

**Test**:
- **TC-001**: Given GET request → When handler called → Then returns 302 to github.com/login/oauth/authorize
- **TC-002**: Given GET request → When handler called → Then response has vskill_oauth_state cookie
- **TC-003**: Given ?redirect=/submit → When handler called → Then response has vskill_redirect cookie

**Dependencies**: T-002, T-004

---

### T-007: Create GET /api/v1/auth/github/callback route
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05, AC-US1-06, AC-US1-07 | **Status**: [ ] not started

**Description**: Validates state against cookie, exchanges code for token, fetches GitHub user, upserts User in DB, signs JWT tokens, sets auth cookies, redirects to stored redirect path (default `/submit`).

**Files**:
- Create: `packages/web/src/app/api/v1/auth/github/callback/route.ts`

**Test**:
- **TC-001**: Given valid code+state → When callback called → Then user created in DB, auth cookies set, redirects to /submit
- **TC-002**: Given mismatched state → When callback called → Then returns 403
- **TC-003**: Given GitHub API error → When callback called → Then redirects to /auth/error
- **TC-004**: Given existing user → When callback called → Then user updated (not duplicated)

**Dependencies**: T-001, T-002, T-003, T-004, T-005

---

### T-008: Create GET /api/v1/auth/me route
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] not started

**Description**: Reads access token from cookie via `requireUser()`, returns `{ id, githubUsername, avatarUrl }`. 401 if not authenticated.

**Files**:
- Create: `packages/web/src/app/api/v1/auth/me/route.ts`

**Test**:
- **TC-001**: Given valid cookie → When GET /me → Then returns user info with 200
- **TC-002**: Given no cookie → When GET /me → Then returns 401

**Dependencies**: T-003, T-005

---

### T-009: Create POST /api/v1/auth/logout route
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [ ] not started

**Description**: Clears auth cookies, optionally deletes UserRefreshToken from DB. Returns 200.

**Files**:
- Create: `packages/web/src/app/api/v1/auth/logout/route.ts`

**Test**:
- **TC-001**: Given POST /logout → Then auth cookies cleared, returns 200
- **TC-002**: Given valid refresh cookie → When logout → Then refresh token deleted from DB

**Dependencies**: T-005

---

### T-010: Create POST /api/v1/auth/user/refresh route
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03 | **Status**: [ ] not started

**Description**: Reads refresh token from cookie, verifies JWT, checks DB, issues new access token, sets new access token cookie.

**Files**:
- Create: `packages/web/src/app/api/v1/auth/user/refresh/route.ts`

**Test**:
- **TC-001**: Given valid refresh cookie → When POST /refresh → Then new access cookie set
- **TC-002**: Given expired refresh token → When POST /refresh → Then returns 401
- **TC-003**: Given deleted refresh token → When POST /refresh → Then returns 401

**Dependencies**: T-001, T-003, T-005

---

### T-011: Modify POST /api/v1/submissions to support authenticated users
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [ ] not started

**Description**: If `vskill_access` cookie present, validate and set `userId` on submission. Keep existing unauthenticated behavior for backward compatibility.

**Files**:
- Modify: `packages/web/src/app/api/v1/submissions/route.ts`

**Test**:
- **TC-001**: Given valid cookie → When POST /submissions → Then submission has userId set
- **TC-002**: Given no cookie → When POST /submissions → Then submission created without userId (backward compat)

**Dependencies**: T-001, T-003, T-005

---

## Phase 4: Frontend

### T-012: Create submit page with auth gate
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-04, AC-US2-05 | **Status**: [ ] not started

**Description**: Client component at `/submit` that checks auth via `/api/v1/auth/me`. If not authenticated, shows "Login with GitHub" button. If authenticated, shows form (repo URL + skill name) that POSTs to `/api/v1/submissions`.

**Files**:
- Create: `packages/web/src/app/submit/page.tsx`

**Dependencies**: T-006, T-007, T-008, T-011

---

### T-013: Add login/user status to layout header
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] not started

**Description**: Modify `layout.tsx` to include header with VSkill logo, and if authenticated: GitHub avatar + username + logout link; if not: "Login with GitHub" link.

**Files**:
- Modify: `packages/web/src/app/layout.tsx`

**Dependencies**: T-008

---

### T-014: Create auth error page
**User Story**: US-001 | **Satisfies ACs**: AC-US1-07 | **Status**: [ ] not started

**Description**: Page at `/auth/error` showing friendly error message with "Try again" button. Callback route redirects here on OAuth failure.

**Files**:
- Create: `packages/web/src/app/auth/error/page.tsx`

**Dependencies**: None

---

## Phase 5: CLI

### T-015: Change CLI submit to open browser [P]
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [ ] not started

**Description**: Replace fetch-based submission with browser open. `vskill submit owner/repo` opens `APP_URL/submit?repo=owner/repo`. Remove `--email` option. Print message about completing in browser.

**Files**:
- Modify: `packages/cli/src/commands/submit.ts`

**Test**:
- **TC-001**: Given owner/repo arg → When submit called → Then opens browser to correct URL with repo query param
- **TC-002**: Given --skill flag → When submit called → Then URL includes skill query param

**Dependencies**: None

---

## Phase 6: Finalize

### T-016: Document environment variables
**User Story**: US-001 | **Status**: [ ] not started

**Description**: Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` to documentation or `.env.example`.

**Dependencies**: All above

---

### T-017: Run Prisma migration
**User Story**: US-001 | **Status**: [ ] not started

**Description**: `prisma migrate dev --name add-user-oauth`. Verify migration applies cleanly to Neon database.

**Dependencies**: T-001
