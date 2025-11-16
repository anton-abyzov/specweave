---
id: US-001
feature: FS-038
title: Context-Aware Serverless Recommendations
status: planning
priority: P1
created: 2025-11-16
project: specweave
---

# US-001: Context-Aware Serverless Recommendations

**Feature**: [FS-038](../../_features/FS-038/FEATURE.md)

**As a** developer planning a new project or feature
**I want** context-aware serverless recommendations based on my project type, team size, and goals
**So that** I can make informed decisions about whether serverless is appropriate and which platform to use

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Architect agent detects project context from user input (pet project, startup, enterprise) (P1, testable)
- [ ] **AC-US1-02**: Agent asks clarifying questions if context is ambiguous (team size, expected traffic, budget) (P1, testable)
- [ ] **AC-US1-03**: Agent recommends serverless when appropriate (event-driven, API-driven, low traffic, variable load) (P1, testable)
- [ ] **AC-US1-04**: Agent warns against serverless when inappropriate (stateful apps, long-running processes, high memory needs) (P1, testable)
- [ ] **AC-US1-05**: Agent provides rationale for each recommendation (cost, scalability, complexity) (P1, testable)
- [ ] **AC-US1-06**: Recommendations include platform selection (AWS vs Azure vs GCP vs Firebase vs Supabase) (P1, testable)
- [ ] **AC-US1-07**: Agent provides learning vs production trade-offs (learning new platform vs using familiar one) (P2, testable)
- [ ] **AC-US1-08**: Recommendations are conversational and plain-language (no excessive jargon) (P1, testable via user survey)

---

## Implementation

**Files to Modify**:
- `plugins/specweave/agents/architect/AGENT.md` (~600 lines → ~900 lines)
- Create: `plugins/specweave/skills/serverless-recommender/SKILL.md` (new skill, ~400 lines)

**New Skill**: `serverless-recommender`

**Skill Capabilities**:
```markdown
---
name: serverless-recommender
description: Provides context-aware serverless recommendations. Activates for: serverless, AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase, deployment strategy, should I use serverless, pet project, startup, production deployment.
---

# Serverless Recommender Skill

## When to Activate

Activates when user asks:
- "Should I use serverless for this project?"
- "I'm building a pet project - which serverless platform?"
- "AWS Lambda vs Azure Functions for production?"
- "Serverless deployment options"
- "Free tier serverless platforms"

## Context Detection Logic

### Project Type Classification

**Pet Project**:
- Indicators: "learning", "personal", "side project", "portfolio"
- Team size: 1 developer
- Traffic: Low (< 1000 requests/day)
- Budget: Free tier / minimal cost
- Recommendation: Prioritize free tier, learning opportunities

**Startup**:
- Indicators: "MVP", "early stage", "startup", "small team"
- Team size: 2-10 developers
- Traffic: Medium (1K-100K requests/day)
- Budget: Startup credits, cost-sensitive
- Recommendation: Balance cost and scalability, leverage startup programs

**Enterprise**:
- Indicators: "production", "large scale", "compliance", "SLA"
- Team size: 10+ developers
- Traffic: High (100K+ requests/day)
- Budget: Managed budget, focus on reliability
- Recommendation: Prioritize reliability, support, compliance

### Serverless Suitability Analysis

**When to Recommend Serverless** ✅:
1. **Event-Driven Apps**: Webhooks, file processing, scheduled jobs
2. **API-Driven Apps**: REST APIs, GraphQL APIs with variable traffic
3. **Low-to-Medium Traffic**: < 100M requests/month
4. **Variable Load**: Traffic spikes (concerts, flash sales)
5. **Rapid Prototyping**: MVPs, proof-of-concepts
6. **Cost-Sensitive**: Startups, pet projects (pay-per-use vs always-on servers)

**When to Warn Against Serverless** ⚠️:
1. **Stateful Apps**: Websockets, real-time multiplayer games, chat apps
2. **Long-Running Processes**: Video encoding, machine learning training (> 15 minutes)
3. **High Memory Apps**: Data processing requiring > 10GB RAM
4. **Always-On Apps**: Consistent high traffic (cheaper to use EC2/VMs)
5. **Complex State Management**: Apps requiring shared in-memory state
6. **Low Latency Requirements**: Sub-10ms response times (cold starts are 100-500ms)

### Platform Selection Logic

**AWS Lambda** - Recommend when:
- User mentions AWS ecosystem (S3, DynamoDB, RDS)
- Enterprise compliance requirements (SOC 2, HIPAA)
- Mature ecosystem needed (most integrations, largest community)
- Startup credits available (AWS Activate program)

**Azure Functions** - Recommend when:
- User mentions Microsoft stack (.NET, Azure, C#)
- Enterprise with existing Azure investment
- Integration with Microsoft services (Office 365, Active Directory)

**GCP Cloud Functions** - Recommend when:
- User mentions Google ecosystem (Firebase, BigQuery, GCS)
- Machine learning integration (Vertex AI, TensorFlow)
- Startup credits available (Google for Startups)

**Firebase** - Recommend when:
- Mobile app backend (iOS, Android)
- Real-time features needed (Firestore, Realtime Database)
- Quick MVP (batteries-included platform)
- Learning project (beginner-friendly)

**Supabase** - Recommend when:
- Open-source preference (self-hostable)
- PostgreSQL familiarity
- Real-time features + relational DB
- Quick MVP (Firebase alternative)

## Recommendation Format

**Template**:
```
📊 Project Context Analysis:
   Type: [Pet Project | Startup | Enterprise]
   Team Size: [1-5 | 5-20 | 20+]
   Expected Traffic: [Low | Medium | High]
   Budget: [Free Tier | Startup Credits | Managed Budget]

✅ Serverless Suitability: [Yes | Conditional | No]

Rationale:
   • [Reason 1]
   • [Reason 2]
   • [Reason 3]

🎯 Recommended Platform: [AWS Lambda | Azure Functions | GCP | Firebase | Supabase]

Why this platform?
   • [Platform-specific benefit 1]
   • [Platform-specific benefit 2]
   • [Platform-specific benefit 3]

⚠️  Potential Concerns:
   • [Concern 1 + mitigation]
   • [Concern 2 + mitigation]

📚 Next Steps:
   1. [Action 1]
   2. [Action 2]
   3. [Action 3]
```

**Example Output**:
```
📊 Project Context Analysis:
   Type: Pet Project
   Team Size: 1 developer
   Expected Traffic: Low (< 1000 requests/day)
   Budget: Free Tier

✅ Serverless Suitability: Yes (highly recommended)

Rationale:
   • Pay-per-use pricing fits low traffic (likely $0/month on free tier)
   • No server management needed (focus on code, not infrastructure)
   • Easy to scale if project takes off

🎯 Recommended Platform: Firebase

Why Firebase?
   • Generous free tier (125K functions/month, 1GB storage, 10GB transfer)
   • Beginner-friendly (minimal setup, clear documentation)
   • Batteries-included (auth, database, hosting in one platform)
   • Great learning platform (widely used, transferable skills)

⚠️  Potential Concerns:
   • Vendor lock-in: Mitigate with abstraction layer (services pattern)
   • Cold starts (200-500ms): Acceptable for pet project (not production SLA)

📚 Next Steps:
   1. Create Firebase project: https://console.firebase.google.com
   2. Follow quickstart: https://firebase.google.com/docs/functions/get-started
   3. Generate Terraform config: /infrastructure firebase-functions
```
```
