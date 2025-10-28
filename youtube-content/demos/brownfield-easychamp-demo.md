# Brownfield Demo: Transforming EasyChamp Safely

**Demo Duration**: ~40 minutes
**Project**: EasyChamp - Existing production application
**Goal**: Add Google OAuth without breaking existing authentication

## Overview

This demo shows SpecWeave's brownfield workflow:
1. Project onboarding (existing codebase)
2. Analyzing existing authentication system
3. Generating retroactive specifications
4. Creating regression tests
5. Planning new feature (Google OAuth)
6. Safe implementation with regression protection
7. Validation and documentation

## Prerequisites

- EasyChamp repository cloned
- SpecWeave installed globally
- Claude Code active
- PostgreSQL running (for EasyChamp)

## Part 1: Project Onboarding (5 min)

### Step 1.1: Clone EasyChamp

```bash
git clone https://github.com/antonabyzov/easychamp.git
cd easychamp
```

### Step 1.2: Initialize SpecWeave in Brownfield Mode

```bash
specweave init --brownfield

# Prompts:
# Project name: EasyChamp
# Project type: brownfield
# Analyze existing code? Yes
# Create retroactive specs? Yes
# Generate regression tests? Yes
# Enable hooks? Yes
```

**Expected Output:**
```
🔍 Detecting existing project structure...
✅ Found: package.json (Node.js project)
✅ Found: src/ directory
✅ Found: Existing auth system in src/auth/

🏗️  Creating SpecWeave structure...
✅ Created .specweave/config.yaml (brownfield mode)
✅ Created .claude/skills/ (core skills installed)
✅ Created specifications/ (will populate with retroactive specs)
✅ Created .specweave/docs/
✅ Created features/
✅ Created work/
✅ Created tests/e2e/ (for regression tests)
✅ Created CLAUDE.md

⚠️  Existing code preserved (no modifications)

📊 Project Analysis:
- Existing files: 156
- Lines of code: ~12,400
- Modules detected: auth, users, profiles, teams, games
- Database: PostgreSQL

Next: Run brownfield analysis to generate specifications
```

### Step 1.3: Review Project Structure

```bash
tree -L 3
```

**Expected Structure:**
```
easychamp/
├── .specweave/                # NEW
│   └── config.yaml
├── .claude/                    # NEW
│   └── skills/
├── specifications/             # NEW (empty, will be populated)
│   └── modules/
├── .specweave/docs/              # NEW
│   ├── getting-started/
│   ├── guides/
│   ├── architecture/
│   └── decisions/
├── features/                   # NEW
├── work/                       # NEW
├── tests/                      # EXISTING + NEW e2e/
│   └── e2e/                   # NEW
├── src/                        # EXISTING (unchanged)
│   ├── auth/
│   ├── users/
│   ├── profiles/
│   ├── teams/
│   ├── games/
│   └── ...
├── package.json                # EXISTING
├── CLAUDE.md                   # NEW
└── README.md                   # EXISTING
```

## Part 2: Analyzing Existing Authentication (8 min)

### Step 2.1: Run Brownfield Analysis

**Prompt to Claude:**
```
Analyze the existing authentication system in EasyChamp.
Generate comprehensive retroactive specifications documenting
current behavior.
```

**Claude Response:**
```
The brownfield-analyzer skill is analyzing the authentication system...

🔍 Scanning codebase...
  - Found entry points: src/auth/auth.controller.ts
  - Found services: src/auth/auth.service.ts
  - Found middleware: src/auth/jwt.strategy.ts, src/auth/guards/
  - Found database models: src/auth/entities/user.entity.ts
  - Found routes: src/auth/auth.routes.ts

🔍 Analyzing behavior...
  - Registration flow: Email/password + username
  - Login flow: Email/password → JWT token
  - Session management: JWT (7-day expiration)
  - Password reset: Email token-based
  - Email verification: Required before login

🔍 Extracting API contracts...
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/me
  - GET /api/auth/verify-email/:token
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password/:token

🔍 Analyzing database schema...
  - Table: users
  - Columns: id, email, password, username, email_verified, ...

🔍 Identifying business rules...
  - Email format validation: regex
  - Password strength: min 8 chars, 1 uppercase, 1 number
  - Username uniqueness: case-insensitive
  - Rate limiting: 5 login attempts per 15 minutes

🔍 Building dependency graph...
  - Auth used by: profiles, teams, games modules
  - Dependencies: bcrypt, jsonwebtoken, nodemailer

📝 Generating specifications...

✅ Created specifications/modules/authentication/existing/overview.md
✅ Created specifications/modules/authentication/existing/api-contracts.md
✅ Created specifications/modules/authentication/existing/data-model.md
✅ Created specifications/modules/authentication/existing/business-rules.md
✅ Created specifications/modules/authentication/existing/constraints.md
✅ Created specifications/modules/authentication/existing/dependencies.md

Analysis complete! Review specifications/modules/authentication/existing/
```

### Step 2.2: Review Generated Retroactive Specification

```bash
cat specifications/modules/authentication/existing/overview.md
```

