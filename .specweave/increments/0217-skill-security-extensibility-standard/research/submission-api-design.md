# Submission API Endpoints Design

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US10-01, AC-US10-02, AC-US10-07 (T-031)
**Dependencies**: T-029 (Submission State Machine), T-030 (Database Schema)

---

## 1. Overview

REST API for verified-skill.com covering public skill submission, status tracking, skill browsing, badge generation, and admin operations.

**Base URL**: `https://verified-skill.com/api/v1`

---

## 2. Public Endpoints

### 2.1 Submit a Skill

```
POST /api/v1/submissions
```

**Request**:
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "skillName": "my-awesome-skill",
  "skillPath": "skills/my-awesome-skill/SKILL.md",
  "email": "author@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repoUrl` | string | Yes | GitHub repository URL |
| `skillName` | string | Yes | Skill name (from frontmatter) |
| `skillPath` | string | No | Path to SKILL.md (default: auto-discover) |
| `email` | string | No | Email for status notifications |

**Response** (201 Created):
```json
{
  "id": "sub_abc123def456",
  "state": "RECEIVED",
  "repoUrl": "https://github.com/owner/repo",
  "skillName": "my-awesome-skill",
  "isVendor": false,
  "createdAt": "2026-02-15T18:00:00Z",
  "trackUrl": "https://verified-skill.com/submit/sub_abc123def456"
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | repoUrl is not a valid GitHub URL |
| 400 | `MISSING_FIELD` | Required field missing |
| 409 | `SKILL_EXISTS` | Skill name already registered (use update endpoint) |
| 429 | `RATE_LIMIT` | Too many submissions (5/hour per IP) |

### 2.2 Check Submission Status

```
GET /api/v1/submissions/:id
```

**Response** (200 OK):
```json
{
  "id": "sub_abc123def456",
  "state": "TIER2_SCANNING",
  "repoUrl": "https://github.com/owner/repo",
  "skillName": "my-awesome-skill",
  "isVendor": false,
  "scanResults": [
    {
      "tier": 1,
      "verdict": "PASS",
      "patternsChecked": 37,
      "criticalCount": 0,
      "highCount": 0,
      "mediumCount": 0,
      "duration_ms": 234,
      "createdAt": "2026-02-15T18:00:02Z"
    }
  ],
  "stateHistory": [
    { "state": "RECEIVED", "at": "2026-02-15T18:00:00Z" },
    { "state": "TIER1_SCANNING", "at": "2026-02-15T18:00:01Z" },
    { "state": "TIER2_SCANNING", "at": "2026-02-15T18:00:02Z" }
  ],
  "createdAt": "2026-02-15T18:00:00Z",
  "updatedAt": "2026-02-15T18:00:02Z"
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 404 | `NOT_FOUND` | Submission not found |

### 2.3 List Skills (Registry)

```
GET /api/v1/skills
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Search query (name, description, tags) |
| `category` | string | — | Filter by category |
| `tier` | string | — | Minimum tier: `scanned`, `verified`, `certified` |
| `labels` | string | — | Comma-separated label IDs |
| `agent` | string | — | Filter by agent compatibility |
| `sort` | string | `installs` | Sort: `installs`, `stars`, `trending`, `newest`, `updated` |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |

**Response** (200 OK):
```json
{
  "skills": [
    {
      "name": "react-best-practices",
      "displayName": "React Best Practices",
      "description": "React and Next.js performance optimization",
      "author": "Vercel Labs",
      "category": "coding",
      "currentVersion": "2.1.0",
      "certTier": "VERIFIED",
      "certMethod": "VENDOR_AUTO",
      "labels": ["verified", "vendor", "safe", "extensible"],
      "vskillInstalls": 234129,
      "githubStars": 1234,
      "trendingScore7d": 87.5,
      "lastCommitAt": "2026-02-12T10:00:00Z",
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 847,
    "totalPages": 43
  }
}
```

### 2.4 Get Skill Detail

```
GET /api/v1/skills/:name
```

**Response** (200 OK):
```json
{
  "name": "react-best-practices",
  "displayName": "React Best Practices",
  "description": "React and Next.js performance optimization",
  "author": "Vercel Labs",
  "repoUrl": "https://github.com/vercel-labs/skills",
  "category": "coding",
  "currentVersion": "2.1.0",
  "certTier": "VERIFIED",
  "certMethod": "VENDOR_AUTO",
  "certScore": null,
  "labels": ["verified", "vendor", "safe", "extensible"],
  "popularity": {
    "githubStars": 1234,
    "githubForks": 89,
    "npmDownloads": 45000,
    "vskillInstalls": 234129,
    "lastCommitAt": "2026-02-12T10:00:00Z",
    "trendingScore7d": 87.5,
    "trendingScore30d": 72.3
  },
  "versions": [
    {
      "version": "2.1.0",
      "certTier": "VERIFIED",
      "certScore": null,
      "contentHash": "sha256:abc123...",
      "createdAt": "2026-02-01T00:00:00Z"
    },
    {
      "version": "2.0.0",
      "certTier": "VERIFIED",
      "certScore": null,
      "contentHash": "sha256:def456...",
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ],
  "agents": [
    { "agentId": "claude-code", "agentName": "Claude Code", "isUniversal": false },
    { "agentId": "cursor", "agentName": "Cursor", "isUniversal": false },
    { "agentId": "codex", "agentName": "Codex", "isUniversal": true }
  ],
  "createdAt": "2025-11-01T00:00:00Z",
  "updatedAt": "2026-02-15T18:00:00Z"
}
```

### 2.5 Get Skill Badge

```
GET /api/v1/skills/:name/badge
GET /api/v1/skills/:name/badge?version=2.1.0
GET /api/v1/skills/:name/badge?type=verified
GET /api/v1/skills/:name/badge?format=json
```

**SVG Response** (200 OK, `Content-Type: image/svg+xml`):
Returns a shields.io-style SVG badge.

**JSON Response** (200 OK, `format=json`):
```json
{
  "label": "verified",
  "value": "v2.1.0",
  "color": "#08f",
  "version": "2.1.0",
  "tier": "VERIFIED"
}
```

**Headers**:
```
Cache-Control: max-age=3600
ETag: "abc123"
Content-Type: image/svg+xml
```

---

## 3. Admin Endpoints

All admin endpoints require JWT Bearer authentication.

### 3.1 Admin Login

```
POST /api/v1/auth/login
```

**Request**:
```json
{
  "email": "admin@verified-skill.com",
  "password": "securepassword"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "admin": {
    "id": "adm_abc123",
    "email": "admin@verified-skill.com",
    "role": "SUPER_ADMIN",
    "displayName": "Platform Admin"
  }
}
```

### 3.2 Refresh Token

```
POST /api/v1/auth/refresh
```

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

### 3.3 List Submissions (Admin Queue)

```
GET /api/v1/admin/submissions
Authorization: Bearer <token>
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `state` | string | — | Filter by state |
| `sort` | string | `newest` | Sort: `newest`, `oldest` |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page |

**Response** (200 OK):
```json
{
  "submissions": [
    {
      "id": "sub_abc123",
      "skillName": "my-skill",
      "repoUrl": "https://github.com/owner/repo",
      "state": "NEEDS_REVIEW",
      "isVendor": false,
      "scanResults": [
        { "tier": 1, "verdict": "PASS", "criticalCount": 0 },
        { "tier": 2, "verdict": "CONCERNS", "score": 72, "concerns": ["eval usage"] }
      ],
      "createdAt": "2026-02-15T18:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15 }
}
```

### 3.4 Approve Submission

```
PATCH /api/v1/admin/submissions/:id/approve
Authorization: Bearer <token>
```

**Request** (optional body):
```json
{
  "notes": "Skill looks safe. Eval usage is in safe context."
}
```

**Response** (200 OK):
```json
{
  "id": "sub_abc123",
  "state": "PUBLISHED",
  "skillId": "sk_def456",
  "version": "1.0.0",
  "message": "Skill approved and published as v1.0.0"
}
```

**Authorization**: `SUPER_ADMIN` or `REVIEWER`

### 3.5 Reject Submission

```
PATCH /api/v1/admin/submissions/:id/reject
Authorization: Bearer <token>
```

**Request**:
```json
{
  "reason": "Skill contains eval() usage without justification in security-notes section."
}
```

**Response** (200 OK):
```json
{
  "id": "sub_abc123",
  "state": "REJECTED",
  "reason": "Skill contains eval() usage without justification...",
  "message": "Submission rejected. Author notified via email."
}
```

**Authorization**: `SUPER_ADMIN` or `REVIEWER`

### 3.6 Escalate Submission

```
POST /api/v1/admin/submissions/:id/escalate
Authorization: Bearer <token>
```

**Request** (optional):
```json
{
  "reason": "Borderline score (72). Requesting Tier 3 manual review."
}
```

**Response** (200 OK):
```json
{
  "id": "sub_abc123",
  "state": "TIER3_REVIEW",
  "message": "Submission escalated to Tier 3 review"
}
```

**Authorization**: `SUPER_ADMIN` only

### 3.7 Platform Stats

```
GET /api/v1/admin/stats
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "totalSkills": 847,
  "totalSubmissions": 1234,
  "pendingReview": 5,
  "approvalRate": 78.2,
  "rejectionRate": 12.4,
  "averageScanScore": 84.7,
  "submissionsToday": 12,
  "submissionsThisWeek": 45,
  "tierDistribution": {
    "scanned": 312,
    "verified": 489,
    "certified": 46
  },
  "topCategories": [
    { "category": "coding", "count": 234 },
    { "category": "security", "count": 156 },
    { "category": "devops", "count": 98 }
  ]
}
```

**Authorization**: `SUPER_ADMIN` or `REVIEWER`

---

## 4. Authentication Middleware

```typescript
interface JWTPayload {
  sub: string;       // Admin ID
  email: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

function authMiddleware(requiredRole?: AdminRole) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

      if (requiredRole && payload.role !== 'SUPER_ADMIN' && payload.role !== requiredRole) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      req.admin = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
  };
}
```

---

## 5. Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| `POST /submissions` | 5 requests | Per hour per IP |
| `GET /submissions/:id` | 60 requests | Per minute per IP |
| `GET /skills` | 120 requests | Per minute per IP |
| `GET /skills/:name/badge` | 600 requests | Per minute per IP (CDN cached) |
| Admin endpoints | 120 requests | Per minute per token |

---

## 6. Error Response Format

All errors follow a consistent JSON format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": {}
}
```

| Status | Codes |
|--------|-------|
| 400 | `INVALID_URL`, `MISSING_FIELD`, `INVALID_FORMAT` |
| 401 | `UNAUTHORIZED`, `INVALID_TOKEN`, `TOKEN_EXPIRED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `SKILL_EXISTS`, `STATE_CONFLICT` |
| 429 | `RATE_LIMIT` |
| 500 | `INTERNAL_ERROR` |

---

## 7. References

- [Submission State Machine](./submission-state-machine.md) — State definitions
- [Database Schema](./database-schema.md) — Prisma schema
- [Admin Auth Design](./admin-auth-design.md) — Authentication details
- [Trust Labels & Badges](./trust-labels-badges.md) — Badge API specifications
