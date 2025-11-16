# ADR-0038: Serverless Platform Knowledge Base Structure

**Date**: 2025-11-16
**Status**: Accepted

## Context

SpecWeave needs to provide context-aware serverless recommendations across 5 platforms (AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase). The system must maintain accurate, up-to-date platform data including:

- Pricing (free tier limits, pay-as-you-go, reserved capacity)
- Features (runtime support, cold start times, max execution duration)
- Ecosystem (integrations, SDKs, community support)
- Vendor lock-in risk (portability, migration complexity)

**Key Requirements**:
1. **Accuracy**: Platform data must be accurate (free tier limits change frequently)
2. **Maintainability**: Easy to update when providers change pricing/features
3. **Performance**: Fast lookups (< 100ms for platform comparison queries)
4. **Extensibility**: Easy to add new platforms (Cloudflare Workers, Vercel Functions)

**Challenge**: Serverless platforms evolve rapidly. AWS Lambda has updated pricing 12+ times since 2014. Firebase free tier changed 3 times in 2023 alone.

## Decision

Use **JSON-based platform knowledge base** with structured schema and version tracking.

**Directory Structure**:
```
plugins/specweave/knowledge-base/serverless/
├── platforms/
│   ├── aws-lambda.json       # AWS Lambda data
│   ├── azure-functions.json  # Azure Functions data
│   ├── gcp-functions.json    # GCP Cloud Functions data
│   ├── firebase.json         # Firebase data
│   └── supabase.json         # Supabase data
├── schema.json               # JSON schema for validation
└── README.md                 # Maintenance guide
```

**Platform Data Schema** (`schema.json`):
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "provider", "pricing", "features", "ecosystem", "lastVerified"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z-]+$"},
    "name": {"type": "string"},
    "provider": {"type": "string"},
    "pricing": {
      "type": "object",
      "properties": {
        "freeTier": {
          "type": "object",
          "properties": {
            "compute": {"type": "string"},
            "requests": {"type": "string"},
            "storage": {"type": "string"},
            "dataTransfer": {"type": "string"},
            "duration": {"type": "string"}
          }
        },
        "payAsYouGo": {
          "type": "object",
          "properties": {
            "computePerGBSecond": {"type": "number"},
            "requestsPer1M": {"type": "number"},
            "dataTransferPerGB": {"type": "number"}
          }
        },
        "startupCredits": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "program": {"type": "string"},
              "amount": {"type": "string"},
              "duration": {"type": "string"},
              "eligibility": {"type": "string"}
            }
          }
        }
      }
    },
    "features": {
      "type": "object",
      "properties": {
        "runtimes": {"type": "array", "items": {"type": "string"}},
        "maxDuration": {"type": "string"},
        "maxMemory": {"type": "string"},
        "coldStartTypical": {"type": "string"},
        "concurrency": {"type": "string"},
        "vpc": {"type": "boolean"},
        "customDomains": {"type": "boolean"}
      }
    },
    "ecosystem": {
      "type": "object",
      "properties": {
        "integrations": {"type": "array", "items": {"type": "string"}},
        "sdks": {"type": "array", "items": {"type": "string"}},
        "communitySize": {"type": "string", "enum": ["small", "medium", "large"]},
        "documentation": {"type": "string", "enum": ["poor", "good", "excellent"]}
      }
    },
    "vendorLockIn": {
      "type": "object",
      "properties": {
        "risk": {"type": "string", "enum": ["low", "medium", "high"]},
        "portability": {"type": "string"},
        "migrationComplexity": {"type": "string"}
      }
    },
    "lastVerified": {"type": "string", "format": "date"}
  }
}
```

**Example: `aws-lambda.json`**:
```json
{
  "id": "aws-lambda",
  "name": "AWS Lambda",
  "provider": "Amazon Web Services",
  "pricing": {
    "freeTier": {
      "compute": "400,000 GB-seconds per month",
      "requests": "1,000,000 requests per month",
      "storage": "Not included (use S3 free tier)",
      "dataTransfer": "Not included (use CloudFront/S3 free tier)",
      "duration": "Perpetual (no time limit)"
    },
    "payAsYouGo": {
      "computePerGBSecond": 0.0000166667,
      "requestsPer1M": 0.20,
      "dataTransferPerGB": 0.09
    },
    "startupCredits": [
      {
        "program": "AWS Activate",
        "amount": "$1,000 - $100,000",
        "duration": "1-2 years",
        "eligibility": "Startups (requires VC backing or accelerator)"
      }
    ]
  },
  "features": {
    "runtimes": ["Node.js 20", "Python 3.12", "Java 21", "Go 1.x", ".NET 8", "Ruby 3.2", "Custom Runtime"],
    "maxDuration": "15 minutes",
    "maxMemory": "10,240 MB",
    "coldStartTypical": "100-500ms (depends on runtime, memory)",
    "concurrency": "1,000 concurrent executions (default, can request increase)",
    "vpc": true,
    "customDomains": true
  },
  "ecosystem": {
    "integrations": ["S3", "DynamoDB", "RDS", "EventBridge", "SQS", "SNS", "API Gateway", "Step Functions"],
    "sdks": ["AWS SDK (all languages)", "Serverless Framework", "SAM", "CDK"],
    "communitySize": "large",
    "documentation": "excellent"
  },
  "vendorLockIn": {
    "risk": "medium",
    "portability": "Function code portable (Node.js/Python), integrations not portable (DynamoDB, EventBridge)",
    "migrationComplexity": "Medium (function code easy, infrastructure requires rewrite)"
  },
  "suitability": {
    "petProjects": "excellent",
    "startups": "excellent",
    "enterprise": "excellent"
  },
  "lastVerified": "2025-11-16"
}
```

**Access Pattern** (TypeScript):
```typescript
import * as awsLambda from './knowledge-base/serverless/platforms/aws-lambda.json';
import * as firebase from './knowledge-base/serverless/platforms/firebase.json';

