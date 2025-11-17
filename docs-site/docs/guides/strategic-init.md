# Strategic Init - AI-Powered Product Planning

**Version**: 0.22.0+
**Last Updated**: 2025-11-17
**Feature**: Strategic Init with Phase 0-6 (Vision → Architecture)

---

## Overview

SpecWeave's **Strategic Init** is an AI-powered product planning system that guides you from vision to production-ready architecture in 6 phases. Instead of guessing, you get data-driven recommendations based on market analysis, compliance requirements, and scale projections.

**What You Get**:
- 🧠 AI-powered vision analysis (market, competitors, viral potential)
- 🔒 Automatic compliance detection (HIPAA, GDPR, PCI-DSS, SOC 2, etc.)
- 👥 Intelligent team recommendations (role sizing based on compliance + scale)
- 📦 GitHub template repository discovery and selection
- 🏗️ Architecture decision engine (serverless vs traditional with cost estimates)
- 📋 Auto-generated project list (compliance + feature-aware)

**Time Saved**: 20-40 hours of market research + architecture planning

---

## When to Use Strategic Init

**Perfect For**:
- ✅ **New product ideas** - Need market validation and architecture decisions
- ✅ **Regulated industries** - Healthcare, fintech, e-commerce (automatic compliance detection)
- ✅ **Bootstrapped startups** - Optimize for low cost, high viral potential
- ✅ **Enterprise products** - Need compliance, audit trails, traditional infrastructure

**Not Needed For**:
- ❌ **Proof-of-concepts** - Use `specweave init --skip-research` for quick setup
- ❌ **Internal tools** - Compliance and market analysis aren't relevant

---

## The 6 Phases Explained

### Phase 0: Vision Analysis 🧠

**Input**: Your product vision (1-2 sentences)

**AI Analysis**:
- **Keyword extraction**: Identifies key concepts (e.g., "real-time collaboration", "healthcare", "HIPAA")
- **Market detection**: Categorizes product (productivity-saas, healthcare, fintech, gaming, ai-ml, etc.)
- **Competitor analysis**: Identifies similar products with strengths/weaknesses
- **Viral potential score**: Rates opportunity (1-10) based on market dynamics
- **Follow-up questions**: Generates dynamic questions for deeper understanding

**Example**:
```
Input: "A HIPAA-compliant telehealth platform for remote patient monitoring"

AI Output:
- Market: healthcare
- Keywords: telehealth, remote monitoring, HIPAA, patient data
- Competitors: Doxy.me, VSee, Amwell
- Viral Potential: 7/10 (healthcare + compliance = sticky but regulated)
- Follow-up: "Will you integrate with EHR systems like Epic/Cerner?"
```

**Files Created**:
- `.specweave/research/market-research-report.md` - Full analysis with competitor matrix

---

### Phase 1: Compliance Detection 🔒

**Input**: Vision keywords + market category

