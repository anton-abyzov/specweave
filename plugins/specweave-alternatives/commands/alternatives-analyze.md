# Alternatives Analyze - Technology Stack Decision Analysis

Analyze technology stack alternatives using the **BMAD** (Best, Most Appropriate, Design) framework. Make informed decisions about databases, frameworks, cloud providers, languages, and architectural patterns by evaluating tradeoffs, costs, and long-term implications.

## Usage

```
/specweave-alternatives:alternatives-analyze <category> [context] [options]
```

## What I Do

1. **Identify Alternatives**: List all viable options for the technology category
2. **BMAD Analysis**: Evaluate using Best/Most Appropriate/Design criteria
3. **Tradeoff Matrix**: Compare pros/cons, costs, learning curve, ecosystem
4. **Context Scoring**: Weight factors based on your specific requirements
5. **Recommendation**: Provide data-driven recommendation with rationale

## Technology Categories

### 1. Databases
```bash
/specweave-alternatives:alternatives-analyze database \
  --requirements "high-throughput,strong-consistency,cloud-native" \
  --scale "startup"
```

**Analyzes**: PostgreSQL, MySQL, MongoDB, DynamoDB, Firestore, CockroachDB, Cassandra

### 2. Backend Frameworks
```bash
/specweave-alternatives:alternatives-analyze backend-framework \
  --language typescript \
  --requirements "fast-development,type-safe,good-orms"
```

**Analyzes**: Express, Fastify, NestJS, Hono, Elysia, tRPC

### 3. Frontend Frameworks
```bash
/specweave-alternatives:alternatives-analyze frontend-framework \
  --requirements "SEO,performance,large-team" \
  --existing-stack "React"
```

**Analyzes**: Next.js, Remix, Astro, SvelteKit, Nuxt, Gatsby

### 4. Cloud Providers
```bash
/specweave-alternatives:alternatives-analyze cloud-provider \
  --workload "containerized-microservices" \
  --scale "enterprise" \
  --constraints "EU-data-residency"
```

**Analyzes**: AWS, GCP, Azure, Hetzner, DigitalOcean, Fly.io

### 5. Message Queues
```bash
/specweave-alternatives:alternatives-analyze message-queue \
  --requirements "exactly-once,high-throughput,stream-processing" \
  --scale "100k-msgs-sec"
```

**Analyzes**: Kafka, RabbitMQ, Redis Streams, AWS SQS, Google Pub/Sub, NATS

### 6. Authentication
```bash
/specweave-alternatives:alternatives-analyze auth \
  --requirements "social-login,SSO,MFA,compliance" \
  --constraints "GDPR,SOC2"
```

**Analyzes**: Auth0, Clerk, Supabase Auth, Firebase Auth, AWS Cognito, custom JWT

## BMAD Framework

### **B**est - Industry Gold Standard
What is considered the **best practice** in the industry?

- **Criteria**: Battle-tested, widely adopted, comprehensive features
- **Examples**:
  - Database: PostgreSQL (ACID compliance, robustness)
  - Queue: Kafka (high throughput, durability)
  - Cloud: AWS (feature breadth, enterprise tooling)

### **M**ost Appropriate - Context Fit
What is **most appropriate** for YOUR specific context?

- **Criteria**: Team expertise, budget, timeline, scale
- **Factors**:
  - **Team Size**: Startup (2-5) vs Scale-up (20-50) vs Enterprise (100+)
  - **Budget**: Free tier vs $100/mo vs $10k/mo vs unlimited
  - **Timeline**: POC (1 week) vs MVP (3 months) vs Production (1 year)
  - **Scale**: 100 users vs 10k users vs 1M users

### **D**esign - Architectural Alignment
How does this fit your **overall design** and long-term vision?

- **Criteria**: System coherence, vendor lock-in, migration path
- **Considerations**:
  - **Vendor Lock-in**: Open-source vs proprietary
  - **Migration Path**: Can you switch later? At what cost?
  - **Ecosystem**: Libraries, tools, community support
  - **Future-proofing**: Technology trajectory, maintenance

## Analysis Output

### Tradeoff Matrix

