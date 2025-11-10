---
expected_type: module
expected_confidence: medium
source: notion
keywords_density: medium
---

# API Design Guidelines

## REST API Conventions

Our APIs follow REST principles with these conventions:

### Resource Naming
- Use plural nouns: `/users`, `/orders`, `/products`
- Nest resources: `/users/{id}/orders`
- Use kebab-case: `/order-items`

### HTTP Methods
- GET: Retrieve resources
- POST: Create new resource
- PUT: Replace entire resource
- PATCH: Partial update
- DELETE: Remove resource

### Status Codes
- 200 OK: Successful GET/PUT/PATCH
- 201 Created: Successful POST
- 204 No Content: Successful DELETE
- 400 Bad Request: Invalid input
- 401 Unauthorized: Missing/invalid auth
- 403 Forbidden: No permission
- 404 Not Found: Resource doesn't exist
- 500 Internal Server Error: Server failure

## Request/Response Format

### Standard Response Envelope
```json
{
  "data": {},
  "meta": {
    "timestamp": "2025-11-10T12:00:00Z",
    "requestId": "uuid"
  },
  "errors": []
}
```

### Pagination
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "first": "/api/users?page=1",
    "last": "/api/users?page=8",
    "prev": null,
    "next": "/api/users?page=2"
  }
}
```

### Error Format
```json
{
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Email is required",
      "field": "email"
    }
  ]
}
```

## Component Structure

Each API module should include:
- Controller: HTTP request handling
- Service: Business logic
- Repository: Data access
- Validator: Input validation
- Transformer: Response formatting

## Authentication

All protected endpoints require `Authorization: Bearer <jwt-token>` header.

## Rate Limiting

- Public endpoints: 100 req/min
- Authenticated endpoints: 1000 req/min
- Admin endpoints: 5000 req/min

## Versioning

Use URL versioning: `/api/v1/users`, `/api/v2/users`

## Documentation

All endpoints must be documented with OpenAPI 3.0 spec.
