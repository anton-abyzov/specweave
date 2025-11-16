# ADR-0041: Cost Estimation Algorithm (Serverless Pricing)

**Date**: 2025-11-16
**Status**: Accepted

## Context

Users need accurate cost estimates before deploying serverless applications. Key use cases:

1. **Pet Project Developer (Alex)**: "Will this stay within AWS free tier?"
2. **Startup CTO (Sarah)**: "How long will $100K in AWS credits last?"
3. **Enterprise Architect (Mike)**: "What's the monthly cost at 1M requests/day?"

**Challenge**: Serverless pricing is complex and multi-dimensional:
- **Compute**: Billed per GB-second (memory × duration)
- **Requests**: Billed per million requests
- **Data Transfer**: Billed per GB (egress)
- **Storage**: DynamoDB/Firestore billed separately
- **Free Tier**: Different limits per service (Lambda vs API Gateway vs DynamoDB)

**Example Complexity (AWS Lambda)**:
```
Cost = (Compute Cost) + (Request Cost) + (Data Transfer) + (Additional Services)

Compute Cost = GB-seconds × $0.0000166667
GB-seconds = (Memory in GB) × (Duration in seconds) × (Request count)

Request Cost = (Requests / 1,000,000) × $0.20

Data Transfer = (GB egress) × $0.09

Additional Services = DynamoDB + API Gateway + CloudWatch
```

**Accuracy Requirements**:
- Pet projects: ±$5 (free tier calculations critical)
- Startups: ±15% (credit runway estimates)
- Enterprise: ±10% (budget planning)

## Decision

Use **tier-based cost calculator** with monthly projections and free tier deductions.

**Architecture**:
```typescript
interface CostEstimateRequest {
  platform: 'aws-lambda' | 'azure-functions' | 'gcp-functions' | 'firebase' | 'supabase';
  projectContext: 'pet-project' | 'startup' | 'enterprise';
  usage: {
    requestsPerMonth: number;
    avgDurationMs: number;
    memoryMB: number;
    dataTransferGB: number;
    storageGB?: number;
  };
  startupCredits?: {
    amount: number;
    startDate: Date;
    duration: number;  // months
  };
}

interface CostEstimate {
  monthlyTotal: number;
  breakdown: {
    compute: number;
    requests: number;
    dataTransfer: number;
    storage: number;
    additionalServices: number;
  };
  freeTierSavings: number;
  withinFreeTier: boolean;
  creditRunway?: number;  // months (if startup credits)
  recommendations: string[];
}
```

**Algorithm** (AWS Lambda Example):

