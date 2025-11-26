---
name: bmad-method
description: BMAD (Best, Most Appropriate, Design) technology decision framework expert. Helps evaluate technology alternatives, analyze tradeoffs, calculate TCO, assess vendor lock-in, and make data-driven architecture decisions. Activates for technology choices, stack decisions, database selection, cloud provider comparison, framework evaluation, architecture decisions, BMAD, best practices, most appropriate, design decisions, technology tradeoffs.
allowed-tools: Read, Grep, Glob
---

# BMAD Method Expert Skill

Expert in the **BMAD Framework** - a structured approach to making technology decisions by evaluating what's **Best** (industry standard), **Most Appropriate** (context fit), and aligned with your overall **Design** (architecture vision).

## Core Philosophy

Technology decisions shouldn't be made based solely on:
- ❌ "It's the most popular"
- ❌ "It's the newest/coolest"
- ❌ "I know this one already"

Instead, use **BMAD** to balance:
- ✅ **Industry best practices**
- ✅ **Your specific context** (team, budget, timeline, scale)
- ✅ **Long-term architectural alignment**

## The BMAD Framework

### B - Best (Industry Gold Standard)

**Question**: What is considered the best practice in the industry?

**Criteria**:
- Battle-tested in production at scale
- Widely adopted by successful companies
- Comprehensive feature set
- Strong community and ecosystem
- Clear documentation and best practices

**Examples**:
- **Database**: PostgreSQL (ACID, reliability, JSON support)
- **Message Queue**: Apache Kafka (throughput, durability, replay)
- **Cloud**: AWS (breadth of services, enterprise features)
- **Backend**: Express/Fastify (maturity, ecosystem)

**When "Best" Matters Most**:
- Enterprise/mission-critical applications
- Long-term projects (5+ years)
- Large teams needing stability
- Regulatory/compliance requirements

### M - Most Appropriate (Context Fit)

**Question**: What is most appropriate for YOUR specific situation?

**Context Factors**:

1. **Team Context**
   - Size: 2-5 (startup) vs 10-50 (scale-up) vs 100+ (enterprise)
   - Expertise: What does team already know?
   - Learning capacity: Time to learn new tech?

2. **Financial Context**
   - Budget: Free tier vs $100/mo vs $10k/mo
   - Funding stage: Bootstrap vs seed vs Series A+
   - Cost predictability: Fixed vs variable costs

3. **Timeline Context**
   - POC: 1-2 weeks (speed matters)
   - MVP: 1-3 months (balance speed and quality)
   - Production: 6-12 months (quality and scale matter)

4. **Scale Context**
   - Current: 100 users vs 10k vs 1M
   - Projected: 6-month and 2-year forecasts
   - Growth rate: Steady vs exponential

**Examples**:
- **Startup (5 people, $200/mo budget)**: Firebase (fast, managed, cheap)
- **Scale-up (20 people, $5k/mo budget)**: PostgreSQL + Redis (flexible, scalable)
- **Enterprise (100 people, $50k/mo budget)**: PostgreSQL (RDS) + Kafka + Redis

**When "Most Appropriate" Overrides "Best"**:
- Constrained budgets (startups, side projects)
- Time pressure (MVP deadlines)
- Team expertise mismatch
- Specific compliance requirements

### D - Design (Architectural Alignment)

**Question**: How does this fit your overall system design and long-term vision?

**Considerations**:

1. **Vendor Lock-in**
   - Open-source vs proprietary
   - Standard protocols vs proprietary APIs
   - Export/migration capabilities
   - Community vs single-vendor control

2. **Ecosystem Coherence**
   - Does it fit existing stack?
   - Shared libraries/tools available?
   - Common patterns across team?

3. **Migration Path**
   - Can you switch later?
   - What's the cost of migration?
   - Incremental vs big-bang migration

4. **Future-Proofing**
   - Technology trajectory (growing vs declining)
   - Vendor viability (funded, profitable, sustainable)
   - Community health (active development, contributions)

**Examples**:
- **Low Lock-in**: PostgreSQL (standard SQL, portable)
- **Medium Lock-in**: MongoDB (proprietary protocol, but well-supported)
- **High Lock-in**: DynamoDB (AWS-specific, hard to migrate)

**When "Design" is Critical**:
- Long-term projects (3+ years)
- Multi-vendor strategy
- Regulatory/data sovereignty concerns
- Risk-averse organizations

## Decision Matrix Template

