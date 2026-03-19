# Strategic Init Guide

**SpecWeave's AI-Powered Strategic Planning Session**

Strategic Init transforms `specweave init` from a simple configuration tool into an intelligent planning session that analyzes your product vision, detects compliance needs, recommends architecture, and delivers a perfectly tailored development setup.

---

## What is Strategic Init?

Strategic Init is SpecWeave's research-driven initialization flow that:

1. **Analyzes your product vision** using AI to extract market insights
2. **Detects compliance requirements** automatically (HIPAA, GDPR, PCI-DSS, etc.)
3. **Recommends team structure** with serverless alternatives to save costs
4. **Suggests architecture** based on your specific needs (viral potential, compliance, scale)
5. **Provides cost estimates** at different user scales (1K, 10K, 100K, 1M users)
6. **Generates project structure** ready for development

**Time to Complete**: 2-5 minutes
**Questions Asked**: 8-12 (smart follow-ups based on your answers)

---

## When to Use Strategic Init

### ✅ Perfect For:
- **New projects**: Starting from scratch with clear vision
- **Product pivots**: Reassessing architecture for new direction
- **Compliance projects**: Healthcare, finance, government applications
- **Viral products**: Apps expecting rapid growth (10x - 100x scaling)
- **Bootstrapped startups**: Need to minimize fixed costs

### ⚠️ Not Needed For:
- **Existing projects**: Already have architecture in place
- **Simple scripts**: Small utilities or automation scripts
- **Learning projects**: Just exploring SpecWeave features

---

## The 6-Phase Flow

### Phase 1: Vision & Market Research

**What it does**: Analyzes your product description to extract market insights

**Questions**:
```
What is your product vision?
Example: "A design collaboration tool like Figma but for remote teams"
```

**AI Analysis**:
- Extracts keywords: `["design", "collaboration", "remote", "teams"]`
- Detects market: `productivity-saas`
- Finds competitors: `["Figma", "Miro", "Whimsical"]`
- Calculates opportunity score: `8/10` (high market, moderate competition)
- Detects viral potential: `true` (network effects, sharing features)

**Output**:
```
✓ Market: Productivity SaaS
✓ Competitors: Figma (real-time, plugins), Miro (whiteboarding)
✓ Opportunity: 8/10 - Large market, moderate competition
✓ Viral Potential: High (collaboration = network effects)
```

---

### Phase 2: Scaling & Performance Goals

**Questions**:
```
How many users do you expect?
  ○ Learning project (0-100 users)
  ○ Small product (100-10K users)
  ● Viral potential (10K-1M+ users)     ← Selected

How quickly will you grow?
  ○ Gradual (months to scale)
  ● Rapid (could go viral overnight)    ← Selected
```

**Impact**: Influences architecture recommendation (viral → serverless for instant scaling)

---

### Phase 3: Data & Compliance Detection

**Questions**:
```
What type of data will your application handle?
  ☑ Personal user data (emails, names, profiles)
  ☐ Healthcare records (HIPAA)
  ☐ Payment/credit card data (PCI-DSS)
  ☐ Government data (FedRAMP, FISMA)

Where will your users be located?
  ☑ United States
  ☑ European Union
  ☐ Global/Multiple regions
```

**AI Detection**:
```
📋 Compliance Standards Detected:

• GDPR (General Data Protection Regulation)
  Region: European Union
  Data: Personal user data
  Requirements: Consent management, data portability, right to deletion
  Team Impact: Need Privacy Engineer or DPO (Data Protection Officer)
  Cost: $500/month (DPO) + $200/month (consent management tools)

• CCPA (California Consumer Privacy Act)
  Region: United States (California)
  Data: Personal user data
  Requirements: Privacy policy, opt-out mechanisms, data disclosure
  Team Impact: Legal review + privacy controls
  Cost: $100/month (compliance tools)
```

---

### Phase 4: Budget & Cloud Credits

