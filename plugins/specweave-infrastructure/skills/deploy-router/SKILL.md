---
name: deploy-router
description: Smart deployment platform router for Vercel vs Cloudflare. Analyzes project structure, framework, SEO needs, and runtime requirements to recommend optimal deployment target. Routes to Vercel for Node.js SSR/dynamic SEO, Cloudflare for edge-first/static/cost-sensitive deployments. Activates for deploy, vercel vs cloudflare, where to deploy, cloudflare workers, cloudflare pages, vercel deployment, edge deployment, SSR deployment, static site deployment, which hosting, deployment recommendation.
allowed-tools: Read, Grep, Glob, Bash
---

# Deploy Router - Vercel vs Cloudflare Decision Engine

I intelligently route your deployment to the optimal platform based on project analysis.

## When to Use This Skill

Ask me when you need help with:
- **Platform Decision**: "Should I deploy to Vercel or Cloudflare?"
- **Project Analysis**: "Analyze my project for deployment"
- **SEO-Aware Routing**: "I need dynamic SEO for my Next.js app"
- **Cost Optimization**: "What's the cheapest deployment option?"
- **Edge-First**: "I want global edge deployment"

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

### Step 3: SEO Requirements

| SEO Need | Vercel | Cloudflare |
|----------|--------|------------|
| Static meta tags | ✅ | ✅ |
| Dynamic meta from DB | ✅ (SSR) | ⚠️ (ISR/Edge only) |
| Per-page dynamic OG | ✅ (best) | ⚠️ (limited) |
| Sitemap generation | ✅ | ✅ |
| robots.txt | ✅ | ✅ |
| Structured data | ✅ | ✅ |
| Real-time content SEO | ✅ (SSR) | ❌ (stale cache) |

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

## Analysis Workflow

When user asks "where should I deploy?", I:

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
│  QUICK DECISION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Use VERCEL when:                                               │
│  ├─ Next.js with Server Components + DB                         │
│  ├─ Dynamic SEO (meta from database)                            │
│  ├─ Image optimization needed                                   │
│  ├─ Native Node.js modules (Sharp, Prisma)                      │
│  ├─ WebSockets/real-time features                               │
│  └─ Team wants easiest DX                                       │
│                                                                 │
│  Use CLOUDFLARE when:                                           │
│  ├─ Static site (Astro, Hugo, plain HTML)                       │
│  ├─ Edge-first, low latency priority                            │
│  ├─ Cost-sensitive (Cloudflare is cheaper)                      │
│  ├─ Simple API routes without Node.js deps                      │
│  ├─ Already using Cloudflare ecosystem (R2, D1, KV)             │
│  └─ Global CDN distribution priority                            │
│                                                                 │
│  HYBRID approach:                                               │
│  ├─ Frontend on Cloudflare Pages                                │
│  ├─ API/backend on Vercel Functions                             │
│  └─ Best of both: edge speed + Node.js power                    │
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
