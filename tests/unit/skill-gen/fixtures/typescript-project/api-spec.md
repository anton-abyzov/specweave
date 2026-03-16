# API Specification

## REST Endpoints

All endpoints follow RESTful conventions with versioned paths (`/api/v1/*`). Request bodies are validated using Zod schemas that are shared between frontend and backend via a `@app/shared` package.

### Authentication

JWT-based auth with short-lived access tokens (15 min) and long-lived refresh tokens (30 days). The `authMiddleware` extracts and verifies tokens from the `Authorization: Bearer` header. Failed verification returns `401 Unauthorized` with a machine-readable error code.

Token refresh is handled by a dedicated `/api/v1/auth/refresh` endpoint that accepts the refresh token in an httpOnly cookie.

### Validation

Every endpoint handler starts with a Zod `.parse()` call on the request body/params/query. Validation errors are caught by the error middleware and returned as `400 Bad Request` with field-level error details.

Shared schemas are exported from `@app/shared/schemas` and used by both the API handlers and the React form validation layer. This ensures frontend and backend validation rules stay in sync.

### Rate Limiting

API rate limiting uses a sliding window counter backed by Redis. Default limits: 100 req/min for authenticated users, 20 req/min for anonymous. The `X-RateLimit-*` headers are included in all responses.