// Query free tier
const awsFreeTier = awsLambda.pricing.freeTier;

// Compare cold starts
const platforms = [awsLambda, firebase];
const coldStarts = platforms.map(p => ({
  name: p.name,
  coldStart: p.features.coldStartTypical
}));

// Filter by budget (free tier only)
const freeTierPlatforms = platforms.filter(p =>
  p.pricing.freeTier.duration === "Perpetual (no time limit)"
);
```

## Alternatives Considered

### Alternative 1: Hardcode Platform Data in Skills
**Pros**: Simpler implementation, no file I/O
**Cons**: Hard to update, can't version data, skill files become huge (2000+ lines)
**Why rejected**: Violates maintainability requirement. Skill updates require plugin republish.

### Alternative 2: Fetch from External API (e.g., Cloud Pricing API)
**Pros**: Always up-to-date, no manual updates
**Cons**: Requires internet connection, API rate limits, API changes break system, latency (200-500ms)
**Why rejected**: Violates performance requirement (<100ms). Users may work offline.

### Alternative 3: YAML Instead of JSON
**Pros**: More human-readable, supports comments
**Cons**: Slower parsing (20-30% vs JSON), no native TypeScript type inference
**Why rejected**: Performance matters. JSON parsing is instant, YAML requires parsing library.

### Alternative 4: SQLite Database
**Pros**: Structured queries (SQL), indexing, ACID guarantees
**Cons**: Overkill for read-only data, adds dependency, harder to edit manually
**Why rejected**: Over-engineering. JSON files are simple, editable, and fast.

## Consequences

### Positive
- **Fast Lookups**: JSON parsing is instant (< 10ms for all 5 platforms)
- **Easy Updates**: Edit JSON file, update `lastVerified` date, commit
- **Version Control**: Git tracks all changes to platform data (audit trail)
- **Type Safety**: TypeScript infers types from JSON schema
- **Extensibility**: Add new platform = add new JSON file

### Negative
- **Manual Updates Required**: No automatic tracking of provider pricing changes
- **Schema Drift Risk**: Developers may forget to validate against schema
- **No Query Engine**: Can't do complex SQL-like queries (must iterate in code)

### Neutral
- **File Size**: Each platform JSON is ~5-10KB (negligible)
- **Load Time**: All platforms load in memory on startup (~50KB total, instant)

## Risks and Mitigations

### Risk 1: Platform Data Becomes Stale
**Impact**: Recommendations become inaccurate, user trust erodes
**Probability**: High (providers change pricing 2-4 times/year)
**Mitigation**:
- Add `lastVerified` date to each platform JSON
- Weekly GitHub Action to check provider docs for changes
- User warning if data > 30 days old: "Last verified: 2025-10-15"
- Community contributions (PR template for platform updates)

### Risk 2: Schema Changes Break Skills
**Impact**: Skills fail to parse platform data
**Probability**: Low (schema should be stable)
**Mitigation**:
- Semantic versioning for schema (`schema-v1.json`, `schema-v2.json`)
- Backward compatibility (new fields optional, old fields deprecated gracefully)
- Unit tests validate all platform JSONs against schema

### Risk 3: JSON Parsing Errors (Invalid Syntax)
**Impact**: Plugin fails to load
**Probability**: Low (but possible if manually edited)
**Mitigation**:
- Pre-commit hook validates all JSONs against schema
- CI pipeline runs `npm run validate-platforms`
- Fallback to default data if parsing fails

## Implementation Notes

**Validation Script** (`scripts/validate-platforms.ts`):
```typescript
import Ajv from 'ajv';
import schema from '../plugins/specweave/knowledge-base/serverless/schema.json';
import awsLambda from '../plugins/specweave/knowledge-base/serverless/platforms/aws-lambda.json';
// ... import other platforms

const ajv = new Ajv();
const validate = ajv.compile(schema);

const platforms = [awsLambda, azureFunctions, gcpFunctions, firebase, supabase];

platforms.forEach(platform => {
  const valid = validate(platform);
  if (!valid) {
    console.error(`Validation failed for ${platform.id}:`, validate.errors);
    process.exit(1);
  }
});

console.log('✅ All platforms validated successfully');
```

**GitHub Action** (`.github/workflows/validate-serverless-data.yml`):
```yaml
name: Validate Serverless Platform Data
on:
  pull_request:
    paths:
      - 'plugins/specweave/knowledge-base/serverless/**'
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run validate-platforms
      - name: Check last verified dates
        run: |
          node scripts/check-stale-data.js  # Fail if > 60 days old
```

## Related Decisions
- ADR-0039: Context Detection Strategy (uses platform data for recommendations)
- ADR-0040: IaC Template Engine (templates reference platform data for defaults)
- ADR-0041: Cost Estimation Algorithm (uses pricing data from platform JSONs)

## References
- AWS Lambda Pricing: https://aws.amazon.com/lambda/pricing/
- Azure Functions Pricing: https://azure.microsoft.com/pricing/details/functions/
- GCP Cloud Functions Pricing: https://cloud.google.com/functions/pricing
- Firebase Pricing: https://firebase.google.com/pricing
- Supabase Pricing: https://supabase.com/pricing
