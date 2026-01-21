---
sidebar_position: 5
title: Security Fundamentals
description: Essential security practices from day one of development
---

# Security Fundamentals

**Security isn't an afterthought—it's built into every line of code you write.**

---

## Why Security Matters Early

```
❌ The "Later" Pattern:
Week 1-4: Build features (no security)
Week 5-8: More features (still no security)
Week 9:   "We should add security"
Week 10:  Discover everything is insecure
Week 11+: Painful, expensive rewrite

✅ The "Now" Pattern:
Day 1:    Learn 5 security rules
Week 1-4: Build features WITH security
Result:   Secure by design, no rewrite
```

### The Cost of Insecurity

| Incident | Impact |
|----------|--------|
| Data breach | $4.45M average cost (2023) |
| Ransomware | 21 days average downtime |
| Credential leak | Reputation + legal liability |
| SQL injection | Complete database compromise |

---

## The 5 Non-Negotiable Rules

Master these five rules to prevent 90% of security vulnerabilities.

### Rule 1: Never Store Plaintext Passwords

```typescript
// ❌ NEVER DO THIS
const user = {
  email: 'alice@example.com',
  password: 'mySecretPassword123'  // Stored as-is = disaster
};
await db.insert('users', user);

// ✅ ALWAYS HASH PASSWORDS
import bcrypt from 'bcrypt';

const user = {
  email: 'alice@example.com',
  password: await bcrypt.hash('mySecretPassword123', 12)  // Hashed
};
await db.insert('users', user);
```

**Why bcrypt?**
- Designed for passwords (slow = good)
- Automatic salting (each hash is unique)
- Adjustable cost factor (12 rounds recommended)

**Verification:**
```typescript
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### Rule 2: Validate All User Input

```typescript
// ❌ DANGEROUS: Trust user input
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  await db.query(`INSERT INTO users (name, email) VALUES ('${name}', '${email}')`);
  // SQL Injection: name = "'; DROP TABLE users; --"
});

// ✅ SAFE: Validate and parameterize
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

app.post('/api/users', async (req, res) => {
  // Validate input
  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  // Use parameterized queries
  await db.query(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    [result.data.name, result.data.email]
  );
});
```

**Validation checklist:**
- [ ] Type checking (string, number, boolean)
- [ ] Length limits (max characters)
- [ ] Format validation (email, URL, phone)
- [ ] Allowed values (enums, whitelists)
- [ ] Sanitization (remove dangerous characters)

### Rule 3: Use HTTPS Everywhere

```typescript
// ❌ NEVER send sensitive data over HTTP
fetch('http://api.example.com/login', {
  body: JSON.stringify({ email, password })  // Visible to anyone on network!
});

// ✅ ALWAYS use HTTPS
fetch('https://api.example.com/login', {
  body: JSON.stringify({ email, password })  // Encrypted in transit
});
```

**In production:**
```javascript
// Force HTTPS redirect
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### Rule 4: Never Commit Secrets

```bash
# ❌ NEVER commit these
git add config.js  # Contains API_KEY = "sk-12345..."
git commit -m "Add config"

# Once pushed, the secret is:
# - In git history forever
# - Visible to anyone with repo access
# - Possibly already scraped by bots
```

**Safe pattern:**
```bash
# .env (gitignored)
DATABASE_URL=postgres://user:pass@localhost:5432/db
API_KEY=sk-12345...
JWT_SECRET=super-secret-key

# .gitignore
.env
.env.local
.env.production
*.pem
credentials.json
```

```typescript
// config.ts
export const config = {
  database: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  jwtSecret: process.env.JWT_SECRET,
};
```

**If you accidentally commit a secret:**
1. Revoke/rotate the secret immediately
2. Remove from git history (use BFG Repo-Cleaner)
3. Force push (coordinate with team)
4. Assume the secret is compromised

### Rule 5: Apply Least Privilege

```typescript
// ❌ OVER-PRIVILEGED: Admin access for everyone
const dbConnection = mysql.connect({
  user: 'root',  // Full admin access
  password: 'admin123'
});

// ✅ LEAST PRIVILEGE: Minimal required permissions
const dbConnection = mysql.connect({
  user: 'app_user',  // Can only SELECT, INSERT, UPDATE on app tables
  password: process.env.DB_PASSWORD
});
```