**Questions**:
```
What's your budget situation?
  ● Bootstrapped (self-funded, minimal budget)
  ○ Pre-seed ($50K-$500K raised)
  ○ Series A+ ($1M+ raised)
  ○ Learning (free tier only)
```

**Cloud Credits Presented**:
```
☁️  Available Cloud Credits for Bootstrapped Startups:

• AWS Activate Portfolio: $1,000 (12 months)
  Requirements: Join incubator/accelerator
  Apply: https://aws.amazon.com/activate/

• Google Cloud for Startups: $2,000 (24 months)
  Requirements: Self-service signup
  Apply: https://cloud.google.com/startup

• Vercel Pro: $20/month free (6 months)
  Requirements: Self-service signup
  Apply: https://vercel.com/startups
```

---

### Phase 5: Methodology & Organization

**Questions**:
```
How will you organize work?
  ● Agile (Increments = Sprints, 1-2 week cycles)
  ○ Waterfall (Increments = Phases, sequential delivery)
```

**Impact**: Changes increment terminology and workflow

---

### Phase 6: Repository Connection

**Questions**:
```
How would you like to connect repositories?
  ● Connect repositories (clone from GitHub, Bitbucket, or Azure DevOps)
  ○ Add later (start without repositories)
```

If you choose **Connect repositories**, you'll be prompted for repository URLs or organization details. SpecWeave clones them into the `repositories/` directory and configures the workspace automatically.

If you choose **Add later**, SpecWeave creates a minimal workspace and you can connect repositories at any time using `specweave init` or `/sw:sync-setup`.

---

## Architecture Recommendation

After all phases, Strategic Init provides a comprehensive architecture recommendation:

### Example Output:

```
🏗️  ARCHITECTURE RECOMMENDATION
══════════════════════════════════════════════════════════════════════

📐 Architecture: Serverless

💡 Rationale:
   Your product has viral potential (network effects from collaboration)
   and you're bootstrapped (need $0 fixed costs). Serverless provides
   instant auto-scaling from 10 to 100K users with pay-per-use pricing.

🔧 Infrastructure:
   • AWS Lambda (compute)
   • Supabase (PostgreSQL database + auth)
   • Vercel (frontend hosting)
   • S3 (file storage)
   • CloudFront CDN (global distribution)

💰 Cost Estimates:
   • At 1K users:   $10/month (mostly free tier)
   • At 10K users:  $250/month
   • At 100K users: $850/month
   • At 1M users:   $5,000/month

☁️  Cloud Credits Available:
   • AWS Activate: $1,000 (12 months) - Apply: https://aws.amazon.com/activate/
   • Vercel Pro: $20/month free (6 months) - Apply: https://vercel.com/startups

📦 Generated Projects:
   • frontend (Vercel)
   • backend-functions (AWS Lambda)
   • api-gateway (API Gateway + Lambda)

👥 Team Recommendations:
   • Core: 2-5 engineers (full-stack or frontend + backend split)
   • Optional: Auth team (OR use AWS Cognito - saves $185/month)
   • Optional: DevOps (OR use Vercel/AWS managed services)

══════════════════════════════════════════════════════════════════════

Accept this recommendation? (y/n/modify)
```

---

## Decision Logic Examples

Strategic Init uses intelligent decision trees to recommend architecture:

### Case 1: Viral + Bootstrapped → Serverless
```
IF viral_potential = true AND budget = "bootstrapped"
THEN recommend serverless
BECAUSE instant scaling + $0 fixed costs
```

### Case 2: HIPAA + Healthcare → Traditional + Compliance
```
IF compliance includes HIPAA AND handles PHI
THEN recommend traditional-monolith with compliance controls
BECAUSE HIPAA requires BAA, audit logs, encryption, network isolation
```

### Case 3: Learning Project → YAGNI + Free Tier
```
IF budget = "learning"
THEN recommend modular-monolith with free tier services
BECAUSE simplicity + zero cost for learning
```

### Case 4: Enterprise Scale → Microservices
```
IF team_size > 15 AND expected_services > 10 AND funding = "series-a-plus"
THEN recommend microservices with Kubernetes
BECAUSE team autonomy + service isolation at scale
```