**Expected Content (comprehensive documentation of CURRENT behavior):**
```markdown
# Existing Authentication System - EasyChamp

**Status**: Production
**Last Analyzed**: 2025-01-26
**Files Analyzed**: 12 files in src/auth/
**Lines of Code**: ~2,400

## Current Behavior

### User Registration

**Endpoint**: POST /api/auth/register

**Request Body**:
```json
{
  "email": "string",
  "password": "string",
  "username": "string"
}
```

**Process Flow**:
1. Validates email format (regex: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
2. Validates username (alphanumeric + underscore, 3-20 chars)
3. Validates password strength:
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 number
4. Checks email uniqueness (case-insensitive)
5. Checks username uniqueness (case-insensitive)
6. Hashes password with bcrypt (10 rounds)
7. Generates verification token (UUID v4)
8. Saves user to database (email_verified = false)
9. Sends verification email via nodemailer
10. Returns success response (excludes password)

**Response 201 Created**:
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "username": "string",
    "email_verified": false,
    "created_at": "timestamp"
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Error Responses**:
- 400 Bad Request: Invalid email format
- 400 Bad Request: Invalid username format
- 400 Bad Request: Weak password
- 409 Conflict: Email already exists
- 409 Conflict: Username already taken
- 500 Internal Server Error: Email service failure (queued for retry)

**Edge Cases Handled**:
- Duplicate email (case-insensitive check)
- Duplicate username (case-insensitive check)
- Email service down (queues verification email for retry)
- Special characters in password (allowed)
- Whitespace in username (rejected)

### User Login

**Endpoint**: POST /api/auth/login

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Process Flow**:
1. Finds user by email (case-insensitive)
2. Checks if user exists
3. Verifies password with bcrypt.compare()
4. Checks if email is verified (email_verified = true)
5. Generates JWT token:
   - Algorithm: HS256
   - Secret: JWT_SECRET environment variable
   - Expiration: 7 days
   - Payload: { userId, email, username }
6. Creates session record in database (optional)
7. Returns token + user object

**Response 200 OK**:
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "uuid",
    "email": "string",
    "username": "string",
    "email_verified": true
  }
}
```

**Error Responses**:
- 401 Unauthorized: User not found (message: "Invalid credentials")
- 401 Unauthorized: Wrong password (message: "Invalid credentials")
- 403 Forbidden: Email not verified (message: "Please verify your email before logging in")

**Security Features**:
- Same error message for "user not found" and "wrong password" (prevents user enumeration)
- Rate limiting: 5 failed attempts per 15 minutes (per IP + email)
- Password not included in response

**Edge Cases Handled**:
- Case-insensitive email lookup
- Unverified email (blocked from login)
- Expired verification token (user must request new one)

### Email Verification

**Endpoint**: GET /api/auth/verify-email/:token

**Process Flow**:
1. Finds user by verification_token
2. Checks if token exists and matches
3. Sets email_verified = true
4. Clears verification_token
5. Returns success response

**Response 200 OK**:
```json
{
  "message": "Email verified successfully. You can now log in."
}
```

**Error Responses**:
- 400 Bad Request: Invalid or expired token

**Edge Cases**:
- Token already used (verification_token is null) → Error
- User already verified → Returns success anyway

### Password Reset Request

**Endpoint**: POST /api/auth/forgot-password

**Request Body**:
```json
{
  "email": "string"
}
```

**Process Flow**:
1. Finds user by email
2. Generates reset token (UUID v4)
3. Sets reset_token_expires (1 hour from now)
4. Saves reset_token to database
5. Sends password reset email
6. Returns success (even if email not found - security)

**Response 200 OK**:
```json
{
  "message": "If that email exists, a password reset link has been sent."
}
```

**Security**:
- Always returns success (prevents user enumeration)
- Token expires in 1 hour
- One-time use (cleared after reset)

### Password Reset

**Endpoint**: POST /api/auth/reset-password/:token

**Request Body**:
```json
{
  "newPassword": "string"
}
```

**Process Flow**:
1. Finds user by reset_token
2. Checks if token is not expired (< 1 hour old)
3. Validates new password strength
4. Hashes new password
5. Updates password
6. Clears reset_token and reset_token_expires
7. Invalidates all existing sessions (security)
8. Returns success

**Response 200 OK**:
```json
{
  "message": "Password reset successful. Please log in with your new password."
}
```

**Error Responses**:
- 400 Bad Request: Invalid or expired token
- 400 Bad Request: Weak password

**Security**:
- Invalidates all sessions after reset
- One-time token use
- Token expires after 1 hour

## Database Schema

