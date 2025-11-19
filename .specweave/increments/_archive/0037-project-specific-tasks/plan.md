# Implementation Plan: Strategic Init & Project-Specific Architecture

**Increment**: 0037-project-specific-tasks
**Feature**: FS-037
**Type**: Major architectural enhancement
**Estimated Effort**: 78-107 hours (12-17 weeks part-time)
**Test Coverage Target**: 95%+

---

## Executive Summary

This increment transforms SpecWeave's initialization and living docs sync through two major architectural enhancements:

**Phase 0: Research-Driven Init** - Transform `specweave init` from a configuration questionnaire into an AI-powered strategic planning session that analyzes product vision, detects compliance needs, recommends team structure, and delivers perfect architecture recommendations based on research insights.

**Phase 1-4: Copy-Based Project Tasks** - Simplify multi-project workflows by copying relevant ACs and Tasks directly into User Story files (eliminating separate TASKS.md files) with three-layer bidirectional sync and code validation.

**Key Paradigm Shift**: Research insights determine architecture → Architecture determines projects → Projects known from day 1 → Copy-paste sync (no transformation!)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 0: STRATEGIC INIT                       │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Vision       │───▶│ Compliance   │───▶│ Team         │      │
│  │ Analyzer     │    │ Detector     │    │ Recommender  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │              │
│         └────────────────────┼────────────────────┘              │
│                              ▼                                   │
│                   ┌──────────────────┐                          │
│                   │ Architecture     │                          │
│                   │ Decision Engine  │                          │
│                   └──────────────────┘                          │
│                              │                                   │
│                              ▼                                   │
│                   ┌──────────────────┐                          │
│                   │ .specweave/      │                          │
│                   │ config.json      │                          │
│                   │ (Projects known  │                          │
│                   │  from day 1)     │                          │
│                   └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 1-4: COPY-BASED SYNC                       │
│                                                                   │
│  Layer 3: Increment (Source of Truth)                           │
│  ┌─────────────────────────────────────────────┐                │
│  │ spec.md (ACs) + tasks.md (Tasks)            │                │
│  └──────────────────┬──────────────────────────┘                │
│                     │ COPY (filter by AC-ID + project)          │
│                     ▼                                            │
│  Layer 2: Living Docs User Story                                │
│  ┌─────────────────────────────────────────────┐                │
│  │ specs/{project}/FS-XXX/us-001.md            │                │
│  │ ├── ## Acceptance Criteria (COPIED)        │                │
│  │ └── ## Implementation (COPIED Tasks)       │                │
│  └──────────────────┬──────────────────────────┘                │
│                     │ GitHub sync                                │
│                     ▼                                            │
│  Layer 1: GitHub Issue                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │ Feature Link + AC Checkboxes + Subtasks    │                │
│  └─────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Research-Driven Init Architecture

### 1. Vision & Market Research Engine

**Component**: `src/init/research/VisionAnalyzer.ts`

**Responsibilities**:
- Extract keywords from product description (LLM-powered)
- Detect market category (SaaS, healthcare, fintech, e-commerce, etc.)
- Identify comparable products (competitor analysis)
- Calculate opportunity score (1-10 scale based on market size vs competition)
- Generate adaptive follow-up questions based on vision

**Technology Stack**:
- TypeScript with Zod validation
- LLM integration (similar to bmad-method plugin pattern)
- Configurable prompts for vision analysis
- Caching layer for repeat queries

**Data Model**:
```typescript
interface VisionInsights {
  keywords: string[];           // ["Figma", "design", "collaboration"]
  market: MarketCategory;        // "productivity-saas" | "healthcare" | etc.
  competitors: Competitor[];     // [{name, url, strengths, weaknesses}]
  opportunityScore: number;      // 1-10 scale
  viralPotential: boolean;       // true if viral growth likely
  followUpQuestions: Question[]; // Adaptive based on vision
}

type MarketCategory =
  | "productivity-saas"
  | "healthcare"
  | "fintech"
  | "e-commerce"
  | "education"
  | "gaming"
  | "social-network"
  | "enterprise-b2b"
  | "consumer-b2c"
  | "marketplace"
  | "iot"
  | "blockchain"
  | "ai-ml"
  | "unknown";
```

**LLM Prompts**:
```typescript
const VISION_ANALYSIS_PROMPT = `
You are a product strategy expert. Analyze this product vision:

Vision: {userInput}

Extract:
1. Keywords (5-10 key terms)
2. Market category (be specific)
3. 3-5 comparable products (competitors)
4. Market opportunity score (1-10, consider market size and competition)
5. Viral potential (true/false with rationale)

Output as JSON matching VisionInsights schema.
`;
```

**Key Algorithms**:
1. **Keyword Extraction**: LLM extracts domain-specific terms
2. **Market Detection**: Pattern matching + LLM classification
3. **Competitor Analysis**: Web search + LLM synthesis (optional)
4. **Opportunity Scoring**: Market size estimator + competition density
5. **Viral Detection**: Analyze for network effects, sharing, UGC

**Storage**: `.specweave/config.json` under `research.vision`

---

### 2. Compliance Standards Detection

**Component**: `src/init/compliance/ComplianceDetector.ts`

**Responsibilities**:
- Detect data types user will handle (healthcare, payment, personal, etc.)
- Auto-map to 30+ compliance standards
- Calculate team impact (auth team, DevSecOps, CISO, etc.)
- Present compliance requirements summary before finalizing

