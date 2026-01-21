---
name: deploy-router
description: Smart deployment platform router for Vercel vs Cloudflare vs GitHub Pages. Analyzes project structure, framework, SEO needs, runtime requirements, AND repository visibility (private/public). Routes to Cloudflare for private repos (GitHub Pages requires paid plan), Vercel for dynamic SEO, GitHub Pages only for public repos. Activates for deploy, vercel vs cloudflare, where to deploy, cloudflare workers, cloudflare pages, vercel deployment, edge deployment, SSR deployment, static site deployment, which hosting, deployment recommendation, github pages, private repo deployment.
allowed-tools: Read, Grep, Glob, Bash
---

# Deploy Router - Vercel vs Cloudflare vs GitHub Pages Decision Engine

I intelligently route your deployment to the optimal platform based on project analysis, **including repository visibility** (private vs public).

## When to Use This Skill

Ask me when you need help with:
- **Platform Decision**: "Should I deploy to Vercel or Cloudflare?"
- **Project Analysis**: "Analyze my project for deployment"
- **SEO-Aware Routing**: "I need dynamic SEO for my Next.js app"
- **Cost Optimization**: "What's the cheapest deployment option?"
- **Edge-First**: "I want global edge deployment"
- **Private Repo Deployment**: "Where can I deploy my private repo for free?"

---

## 🚨 CRITICAL: Repository Visibility Check (ALWAYS DO FIRST)

**GitHub Pages has a major limitation**: Free GitHub accounts can ONLY deploy GitHub Pages from **public repositories**. Private repo deployment requires GitHub Pro, Team, or Enterprise.

### Priority Decision Based on Visibility

```
┌─────────────────────────────────────────────────────────────────┐
│           STEP 0: CHECK REPOSITORY VISIBILITY                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Is the repository PRIVATE?   │
              └───────────────────────────────┘
                   │                    │
                  YES                   NO (Public)
                   │                    │
                   ▼                    ▼
     ┌─────────────────────────┐  ┌─────────────────────────────┐
     │  ❌ GitHub Pages FREE   │  │  ✅ All platforms available │
     │  ✅ Cloudflare Pages    │  │  GitHub Pages is an option  │
     │  ✅ Vercel              │  │  for static public sites    │
     │  ✅ Netlify             │  └─────────────────────────────┘
     └─────────────────────────┘
```

### How to Detect Repository Visibility

```bash
# Check if git remote exists and get repo visibility
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+) ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"

  # Use GitHub CLI to check visibility
  VISIBILITY=$(gh repo view "$OWNER/$REPO" --json visibility -q '.visibility' 2>/dev/null)

  if [[ "$VISIBILITY" == "PRIVATE" ]]; then
    echo "⚠️  PRIVATE REPOSITORY DETECTED"
    echo "   GitHub Pages requires GitHub Pro/Team/Enterprise for private repos"
    echo "   → Recommended: Cloudflare Pages (free for private repos)"
    echo "   → Alternative: Vercel (free tier available)"
  else
    echo "✅ PUBLIC REPOSITORY - All deployment options available"
  fi
fi
```

### Platform Availability by Repo Visibility

| Platform | Private Repo (Free) | Public Repo (Free) | Notes |
|----------|--------------------|--------------------|-------|
| **Cloudflare Pages** | ✅ Yes | ✅ Yes | **Best for private repos** - No visibility restrictions |
| **Vercel** | ✅ Yes | ✅ Yes | Free tier works for both |
| **Netlify** | ✅ Yes | ✅ Yes | Free tier works for both |
| **GitHub Pages** | ❌ No (requires Pro) | ✅ Yes | **BLOCKED** for free private repos |

---

## Decision Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT ANALYSIS                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Does project require Node.js runtime features?                 │
│  (Server Components with DB, fs, crypto, native modules)        │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
         YES                                   NO
          │                                    │
          ▼                                    ▼
┌─────────────────────┐             ┌─────────────────────────────┐
│      VERCEL         │             │  Static/Edge compatible?    │
│  (Node.js runtime)  │             │  (No Node.js dependencies)  │
└─────────────────────┘             └─────────────────────────────┘
                                              │
                                     ┌────────┴────────┐
                                    YES               NO
                                     │                 │
                                     ▼                 ▼
                          ┌─────────────────┐  ┌─────────────────┐
                          │  CLOUDFLARE     │  │     VERCEL      │
                          │  (Edge/Pages)   │  │ (needs runtime) │
                          └─────────────────┘  └─────────────────┘