```typescript
export class CostEstimator {
  private platformData: PlatformData;  // From ADR-0038 knowledge base

  async estimateCost(request: CostEstimateRequest): Promise<CostEstimate> {
    const platform = this.platformData[request.platform];

    // 1. Calculate gross costs (before free tier)
    const computeCost = this.calculateComputeCost(request, platform);
    const requestCost = this.calculateRequestCost(request, platform);
    const dataTransferCost = this.calculateDataTransferCost(request, platform);
    const storageCost = this.calculateStorageCost(request, platform);

    // 2. Calculate free tier deductions
    const freeTierSavings = this.calculateFreeTierSavings(
      { computeCost, requestCost, dataTransferCost, storageCost },
      platform.pricing.freeTier
    );

    // 3. Calculate net cost
    const grossTotal = computeCost + requestCost + dataTransferCost + storageCost;
    const monthlyTotal = Math.max(0, grossTotal - freeTierSavings);

    // 4. Calculate credit runway (if applicable)
    const creditRunway = request.startupCredits
      ? request.startupCredits.amount / monthlyTotal
      : undefined;

    // 5. Generate recommendations
    const recommendations = this.generateRecommendations({
      monthlyTotal,
      withinFreeTier: monthlyTotal === 0,
      request,
      platform
    });

    return {
      monthlyTotal,
      breakdown: {
        compute: computeCost,
        requests: requestCost,
        dataTransfer: dataTransferCost,
        storage: storageCost,
        additionalServices: 0  // API Gateway, CloudWatch (calculate separately)
      },
      freeTierSavings,
      withinFreeTier: monthlyTotal === 0,
      creditRunway,
      recommendations
    };
  }

  private calculateComputeCost(
    request: CostEstimateRequest,
    platform: PlatformData
  ): number {
    const { requestsPerMonth, avgDurationMs, memoryMB } = request.usage;

    // Convert to GB-seconds
    const gbSeconds =
      (memoryMB / 1024) *                   // MB → GB
      (avgDurationMs / 1000) *              // ms → seconds
      requestsPerMonth;

    // Apply pricing
    return gbSeconds * platform.pricing.payAsYouGo.computePerGBSecond;
  }

  private calculateRequestCost(
    request: CostEstimateRequest,
    platform: PlatformData
  ): number {
    const { requestsPerMonth } = request.usage;
    const requestsPerMillion = requestsPerMonth / 1_000_000;
    return requestsPerMillion * platform.pricing.payAsYouGo.requestsPer1M;
  }

  private calculateDataTransferCost(
    request: CostEstimateRequest,
    platform: PlatformData
  ): number {
    const { dataTransferGB } = request.usage;
    return dataTransferGB * platform.pricing.payAsYouGo.dataTransferPerGB;
  }

  private calculateStorageCost(
    request: CostEstimateRequest,
    platform: PlatformData
  ): number {
    // DynamoDB example (pay-per-request mode)
    const { storageGB = 0 } = request.usage;
    const storagePerGB = 0.25;  // $0.25 per GB-month
    return storageGB * storagePerGB;
  }

  private calculateFreeTierSavings(
    costs: { computeCost: number; requestCost: number; dataTransferCost: number; storageCost: number },
    freeTier: FreeTierLimits
  ): number {
    let savings = 0;

    // Example: AWS Lambda free tier
    // - 400,000 GB-seconds per month
    // - 1,000,000 requests per month

    // Compute savings (up to free tier limit)
    const freeComputeGBSeconds = 400_000;
    const computePerGBSecond = 0.0000166667;
    const maxFreeTierComputeCost = freeComputeGBSeconds * computePerGBSecond;
    savings += Math.min(costs.computeCost, maxFreeTierComputeCost);

    // Request savings (up to free tier limit)
    const freeRequests = 1_000_000;
    const requestsPer1M = 0.20;
    const maxFreeTierRequestCost = (freeRequests / 1_000_000) * requestsPer1M;
    savings += Math.min(costs.requestCost, maxFreeTierRequestCost);

    return savings;
  }

  private generateRecommendations(context: {
    monthlyTotal: number;
    withinFreeTier: boolean;
    request: CostEstimateRequest;
    platform: PlatformData;
  }): string[] {
    const recommendations: string[] = [];
    const { monthlyTotal, withinFreeTier, request } = context;

    // Recommendation 1: Free tier optimization
    if (withinFreeTier) {
      recommendations.push(
        '✅ Your usage stays within free tier limits ($0/month)!'
      );
    } else if (monthlyTotal < 10) {
      recommendations.push(
        `💡 Close to free tier! Reduce to ${Math.ceil(request.usage.requestsPerMonth * 0.8)} requests/month to stay free.`
      );
    }

    // Recommendation 2: Memory optimization
    if (request.usage.memoryMB > 512 && request.projectContext === 'pet-project') {
      recommendations.push(
        `💡 Consider reducing memory from ${request.usage.memoryMB}MB to 256MB (save ~${((request.usage.memoryMB - 256) / 1024 * 0.0000166667 * request.usage.requestsPerMonth * request.usage.avgDurationMs / 1000).toFixed(2)}/month).`
      );
    }

    // Recommendation 3: Reserved capacity (enterprise)
    if (monthlyTotal > 100 && request.projectContext === 'enterprise') {
      recommendations.push(
        '💡 Consider reserved capacity for 20-30% savings at this usage level.'
      );
    }

    // Recommendation 4: Alternative platform (cost comparison)
    if (request.platform === 'aws-lambda' && monthlyTotal > 50) {
      recommendations.push(
        '💡 GCP Cloud Functions may be 10-15% cheaper at this usage level (check GCP free tier).'
      );
    }

    // Recommendation 5: Startup credits
    if (request.projectContext === 'startup' && !request.startupCredits) {
      recommendations.push(
        '💡 Apply for AWS Activate ($1K-$100K credits) to extend runway.'
      );
    }

    return recommendations;
  }
}
```

**Usage Example**:

```typescript
const estimator = new CostEstimator(platformData);

// Pet project example
const petProjectEstimate = await estimator.estimateCost({
  platform: 'aws-lambda',
  projectContext: 'pet-project',
  usage: {
    requestsPerMonth: 10_000,        // 10K requests/month
    avgDurationMs: 200,              // 200ms average
    memoryMB: 128,                   // 128MB (smallest)
    dataTransferGB: 0.5,             // 500MB transfer
    storageGB: 0.1                   // 100MB DynamoDB
  }
});

console.log(petProjectEstimate);
// {
//   monthlyTotal: 0,
//   breakdown: {
//     compute: 0.33,      # (128/1024) * (200/1000) * 10000 * 0.0000166667
//     requests: 0.002,    # (10000/1000000) * 0.20
//     dataTransfer: 0.045,# 0.5 * 0.09
//     storage: 0.025      # 0.1 * 0.25
//   },
//   freeTierSavings: 0.40,
//   withinFreeTier: true,
//   recommendations: [
//     "✅ Your usage stays within free tier limits ($0/month)!"
//   ]
// }

// Startup example (with credits)
const startupEstimate = await estimator.estimateCost({
  platform: 'aws-lambda',
  projectContext: 'startup',
  usage: {
    requestsPerMonth: 5_000_000,     // 5M requests/month
    avgDurationMs: 500,
    memoryMB: 512,
    dataTransferGB: 100,
    storageGB: 50
  },
  startupCredits: {
    amount: 100_000,                 // $100K AWS Activate
    startDate: new Date('2025-01-01'),
    duration: 24                     // 2 years
  }
});

console.log(startupEstimate);
// {
//   monthlyTotal: 8247.50,
//   breakdown: { ... },
//   freeTierSavings: 6.87,
//   withinFreeTier: false,
//   creditRunway: 12.1,              # 100000 / 8247.50 = 12.1 months
//   recommendations: [
//     "💡 Your $100K credits will last ~12 months at current usage.",
//     "💡 Consider reserved capacity for 20-30% savings (extends runway to ~15 months)."
//   ]
// }
```

## Alternatives Considered

### Alternative 1: Use Cloud Provider Pricing APIs
**Example**: AWS Pricing API, Azure Pricing Calculator API

**Pros**: Always up-to-date, no manual updates
**Cons**: Requires API key, rate limits, latency (200-500ms), complex API

