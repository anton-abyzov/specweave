---
name: brownfield-onboarder
description: Intelligently onboards brownfield projects by merging existing CLAUDE.md backups into SpecWeave structure. Extracts project-specific knowledge, domain context, team conventions, and technical details from backup CLAUDE.md files, then distributes content to appropriate SpecWeave folders without bloating CLAUDE.md. Activates for: merge docs, merge claude, onboard brownfield, import existing docs, claude backup, specweave merge-docs.
---

# Brownfield Onboarder - Intelligent CLAUDE.md Merger

**Purpose**: Intelligently merge existing CLAUDE.md backups into SpecWeave's structure without bloating the main CLAUDE.md file.

**When to Use**: After installing SpecWeave into an existing project that had CLAUDE.md

**Philosophy**: Keep CLAUDE.md as a concise guide, distribute detailed content to appropriate SpecWeave folders.

---

## The Problem

When installing SpecWeave into an existing project:
1. Project already has `CLAUDE.md` with valuable project-specific context
2. SpecWeave installs its own `CLAUDE.md` as the development guide
3. Old `CLAUDE.md` is backed up to `.claude/backups/CLAUDE-backup-{timestamp}.md`
4. Need to intelligently merge project-specific content WITHOUT bloating SpecWeave's CLAUDE.md

---

## The Solution: Smart Distribution

**Instead of bloating CLAUDE.md**, distribute content to appropriate folders:

```
Project-specific content → SpecWeave folders:

Domain knowledge        → specifications/modules/{domain}/
Project conventions     → .specweave/docs/guides/project-conventions.md
Team workflows          → .specweave/docs/guides/team-workflows.md
Architecture details    → .specweave/docs/architecture/existing-system.md
Business rules          → specifications/modules/business-rules/
Technology stack        → .specweave/docs/architecture/tech-stack.md
Deployment process      → .specweave/docs/guides/deployment.md
API conventions         → .specweave/docs/guides/api-conventions.md
Code style              → .specweave/docs/guides/code-style.md
```

**Only add to CLAUDE.md**: High-level project summary (1-2 paragraphs max)

---

## Activation

**Trigger**: User runs `specweave merge-docs` or asks "merge my old CLAUDE.md"

**Auto-detection**:
1. Check if `.claude/backups/CLAUDE-backup-*.md` exists
2. If multiple backups, use most recent
3. If no backups, inform user and exit gracefully

---

## Analysis Process

### Step 1: Parse Backup CLAUDE.md

**Extract sections**:
```typescript
interface ParsedCLAUDEmd {
  projectName: string;
  projectDescription: string;
  techStack: TechStack;
  architecture: ArchitectureSection[];
  conventions: Convention[];
  workflows: Workflow[];
  domainKnowledge: DomainSection[];
  teamGuidelines: TeamGuideline[];
  deploymentProcess: DeploymentSection[];
  apiDesign: APISection[];
  businessRules: BusinessRule[];
  codeExamples: CodeExample[];
  customInstructions: Instruction[];
}
```

**Section Detection Keywords**:
- **Tech Stack**: "technology", "framework", "database", "infrastructure", "stack", "tools"
- **Architecture**: "architecture", "system design", "components", "services", "microservices"
- **Conventions**: "naming convention", "code style", "pattern", "standard", "guideline"
- **Workflows**: "workflow", "process", "pipeline", "deployment flow", "release process"
- **Domain**: Domain-specific terms (e.g., "patient", "booking", "payment", "order")
- **Business Rules**: "business rule", "validation", "policy", "constraint", "requirement"
- **API Design**: "API", "endpoint", "REST", "GraphQL", "authentication", "authorization"
- **Deployment**: "deploy", "CI/CD", "environment", "production", "staging"

### Step 2: Classify Content

**For each section, determine**:

1. **Generic or Project-Specific?**
   - Generic: Common programming advice, general best practices
   - Project-specific: Domain knowledge, team conventions, project architecture

2. **Overlap with SpecWeave CLAUDE.md?**
   - Compare section with SpecWeave's CLAUDE.md
   - If >80% similar, skip (already covered)
   - If <80% similar, extract unique content

3. **Target Destination**
   - Determine best SpecWeave folder for this content
   - See "Content Distribution Rules" below

### Step 3: Content Distribution Rules

#### Rule 1: Domain Knowledge → Specifications

**Indicators**: Business concepts, entities, domain terminology

