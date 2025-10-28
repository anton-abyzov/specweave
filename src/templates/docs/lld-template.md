# LLD: [Service/Component Name]

**Status**: draft | review | approved | deprecated
**Author**: [Your Name]
**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Reviewers**: @tech-lead, @senior-engineer

**Related HLD**: [Link to HLD](hld-{system-name}.md)

---

## Context

**Why does this component exist?**

Link to the high-level design and explain the context:
- **HLD**: [Link to HLD](hld-{system-name}.md)
- **Component Purpose**: What specific problem does this component solve?
- **Scope**: What is within and outside this component's responsibility?

## Component Overview (C4 Level 3)

**Internal structure of this service/component**

**Diagram File**: `lld-{component-name}.c4-component.mmd` (co-located with this file)

```mermaid
graph TB
    subgraph "Auth Service Container"
        Controller[Auth Controller]
        Service[Auth Service]
        Validator[Input Validator]
        TokenManager[JWT Token Manager]
        Repository[User Repository]
        Cache[Cache Layer]

        Controller -->|validate| Validator
        Controller -->|authenticate| Service
        Service -->|generateToken| TokenManager
        Service -->|getUser| Repository
        Repository -->|check cache| Cache
        Repository -->|query| DB[(User Database)]
        Cache -->|miss| DB
    end

    Client[External Client] -->|HTTP Request| Controller
    Controller -->|Response| Client
```

**Component Responsibilities**:
- **Auth Controller**: HTTP request handling, input validation, response formatting
- **Auth Service**: Core authentication logic, orchestrates validation and token generation
- **Input Validator**: Request validation, sanitization, security checks
- **JWT Token Manager**: JWT token creation, validation, refresh
- **User Repository**: User data access, caching strategy
- **Cache Layer**: In-memory caching for frequently accessed user data

**Related Diagrams**:
- `lld-{component-name}.c4-component.mmd` - Component internal structure (this diagram)
- `lld-{component-name}.sequence-login.mmd` - Login flow sequence
- `lld-{component-name}.class.mmd` - Class diagram (if applicable)

**See**: [Diagram Conventions](../delivery/guides/diagram-conventions-comprehensive.md) for C4 diagram best practices.

## API / Interface Specification

### Public Interfaces

**Endpoints** (if HTTP service):
```
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/validate
```

**Methods** (if library/module):
```typescript
interface AuthService {
  login(credentials: Credentials): Promise<AuthToken>
  logout(token: string): Promise<void>
  refresh(refreshToken: string): Promise<AuthToken>
  validate(token: string): Promise<User>
}
```

### Internal Interfaces

**Between components within this service**:
```typescript
interface UserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  updateLastLogin(userId: string): Promise<void>
}

interface TokenManager {
  generate(user: User): Promise<AuthToken>
  validate(token: string): Promise<TokenPayload>
  refresh(refreshToken: string): Promise<AuthToken>
}
```

## Detailed Flow Diagrams

### Login Flow (Sequence Diagram)

**Diagram File**: `lld-{component-name}.sequence-login.mmd`

```mermaid
sequenceDiagram
    participant Client
    participant Controller as Auth Controller
    participant Validator
    participant Service as Auth Service
    participant Repo as User Repository
    participant Cache
    participant DB as Database
    participant TokenMgr as Token Manager

    Client->>Controller: POST /auth/login {email, password}
    Controller->>Validator: validate(request)
    Validator-->>Controller: ValidationResult

    alt validation failed
        Controller-->>Client: 400 Bad Request
    end

    Controller->>Service: authenticate(email, password)
    Service->>Repo: findByEmail(email)
    Repo->>Cache: get(email)

    alt cache hit
        Cache-->>Repo: User data
    else cache miss
        Repo->>DB: SELECT * FROM users WHERE email=?
        DB-->>Repo: User row
        Repo->>Cache: set(email, user)
    end

    Repo-->>Service: User | null

    alt user not found
        Service-->>Controller: AuthError(USER_NOT_FOUND)
        Controller-->>Client: 401 Unauthorized
    end

    Service->>Service: verifyPassword(password, user.hash)

    alt password invalid
        Service-->>Controller: AuthError(INVALID_PASSWORD)
        Controller-->>Client: 401 Unauthorized
    end

    Service->>TokenMgr: generate(user)
    TokenMgr-->>Service: AuthToken
    Service->>Repo: updateLastLogin(user.id)
    Service-->>Controller: AuthToken
    Controller-->>Client: 200 OK {token, refreshToken}
```

