---
id: US-002
feature: FS-038
title: Platform Comparison Matrix
status: planning
priority: P1
created: 2025-11-16
project: specweave
---

# US-002: Platform Comparison Matrix

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** developer comparing serverless platforms
**I want** an up-to-date comparison matrix of AWS, Azure, GCP, Firebase, and Supabase
**So that** I can make data-driven decisions based on pricing, features, and ecosystem

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Comparison data stored in JSON format (easy to update, version control) (P1, testable)
- [ ] **AC-US2-02**: Pricing comparison includes free tier limits, pay-as-you-go rates, reserved capacity (P1, testable)
- [ ] **AC-US2-03**: Feature comparison includes runtime support, cold start times, max execution duration, max memory (P1, testable)
- [ ] **AC-US2-04**: Ecosystem comparison includes integrations, SDKs, community size, marketplace (P2, testable)
- [ ] **AC-US2-05**: Lock-in risk assessment includes portability, migration complexity, vendor-specific APIs (P2, testable)
- [ ] **AC-US2-06**: Data freshness indicator shows last verified date (warn if > 30 days old) (P1, testable)
- [ ] **AC-US2-07**: Comparison queries support filtering (by price, runtime, region) and sorting (P2, testable)

---

## Implementation

**Files to Create**:
- `plugins/specweave/data/serverless-platforms.json` (new file, ~500 lines)
- `plugins/specweave/skills/serverless-recommender/platform-comparison.ts` (helper module, ~200 lines)

**Data Schema**: `serverless-platforms.json`