**Example**:
```markdown
# Old CLAUDE.md
## Domain Model

Our platform manages **patient appointments** with **healthcare providers**.
Key entities:
- Patient (demographics, insurance, medical history)
- Provider (specialties, availability, credentials)
- Appointment (time slot, status, notes)
- Clinic (location, services, staff)

Business rules:
- Appointments must be 15-60 minutes
- Patients can cancel up to 24 hours before
- Providers can override cancellation policy
```

**Destination**: `specifications/modules/appointments/domain-model.md`

**CLAUDE.md addition**: None (link from CLAUDE.md to specifications)

---

#### Rule 2: Architecture → .specweave/docs/architecture/

**Indicators**: System design, component descriptions, data flow

**Example**:
```markdown
# Old CLAUDE.md
## System Architecture

We use a microservices architecture:
- API Gateway (Kong) - routing, authentication
- Booking Service (Node.js) - appointment management
- Notification Service (Python) - email/SMS
- Payment Service (Node.js) - Stripe integration
- Database (PostgreSQL) - shared across services
```

**Destination**: `..specweave/docs/architecture/existing-system.md`

**CLAUDE.md addition**:
```markdown
## Project-Specific Architecture

See [Existing System Architecture](.specweave/docs/architecture/existing-system.md) for complete microservices architecture.
```

---

#### Rule 3: Conventions → .specweave/docs/guides/

**Indicators**: Naming conventions, code style, patterns

**Example**:
```markdown
# Old CLAUDE.md
## Naming Conventions

- API endpoints: `/api/v1/{resource}/{action}` (kebab-case)
- Database tables: `{domain}_{entity}` (snake_case)
- TypeScript interfaces: `I{Name}` prefix (PascalCase)
- React components: `{Name}Component.tsx` suffix
```

**Destination**: `.specweave/docs/guides/project-conventions.md`

**CLAUDE.md addition**: None (standard conventions, no need to clutter CLAUDE.md)

---

#### Rule 4: Workflows → .specweave/docs/guides/

**Indicators**: Deployment process, CI/CD, release workflow

**Example**:
```markdown
# Old CLAUDE.md
## Deployment Process

1. Create feature branch from `main`
2. Implement feature with tests
3. Create PR (requires 2 approvals)
4. Merge → auto-deploy to staging
5. Manual approval → deploy to production
6. Rollback via GitHub Actions if needed
```

**Destination**: `.specweave/docs/guides/deployment.md`

**CLAUDE.md addition**:
```markdown
## Deployment

See [Deployment Guide](.specweave/docs/guides/deployment.md).
```

---

#### Rule 5: Business Rules → specifications/modules/

**Indicators**: Validation rules, policies, constraints

**Example**:
```markdown
# Old CLAUDE.md
## Business Rules

### Appointment Booking
- Patients can book up to 3 months in advance
- Maximum 5 active appointments per patient
- Same-day appointments require $50 deposit
- Insurance verification required before booking
```

**Destination**: `specifications/modules/appointments/business-rules.md`

**CLAUDE.md addition**: None (specifications are source of truth)

---

#### Rule 6: Tech Stack → .specweave/docs/architecture/

**Indicators**: Technologies, frameworks, tools

**Example**:
```markdown
# Old CLAUDE.md
## Tech Stack

- Frontend: Next.js 14, React, Tailwind CSS
- Backend: Node.js 20, Express, TypeScript
- Database: PostgreSQL 16, Prisma ORM
- Cache: Redis
- Queue: BullMQ
- Infrastructure: Hetzner Cloud, Terraform
- Monitoring: Grafana, Prometheus
```

**Destination**: `.specweave/docs/architecture/tech-stack.md`

**CLAUDE.md addition**:
```markdown
## Tech Stack

Next.js 14 + Node.js 20 + PostgreSQL 16 + Hetzner Cloud

See [Tech Stack Details](.specweave/docs/architecture/tech-stack.md).
```

---

#### Rule 7: API Design → .specweave/docs/guides/

**Indicators**: API conventions, authentication, error handling

**Example**:
```markdown
# Old CLAUDE.md
## API Design

All APIs follow REST conventions:
- Authentication: JWT in Authorization header
- Errors: Standard structure { error, message, details }
- Pagination: page, limit query params
- Filtering: field[operator]=value
- Versioning: /api/v1, /api/v2
```

**Destination**: `.specweave/docs/guides/api-conventions.md`

**CLAUDE.md addition**: None (guide covers it)

---

#### Rule 8: Code Examples → Discard or Minimal

**Indicators**: Code snippets, example implementations

**Decision**:
- If generic (standard pattern): Discard (SpecWeave CLAUDE.md already has examples)
- If project-specific (custom pattern): Extract to guide

