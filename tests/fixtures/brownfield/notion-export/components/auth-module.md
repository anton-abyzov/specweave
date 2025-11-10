---
expected_type: module
expected_confidence: high
source: notion
keywords_density: high
---

# Authentication Module

## Overview

The authentication module provides centralized authentication and authorization capabilities for the application.

## Architecture

```
auth-module/
├── services/
│   ├── AuthService.ts      # Core authentication logic
│   ├── TokenService.ts     # JWT token management
│   └── SessionService.ts   # Session management
├── middleware/
│   ├── authMiddleware.ts   # Express middleware
│   └── rateLimiter.ts      # Rate limiting
├── models/
│   └── User.ts             # User model
└── controllers/
    └── AuthController.ts   # HTTP endpoints
```

## Components

### AuthService

**Purpose**: Core authentication logic

**Methods**:
- `register(email, password)` - Register new user
- `login(email, password)` - Authenticate user
- `logout(userId)` - Invalidate session
- `refreshToken(refreshToken)` - Get new access token

**Dependencies**: TokenService, SessionService, UserRepository

### TokenService

**Purpose**: JWT token generation and validation

**Methods**:
- `generateAccessToken(userId)` - Create 15min JWT
- `generateRefreshToken(userId)` - Create 7-day JWT
- `verifyToken(token)` - Validate JWT signature
- `decodeToken(token)` - Extract payload

**Configuration**:
- Secret: `process.env.JWT_SECRET`
- Algorithm: HS256

### SessionService

**Purpose**: Session management with Redis

**Methods**:
- `createSession(userId, metadata)` - Store session
- `getSession(sessionId)` - Retrieve session
- `destroySession(sessionId)` - Delete session
- `refreshSession(sessionId)` - Extend TTL

**Storage**: Redis with 24-hour TTL

## API Endpoints

### POST /auth/register
**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "userId": "uuid",
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token"
}
```

### POST /auth/login
Similar to register endpoint.

### POST /auth/logout
**Headers**: `Authorization: Bearer <token>`
**Response**: `204 No Content`

## Security Considerations

- Password hashing: bcrypt with salt rounds = 10
- Rate limiting: 5 attempts per 15 minutes per IP
- HTTPS only in production
- Secure cookie flags: httpOnly, secure, sameSite=strict
- Token rotation on refresh

## Testing

See `tests/unit/auth/` for unit tests
See `tests/integration/auth/` for API tests

**Coverage**: 92% (target: 90%+)

## Integration Points

- User service: User CRUD operations
- Email service: Verification emails
- Logging service: Audit logs
- Monitoring: Authentication metrics
