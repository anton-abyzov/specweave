---
expected_type: module
expected_confidence: high
source: wiki
keywords_density: high
---

# API Reference

## Authentication Endpoints

### POST /api/v1/auth/register
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response** (201 Created):
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Errors**:
- 400: Invalid email format
- 409: Email already registered
- 422: Password too weak

### POST /api/v1/auth/login
Authenticate existing user.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Errors**:
- 401: Invalid credentials
- 429: Too many login attempts

### POST /api/v1/auth/logout
Invalidate current session.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (204 No Content)

### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

## User Endpoints

### GET /api/v1/users/me
Get current user profile.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### PATCH /api/v1/users/me
Update current user profile.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-11-10T00:00:00Z"
}
```

## Product Endpoints

### GET /api/v1/products
List all products with pagination.

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Items per page (default: 20, max: 100)
- `sort` (optional): Sort field (price, name, createdAt)
- `order` (optional): Sort order (asc, desc)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "product-id",
      "name": "Product Name",
      "price": 29.99,
      "stock": 100
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### GET /api/v1/products/:id
Get product by ID.

**Response** (200 OK):
```json
{
  "id": "product-id",
  "name": "Product Name",
  "description": "Product description",
  "price": 29.99,
  "stock": 100,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

**Errors**:
- 404: Product not found

## Order Endpoints

### POST /api/v1/orders
Create new order.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "items": [
    {
      "productId": "product-id",
      "quantity": 2
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "id": "order-id",
  "userId": "user-id",
  "items": [...],
  "total": 59.98,
  "status": "pending",
  "createdAt": "2025-11-10T00:00:00Z"
}
```

### GET /api/v1/orders/:id
Get order by ID.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "id": "order-id",
  "userId": "user-id",
  "items": [...],
  "total": 59.98,
  "status": "delivered",
  "createdAt": "2025-11-10T00:00:00Z",
  "updatedAt": "2025-11-11T00:00:00Z"
}
```

## Rate Limiting

All endpoints are rate limited:
- **Unauthenticated**: 100 requests per 15 minutes
- **Authenticated**: 1000 requests per 15 minutes

**Rate Limit Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699564800
```

## Error Responses

All error responses follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## Component Integration

This API is implemented by:
- AuthController (`/auth/*`)
- UserController (`/users/*`)
- ProductController (`/products/*`)
- OrderController (`/orders/*`)