```markdown
## Database Alternatives Analysis

### Context
- **Team Size**: 5 engineers (3 backend, 2 fullstack)
- **Current Stage**: Seed-funded startup
- **Scale**: 1,000 active users → 50,000 in 12 months
- **Budget**: $500/mo infrastructure
- **Constraints**: GDPR compliance required

### Options Evaluated

| Option        | Type       | Cost/mo | Learn Curve | Maturity | Score |
|---------------|------------|---------|-------------|----------|-------|
| PostgreSQL    | Relational | $25     | Medium      | ⭐⭐⭐⭐⭐ | 92    |
| MongoDB       | Document   | $57     | Low         | ⭐⭐⭐⭐   | 78    |
| DynamoDB      | NoSQL      | $50     | High        | ⭐⭐⭐⭐   | 71    |
| Firestore     | Document   | $30     | Low         | ⭐⭐⭐     | 68    |
| MySQL         | Relational | $25     | Medium      | ⭐⭐⭐⭐⭐ | 85    |

### BMAD Analysis

#### Best: PostgreSQL
- ✅ **Strengths**: ACID compliance, JSON support, full-text search, PostGIS
- ✅ **Ecosystem**: Rich ORM support (Prisma, Drizzle, TypeORM)
- ✅ **Flexibility**: Relational + document (JSON columns)
- ⚠️ **Considerations**: Requires schema management

#### Most Appropriate: PostgreSQL (Supabase)
- ✅ **Team Fit**: SQL skills on team, Prisma ORM familiarity
- ✅ **Budget Fit**: $25/mo for 100GB database (within budget)
- ✅ **Timeline Fit**: Fast setup with Supabase (2 hours vs 2 days self-hosted)
- ✅ **Scale Fit**: Handles 50k users with vertical scaling
- ✅ **Compliance**: EU region available, GDPR-ready

#### Design: PostgreSQL with Migration Plan
- ✅ **No Lock-in**: Standard PostgreSQL (can migrate to RDS, self-hosted)
- ✅ **Ecosystem**: TypeScript-first with Prisma
- ✅ **Future Path**: Scale with read replicas, connection pooling (PgBouncer)
- ⚠️ **Migration Risk**: Low - standard SQL export/import

### Recommendation

**Choose: PostgreSQL (hosted on Supabase)**

**Rationale:**
1. ✅ Aligns with team's SQL expertise
2. ✅ Fits budget ($25/mo vs $500 budget)
3. ✅ Supports rapid development (Prisma ORM)
4. ✅ No vendor lock-in (standard PostgreSQL)
5. ✅ Clear scaling path (read replicas, PgBouncer)
6. ✅ GDPR compliance out-of-the-box

**Alternative if requirements change:**
- **If need extreme scale**: Consider CockroachDB (distributed SQL)
- **If need real-time**: Consider Firestore + PostgreSQL hybrid
- **If team prefers NoSQL**: MongoDB Atlas (better maturity than DynamoDB for startups)

### Implementation Path

1. **Week 1**: Set up Supabase project, configure EU region
2. **Week 2**: Design schema with Prisma, enable Row Level Security (RLS)
3. **Week 3**: Implement connection pooling, set up backups
4. **Week 4**: Load testing, optimize queries, add indexes

### Long-term Monitoring

- **Metric**: Connection pool utilization
- **Alert**: >80% CPU on database
- **Review**: Quarterly review of costs vs scale
- **Trigger**: If cost >$200/mo OR latency >100ms p95, re-evaluate
```

## Options

### Context Options
- `--scale <level>` - Startup, scale-up, enterprise (default: startup)
- `--team-size <number>` - Number of engineers
- `--budget <amount>` - Monthly budget for this component
- `--timeline <duration>` - Time to production (1 week, 1 month, 3 months, etc.)

### Requirement Options
- `--requirements <list>` - Comma-separated requirements (e.g., "ACID,scalability,cost-effective")
- `--constraints <list>` - Hard constraints (e.g., "GDPR,open-source,EU-region")
- `--existing-stack <tech>` - Technologies already in use
- `--language <lang>` - Preferred programming language

### Analysis Options
- `--format <format>` - Output format: markdown, json, html (default: markdown)
- `--depth <level>` - Analysis depth: quick, standard, deep (default: standard)
- `--include-costs` - Include detailed cost breakdown (default: true)
- `--include-migration` - Include migration complexity analysis (default: true)

## Use Cases

### 1. Green field Project Planning
Choose the right stack before writing any code.

### 2. Technology Replacement
Evaluate alternatives when migrating away from legacy systems.

### 3. Cost Optimization
Find cheaper alternatives that meet the same requirements.

### 4. Scale Planning
Identify when current technology won't scale and what to migrate to.