**Compliance Mapping Table**:
```typescript
interface ComplianceStandard {
  id: string;                    // "HIPAA"
  name: string;                  // "Health Insurance Portability and Accountability Act"
  dataTypes: DataType[];         // ["healthcare", "phi"]
  regions: string[];             // ["US", "global"]
  teamImpact: TeamRequirement[]; // [auth-team, data-team, devsecops]
  costImpact: string;            // "$3K+/month minimum"
  certificationRequired: boolean;
  auditFrequency: string;        // "annual" | "quarterly" | "continuous"
}

type DataType =
  | "healthcare"      // PHI (Protected Health Information)
  | "payment"         // PCI (Payment Card Industry)
  | "personal"        // PII (Personally Identifiable Information)
  | "government"      // CUI (Controlled Unclassified Information)
  | "student"         // Educational records
  | "financial"       // Financial services data
  | "biometric"       // Biometric identifiers
  | "location"        // GPS/location data
  | "children"        // Data from users under 13
  | "sensitive";      // Race, religion, sexual orientation, etc.

const COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  // Healthcare (8 standards)
  { id: "HIPAA", dataTypes: ["healthcare"], regions: ["US"], ... },
  { id: "HITRUST", dataTypes: ["healthcare"], regions: ["US"], ... },
  { id: "FDA-21-CFR-Part-11", dataTypes: ["healthcare"], regions: ["US"], ... },
  { id: "HL7-FHIR", dataTypes: ["healthcare"], regions: ["global"], ... },

  // Payment (6 standards)
  { id: "PCI-DSS", dataTypes: ["payment"], regions: ["global"], ... },
  { id: "PSD2", dataTypes: ["payment"], regions: ["EU"], ... },
  { id: "SOX", dataTypes: ["financial"], regions: ["US"], ... },

  // Privacy (10 standards)
  { id: "GDPR", dataTypes: ["personal"], regions: ["EU"], ... },
  { id: "CCPA", dataTypes: ["personal"], regions: ["US-CA"], ... },
  { id: "PIPEDA", dataTypes: ["personal"], regions: ["CA"], ... },
  { id: "LGPD", dataTypes: ["personal"], regions: ["BR"], ... },

  // Government (7 standards)
  { id: "FedRAMP", dataTypes: ["government"], regions: ["US"], ... },
  { id: "FISMA", dataTypes: ["government"], regions: ["US"], ... },
  { id: "CMMC", dataTypes: ["government"], regions: ["US-DOD"], ... },
  { id: "ITAR", dataTypes: ["government"], regions: ["US"], ... },

  // Education (2 standards)
  { id: "FERPA", dataTypes: ["student"], regions: ["US"], ... },
  { id: "COPPA", dataTypes: ["children"], regions: ["US"], ... },

  // Financial (3 standards)
  { id: "GLBA", dataTypes: ["financial"], regions: ["US"], ... },
  { id: "SOC2", dataTypes: ["personal", "financial"], regions: ["global"], ... },
  { id: "ISO-27001", dataTypes: ["personal"], regions: ["global"], ... },

  // Infrastructure (1 standard)
  { id: "NERC-CIP", dataTypes: ["sensitive"], regions: ["US"], ... },
];
```

**Detection Algorithm**:
```typescript
async detectCompliance(userDataTypes: DataType[], userRegions: string[]): Promise<ComplianceStandard[]> {
  const detected: ComplianceStandard[] = [];

  for (const standard of COMPLIANCE_STANDARDS) {
    // Check if data type matches
    const dataTypeMatch = standard.dataTypes.some(dt => userDataTypes.includes(dt));

    // Check if region matches
    const regionMatch = standard.regions.includes("global") ||
                        standard.regions.some(r => userRegions.includes(r));

    if (dataTypeMatch && regionMatch) {
      detected.push(standard);
    }
  }

  return detected;
}
```

**User Flow**:
```
Question: "What type of data will your application handle?"
Options:
  ☐ Healthcare/medical records (HIPAA, HITRUST)
  ☐ Payment/credit card data (PCI-DSS)
  ☐ Personal user data (GDPR, CCPA if US/EU)
  ☐ Government/defense data (FedRAMP, FISMA, CMMC)
  ☐ Student records (FERPA, COPPA)
  ☐ Financial services (GLBA, SOC2)
  ☐ None of the above

Follow-up: "Where will your users be located?"
Options:
  ☐ United States
  ☐ European Union
  ☐ Canada
  ☐ Brazil
  ☐ Global/Multiple regions

AI Analysis:
  ✓ Healthcare + US → HIPAA, HITRUST detected
  ✓ Personal data + EU → GDPR detected

Summary:
  📋 Compliance Requirements Detected:
     • HIPAA (Healthcare - US)
       - Requires: Auth team, Data team, DevSecOps
       - Cost impact: $3K+/month minimum
       - Certification: BAA required
     • GDPR (Personal data - EU)
       - Requires: Privacy engineering, DPO
       - Cost impact: $500/month DPO + legal
       - Certification: Not required (self-assessment)
```

**Storage**: `.specweave/config.json` under `research.compliance`

---

### 3. Ultra-Smart Team Detection

**Component**: `src/init/team/TeamRecommender.ts`

**Responsibilities**:
- Recommend core teams (backend, frontend, mobile)
- Detect specialized teams based on compliance (auth, security, DevSecOps)
- Suggest serverless alternatives for common use cases
- Calculate cost savings for serverless recommendations