**Table: users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- bcrypt hash
  username VARCHAR(50) NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token UUID,
  reset_token UUID,
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_username ON users(LOWER(username));
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);
```

## Constraints (DO NOT CHANGE)

**Critical Constraints** - Changing these will break existing functionality:

1. **JWT Payload Structure**:
   ```json
   {
     "userId": "uuid",
     "email": "string",
     "username": "string",
     "iat": number,
     "exp": number
   }
   ```
   - Adding fields is OK
   - Removing/renaming fields will break existing tokens

2. **Session Duration**: 7 days
   - Used by mobile app (expects 7-day tokens)

3. **Password Hashing**: bcrypt with 10 rounds
   - Must use bcrypt (not argon2 or scrypt)
   - Must use 10 rounds

4. **Email Verification Required**: Before login
   - Mobile app assumes this constraint

5. **Error Messages**: Exact wording
   - "Invalid credentials" (prevents user enumeration)
   - Mobile app depends on exact wording

6. **API Endpoints**: Cannot change URLs
   - Mobile app hardcodes these endpoints

7. **Rate Limiting**: 5 attempts per 15 minutes
   - Must maintain this for security

## Dependencies

**npm Packages**:
- bcrypt@^5.1.0 (password hashing)
- jsonwebtoken@^9.0.0 (JWT generation)
- nodemailer@^6.9.0 (email sending)
- @nestjs/passport@^10.0.0 (authentication framework)
- passport-jwt@^4.0.1 (JWT strategy)

**Environment Variables**:
- JWT_SECRET (must remain the same to validate existing tokens)
- JWT_EXPIRES_IN=7d
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USER
- EMAIL_PASSWORD

**Database**:
- PostgreSQL 14+
- `users` table (cannot modify existing columns)

## Downstream Dependencies

**Modules that depend on authentication**:
- src/profiles/ (requires authenticated user)
- src/teams/ (team creation requires auth)
- src/games/ (game participation requires auth)
- Mobile app (iOS/Android) - hardcoded endpoints

## Risk Assessment

**Modification Risk Level**: HIGH

Changes to authentication can break:
- Existing user sessions (250+ active users)
- Mobile app (5,000+ downloads)
- Downstream modules (profiles, teams, games)
- Third-party integrations (if any)

**Before Modifying**:
1. Create comprehensive regression tests
2. Document all current behavior
3. Get stakeholder approval
4. Test with existing tokens
5. Plan rollback strategy
```

## Part 3: Creating Regression Tests (7 min)

### Step 3.1: Generate Regression Tests

**Prompt to Claude:**
```
Create comprehensive E2E tests using Playwright that validate
the current authentication behavior as documented in the
retroactive specifications. These tests must capture ALL
current behavior so we can detect regressions.
```

**Claude Response:**
```
The playwright-tester skill is generating regression tests...

Reading specifications/modules/authentication/existing/...

Generating tests for:
  ✓ User registration flow
  ✓ Email verification flow
  ✓ Login flow (verified and unverified users)
  ✓ Password reset flow
  ✓ Error handling
  ✓ Edge cases
  ✓ Security constraints

✅ Created tests/e2e/auth-regression.spec.ts (42 tests)
✅ Created tests/e2e/helpers/auth-helpers.ts
✅ Created tests/e2e/fixtures/auth-test-data.ts

Regression tests created! These tests validate the CURRENT behavior.

IMPORTANT: Review these tests with stakeholders to ensure completeness.
Missing edge cases? Add tests NOW before modifying the system.

Run tests: npm run test:e2e
```

### Step 3.2: Review Generated Regression Tests (Sample)

```bash
cat tests/e2e/auth-regression.spec.ts | head -100
```