**Example**:
```markdown
# Old CLAUDE.md - Generic React pattern
function UserList() {
  const [users, setUsers] = useState([]);
  // ... standard React code
}
```

**Action**: Discard (generic React, not project-specific)

**Example**:
```markdown
# Old CLAUDE.md - Custom authentication pattern
// Our custom auth hook (wraps Supabase)
function useCustomAuth() {
  const { session } = useSupabase();
  const { roles } = useRoleProvider();
  return { user: session?.user, hasRole: (role) => roles.includes(role) };
}
```

**Action**: Extract to `.specweave/docs/guides/authentication.md` (project-specific pattern)

---

### Step 4: Update CLAUDE.md (Minimal)

**ONLY add high-level project summary** to SpecWeave's CLAUDE.md:

```markdown
---

## Project-Specific Context

**Project**: Healthcare Appointment Booking Platform
**Domain**: Healthcare, Patient Management, Provider Scheduling

### Quick Links
- [Domain Model](specifications/modules/appointments/domain-model.md)
- [Existing System Architecture](.specweave/docs/architecture/existing-system.md)
- [Tech Stack](.specweave/docs/architecture/tech-stack.md)
- [Business Rules](specifications/modules/appointments/business-rules.md)
- [Deployment Guide](.specweave/docs/guides/deployment.md)
- [Project Conventions](.specweave/docs/guides/project-conventions.md)

**Note**: All project-specific details are in linked documents. This keeps CLAUDE.md concise.

---
```

**Total addition**: ~15 lines max

---

## Intelligence Rules

### Avoid Bloat

**Never add to CLAUDE.md**:
- Generic programming advice (SpecWeave CLAUDE.md already has it)
- Detailed code examples (put in guides)
- Long architecture descriptions (put in architecture docs)
- Business rule details (put in specifications)
- API documentation (put in guides)

**Only add to CLAUDE.md**:
- 1-2 sentence project description
- Domain/industry context
- Links to detailed docs

### Avoid Duplicates

**Before creating files, check if similar content exists**:

```typescript
// Check if domain model already exists
if (exists("specifications/modules/appointments/domain-model.md")) {
  // Compare content
  existingContent = read("specifications/modules/appointments/domain-model.md");
  newContent = extractDomainModel(backupCLAUDEmd);

  if (similarity(existingContent, newContent) > 0.8) {
    // Skip, already documented
    skip();
  } else {
    // Merge unique content
    mergedContent = merge(existingContent, newContent);
    write("specifications/modules/appointments/domain-model.md", mergedContent);
  }
}
```

### Preserve Accuracy

**When extracting content**:
- Don't paraphrase technical details
- Preserve exact terminology
- Keep code examples verbatim
- Maintain formatting (tables, lists, code blocks)

### User Confirmation

**Before writing files, show user**:

```
I found the following project-specific content in your backup CLAUDE.md:

📦 Domain Model (Healthcare Appointments)
   → specifications/modules/appointments/domain-model.md

🏗️ Microservices Architecture
   → .specweave/docs/architecture/existing-system.md

🛠️ Tech Stack (Next.js + Node.js + PostgreSQL)
   → .specweave/docs/architecture/tech-stack.md

📋 Business Rules (Booking policies)
   → specifications/modules/appointments/business-rules.md

🔧 Project Conventions (Naming, code style)
   → .specweave/docs/guides/project-conventions.md

🚀 Deployment Process (CI/CD workflow)
   → .specweave/docs/guides/deployment.md

📝 CLAUDE.md Update
   → Add 12-line project summary with links

Total files to create: 6
Total lines added to CLAUDE.md: 12

Proceed with merge? (y/n)
```

---

## Output: Merge Report

**After merge, generate report**:

