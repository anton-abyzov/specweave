---
id: US-004
feature: FS-038
title: Learning Path Recommendations
status: planning
priority: P2
created: 2025-11-16
project: specweave
---

# US-004: Learning Path Recommendations

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** developer learning a new serverless platform
**I want** curated learning resources and sample projects
**So that** I can quickly ramp up and avoid common pitfalls

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Agent provides platform-specific tutorials (beginner, intermediate, advanced) (P2, testable)
- [ ] **AC-US4-02**: Agent recommends sample projects (Hello World, REST API, Full-Stack App) (P2, testable)
- [ ] **AC-US4-03**: Agent shares best practices guides (performance, security, cost optimization) (P2, testable)
- [ ] **AC-US4-04**: Agent warns about common pitfalls (cold starts, memory limits, timeouts) (P2, testable)
- [ ] **AC-US4-05**: Agent provides learning vs production trade-offs (new platform vs familiar platform) (P2, testable)
- [ ] **AC-US4-06**: Learning resources are up-to-date (verified within 60 days) (P2, testable)

---

## Implementation

**Files to Create**:
- `plugins/specweave/data/serverless-learning-paths.json` (new file, ~300 lines)

**Data Schema**: `serverless-learning-paths.json`

```json
{
  "platforms": [
    {
      "id": "aws-lambda",
      "name": "AWS Lambda",
      "learningPath": {
        "beginner": {
          "tutorials": [
            {
              "title": "Getting Started with AWS Lambda",
              "url": "https://aws.amazon.com/lambda/getting-started/",
              "duration": "30 minutes",
              "topics": ["Lambda basics", "Console walkthrough", "First function"]
            },
            {
              "title": "AWS Lambda Tutorial (YouTube)",
              "url": "https://www.youtube.com/watch?v=eOBq__h4OJ4",
              "duration": "1 hour",
              "topics": ["Hands-on tutorial", "Node.js examples"]
            }
          ],
          "sampleProjects": [
            {
              "name": "Hello World Lambda",
              "repo": "https://github.com/aws-samples/lambda-hello-world",
              "description": "Simple HTTP endpoint returning JSON",
              "complexity": "beginner"
            }
          ]
        },
        "intermediate": {
          "tutorials": [
            {
              "title": "Building Serverless REST APIs",
              "url": "https://aws.amazon.com/getting-started/hands-on/build-serverless-web-app-lambda-apigateway-s3-dynamodb-cognito/",
              "duration": "2 hours",
              "topics": ["API Gateway", "DynamoDB", "Authentication"]
            }
          ],
          "sampleProjects": [
            {
              "name": "Serverless REST API",
              "repo": "https://github.com/aws-samples/serverless-rest-api",
              "description": "CRUD API with DynamoDB",
              "complexity": "intermediate"
            }
          ]
        },
        "advanced": {
          "tutorials": [
            {
              "title": "Serverless Patterns Collection",
              "url": "https://serverlessland.com/patterns",
              "duration": "varies",
              "topics": ["Event-driven", "Saga pattern", "CQRS"]
            }
          ],
          "sampleProjects": [
            {
              "name": "Serverless E-commerce",
              "repo": "https://github.com/aws-samples/aws-serverless-ecommerce-platform",
              "description": "Full e-commerce platform with microservices",
              "complexity": "advanced"
            }
          ]
        }
      },
      "bestPractices": [
        {
          "category": "Performance",
          "tips": [
            "Use provisioned concurrency for low-latency endpoints",
            "Optimize package size (< 50MB for faster cold starts)",
            "Reuse connections (database, HTTP clients) outside handler"
          ]
        },
        {
          "category": "Security",
          "tips": [
            "Use least-privilege IAM roles",
            "Store secrets in AWS Secrets Manager, not environment variables",
            "Enable VPC for database connections"
          ]
        },
        {
          "category": "Cost Optimization",
          "tips": [
            "Right-size memory allocation (test at 128MB, 256MB, 512MB)",
            "Use Lambda Layers for shared dependencies",
            "Enable X-Ray only when debugging (adds cost)"
          ]
        }
      ],
      "commonPitfalls": [
        {
          "pitfall": "Cold starts (200-500ms latency)",
          "mitigation": "Use provisioned concurrency or ping function periodically"
        },
        {
          "pitfall": "15-minute execution limit",
          "mitigation": "Use Step Functions for long-running workflows or switch to Fargate"
        },
        {
          "pitfall": "10GB memory limit",
          "mitigation": "For high-memory tasks, use Fargate or EC2"
        }
      ]
    },
    {
      "id": "firebase",
      "name": "Firebase",
      "learningPath": {
        "beginner": {
          "tutorials": [
            {
              "title": "Get started with Cloud Functions for Firebase",
              "url": "https://firebase.google.com/docs/functions/get-started",
              "duration": "20 minutes",
              "topics": ["Firebase setup", "First function", "Deploy"]
            },
            {
              "title": "Fireship Firebase Tutorial",
              "url": "https://www.youtube.com/watch?v=q5J5ho7YUhA",
              "duration": "40 minutes",
              "topics": ["Firebase basics", "Functions", "Firestore"]
            }
          ],
          "sampleProjects": [
            {
              "name": "Firebase Quickstart",
              "repo": "https://github.com/firebase/quickstart-js",
              "description": "Official Firebase quickstart samples",
              "complexity": "beginner"
            }
          ]
        }
      },
      "bestPractices": [
        {
          "category": "Performance",
          "tips": [
            "Use onWrite() sparingly (triggers on every write)",
            "Batch Firestore operations to reduce function invocations",
            "Use Firestore offline persistence for mobile apps"
          ]
        }
      ],
      "commonPitfalls": [
        {
          "pitfall": "Vendor lock-in (Firestore, Firebase Auth)",
          "mitigation": "Use abstraction layer (services pattern) for easy migration"
        }
      ]
    }
  ]
}
```