**AI Analysis**:
- **Compliance requirements**: Automatically detects HIPAA, GDPR, PCI-DSS, SOC 2, ISO 27001, FDA, COPPA, FERPA
- **Geographic requirements**: Multi-region compliance (US, EU, global)
- **Serverless suitability**: Determines if AWS Lambda/Firebase can meet compliance needs
- **Risk assessment**: Flags high-risk keywords (PHI, payment, financial, children's data)

**Example**:
```
Vision: "Healthcare telehealth platform"

Detected Compliance:
✅ HIPAA (healthcare + patient data)
✅ GDPR (if EU patients)
⚠️ Serverless NOT recommended (HIPAA requires audit controls)
→ Traditional infrastructure with AWS EC2 + RDS + CloudTrail
```

**Output**:
- `config.compliance` array in `.specweave/config.yml`
- Architecture constraints (traditional vs serverless)

---

### Phase 2: Team Recommendations 👥

**Input**: Viral potential + compliance requirements + budget

**AI Recommendations**:
- **Core roles**: Backend, frontend, mobile, DevOps, QA
- **Compliance roles**: Security engineer, compliance specialist (for HIPAA/PCI-DSS)
- **Team size**: Small (2-5 for MVP), Medium (6-15 for growth), Large (16+ for scale)
- **Bootstrapped optimization**: Minimize team size for lean startups

**Example**:
```
Inputs:
- Viral Potential: 8/10
- Compliance: HIPAA
- Budget: Bootstrapped

Recommended Team:
1. Backend Engineer (API + compliance)
2. Frontend Engineer (web app)
3. DevOps Engineer (infrastructure + audit logs)
4. Security Engineer (HIPAA compliance, penetration testing)

Total: 4 people (vs 2 for non-compliant product)
```

---

### Phase 3: Repository Selection 📦

**Input**: GitHub username/organization

**Features**:
- **GitHub template discovery**: Scans your GitHub for template repositories
- **Keyword-based filtering**: Filter by name (e.g., "react", "serverless", "backend")
- **Combined rules**: Prefix + owner, keyword + language
- **Repository preview**: Shows language, stars, description before selection
- **Adaptive UX**:
  - ≤5 repos → "Select all or manual"
  - 6-20 repos → "Prefix-based selection"
  - 21+ repos → "Pattern-based filtering + keywords"

**Example**:
```
Detected Templates (27 total):
- anton-abyzov/serverless-starter (Node.js, 45 ⭐)
- anton-abyzov/react-mobile-template (TypeScript, 23 ⭐)
- anton-abyzov/backend-api-template (Python, 67 ⭐)

Selection Options:
1. Select all (27 repos)
2. Filter by prefix: anton-abyzov/serverless-*
3. Filter by keyword: "serverless" (3 matches)
4. Manual selection: Pick 5-10 repos
```

---

### Phase 4 & 5: Architecture Decision Engine 🏗️

**Input**: Viral potential + compliance + budget + scale projection

**Decision Tree**:
```
IF viral_potential >= 8 AND bootstrapped:
  → Serverless (AWS Lambda + Supabase)
  → Cost: $0/month → $500/month at 100K users
  → Auto-scaling, pay-per-use

ELSE IF compliance IN [HIPAA, PCI-DSS, SOC2]:
  → Traditional (AWS EC2 + RDS + CloudTrail)
  → Cost: $500/month → $5K/month at 100K users
  → Full audit controls, dedicated infrastructure

ELSE IF learning_project:
  → Free Tier (Render + Supabase + Vercel)
  → Cost: $0/month (YAGNI principle)
```

**Cost Estimation**:
- **1K users**: $0-$50/month
- **10K users**: $200-$800/month
- **100K users**: $1K-$5K/month
- **1M users**: $10K-$50K/month

**Breakdown**: Compute, database, storage, bandwidth

**Example**:
```
Inputs:
- Viral Potential: 9/10
- Compliance: None
- Budget: Bootstrapped
- Scale: 100K users target

Recommendation: Serverless
✅ AWS Lambda (compute)
✅ API Gateway (REST API)
✅ Supabase (PostgreSQL + Auth + Storage)
✅ CloudFront (CDN)

Estimated Cost at 100K users: $500/month
```

---

### Phase 6: Project Generation 📋

**Input**: Architecture + compliance + vision keywords

**Project List Generation**:
- **Core projects**: Backend API, frontend web, mobile app (if keywords match)
- **Compliance additions**: Auth service, data service, audit logs (for HIPAA/PCI-DSS)
- **Feature additions**: Payment service (if "payment"), notification service (if "notification"), analytics (if "analytics")

**Example**:
```
Vision: "HIPAA-compliant telehealth with mobile app and payments"

Generated Projects:
1. backend-api (Core)
2. frontend-web (Core)
3. mobile-app (Keyword: "mobile")
4. auth-service (HIPAA: Authentication)
5. data-service (HIPAA: PHI handling)
6. audit-logs-service (HIPAA: Audit trail)
7. payment-service (Keyword: "payments")
8. notification-service (Telehealth: Real-time alerts)

Total: 8 projects
```

---

## Usage

### Basic Usage

```bash
# Run Strategic Init (default)
specweave init

# You'll be prompted for vision in Phase 0
```

### Advanced Usage

```bash
# Provide vision upfront (skip Phase 0 question)
specweave init --vision "A HIPAA-compliant telehealth platform"

# Skip research phases (quick setup)
specweave init --skip-research

# Auto-accept all defaults (CI/CD mode)
specweave init --auto-yes
```

### Brownfield Projects

```bash
# Initialize existing project
cd my-existing-project
specweave init

# SpecWeave detects existing code and adjusts recommendations
```

---

## Output Files

After Strategic Init completes, you'll have:

**Configuration**:
- `.specweave/config.yml` - Project config with compliance, team, architecture

**Research**:
- `.specweave/research/market-research-report.md` - Vision analysis, competitors, viral potential

**Living Docs** (if multi-project mode):
- `.specweave/docs/internal/specs/projects/{project-name}/` - One folder per project

**Templates**:
- `CLAUDE.md` - User-facing context for Claude Code
- `README.md` - Project overview
- `.gitignore` - SpecWeave-aware ignore patterns

---

## FAQ

### Does Strategic Init cost money?

**No.** Phase 0 (Vision Analysis) uses Claude Code's existing LLM access. No additional API costs.

### Can I skip phases?

**Yes.** Use `--skip-research` flag. But you'll lose compliance detection, team recommendations, and cost estimates.

### Can I re-run Strategic Init?

**Yes.** Run `specweave init --force` to re-initialize. Your existing increments and docs will be preserved (unless you select "Fresh start").

### What if I don't have GitHub templates?

Strategic Init will recommend popular open-source templates based on your architecture (Next.js, Serverless Framework, etc.).

---

## Related Guides

- [Multi-Project Setup](./multi-project-setup.md) - Organize projects across teams
- [Compliance Standards Reference](../reference/compliance-standards.md) - Detailed compliance info
- [Repository Selection Guide](./repository-selection.md) - Advanced filtering techniques