**Least privilege applies to:**
- Database users (only needed tables/operations)
- API keys (only needed scopes)
- Service accounts (only needed permissions)
- User roles (only needed features)

---

## Input Validation Deep Dive

### The OWASP Top 10 Input Attacks

| Attack | Example | Prevention |
|--------|---------|------------|
| SQL Injection | `'; DROP TABLE users; --` | Parameterized queries |
| XSS | `<script>steal(cookies)</script>` | Output encoding |
| Path Traversal | `../../etc/passwd` | Validate/sanitize paths |
| Command Injection | `; rm -rf /` | Avoid shell commands |

### Complete Validation Example

```typescript
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Define schema with strict rules
const CreatePostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .transform(s => DOMPurify.sanitize(s)),  // Remove XSS

  content: z
    .string()
    .min(10, 'Content too short')
    .max(50000, 'Content too long')
    .transform(s => DOMPurify.sanitize(s)),

  tags: z
    .array(z.string().max(30))
    .max(10, 'Too many tags'),

  published: z.boolean().default(false),
});

// Use in endpoint
app.post('/api/posts', async (req, res) => {
  const result = CreatePostSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors
    });
  }

  // result.data is now validated and sanitized
  const post = await createPost(result.data);
  res.status(201).json(post);
});
```

---

## Authentication Security

### Password Requirements

```typescript
const PasswordSchema = z.string()
  .min(8, 'Minimum 8 characters')
  .regex(/[A-Z]/, 'Need uppercase letter')
  .regex(/[a-z]/, 'Need lowercase letter')
  .regex(/[0-9]/, 'Need number')
  .regex(/[^A-Za-z0-9]/, 'Need special character');
```

### Secure Session Management

```typescript
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 1000 * 60 * 60 * 24  // 24 hours
  }
}));
```

### JWT Best Practices

```typescript
import jwt from 'jsonwebtoken';

// Creating tokens
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    expiresIn: '1h',      // Short expiry
    algorithm: 'HS256',    // Specify algorithm
    issuer: 'your-app',    // Identify issuer
  }
);

// Verifying tokens
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],  // Whitelist algorithms
  issuer: 'your-app',
});
```

---

## Rate Limiting

Prevent brute force attacks:

```typescript
import rateLimit from 'express-rate-limit';

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Strict limit for login
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 attempts per hour
  message: 'Too many login attempts'
});

app.use('/api/', apiLimiter);
app.post('/api/login', loginLimiter, loginHandler);
```

---

## Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
```

**Headers explained:**
- **Content-Security-Policy**: Prevents XSS by controlling resource sources
- **HSTS**: Forces HTTPS for specified duration
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

---

## Security Checklist

### Before Every Commit

- [ ] No secrets in code
- [ ] All user input validated
- [ ] SQL queries parameterized
- [ ] Passwords properly hashed

### Before Every Release

- [ ] Dependencies updated (`npm audit`)
- [ ] Security headers configured
- [ ] Rate limiting in place
- [ ] HTTPS enforced
- [ ] Error messages don't leak info

### Quarterly Review

- [ ] Rotate secrets
- [ ] Review access permissions
- [ ] Audit authentication logs
- [ ] Update security dependencies

---

## SpecWeave Security Integration

SpecWeave includes security checks in quality gates:

```markdown
## Quality Gate: Security

**Automated checks**:
- [ ] No secrets in codebase (git-secrets)
- [ ] Dependencies secure (npm audit)
- [ ] Input validation present
- [ ] Authentication on protected routes

**Manual review**:
- [ ] Follows security rules
- [ ] Least privilege applied
- [ ] Error handling doesn't leak info
```

The `/sw:validate` command includes security checks.

---

## Key Takeaways

1. **Hash passwords with bcrypt** — Never store plaintext
2. **Validate all input** — Assume it's malicious
3. **Use HTTPS everywhere** — Encrypt all traffic
4. **Never commit secrets** — Use .env and gitignore
5. **Apply least privilege** — Minimal permissions only

---

## Further Reading

- [OWASP Top 10](https://owasp.org/Top10/) — Most critical security risks
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/) — Practical guides
- [Security Reference](/docs/reference/compliance-standards) — Compliance standards

---

*Security is a habit, not a feature. Build it in from day one.*
