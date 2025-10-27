# Playbook: Rate Limit Exceeded

## Symptoms

- "Rate limit exceeded" errors
- "429 Too Many Requests" responses
- "Quota exceeded" messages
- Legitimate requests being blocked
- Monitoring alert: "High rate of 429 errors"

## Severity

- **SEV3** if isolated to specific users/endpoints
- **SEV2** if affecting many users
- **SEV1** if critical functionality blocked (payments, auth)

## Diagnosis

### Step 1: Identify What's Rate Limited

**Check Error Messages**:
```bash
# Application logs
grep "rate limit\|429\|quota exceeded" /var/log/application.log

# nginx logs
awk '$9 == 429 {print $1, $7}' /var/log/nginx/access.log | sort | uniq -c

# Example output:
# 500 192.168.1.100 /api/users    ← IP hitting rate limit
# 200 192.168.1.101 /api/posts
```

**Check Rate Limit Source**:
- **Application-level**: Your code enforcing limit
- **nginx/API Gateway**: Reverse proxy rate limiting
- **External API**: Third-party service limit (Stripe, Twilio, etc.)
- **Cloud**: AWS API Gateway, CloudFlare

---

### Step 2: Determine If Legitimate or Malicious

**Legitimate traffic**:
```
Scenario: User refreshing dashboard repeatedly
Pattern: Single user, single endpoint, short burst
Action: Increase rate limit or add caching
```

**Malicious traffic** (abuse):
```
Scenario: Scraper or bot
Pattern: Multiple IPs, automated behavior, sustained
Action: Block IPs, add CAPTCHA
```

**Traffic spike** (legitimate):
```
Scenario: Marketing campaign, viral post
Pattern: Many users, distributed IPs, real user behavior
Action: Increase rate limit, scale up
```

---

### Step 3: Check Current Rate Limits

**nginx**:
```nginx
# Check nginx.conf
grep "limit_req" /etc/nginx/nginx.conf

# Example:
# limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
#                                                         ^^^^ Current limit
```

**Application** (Express.js example):
```javascript
// Check rate limit middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit: 100 requests per 15 minutes
});
```

**External API**:
```bash
# Check external API documentation
# Stripe: 100 requests per second
# Twilio: 100 requests per second
# Google Maps: $200/month free quota

# Check current usage
# Stripe:
curl https://api.stripe.com/v1/balance \
  -u sk_test_XXX: \
  -H "Stripe-Account: acct_XXX"

# Response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 45  ← 45 requests left
```

---

## Mitigation

### Immediate (Now - 5 min)

**Option A: Increase Rate Limit** (if legitimate traffic)

**nginx**:
```nginx
# Edit /etc/nginx/nginx.conf
# Increase from 10r/s to 50r/s
limit_req_zone $binary_remote_addr zone=one:10m rate=50r/s;

# Test and reload
nginx -t && systemctl reload nginx

# Impact: Allows more requests
# Risk: Low (if traffic is legitimate)
```

**Application** (Express.js):
```javascript
// Increase from 100 to 500 requests per 15 min
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Increased
});

// Restart application
pm2 restart all
```

---

**Option B: Whitelist Specific IPs** (if known legitimate source)

**nginx**:
```nginx
# Whitelist internal IPs, monitoring systems
geo $limit {
  default 1;
  10.0.0.0/8 0;        # Internal network
  192.168.1.100 0;     # Monitoring system
}

map $limit $limit_key {
  0 "";
  1 $binary_remote_addr;
}

limit_req_zone $limit_key zone=one:10m rate=10r/s;
```

**Application**:
```javascript
const limiter = rateLimit({
  skip: (req) => {
    // Whitelist internal IPs
    return req.ip.startsWith('10.') || req.ip === '192.168.1.100';
  },
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

---

**Option C: Add Caching** (reduce requests to backend)

**Redis cache**:
```javascript
const redis = require('redis').createClient();

app.get('/api/users', async (req, res) => {
  // Check cache first
  const cached = await redis.get('users:' + req.query.id);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Fetch from database
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.query.id]);

  // Cache for 5 minutes
  await redis.setex('users:' + req.query.id, 300, JSON.stringify(user));

  res.json(user);
});

// Impact: Reduces backend load, fewer rate limit hits
// Risk: Low (data staleness acceptable)
```

---

**Option D: Block Malicious IPs** (if abuse detected)

**nginx**:
```bash
# Block specific IP
iptables -A INPUT -s 192.168.1.100 -j DROP

# Or in nginx.conf:
deny 192.168.1.100;
deny 192.168.1.0/24;  # Block range
```

**CloudFlare**:
```
# CloudFlare dashboard:
# Security → WAF → Custom rules
# Block IP: 192.168.1.100
```

---

### Short-term (5 min - 1 hour)

**Option A: Implement Tiered Rate Limits**

**Different limits for different users**:
```javascript
const rateLimit = require('express-rate-limit');

const createLimiter = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: max,
  keyGenerator: (req) => req.user?.id || req.ip,
});

