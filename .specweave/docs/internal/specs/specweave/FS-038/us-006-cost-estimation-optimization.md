---
id: US-006
feature: FS-038
title: Cost Estimation and Optimization
status: planning
priority: P2
created: 2025-11-16
project: specweave
---

# US-006: Cost Estimation and Optimization

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** developer planning a serverless deployment
**I want** accurate cost estimates based on expected traffic
**So that** I can budget appropriately and optimize costs

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Cost calculator accepts input (requests/month, avg execution time, memory size, data transfer) (P2, testable)
- [ ] **AC-US6-02**: Calculator compares free tier vs paid tier costs (P2, testable)
- [ ] **AC-US6-03**: Calculator provides cost breakdown (compute, requests, data transfer, storage) (P2, testable)
- [ ] **AC-US6-04**: Agent suggests cost optimizations (right-sizing memory, caching, batching) (P2, testable)
- [ ] **AC-US6-05**: Agent recommends reserved capacity if cost-effective (P3, testable)
- [ ] **AC-US6-06**: Calculator compares costs across platforms (AWS vs Azure vs GCP) (P3, testable)
- [ ] **AC-US6-07**: Cost estimates accurate within ±15% of actual costs (P2, testable via production validation)

---

## Implementation

**Files to Create**:
- `plugins/specweave/skills/serverless-recommender/cost-calculator.ts` (~300 lines)

**Cost Calculation Formula** (AWS Lambda example):

```typescript
interface CostInputs {
  requestsPerMonth: number;
  avgExecutionTimeMs: number;
  memorySizeMB: number;
  dataTransferGB: number;
  platform: 'aws' | 'azure' | 'gcp' | 'firebase' | 'supabase';
}

interface CostBreakdown {
  compute: number;
  requests: number;
  dataTransfer: number;
  storage: number;
  total: number;
  freeTier: boolean;
  estimatedMonthly: number;
}

function calculateCost(inputs: CostInputs): CostBreakdown {
  const platform = PLATFORMS[inputs.platform];

  // Compute cost (GB-seconds)
  const gbSeconds = (inputs.requestsPerMonth * inputs.avgExecutionTimeMs / 1000) * (inputs.memorySizeMB / 1024);
  const freeTierGbSeconds = platform.freeTier.computeGbSeconds || 0;
  const billableGbSeconds = Math.max(0, gbSeconds - freeTierGbSeconds);
  const computeCost = billableGbSeconds * platform.pricing.computePrice;

  // Request cost
  const freeTierRequests = platform.freeTier.requests || 0;
  const billableRequests = Math.max(0, inputs.requestsPerMonth - freeTierRequests);
  const requestCost = billableRequests * platform.pricing.requestPrice;

  // Data transfer cost (typically not in free tier)
  const dataTransferCost = inputs.dataTransferGB * platform.pricing.dataTransferPrice;

  // Total
  const total = computeCost + requestCost + dataTransferCost;
  const freeTier = total === 0;

  return {
    compute: computeCost,
    requests: requestCost,
    dataTransfer: dataTransferCost,
    storage: 0, // DynamoDB/Firestore calculated separately
    total,
    freeTier,
    estimatedMonthly: total
  };
}
```

**Example Interaction**:

```
User: "How much will AWS Lambda cost for 10,000 requests/day?"

Agent:
📊 Cost Estimate (AWS Lambda)

Input Assumptions:
   • Requests: 300K/month (10K/day x 30 days)
   • Avg execution time: 200ms (assumed)
   • Memory size: 128MB (smallest)
   • Data transfer: 30GB/month (100KB avg response)

💰 Cost Breakdown:

   Compute (GB-seconds):
      • Total: 7,500 GB-seconds
      • Free tier: 400,000 GB-seconds ✅
      • Billable: 0 GB-seconds
      • Cost: $0

   Requests:
      • Total: 300,000 requests
      • Free tier: 1,000,000 requests ✅
      • Billable: 0 requests
      • Cost: $0

   Data Transfer (OUT):
      • Total: 30GB
      • Free tier: 1GB (first 1GB free) ✅
      • Billable: 29GB
      • Cost: $2.61 ($0.09/GB)

   Total Estimated Cost: $2.61/month

✅ Within Free Tier: Partially (compute + requests free, data transfer charged)

💡 Cost Optimizations:
   1. Enable compression (gzip) to reduce data transfer by 70% → Save $1.83/month
   2. Use CloudFront CDN to cache responses → Reduce Lambda invocations by 50%
   3. Consider API Gateway HTTP API caching ($0.02/GB cached)

📊 Comparison with Traditional Server:
   • AWS EC2 t3.micro: $7.30/month (always-on)
   • AWS Lambda: $2.61/month (pay-per-use)
   • **Savings: $4.69/month (64% cheaper)**

⚠️  Note: Costs assume consistent traffic. Spikes may increase data transfer costs.
```

---

## Business Rationale

Developers often over-provision resources due to cost uncertainty. Accurate cost estimates build confidence in serverless adoption and prevent bill shock.

---

## Test Strategy

**Unit Tests**:
- Cost calculation formulas (AWS, Azure, GCP, Firebase, Supabase)
- Free tier boundary conditions (exactly at limit, over limit)
- Optimization recommendations logic

**Integration Tests**:
- Cost calculator integration with serverless-recommender skill

**E2E Tests**:
- User provides traffic estimates → Agent calculates costs accurately
- Validate estimates against real AWS bills (production validation)

**Coverage Target**: 90%+

---

## Related User Stories

- [US-003: Free Tier and Startup Credit Guidance](us-003-free-tier-startup-credit-guidance.md)

---

**Status**: Planning
**Priority**: P2 (enhances decision-making)
**Estimated Effort**: 2-3 hours