### 5. Team Skill Alignment
Choose technologies that match team expertise or learning goals.

## Advanced Features

### Multi-Criteria Decision Analysis (MCDA)

```markdown
### Weighted Criteria

| Criteria         | Weight | PostgreSQL | MongoDB | DynamoDB |
|------------------|--------|------------|---------|----------|
| Cost             | 25%    | 9/10       | 6/10    | 7/10     |
| Performance      | 20%    | 8/10       | 8/10    | 9/10     |
| Developer UX     | 20%    | 9/10       | 8/10    | 6/10     |
| Scalability      | 15%    | 7/10       | 8/10    | 10/10    |
| Ecosystem        | 10%    | 10/10      | 8/10    | 7/10     |
| Learning Curve   | 10%    | 7/10       | 9/10    | 5/10     |
| **Total Score**  |        | **8.4**    | **7.7** | **7.3**  |
```

### Total Cost of Ownership (TCO)

```markdown
### 3-Year TCO Comparison

| Cost Component         | PostgreSQL | MongoDB | DynamoDB |
|------------------------|------------|---------|----------|
| **Infrastructure**     |            |         |          |
| - Database hosting     | $900       | $2,050  | $1,800   |
| - Backup storage       | $120       | $240    | $360     |
| - Monitoring           | $240       | $480    | $0       |
| **Engineering**        |            |         |          |
| - Initial setup        | $4,000     | $3,000  | $6,000   |
| - Ongoing maintenance  | $6,000     | $4,000  | $2,000   |
| - Migration risk       | $0         | $8,000  | $15,000  |
| **Total 3-Year Cost**  | **$11,260**| **$17,770** | **$25,160** |
```

### Risk Analysis

```markdown
### Risk Matrix

| Risk                  | Probability | Impact | Mitigation                      |
|-----------------------|-------------|--------|---------------------------------|
| Vendor shutdown       | Low (5%)    | High   | Use open-source alternative     |
| Cost explosion        | Medium (30%)| High   | Set up billing alerts, reserves |
| Performance issues    | Low (10%)   | Medium | Load testing, query optimization|
| Team knowledge gap    | Medium (20%)| Medium | Training, pair programming      |
| Lock-in constraints   | High (60%)  | Medium | Standard interfaces, abstraction|
```

## Examples

### Analyze Database Options
```bash
/specweave-alternatives:alternatives-analyze database \
  --scale startup \
  --budget 200 \
  --requirements "ACID,JSON-support,full-text-search" \
  --constraints "open-source,EU-hosting"
```

### Compare Cloud Providers
```bash
/specweave-alternatives:alternatives-analyze cloud-provider \
  --workload "containerized-apps" \
  --scale "scale-up" \
  --budget 5000 \
  --constraints "multi-region,SOC2"
```

### Frontend Framework Decision
```bash
/specweave-alternatives:alternatives-analyze frontend-framework \
  --existing-stack React \
  --requirements "SEO,SSR,static-generation" \
  --team-size 8
```

### Message Queue Selection
```bash
/specweave-alternatives:alternatives-analyze message-queue \
  --scale enterprise \
  --requirements "exactly-once,replay,stream-processing" \
  --throughput "500k-msgs-sec"
```

## Related Commands

- `/specweave-alternatives:cost-compare` - Detailed cost comparison only
- `/specweave-alternatives:migration-plan` - Generate migration plan from A to B
- `/specweave-cost-optimizer:analyze` - Optimize costs for chosen stack

## Best Practices

1. **Start with Requirements**: Define hard requirements vs nice-to-haves
2. **Include Team Context**: Consider team skills, not just technology merits
3. **Plan for Change**: Evaluate migration difficulty even if not planning to migrate
4. **Use Real Numbers**: Actual budget, actual scale, actual timeline
5. **Re-evaluate Periodically**: Technology landscape changes, reassess every 12-18 months

## Limitations

- **Analysis is point-in-time**: Technology landscape evolves rapidly
- **Costs are estimates**: Actual costs depend on usage patterns
- **Assumes typical use cases**: Edge cases may favor different technologies
- **Human judgment required**: Framework provides data, but final decision is yours

## Activation Keywords

- "Which database should I use?"
- "Compare PostgreSQL vs MongoDB vs DynamoDB"
- "Best cloud provider for startups"
- "Should I use Next.js or Remix?"
- "Kafka vs RabbitMQ decision"
- "Technology stack recommendations"
- "BMAD method analysis"