---

## What Gets Saved

Strategic Init saves all insights to `.specweave/config.json`:

```json
{
  "research": {
    "vision": {
      "keywords": ["design", "collaboration", "remote"],
      "market": "productivity-saas",
      "competitors": [...],
      "opportunityScore": 8,
      "viralPotential": true
    },
    "compliance": [
      { "id": "GDPR", "regions": ["EU"], ... },
      { "id": "CCPA", "regions": ["US-CA"], ... }
    ],
    "teams": [
      { "teamName": "backend-team", "required": true, ... },
      { "teamName": "auth-team", "serverlessAlternative": {...} }
    ],
    "scaling": {
      "expectedUsers": 100000,
      "growthRate": "viral"
    },
    "budget": "bootstrapped",
    "methodology": "agile"
  },
  "architecture": {
    "type": "serverless",
    "infrastructure": ["AWS Lambda", "Supabase", "Vercel"],
    "rationale": "...",
    "costEstimate": {...},
    "projects": ["frontend", "backend-functions", "api-gateway"]
  },
  "repositories": {
    "selectionRules": {
      "type": "prefix",
      "pattern": "myapp-",
      "excludePatterns": ["deprecated", "archived"]
    },
    "repositories": [...]
  }
}
```

**Why This Matters**: Future increments can reference this research data for consistent decision-making.

---

## Tips for Best Results

### 1. Be Specific in Your Vision
```
❌ BAD: "A social media app"
✅ GOOD: "A social media app for local businesses to connect with customers,
         like Nextdoor but focused on small business discovery"
```

### 2. Don't Overestimate Compliance Needs
```
❌ BAD: "We'll handle payment data" (when using Stripe)
✅ GOOD: "We'll use Stripe for payments" (no PCI-DSS needed!)
```

### 3. Be Realistic About Scale
```
❌ BAD: "We'll have 1 million users in 6 months"
✅ GOOD: "We're aiming for 10K users in year 1, with potential for viral growth"
```

### 4. Use Pattern Selection for Multi-Repo
```
❌ BAD: Manually entering 50 repository URLs
✅ GOOD: Use prefix pattern "myapp-" to select all at once
```

---

## Skipping Strategic Init

If you want basic init without research:

```bash
# Standard init (no AI analysis)
specweave init

# Or provide basic info upfront
specweave init --quick \
  --name "MyApp" \
  --tech-stack "Node.js, React, PostgreSQL" \
  --projects "backend,frontend"
```

---

## Troubleshooting

### "LLM analysis failed"
**Cause**: Network issue or LLM API unavailable
**Fix**: Strategic Init falls back to keyword matching. You'll still get architecture recommendations, just without AI-powered market insights.

### "No repositories found with pattern 'myapp-'"
**Cause**: Pattern doesn't match any repositories
**Fix**: Check your GitHub org/username and repository naming. Try a different pattern or use manual selection.

### "Compliance detection showing too many standards"
**Cause**: You selected multiple data types (personal + healthcare + payment)
**Fix**: Be selective - only choose data types you'll actually handle. If using third-party services (Stripe, Auth0), you DON'T need those compliance standards.

---

## Next Steps After Strategic Init

1. **Review generated projects**: Check `.specweave/docs/internal/specs/` for project folders
2. **Start first increment**: `specweave increment "Setup authentication"`
3. **Invite team**: Share `.specweave/config.json` with team for consistent setup
4. **Apply for cloud credits**: Use URLs provided in Architecture Recommendation

---

## Learn More

- [Multi-Project Setup Guide](./multi-project-setup.md) - Organizing multiple projects
- [Compliance Standards Reference](./compliance-standards.md) - All 30+ supported standards
- [Repository Selection Guide](./repository-selection.md) - Advanced selection patterns
- [Architecture Decisions](../../internal/architecture/adr/) - How Strategic Init makes decisions

---

**Ready to start?** Run `specweave init` in your project directory!