**Expected Tests (excerpt):**
```typescript
import { test, expect } from '@playwright/test';
import { registerUser, loginUser, resetDatabase } from './helpers/auth-helpers';

test.describe('Authentication Regression Tests - Current Behavior', () => {
  test.beforeEach(async () => {
    // Reset to known state
    await resetDatabase();
  });

  test.describe('User Registration', () => {
    test('should register user with valid data', async ({ page }) => {
      const uniqueEmail = `user${Date.now()}@test.com`;
      const uniqueUsername = `user${Date.now()}`;

      await page.goto('/register');
      await page.fill('[name="email"]', uniqueEmail);
      await page.fill('[name="username"]', uniqueUsername);
      await page.fill('[name="password"]', 'TestPass123');
      await page.click('button[type="submit"]');

      // Current behavior: Shows success message
      await expect(page.locator('.success-message'))
        .toContainText('Registration successful. Please check your email');
    });

    test('should reject duplicate email (case-insensitive)', async ({ page }) => {
      // Register first user
      await registerUser(page, 'duplicate@test.com', 'user1', 'Pass123');

      // Try to register with same email (different case)
      await page.goto('/register');
      await page.fill('[name="email"]', 'DUPLICATE@test.com');
      await page.fill('[name="username"]', 'user2');
      await page.fill('[name="password"]', 'Pass123');
      await page.click('button[type="submit"]');

      // Current behavior: Email already exists error
      await expect(page.locator('.error-message'))
        .toContainText('Email already exists');
    });

    test('should reject weak password', async ({ page }) => {
      await page.goto('/register');
      await page.fill('[name="email"]', 'test@test.com');
      await page.fill('[name="username"]', 'testuser');
      await page.fill('[name="password"]', 'weak');  // Too short, no uppercase, no number
      await page.click('button[type="submit"]');

      // Current behavior: Password strength error
      await expect(page.locator('.error-message'))
        .toContainText('Password must be at least 8 characters');
    });

    test('should reject invalid email format', async ({ page }) => {
      await page.goto('/register');
      await page.fill('[name="email"]', 'not-an-email');
      await page.fill('[name="username"]', 'testuser');
      await page.fill('[name="password"]', 'ValidPass123');
      await page.click('button[type="submit"]');

      // Current behavior: Email format error
      await expect(page.locator('.error-message'))
        .toContainText('Invalid email format');
    });
  });

  test.describe('User Login', () => {
    test('should login with verified email', async ({ page }) => {
      // Create verified user
      const email = 'verified@test.com';
      const password = 'TestPass123';
      await registerUser(page, email, 'verifieduser', password);
      await verifyEmail(page, email);  // Helper to verify email

      // Login
      await page.goto('/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');

      // Current behavior: Redirects to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="username"]'))
        .toContainText('verifieduser');
    });

    test('should reject unverified email', async ({ page }) => {
      // Create unverified user
      const email = 'unverified@test.com';
      const password = 'TestPass123';
      await registerUser(page, email, 'unverifieduser', password);
      // Don't verify email

      // Try to login
      await page.goto('/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');

      // Current behavior: Email verification required error
      await expect(page.locator('.error-message'))
        .toContainText('Please verify your email before logging in');
    });

    test('should use same error message for wrong email and wrong password', async ({ page }) => {
      // Create verified user
      await registerUser(page, 'real@test.com', 'realuser', 'RealPass123');
      await verifyEmail(page, 'real@test.com');

      // Test 1: Wrong email
      await page.goto('/login');
      await page.fill('[name="email"]', 'nonexistent@test.com');
      await page.fill('[name="password"]', 'anypass');
      await page.click('button[type="submit"]');
      const error1 = await page.locator('.error-message').textContent();

      // Test 2: Wrong password
      await page.goto('/login');
      await page.fill('[name="email"]', 'real@test.com');
      await page.fill('[name="password"]', 'wrongpass');
      await page.click('button[type="submit"]');
      const error2 = await page.locator('.error-message').textContent();

      // Current behavior: Same error message (security - prevents user enumeration)
      expect(error1).toBe(error2);
      expect(error1).toBe('Invalid credentials');
    });

    test('should enforce rate limiting after 5 failed attempts', async ({ page }) => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await page.goto('/login');
        await page.fill('[name="email"]', 'test@test.com');
        await page.fill('[name="password"]', 'wrongpass');
        await page.click('button[type="submit"]');
        await expect(page.locator('.error-message'))
          .toContainText('Invalid credentials');
      }

      // 6th attempt should be rate-limited
      await page.goto('/login');
      await page.fill('[name="email"]', 'test@test.com');
      await page.fill('[name="password"]', 'wrongpass');
      await page.click('button[type="submit"]');

      // Current behavior: Rate limit error
      await expect(page.locator('.error-message'))
        .toContainText('Too many login attempts. Please try again in 15 minutes');
    });
  });

  test.describe('Email Verification', () => {
    test('complete email verification flow', async ({ page, request }) => {
      // Register user
      const email = 'verify@test.com';
      await registerUser(page, email, 'verifyuser', 'TestPass123');

      // Get verification token from database (test helper)
      const token = await getVerificationToken(email);

      // Click verification link
      await page.goto(`/verify-email/${token}`);

      // Current behavior: Shows success message
      await expect(page.locator('.success-message'))
        .toContainText('Email verified successfully. You can now log in');

      // Verify user can now log in
      await page.goto('/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', 'TestPass123');
      await page.click('button[type="submit"]');

      // Should succeed
      await expect(page).toHaveURL('/dashboard');
    });

    test('should reject invalid verification token', async ({ page }) => {
      await page.goto('/verify-email/invalid-token-12345');

      // Current behavior: Invalid token error
      await expect(page.locator('.error-message'))
        .toContainText('Invalid or expired token');
    });
  });

  test.describe('Password Reset', () => {
    test('complete password reset flow', async ({ page }) => {
      // Create verified user
      const email = 'reset@test.com';
      const oldPassword = 'OldPass123';
      const newPassword = 'NewPass456';
      await registerUser(page, email, 'resetuser', oldPassword);
      await verifyEmail(page, email);

      // Request password reset
      await page.goto('/forgot-password');
      await page.fill('[name="email"]', email);
      await page.click('button[type="submit"]');

      // Current behavior: Always shows success (security)
      await expect(page.locator('.success-message'))
        .toContainText('If that email exists, a password reset link has been sent');

      // Get reset token from database
      const token = await getResetToken(email);

      // Reset password
      await page.goto(`/reset-password/${token}`);
      await page.fill('[name="newPassword"]', newPassword);
      await page.click('button[type="submit"]');

      // Current behavior: Success message
      await expect(page.locator('.success-message'))
        .toContainText('Password reset successful. Please log in with your new password');

      // Verify can log in with NEW password
      await page.goto('/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', newPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Verify OLD password no longer works
      await page.goto('/logout');
      await page.goto('/login');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', oldPassword);
      await page.click('button[type="submit"]');
      await expect(page.locator('.error-message'))
        .toContainText('Invalid credentials');
    });

    test('should reject expired reset token', async ({ page }) => {
      // Create user and get reset token
      const email = 'expired@test.com';
      await registerUser(page, email, 'expireduser', 'Pass123');
      await verifyEmail(page, email);
      await requestPasswordReset(page, email);
      const token = await getResetToken(email);

      // Manually expire token (test helper sets expires to past)
      await expireResetToken(email);

      // Try to use expired token
      await page.goto(`/reset-password/${token}`);
      await page.fill('[name="newPassword"]', 'NewPass789');
      await page.click('button[type="submit"]');

      // Current behavior: Expired token error
      await expect(page.locator('.error-message'))
        .toContainText('Invalid or expired token');
    });
  });
});

// Total: 42 regression tests covering all current behavior
```