**Team Detection Logic**:
```typescript
interface TeamRecommendation {
  teamName: string;              // "backend-team"
  role: string;                  // "Backend Development"
  required: boolean;             // true = must have, false = optional
  reason: string;                // "Core application logic"
  size: string;                  // "2-5 engineers"
  skills: string[];              // ["Node.js", "PostgreSQL", "AWS"]
  serverlessAlternative?: {
    service: string;             // "AWS Lambda + RDS"
    costSavings: number;         // 480 ($/month)
    tradeoffs: string[];         // ["Vendor lock-in", "Cold starts"]
  };
}

async recommendTeams(
  vision: VisionInsights,
  compliance: ComplianceStandard[],
  architecture: ArchitectureType
): Promise<TeamRecommendation[]> {
  const teams: TeamRecommendation[] = [];

  // Core teams (always)
  teams.push({
    teamName: "backend-team",
    role: "Backend Development",
    required: true,
    reason: "Core application logic and APIs",
    size: "2-5 engineers",
    skills: ["Node.js/Python", "PostgreSQL", "REST APIs"]
  });

  teams.push({
    teamName: "frontend-team",
    role: "Frontend Development",
    required: true,
    reason: "User interface and web application",
    size: "2-4 engineers",
    skills: ["React/Vue", "TypeScript", "CSS"]
  });

  // Mobile (if applicable)
  if (vision.keywords.includes("mobile") || vision.keywords.includes("app")) {
    teams.push({
      teamName: "mobile-team",
      role: "Mobile Development",
      required: true,
      reason: "Native mobile applications",
      size: "2-3 engineers",
      skills: ["React Native", "iOS/Android", "Mobile UX"]
    });
  }

  // Compliance-driven teams
  if (compliance.some(c => c.id === "HIPAA" || c.id === "HITRUST")) {
    teams.push({
      teamName: "auth-team",
      role: "Authentication & Authorization",
      required: true,
      reason: "HIPAA requires separate auth controls",
      size: "1-2 engineers",
      skills: ["OAuth2", "JWT", "MFA", "Audit logging"],
      serverlessAlternative: {
        service: "AWS Cognito / Auth0",
        costSavings: 185, // $/month
        tradeoffs: ["Vendor lock-in", "Limited customization"]
      }
    });

    teams.push({
      teamName: "data-team",
      role: "Data Security & Privacy",
      required: true,
      reason: "HIPAA PHI requires encryption and access controls",
      size: "1-2 engineers",
      skills: ["Encryption", "Access control", "Audit logs"]
    });
  }

  if (compliance.some(c => c.id === "PCI-DSS")) {
    teams.push({
      teamName: "payments-team",
      role: "Payment Processing",
      required: true,
      reason: "PCI-DSS requires isolated payment environment",
      size: "1-2 engineers",
      skills: ["Payment gateways", "PCI compliance", "Tokenization"],
      serverlessAlternative: {
        service: "Stripe / PayPal",
        costSavings: 3500, // $/month (avoid PCI-DSS compliance overhead)
        tradeoffs: ["2.9% + $0.30 per transaction", "Limited customization"]
      }
    });
  }

  if (compliance.some(c => c.id === "SOC2" || c.id === "ISO-27001")) {
    teams.push({
      teamName: "devsecops-team",
      role: "DevSecOps & Security",
      required: teamCount > 15, // Only if >15 people
      reason: "SOC2 requires security controls and monitoring",
      size: "1-2 engineers",
      skills: ["CI/CD", "Security scanning", "Monitoring", "IAM"]
    });

    if (teamCount > 15) {
      teams.push({
        teamName: "ciso",
        role: "Chief Information Security Officer",
        required: true,
        reason: "SOC2 with >15 people requires dedicated security leadership",
        size: "1 person",
        skills: ["Security strategy", "Compliance", "Risk management"]
      });
    }
  }

  // Serverless recommendations for common use cases
  if (!compliance.some(c => c.id === "HIPAA" || c.id === "PCI-DSS")) {
    // Only if NOT highly regulated
    teams.push({
      teamName: "file-storage-team",
      role: "File Upload & Storage",
      required: false,
      reason: "Handle user file uploads",
      size: "1 engineer (if building in-house)",
      skills: ["File storage", "CDN", "Image processing"],
      serverlessAlternative: {
        service: "AWS S3 + Lambda",
        costSavings: 480, // $/month
        tradeoffs: ["AWS vendor lock-in", "Lambda timeouts for large files"]
      }
    });

    teams.push({
      teamName: "email-team",
      role: "Email Infrastructure",
      required: false,
      reason: "Send transactional emails",
      size: "1 engineer (if building in-house)",
      skills: ["SMTP", "Email templates", "Deliverability"],
      serverlessAlternative: {
        service: "SendGrid / AWS SES",
        costSavings: 85, // $/month
        tradeoffs: ["Vendor lock-in", "$0.0001/email cost"]
      }
    });

    teams.push({
      teamName: "background-jobs-team",
      role: "Background Job Processing",
      required: false,
      reason: "Handle async tasks (reports, exports, etc.)",
      size: "1-2 engineers (if building in-house)",
      skills: ["Job queues", "Workers", "Monitoring"],
      serverlessAlternative: {
        service: "AWS Lambda + SQS",
        costSavings: 280, // $/month
        tradeoffs: ["AWS vendor lock-in", "15-minute Lambda timeout"]
      }
    });
  }

  return teams;
}
```

**Serverless Cost Savings Calculator**:
```typescript
interface ServerlessSavings {
  useCase: string;
  traditionalCost: number;  // $/month
  serverlessCost: number;   // $/month
  savings: number;          // $/month
  service: string;
  tradeoffs: string[];
}

const SERVERLESS_SAVINGS: ServerlessSavings[] = [
  {
    useCase: "Authentication",
    traditionalCost: 200,
    serverlessCost: 15,
    savings: 185,
    service: "AWS Cognito / Auth0",
    tradeoffs: ["Vendor lock-in", "Limited customization"]
  },
  {
    useCase: "File Storage",
    traditionalCost: 500,
    serverlessCost: 20,
    savings: 480,
    service: "S3 + Lambda",
    tradeoffs: ["AWS vendor lock-in", "Lambda timeouts"]
  },
  {
    useCase: "Image Processing",
    traditionalCost: 500,
    serverlessCost: 10,
    savings: 490,
    service: "Lambda / Cloudinary",
    tradeoffs: ["Vendor lock-in", "Cold starts"]
  },
  {
    useCase: "Email",
    traditionalCost: 100,
    serverlessCost: 15,
    savings: 85,
    service: "SendGrid / SES",
    tradeoffs: ["Vendor lock-in", "Per-email cost"]
  },
  {
    useCase: "Background Jobs",
    traditionalCost: 300,
    serverlessCost: 20,
    savings: 280,
    service: "Lambda + SQS",
    tradeoffs: ["AWS vendor lock-in", "15-min timeout"]
  }
];

// Total potential savings: $1,520/month
```

**Storage**: `.specweave/config.json` under `research.teams`

---

### 4. Repository Batch Selection

**Component**: `src/init/repo/RepositorySelector.ts`

**Responsibilities**:
- Detect multi-repo scenario (3+ repositories)
- Offer batch selection options (all, prefix, owner/org, keyword, manual)
- Preview selected repositories before confirming
- Allow manual exclusions after batch selection
- Save selection rules for future use

**Selection Patterns**:
```typescript
interface RepositorySelectionRule {
  type: "all" | "prefix" | "owner" | "keyword" | "combined" | "manual";
  pattern?: string;          // "ec-" | "my-company" | "service"
  owner?: string;            // GitHub username or org
  excludePatterns?: string[]; // ["deprecated", "archived"]
}

interface RepositoryMetadata {
  name: string;
  url: string;
  owner: string;
  description: string;
  language: string;
  stars: number;
  lastUpdated: Date;
}

async selectRepositories(rule: RepositorySelectionRule): Promise<RepositoryMetadata[]> {
  let repositories: RepositoryMetadata[] = [];

  switch (rule.type) {
    case "all":
      // Fetch all repos from user's GitHub account
      repositories = await fetchAllRepos(rule.owner);
      break;

    case "prefix":
      // Filter repos by prefix pattern
      repositories = await fetchAllRepos(rule.owner);
      repositories = repositories.filter(r => r.name.startsWith(rule.pattern));
      break;

    case "owner":
      // Filter repos by owner/org
      repositories = await fetchReposByOwner(rule.owner);
      break;

    case "keyword":
      // Filter repos by keyword in name
      repositories = await fetchAllRepos(rule.owner);
      repositories = repositories.filter(r => r.name.includes(rule.pattern));
      break;

    case "combined":
      // Combine multiple filters
      repositories = await fetchAllRepos(rule.owner);
      if (rule.pattern) {
        repositories = repositories.filter(r => r.name.startsWith(rule.pattern));
      }
      break;

    case "manual":
      // User enters each repo URL manually
      repositories = await promptManualSelection();
      break;
  }

  // Apply exclusion patterns
  if (rule.excludePatterns) {
    for (const excludePattern of rule.excludePatterns) {
      repositories = repositories.filter(r => !r.name.includes(excludePattern));
    }
  }

  return repositories;
}
```