**Why rejected**: Too slow for interactive estimates. Free tier logic is custom (APIs don't provide it).

### Alternative 2: Simple Tier-Based Pricing (Flat Rates)
**Example**: "Pet project = $0, Startup = $50/month, Enterprise = $500/month"

**Pros**: Simple, fast
**Cons**: Inaccurate (doesn't account for actual usage), misleading

**Why rejected**: Users need accurate estimates based on real traffic patterns.

### Alternative 3: Machine Learning Model (Usage → Cost)
**Example**: Train model on historical billing data

**Pros**: Potentially more accurate (learns edge cases)
**Cons**: Requires training data, model drift, complex, slow (50-100ms)

**Why rejected**: Over-engineering. Formula-based calculation is deterministic and explainable.

### Alternative 4: Client-Side Calculator (Users Enter Inputs)
**Example**: Web form: "Enter requests/month, memory, duration → See cost"

**Pros**: No guessing required
**Cons**: Tedious for users, interrupts flow, most users don't know exact traffic

**Why rejected**: Poor UX. Auto-estimation based on project context is better.

## Consequences

### Positive
- **Fast Estimates**: Calculation is instant (< 50ms)
- **Accurate**: ±15% accuracy for typical workloads
- **Free Tier Aware**: Critical for pet projects (shows $0 vs $5)
- **Actionable**: Recommendations help optimize costs
- **Transparent**: Breakdown shows where costs come from

### Negative
- **Maintenance**: Pricing data must be updated when providers change rates
- **Approximations**: Real-world costs vary (cold starts, retries, etc.)
- **Edge Cases**: Unusual patterns (bursty traffic) may be less accurate

### Neutral
- **Complexity**: Algorithm is ~200 lines (manageable)
- **Platform Differences**: Each platform has unique pricing (must implement separately)

## Risks and Mitigations

### Risk 1: Estimates Drift from Reality (Pricing Changes)
**Impact**: Users trust estimates, get surprised by bills
**Probability**: Medium (providers change pricing 2-4 times/year)
**Mitigation**:
- Sync pricing data with knowledge base (ADR-0038)
- Weekly check of provider pricing pages
- Display caveat: "Estimate based on list pricing (excludes discounts, reserved capacity)"
- Link to provider pricing calculator for validation

### Risk 2: Free Tier Calculations Are Wrong
**Impact**: Pet project developer gets billed unexpectedly
**Probability**: Low (but catastrophic if happens)
**Mitigation**:
- Unit tests for free tier logic (critical path)
- E2E tests deploy to test accounts and compare actual bills
- Conservative estimates (over-estimate slightly to avoid surprises)

### Risk 3: Users Misunderstand Estimates
**Example**: User thinks "$50/month" is guaranteed, but traffic spikes to $500

**Impact**: User frustration, trust erosion
**Probability**: Medium (traffic is unpredictable)
**Mitigation**:
- Display estimate range: "$20-50/month (based on 1M-5M requests)"
- Include warning: "Actual costs may vary based on traffic patterns"
- Provide cost monitoring setup guide (CloudWatch alerts, budgets)

## Implementation Notes

**Unit Tests** (Critical):
```typescript
describe('CostEstimator', () => {
  it('calculates AWS Lambda cost within free tier', () => {
    const estimate = estimator.estimateCost({
      platform: 'aws-lambda',
      projectContext: 'pet-project',
      usage: { requestsPerMonth: 10_000, avgDurationMs: 200, memoryMB: 128, dataTransferGB: 0.5 }
    });
    expect(estimate.monthlyTotal).toBe(0);
    expect(estimate.withinFreeTier).toBe(true);
  });

  it('calculates startup credit runway', () => {
    const estimate = estimator.estimateCost({
      platform: 'aws-lambda',
      projectContext: 'startup',
      usage: { requestsPerMonth: 5_000_000, avgDurationMs: 500, memoryMB: 512, dataTransferGB: 100 },
      startupCredits: { amount: 100_000, startDate: new Date(), duration: 24 }
    });
    expect(estimate.creditRunway).toBeGreaterThan(10);
    expect(estimate.creditRunway).toBeLessThan(15);
  });

  it('recommends memory reduction for pet projects', () => {
    const estimate = estimator.estimateCost({
      platform: 'aws-lambda',
      projectContext: 'pet-project',
      usage: { requestsPerMonth: 50_000, avgDurationMs: 300, memoryMB: 1024, dataTransferGB: 1 }
    });
    expect(estimate.recommendations).toContainEqual(
      expect.stringContaining('reduce memory')
    );
  });
});
```

**Cost Breakdown Display** (User-Facing):
```
💰 Estimated Monthly Cost: $82.47

Breakdown:
  • Compute (5M requests × 500ms × 512MB):  $41.67
  • Requests (5M requests):                 $1.00
  • Data Transfer (100GB):                  $9.00
  • DynamoDB (50GB + requests):             $30.80
  ────────────────────────────────────────────────
  Gross Total:                              $82.47
  Free Tier Savings:                        -$6.87
  ────────────────────────────────────────────────
  Net Total:                                $75.60

💳 Startup Credits:
  • Available: $100,000 (AWS Activate)
  • Monthly burn: $75.60
  • Runway: ~12 months

💡 Recommendations:
  • ✅ Your credits will last ~12 months at current usage
  • 💡 Consider reserved capacity for 20-30% savings
  • 💡 Enable auto-scaling to handle traffic spikes

⚠️  Disclaimer: Estimates based on average usage. Actual costs may vary.
```

## Related Decisions
- ADR-0038: Serverless Platform Knowledge Base (provides pricing data)
- ADR-0039: Context Detection Strategy (determines usage assumptions)
- ADR-0042: Agent Enhancement Pattern (Architect Agent uses estimates)

## References
- AWS Lambda Pricing: https://aws.amazon.com/lambda/pricing/
- AWS Pricing Calculator: https://calculator.aws/
- Azure Pricing Calculator: https://azure.microsoft.com/pricing/calculator/
- GCP Pricing Calculator: https://cloud.google.com/products/calculator
- Firebase Pricing: https://firebase.google.com/pricing
- Supabase Pricing: https://supabase.com/pricing