### Step 3.3: Run Regression Tests (Establish Baseline)

```bash
npm run test:e2e -- tests/e2e/auth-regression.spec.ts
```

**Expected Output:**
```
Running 42 tests using 3 workers

  ✓  [chromium] › auth-regression.spec.ts:15:1 › should register user with valid data (1.8s)
  ✓  [chromium] › auth-regression.spec.ts:28:1 › should reject duplicate email (1.5s)
  ✓  [chromium] › auth-regression.spec.ts:42:1 › should reject weak password (1.2s)
  ... (all 42 tests pass)

42 passed (3.2m)

✅ BASELINE ESTABLISHED
All 42 regression tests pass. This is the current behavior.
Any changes that cause these tests to fail indicate a regression.
```

**CRITICAL STEP**: Review with stakeholders!

**Prompt to Claude:**
```
Generate a regression test review checklist for stakeholders.
```

**Claude generates:**
```markdown
# Regression Test Review Checklist

Please review these tests to ensure they capture ALL current behavior:

## Registration
- [ ] Valid registration flow
- [ ] Duplicate email detection (case-insensitive)
- [ ] Duplicate username detection (case-insensitive)
- [ ] Password strength validation
- [ ] Email format validation
- [ ] Username format validation

## Login
- [ ] Login with verified email
- [ ] Block login with unverified email
- [ ] Same error for wrong email and wrong password
- [ ] Rate limiting (5 attempts per 15 min)
- [ ] Case-insensitive email lookup

## Email Verification
- [ ] Complete verification flow
- [ ] Invalid token rejection
- [ ] Already verified handling

## Password Reset
- [ ] Complete reset flow
- [ ] Expired token rejection
- [ ] Token one-time use
- [ ] Old password invalidated after reset

## Missing Edge Cases? (Add tests if needed)
- [ ] Special characters in password
- [ ] Unicode in username
- [ ] Concurrent registration attempts
- [ ] Session invalidation after password reset
- [ ] Email service failure handling

**Stakeholder Sign-Off**: _______________
**Date**: _______________
```

**User reviews, confirms all tests are complete. ✅**

## Part 4: Planning New Feature - Google OAuth (8 min)

### Step 4.1: Plan OAuth Feature

**Prompt to Claude:**
```
Plan implementation of Google OAuth login as a new feature.
It should:
- Allow users to sign up with Google
- Allow existing users to link Google to their account
- Maintain backward compatibility with email/password auth
- NOT break any existing functionality

Reference the existing authentication specs and ensure
all constraints are preserved.
```

**Claude Response:**
```
The increment-planner skill is creating an implementation plan...

Reading existing specifications...
  ✓ specifications/modules/authentication/existing/overview.md
  ✓ specifications/modules/authentication/existing/constraints.md

Analyzing impact...
  ⚠️  High-risk modification (authentication module)
  ✓ Regression tests exist
  ✓ Constraints documented

Creating feature plan with safety measures...

✅ Created features/015-google-oauth/
✅ Created features/015-google-oauth/spec.md
✅ Created features/015-google-oauth/plan.md
✅ Created features/015-google-oauth/tasks.md
✅ Created features/015-google-oauth/tests.md
✅ Created features/015-google-oauth/context-manifest.yaml

Feature 015 planned!

⚠️  CRITICAL CONSTRAINTS:
- MUST NOT modify existing auth flow
- MUST pass all 42 regression tests
- Database changes must be additive only
- JWT payload can be extended but not modified

Review the plan before implementing.
```

### Step 4.2: Review Feature Plan (Excerpts)

```bash
cat features/015-google-oauth/spec.md
```

**Content (excerpt):**
```markdown
# Feature 015: Google OAuth Login

## Overview
Add Google OAuth as an alternative authentication method while
maintaining 100% backward compatibility with existing email/password auth.

## Requirements

### FR-1: OAuth Registration
- User can sign up with Google account
- Email from Google used as primary email
- Username auto-generated or prompted
- No password required for OAuth-only users

### FR-2: OAuth Login
- User can log in with "Sign in with Google" button
- Redirects to Google OAuth consent screen
- Returns to app with authentication

### FR-3: Account Linking
- If Google email matches existing email/password user, prompt to link
- Requires password verification before linking
- Linked accounts can use either method

## Backward Compatibility

### MUST NOT CHANGE
- Existing email/password flow (100% unchanged)
- JWT payload structure (can only ADD optional fields)
- Session management (7-day expiration)
- Database schema for `users` table (only ADDITIONS)
- API endpoints (only ADDITIONS)
- Error messages
- Rate limiting
- Email verification for email/password users

### MUST PRESERVE
- All 42 existing regression tests MUST pass
- Existing user sessions remain valid
- Mobile app compatibility (existing endpoints unchanged)

## Database Changes (Additive Only)

```sql
-- Add columns to existing users table
ALTER TABLE users
ADD COLUMN oauth_provider VARCHAR(50),
ADD COLUMN oauth_id VARCHAR(255),
ADD COLUMN oauth_picture TEXT,
ADD COLUMN oauth_email_verified BOOLEAN DEFAULT FALSE;