**GitHub API Integration**:
```typescript
class GitHubAPIClient {
  async fetchAllRepos(owner: string): Promise<RepositoryMetadata[]> {
    const response = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100`);
    const data = await response.json();

    return data.map(repo => ({
      name: repo.name,
      url: repo.html_url,
      owner: repo.owner.login,
      description: repo.description || "",
      language: repo.language || "Unknown",
      stars: repo.stargazers_count,
      lastUpdated: new Date(repo.updated_at)
    }));
  }

  async fetchReposByOwner(owner: string): Promise<RepositoryMetadata[]> {
    // Same as fetchAllRepos but for orgs
    return this.fetchAllRepos(owner);
  }
}
```

**User Flow**:
```
specweave init --multi-repo

Question: "How many repositories are in this project?"
→ User: "About 50 repos"

Recommendation: "For large multi-repo setups, pattern-based selection is fastest!"

Question: "How would you like to select repositories?"
Options:
1. Pattern-based selection (prefix, keyword, org) ← RECOMMENDED for 50+ repos
2. All repositories from my GitHub account/org
3. Manual selection (enter each repository URL)

→ User: "Pattern-based selection"

Question: "What's the repository naming pattern?"
Examples:
- Prefix: "ec-" (e.g., ec-frontend, ec-backend, ec-api)
- Owner/org: "my-company" (all repos from GitHub org)
- Keyword: "service" (all repos containing "service")
- Combined: "ec-" prefix + "my-company" owner

→ User: "ec-"

Preview: Found 23 repositories matching "ec-*":
- ec-frontend (TypeScript, 145 stars, updated 2 days ago)
- ec-backend (Node.js, 89 stars, updated 1 week ago)
- ec-api (TypeScript, 67 stars, updated 3 days ago)
... (20 more)

Exclude any repositories? (enter patterns like "deprecated", "archived")
→ User: "deprecated"

Final selection: 21 repositories (excluded 2)

Confirm selection? (y/n)
→ User: "y"

✅ 21 repositories selected!
   Saved selection rules to .specweave/config.json

Time saved: 20 manual entries (approx. 5 minutes)
```

**Storage**: `.specweave/config.json` under `repositories.selectionRules`

---

### 5. Architecture Decision Engine

**Component**: `src/init/architecture/ArchitectureDecisionEngine.ts`

**Responsibilities**:
- Synthesize all research insights (vision, compliance, budget, scaling)
- Recommend perfect architecture match
- Provide clear rationale for decisions
- Calculate cost estimates for different user scales
- Present cloud credits information
- Generate projects list based on architecture

**Decision Logic**:
```typescript
interface ArchitectureRecommendation {
  architecture: ArchitectureType;
  infrastructure: string[];      // ["AWS Lambda", "RDS", "S3"]
  rationale: string;             // "Viral potential needs instant scaling..."
  costEstimate: CostEstimate;
  cloudCredits: CloudCredit[];
  projects: ProjectDefinition[]; // Generated project list
  methodology: "agile" | "waterfall";
}

type ArchitectureType =
  | "serverless"
  | "traditional-monolith"
  | "microservices"
  | "modular-monolith"
  | "jamstack"
  | "hybrid";

interface CostEstimate {
  at1K: string;    // "$10/month"
  at10K: string;   // "$250/month"
  at100K: string;  // "$850/month"
  at1M: string;    // "$5K/month"
}