### Error Handling Flow

```mermaid
graph TB
    Request[Incoming Request] --> Validator{Valid?}
    Validator -->|No| BadRequest[400 Bad Request]
    Validator -->|Yes| Auth{Authenticated?}
    Auth -->|No| Unauthorized[401 Unauthorized]
    Auth -->|Yes| Authorized{Authorized?}
    Authorized -->|No| Forbidden[403 Forbidden]
    Authorized -->|Yes| Process[Process Request]
    Process --> DBError{DB Error?}
    DBError -->|Yes| ServerError[500 Internal Error]
    DBError -->|No| Success[200 OK]
```

## Data Models (Component-Specific)

### Internal Data Structures

```typescript
// Domain entities (internal representation)
interface User {
  id: string
  email: string
  passwordHash: string
  salt: string
  role: UserRole
  mfaEnabled: boolean
  mfaSecret?: string
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}
```

### Database Schema (if applicable)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_login ON users(last_login);
```

### Caching Strategy

```yaml
cache_keys:
  user_by_email: "user:email:{email}"
  user_by_id: "user:id:{id}"
  token_blacklist: "token:blacklist:{jti}"

ttl:
  user_data: 300  # 5 minutes
  token_blacklist: 86400  # 24 hours (until token expires)

invalidation:
  - On user update: Clear user:email:{email} and user:id:{id}
  - On logout: Add token:blacklist:{jti}
```

## Implementation Details

### Technology Stack (Component-Specific)
- **Language**: TypeScript / Node.js
- **Framework**: Express.js / Fastify / NestJS
- **ORM**: Prisma / TypeORM
- **Caching**: Redis
- **Authentication**: jsonwebtoken library
- **Validation**: Zod / Joi / class-validator
- **Password Hashing**: bcrypt / argon2

### Key Algorithms

**Password Verification**:
```typescript
async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  // Use constant-time comparison to prevent timing attacks
  return await bcrypt.compare(plainPassword, hash)
}
```

**Token Generation**:
```typescript
function generateToken(user: User): AuthToken {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  }

  const accessToken = jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' })
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
    expiresIn: '7d'
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600,
    tokenType: 'Bearer'
  }
}
```

### Configuration

```typescript
interface AuthConfig {
  jwt: {
    secret: string
    refreshSecret: string
    algorithm: 'HS256' | 'RS256'
    expiresIn: string
    refreshExpiresIn: string
  }
  password: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    saltRounds: number
  }
  rateLimit: {
    maxAttempts: number
    windowMs: number
    blockDurationMs: number
  }
  mfa: {
    enabled: boolean
    issuer: string
  }
}
```

## Security Considerations (Component-Level)

### Input Validation
- **Email**: RFC 5322 compliant, max 255 chars
- **Password**: 8-128 chars, complexity requirements enforced
- **Sanitization**: Strip HTML/SQL injection attempts
- **Rate Limiting**: Max 5 login attempts per 15 minutes per IP

### Token Security
- **Algorithm**: HS256 (or RS256 for distributed systems)
- **Secret Rotation**: Rotate JWT secrets quarterly
- **Token Expiry**: Access token: 1 hour, Refresh token: 7 days
- **Blacklisting**: Store revoked tokens in Redis until expiry

### Password Security
- **Hashing**: bcrypt with cost factor 12 (or argon2id)
- **Salt**: Unique per-user salt (handled by bcrypt)
- **Storage**: Never log or transmit plaintext passwords
- **Complexity**: Enforced at validator level

### Sensitive Data Handling
- **Logging**: Never log passwords, tokens, or PII
- **Masking**: Mask sensitive fields in logs (e.g., email → e***@example.com)
- **Encryption at Rest**: Database column encryption for PII

## Performance Considerations

### Optimization Strategies
- **Caching**: Redis cache for user lookups (5 min TTL)
- **Database Indexes**: Index on email column for fast lookups
- **Connection Pooling**: Max 20 database connections
- **Async Operations**: All I/O operations are async/await

### Performance Targets (Component-Specific)
- **Login Latency**: p95 < 200ms, p99 < 500ms
- **Token Validation**: p95 < 50ms, p99 < 100ms
- **Throughput**: 500 req/sec per instance
- **Cache Hit Rate**: > 80% for user lookups

### Monitoring & Metrics
```typescript
metrics:
  - auth.login.success_count
  - auth.login.failure_count
  - auth.login.duration_ms
  - auth.token.validation.duration_ms
  - auth.cache.hit_rate
  - auth.cache.miss_count
  - auth.db.query.duration_ms