```markdown
## Technology Decision: [Category]

### Context
- Team Size: [number]
- Budget: $[amount]/month
- Timeline: [duration]
- Current Scale: [users/requests]
- Target Scale (12mo): [projected growth]

### Requirements
**Must Have**:
- [ ] Requirement 1
- [ ] Requirement 2

**Nice to Have**:
- [ ] Feature 1
- [ ] Feature 2

**Constraints**:
- [ ] Constraint 1 (e.g., GDPR, open-source)

### BMAD Analysis

#### Best: [Technology Name]
- Strengths: [bullet points]
- Ecosystem: [libraries, tools, community]
- Proven at: [companies/scale]

#### Most Appropriate: [Technology Name]
- Team Fit: [skills alignment]
- Budget Fit: $[cost] vs $[budget]
- Timeline Fit: [setup time]
- Scale Fit: [handles current + projected]

#### Design: [Technology Name]
- Lock-in Risk: [Low/Medium/High]
- Migration Path: [description]
- Ecosystem Fit: [how it integrates]
- Future-Proofing: [trajectory, viability]

### Recommendation

**Choose: [Technology]**

**Rationale**:
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

**Alternative Paths**:
- If [condition]: Consider [alternative]
- If [condition 2]: Consider [alternative 2]

### Implementation Plan
- Week 1: [steps]
- Week 2: [steps]
- Week 3: [steps]
```

## Common Decision Patterns

### Databases

**Best**: PostgreSQL
- ACID compliance, robustness, JSON support, ecosystem

**Most Appropriate**:
- Startup (<$500/mo): Supabase (managed PostgreSQL)
- Scale-up ($1k-5k/mo): AWS RDS PostgreSQL
- Enterprise (>$10k/mo): Aurora PostgreSQL or CockroachDB

**Design**:
- Low lock-in: Self-hosted PostgreSQL or RDS
- High flexibility: PostgreSQL (relational + JSON)
- NoSQL alternative: MongoDB (if document model fits)

### Cloud Providers

**Best**: AWS
- Most mature, broadest services, largest community

**Most Appropriate**:
- Startup (simple app): Vercel/Netlify (frontend) + Supabase (backend)
- Scale-up (containerized): GCP (better Kubernetes) or Hetzner (cheaper)
- Enterprise (complex): AWS (breadth) or Azure (Microsoft shops)

**Design**:
- Multi-cloud: Kubernetes + Terraform (avoid cloud-specific services)
- Cost-sensitive: Hetzner or DigitalOcean
- Vendor-neutral: Avoid Lambda, use containers

### Frontend Frameworks

**Best**: Next.js (React) or Nuxt (Vue)
- Full-stack capabilities, SEO, large ecosystem

**Most Appropriate**:
- Content-heavy: Astro (static generation)
- App-heavy: Next.js (React) or SvelteKit (smaller bundles)
- Rapid prototyping: Remix (simpler than Next.js)

**Design**:
- Framework-agnostic: Astro (multi-framework support)
- React ecosystem: Next.js
- Performance-first: SvelteKit or Qwik

## Cost Analysis

### Total Cost of Ownership (TCO) Template

```markdown
### 3-Year TCO

| Component              | Option A | Option B | Option C |
|------------------------|----------|----------|----------|
| **Infrastructure**     |          |          |          |
| - Hosting              | $X       | $Y       | $Z       |
| - Backup/DR            | $X       | $Y       | $Z       |
| - Monitoring           | $X       | $Y       | $Z       |
| **Engineering**        |          |          |          |
| - Initial setup        | $X       | $Y       | $Z       |
| - Training             | $X       | $Y       | $Z       |
| - Ongoing maintenance  | $X       | $Y       | $Z       |
| **Risk Costs**         |          |          |          |
| - Vendor lock-in       | $X       | $Y       | $Z       |
| - Migration potential  | $X       | $Y       | $Z       |
| **Total**              | **$X**   | **$Y**   | **$Z**   |
```

### Hidden Costs to Consider

1. **Learning Curve**
   - Training time × hourly rate
   - Productivity dip during ramp-up
   - Documentation/onboarding materials

2. **Maintenance Burden**
   - Updates/patches frequency
   - Security vulnerabilities
   - Dependency management

3. **Vendor Lock-in**
   - Potential migration cost if vendor fails
   - Price increases over time
   - Feature deprecation

4. **Opportunity Cost**
   - Time spent on tech vs features
   - Delayed time-to-market
   - Engineer satisfaction/retention

## Risk Assessment

### Risk Matrix