async decideArchitecture(
  vision: VisionInsights,
  compliance: ComplianceStandard[],
  scaling: ScalingGoals,
  budget: BudgetType,
  methodology: "agile" | "waterfall"
): Promise<ArchitectureRecommendation> {

  // Decision tree based on insights

  // CASE 1: Viral potential + Bootstrapped → Serverless
  if (vision.viralPotential && budget === "bootstrapped") {
    return {
      architecture: "serverless",
      infrastructure: ["AWS Lambda", "Supabase", "Vercel", "S3", "CloudFront CDN"],
      rationale: "Viral potential needs instant scaling from 10 to 100K users. Bootstrapped budget needs $0 fixed costs. Serverless provides pay-per-use pricing and auto-scaling.",
      costEstimate: {
        at1K: "$10/month (free tier)",
        at10K: "$250/month",
        at100K: "$850/month",
        at1M: "$5K/month"
      },
      cloudCredits: [
        { provider: "AWS Activate", amount: "$1K-$300K", duration: "12 months" },
        { provider: "Vercel Pro", amount: "$20/month free", duration: "6 months" }
      ],
      projects: ["frontend", "backend-functions", "api-gateway"],
      methodology: methodology
    };
  }

  // CASE 2: HIPAA + PHI → Traditional + Compliance
  if (compliance.some(c => c.id === "HIPAA") && compliance.some(c => c.dataTypes.includes("healthcare"))) {
    return {
      architecture: "traditional-monolith",
      infrastructure: ["AWS ECS", "RDS (encrypted)", "CloudTrail", "WAF", "VPC"],
      rationale: "HIPAA requires BAA (Business Associate Agreement), audit logs, encrypted storage, and network isolation. Traditional architecture provides better control for compliance.",
      costEstimate: {
        at1K: "$3K/month (compliance overhead)",
        at10K: "$5K/month",
        at100K: "$15K/month",
        at1M: "$50K/month"
      },
      cloudCredits: [
        { provider: "AWS Activate", amount: "$1K-$300K", duration: "12 months" }
      ],
      projects: ["backend", "frontend", "auth-service", "data-service", "audit-logs"],
      methodology: methodology
    };
  }

  // CASE 3: Enterprise + Many services → Microservices
  if (scaling.expectedServices > 10 && budget === "series-a-plus") {
    return {
      architecture: "microservices",
      infrastructure: ["AWS EKS", "RDS", "ElastiCache", "SQS", "API Gateway"],
      rationale: "Enterprise scale with many services requires independent deployment and scaling. Microservices provide team autonomy and service isolation.",
      costEstimate: {
        at1K: "$5K/month (Kubernetes overhead)",
        at10K: "$10K/month",
        at100K: "$30K/month",
        at1M: "$100K/month"
      },
      cloudCredits: [
        { provider: "AWS Activate", amount: "$100K-$300K", duration: "12 months" }
      ],
      projects: ["api-gateway", "auth-service", "user-service", "payment-service", "notification-service", "frontend"],
      methodology: methodology
    };
  }

  // CASE 4: Learning project → YAGNI + Free tier
  if (budget === "learning") {
    return {
      architecture: "modular-monolith",
      infrastructure: ["Vercel", "Supabase", "Cloudflare Pages"],
      rationale: "Learning project needs simplicity and zero cost. Modular monolith with free tier services provides fast iteration.",
      costEstimate: {
        at1K: "$0/month (free tier)",
        at10K: "$0/month (free tier)",
        at100K: "$50/month",
        at1M: "$500/month"
      },
      cloudCredits: [],
      projects: ["monolith"],
      methodology: "agile" // Always agile for learning
    };
  }

  // DEFAULT: Modular monolith (safest choice)
  return {
    architecture: "modular-monolith",
    infrastructure: ["AWS ECS", "RDS", "S3", "CloudFront"],
    rationale: "Balanced approach for typical product needs. Modular monolith provides simplicity of deployment with internal modularity for future microservices migration.",
    costEstimate: {
      at1K: "$100/month",
      at10K: "$500/month",
      at100K: "$2K/month",
      at1M: "$10K/month"
    },
    cloudCredits: [
      { provider: "AWS Activate", amount: "$1K-$100K", duration: "12 months" }
    ],
    projects: ["backend", "frontend"],
    methodology: methodology
  };
}
```

**Cloud Credits Database**:
```typescript
const CLOUD_CREDITS: CloudCredit[] = [
  {
    provider: "AWS Activate",
    url: "https://aws.amazon.com/activate/",
    tiers: [
      { name: "Portfolio", amount: "$1,000", duration: "12 months", requirements: "Incubator/accelerator" },
      { name: "Portfolio Plus", amount: "$5,000", duration: "12 months", requirements: "Select incubators" },
      { name: "Founders", amount: "$100,000", duration: "12 months", requirements: "VC-backed Series A+" }
    ]
  },
  {
    provider: "Azure for Startups",
    url: "https://azure.microsoft.com/en-us/pricing/member-offers/startups/",
    tiers: [
      { name: "Standard", amount: "$1,000", duration: "90 days", requirements: "Self-service" },
      { name: "Founders Hub", amount: "$100,000", duration: "180 days", requirements: "VC-backed" }
    ]
  },
  {
    provider: "Google Cloud for Startups",
    url: "https://cloud.google.com/startup",
    tiers: [
      { name: "Standard", amount: "$2,000", duration: "24 months", requirements: "Self-service" },
      { name: "Startup", amount: "$100,000", duration: "24 months", requirements: "VC-backed Series A" },
      { name: "Scale", amount: "$350,000", duration: "24 months", requirements: "VC-backed Series B+" }
    ]
  }
];
```

**Storage**: `.specweave/config.json` under `architecture`

---

### 6. Init Flow Orchestration

**Component**: `src/init/InitFlow.ts` (enhanced)

**Responsibilities**:
- Orchestrate 6-phase research flow
- Progressive disclosure (2-3 questions max)
- User-friendly language (no jargon)
- Adaptive questions based on responses
- Save all insights to config

**Flow**:
```typescript
async function enhancedInitFlow(): Promise<void> {
  console.log("🚀 SpecWeave Strategic Init\n");

  // PHASE 1: Vision & Market Research
  console.log("📊 Phase 1: Product Vision\n");
  const vision = await visionAnalyzer.analyze();

  // PHASE 2: Scaling & Performance Goals
  console.log("\n⚡ Phase 2: Growth Goals\n");
  const scaling = await promptScalingGoals(vision);

  // PHASE 3: Data & Compliance Detection
  console.log("\n🔒 Phase 3: Data & Compliance\n");
  const compliance = await complianceDetector.detect();

  // PHASE 4: Budget & Cloud Credits
  console.log("\n💰 Phase 4: Budget & Funding\n");
  const budget = await promptBudget();
  const cloudCredits = await presentCloudCredits(budget);

  // PHASE 5: Methodology & Organization
  console.log("\n📋 Phase 5: Development Approach\n");
  const methodology = await promptMethodology();

  // PHASE 6: Repository Selection (if multi-repo)
  let repositories: RepositoryMetadata[] = [];
  if (await detectMultiRepo()) {
    console.log("\n📦 Phase 6: Repository Selection\n");
    repositories = await repositorySelector.select();
  }

  // FINAL: Architecture Recommendation
  console.log("\n🏗️  Generating Architecture Recommendation...\n");
  const architecture = await architectureDecisionEngine.decide(
    vision,
    compliance,
    scaling,
    budget,
    methodology
  );

  // Present recommendation
  presentArchitectureRecommendation(architecture);

  // Save to config
  await saveConfig({
    research: { vision, compliance, scaling, budget, methodology },
    architecture,
    repositories,
    projects: architecture.projects
  });

  console.log("\n✅ Strategic init complete!");
  console.log("   Projects known from day 1 → Copy-based sync enabled");
}
```

**User-Friendly Questions** (No Jargon):
```
❌ BAD: "Do you want a monorepo or polyrepo architecture?"
✅ GOOD: "How many repositories will you have? (1, 2-5, 10+)"

❌ BAD: "What's your microservices strategy?"
✅ GOOD: "How many services will you build? (1-3, 4-10, 10+)"

❌ BAD: "Do you need HIPAA compliance?"
✅ GOOD: "What type of data will you handle? (Healthcare, Payment, Personal, None)"

❌ BAD: "What's your CAC and LTV?"
✅ GOOD: "How will you acquire users? (Viral growth, Paid ads, Enterprise sales)"
```

---

## Phase 1-4: Copy-Based Project Tasks Architecture

### Data Model

**Increment (Source of Truth)**:
```
.specweave/increments/0031/
├── spec.md (ACs with project keywords)
│   └── [x] AC-US1-01: JWT token generation (backend) (P1)
└── tasks.md (Tasks with AC-ID references)
    └── [x] T-001: Setup JWT service (AC-US1-01)