-- Add index for OAuth lookups
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);

-- Add constraint: if oauth_provider is set, oauth_id must be set
ALTER TABLE users
ADD CONSTRAINT chk_oauth CHECK (
  (oauth_provider IS NULL AND oauth_id IS NULL) OR
  (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)
);
```

## API Additions

**New endpoints (existing endpoints UNCHANGED)**:
- GET /api/auth/google - Initiates OAuth flow
- GET /api/auth/google/callback - Handles OAuth callback
- POST /api/auth/link-google - Links Google to existing account

**Modified JWT payload (BACKWARD COMPATIBLE)**:
```json
{
  "userId": "uuid",        // Existing
  "email": "string",       // Existing
  "username": "string",    // Existing
  "oauthProvider": "google",  // NEW (optional)
  "iat": number,           // Existing
  "exp": number            // Existing
}
```

Old tokens without `oauthProvider` remain valid.

## Constraints from Existing System

From specifications/modules/authentication/existing/constraints.md:

1. JWT secret MUST NOT change
2. JWT expiration MUST remain 7 days
3. bcrypt MUST remain (for email/password users)
4. Email verification MUST remain for email/password users
5. Error messages MUST remain unchanged
6. Rate limiting MUST be maintained
7. API endpoint URLs MUST NOT change

## Impact Analysis

**Affected Files (NEW)**:
- src/auth/google-oauth.service.ts (create)
- src/auth/google-oauth.controller.ts (create)
- src/routes/google-oauth.routes.ts (create)
- src/components/GoogleLoginButton.tsx (create)

**Affected Files (MODIFIED)**:
- src/auth/entities/user.entity.ts (add OAuth columns)
- src/auth/auth.service.ts (add linkGoogleAccount method)
- Database migration (additive only)

**NOT Affected (UNCHANGED)**:
- src/auth/auth.controller.ts (existing endpoints)
- src/auth/jwt.strategy.ts (JWT validation)
- All email/password logic

## Testing Strategy

**Regression Tests**: All 42 existing tests MUST pass

**New Tests**:
- OAuth registration flow
- OAuth login flow
- Account linking (with password verification)
- Unlink account
- Login with either method after linking
- OAuth email verification (trust Google's verification)

## Risk Mitigation

1. Pre-implementation hook: Verify regression tests pass
2. Post-implementation hook: Re-run regression tests
3. Feature flag: OAuth can be disabled if issues arise
4. Rollback plan: Drop new columns, remove new routes
```

### Step 4.3: Review Context Manifest

```bash
cat features/015-google-oauth/context-manifest.yaml
```

**Content:**
```yaml
---
spec_sections:
  # Existing auth to understand and preserve
  - specifications/modules/authentication/existing/overview.md
  - specifications/modules/authentication/existing/api-contracts.md
  - specifications/modules/authentication/existing/business-rules.md
  - specifications/modules/authentication/existing/constraints.md

  # New OAuth spec
  - features/015-google-oauth/spec.md

documentation:
  - .specweave/docs/architecture/authentication.md

code:
  # Existing code to understand (but NOT modify)
  - src/auth/auth.service.ts
  - src/auth/auth.controller.ts
  - src/auth/jwt.strategy.ts
  - src/auth/entities/user.entity.ts

  # New code to create
  - src/auth/google-oauth.service.ts (create)
  - src/auth/google-oauth.controller.ts (create)

tests:
  # Regression tests that MUST still pass
  - tests/e2e/auth-regression.spec.ts

constraints:
  - MUST NOT modify existing auth endpoints
  - MUST pass all 42 regression tests
  - Database changes additive only
  - JWT payload backward compatible

max_context_tokens: 12000
priority: high
---
```

## Part 5: Safe Implementation with Regression Protection (10 min)

### Step 5.1: Implement OAuth Feature

**Prompt to Claude:**
```
Implement feature 015-google-oauth following the plan.
Ensure all constraints are followed and regression tests
still pass.
```

**Claude Response:**
```
The pre-implementation hook is checking safety...

⚠️  Pre-Implementation Safety Check

Detected: Modification to authentication module (HIGH RISK)

Verifying prerequisites:
  ✅ Retroactive specifications exist
  ✅ Regression tests exist (42 tests)
  ✅ Context manifest defined
  ✅ Constraints documented

Running baseline regression tests...

🧪 Running tests/e2e/auth-regression.spec.ts...

  ✓ All 42 regression tests passed

✅ BASELINE ESTABLISHED
Proceeding with implementation...

---

The developer skill is implementing Google OAuth...

Loading context from context-manifest.yaml...
Context loaded: 11,234 tokens

📝 Creating database migration...
✅ Created src/db/migrations/015_add_oauth_columns.sql (additive only)

📝 Creating OAuth service...
✅ Created src/auth/google-oauth.service.ts

📝 Creating OAuth controller...
✅ Created src/auth/google-oauth.controller.ts

📝 Adding routes...
✅ Created src/routes/google-oauth.routes.ts

📝 Updating user entity (adding optional OAuth fields)...
✅ Modified src/auth/entities/user.entity.ts (added OAuth columns)

📝 Adding account linking to auth service...
✅ Modified src/auth/auth.service.ts (added linkGoogleAccount method)

📝 Creating frontend component...
✅ Created src/components/GoogleLoginButton.tsx

📝 Creating OAuth callback page...
✅ Created src/pages/OAuthCallback.tsx

Implementation complete!

---

🧪 Re-running regression tests...

Running tests/e2e/auth-regression.spec.ts...

  ✓ All 42 regression tests still pass ✅

✅ NO REGRESSIONS DETECTED

---

The qa-engineer skill is generating new tests for OAuth...

✅ Created tests/e2e/oauth-flow.spec.ts (12 new tests)

---

The playwright-tester skill added E2E tests...

✅ Created tests/e2e/oauth-complete-flow.spec.ts (8 tests)

Total new tests: 20

---

Running new OAuth tests...

  ✓ All 20 new OAuth tests pass ✅

---

✅ IMPLEMENTATION SUCCESSFUL

Summary:
  - 42 regression tests: ✅ PASS (no regressions)
  - 20 new OAuth tests: ✅ PASS
  - Total: 62 tests passing

Ready for review and deployment.
```