```markdown
| Risk                | Probability | Impact | Mitigation              | Decision |
|---------------------|-------------|--------|-------------------------|----------|
| Vendor shutdown     | 10%         | High   | Use open-source fork    | Accept   |
| Cost explosion      | 30%         | High   | Set billing alerts      | Mitigate |
| Performance issues  | 15%         | Medium | Load testing early      | Mitigate |
| Team skill gap      | 40%         | Medium | Training + pair coding  | Mitigate |
| Lock-in constraints | 80%         | Low    | Abstract vendor APIs    | Accept   |
```

### Mitigation Strategies

1. **For Vendor Lock-in**:
   - Use abstraction layers (repositories, interfaces)
   - Standard protocols (SQL, S3 API, AMQP)
   - Regular export/backup testing

2. **For Cost Explosion**:
   - Set billing alerts at 50%, 75%, 90% of budget
   - Reserve budgets for unexpected growth
   - Plan scaling tiers (what happens at 10x users?)

3. **For Knowledge Gaps**:
   - Pair programming for knowledge transfer
   - Internal workshops and documentation
   - Hire consultants for initial setup

## Real-World Examples

### Example 1: Database Selection for E-commerce Startup

**Context**:
- Team: 5 engineers (3 backend, 2 fullstack)
- Budget: $500/month
- Timeline: 3 months to MVP
- Scale: 1,000 users → 50,000 in 12 months

**BMAD Analysis**:
- **Best**: PostgreSQL (ACID, proven, ecosystem)
- **Most Appropriate**: PostgreSQL on Supabase ($25/mo, managed, fast setup)
- **Design**: Low lock-in (standard SQL), clear migration to RDS later

**Decision**: Supabase PostgreSQL
**Rationale**: Aligns team skills (SQL), fits budget, fast setup, no lock-in

### Example 2: Message Queue for IoT Platform

**Context**:
- Team: 20 engineers
- Budget: $5,000/month
- Timeline: 6 months
- Scale: 100k messages/sec, 1 year retention

**BMAD Analysis**:
- **Best**: Apache Kafka (throughput, durability, ecosystem)
- **Most Appropriate**: Confluent Cloud (managed Kafka, faster setup)
- **Design**: Standard Kafka protocol, can migrate to self-hosted

**Decision**: Confluent Cloud
**Rationale**: Team knows Kafka, $3k/mo fits budget, 2-week setup vs 2-month self-hosted

### Example 3: Auth Provider for SaaS

**Context**:
- Team: 10 engineers
- Budget: $1,000/month
- Requirements: SOC2, GDPR, SSO, MFA
- Timeline: 2 months

**BMAD Analysis**:
- **Best**: Auth0 (comprehensive, compliance-ready)
- **Most Appropriate**: Clerk (modern DX, cheaper, growing fast)
- **Design**: Medium lock-in (standard OAuth, but proprietary UI)

**Decision**: Clerk
**Rationale**: 10x cheaper ($200 vs $2,000/mo), modern DX, SOC2 compliant

## Best Practices

### 1. Document Your Decisions

Create Architecture Decision Records (ADRs):
```markdown
# ADR-001: Database Selection

## Status: Accepted

## Context
[Why this decision was needed]

## Decision
[What was chosen]

## Consequences
- Positive: [benefits]
- Negative: [tradeoffs]
- Risks: [what could go wrong]

## Alternatives Considered
- Option A: [why rejected]
- Option B: [why rejected]
```

### 2. Re-evaluate Periodically

- **Quarterly**: Review costs vs budget
- **Bi-annually**: Check technology trajectory
- **Annually**: Full BMAD re-analysis

### 3. Build Escape Hatches

Even when choosing locked-in tech:
- Abstract vendor-specific APIs
- Regular backup/export testing
- Maintain migration playbook

### 4. Start Small, Plan Big

- Begin with managed services (speed to market)
- Plan migration to self-hosted (cost optimization)
- Document migration triggers (e.g., >$5k/mo cost)

## Activation Keywords

Ask me about:
- "Which database should I choose?"
- "Compare AWS vs GCP vs Azure"
- "Best technology stack for startups"
- "BMAD analysis for [technology]"
- "Technology decision framework"
- "How to evaluate tech alternatives"
- "Total cost of ownership for [tech]"
- "Vendor lock-in analysis"
- "Migration strategy for [tech A] to [tech B]"

## Resources

- ADR Templates: [adr.github.io](https://adr.github.io/)
- TCO Calculators: AWS, GCP, Azure pricing calculators
- Technology Radar: ThoughtWorks Tech Radar
- Community: [r/ExperiencedDevs](https://reddit.com/r/ExperiencedDevs)