```

**Living Docs User Story (Copied Content)**:
```
.specweave/docs/internal/specs/backend/FS-031/us-001-authentication.md

## Acceptance Criteria (COPIED from increment spec.md, filtered by "backend")
- [x] AC-US1-01: JWT token generation (backend) (P1)

## Implementation (COPIED tasks from increment tasks.md, filtered by AC-US1-01)
- [x] T-001: Setup JWT service

> **Note**: Task status syncs with increment tasks.md
```

**GitHub Issue (Synced from Living Docs)**:
```
Issue #123: US-001 Authentication (Backend)

**Feature**: [FS-031: External Tool Status Sync](../../specs/_features/FS-031/FEATURE.md)

## Acceptance Criteria
- [x] AC-US1-01: JWT token generation (backend)

## Subtasks
- [x] T-001: Setup JWT service

> **Bidirectional Sync**: ACs and Subtasks sync between GitHub ↔ Living Docs ↔ Increment
```

---

### 1. SpecDistributor Enhancement

**Component**: `src/core/living-docs/SpecDistributor.ts` (existing, enhanced)

**New Method**: `copyAcsAndTasksToUserStories()`

**Algorithm**:
```typescript
async copyAcsAndTasksToUserStories(increment: Increment): Promise<void> {
  // 1. Read increment spec.md (source of truth for ACs)
  const spec = await readSpecMd(increment.path);
  const allAcs = extractAcceptanceCriteria(spec);

  // 2. Read increment tasks.md (source of truth for Tasks)
  const tasksContent = await readTasksMd(increment.path);
  const allTasks = parseTasksMd(tasksContent);

  // 3. Group ACs by User Story ID
  const acsByUserStory = groupBy(allAcs, ac => ac.userStoryId);

  // 4. For each User Story
  for (const [userStoryId, acs] of acsByUserStory) {
    // 5. Detect project from ACs (backend, frontend, mobile)
    const projects = detectProjects(acs);

    // 6. For each project
    for (const project of projects) {
      // 7. Filter ACs by project keywords
      const projectAcs = acs.filter(ac =>
        ac.description.toLowerCase().includes(project) ||
        ac.tags?.includes(project)
      );

      // 8. Extract AC IDs
      const acIds = projectAcs.map(ac => ac.id);

      // 9. Filter tasks by AC-ID
      const projectTasks = allTasks.filter(task =>
        acIds.includes(task.acId)
      );

      // 10. Read User Story file
      const userStoryPath = `.specweave/docs/internal/specs/${project}/${increment.feature}/${userStoryId}.md`;
      const userStory = await readFile(userStoryPath);

      // 11. Update User Story with COPIED ACs and Tasks
      const updated = updateUserStoryWithAcsAndTasks(
        userStory,
        projectAcs,
        projectTasks
      );

      // 12. Write updated User Story
      await writeFile(userStoryPath, updated);
    }
  }
}

function updateUserStoryWithAcsAndTasks(
  userStory: string,
  acs: AcceptanceCriterion[],
  tasks: Task[]
): string {
  // Find ## Acceptance Criteria section
  let updated = userStory;

  // Replace or insert ACs
  const acsMarkdown = acs.map(ac =>
    `- [${ac.completed ? 'x' : ' '}] **${ac.id}**: ${ac.description} (${ac.priority})`
  ).join('\n');

  updated = replaceSection(updated, '## Acceptance Criteria', acsMarkdown);

  // Replace or insert Tasks (in ## Implementation section)
  const tasksMarkdown = tasks.map(task =>
    `- [${task.completed ? 'x' : ' '}] **${task.id}**: ${task.description}`
  ).join('\n');

  updated = replaceSection(updated, '## Implementation',
    tasksMarkdown + '\n\n> **Note**: Task status syncs with increment tasks.md'
  );

  return updated;
}

function detectProjects(acs: AcceptanceCriterion[]): string[] {
  const projects = new Set<string>();

  for (const ac of acs) {
    const desc = ac.description.toLowerCase();

    if (desc.includes('backend') || desc.includes('api') || desc.includes('server')) {
      projects.add('backend');
    }
    if (desc.includes('frontend') || desc.includes('ui') || desc.includes('component')) {
      projects.add('frontend');
    }
    if (desc.includes('mobile') || desc.includes('ios') || desc.includes('android')) {
      projects.add('mobile');
    }
  }

  return Array.from(projects);
}
```

---

### 2. Three-Layer Bidirectional Sync

**Component**: `plugins/specweave-github/lib/ThreeLayerSyncManager.ts` (NEW)

**Architecture**:
```
Layer 1: GitHub Issue (stakeholder UI)
    ↕ (sync via GitHub API)
Layer 2: Living Docs User Story (intermediate representation)
    ↕ (sync via file system)
Layer 3: Increment spec.md + tasks.md (source of truth)
```

**Sync Flows**:

**Flow 1: GitHub → Living Docs → Increment** (Stakeholder checks checkbox)
```typescript
async syncGitHubToIncrement(issue: GitHubIssue): Promise<void> {
  // 1. Detect checkbox changes in GitHub issue
  const changes = detectCheckboxChanges(issue);

  // 2. Update Living Docs User Story first
  for (const change of changes) {
    if (change.type === 'ac') {
      await updateUserStoryAc(change.userStoryPath, change.acId, change.completed);
    } else if (change.type === 'task') {
      await updateUserStoryTask(change.userStoryPath, change.taskId, change.completed);
    }
  }

  // 3. Update Increment (source of truth) last
  for (const change of changes) {
    if (change.type === 'ac') {
      await updateIncrementAc(change.incrementPath, change.acId, change.completed);
    } else if (change.type === 'task') {
      await updateIncrementTask(change.incrementPath, change.taskId, change.completed);
    }
  }

  // 4. Validate code exists (if task marked complete)
  for (const change of changes) {
    if (change.type === 'task' && change.completed) {
      const codeExists = await validateCodeExists(change.taskId);
      if (!codeExists) {
        // Reopen task (propagate back)
        await reopenTask(change.taskId);
      }
    }
  }
}
```

**Flow 2: Increment → Living Docs → GitHub** (Developer completes work)
```typescript
async syncIncrementToGitHub(increment: Increment): Promise<void> {
  // 1. Detect changes in increment (spec.md + tasks.md)
  const changes = detectIncrementChanges(increment);

  // 2. Update Living Docs User Stories first
  for (const change of changes) {
    if (change.type === 'ac') {
      await updateUserStoryAc(change.userStoryPath, change.acId, change.completed);
    } else if (change.type === 'task') {
      await updateUserStoryTask(change.userStoryPath, change.taskId, change.completed);
    }
  }

  // 3. Update GitHub issues last
  for (const userStory of changes.affectedUserStories) {
    const issue = await findGitHubIssue(userStory.id);
    if (issue) {
      await updateGitHubIssue(issue, userStory);
    }
  }
}
```

**Code Validation**:
```typescript
async validateCodeExists(taskId: string): Promise<boolean> {
  // Parse task description to extract file paths
  const filePaths = extractFilePaths(taskId);

  // Check if files exist
  for (const filePath of filePaths) {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return false;
    }

    // Optional: Check if file has meaningful content (not just empty)
    const content = await fs.readFile(filePath, 'utf-8');
    if (content.trim().length < 10) {
      return false;
    }
  }

  return true;
}