### Step 5.2: Review Implementation (Sample)

```bash
cat src/auth/google-oauth.service.ts | head -80
```

**Generated Code (excerpt):**
```typescript
import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';  // Reuse existing JWT logic

@Injectable()
export class GoogleOAuthService {
  private client: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * Get Google OAuth URL for authentication
   */
  getAuthUrl(): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
    });
  }

  /**
   * Authenticate user with Google OAuth code
   */
  async authenticate(code: string) {
    // Get tokens from Google
    const { tokens } = await this.client.getToken(code);
    this.client.setCredentials(tokens);

    // Verify ID token and get user info
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token');
    }

    // Check if user exists with this OAuth ID
    let user = await this.usersService.findByOAuth('google', payload.sub);

    if (!user) {
      // Check if email exists (account linking scenario)
      const existingUser = await this.usersService.findByEmail(payload.email!);

      if (existingUser) {
        // User exists with email/password
        // Require explicit linking (with password verification)
        return {
          requiresLinking: true,
          email: payload.email,
          oauthId: payload.sub,
          oauthPicture: payload.picture,
        };
      }

      // Create new OAuth user
      user = await this.usersService.create({
        email: payload.email!,
        username: this.generateUsername(payload.email!),
        oauth_provider: 'google',
        oauth_id: payload.sub,
        oauth_picture: payload.picture,
        oauth_email_verified: payload.email_verified,
        email_verified: payload.email_verified,  // Trust Google's verification
        password: null,  // No password for OAuth-only users
      });
    }

    // Generate JWT using EXISTING auth service (maintains compatibility)
    // This ensures JWT structure remains the same
    const token = await this.authService.generateJWT({
      userId: user.id,
      email: user.email,
      username: user.username,
      oauthProvider: 'google',  // NEW optional field
    });

    return { token, user };
  }

  /**
   * Generate username from email
   */
  private generateUsername(email: string): string {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const random = Math.floor(Math.random() * 1000);
    return `${base}${random}`;
  }
}
```

**Key Points**:
- Reuses existing `AuthService.generateJWT()` (maintains JWT structure)
- OAuth users trust Google's email verification
- Account linking requires password verification
- No modifications to existing auth flow

## Part 6: Validation (5 min)

### Step 6.1: Run All Tests

```bash
npm run test:all
```

**Output:**
```
Running all tests...

📦 Unit Tests
  ✓ 34 unit tests passed

📦 Integration Tests
  ✓ 18 integration tests passed

🎭 E2E Tests - Regression
  ✓ 42 regression tests passed (NO REGRESSIONS)

🎭 E2E Tests - OAuth
  ✓ 20 OAuth tests passed

---

✅ ALL TESTS PASSED

Total: 114 tests
  - Regression: 42 ✅
  - New features: 20 ✅
  - Unit: 34 ✅
  - Integration: 18 ✅

Duration: 4m 23s
```

### Step 6.2: Generate Validation Report

**Prompt to Claude:**
```
Generate a comprehensive validation report for feature 015.
```

**Claude Response:**
```markdown
# Validation Report: Feature 015 (Google OAuth)

**Date**: 2025-01-26
**Feature**: Google OAuth Login
**Status**: ✅ READY FOR DEPLOYMENT

## Test Results

### Regression Tests (Existing Behavior)
- **Total**: 42 tests
- **Passed**: 42 ✅
- **Failed**: 0
- **Conclusion**: NO REGRESSIONS DETECTED

All existing authentication flows remain intact:
- ✅ Email/password registration
- ✅ Email/password login
- ✅ Email verification
- ✅ Password reset
- ✅ Rate limiting
- ✅ Error messages unchanged
- ✅ JWT structure backward compatible

### New Feature Tests (OAuth)
- **Total**: 20 tests
- **Passed**: 20 ✅
- **Failed**: 0

OAuth flows validated:
- ✅ New user signs up with Google
- ✅ OAuth user logs in with Google
- ✅ Existing user sees account linking prompt
- ✅ User links Google to existing account (with password)
- ✅ Linked user can use either login method
- ✅ OAuth failure shows appropriate error
- ✅ Invalid OAuth token rejected
- ✅ OAuth user profile picture synced

## Coverage Analysis

**Scenarios Tested**:
- [x] New user with Google (no existing account)
- [x] Existing OAuth user logs in again
- [x] Existing email/password user encounters matching Google email
- [x] User provides password to link accounts
- [x] User declines account linking
- [x] Linked user logs in with email/password
- [x] Linked user logs in with Google
- [x] OAuth returns error
- [x] Invalid OAuth code
- [x] Google email not verified (still trusted)

**Edge Cases**:
- [x] Email from OAuth matches existing user
- [x] User cancels Google OAuth flow
- [x] OAuth returns no email
- [x] Username collision (auto-generated username)
- [x] OAuth picture URL changes

## Database Changes

**Migration**: `015_add_oauth_columns.sql`

```sql
-- Additive only (no existing columns modified)
ALTER TABLE users
ADD COLUMN oauth_provider VARCHAR(50),
ADD COLUMN oauth_id VARCHAR(255),
ADD COLUMN oauth_picture TEXT,
ADD COLUMN oauth_email_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