```json
{
  "platforms": [
    {
      "id": "aws-lambda",
      "name": "AWS Lambda",
      "provider": "AWS",
      "lastVerified": "2025-11-16",
      "pricing": {
        "freeTier": {
          "requests": 1000000,
          "requestsUnit": "per month",
          "computeGbSeconds": 400000,
          "duration": "12 months"
        },
        "payAsYouGo": {
          "requestPrice": 0.0000002,
          "requestPriceUnit": "per request",
          "computePrice": 0.0000166667,
          "computePriceUnit": "per GB-second"
        },
        "reservedCapacity": {
          "available": true,
          "discount": "up to 17%"
        }
      },
      "features": {
        "runtimes": ["Node.js", "Python", "Java", "Go", "Ruby", ".NET", "Custom"],
        "coldStartTime": "100-300ms",
        "maxExecutionDuration": "15 minutes",
        "maxMemory": "10GB",
        "concurrency": "1000 (default), unlimited (reserved)",
        "layers": true,
        "extensions": true
      },
      "ecosystem": {
        "integrations": ["API Gateway", "S3", "DynamoDB", "RDS", "EventBridge", "SQS"],
        "sdks": ["Serverless Framework", "SAM", "CDK", "Terraform"],
        "communitySize": "very large",
        "marketplace": "AWS Marketplace"
      },
      "lockInRisk": {
        "portability": "medium",
        "vendorSpecificAPIs": ["Lambda Extensions", "Lambda Layers", "CloudWatch Logs"],
        "migrationComplexity": "medium (IAM, integrations)"
      },
      "startupPrograms": {
        "name": "AWS Activate",
        "credits": "$1,000 - $100,000",
        "eligibility": "YC, Techstars, 500 Startups, other accelerators"
      }
    },
    {
      "id": "azure-functions",
      "name": "Azure Functions",
      "provider": "Microsoft Azure",
      "lastVerified": "2025-11-16",
      "pricing": {
        "freeTier": {
          "requests": 1000000,
          "requestsUnit": "per month",
          "executionTime": 400000,
          "executionTimeUnit": "GB-seconds per month",
          "duration": "always free"
        },
        "payAsYouGo": {
          "requestPrice": 0.0000002,
          "requestPriceUnit": "per request",
          "executionPrice": 0.000016,
          "executionPriceUnit": "per GB-second"
        }
      },
      "features": {
        "runtimes": ["Node.js", "Python", "Java", "C#", "PowerShell", "TypeScript"],
        "coldStartTime": "200-400ms",
        "maxExecutionDuration": "10 minutes (Consumption), unlimited (Premium/Dedicated)",
        "maxMemory": "14GB (Premium)",
        "concurrency": "200 (default), unlimited (Premium)",
        "extensions": true
      },
      "ecosystem": {
        "integrations": ["Cosmos DB", "Event Grid", "Service Bus", "Blob Storage", "Active Directory"],
        "sdks": ["Azure Functions Core Tools", "Terraform", "ARM Templates"],
        "communitySize": "large",
        "marketplace": "Azure Marketplace"
      },
      "lockInRisk": {
        "portability": "medium",
        "vendorSpecificAPIs": ["Durable Functions", "Azure Bindings"],
        "migrationComplexity": "medium"
      },
      "startupPrograms": {
        "name": "Microsoft for Startups",
        "credits": "$150,000",
        "eligibility": "Startups with funding or accelerator backing"
      }
    },
    {
      "id": "gcp-cloud-functions",
      "name": "Google Cloud Functions",
      "provider": "Google Cloud Platform",
      "lastVerified": "2025-11-16",
      "pricing": {
        "freeTier": {
          "invocations": 2000000,
          "invocationsUnit": "per month",
          "computeTime": 400000,
          "computeTimeUnit": "GB-seconds per month",
          "networkEgress": 5,
          "networkEgressUnit": "GB per month",
          "duration": "always free"
        },
        "payAsYouGo": {
          "invocationPrice": 0.0000004,
          "invocationPriceUnit": "per invocation",
          "computePrice": 0.0000025,
          "computePriceUnit": "per GB-second"
        }
      },
      "features": {
        "runtimes": ["Node.js", "Python", "Go", "Java", "Ruby", ".NET", "PHP"],
        "coldStartTime": "150-400ms",
        "maxExecutionDuration": "9 minutes (1st gen), 60 minutes (2nd gen)",
        "maxMemory": "32GB (2nd gen)",
        "concurrency": "1000 (default)"
      },
      "ecosystem": {
        "integrations": ["Firestore", "Cloud Storage", "Pub/Sub", "BigQuery", "Vertex AI"],
        "sdks": ["gcloud CLI", "Terraform", "Deployment Manager"],
        "communitySize": "medium-large",
        "marketplace": "Google Cloud Marketplace"
      },
      "lockInRisk": {
        "portability": "medium-high (tightly integrated with Firebase)",
        "vendorSpecificAPIs": ["Firebase Admin SDK", "Firestore triggers"],
        "migrationComplexity": "medium-high"
      },
      "startupPrograms": {
        "name": "Google for Startups Cloud Program",
        "credits": "$200,000",
        "eligibility": "Startups with VC backing or Google partner accelerator"
      }
    },
    {
      "id": "firebase",
      "name": "Firebase (Cloud Functions for Firebase)",
      "provider": "Google (Firebase)",
      "lastVerified": "2025-11-16",
      "pricing": {
        "freeTier": {
          "invocations": 125000,
          "invocationsUnit": "per month",
          "computeTime": 40000,
          "computeTimeUnit": "GB-seconds per month",
          "networkEgress": 10,
          "networkEgressUnit": "GB per month",
          "duration": "always free (Spark plan)"
        },
        "payAsYouGo": {
          "plan": "Blaze (pay as you go)",
          "invocationPrice": 0.0000004,
          "invocationPriceUnit": "per invocation",
          "computePrice": 0.0000025,
          "computePriceUnit": "per GB-second"
        }
      },
      "features": {
        "runtimes": ["Node.js", "Python (via Cloud Functions)"],
        "coldStartTime": "200-500ms",
        "maxExecutionDuration": "9 minutes",
        "maxMemory": "8GB",
        "triggers": ["Firestore", "Realtime DB", "Auth", "Storage", "HTTP"]
      },
      "ecosystem": {
        "integrations": ["Firestore", "Authentication", "Realtime Database", "Cloud Storage", "Analytics"],
        "sdks": ["Firebase CLI", "Firebase Admin SDK"],
        "communitySize": "very large",
        "marketplace": "Firebase Extensions"
      },
      "lockInRisk": {
        "portability": "high (tight Firebase integration)",
        "vendorSpecificAPIs": ["Firebase Admin SDK", "Firestore", "Realtime Database"],
        "migrationComplexity": "high (data migration from Firestore)"
      },
      "bestFor": ["Mobile apps", "Quick MVPs", "Learning projects", "Real-time features"]
    },
    {
      "id": "supabase",
      "name": "Supabase (Edge Functions)",
      "provider": "Supabase (Deno Deploy)",
      "lastVerified": "2025-11-16",
      "pricing": {
        "freeTier": {
          "requests": 500000,
          "requestsUnit": "per month",
          "executionTime": 400000,
          "executionTimeUnit": "GB-seconds per month",
          "duration": "always free (Free tier)"
        },
        "payAsYouGo": {
          "plan": "Pro ($25/month) includes more resources",
          "additionalRequests": "$2 per 1M requests"
        }
      },
      "features": {
        "runtimes": ["Deno (TypeScript, JavaScript)"],
        "coldStartTime": "50-200ms (faster than AWS Lambda)",
        "maxExecutionDuration": "150 seconds",
        "maxMemory": "256MB (Pro), 512MB (Enterprise)",
        "triggers": ["Database webhooks", "HTTP requests"]
      },
      "ecosystem": {
        "integrations": ["PostgreSQL", "Auth", "Storage", "Realtime", "Vector (pgvector)"],
        "sdks": ["Supabase CLI", "Supabase JS"],
        "communitySize": "medium (growing rapidly)",
        "marketplace": "none (open-source ecosystem)"
      },
      "lockInRisk": {
        "portability": "low (self-hostable, open-source)",
        "vendorSpecificAPIs": ["Supabase Auth SDK", "Supabase Storage"],
        "migrationComplexity": "low (PostgreSQL, standard SQL)"
      },
      "bestFor": ["Open-source preference", "PostgreSQL familiarity", "Real-time apps", "Firebase alternative"]
    }
  ]
}
```