async reopenTask(taskId: string): Promise<void> {
  // 1. Reopen in increment tasks.md
  await updateIncrementTask(incrementPath, taskId, false);

  // 2. Propagate to Living Docs
  await updateUserStoryTask(userStoryPath, taskId, false);

  // 3. Propagate to GitHub
  await updateGitHubIssueTask(issue, taskId, false);

  // 4. Add comment explaining why
  await addGitHubComment(issue,
    `⚠️ Task ${taskId} reopened: Code validation failed (missing or empty file)`
  );
}
```

---

### 3. GitHub Sync Integration

**Component**: `plugins/specweave-github/lib/UserStoryIssueBuilder.ts` (enhanced)

**Issue Format**:
```markdown
# US-001: Implement Authentication (Backend)

**Feature**: [FS-031: External Tool Status Sync](../../specs/_features/FS-031/FEATURE.md)

## Acceptance Criteria

- [x] **AC-US1-01**: JWT token generation (backend) (P1)
- [ ] **AC-US1-02**: Login API endpoint (backend) (P1)

## Subtasks

- [x] **T-001**: Setup JWT service
- [x] **T-002**: Create token generator function
- [ ] **T-003**: Add token validation middleware
- [ ] **T-004**: Create login endpoint

## Progress

**Acceptance Criteria**: 1/2 (50%)
**Subtasks**: 2/4 (50%)

> **Bidirectional Sync**:
> - Checking AC/Subtask checkbox → Updates Living Docs → Updates Increment
> - Completing task in increment → Updates Living Docs → Updates GitHub
```

**Implementation**:
```typescript
async buildUserStoryIssue(userStory: UserStory): Promise<GitHubIssueBody> {
  // 1. Read User Story file
  const content = await readUserStory(userStory.path);

  // 2. Extract ACs from ## Acceptance Criteria section
  const acs = extractAcsFromSection(content, '## Acceptance Criteria');

  // 3. Extract Tasks from ## Implementation section
  const tasks = extractTasksFromSection(content, '## Implementation');

  // 4. Build issue body
  const body = `
# ${userStory.title}

**Feature**: [${userStory.feature}](../../specs/_features/${userStory.feature}/FEATURE.md)

## Acceptance Criteria

${acs.map(ac => `- [${ac.completed ? 'x' : ' '}] **${ac.id}**: ${ac.description} (${ac.priority})`).join('\n')}

## Subtasks

${tasks.map(task => `- [${task.completed ? 'x' : ' '}] **${task.id}**: ${task.description}`).join('\n')}

## Progress

**Acceptance Criteria**: ${acs.filter(ac => ac.completed).length}/${acs.length} (${Math.round(acs.filter(ac => ac.completed).length / acs.length * 100)}%)
**Subtasks**: ${tasks.filter(t => t.completed).length}/${tasks.length} (${Math.round(tasks.filter(t => t.completed).length / tasks.length * 100)}%)

> **Bidirectional Sync**:
> - Checking AC/Subtask checkbox → Updates Living Docs → Updates Increment
> - Completing task in increment → Updates Living Docs → Updates GitHub
  `.trim();

  return {
    title: userStory.title,
    body,
    labels: ['user-story', userStory.project, userStory.priority]
  };
}
```

---

## Testing Strategy

### Test Coverage Targets

- **Phase 0 (Strategic Init)**: 90%+ coverage
- **Phase 1-4 (Copy-Based Sync)**: 95%+ coverage
- **Overall**: 95%+ coverage

### Test Breakdown

**Unit Tests** (60 tests):
1. VisionAnalyzer (10 tests)
2. ComplianceDetector (15 tests - cover all 30+ standards)
3. TeamRecommender (10 tests)
4. RepositorySelector (10 tests)
5. ArchitectureDecisionEngine (15 tests)

**Integration Tests** (30 tests):
1. Full init flow (10 tests)
2. Three-layer sync (10 tests)
3. GitHub integration (10 tests)

**E2E Tests** (15 tests):
1. Strategic init scenarios (5 tests)
2. Multi-project workflows (5 tests)
3. Bidirectional sync (5 tests)

### Test Files

```
tests/
├── unit/
│   ├── init/
│   │   ├── vision-analyzer.test.ts
│   │   ├── compliance-detector.test.ts
│   │   ├── team-recommender.test.ts
│   │   ├── repository-selector.test.ts
│   │   └── architecture-decision-engine.test.ts
│   └── living-docs/
│       ├── spec-distributor-copy.test.ts
│       └── three-layer-sync.test.ts
├── integration/
│   ├── strategic-init-flow.test.ts
│   ├── copy-based-sync.test.ts
│   └── github-three-layer-sync.test.ts
└── e2e/
    ├── strategic-init-scenarios.test.ts
    ├── multi-project-workflow.test.ts
    └── bidirectional-sync.test.ts