app.use('/api', (req, res, next) => {
  let limiter;
  if (req.user?.tier === 'premium') {
    limiter = createLimiter(1000);  // Premium: 1000 req/15min
  } else if (req.user) {
    limiter = createLimiter(300);   // Authenticated: 300 req/15min
  } else {
    limiter = createLimiter(100);   // Anonymous: 100 req/15min
  }
  limiter(req, res, next);
});
```

---

**Option B: Add CAPTCHA** (prevent bots)

**reCAPTCHA** on sensitive endpoints:
```javascript
const { recaptcha } = require('express-recaptcha');

app.post('/api/login', recaptcha.middleware.verify, async (req, res) => {
  if (!req.recaptcha.error) {
    // CAPTCHA valid, proceed with login
    await handleLogin(req, res);
  } else {
    res.status(400).json({ error: 'CAPTCHA failed' });
  }
});
```

---

**Option C: Upgrade External API Plan** (if hitting external limit)

**Stripe**:
```
Current: 100 requests/second (free)
Upgrade: Contact Stripe for higher limit (paid)
```

**AWS API Gateway**:
```bash
# Increase throttle limit
aws apigateway update-usage-plan \
  --usage-plan-id <ID> \
  --patch-operations \
    op=replace,path=/throttle/rateLimit,value=1000

# Impact: Higher rate limit
# Risk: None (may cost more)
```

---

### Long-term (1 hour+)

- [ ] **Implement tiered rate limits** (premium, authenticated, anonymous)
- [ ] **Add caching** (reduce backend load)
- [ ] **Use CDN** (cache static content, reduce origin requests)
- [ ] **Add CAPTCHA** (prevent bots on sensitive endpoints)
- [ ] **Monitor rate limit usage** (alert before hitting limit)
- [ ] **Batch requests** (reduce API calls to external services)
- [ ] **Implement retry with backoff** (external API rate limits)
- [ ] **Document rate limits** (API documentation for users)
- [ ] **Add rate limit headers** (tell users their remaining quota)

---

## Rate Limit Best Practices

### 1. Return Helpful Headers

**RFC 6585 standard**:
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698345600  # Unix timestamp
Retry-After: 60  # Seconds until reset

{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the rate limit of 100 requests per 15 minutes. Try again in 60 seconds."
}
```

**Implementation**:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,  // Return RateLimit-* headers
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: `You have exceeded the rate limit of ${req.rateLimit.limit} requests per 15 minutes. Try again in ${Math.ceil(req.rateLimit.resetTime - Date.now()) / 1000} seconds.`,
    });
  },
});
```

---

### 2. Use Sliding Window (not Fixed Window)

**Fixed window** (bad):
```
Window 1: 00:00-00:15 (100 requests)
Window 2: 00:15-00:30 (100 requests)

User makes 100 requests at 00:14:59
User makes 100 requests at 00:15:01
→ 200 requests in 2 seconds! (burst)
```

**Sliding window** (good):
```
Rate limit based on last 15 minutes from current time
→ Can't burst (limit enforced continuously)
```

---

### 3. Different Limits for Different Endpoints

```javascript
// Expensive endpoint (lower limit)
app.get('/api/analytics', rateLimit({ max: 10 }), handler);

// Cheap endpoint (higher limit)
app.get('/api/health', rateLimit({ max: 1000 }), handler);
```

---

## External API Rate Limit Handling

### Retry with Backoff

```javascript
async function callExternalAPI(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);

      // Check rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining < 10) {
        console.warn('Approaching rate limit:', remaining);
      }

      if (response.status === 429) {
        // Rate limited
        const retryAfter = response.headers.get('Retry-After') || 60;
        console.log(`Rate limited, retrying after ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }

      return response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

---

## Escalation

**Escalate to developer if**:
- Application rate limit logic needs changes
- Need to implement caching

**Escalate to infrastructure if**:
- nginx/API Gateway rate limit config
- Need to scale up capacity

**Escalate to external vendor if**:
- Hitting external API rate limit
- Need higher quota

---

## Related Runbooks

- [05-ddos-attack.md](05-ddos-attack.md) - If malicious traffic
- [../modules/backend-diagnostics.md](../modules/backend-diagnostics.md) - Backend troubleshooting

---

## Post-Incident

After resolving:
- [ ] Create post-mortem (if SEV1/SEV2)
- [ ] Identify why rate limit hit
- [ ] Adjust rate limits (if needed)
- [ ] Add monitoring (alert before hitting limit)
- [ ] Document rate limits (for users/API consumers)
- [ ] Update this runbook if needed

---

## Useful Commands Reference

```bash
# Check 429 errors (nginx)
awk '$9 == 429 {print $1}' /var/log/nginx/access.log | sort | uniq -c

# Check rate limit config (nginx)
grep "limit_req" /etc/nginx/nginx.conf

# Block IP (iptables)
iptables -A INPUT -s <IP> -j DROP

# Test rate limit
for i in {1..200}; do curl http://localhost/api; done

# Check external API rate limit
curl -I https://api.example.com -H "Authorization: Bearer TOKEN"
# Look for X-RateLimit-* headers
```