```markdown
# CLAUDE.md Merge Report

**Date**: 2025-10-26
**Backup File**: .claude/backups/CLAUDE-backup-20251026-143022.md
**Merge Status**: ✅ Complete

---

## Files Created

1. ✅ `specifications/modules/appointments/domain-model.md` (450 lines)
2. ✅ `.specweave/docs/architecture/existing-system.md` (320 lines)
3. ✅ `.specweave/docs/architecture/tech-stack.md` (180 lines)
4. ✅ `specifications/modules/appointments/business-rules.md` (280 lines)
5. ✅ `.specweave/docs/guides/project-conventions.md` (200 lines)
6. ✅ `.specweave/docs/guides/deployment.md` (150 lines)

**Total**: 6 files, 1,580 lines

---

## CLAUDE.md Updated

**Added**: 12 lines (project summary + links)

**Location**: Lines 850-862 (after "Living Documentation Principles")

---

## Content Distribution

| Content Type | Lines | Destination |
|--------------|-------|-------------|
| Domain Model | 450 | specifications/ |
| Architecture | 320 | .specweave/docs/architecture/ |
| Tech Stack | 180 | .specweave/docs/architecture/ |
| Business Rules | 280 | specifications/ |
| Conventions | 200 | .specweave/docs/guides/ |
| Deployment | 150 | .specweave/docs/guides/ |
| **CLAUDE.md** | **12** | **Root** |

**Result**: 99.2% of content distributed to appropriate folders, not bloating CLAUDE.md

---

## Skipped Content

- Generic React patterns (25 lines) - Already covered in SpecWeave
- Standard git workflow (15 lines) - Common knowledge
- TypeScript basics (40 lines) - Not project-specific

**Total skipped**: 80 lines (generic content)

---

## Next Steps

1. ✅ Review generated files in `.specweave/docs/` and `specifications/`
2. ✅ Update `.specweave/config.yaml` with project details
3. ✅ Run `mkdocs serve` to preview documentation
4. ✅ Create features from specifications: `specweave plan-feature {name}`

---

## Backup Preserved

Original backup remains at:
`.claude/backups/CLAUDE-backup-20251026-143022.md`

You can reference it anytime.

---

**Merge Complete! 🎉**

Your project-specific knowledge is now integrated into SpecWeave's structure.
```

---

## Example Usage

### User Request

```
User: "I installed SpecWeave and it backed up my CLAUDE.md. Can you merge the important parts?"
```

### Your Response

```
I'll analyze your backup CLAUDE.md and intelligently merge project-specific content.

🔍 Analyzing: .claude/backups/CLAUDE-backup-20251026-143022.md

Found:
- Project: Healthcare Appointment Booking Platform
- Domain model: Patients, Providers, Appointments, Clinics
- Architecture: Microservices (4 services)
- Tech stack: Next.js + Node.js + PostgreSQL
- Business rules: Booking policies, cancellation rules
- Conventions: Naming, API design
- Deployment: CI/CD workflow

📦 Content Distribution Plan:

1. Domain Model → specifications/modules/appointments/domain-model.md
2. Architecture → .specweave/docs/architecture/existing-system.md
3. Tech Stack → .specweave/docs/architecture/tech-stack.md
4. Business Rules → specifications/modules/appointments/business-rules.md
5. Conventions → .specweave/docs/guides/project-conventions.md
6. Deployment → .specweave/docs/guides/deployment.md

CLAUDE.md: Add 12-line summary with links (no bloat!)

Total: 6 files, ~1,580 lines
CLAUDE.md additions: 12 lines (99.2% distributed to folders)

Proceed with merge? (y/n)
```

### After User Approval

```
✅ Merge complete!

Created:
1. specifications/modules/appointments/domain-model.md
2. .specweave/docs/architecture/existing-system.md
3. .specweave/docs/architecture/tech-stack.md
4. specifications/modules/appointments/business-rules.md
5. .specweave/docs/guides/project-conventions.md
6. .specweave/docs/guides/deployment.md

Updated:
- CLAUDE.md (added 12-line project summary)

Report saved: ai-logs/reports/CLAUDE-MERGE-REPORT-20251026.md

Your project knowledge is now integrated! 🎉

Next: Review files and run `mkdocs serve` to preview.
```

---

## Tool Usage

**Scan for backups**:
```typescript
const backups = glob(".claude/backups/CLAUDE-backup-*.md");
const latestBackup = backups.sort().reverse()[0];  // Most recent
```

**Parse content**:
```typescript
const content = read(latestBackup);
const sections = parseSections(content);  // Split by headers
const classified = classifyContent(sections);  // Domain, Architecture, etc.
```

**Avoid duplicates**:
```typescript
if (exists(targetPath)) {
  const existing = read(targetPath);
  if (similarity(existing, newContent) > 0.8) {
    skip();  // Already documented
  }
}
```

---

## Related Documentation

- [BROWNFIELD-INTEGRATION-STRATEGY.md](../../docs/internal/delivery/BROWNFIELD-INTEGRATION-STRATEGY.md)
- [brownfield-analyzer skill](../brownfield-analyzer/SKILL.md)
- [CLAUDE.md](../../CLAUDE.md)

---

## Test Cases

See `test-cases/` directory for validation scenarios.