```

---

## Migration Strategy

### Backward Compatibility

**Problem**: Existing increments have User Stories without ## Implementation sections.

**Solution**: Auto-generate Implementation sections during next sync.

**Migration Script**: `scripts/migrate-to-copy-based-sync.ts`

```typescript
async function migrateIncrementToCopyBasedSync(incrementId: string): Promise<void> {
  // 1. Read increment
  const increment = await loadIncrement(incrementId);

  // 2. Find all User Stories
  const userStories = await findUserStories(increment.feature);

  // 3. For each User Story, add Implementation section
  for (const userStory of userStories) {
    const content = await readFile(userStory.path);

    // Check if already has Implementation section
    if (content.includes('## Implementation')) {
      console.log(`  ✓ ${userStory.id} already migrated`);
      continue;
    }

    // Generate Implementation section from increment tasks.md
    const tasks = await filterTasksByUserStory(increment, userStory.id);
    const implementationSection = `
## Implementation

${tasks.map(t => `- [${t.completed ? 'x' : ' '}] **${t.id}**: ${t.description}`).join('\n')}

> **Note**: Task status syncs with increment tasks.md
    `.trim();

    // Insert before ## Related sections
    const updated = content.replace(
      /## Related/,
      implementationSection + '\n\n## Related'
    );

    await writeFile(userStory.path, updated);
    console.log(`  ✓ Migrated ${userStory.id}`);
  }
}
```

---

## Configuration Schema

**File**: `.specweave/config.json`

```json
{
  "research": {
    "vision": {
      "keywords": ["design", "collaboration", "remote teams"],
      "market": "productivity-saas",
      "competitors": [
        { "name": "Figma", "url": "https://figma.com", "strengths": ["Real-time", "Plugins"] }
      ],
      "opportunityScore": 8,
      "viralPotential": true
    },
    "compliance": [
      {
        "id": "GDPR",
        "name": "General Data Protection Regulation",
        "dataTypes": ["personal"],
        "regions": ["EU"],
        "teamImpact": ["privacy-engineering", "dpo"]
      }
    ],
    "teams": [
      {
        "teamName": "backend-team",
        "role": "Backend Development",
        "required": true,
        "size": "2-5 engineers",
        "skills": ["Node.js", "PostgreSQL", "AWS"]
      },
      {
        "teamName": "auth-team",
        "role": "Authentication",
        "required": false,
        "serverlessAlternative": {
          "service": "AWS Cognito",
          "costSavings": 185
        }
      }
    ],
    "scaling": {
      "expectedUsers": 100000,
      "growthRate": "viral",
      "expectedServices": 5
    },
    "budget": "bootstrapped",
    "methodology": "agile"
  },
  "architecture": {
    "type": "serverless",
    "infrastructure": ["AWS Lambda", "Supabase", "Vercel"],
    "rationale": "Viral potential needs instant scaling, bootstrapped needs $0 fixed costs",
    "costEstimate": {
      "at1K": "$10/month",
      "at10K": "$250/month",
      "at100K": "$850/month"
    }
  },
  "repositories": {
    "selectionRules": {
      "type": "prefix",
      "pattern": "ec-",
      "owner": "my-company",
      "excludePatterns": ["deprecated", "archived"]
    },
    "repositories": [
      { "name": "ec-frontend", "url": "https://github.com/my-company/ec-frontend" },
      { "name": "ec-backend", "url": "https://github.com/my-company/ec-backend" }
    ]
  },
  "projects": ["frontend", "backend-functions", "api-gateway"],
  "livingDocs": {
    "copyBasedSync": {
      "enabled": true,
      "threeLayerSync": true
    }
  }
}
```

---

## Performance Targets

1. **Init Flow**: < 60 seconds (with LLM calls)
2. **Repository Selection**: < 5 seconds for 100 repos
3. **Living Docs Sync**: < 5 seconds for 100 tasks
4. **GitHub Sync**: < 3 seconds per issue
5. **Code Validation**: < 2 seconds per task

---

## Rollout Plan

### Phase 0: Strategic Init (8-12 weeks)

**Week 1-2**: Vision Analyzer + Market Detector
**Week 3-4**: Compliance Detector
**Week 5-6**: Team Recommender + Repository Selector
**Week 7-8**: Architecture Decision Engine
**Week 9-10**: Init Flow Integration
**Week 11-12**: Testing + Bug Fixes

### Phase 1-4: Copy-Based Sync (2-3 weeks)

**Week 1**: SpecDistributor Enhancement + Three-Layer Sync
**Week 2**: GitHub Integration + Code Validation
**Week 3**: Testing + Migration Script

---

## Success Metrics

### Functional Metrics
- **Init Completion Rate**: 95%+ users complete strategic init
- **Architecture Satisfaction**: 90%+ users satisfied with recommendations
- **Sync Accuracy**: 100% consistency across three layers

### Quality Metrics
- **Test Coverage**: 95%+ overall
- **Performance**: All operations < 5 seconds
- **Error Rate**: < 1% sync failures

### User Experience Metrics
- **Time to Init**: 80% faster (5 min → 1 min for learning projects)
- **Clarity Score**: 90%+ users understand recommendations
- **Migration Success**: 100% existing increments migrated without data loss

---

## Risk Mitigation

### Technical Risks

**Risk 1: LLM Hallucinations**
- **Mitigation**: Validate all LLM outputs with schema validation (Zod)
- **Fallback**: Use rule-based detection if LLM fails

**Risk 2: GitHub API Rate Limits**
- **Mitigation**: Implement exponential backoff + caching
- **Fallback**: Use local git remotes parsing

**Risk 3: Three-Layer Sync Conflicts**
- **Mitigation**: Increment is always source of truth, resolve conflicts in favor of increment
- **Fallback**: Manual conflict resolution UI

### User Experience Risks

**Risk 1: Users confused by strategic questions**
- **Mitigation**: Progressive disclosure (2-3 questions max), plain language
- **Fallback**: "Skip to basic init" option

**Risk 2: Architecture recommendations too prescriptive**
- **Mitigation**: Always allow user override, show rationale clearly
- **Fallback**: "Custom architecture" option

---

## Dependencies

### External Dependencies
- GitHub API (for repository selection)
- LLM API (for vision analysis)

### Internal Dependencies
- Existing SpecWeave core (living docs, increments)
- GitHub plugin (for sync)
- Config system

---

## Documentation Updates

### User Documentation
1. Strategic Init Guide (new)
2. Multi-Project Setup Guide (enhanced)
3. Compliance Standards Reference (new)
4. Repository Selection Guide (new)

### Developer Documentation
1. Architecture Decision Engine API
2. Three-Layer Sync Protocol
3. Migration Guide (copy-based sync)

---

**Plan Status**: Complete
**Ready for Execution**: Yes
**Next Step**: Generate tasks.md with prioritized executable tasks