```

## Detailed Decision Tree

### Step 1: Framework Detection

| Framework | Detection | Default Recommendation |
|-----------|-----------|------------------------|
| **Next.js** | `next.config.js/ts/mjs` | Depends on features used |
| **Remix** | `remix.config.js` | Vercel (Node) or Cloudflare (adapter) |
| **Astro** | `astro.config.mjs` | Cloudflare (static-first) |
| **Nuxt** | `nuxt.config.ts` | Vercel (SSR) or Cloudflare (static) |
| **SvelteKit** | `svelte.config.js` | Either (adapter-based) |
| **Static (Vite/CRA)** | `vite.config.ts`, no SSR | Cloudflare Pages |

### Step 2: Feature Analysis

**Signals for VERCEL (Node.js Runtime)**:
- [ ] Server Components with database calls (`prisma`, `drizzle`, direct SQL)
- [ ] `fs` module usage (file system operations)
- [ ] `crypto` or native Node.js modules
- [ ] Server Actions with complex backend logic
- [ ] Long-running API routes (> 30s execution)
- [ ] WebSocket connections (real-time features)
- [ ] Heavy image processing (Sharp, Jimp)
- [ ] PDF generation (Puppeteer, Playwright)
- [ ] Dynamic OG images with complex rendering
- [ ] `getServerSideProps` with database queries

**Signals for CLOUDFLARE (Edge/Static)**:
- [ ] Static site generation (SSG)
- [ ] Simple API routes (< 30s, no Node.js deps)
- [ ] Edge-compatible database (Cloudflare D1, Turso, PlanetScale)
- [ ] KV storage for caching
- [ ] R2 for file storage
- [ ] Durable Objects for state
- [ ] Cost-sensitive deployment
- [ ] Global edge distribution priority
- [ ] Simple auth (JWT, sessions without DB)

### Step 3: SEO Requirements (Vercel Wins for Dynamic SEO)

**When SEO matters most, choose carefully:**

| SEO Need | Vercel | Cloudflare | GitHub Pages |
|----------|--------|------------|--------------|
| Static meta tags | ✅ | ✅ | ✅ |
| Dynamic meta from DB | ✅ (SSR) **BEST** | ⚠️ (ISR/Edge only) | ❌ (static only) |
| Per-page dynamic OG | ✅ **BEST** | ⚠️ (limited) | ❌ |
| Real-time product data | ✅ (SSR) **BEST** | ⚠️ (stale cache) | ❌ |
| Sitemap generation | ✅ | ✅ | ✅ (manual) |
| robots.txt | ✅ | ✅ | ✅ |
| Structured data (JSON-LD) | ✅ (dynamic) | ✅ (static) | ✅ (static) |
| Core Web Vitals | ✅ (optimized) | ✅ (fast edge) | ✅ (fast static) |
| SSR/ISR for freshness | ✅ **BEST** | ⚠️ (edge-limited) | ❌ |

### SEO Tier Recommendations

```
┌─────────────────────────────────────────────────────────────────┐
│                  SEO REQUIREMENTS ROUTING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIER 1 - Critical SEO (choose VERCEL):                         │
│  ├─ E-commerce product pages (prices change, inventory)         │
│  ├─ News/content sites (freshness matters for Google)           │
│  ├─ SaaS landing pages with dynamic pricing                     │
│  ├─ Marketplace listings (real-time availability)               │
│  └─ Any page where DB-driven meta tags are required             │
│                                                                 │
│  TIER 2 - Good SEO (CLOUDFLARE works):                          │
│  ├─ Blogs with static content                                   │
│  ├─ Documentation sites                                         │
│  ├─ Marketing pages (rarely changing)                           │
│  ├─ Portfolio sites                                             │
│  └─ ISR with revalidation (1-hour stale OK)                     │
│                                                                 │
│  TIER 3 - Basic SEO (any platform):                             │
│  ├─ Internal tools (SEO doesn't matter)                         │
│  ├─ Admin dashboards                                            │
│  ├─ Private apps                                                │
│  └─ Prototypes/MVPs                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Vercel Wins for Dynamic SEO

1. **True SSR**: Every request can fetch fresh data from database
2. **ISR with on-demand revalidation**: `revalidateTag()` and `revalidatePath()`
3. **Dynamic OG images**: `@vercel/og` generates images server-side
4. **Edge + Node.js hybrid**: Edge for speed, Node.js for data fetching
5. **Built-in image optimization**: Automatic WebP/AVIF conversion
6. **Preview deployments**: Test SEO before going live

### When Cloudflare is SEO-Acceptable

- **Static blogs**: Meta tags baked at build time
- **Documentation**: Content rarely changes
- **ISR with Workers**: If 1-hour stale data is acceptable
- **Hybrid approach**: Cloudflare Pages + external API for dynamic data

## Platform Comparison

### Vercel

**Best For**:
- Next.js apps with full Node.js features
- Dynamic SEO (meta tags from database)
- Server Components with complex data fetching
- Image optimization (built-in)
- Preview deployments for PRs
- Teams needing easy DX

**Pricing** (2025):
- Hobby: Free (limited)
- Pro: $20/user/month
- Serverless Functions: 100GB-hours free, then $0.18/GB-hour
- Edge Functions: 500K free, then $0.65/million

**Limitations**:
- Serverless function timeout: 10s (Hobby), 60s (Pro), 300s (Enterprise)
- Edge function timeout: 30s
- Cold starts on low-traffic sites

### Cloudflare

**Best For**:
- Static sites with edge caching
- Edge-first applications
- Cost-sensitive projects
- Simple API routes
- Global CDN distribution
- Cloudflare ecosystem (R2, D1, KV)
- **🔒 PRIVATE REPOS** (works with free tier!)

**Pricing** (2025):
- Workers Free: 100K requests/day
- Workers Paid: $5/month + $0.50/million requests
- Pages: Unlimited sites, 500 builds/month free
- R2: 10GB free, then $0.015/GB

**Limitations**:
- No Node.js runtime (V8 isolates only)
- CPU time limit: 10ms (free), 30s (paid)
- Memory: 128MB
- No native modules (Sharp, Prisma binary, etc.)

**Why Cloudflare for Private Repos**:
- ✅ No repository visibility restrictions
- ✅ Connect private GitHub repos directly
- ✅ Automatic deployments from private branches
- ✅ Preview deployments for PRs
- ✅ Free tier is generous

### GitHub Pages

**Best For**:
- **PUBLIC repositories only** (free tier)
- Open-source documentation
- Public project sites
- Static Jekyll/Hugo/Astro sites
- When source code visibility is intentional

**Pricing** (2025):
- Free for public repos
- **Requires GitHub Pro/Team/Enterprise for private repos** ($4-21/user/month)
- 1GB storage limit
- 100GB bandwidth/month

**Limitations**:
- ❌ **NO PRIVATE REPO SUPPORT** on free accounts
- No server-side rendering
- No API routes
- No dynamic content
- Build time limit: 10 minutes
- No environment variables at runtime

**When to Use GitHub Pages**:
```
✅ DO use GitHub Pages when:
   - Repository is PUBLIC
   - Content is 100% static
   - You want zero deployment config
   - Open-source project docs

❌ DO NOT use GitHub Pages when:
   - Repository is PRIVATE (use Cloudflare Pages instead!)
   - You need SSR/dynamic content
   - You need API routes
   - You need environment variables
```

## Analysis Workflow

When user asks "where should I deploy?", I follow this order:

### 0. Check Repository Visibility (FIRST!)

```bash
# CRITICAL: Check if repo is private BEFORE anything else
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+) ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"

  # Check visibility with GitHub CLI
  VISIBILITY=$(gh repo view "$OWNER/$REPO" --json visibility -q '.visibility' 2>/dev/null)

  if [[ "$VISIBILITY" == "PRIVATE" ]]; then
    echo "🔒 PRIVATE REPO - GitHub Pages NOT available on free tier"
    echo "   Recommended: Cloudflare Pages or Vercel"
    GITHUB_PAGES_AVAILABLE=false
  else
    echo "✅ PUBLIC REPO - All platforms available"
    GITHUB_PAGES_AVAILABLE=true
  fi
else
  echo "⚠️  No GitHub remote detected - assuming private"
  GITHUB_PAGES_AVAILABLE=false
fi
```

### 1. Scan Project Structure

```bash
# Framework detection
ls -la | grep -E "next.config|remix.config|astro.config|nuxt.config|svelte.config|vite.config"

# Package.json analysis
cat package.json | jq '.dependencies, .devDependencies'

# Check for SSR/SSG configuration
grep -r "getServerSideProps\|getStaticProps\|generateStaticParams" --include="*.tsx" --include="*.ts" | head -20
```

### 2. Detect Node.js Dependencies

```bash
# Native module detection
grep -E "prisma|sharp|puppeteer|playwright|canvas|bcrypt|argon2" package.json

# File system usage
grep -r "require\('fs'\)\|from 'fs'\|import fs" --include="*.ts" --include="*.tsx" --include="*.js" | head -10

# Crypto usage
grep -r "require\('crypto'\)\|from 'crypto'" --include="*.ts" --include="*.tsx" | head -10
```

### 3. Analyze SEO Requirements

```bash
# Dynamic meta detection
grep -r "generateMetadata\|Head.*title\|meta.*content" --include="*.tsx" --include="*.ts" | head -10

# Database calls in metadata
grep -rB5 "generateMetadata" --include="*.tsx" | grep -E "prisma|db\.|fetch\("

# Check for e-commerce/content patterns that need fresh SEO
grep -rE "product|price|inventory|article|news" --include="*.tsx" | head -10
```

### 4. Generate Recommendation

Based on analysis, I provide:

```markdown
## 🚀 Deployment Recommendation

**Platform**: [VERCEL / CLOUDFLARE]
**Confidence**: [HIGH / MEDIUM / LOW]

### Analysis Results

| Factor | Finding | Impact |
|--------|---------|--------|
| Framework | Next.js 14 | Neutral |
| Node.js deps | Prisma, Sharp | → VERCEL |
| SEO needs | Dynamic meta | → VERCEL |
| Budget | Cost-sensitive | → Cloudflare |
| Scale | Global edge | → Cloudflare |

### Why [PLATFORM]

[Detailed reasoning based on findings]

### Configuration

[Platform-specific setup instructions]

### Alternative

If you need [opposite platform features], consider:
- [Migration path]
- [Hybrid approach]
```

## Quick Decision Guide

```
┌─────────────────────────────────────────────────────────────────┐
│  MASTER DECISION TREE (Check in order!)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: Is repo PRIVATE?                                       │
│  ├─ YES → ❌ Eliminate GitHub Pages                             │
│  │        → Go to Step 2                                        │
│  └─ NO  → GitHub Pages is an option (static only)               │
│                                                                 │
│  STEP 2: Do you need dynamic SEO?                               │
│  ├─ YES → ✅ VERCEL (SSR, real-time meta, OG images)            │
│  └─ NO  → Go to Step 3                                          │
│                                                                 │
│  STEP 3: Do you need Node.js runtime?                           │
│  ├─ YES → ✅ VERCEL (Prisma, Sharp, fs, crypto)                 │
│  └─ NO  → Go to Step 4                                          │
│                                                                 │
│  STEP 4: Is it a static site?                                   │
│  ├─ YES, Private repo  → ✅ CLOUDFLARE Pages                    │
│  ├─ YES, Public repo   → ✅ CLOUDFLARE or GitHub Pages          │
│  └─ NO  → Go to Step 5                                          │
│                                                                 │
│  STEP 5: Do you need edge performance + cost savings?           │
│  ├─ YES → ✅ CLOUDFLARE (Workers/Pages)                         │
│  └─ NO  → ✅ VERCEL (default choice for Next.js)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PLATFORM QUICK REFERENCE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Use VERCEL when:                                               │
│  ├─ Dynamic SEO is critical (e-commerce, news, marketplaces)    │
│  ├─ Next.js with Server Components + DB                         │
│  ├─ Native Node.js modules (Sharp, Prisma, Puppeteer)           │
│  ├─ Real-time OG image generation                               │
│  ├─ WebSockets/real-time features                               │
│  └─ Team wants easiest DX                                       │
│                                                                 │
│  Use CLOUDFLARE when:                                           │
│  ├─ 🔒 PRIVATE REPO (GitHub Pages blocked on free tier!)        │
│  ├─ Static site (Astro, Hugo, plain HTML)                       │
│  ├─ Edge-first, low latency priority                            │
│  ├─ Cost-sensitive (Cloudflare is cheaper)                      │
│  ├─ Simple API routes without Node.js deps                      │
│  ├─ Already using Cloudflare ecosystem (R2, D1, KV)             │
│  └─ Global CDN distribution priority                            │
│                                                                 │
│  Use GITHUB PAGES when:                                         │
│  ├─ Repository is PUBLIC (required for free tier!)              │
│  ├─ 100% static content (no SSR, no API)                        │
│  ├─ Open-source project documentation                           │
│  └─ Zero deployment configuration needed                        │
│                                                                 │
│  HYBRID approach:                                               │
│  ├─ Frontend on Cloudflare Pages (edge speed)                   │
│  ├─ API/backend on Vercel Functions (Node.js power)             │
│  └─ Best of both: edge speed + Node.js + full SEO               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Integration with DevOps Agent

After recommendation, I trigger the appropriate deployment:

```typescript
// For Vercel deployment
Task({
  subagent_type: "sw-infra:devops:devops",
  prompt: `Deploy to Vercel:
    - Project: ${projectName}
    - Framework: ${framework}
    - Environment: ${env}
    Use existing VERCEL_TOKEN from .env`,
  description: "Deploy to Vercel"
});

// For Cloudflare deployment
Task({
  subagent_type: "sw-infra:devops:devops",
  prompt: `Deploy to Cloudflare:
    - Project: ${projectName}
    - Type: ${isStatic ? 'Pages' : 'Workers'}
    Use wrangler CLI (already authenticated)`,
  description: "Deploy to Cloudflare"
});
```

## Trigger Keywords

This skill activates for:
- deploy, deployment
- vercel vs cloudflare, cloudflare vs vercel
- where to deploy, where should I deploy
- vercel, cloudflare workers, cloudflare pages
- edge deployment, SSR deployment
- static site deployment, JAMstack deployment
- which hosting, best hosting for
- deployment recommendation, deployment decision
- **github pages** (⚠️ will check visibility first!)
- **private repo deployment**, private repository hosting
- **SEO hosting**, best SEO platform, dynamic SEO deployment
- e-commerce deployment, product page SEO

## Examples

### Example 1: Next.js with Prisma

```
User: "Where should I deploy my Next.js app with Prisma?"

Analysis:
- Framework: Next.js 14
- Database: Prisma (requires Node.js runtime)
- Impact: MUST use Node.js-compatible host

Recommendation: VERCEL
- Prisma requires Node.js runtime (binary execution)
- Cloudflare Workers don't support Prisma's native binary
- Vercel provides Node.js serverless functions

Alternative: Use Prisma Edge with Cloudflare D1 (requires migration)
```

### Example 2: Astro Blog

```
User: "Best deployment for my Astro blog?"

Analysis:
- Framework: Astro (static-first)
- Database: None
- SEO: Static meta tags only

Recommendation: CLOUDFLARE PAGES
- 100% static site, no server runtime needed
- Free tier covers most blogs
- Global edge CDN included
- Faster than Vercel for static content
```

### Example 3: Next.js E-commerce with Dynamic SEO

```
User: "I'm building an e-commerce site with product pages that need dynamic meta tags from the database"

Analysis:
- Framework: Next.js
- SEO: Dynamic meta from database (products, prices)
- Database: PostgreSQL with product catalog

Recommendation: VERCEL
- Dynamic `generateMetadata()` with DB calls
- Server-side rendering for SEO
- Product pages need fresh data for Google
- Cloudflare would require ISR which may show stale prices
```

### Example 4: Private Repo Static Site (🔒 IMPORTANT!)

```
User: "Where should I deploy my private Astro documentation site?"

Analysis:
- Framework: Astro (static-first)
- Repository: PRIVATE ⚠️
- SEO: Static meta tags only
- Content: Internal documentation

Step 0 - Visibility Check:
🔒 PRIVATE REPO DETECTED
❌ GitHub Pages: NOT AVAILABLE (requires GitHub Pro/Team)
✅ Cloudflare Pages: Available (free tier)
✅ Vercel: Available (free tier)

Recommendation: CLOUDFLARE PAGES
- Private repo works with free tier
- Static site = perfect fit for edge deployment
- Fast global CDN
- 500 builds/month free
- No Node.js needed

Alternative: Vercel (also works, but Cloudflare is cheaper for static)

⚠️ DO NOT recommend GitHub Pages for private repos!
```

### Example 5: High-SEO E-commerce (Vercel wins)

```
User: "I need the best SEO possible for my product catalog with 10,000+ products"

Analysis:
- Framework: Next.js 14 with App Router
- Products: 10,000+ items with prices, inventory, reviews
- SEO Requirements: CRITICAL
  - Dynamic meta tags per product
  - Real-time pricing in structured data
  - Fresh inventory status for Google
  - Dynamic OG images showing product photos

SEO Analysis Results:
| Requirement | Vercel | Cloudflare | GitHub Pages |
|-------------|--------|------------|--------------|
| Dynamic meta from DB | ✅ SSR | ⚠️ ISR (stale) | ❌ |
| Real-time prices | ✅ | ⚠️ (1hr delay) | ❌ |
| Dynamic OG images | ✅ @vercel/og | ⚠️ Limited | ❌ |
| Inventory freshness | ✅ SSR | ⚠️ Cache | ❌ |

Recommendation: VERCEL (STRONG)
- SSR ensures Google sees fresh data every crawl
- `generateMetadata()` with database calls
- `@vercel/og` for product OG images
- ISR with on-demand revalidation for cache-then-fresh
- Image optimization built-in

Why NOT Cloudflare:
- ISR cache means Google might see stale prices
- No native OG image generation
- Edge runtime can't run Prisma directly

Cost consideration:
- Vercel Pro ($20/month) vs Cloudflare (free)
- For critical SEO sites, Vercel Pro is worth it
```

## Migration Paths

### Vercel → Cloudflare

1. Replace Prisma with Drizzle + D1/Turso
2. Convert Server Components to Edge-compatible
3. Use `@cloudflare/next-on-pages` adapter
4. Move file storage to R2

### Cloudflare → Vercel

1. Remove Cloudflare-specific bindings (KV, D1, R2)
2. Replace with Vercel equivalents (Edge Config, Postgres, Blob)
3. Update `wrangler.toml` to `vercel.json`
4. Test Node.js compatibility

---

## Enterprise Considerations

### Scaling Beyond Free Tier

| Platform | Free Tier Limit | When to Upgrade | Enterprise Cost |
|----------|-----------------|-----------------|-----------------|
| **Vercel** | 100GB bandwidth, 100 serverless hours | > 50K requests/day | $20/user/month (Pro), Custom (Enterprise) |
| **Cloudflare** | 100K requests/day, 500 builds/month | > 100K requests/day | $5/month (Workers), Custom (Enterprise) |
| **GitHub Pages** | 100GB bandwidth, 10 min builds | N/A (static only) | Pro: $4/month, Team: $4/user |

### Enterprise Features Comparison

| Feature | Vercel Enterprise | Cloudflare Enterprise | Notes |
|---------|-------------------|----------------------|-------|
| **SLA** | 99.99% | 100% (edge) | Cloudflare edge is bulletproof |
| **DDoS Protection** | ✅ Included | ✅ Industry-leading | Cloudflare is the gold standard |
| **SSO/SAML** | ✅ Enterprise | ✅ Enterprise | Both require enterprise tier |
| **Audit Logs** | ✅ Enterprise | ✅ Enterprise | Compliance requirements |
| **Custom Domains** | Unlimited | Unlimited | Both generous |
| **Private Network** | ✅ Secure Compute | ✅ Cloudflare Tunnel | Zero-trust networking |
| **Compliance** | SOC2, HIPAA | SOC2, HIPAA, PCI-DSS | Cloudflare has broader certs |

### When Enterprise Tier is Needed

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTERPRISE TIER TRIGGERS                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Vercel Enterprise ($$$):                                       │
│  ├─ > 1M requests/month                                         │
│  ├─ > 100 team members                                          │
│  ├─ SOC2/HIPAA compliance required                              │
│  ├─ SLA guarantees needed for contracts                         │
│  ├─ Advanced observability (OpenTelemetry)                      │
│  └─ Dedicated support                                           │
│                                                                 │
│  Cloudflare Enterprise ($$$):                                   │
│  ├─ > 10M requests/day                                          │
│  ├─ Custom WAF rules                                            │
│  ├─ Advanced bot management                                     │
│  ├─ PCI-DSS compliance                                          │
│  ├─ 24/7 phone support                                          │
│  └─ Custom SSL certificates                                     │
│                                                                 │
│  Stay on Free/Pro when:                                         │
│  ├─ < 50K requests/day                                          │
│  ├─ < 20 team members                                           │
│  ├─ No compliance requirements                                  │
│  ├─ Community support is acceptable                             │
│  └─ Standard SLA is fine                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Framework-Specific Guidance

### Remix (Special Case)

Remix is uniquely positioned to work well on BOTH platforms:

| Remix Adapter | Platform | Best For |
|---------------|----------|----------|
| `@remix-run/cloudflare` | Cloudflare Workers | Edge-first, cost-sensitive |
| `@remix-run/cloudflare-pages` | Cloudflare Pages | Static + edge functions |
| `@remix-run/vercel` | Vercel | Node.js features, dynamic SEO |
| `@remix-run/node` | Vercel/Railway | Full Node.js, DB access |

**Remix + Cloudflare Decision**:
```
If your Remix app:
├─ Uses only edge-compatible packages → Cloudflare ✅
├─ Needs KV/D1/R2 storage → Cloudflare ✅ (native support)
├─ Is cost-sensitive → Cloudflare ✅ (cheaper)
├─ Needs Prisma/native modules → Vercel (Node.js required)
├─ Has critical dynamic SEO → Vercel (SSR power)
└─ Needs WebSockets → Vercel (Durable Objects are complex)
```

**Remix Setup for Cloudflare**:
```bash
npx create-remix@latest --template cloudflare-pages
```

**Remix Setup for Vercel**:
```bash
npx create-remix@latest --template vercel
```

---

## Backend Services (Cron Jobs, Workers)

Not all deployments are frontends. For backend services:

| Use Case | Recommended Platform | Alternative |
|----------|---------------------|-------------|
| **Cron < 1/hour** | Vercel Cron, GitHub Actions | - |
| **Cron >= 1/hour** | Railway, Render, Fly.io | Cloudflare Workers (paid) |
| **Long-running jobs** | Railway, Render | Modal, Inngest |
| **Event processing** | Cloudflare Queues | AWS SQS, Inngest |
| **Background tasks** | Inngest, Trigger.dev | Railway |

### Backend Platform Comparison

| Platform | Pricing | Best For | Limitations |
|----------|---------|----------|-------------|
| **Railway** | $5/month + usage | Full-stack, databases, cron | Can get expensive at scale |
| **Render** | Free tier + $7/month | Background workers, cron | Cold starts on free |
| **Fly.io** | Free tier + usage | Global edge, persistent | Learning curve |
| **Inngest** | Free tier + usage | Event-driven workflows | Requires adapter |
| **Cloudflare Workers** | $5/month | Edge compute, queues | No Node.js |

### Hybrid Architecture

For complex apps, consider hybrid:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (Cloudflare Pages)                                    │
│  ├─ Static assets (CSS, JS, images)                             │
│  ├─ Edge-rendered pages (fast TTFB)                             │
│  └─ Cloudflare KV for session cache                             │
│                                                                 │
│              ▼ API calls                                        │
│                                                                 │
│  API (Vercel Functions)                                         │
│  ├─ Node.js runtime for DB access                               │
│  ├─ Prisma/Drizzle with PostgreSQL                              │
│  └─ Server-side auth (Prisma sessions)                          │
│                                                                 │
│              ▼ Background jobs                                  │
│                                                                 │
│  Workers (Railway/Render)                                       │
│  ├─ Cron jobs (hourly+)                                         │
│  ├─ Email sending                                               │
│  └─ Heavy processing                                            │
│                                                                 │
│  Result: Edge speed + Node.js power + Background processing     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Optimization Tips

1. **Start on Cloudflare** if you're unsure - it's free and generous
2. **Migrate to Vercel** only when you hit Node.js requirements
3. **Use Vercel Edge** when possible (cheaper than Serverless)
4. **Cache aggressively** on Cloudflare (KV, R2, Workers KV)
5. **Use ISR** with long revalidation periods when real-time isn't critical
6. **Monitor usage** - set billing alerts on both platforms
7. **Consider Railway** for backend services (cheaper than Vercel for workers)
