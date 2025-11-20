---
id: US-007
feature: FS-038
title: Architect Agent Enhancement
status: planning
priority: P1
created: 2025-11-16
project: specweave
---

# US-007: Architect Agent Enhancement

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As an** architect agent
**I want** enhanced serverless knowledge and decision frameworks
**So that** I can provide informed architecture recommendations for serverless deployments

---

## Acceptance Criteria

- [ ] **AC-US7-01**: Agent detects serverless suitability from project requirements (P1, testable)
- [ ] **AC-US7-02**: Agent recommends appropriate platform based on context (AWS vs Azure vs GCP vs Firebase vs Supabase) (P1, testable)
- [ ] **AC-US7-03**: Agent provides architecture patterns (event-driven, API-driven, batch processing) (P1, testable)
- [ ] **AC-US7-04**: Agent warns about serverless anti-patterns (stateful apps, long-running processes) (P1, testable)
- [ ] **AC-US7-05**: Agent integrates with existing architecture workflow (HLD, ADR, plan.md generation) (P1, testable)
- [ ] **AC-US7-06**: Agent collaborates with infrastructure agent (pass recommendations for IaC generation) (P1, testable)
- [ ] **AC-US7-07**: Agent provides migration guidance (monolith → serverless, container → serverless) (P2, testable)
- [ ] **AC-US7-08**: Agent includes serverless decisions in ADRs (why serverless, why this platform) (P1, testable)

---

## Implementation

**Files to Modify**:
- `plugins/specweave/agents/architect/AGENT.md` (~600 lines → ~900 lines)

**New Sections to Add**:

### Serverless Suitability Analysis

```markdown
## Serverless Suitability Framework

When user describes a new project or feature, analyze for serverless fit:

### Serverless-Friendly Patterns ✅

**Event-Driven Workloads**:
- Webhooks (Stripe, GitHub, Slack)
- File processing (S3 upload triggers)
- Scheduled jobs (cron, periodic cleanup)
- Message queue processing (SQS, Pub/Sub)

**API-Driven Workloads**:
- REST APIs (CRUD operations)
- GraphQL APIs
- Microservices (small, independent services)
- Backend-for-Frontend (BFF pattern)

**Variable Load Workloads**:
- Traffic spikes (concert tickets, flash sales)
- Seasonal apps (tax software, holiday apps)
- Development/staging environments (low traffic)

**Quick Prototypes**:
- MVPs (minimum viable product)
- Proof-of-concepts
- Hackathon projects

### Serverless Anti-Patterns ⚠️

**Stateful Applications**:
- WebSockets (real-time multiplayer games, chat)
- Long-lived connections (streaming)
- In-memory caching (shared state)

**Long-Running Processes**:
- Video encoding (> 15 minutes)
- Machine learning training (hours/days)
- Batch ETL jobs (> 1 hour)

**High-Throughput, Consistent Load**:
- Always-on apps with 1000+ RPS (cheaper to use EC2)
- Database replicas (always running)

**Low-Latency Critical**:
- High-frequency trading (sub-10ms)
- Real-time gaming (< 50ms)
- (Cold starts are 100-500ms)

### Decision Tree

```
Project Analysis
    ↓
Is it event-driven or API-driven? → YES → Serverless ✅
    ↓ NO
Is it stateful or long-running? → YES → NOT Serverless ⚠️
    ↓ NO
Is traffic variable or low? → YES → Serverless ✅
    ↓ NO
Is it always-on high traffic? → YES → Consider EC2/ECS ⚠️
```
```

### Platform Selection Logic

```markdown
## Platform Selection Framework

### AWS Lambda - Choose When:
- Enterprise compliance (SOC 2, HIPAA, PCI-DSS)
- AWS ecosystem (S3, DynamoDB, RDS, EventBridge)
- Largest community and marketplace
- Startup credits (AWS Activate)
- Most mature serverless platform (2014)

### Azure Functions - Choose When:
- Microsoft ecosystem (.NET, C#, PowerShell)
- Azure services (Cosmos DB, Active Directory)
- Enterprise with existing Azure commitment
- Startup credits (Microsoft for Startups)

### GCP Cloud Functions - Choose When:
- Google ecosystem (Firebase, BigQuery, GCS)
- Machine learning (Vertex AI, TensorFlow)
- Startup credits (Google for Startups)
- Data analytics workloads

### Firebase - Choose When:
- Mobile app backend (iOS, Android)
- Real-time features (Firestore, Realtime DB)
- Quick MVP (batteries-included)
- Learning project (beginner-friendly)
- Tight Google ecosystem integration

### Supabase - Choose When:
- Open-source preference (self-hostable)
- PostgreSQL familiarity (SQL, relational DB)
- Firebase alternative (avoid vendor lock-in)
- Real-time + relational DB hybrid
```

### Architecture Patterns

```markdown
## Serverless Architecture Patterns

### 1. Event-Driven Architecture
- **Pattern**: Event sources → Lambda → Event Bus → Downstream services
- **Use Case**: Order processing, IoT data ingestion
- **AWS**: EventBridge + Lambda + DynamoDB
- **Example**: Stripe webhook → Lambda → EventBridge → Email service

### 2. API-Driven Architecture
- **Pattern**: API Gateway → Lambda → Database
- **Use Case**: REST APIs, mobile backends
- **AWS**: API Gateway + Lambda + DynamoDB
- **Example**: Mobile app → API Gateway → Lambda → DynamoDB

### 3. Batch Processing
- **Pattern**: S3 upload → Lambda → Transform → S3
- **Use Case**: Image resizing, CSV processing, log analysis
- **AWS**: S3 + Lambda + S3
- **Example**: User uploads photo → Lambda resizes → Stores thumbnails

### 4. Backend-for-Frontend (BFF)
- **Pattern**: Frontend → BFF Lambda → Multiple microservices
- **Use Case**: Aggregating data from multiple sources
- **AWS**: API Gateway + Lambda → RDS + DynamoDB + External APIs
- **Example**: Dashboard → BFF → Analytics + User Data + CRM

### 5. CQRS (Command Query Responsibility Segregation)
- **Pattern**: Write Lambda → DynamoDB + EventBridge → Read Lambda → Read DB
- **Use Case**: High read/write separation, event sourcing
- **AWS**: Lambda + DynamoDB Streams + EventBridge
```

---

## Business Rationale

Architect agent is the entry point for architecture decisions. Enhancing it with serverless knowledge ensures users receive comprehensive guidance from the start.

---

## Test Strategy

**Unit Tests**:
- Serverless suitability detection logic
- Platform selection logic
- Architecture pattern matching

**Integration Tests**:
- Architect agent workflow (analyze project → recommend serverless → generate ADR)
- Collaboration with infrastructure agent (pass platform recommendation)

**E2E Tests**:
- User describes project → Architect agent recommends serverless + platform
- Agent generates ADR documenting serverless decision

**Coverage Target**: 95%+

---

## Related User Stories

- [US-001: Context-Aware Serverless Recommendations](us-001-context-aware-serverless-recommendations.md)
- [US-008: Infrastructure Agent IaC Generation](us-008-infrastructure-agent-iac-generation.md)

---

**Status**: Planning
**Priority**: P1 (core enhancement)
**Estimated Effort**: 2-3 hours