```

## Error Handling

### Error Types

```typescript
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    public httpStatus: number,
    message: string
  ) {
    super(message)
  }
}
```

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "statusCode": 401,
    "timestamp": "2025-01-20T10:30:00Z",
    "path": "/auth/login"
  }
}
```

### Retry Strategy
- **Client Errors (4xx)**: Do not retry
- **Server Errors (5xx)**: Retry with exponential backoff (max 3 retries)
- **Database Errors**: Retry transient errors (connection timeout, deadlock)

## Testing Strategy

### Unit Tests
```typescript
describe('AuthService', () => {
  describe('authenticate', () => {
    test('should return token for valid credentials', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'SecurePass123' }

      // Act
      const result = await authService.authenticate(credentials)

      // Assert
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
    })

    test('should throw error for invalid password', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'WrongPass' }

      // Act & Assert
      await expect(authService.authenticate(credentials))
        .rejects.toThrow(AuthError)
    })
  })
})
```

### Integration Tests
```typescript
describe('Auth API Integration', () => {
  test('POST /auth/login with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'SecurePass123' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('accessToken')
  })
})
```

### Component Tests
- Test all public interfaces
- Test error handling paths
- Test rate limiting
- Test token validation edge cases
- Test cache invalidation

**Test Coverage Target**: > 80% for critical paths

## Dependencies

### External Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "zod": "^3.22.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.3.0"
  }
}
```

### Internal Dependencies
- **Database Module**: User data persistence
- **Logging Module**: Structured logging
- **Config Module**: Environment configuration
- **Metrics Module**: Performance monitoring

## Deployment Considerations

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=<secret-key>
JWT_REFRESH_SECRET=<refresh-secret>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000
```

### Health Checks
```typescript
GET /auth/health

Response:
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy"
  },
  "timestamp": "2025-01-20T10:30:00Z"
}
```

### Graceful Shutdown
1. Stop accepting new requests
2. Complete in-flight requests (max 30s timeout)
3. Close database connections
4. Close Redis connections
5. Exit process

## Open Questions / TODOs

- [ ] **Q1**: Should we support OAuth 2.0 providers (Google, GitHub)?
  - **Owner**: @tech-lead
  - **Due Date**: YYYY-MM-DD

- [ ] **Q2**: Should we implement passwordless login (magic links)?
  - **Owner**: @product-manager
  - **Due Date**: YYYY-MM-DD

- [ ] **TODO1**: Implement MFA support (TOTP)
  - **Assignee**: @developer
  - **Priority**: P2

## Related Documentation

- [HLD: System Architecture](hld-{system-name}.md)
- [ADR: Authentication Method](adr/0001-use-jwt-tokens.md)
- [RFC: Auth API Specification](rfc/0001-auth-api.md)
- [Runbook: Auth Service Operations](../operations/runbook-auth-service.md)
- [Diagram Conventions](../../DIAGRAM-CONVENTIONS.md) - C4 diagram best practices

---

**Approval**:
- [ ] Tech Lead: @name
- [ ] Senior Engineer: @name
- [ ] Security: @name