**Impact**: SAFE (additive only, no data loss risk)

## API Changes

**New Endpoints**:
- GET /api/auth/google
- GET /api/auth/google/callback
- POST /api/auth/link-google

**Existing Endpoints**: UNCHANGED ✅

**JWT Payload Changes**:
- Added optional field: `oauthProvider`
- Backward compatible (old tokens still valid) ✅

## Security Review

- ✅ OAuth state parameter prevents CSRF
- ✅ ID token verification prevents spoofing
- ✅ Account linking requires password
- ✅ Rate limiting applies to OAuth endpoints
- ✅ Email verification trusted from Google
- ✅ No sensitive data in URLs

## Performance Impact

- Minimal (OAuth only used when user chooses it)
- No impact on existing email/password flow
- Database index added for OAuth lookups

## Rollback Plan

If issues arise:
1. Disable OAuth routes (feature flag)
2. Users can still use email/password
3. Database rollback: DROP new columns (safe, no data loss)

## Deployment Recommendation

✅ **APPROVED FOR DEPLOYMENT**

- All tests pass
- No regressions
- Backward compatible
- Safe rollback plan
- Low risk

## Confidence Level

**HIGH** - Ready for production deployment

---

**Validated By**: brownfield-analyzer, playwright-tester, qa-engineer
**Approved By**: [Stakeholder signature]
**Date**: 2025-01-26
```

## Part 7: Documentation Auto-Update (2 min)

### Step 7.1: Mark Feature Complete

**Prompt to Claude:**
```
Mark feature 015-google-oauth as complete.
```

**Claude Response:**
```
Marking feature 015-google-oauth as complete...

⚠️  Post-Task-Completion Hook Triggered

🔔 Task completed sound notification played!

Detecting changes...
  - New feature: features/015-google-oauth/
  - Database migration: 015_add_oauth_columns.sql
  - New API endpoints: /api/auth/google*
  - Modified: user entity (OAuth columns)

The docs-updater skill is updating documentation...

✅ Updated .specweave/docs/api/api.md (added OAuth endpoints)
✅ Created .specweave/docs/architecture/oauth-integration.md
✅ Updated .specweave/docs/architecture/authentication.md
✅ Updated .specweave/docs/changelog/2025-01.md
✅ Updated CLAUDE.md

Git commit:
  docs: auto-update after feature 015 (Google OAuth) completion

  - Added OAuth endpoints to API reference
  - Created OAuth integration architecture doc
  - Updated authentication architecture
  - Updated changelog

  🤖 Generated with Claude Code
  Co-Authored-By: Claude <noreply@anthropic.com>

✅ Feature 015 marked as complete!
```

## Summary

**What We Accomplished:**
- ✅ Analyzed existing authentication system (12,400 lines)
- ✅ Generated retroactive specifications (6 comprehensive docs)
- ✅ Created 42 regression tests (baseline established)
- ✅ Planned Google OAuth feature (with safety constraints)
- ✅ Implemented OAuth safely (no modifications to existing code)
- ✅ Validated with tests (62 total: 42 regression + 20 new)
- ✅ NO REGRESSIONS (all existing tests still pass)
- ✅ Auto-updated documentation

**SpecWeave Brownfield Features Demonstrated:**
1. **brownfield-analyzer** - Automated analysis of existing code
2. **Retroactive specifications** - Documentation generated from code
3. **Regression tests** - Comprehensive E2E tests for current behavior
4. **Pre-implementation hook** - Safety checks before modifying code
5. **Context precision** - Loaded only 12k tokens (vs 50k+)
6. **Constraint enforcement** - Preserved all critical constraints
7. **Post-task validation** - Re-ran regression tests automatically
8. **Living documentation** - Auto-updated after completion

**Time Breakdown:**
- Onboarding: 5 minutes
- Analysis: 8 minutes
- Regression tests: 7 minutes
- Feature planning: 8 minutes
- Implementation: 10 minutes
- Validation: 5 minutes
- Documentation: 2 minutes (automatic)

**Total**: 40 minutes from existing codebase to safely extended feature!

**Key Takeaway**: Brownfield development with SpecWeave is SAFE because:
- Current behavior is documented automatically
- Regression tests capture all edge cases
- Pre/post hooks enforce safety
- Constraints are explicit and enforced
- Rollback is always possible

This is how you transform legacy codebases without breaking production! 🎉
