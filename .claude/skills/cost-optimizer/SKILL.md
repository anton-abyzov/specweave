---
name: cost-optimizer
description: Analyzes infrastructure requirements and recommends the cheapest cloud platform. Compares Hetzner, Vercel, AWS, Railway, Fly.io, DigitalOcean based on users, traffic, storage. Shows cost breakdown and savings. Activates for cheapest, budget, cost-effective, compare platforms, save money, affordable hosting.
---

# Cost Optimizer

Intelligent cloud platform comparison and recommendation engine that finds the cheapest infrastructure for your requirements.

## Purpose

Analyze application requirements (users, traffic, database, storage) and recommend the most cost-effective cloud platform with detailed cost breakdown and savings estimate.

## When to Use

Activates when user mentions:
- "cheapest"
- "budget"
- "cost-effective"
- "compare platforms"
- "save money"
- "affordable hosting"
- "under $X/month"

## What It Does

1. **Analyzes Requirements**:
   - Expected users (100, 1000, 10000, 100000+)
   - Traffic/requests per month
   - Database needs (type, size)
   - Storage requirements
   - Geographic distribution

2. **Compares Platforms**:
   - **Hetzner Cloud** - EU-based, budget-friendly ($5-50/mo)
   - **Vercel** - Global edge, serverless ($0-240/mo)
   - **AWS** - Full-featured, enterprise ($10-500/mo)
   - **Railway** - Developer-friendly ($5-100/mo)
   - **Fly.io** - Global, modern ($0-50/mo)
   - **DigitalOcean** - Simple, balanced ($6-100/mo)

3. **Calculates Costs**:
   - Compute (server instances, serverless functions)
   - Database (managed vs self-hosted)
   - Storage (object storage, CDN)
   - Bandwidth (egress charges)
   - Additional services (monitoring, backups)

4. **Recommends Best Option**:
   - Primary recommendation with rationale
   - Alternative options
   - Cost breakdown
   - Savings estimate vs alternatives
   - Trade-offs explanation

## Example Usage

**User**: "I want to build a SaaS for 1000 users with Postgres, as cheaply as possible"

**cost-optimizer**:
```markdown
Analyzing cost options for your SaaS...

Requirements detected:
- Users: ~1000
- Database: Postgres
- Type: Full-stack SaaS
- Priority: Cost optimization

Platform Comparison:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 1: Hetzner Cloud (RECOMMENDED) ⭐
Monthly Cost: $11.33

Breakdown:
  • CX11 server (1 vCPU, 2GB RAM): $5.83
  • Managed Postgres (2GB): $5.00
  • Storage (20GB): $0.50
  • Bandwidth: Included
  • SSL: Free (Let's Encrypt)

Pros:
  ✅ Lowest cost
  ✅ Simple, predictable pricing
  ✅ EU-based (GDPR-friendly)
  ✅ Managed database included

Cons:
  ⚠️ EU-only (no global edge)
  ⚠️ Manual scaling
  ⚠️ VM-based (not serverless)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 2: Railway
Monthly Cost: $20

Breakdown:
  • Server (512MB RAM): $5
  • Postgres (512MB): $5
  • Additional resources: $10

Pros:
  ✅ Developer-friendly
  ✅ Auto-scaling
  ✅ GitHub integration

Cons:
  ⚠️ 77% more expensive than Hetzner
  ⚠️ Can get costly at scale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 3: Vercel + PlanetScale
Monthly Cost: $0 (Hobby) or $60 (Production)

Breakdown:
  • Vercel Hobby: Free (limited)
  • PlanetScale Hobby: Free (5GB)

  OR

  • Vercel Pro: $20
  • PlanetScale Scaler: $39
  • Total: $59

Pros:
  ✅ Global edge network
  ✅ Serverless
  ✅ Free tier available

Cons:
  ⚠️ Free tier very limited
  ⚠️ Production: 5x more expensive
  ⚠️ Vendor lock-in

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDATION: Hetzner Cloud

Savings: $48.67/month vs Vercel ($584/year)

Best for:
  • Budget-conscious developers
  • EU/European audience
  • Predictable costs
  • Full control over infrastructure

Next steps:
  1. Use hetzner-provisioner skill to deploy
  2. Estimated setup time: 15 minutes
  3. Can upgrade to CX21 ($7/mo) if scaling needed
```

## Cost Comparison Matrix

| Platform | Small (<1k users) | Medium (1k-10k) | Large (10k+) |
|----------|-------------------|-----------------|--------------|
| **Hetzner** | $11/mo | $18/mo | $36/mo |
| **Vercel** | $0 or $60/mo | $120/mo | $240/mo |
| **AWS** | $25/mo | $80/mo | $200/mo |
| **Railway** | $20/mo | $50/mo | $100/mo |
| **Fly.io** | $0-10/mo | $30/mo | $80/mo |
| **DigitalOcean** | $12/mo | $25/mo | $60/mo |

## Test Cases

See `test-cases/` for validation:
1. **test-1-basic-comparison.yaml** - Small SaaS comparison
2. **test-2-budget-constraint.yaml** - Stay under $20/month
3. **test-3-scale-requirement.yaml** - 10k users requirement

## Integration

Works with:
- `devops-agent` - Gets requirements from strategic planning
- `hetzner-provisioner` - Executes recommendation
- `architect-agent` - Informs platform choice in architecture

## Accuracy Target

- **95%+ recommendation accuracy** (cost within 10% of estimate)
- **100% coverage** of common SaaS scenarios
- **Real-time pricing** (updated quarterly)

---

**For detailed usage**, see `README.md` and test cases