**Agent Behavior**:
```
User: "I want to learn AWS Lambda"

Agent:
📚 AWS Lambda Learning Path

🟢 Beginner (Start Here):
   1. Getting Started with AWS Lambda (30 min)
      → https://aws.amazon.com/lambda/getting-started/
      Topics: Lambda basics, Console, First function

   2. AWS Lambda Tutorial (1 hour)
      → https://www.youtube.com/watch?v=eOBq__h4OJ4
      Topics: Hands-on, Node.js examples

   Sample Project: Hello World Lambda
      → https://github.com/aws-samples/lambda-hello-world
      Complexity: Beginner

🟡 Intermediate (After basics):
   • Building Serverless REST APIs (2 hours)
   • Sample: CRUD API with DynamoDB

🔴 Advanced (Production-ready):
   • Serverless Patterns Collection
   • Sample: Full e-commerce platform

💡 Best Practices:
   Performance:
      • Use provisioned concurrency for low latency
      • Optimize package size (< 50MB)
      • Reuse connections outside handler

   Security:
      • Least-privilege IAM roles
      • Secrets Manager for secrets (not env vars)

⚠️  Common Pitfalls:
   • Cold starts (200-500ms) → Mitigation: Provisioned concurrency
   • 15-min execution limit → Mitigation: Use Step Functions for long workflows
   • 10GB memory limit → Mitigation: Use Fargate for high-memory tasks

🎯 Recommended Next Steps:
   1. Complete "Getting Started" tutorial (30 min)
   2. Deploy Hello World sample to your AWS account
   3. Generate Terraform config: /infrastructure aws-lambda
```

---

## Business Rationale

Developers choose platforms based on learning curve and ecosystem support. Curated learning paths reduce friction and increase adoption of SpecWeave-recommended platforms.

---

## Test Strategy

**Unit Tests**:
- JSON schema validation for learning paths
- Data freshness detection (> 60 days warns)

**Integration Tests**:
- Load learning path data in serverless-recommender skill
- Query by platform and skill level

**E2E Tests**:
- User asks "How do I learn Firebase?"
- Agent provides beginner-intermediate-advanced learning path

**Coverage Target**: 85%+

---

## Related User Stories

- [US-001: Context-Aware Serverless Recommendations](us-001-context-aware-serverless-recommendations.md)

---

**Status**: Planning
**Priority**: P2 (enhances user experience, not blocking)
**Estimated Effort**: 3-4 hours