**Comparison Query Examples**:

```typescript
// Filter by free tier > 1M requests/month
platforms.filter(p => p.pricing.freeTier.requests >= 1000000)

// Sort by cold start time (ascending)
platforms.sort((a, b) => parseColdStart(a) - parseColdStart(b))

// Find platforms with Node.js runtime
platforms.filter(p => p.features.runtimes.includes('Node.js'))

// Find lowest lock-in risk
platforms.filter(p => p.lockInRisk.portability === 'low')
```

---

## Business Rationale

Developers waste hours manually comparing serverless platforms across provider websites. A centralized, version-controlled comparison matrix saves time and ensures accurate, up-to-date data.

---

## Test Strategy

**Unit Tests**:
- JSON schema validation (all required fields present)
- Data freshness detection (last verified > 30 days warns)
- Query filtering and sorting logic

**Integration Tests**:
- Load comparison data in serverless-recommender skill
- Query platform by criteria (price, runtime, lock-in)

**E2E Tests**:
- User asks "AWS vs Azure vs GCP for pet project"
- Agent loads comparison data and provides recommendation

**Coverage Target**: 95%+

---

## Related User Stories

- [US-001: Context-Aware Serverless Recommendations](us-001-context-aware-serverless-recommendations.md)
- [US-003: Free Tier and Startup Credit Guidance](us-003-free-tier-startup-credit-guidance.md)

---

**Status**: Planning
**Priority**: P1 (foundation for recommendations)
**Estimated Effort**: 2-3 hours
