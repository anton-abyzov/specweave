---
id: US-003
feature: FS-038
title: Free Tier and Startup Credit Guidance
status: planning
priority: P1
created: 2025-11-16
project: specweave
---

# US-003: Free Tier and Startup Credit Guidance

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** cost-conscious developer (pet project or startup)
**I want** detailed guidance on free tiers and startup credit programs
**So that** I can maximize runway and minimize infrastructure costs

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Agent recommends free-tier-optimized configurations (stay within limits) (P1, testable)
- [ ] **AC-US3-02**: Agent provides startup credit program details (AWS Activate, Azure for Startups, GCP Credits) (P1, testable)
- [ ] **AC-US3-03**: Agent estimates monthly costs based on expected traffic (requests/month, data transfer) (P1, testable)
- [ ] **AC-US3-04**: Agent warns when approaching free tier limits (90% utilization threshold) (P2, testable)
- [ ] **AC-US3-05**: Agent compares free tier vs paid tier breakeven point (at what traffic is paid better?) (P2, testable)
- [ ] **AC-US3-06**: Generated IaC includes free tier configuration (smallest instance sizes, minimal resources) (P1, testable)
- [ ] **AC-US3-07**: Agent provides cost optimization tips (caching, batching, reserved capacity) (P2, testable)

---

## Implementation

**Files to Enhance**:
- `plugins/specweave/skills/serverless-recommender/SKILL.md` (add free tier logic)
- `plugins/specweave/data/serverless-platforms.json` (already includes free tier data)

**Free Tier Guidance Examples**:

**AWS Lambda Free Tier**:
```
✅ AWS Lambda Free Tier (Always Free):
   • 1 million requests/month
   • 400,000 GB-seconds compute time/month
   • Example: 1M requests x 128MB x 200ms = 25,600 GB-seconds (well within limit)

💡 How to Stay Within Free Tier:
   1. Use 128MB memory (smallest size)
   2. Optimize cold starts (< 200ms)
   3. Use Lambda Layers for shared dependencies (reduce package size)
   4. Enable CloudWatch Logs filtering (avoid excessive logging costs)

⚠️  Free Tier Gotchas:
   • Data transfer OUT costs $0.09/GB (not included in free tier)
   • API Gateway has separate free tier (1M requests/month for 12 months)
   • DynamoDB has separate free tier (25GB storage, 200M requests/month)

📊 Cost Estimate (Pet Project - 1000 requests/day):
   • Lambda requests: 30K/month (3% of free tier) ✅ $0
   • Compute time: ~1500 GB-seconds (0.4% of free tier) ✅ $0
   • Data transfer: ~500MB (assuming 500KB avg response) ✅ ~$0.04
   • **Total: ~$0.04/month** (essentially free)
```

**Startup Credit Programs**:
```
💳 Startup Credit Programs:

1. AWS Activate (AWS)
   • Credits: $1,000 - $100,000
   • Eligibility: Accelerators (YC, Techstars, 500 Startups), VCs
   • Duration: 1-2 years
   • Apply: https://aws.amazon.com/activate/

2. Microsoft for Startups (Azure)
   • Credits: $150,000
   • Eligibility: Pre-seed to Series A startups
   • Duration: 2 years
   • Apply: https://www.microsoft.com/en-us/startups

3. Google for Startups Cloud Program (GCP)
   • Credits: $200,000
   • Eligibility: VC-backed startups, Google partners
   • Duration: 2 years
   • Apply: https://cloud.google.com/startups

4. Firebase (No formal program, but generous free tier)
   • 125K function invocations/month
   • 1GB storage, 10GB transfer
   • Sufficient for most MVPs

5. Supabase (Pro plan credits for open-source projects)
   • Pro plan ($25/month) free for open-source
   • Eligibility: Public GitHub repo with > 100 stars
```

---

## Business Rationale

Pet projects and startups operate on tight budgets. Helping them stay within free tiers or leverage startup credits builds loyalty and reduces churn due to cost concerns.

---

## Test Strategy

**Unit Tests**:
- Free tier limit calculations
- Cost estimation formulas
- Startup program eligibility checks

**Integration Tests**:
- Load free tier data from serverless-platforms.json
- Generate free-tier-optimized IaC configurations

**E2E Tests**:
- User asks "How much will this cost on AWS?"
- Agent provides detailed cost breakdown with free tier analysis

**Coverage Target**: 90%+

---

## Related User Stories

- [US-001: Context-Aware Serverless Recommendations](us-001-context-aware-serverless-recommendations.md)
- [US-002: Platform Comparison Matrix](us-002-platform-comparison-matrix.md)
- [US-006: Cost Estimation and Optimization](us-006-cost-estimation-optimization.md)

---

**Status**: Planning
**Priority**: P1 (critical for pet projects and startups)
**Estimated Effort**: 4-5 hours
